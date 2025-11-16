import React, { useState } from 'react'
import Avatar from './Avatar'
import ProfilePreview from './ProfilePreview'
import { Heart, MessageCircle, Share2, Bookmark, Flag, Repeat } from 'lucide-react'
import { likesAPI } from '../api'
import useBookmark from '../hooks/useBookmark'
import useReport from '../hooks/useReport'
import ReportModal from './ReportModal'
import useRetweet from '../hooks/useRetweet'
import PostViewer from './PostViewer'
import { useNavigate } from 'react-router-dom'

export default function Post({ post, onOpenProfile }) {
  const navigate = useNavigate()
  const [showPreview, setShowPreview] = useState(false)
  const [liked, setLiked] = useState(post?.liked_by_user || false)
  const [expanded, setExpanded] = useState(false)

  const contentPreview = post?.content || ''

  const [likes, setLikes] = useState(post?.likes_count || 0)

  const [liking, setLiking] = useState(false)
  const { saved, toggle: toggleBookmark, loading: bookmarkLoading } = useBookmark(post?.id)
  const { submit: submitReport, loading: reportLoading } = useReport()
  const [reportOpen, setReportOpen] = useState(false)
  const { retweeted, count: retweetCount, toggle: toggleRetweet, loading: retweetLoading } = useRetweet(post?.id, post?.retweeted_by_user || false, post?.retweets_count || 0)
  const [viewerOpen, setViewerOpen] = useState(false)

  const toggleLike = async () => {
    if (liking) return
    // optimistic update
    const prevLiked = liked
    const prevLikes = likes
    setLiked(!prevLiked)
    setLikes(prevLiked ? Math.max(0, likes - 1) : likes + 1)
    setLiking(true)
    try {
      const res = await likesAPI.toggleLike(post.id)
      if (res && typeof res.likes_count === 'number') setLikes(res.likes_count)
      if (res && typeof res.liked === 'boolean') setLiked(res.liked)
    } catch (err) {
      // rollback
      setLiked(prevLiked)
      setLikes(prevLikes)
    } finally {
      setLiking(false)
    }
  }

  return (
    <article className="post-card mb-4" role="article">
      <div className="post-inner flex flex-col md:flex-row md:items-start">
        <div className="flex-shrink-0 relative">
          
          <Avatar
            src={post.author?.avatar_url}
            alt={post.author?.username}
            size={56}
            onClick={() => {
              const username = post.author?.username
              if (onOpenProfile) onOpenProfile(username)
              if (username) navigate(`/@${username}`)
            }}
            className="cursor-pointer"
          />
          <div
            role="button"
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
            onClick={() => setShowPreview((s) => !s)}
            className="absolute -right-2 -top-2 w-0 h-0"
          />
          {showPreview && (
            <div className="absolute left-16 top-0 z-40">
              <ProfilePreview userId={post.author?.id} shortProfile={{ username: post.author?.username, avatar_url: post.author?.avatar_url }} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="post-author">
              <div className="flex items-center gap-2">
                <div className="font-bold text-base">{post.author?.username || 'Usuario'}</div>
                {post.author?.is_verified && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-twitter-600 text-white font-semibold">Verificado</span>
                )}
              </div>
              <div
                onClick={() => {
                  const username = post.author?.username
                  if (onOpenProfile) onOpenProfile(username)
                  if (username) navigate(`/@${username}`)
                }}
                className="text-xs text-[rgb(var(--muted))] hover:underline cursor-pointer"
              >
                @{(post.author?.username || '').toLowerCase()}
              </div>
            </div>
            <div className="text-right md:text-right">
              <div className="ml-3 text-xs text-[rgb(var(--muted))] md:ml-0">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</div>
              <div className="text-sm text-[rgb(var(--muted))]">{likes} {likes === 1 ? 'me gusta' : 'me gusta'}</div>
            </div>
          </div>

        <div className="mt-3">
          <div className="post-content text-base leading-7 md:text-base cursor-pointer" onClick={() => setViewerOpen(true)}>
            {!expanded ? (
              <div className="line-clamp-3">{contentPreview}</div>
            ) : (
              <div>{contentPreview}</div>
            )}
          </div>

          {post?.content && post.content.length > 240 && (
            <div className="mt-2">
              <button
                className="show-more"
                onClick={() => setExpanded((s) => !s)}
              >
                {expanded ? 'Ver menos' : 'Ver más'}
              </button>
            </div>
          )}
        </div>

        {post.image_url && (
          <div className="post-media mt-3">
            <img src={post.image_url} alt="post media" loading="lazy" />
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-[rgb(var(--muted))] flex-wrap">
          <button onClick={toggleLike} disabled={liking} aria-pressed={liked} className={`btn-interact relative ${liked ? 'btn-like-active' : ''}`}>
            <Heart className={`like-icon ${liked ? 'like-anim' : ''}`} size={18} />
            <span className="text-sm">{likes} {likes === 1 ? 'like' : 'likes'}</span>
            {liked && (
              <>
                <span className="burst" style={{ left: 12, top: -6 }}></span>
                <span className="burst" style={{ left: 4, top: -12, background: 'rgba(29,155,240,0.9)' }}></span>
                <span className="burst" style={{ left: 20, top: -14, background: 'rgba(29,155,240,0.7)' }}></span>
              </>
            )}
          </button>

          <button className="btn-interact" aria-label="Comentar" onClick={() => setViewerOpen(true)}>
            <MessageCircle size={18} /> <span className="text-sm">Comentar</span>
          </button>

          <button className="btn-interact" aria-label="Compartir" onClick={async () => {
            const shareUrl = `${window.location.origin}/p/${post.id}`
            if (navigator.share) {
              try { await navigator.share({ title: post.author?.username, text: post.content, url: shareUrl }) } catch (e) { /* ignore */ }
            } else {
              try {
                await navigator.clipboard.writeText(shareUrl)
                alert('URL copiada al portapapeles')
              } catch (err) {
                console.error('Clipboard error', err)
                alert(shareUrl)
              }
            }
          }}>
            <Share2 size={18} /> <span className="text-sm">Compartir</span>
          </button>

          <button className={`btn-interact ${retweeted ? 'text-sky-600' : ''}`} onClick={async () => { try { await toggleRetweet() } catch (e) { console.error(e) } }} disabled={retweetLoading}>
            <Repeat size={18} /> <span className="text-sm">{retweetCount || 0}</span>
          </button>

          <button
            className={`btn-interact ${saved ? 'text-sky-600' : ''}`}
            aria-pressed={saved}
            onClick={async () => {
              try {
                await toggleBookmark()
              } catch (err) {
                // fallback: alert
                console.error('Bookmark error', err)
                alert('Necesitas iniciar sesión para guardar posts')
              }
            }}
            disabled={bookmarkLoading}
          >
            <Bookmark size={18} /> <span className="text-sm">{saved ? 'Guardado' : 'Guardar'}</span>
          </button>

          <button className="btn-interact" onClick={() => setReportOpen(true)}>
            <Flag size={18} /> <span className="text-sm">Reportar</span>
          </button>
          <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} post={post} />
          <PostViewer post={post} onClose={() => setViewerOpen(false)} />
        </div>
        </div>
      </div>
    </article>
  )
}
