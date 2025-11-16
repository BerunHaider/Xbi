import React, { useState } from 'react'
import useComments from '../hooks/useComments'
import useAuth from '../hooks/useAuth'
import Avatar from './Avatar'
import { useNavigate } from 'react-router-dom'
import { Trash2, Heart, Send, X } from 'lucide-react'

export default function Comments({ postId, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { comments, loading, addComment, deleteComment } = useComments(postId)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmitting(true)
    const success = await addComment(newComment, user.id)
    if (success) {
      setNewComment('')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-twitter-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-twitter-900 border-b border-gray-200 dark:border-twitter-800 px-6 py-4 flex items-center justify-between backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comentarios</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl transition-all duration-200 hover:rotate-90 hover:scale-110"
          >
            <X size={24} />
          </button>
        </div>

        {/* Comments List */}
        <div className="divide-y divide-gray-200 dark:divide-twitter-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <span className="text-4xl">🔄</span>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 animate-slide-in-up">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No hay comentarios aún. ¡Sé el primero!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-twitter-800 transition-colors">
                <div className="flex gap-3">
                  <div className="cursor-pointer" onClick={() => comment.author?.username && navigate(`/@${comment.author.username}`)}>
                    <Avatar
                      src={comment.author?.avatar_url}
                      alt={comment.author?.username}
                      size={40}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <button className="font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => comment.author?.username && navigate(`/@${comment.author.username}`)}>
                          {comment.author?.username}
                        </button>
                        <button className="text-gray-500 ml-2 cursor-pointer" onClick={() => comment.author?.username && navigate(`/@${comment.author.username}`)}>
                          @{comment.author?.username?.toLowerCase()}
                        </button>
                      </div>
                      {user?.id === comment.author_id && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar comentario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(comment.created_at).toLocaleString('es-ES')}
                    </p>
                    <p className="text-gray-900 dark:text-white mt-2">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        {user && (
          <div className="border-t border-gray-200 dark:border-twitter-800 p-4 bg-gray-50 dark:bg-twitter-800">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe tu comentario..."
                rows="3"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700
                         bg-white dark:bg-twitter-900 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-600
                         focus:border-twitter-600 focus:outline-none focus:ring-2 focus:ring-twitter-600 focus:ring-opacity-10
                         resize-none transition-all duration-200"
                maxLength={280}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {newComment.length}/280
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-6 py-2 bg-twitter-600 hover:bg-twitter-700 text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Enviando...' : 'Comentar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
