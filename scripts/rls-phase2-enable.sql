-- =============================================================================
-- RLS Migration — Phase 2: Enable RLS + per-table policies + admin RPC gates
-- =============================================================================
-- BREAKING CHANGE. Apply only AFTER:
--   1. Phase 1 SQL is applied (helpers + scorekeeper RPCs exist)
--   2. Updated app code is deployed (scorekeeper API routes call new RPCs)
--
-- Rollback per table:
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
-- =============================================================================

BEGIN;

-- ---------- Group 1: public-read, admin-write ----------
-- tournaments, participants, matches, rounds, players, leagues, seasons
-- Anon: SELECT only. Authenticated admins: full DML. Public registration uses
-- public_register_tournament_participant (SECURITY DEFINER) which bypasses RLS.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tournaments','participants','matches','rounds','players','leagues','seasons'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_read', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_app_admin()) WITH CHECK (public.is_app_admin())',
      t || '_admin_write', t
    );
  END LOOP;
END $$;

-- ---------- Group 2: announcements (RLS already on, but policies too loose) ----------

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_write ON public.announcements;

REVOKE INSERT, UPDATE, DELETE ON public.announcements FROM anon;

CREATE POLICY announcements_admin_write ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- ---------- Group 3: admin-only tables ----------
-- scorekeeper_stations, admin_settings — no anon access.
-- Public bracket/on-deck/scorekeeper-entry pages read stations via the
-- SECURITY DEFINER RPCs added in Phase 1.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['scorekeeper_stations','admin_settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_app_admin()) WITH CHECK (public.is_app_admin())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;

-- ---------- Group 4: user_profiles ----------
-- RLS already enabled. Writes only via SECURITY DEFINER RPCs
-- (ensure_current_user_profile, assign_user_role, claim_initial_owner).
-- Self-read policy stays. Add admin-read-all.

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;

DROP POLICY IF EXISTS user_profiles_admin_select ON public.user_profiles;
CREATE POLICY user_profiles_admin_select ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_app_admin());

-- ---------- Admin RPC tightening ----------
-- These RPCs perform privileged writes; once RLS is on we make them
-- SECURITY DEFINER and gate them with is_app_admin() so authenticated
-- non-admins can't call them. Anon EXECUTE is revoked.

CREATE OR REPLACE FUNCTION public.apply_match_updates(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  patch jsonb;
  target_match_id uuid;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'p_updates must be a JSON array';
  END IF;

  FOR patch IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    target_match_id := (patch->>'matchId')::uuid;

    IF target_match_id IS NULL THEN
      RAISE EXCEPTION 'Every match update must include matchId';
    END IF;

    UPDATE public.matches
    SET
      player1_id    = CASE WHEN patch ? 'player1_id'    THEN (patch->>'player1_id')::uuid     ELSE player1_id    END,
      player2_id    = CASE WHEN patch ? 'player2_id'    THEN (patch->>'player2_id')::uuid     ELSE player2_id    END,
      winner_id     = CASE WHEN patch ? 'winner_id'     THEN (patch->>'winner_id')::uuid      ELSE winner_id     END,
      player1_score = CASE WHEN patch ? 'player1_score' THEN (patch->>'player1_score')::int   ELSE player1_score END,
      player2_score = CASE WHEN patch ? 'player2_score' THEN (patch->>'player2_score')::int   ELSE player2_score END,
      status        = CASE WHEN patch ? 'status'        THEN patch->>'status'                 ELSE status        END,
      completed_at  = CASE WHEN patch ? 'completed_at'  THEN (patch->>'completed_at')::timestamptz ELSE completed_at END,
      started_at    = CASE WHEN patch ? 'started_at'    THEN (patch->>'started_at')::timestamptz   ELSE started_at END,
      table_number  = CASE WHEN patch ? 'table_number'  THEN (patch->>'table_number')::int    ELSE table_number  END,
      notes         = CASE WHEN patch ? 'notes'         THEN patch->>'notes'                  ELSE notes         END,
      updated_at    = now()
    WHERE id = target_match_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Match % not found', target_match_id;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_match_updates(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_match_updates(jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.reseed_tournament_participants(
  p_tournament_id uuid,
  p_participant_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  tournament_participant_count int;
  provided_participant_count int;
  distinct_participant_count int;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  IF p_tournament_id IS NULL THEN
    RAISE EXCEPTION 'p_tournament_id is required';
  END IF;

  provided_participant_count := COALESCE(array_length(p_participant_ids, 1), 0);

  IF provided_participant_count = 0 THEN
    RAISE EXCEPTION 'p_participant_ids must include at least one participant';
  END IF;

  SELECT count(*) INTO tournament_participant_count
  FROM public.participants
  WHERE tournament_id = p_tournament_id;

  IF tournament_participant_count <> provided_participant_count THEN
    RAISE EXCEPTION
      'Seed order must include every participant in the tournament (% expected, % provided)',
      tournament_participant_count, provided_participant_count;
  END IF;

  SELECT count(DISTINCT participant_id) INTO distinct_participant_count
  FROM unnest(p_participant_ids) AS ordered(participant_id);

  IF distinct_participant_count <> provided_participant_count THEN
    RAISE EXCEPTION 'p_participant_ids contains duplicate participant ids';
  END IF;

  UPDATE public.participants
  SET seed = COALESCE(seed, 0) + 1000, updated_at = now()
  WHERE tournament_id = p_tournament_id;

  WITH ordered AS (
    SELECT participant_id, ordinality AS new_seed
    FROM unnest(p_participant_ids) WITH ORDINALITY AS t(participant_id, ordinality)
  )
  UPDATE public.participants AS participants
  SET seed = ordered.new_seed::int, updated_at = now()
  FROM ordered
  WHERE participants.id = ordered.participant_id
    AND participants.tournament_id = p_tournament_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reseed_tournament_participants(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reseed_tournament_participants(uuid, uuid[]) TO authenticated;

COMMIT;
