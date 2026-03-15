-- One-time bootstrap for the first owner account.
-- Replace the email below with the account that should own admin access.

WITH target_user AS (
  SELECT
    u.id,
    u.email,
    COALESCE(
      NULLIF(u.profile ->> 'name', ''),
      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
      'Owner'
    ) AS display_name
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER('replace-with-owner@example.com')
    AND COALESCE(u.is_anonymous, FALSE) = FALSE
)
INSERT INTO public.user_profiles (
  id,
  display_name,
  role,
  created_at,
  updated_at
)
SELECT
  target_user.id,
  target_user.display_name,
  'owner',
  NOW(),
  NOW()
FROM target_user
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role = 'owner',
    updated_at = NOW();

UPDATE auth.users u
SET profile = COALESCE(u.profile, '{}'::jsonb) || jsonb_build_object('role', 'owner'),
    updated_at = NOW()
FROM target_user
WHERE u.id = target_user.id;
