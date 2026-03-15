BEGIN;

ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('user', 'staff', 'owner'));
  END IF;
END $$;

REVOKE ALL ON public.user_profiles FROM anon, authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_select_own'
  ) THEN
    CREATE POLICY user_profiles_select_own
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  bootstrap_owner_email text,
  bootstrap_completed boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

REVOKE ALL ON public.admin_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_current_app_role(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT up.role FROM public.user_profiles up WHERE up.id = p_user_id),
    NULLIF((SELECT u.profile ->> 'role' FROM auth.users u WHERE u.id = p_user_id), ''),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_profile public.user_profiles%ROWTYPE;
  v_display_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  v_display_name := COALESCE(
    NULLIF(v_user.profile ->> 'name', ''),
    SPLIT_PART(COALESCE(v_user.email, ''), '@', 1),
    'User'
  );

  INSERT INTO public.user_profiles (
    id,
    display_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_user.id,
    v_display_name,
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      updated_at = NOW();

  SELECT *
  INTO v_profile
  FROM public.user_profiles
  WHERE id = auth.uid();

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access_state()
RETURNS TABLE (
  role text,
  owner_count integer,
  email text,
  email_verified boolean,
  bootstrap_configured boolean,
  needs_owner_bootstrap boolean,
  can_claim_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_role text;
  v_owner_count integer;
  v_bootstrap_owner_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = auth.uid()
    AND COALESCE(is_anonymous, FALSE) = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  v_role := public.get_current_app_role(auth.uid());

  SELECT COUNT(*)
  INTO v_owner_count
  FROM auth.users u
  LEFT JOIN public.user_profiles up
    ON up.id = u.id
  WHERE COALESCE(u.is_anonymous, FALSE) = FALSE
    AND COALESCE(up.role, NULLIF(u.profile ->> 'role', ''), 'user') = 'owner';

  SELECT NULLIF(TRIM(bootstrap_owner_email), '')
  INTO v_bootstrap_owner_email
  FROM public.admin_settings
  WHERE id = TRUE;

  RETURN QUERY
  SELECT
    v_role,
    v_owner_count,
    v_user.email,
    COALESCE(v_user.email_verified, FALSE),
    v_bootstrap_owner_email IS NOT NULL,
    v_owner_count = 0,
    v_owner_count = 0
      AND v_bootstrap_owner_email IS NOT NULL
      AND LOWER(COALESCE(v_user.email, '')) = LOWER(v_bootstrap_owner_email)
      AND COALESCE(v_user.email_verified, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_role_assignable_users()
RETURNS TABLE (
  id uuid,
  email text,
  email_verified boolean,
  display_name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.get_current_app_role() <> 'owner' THEN
    RAISE EXCEPTION 'Only owners can view users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(u.email_verified, FALSE),
    COALESCE(
      NULLIF(up.display_name, ''),
      NULLIF(u.profile ->> 'name', ''),
      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
      'User'
    ) AS display_name,
    COALESCE(
      up.role,
      NULLIF(u.profile ->> 'role', ''),
      'user'
    ) AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_profiles up
    ON up.id = u.id
  WHERE COALESCE(u.is_anonymous, FALSE) = FALSE
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_initial_owner()
RETURNS TABLE (
  id uuid,
  email text,
  email_verified boolean,
  display_name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_display_name text;
  v_owner_count integer;
  v_bootstrap_owner_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = auth.uid()
    AND COALESCE(is_anonymous, FALSE) = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  IF NOT COALESCE(v_user.email_verified, FALSE) THEN
    RAISE EXCEPTION 'Email must be verified before claiming owner access';
  END IF;

  SELECT COUNT(*)
  INTO v_owner_count
  FROM auth.users u
  LEFT JOIN public.user_profiles up
    ON up.id = u.id
  WHERE COALESCE(u.is_anonymous, FALSE) = FALSE
    AND COALESCE(up.role, NULLIF(u.profile ->> 'role', ''), 'user') = 'owner';

  IF v_owner_count > 0 THEN
    RAISE EXCEPTION 'An owner already exists';
  END IF;

  SELECT NULLIF(TRIM(bootstrap_owner_email), '')
  INTO v_bootstrap_owner_email
  FROM public.admin_settings
  WHERE id = TRUE;

  IF v_bootstrap_owner_email IS NULL THEN
    RAISE EXCEPTION 'Bootstrap owner email is not configured';
  END IF;

  IF LOWER(COALESCE(v_user.email, '')) <> LOWER(v_bootstrap_owner_email) THEN
    RAISE EXCEPTION 'This account is not authorized to claim owner access';
  END IF;

  v_display_name := COALESCE(
    NULLIF((SELECT up.display_name FROM public.user_profiles up WHERE up.id = auth.uid()), ''),
    NULLIF(v_user.profile ->> 'name', ''),
    SPLIT_PART(COALESCE(v_user.email, ''), '@', 1),
    'Owner'
  );

  INSERT INTO public.user_profiles (
    id,
    display_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    auth.uid(),
    v_display_name,
    'owner',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role = 'owner',
      updated_at = NOW();

  UPDATE auth.users
  SET profile = COALESCE(profile, '{}'::jsonb) || jsonb_build_object('role', 'owner'),
      updated_at = NOW()
  WHERE id = auth.uid();

  INSERT INTO public.admin_settings (
    id,
    bootstrap_owner_email,
    bootstrap_completed,
    created_at,
    updated_at
  )
  VALUES (
    TRUE,
    v_bootstrap_owner_email,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET bootstrap_completed = TRUE,
      updated_at = NOW();

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(u.email_verified, FALSE),
    COALESCE(
      NULLIF(up.display_name, ''),
      NULLIF(u.profile ->> 'name', ''),
      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
      'Owner'
    ) AS display_name,
    COALESCE(
      up.role,
      NULLIF(u.profile ->> 'role', ''),
      'user'
    ) AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_profiles up
    ON up.id = u.id
  WHERE u.id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS TABLE (
  id uuid,
  email text,
  email_verified boolean,
  display_name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_display_name text;
  v_owner_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.get_current_app_role() <> 'owner' THEN
    RAISE EXCEPTION 'Only owners can assign roles';
  END IF;

  IF p_role NOT IN ('user', 'staff', 'owner') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = p_user_id
    AND COALESCE(is_anonymous, FALSE) = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF auth.uid() = p_user_id AND p_role <> 'owner' THEN
    SELECT COUNT(*)
    INTO v_owner_count
    FROM auth.users u
    LEFT JOIN public.user_profiles up
      ON up.id = u.id
    WHERE COALESCE(
      up.role,
      NULLIF(u.profile ->> 'role', ''),
      'user'
    ) = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'At least one owner must remain';
    END IF;
  END IF;

  v_display_name := COALESCE(
    NULLIF((SELECT up.display_name FROM public.user_profiles up WHERE up.id = p_user_id), ''),
    NULLIF(v_user.profile ->> 'name', ''),
    SPLIT_PART(COALESCE(v_user.email, ''), '@', 1),
    'User'
  );

  INSERT INTO public.user_profiles (
    id,
    display_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_display_name,
    p_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      updated_at = NOW();

  UPDATE auth.users
  SET profile = COALESCE(profile, '{}'::jsonb) || jsonb_build_object('role', p_role),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(u.email_verified, FALSE),
    COALESCE(
      NULLIF(up.display_name, ''),
      NULLIF(u.profile ->> 'name', ''),
      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
      'User'
    ) AS display_name,
    COALESCE(
      up.role,
      NULLIF(u.profile ->> 'role', ''),
      'user'
    ) AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_profiles up
    ON up.id = u.id
  WHERE u.id = p_user_id;
END;
$$;

COMMIT;
