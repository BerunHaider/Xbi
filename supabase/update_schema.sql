-- ============================================
-- SCRIPT PARA ACTUALIZAR SCHEMA EXISTENTE
-- ============================================

-- ============================================
-- 1. ELIMINAR FUNCIONES EXISTENTES
-- ============================================

DROP FUNCTION IF EXISTS search_users(text, integer) CASCADE;
DROP FUNCTION IF EXISTS search_posts(text, integer) CASCADE;
DROP FUNCTION IF EXISTS is_following(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_suggestions(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS is_blocked(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS block_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS unblock_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS toggle_like(bigint, uuid) CASCADE;
DROP FUNCTION IF EXISTS toggle_like(bigint) CASCADE;
DROP FUNCTION IF EXISTS get_unread_notifications_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_notifications_as_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_timeline_feed(uuid, integer, integer) CASCADE;

-- ============================================
-- 2. ELIMINAR TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_followers_count ON follows CASCADE;
DROP TRIGGER IF EXISTS trigger_update_followers_count_delete ON follows CASCADE;
DROP TRIGGER IF EXISTS trigger_update_posts_count ON posts CASCADE;
DROP TRIGGER IF EXISTS trigger_update_posts_count_delete ON posts CASCADE;
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments CASCADE;
DROP TRIGGER IF EXISTS trigger_update_comments_count_delete ON comments CASCADE;
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes CASCADE;
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows CASCADE;
DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments CASCADE;

-- ============================================
-- 3. CREAR/ACTUALIZAR TABLAS (si no existen)
-- ============================================

-- Tabla de Perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255),
  bio TEXT,
  location VARCHAR(100),
  website VARCHAR(255),
  avatar_url TEXT,
  cover_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  private_account BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Tabla de Posts
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Tabla de Comentarios
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Tabla de Likes
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(post_id, user_id)
);

-- Tabla de Seguimientos
CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Tabla de Bloqueos
CREATE TABLE IF NOT EXISTS blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Tabla de Historial de Búsquedas
CREATE TABLE IF NOT EXISTS search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Tabla de Configuraciones del Usuario
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  private_account BOOLEAN DEFAULT FALSE,
  show_analytics BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- ============================================
-- 4. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- TABLAS ADICIONALES: BOOKMARKS Y REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending, reviewed, dismissed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);

-- ============================================
-- 5. RECREAR FUNCIONES DE BÚSQUEDA
-- ============================================

CREATE FUNCTION search_users(search_query TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  username VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER,
  is_verified BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql;

CREATE FUNCTION search_posts(search_query TEXT, limit_count INT DEFAULT 30)
RETURNS TABLE(
  id BIGINT,
  author_id UUID,
  author_username VARCHAR,
  content TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. RECREAR FUNCIONES DE SEGUIMIENTO
-- ============================================

CREATE FUNCTION is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
  );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION get_user_suggestions(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  username VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RECREAR FUNCIONES DE BLOQUEO
-- ============================================

CREATE FUNCTION is_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM blocks
    WHERE blocker_id = p_blocker_id
      AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION block_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO blocks(blocker_id, blocked_id)
  VALUES(p_blocker_id, p_blocked_id)
  ON CONFLICT DO NOTHING;
  
  DELETE FROM follows
  WHERE (follower_id = p_blocker_id AND following_id = p_blocked_id)
     OR (follower_id = p_blocked_id AND following_id = p_blocker_id);
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM blocks
  WHERE blocker_id = p_blocker_id
    AND blocked_id = p_blocked_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. RECREAR FUNCIONES DE LIKES
-- ============================================

CREATE FUNCTION toggle_like(p_post_id BIGINT)
RETURNS TABLE(liked BOOLEAN, likes_count INTEGER) AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  v_user_id := AUTH.UID();
  
  v_liked := EXISTS(
    SELECT 1 FROM likes
    WHERE post_id = p_post_id AND user_id = v_user_id
  );
  
  IF v_liked THEN
    DELETE FROM likes
    WHERE post_id = p_post_id AND user_id = v_user_id;
  ELSE
    INSERT INTO likes(post_id, user_id)
    VALUES(p_post_id, v_user_id);
  END IF;
  
  v_likes_count := (SELECT COUNT(*) FROM likes WHERE post_id = p_post_id);
  
  UPDATE posts SET likes_count = v_likes_count WHERE id = p_post_id;
  
  RETURN QUERY SELECT NOT v_liked, v_likes_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. RECREAR FUNCIONES DE NOTIFICACIONES
-- ============================================

CREATE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION mark_notifications_as_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. RECREAR FUNCIONES DE TIMELINE
-- ============================================

CREATE FUNCTION get_timeline_feed(p_user_id UUID, p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE(
  id BIGINT,
  author_id UUID,
  author_username VARCHAR,
  author_avatar_url TEXT,
  content TEXT,
  image_url TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  liked_by_user BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    pr.username,
    pr.avatar_url,
    p.content,
    p.image_url,
    p.likes_count,
    p.comments_count,
    p.created_at,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = p_user_id) as liked_by_user
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE p.author_id = p_user_id
     OR p.author_id IN (
       SELECT following_id FROM follows WHERE follower_id = p_user_id
     )
    AND p.author_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = p_user_id
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. RECREAR TRIGGERS
-- ============================================

CREATE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = NEW.following_id)
  WHERE id = NEW.following_id;
  
  UPDATE profiles
  SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = NEW.follower_id)
  WHERE id = NEW.follower_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_followers_count
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION update_followers_count();

CREATE FUNCTION update_followers_count_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = OLD.following_id)
  WHERE id = OLD.following_id;
  
  UPDATE profiles
  SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = OLD.follower_id)
  WHERE id = OLD.follower_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_followers_count_delete
AFTER DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_followers_count_delete();

CREATE FUNCTION update_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET posts_count = (SELECT COUNT(*) FROM posts WHERE author_id = NEW.author_id)
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_posts_count
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION update_posts_count();

CREATE FUNCTION update_posts_count_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET posts_count = (SELECT COUNT(*) FROM posts WHERE author_id = OLD.author_id)
  WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_posts_count_delete
AFTER DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_posts_count_delete();

CREATE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comments_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

CREATE FUNCTION update_comments_count_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comments_count_delete
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count_delete();

CREATE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, post_id, type, content)
  SELECT 
    p.author_id,
    NEW.user_id,
    NEW.post_id,
    'like',
    'Te dio me gusta en tu post'
  FROM posts p
  WHERE p.id = NEW.post_id AND p.author_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_like_notification
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

CREATE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, type, content)
  VALUES(
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'Te empezó a seguir'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_follow_notification
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();

CREATE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, actor_id, post_id, type, content)
  SELECT 
    p.author_id,
    NEW.author_id,
    NEW.post_id,
    'reply',
    'Comentó en tu post: ' || NEW.content
  FROM posts p
  WHERE p.id = NEW.post_id AND p.author_id != NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

-- ============================================
-- FIN DEL SCRIPT DE ACTUALIZACIÓN
-- ============================================
