-- ============================================
-- SISTEMA DE MENSAJES DIRECTOS
-- ============================================

-- 1. TABLA DE CONVERSACIONES
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id BIGINT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(participant_1_id, participant_2_id),
  CHECK (participant_1_id != participant_2_id)
);

-- 2. TABLA DE MENSAJES
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20), -- 'image', 'video', 'audio', 'file'
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 3. TABLA DE LECTURA DE MENSAJES (para typing indicators + visto)
CREATE TABLE IF NOT EXISTS message_reads (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(message_id, user_id)
);

-- 4. TABLA DE ESTADO EN LÍNEA
CREATE TABLE IF NOT EXISTS user_online_status (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 5. TABLA DE REACCIONES A MENSAJES
CREATE TABLE IF NOT EXISTS message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(message_id, user_id, emoji)
);

-- 6. TABLA DE BLOQUEOS DE CHAT
CREATE TABLE IF NOT EXISTS chat_blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- 7. TABLA DE NOTIFICACIONES DE CHAT
CREATE TABLE IF NOT EXISTS chat_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  unread_count INT DEFAULT 0,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(user_id, conversation_id)
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_chat_blocks_blocker ON chat_blocks(blocker_id);
CREATE INDEX idx_chat_blocks_blocked ON chat_blocks(blocked_id);
CREATE INDEX idx_chat_notifications_user ON chat_notifications(user_id);
CREATE INDEX idx_chat_notifications_conversation ON chat_notifications(conversation_id);
CREATE INDEX idx_user_online_status ON user_online_status(is_online);

-- ============================================
-- FUNCIONES
-- ============================================

-- Obtener o crear conversación entre dos usuarios
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user_1_id UUID, p_user_2_id UUID)
RETURNS UUID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Intentar encontrar conversación existente (en cualquier orden)
  SELECT id INTO v_conversation_id FROM conversations
  WHERE (participant_1_id = p_user_1_id AND participant_2_id = p_user_2_id)
     OR (participant_1_id = p_user_2_id AND participant_2_id = p_user_1_id)
  LIMIT 1;

  -- Si no existe, crear nueva
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations(participant_1_id, participant_2_id)
    VALUES(LEAST(p_user_1_id, p_user_2_id), GREATEST(p_user_1_id, p_user_2_id))
    RETURNING id INTO v_conversation_id;
    
    -- Crear registros de notificación para ambos usuarios
    INSERT INTO chat_notifications(user_id, conversation_id) 
    VALUES(p_user_1_id, v_conversation_id), (p_user_2_id, v_conversation_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Enviar mensaje
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_media_url TEXT DEFAULT NULL,
  p_media_type VARCHAR DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_message_id BIGINT;
  v_recipient_id UUID;
BEGIN
  -- Insertar mensaje
  INSERT INTO messages(conversation_id, sender_id, content, media_url, media_type)
  VALUES(p_conversation_id, p_sender_id, p_content, p_media_url, p_media_type)
  RETURNING id INTO v_message_id;

  -- Actualizar última información de la conversación
  UPDATE conversations 
  SET last_message_id = v_message_id, 
      last_message_at = NOW(),
      updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Obtener el otro participante
  SELECT CASE 
    WHEN participant_1_id = p_sender_id THEN participant_2_id
    ELSE participant_1_id
  END INTO v_recipient_id
  FROM conversations WHERE id = p_conversation_id;

  -- Incrementar contador de no leídos
  UPDATE chat_notifications
  SET unread_count = unread_count + 1
  WHERE user_id = v_recipient_id AND conversation_id = p_conversation_id;

  RETURN v_message_id;
END;
$$;

-- Marcar mensaje como leído
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id BIGINT, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  INSERT INTO message_reads(message_id, user_id)
  VALUES(p_message_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Obtener conversation_id
  SELECT conversation_id INTO v_conversation_id FROM messages WHERE id = p_message_id;

  -- Actualizar contador de no leídos
  UPDATE chat_notifications
  SET unread_count = (
    SELECT COUNT(*) FROM messages m
    WHERE m.conversation_id = v_conversation_id
    AND m.sender_id != p_user_id
    AND NOT EXISTS (SELECT 1 FROM message_reads WHERE message_id = m.id AND user_id = p_user_id)
  )
  WHERE user_id = p_user_id AND conversation_id = v_conversation_id;
END;
$$;

-- Marcar conversación como leída
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  -- Marcar todos los mensajes como leídos
  INSERT INTO message_reads(message_id, user_id)
  SELECT id, p_user_id FROM messages
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND NOT EXISTS (SELECT 1 FROM message_reads WHERE message_id = messages.id AND user_id = p_user_id)
  ON CONFLICT DO NOTHING;

  -- Resetear contador de no leídos
  UPDATE chat_notifications
  SET unread_count = 0
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
END;
$$;

-- Editar mensaje
CREATE OR REPLACE FUNCTION public.edit_message(p_message_id BIGINT, p_sender_id UUID, p_new_content TEXT)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  -- Verificar que es el autor
  IF NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message_id AND sender_id = p_sender_id) THEN
    RAISE EXCEPTION 'No tienes permiso para editar este mensaje';
  END IF;

  UPDATE messages
  SET content = p_new_content, is_edited = TRUE, edited_at = NOW()
  WHERE id = p_message_id;
END;
$$;

-- Eliminar mensaje
CREATE OR REPLACE FUNCTION public.delete_message(p_message_id BIGINT, p_sender_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  -- Verificar que es el autor
  IF NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message_id AND sender_id = p_sender_id) THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar este mensaje';
  END IF;

  UPDATE messages
  SET is_deleted = TRUE, deleted_at = NOW()
  WHERE id = p_message_id;
END;
$$;

-- Obtener conversaciones del usuario
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE(
  conversation_id UUID,
  other_user_id UUID,
  other_user_username VARCHAR,
  other_user_avatar TEXT,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INT,
  is_online BOOLEAN,
  muted BOOLEAN
) LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    CASE WHEN c.participant_1_id = p_user_id THEN c.participant_2_id ELSE c.participant_1_id END,
    p.username,
    p.avatar_url,
    m.content,
    c.last_message_at,
    cn.unread_count,
    COALESCE(uos.is_online, FALSE),
    cn.muted
  FROM conversations c
  JOIN profiles p ON (
    CASE WHEN c.participant_1_id = p_user_id THEN c.participant_2_id ELSE c.participant_1_id END = p.id
  )
  LEFT JOIN messages m ON m.id = c.last_message_id
  LEFT JOIN chat_notifications cn ON cn.user_id = p_user_id AND cn.conversation_id = c.id
  LEFT JOIN user_online_status uos ON uos.id = p.id
  WHERE c.participant_1_id = p_user_id OR c.participant_2_id = p_user_id
  ORDER BY c.updated_at DESC;
END;
$$;

-- Obtener mensajes de una conversación
CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conversation_id UUID, p_user_id UUID, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE(
  message_id BIGINT,
  sender_id UUID,
  sender_username VARCHAR,
  sender_avatar TEXT,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR,
  is_edited BOOLEAN,
  is_deleted BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN
) LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    p.username,
    p.avatar_url,
    m.content,
    m.media_url,
    m.media_type,
    m.is_edited,
    m.is_deleted,
    m.created_at,
    EXISTS(SELECT 1 FROM message_reads WHERE message_id = m.id AND user_id = p_user_id)
  FROM messages m
  JOIN profiles p ON m.sender_id = p.id
  WHERE m.conversation_id = p_conversation_id AND NOT m.is_deleted
  ORDER BY m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Bloquear usuario en chat
CREATE OR REPLACE FUNCTION public.block_user_chat(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO chat_blocks(blocker_id, blocked_id)
  VALUES(p_blocker_id, p_blocked_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Desbloquear usuario en chat
CREATE OR REPLACE FUNCTION public.unblock_user_chat(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  DELETE FROM chat_blocks
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;
END;
$$;

-- Verificar si está bloqueado
CREATE OR REPLACE FUNCTION public.is_blocked_in_chat(p_user_1_id UUID, p_user_2_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM chat_blocks
    WHERE (blocker_id = p_user_1_id AND blocked_id = p_user_2_id)
       OR (blocker_id = p_user_2_id AND blocked_id = p_user_1_id)
  );
END;
$$;

-- Actualizar estado en línea
CREATE OR REPLACE FUNCTION public.update_online_status(p_user_id UUID, p_is_online BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_online_status(id, is_online, last_seen, updated_at)
  VALUES(p_user_id, p_is_online, NOW(), NOW())
  ON CONFLICT(id) DO UPDATE SET is_online = p_is_online, last_seen = NOW(), updated_at = NOW();
END;
$$;

-- Obtener total de no leídos del usuario
CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0) INTO v_count FROM chat_notifications
  WHERE user_id = p_user_id AND NOT muted;
  RETURN v_count;
END;
$$;

-- Mutear/desmutear conversación
CREATE OR REPLACE FUNCTION public.toggle_conversation_mute(p_user_id UUID, p_conversation_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  UPDATE chat_notifications
  SET muted = NOT muted
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
END;
$$;

-- Agregar reacción a mensaje
CREATE OR REPLACE FUNCTION public.add_message_reaction(p_message_id BIGINT, p_user_id UUID, p_emoji VARCHAR)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO message_reactions(message_id, user_id, emoji)
  VALUES(p_message_id, p_user_id, p_emoji)
  ON CONFLICT(message_id, user_id, emoji) DO NOTHING;
END;
$$;

-- Eliminar reacción de mensaje
CREATE OR REPLACE FUNCTION public.remove_message_reaction(p_message_id BIGINT, p_user_id UUID, p_emoji VARCHAR)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  DELETE FROM message_reactions
  WHERE message_id = p_message_id AND user_id = p_user_id AND emoji = p_emoji;
END;
$$;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversations they're part of" ON conversations
  FOR SELECT USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);
CREATE POLICY "Users can't create conversations with blocked users" ON conversations
  FOR INSERT WITH CHECK (NOT is_blocked_in_chat(auth.uid(), participant_2_id) AND NOT is_blocked_in_chat(auth.uid(), participant_1_id));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in conversations they're in" ON messages
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM conversations WHERE id = conversation_id AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid()))
    AND NOT is_blocked_in_chat(auth.uid(), sender_id)
  );
CREATE POLICY "Users can insert messages to conversations they're in" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS(SELECT 1 FROM conversations WHERE id = conversation_id AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())));
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view message reads" ON message_reads
  FOR SELECT USING (true);
CREATE POLICY "Users can mark messages as read" ON message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_online_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view online status" ON user_online_status
  FOR SELECT USING (true);
CREATE POLICY "Users can update their own status" ON user_online_status
  FOR UPDATE USING (auth.uid() = id);

ALTER TABLE chat_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view chat blocks" ON chat_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "Users can block/unblock" ON chat_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Crear estado en línea al registrarse
CREATE OR REPLACE FUNCTION public.create_online_status_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_online_status(id, is_online, last_seen)
  VALUES(NEW.id, FALSE, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_online_status ON auth.users;
CREATE TRIGGER trigger_create_online_status
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_online_status_on_signup();
