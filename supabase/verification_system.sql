-- Verification system migration for Xbi
-- Adds a verifications table, profile verification flags, helper functions and basic RLS policies.

-- 1) Add columns to profiles
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_metadata jsonb;

-- 2) Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  documents text[], -- array of storage URLs or doc IDs
  reason text,
  admin_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);

-- 3) Function: request verification
CREATE OR REPLACE FUNCTION request_verification(p_user_id uuid, p_documents text[], p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- prevent duplicates: if a pending exists, do nothing
  IF EXISTS (SELECT 1 FROM verifications WHERE user_id = p_user_id AND status = 'pending') THEN
    RETURN;
  END IF;

  INSERT INTO verifications(user_id, documents, reason)
  VALUES (p_user_id, p_documents, p_reason);
END;
$$;

-- 4) Function: admin review
CREATE OR REPLACE FUNCTION admin_review_verification(p_verification_id uuid, p_status text, p_admin_id uuid, p_metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE verifications
  SET status = p_status,
      admin_id = p_admin_id,
      reviewed_at = now()
  WHERE id = p_verification_id;

  IF p_status = 'approved' THEN
    -- mark profile as verified and store metadata
    UPDATE profiles
    SET is_verified = true,
        verified_metadata = p_metadata
    WHERE id = (SELECT user_id FROM verifications WHERE id = p_verification_id);
  ELSE
    -- if rejected, ensure profile is not marked verified
    UPDATE profiles
    SET is_verified = false
    WHERE id = (SELECT user_id FROM verifications WHERE id = p_verification_id);
  END IF;
END;
$$;

-- 5) Enable RLS on verifications and add basic policies
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own verification request
CREATE POLICY verifications_insert_by_owner ON verifications
  FOR INSERT
  TO public
  USING (true)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Allow users to select their own verifications
CREATE POLICY verifications_select_owner ON verifications
  FOR SELECT
  TO public
  USING (auth.uid()::uuid = user_id OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.id::text = auth.uid() AND ur.role = 'admin'));

-- Allow admins to update verification status
CREATE POLICY verifications_update_admin ON verifications
  FOR UPDATE
  TO public
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.id::text = auth.uid() AND ur.role = 'admin'));

-- Note: This script assumes a `user_roles` table with id (uuid) and role (text)
-- Run this migration in Supabase SQL editor. If `gen_random_uuid()` is not available, enable pgcrypto extension or replace with uuid_generate_v4().

-- End of verification system migration
