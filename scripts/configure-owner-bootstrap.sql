-- Configure the verified email address that is allowed to claim
-- the first owner account from the frontend.
-- Replace the email below before running.

INSERT INTO public.admin_settings (
  id,
  bootstrap_owner_email,
  bootstrap_completed,
  created_at,
  updated_at
)
VALUES (
  TRUE,
  LOWER('replace-with-owner@example.com'),
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET bootstrap_owner_email = EXCLUDED.bootstrap_owner_email,
    bootstrap_completed = FALSE,
    updated_at = NOW();
