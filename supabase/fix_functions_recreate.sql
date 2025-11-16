-- Recreate the 9 problematic functions with proper SET search_path = public
-- Drop and recreate each one

-- First drop all triggers that depend on these functions
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes CASCADE;
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows CASCADE;
DROP TRIGGER IF EXISTS trigger_toggle_retweet_notification ON retweets CASCADE;

-- Now drop and recreate the functions

DROP FUNCTION IF EXISTS public.toggle_like(BIGINT, UUID);
CREATE FUNCTION public.toggle_like(p_post_id BIGINT, p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(liked BOOLEAN, likes_count INTEGER) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_liked BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  v_liked := EXISTS(SELECT 1 FROM likes WHERE post_id = p_post_id AND user_id = p_user_id);
  
  IF v_liked THEN
    DELETE FROM likes WHERE post_id = p_post_id AND user_id = p_user_id;
  ELSE
    INSERT INTO likes(post_id, user_id) VALUES(p_post_id, p_user_id);
  END IF;
  
  SELECT COUNT(*)::INTEGER INTO v_likes_count FROM likes WHERE post_id = p_post_id;
  UPDATE posts SET likes_count = v_likes_count WHERE id = p_post_id;
  
  RETURN QUERY SELECT (NOT v_liked), v_likes_count;
END;
$$;

DROP FUNCTION IF EXISTS public.get_timeline_feed(UUID, INT);
CREATE FUNCTION public.get_timeline_feed(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE(id BIGINT, author_id UUID, author_username VARCHAR, content TEXT, likes_count INTEGER, comments_count INTEGER, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT po.id, po.author_id, pr.username, po.content, po.likes_count, po.comments_count, po.created_at
  FROM posts po
  JOIN profiles pr ON po.author_id = pr.id
  WHERE po.author_id IN (SELECT following_id FROM follows WHERE follower_id = p_user_id) OR po.author_id = p_user_id
  ORDER BY po.created_at DESC
  LIMIT p_limit;
END;
$$;

DROP FUNCTION IF EXISTS public.toggle_retweet(BIGINT, UUID);
CREATE FUNCTION public.toggle_retweet(p_post_id BIGINT, p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(retweeted BOOLEAN, retweets_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_retweeted BOOLEAN;
  v_retweets_count INTEGER;
BEGIN
  v_retweeted := EXISTS(SELECT 1 FROM retweets WHERE post_id = p_post_id AND user_id = p_user_id);
  
  IF v_retweeted THEN
    DELETE FROM retweets WHERE post_id = p_post_id AND user_id = p_user_id;
  ELSE
    INSERT INTO retweets(post_id, user_id) VALUES(p_post_id, p_user_id);
  END IF;
  
  SELECT COUNT(*)::INTEGER INTO v_retweets_count FROM retweets WHERE post_id = p_post_id;
  UPDATE posts SET retweets_count = v_retweets_count WHERE id = p_post_id;
  
  RETURN QUERY SELECT (NOT v_retweeted), v_retweets_count;
END;
$$;

DROP FUNCTION IF EXISTS public.update_presence(UUID, VARCHAR);
CREATE FUNCTION public.update_presence(p_user_id UUID, p_status VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO presence(user_id, status, last_seen) VALUES(p_user_id, p_status, NOW())
  ON CONFLICT(user_id) DO UPDATE SET status = p_status, last_seen = NOW();
END;
$$;

DROP FUNCTION IF EXISTS public.create_poll(UUID, TEXT, TEXT[], INT);
CREATE FUNCTION public.create_poll(p_user_id UUID, p_title TEXT, p_options TEXT[], p_duration_hours INT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_poll_id BIGINT;
  v_option TEXT;
BEGIN
  INSERT INTO polls(user_id, title, expires_at) VALUES(p_user_id, p_title, NOW() + (p_duration_hours || ' hours')::INTERVAL)
  RETURNING id INTO v_poll_id;
  
  FOREACH v_option IN ARRAY p_options LOOP
    INSERT INTO poll_options(poll_id, option_text) VALUES(v_poll_id, v_option);
  END LOOP;
  
  RETURN v_poll_id;
END;
$$;

DROP FUNCTION IF EXISTS public.vote_poll(BIGINT, BIGINT, UUID);
CREATE FUNCTION public.vote_poll(p_poll_id BIGINT, p_option_id BIGINT, p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO poll_votes(poll_id, option_id, user_id) VALUES(p_poll_id, p_option_id, p_user_id);
END;
$$;

DROP FUNCTION IF EXISTS public.create_media_entry(UUID, TEXT, VARCHAR);
CREATE FUNCTION public.create_media_entry(p_user_id UUID, p_url TEXT, p_type VARCHAR)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  INSERT INTO media(user_id, url, media_type) VALUES(p_user_id, p_url, p_type)
  RETURNING id INTO v_media_id;
  RETURN v_media_id;
END;
$$;

DROP FUNCTION IF EXISTS public.enable_2fa(UUID, TEXT);
CREATE FUNCTION public.enable_2fa(p_user_id UUID, p_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO user_2fa(user_id, secret, enabled) VALUES(p_user_id, p_secret, TRUE)
  ON CONFLICT(user_id) DO UPDATE SET secret = p_secret, enabled = TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.disable_2fa(UUID);
CREATE FUNCTION public.disable_2fa(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE user_2fa SET enabled = FALSE WHERE user_id = p_user_id;
END;
$$;

-- Recreate triggers
DROP FUNCTION IF EXISTS public.create_like_notification();
CREATE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, post_id, type)
  VALUES((SELECT author_id FROM posts WHERE id = NEW.post_id), NEW.user_id, NEW.post_id, 'like');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_like_notification
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

DROP FUNCTION IF EXISTS public.create_follow_notification();
CREATE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, type) VALUES(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_follow_notification
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();
