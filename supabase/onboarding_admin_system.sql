-- ============================================
-- SISTEMA DE ONBOARDING + ADMINISTRACIÓN
-- ============================================

-- 1. TABLA DE ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2. TABLA DE ONBOARDING
CREATE TABLE IF NOT EXISTS onboarding_status (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step_completed INT DEFAULT 0, -- 0-5 steps
  profile_completed BOOLEAN DEFAULT FALSE,
  bio_completed BOOLEAN DEFAULT FALSE,
  interests_completed BOOLEAN DEFAULT FALSE,
  follow_suggested_completed BOOLEAN DEFAULT FALSE,
  tutorial_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 3. TABLA DE INTERESES
CREATE TABLE IF NOT EXISTS user_interests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  UNIQUE(user_id, interest)
);

-- 4. TABLA DE ACTIVIDADES DE ADMIN
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 5. TABLA DE REPORTES DE USUARIOS
CREATE TABLE IF NOT EXISTS user_reports (
  id BIGSERIAL PRIMARY KEY,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(reported_by, reported_user_id)
);

-- 6. TABLA DE ACCIONES DE MODERACIÓN
CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('warn', 'suspend', 'ban', 'shadow_ban')),
  duration_days INT,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_onboarding_status_completed ON onboarding_status(tutorial_completed);
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_user_id);
CREATE INDEX idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_moderation_actions_user ON moderation_actions(user_id);
CREATE INDEX idx_moderation_actions_expires ON moderation_actions(expires_at);

-- ============================================
-- FUNCIONES DE SEGURIDAD
-- ============================================

-- Obtener rol del usuario
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS VARCHAR LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE id = p_user_id;
  RETURN COALESCE(v_role, 'user');
END;
$$;

-- Verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM user_roles WHERE id = p_user_id AND role = 'admin');
END;
$$;

-- Verificar si es moderator
CREATE OR REPLACE FUNCTION public.is_moderator(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM user_roles WHERE id = p_user_id AND role IN ('admin', 'moderator'));
END;
$$;

-- Obtener progreso de onboarding
CREATE OR REPLACE FUNCTION public.get_onboarding_progress(p_user_id UUID)
RETURNS TABLE(step_completed INT, profile_completed BOOLEAN, bio_completed BOOLEAN, interests_completed BOOLEAN, follow_suggested_completed BOOLEAN, tutorial_completed BOOLEAN)
LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    os.step_completed,
    os.profile_completed,
    os.bio_completed,
    os.interests_completed,
    os.follow_suggested_completed,
    os.tutorial_completed
  FROM onboarding_status os
  WHERE os.id = p_user_id;
END;
$$;

-- Actualizar paso de onboarding
CREATE OR REPLACE FUNCTION public.update_onboarding_step(p_user_id UUID, p_step INT)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO onboarding_status(id, step_completed)
  VALUES(p_user_id, p_step)
  ON CONFLICT(id) DO UPDATE SET step_completed = p_step, updated_at = NOW();
  
  IF p_step >= 5 THEN
    UPDATE onboarding_status SET tutorial_completed = TRUE, completed_at = NOW() WHERE id = p_user_id;
  END IF;
END;
$$;

-- Completar perfil
CREATE OR REPLACE FUNCTION public.complete_profile_step(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO onboarding_status(id, profile_completed)
  VALUES(p_user_id, TRUE)
  ON CONFLICT(id) DO UPDATE SET profile_completed = TRUE, updated_at = NOW();
END;
$$;

-- Agregar intereses
CREATE OR REPLACE FUNCTION public.add_user_interests(p_user_id UUID, p_interests TEXT[])
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_interest TEXT;
BEGIN
  FOREACH v_interest IN ARRAY p_interests LOOP
    INSERT INTO user_interests(user_id, interest) 
    VALUES(p_user_id, v_interest)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  UPDATE onboarding_status SET interests_completed = TRUE, updated_at = NOW() WHERE id = p_user_id;
END;
$$;

-- Crear reporte de usuario
CREATE OR REPLACE FUNCTION public.report_user(p_reported_by UUID, p_reported_user_id UUID, p_reason VARCHAR, p_description TEXT)
RETURNS BIGINT LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_report_id BIGINT;
BEGIN
  INSERT INTO user_reports(reported_by, reported_user_id, reason, description)
  VALUES(p_reported_by, p_reported_user_id, p_reason, p_description)
  RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$;

-- Crear acción de moderación
CREATE OR REPLACE FUNCTION public.create_moderation_action(p_user_id UUID, p_action_type VARCHAR, p_duration_days INT, p_reason TEXT, p_created_by UUID)
RETURNS BIGINT LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  v_action_id BIGINT;
BEGIN
  IF NOT is_admin(p_created_by) THEN
    RAISE EXCEPTION 'Solo admins pueden crear acciones de moderación';
  END IF;
  
  INSERT INTO moderation_actions(user_id, action_type, duration_days, reason, created_by, expires_at)
  VALUES(
    p_user_id, 
    p_action_type, 
    p_duration_days,
    p_reason, 
    p_created_by,
    CASE WHEN p_duration_days IS NOT NULL THEN NOW() + (p_duration_days || ' days')::INTERVAL ELSE NULL END
  )
  RETURNING id INTO v_action_id;
  
  INSERT INTO admin_logs(admin_id, action, target_user_id, details)
  VALUES(p_created_by, 'moderation_action_created', p_user_id, jsonb_build_object('action_type', p_action_type, 'duration_days', p_duration_days));
  
  RETURN v_action_id;
END;
$$;

-- Verificar si usuario está baneado
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM moderation_actions 
    WHERE user_id = p_user_id 
    AND action_type IN ('suspend', 'ban')
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Promover a admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_user_id UUID, p_promoted_by UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin(p_promoted_by) THEN
    RAISE EXCEPTION 'Solo admins pueden promover usuarios';
  END IF;
  
  INSERT INTO user_roles(id, role) VALUES(p_user_id, 'admin')
  ON CONFLICT(id) DO UPDATE SET role = 'admin', updated_at = NOW();
  
  INSERT INTO admin_logs(admin_id, action, target_user_id)
  VALUES(p_promoted_by, 'user_promoted_to_admin', p_user_id);
END;
$$;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));
CREATE POLICY "Only admins can update roles" ON user_roles
  FOR UPDATE USING (is_admin(auth.uid()));

ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own onboarding" ON onboarding_status
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own onboarding" ON onboarding_status
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their onboarding" ON onboarding_status
  FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their interests" ON user_interests
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view admin logs" ON admin_logs
  FOR SELECT USING (is_admin(auth.uid()));

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reported_by OR auth.uid() = reported_user_id OR is_moderator(auth.uid()));
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Moderators can update reports" ON user_reports
  FOR UPDATE USING (is_moderator(auth.uid()));

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators can view all moderation actions" ON moderation_actions
  FOR SELECT USING (is_moderator(auth.uid()));
CREATE POLICY "Only admins can create moderation actions" ON moderation_actions
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- TRIGGERS
-- ============================================

-- Crear registro de onboarding para nuevo usuario
CREATE OR REPLACE FUNCTION public.create_onboarding_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_roles(id, role) VALUES(NEW.id, 'user');
  INSERT INTO onboarding_status(id) VALUES(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_onboarding ON auth.users;
CREATE TRIGGER trigger_create_onboarding
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_onboarding_on_signup();

-- Limpiar acciones de moderación expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_moderation()
RETURNS VOID LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  UPDATE moderation_actions 
  SET action_type = 'dismissed' 
  WHERE expires_at < NOW() AND action_type != 'ban';
END;
$$;
