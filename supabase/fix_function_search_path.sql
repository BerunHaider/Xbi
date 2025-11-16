-- Fix Function Search Path Security Issues
-- Add SET search_path = public to all functions

-- search_users
DROP FUNCTION IF EXISTS public.search_users(TEXT, INT);
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  username VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER,
  is_verified BOOLEAN
) LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.bio,
    p.avatar_url,
    p.followers_count,
    p.is_verified
  FROM profiles p
  WHERE p.username ILIKE '%' || search_query || '%'
    OR p.bio ILIKE '%' || search_query || '%'
  ORDER BY p.followers_count DESC
  LIMIT limit_count;
END;
$$;

-- search_posts
DROP FUNCTION IF EXISTS public.search_posts(TEXT, INT);
CREATE OR REPLACE FUNCTION public.search_posts(search_query TEXT, limit_count INT DEFAULT 30)
RETURNS TABLE(
  id BIGINT,
  author_id UUID,
  author_username VARCHAR,
  content TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    pr.username,
    p.content,
    p.likes_count,
    p.comments_count,
    p.created_at
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE p.content ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$;

-- is_following
DROP FUNCTION IF EXISTS public.is_following(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
  );
END;
$$;

-- get_user_suggestions
DROP FUNCTION IF EXISTS public.get_user_suggestions(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_user_suggestions(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  username VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER
) LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.bio,
    p.avatar_url,
    p.followers_count
  FROM profiles p
  WHERE p.id != p_user_id
    AND p.id NOT IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    AND p.id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = p_user_id
    )
  ORDER BY p.followers_count DESC
  LIMIT p_limit;
END;
$$;

-- is_blocked
DROP FUNCTION IF EXISTS public.is_blocked(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM blocks
    WHERE blocker_id = p_blocker_id
      AND blocked_id = p_blocked_id
  );
END;
$$;

-- block_user
DROP FUNCTION IF EXISTS public.block_user(UUID, UUID);
CREATE OR REPLACE FUNCTION public.block_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO blocks(blocker_id, blocked_id)
  VALUES(p_blocker_id, p_blocked_id)
  ON CONFLICT DO NOTHING;
  
  DELETE FROM follows
  WHERE (follower_id = p_blocker_id AND following_id = p_blocked_id)
     OR (follower_id = p_blocked_id AND following_id = p_blocker_id);
END;
$$;

-- unblock_user
DROP FUNCTION IF EXISTS public.unblock_user(UUID, UUID);
CREATE OR REPLACE FUNCTION public.unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM blocks
  WHERE blocker_id = p_blocker_id
    AND blocked_id = p_blocked_id;
END;
$$;

-- toggle_like
DROP FUNCTION IF EXISTS public.toggle_like(BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.toggle_like(p_post_id BIGINT, p_user_id UUID DEFAULT AUTH.UID())
RETURNS TABLE(liked BOOLEAN, likes_count INTEGER) LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_liked BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  v_liked := EXISTS(
    SELECT 1 FROM likes
    WHERE post_id = p_post_id AND user_id = p_user_id
  );
  
  IF v_liked THEN
    DELETE FROM likes
    WHERE post_id = p_post_id AND user_id = p_user_id;
  ELSE
    INSERT INTO likes(post_id, user_id) VALUES(p_post_id, p_user_id);
  END IF;
  
  SELECT COUNT(*) INTO v_likes_count FROM likes WHERE post_id = p_post_id;
  UPDATE posts SET likes_count = v_likes_count WHERE id = p_post_id;
  
  RETURN QUERY SELECT (NOT v_liked), v_likes_count;
END;
$$;

-- get_unread_notifications_count
DROP FUNCTION IF EXISTS public.get_unread_notifications_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN COUNT(*)::INTEGER FROM notifications WHERE user_id = p_user_id AND read = FALSE;
END;
$$;

-- mark_notifications_as_read
DROP FUNCTION IF EXISTS public.mark_notifications_as_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE notifications SET read = TRUE WHERE user_id = p_user_id AND read = FALSE;
END;
$$;

-- get_timeline_feed
DROP FUNCTION IF EXISTS public.get_timeline_feed(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_timeline_feed(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE(
  id BIGINT,
  author_id UUID,
  author_username VARCHAR,
  content TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.author_id,
    pr.username,
    po.content,
    po.likes_count,
    po.comments_count,
    po.created_at
  FROM posts po
  JOIN profiles pr ON po.author_id = pr.id
  WHERE po.author_id IN (
    SELECT following_id FROM follows WHERE follower_id = p_user_id
  ) OR po.author_id = p_user_id
  ORDER BY po.created_at DESC
  LIMIT p_limit;
END;
$$;

-- update_followers_count
DROP FUNCTION IF EXISTS public.update_followers_count();
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE profiles SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = NEW.following_id)
  WHERE id = NEW.following_id;
  RETURN NEW;
END;
$$;

-- update_followers_count_delete
DROP FUNCTION IF EXISTS public.update_followers_count_delete();
CREATE OR REPLACE FUNCTION public.update_followers_count_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE profiles SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = OLD.following_id)
  WHERE id = OLD.following_id;
  RETURN OLD;
END;
$$;

-- update_posts_count
DROP FUNCTION IF EXISTS public.update_posts_count();
CREATE OR REPLACE FUNCTION public.update_posts_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE profiles SET posts_count = (SELECT COUNT(*) FROM posts WHERE author_id = NEW.author_id)
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

-- update_posts_count_delete
DROP FUNCTION IF EXISTS public.update_posts_count_delete();
CREATE OR REPLACE FUNCTION public.update_posts_count_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE profiles SET posts_count = (SELECT COUNT(*) FROM posts WHERE author_id = OLD.author_id)
  WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$;

-- update_comments_count
DROP FUNCTION IF EXISTS public.update_comments_count();
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- update_comments_count_delete
DROP FUNCTION IF EXISTS public.update_comments_count_delete();
CREATE OR REPLACE FUNCTION public.update_comments_count_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE posts SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- create_like_notification
DROP FUNCTION IF EXISTS public.create_like_notification();
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, post_id, type)
  VALUES(
    (SELECT author_id FROM posts WHERE id = NEW.post_id),
    NEW.user_id,
    NEW.post_id,
    'like'
  );
  RETURN NEW;
END;
$$;

-- create_follow_notification
DROP FUNCTION IF EXISTS public.create_follow_notification();
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, type)
  VALUES(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

-- create_comment_notification
DROP FUNCTION IF EXISTS public.create_comment_notification();
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, post_id, type)
  VALUES(
    (SELECT author_id FROM posts WHERE id = NEW.post_id),
    NEW.author_id,
    NEW.post_id,
    'reply'
  );
  RETURN NEW;
END;
$$;

-- toggle_retweet
DROP FUNCTION IF EXISTS public.toggle_retweet(BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.toggle_retweet(p_post_id BIGINT, p_user_id UUID DEFAULT AUTH.UID())
RETURNS TABLE(retweeted BOOLEAN, retweets_count INTEGER) LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_retweeted BOOLEAN;
  v_retweets_count INTEGER;
BEGIN
  v_retweeted := EXISTS(
    SELECT 1 FROM retweets
    WHERE post_id = p_post_id AND user_id = p_user_id
  );
  
  IF v_retweeted THEN
    DELETE FROM retweets
    WHERE post_id = p_post_id AND user_id = p_user_id;
  ELSE
    INSERT INTO retweets(post_id, user_id) VALUES(p_post_id, p_user_id);
  END IF;
  
  SELECT COUNT(*) INTO v_retweets_count FROM retweets WHERE post_id = p_post_id;
  UPDATE posts SET retweets_count = v_retweets_count WHERE id = p_post_id;
  
  RETURN QUERY SELECT (NOT v_retweeted), v_retweets_count;
END;
$$;

-- update_presence
DROP FUNCTION IF EXISTS public.update_presence(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION public.update_presence(p_user_id UUID, p_status VARCHAR)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO presence(user_id, status, last_seen)
  VALUES(p_user_id, p_status, NOW())
  ON CONFLICT(user_id) DO UPDATE SET status = p_status, last_seen = NOW();
END;
$$;

-- create_poll
DROP FUNCTION IF EXISTS public.create_poll(UUID, TEXT, TEXT[], INT);
CREATE OR REPLACE FUNCTION public.create_poll(
  p_user_id UUID,
  p_title TEXT,
  p_options TEXT[],
  p_duration_hours INT
)
RETURNS BIGINT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_poll_id BIGINT;
  v_option TEXT;
BEGIN
  INSERT INTO polls(user_id, title, expires_at)
  VALUES(p_user_id, p_title, NOW() + (p_duration_hours || ' hours')::INTERVAL)
  RETURNING id INTO v_poll_id;
  
  FOREACH v_option IN ARRAY p_options LOOP
    INSERT INTO poll_options(poll_id, option_text) VALUES(v_poll_id, v_option);
  END LOOP;
  
  RETURN v_poll_id;
END;
$$;

-- vote_poll
DROP FUNCTION IF EXISTS public.vote_poll(BIGINT, BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.vote_poll(p_poll_id BIGINT, p_option_id BIGINT, p_user_id UUID DEFAULT AUTH.UID())
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO poll_votes(poll_id, option_id, user_id) VALUES(p_poll_id, p_option_id, p_user_id);
END;
$$;

-- create_media_entry
DROP FUNCTION IF EXISTS public.create_media_entry(UUID, TEXT, VARCHAR);
CREATE OR REPLACE FUNCTION public.create_media_entry(p_user_id UUID, p_url TEXT, p_type VARCHAR)
RETURNS BIGINT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  INSERT INTO media(user_id, url, media_type)
  VALUES(p_user_id, p_url, p_type)
  RETURNING id INTO v_media_id;
  
  RETURN v_media_id;
END;
$$;

-- enable_2fa
DROP FUNCTION IF EXISTS public.enable_2fa(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.enable_2fa(p_user_id UUID, p_secret TEXT)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO user_2fa(user_id, secret, enabled)
  VALUES(p_user_id, p_secret, TRUE)
  ON CONFLICT(user_id) DO UPDATE SET secret = p_secret, enabled = TRUE;
END;
$$;

-- disable_2fa
DROP FUNCTION IF EXISTS public.disable_2fa(UUID);
CREATE OR REPLACE FUNCTION public.disable_2fa(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE user_2fa SET enabled = FALSE WHERE user_id = p_user_id;
END;
$$;
