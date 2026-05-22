-- =============================================================================
-- RLS Migration — Phase 1: Helpers + scorekeeper SECURITY DEFINER RPCs
-- =============================================================================
-- Additive only. Safe to apply with current code running; nothing else changes
-- behavior until Phase 2 enables RLS.
-- =============================================================================

-- ---------- Helper functions ----------

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('owner','staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO anon, authenticated;

-- ---------- Public scorekeeper station read helpers ----------
-- Expose only non-sensitive fields (no pin_hash) to anon so the public
-- /scorekeeper/[stationId] and /tournaments/[slug]/on-deck pages keep working
-- after RLS is enabled.

CREATE OR REPLACE FUNCTION public.scorekeeper_get_station_summary(
  p_station_id uuid
)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  table_number integer,
  label text,
  active boolean,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.tournament_id, s.table_number, s.label, s.active,
         s.last_used_at, s.created_by, s.created_at, s.updated_at
  FROM public.scorekeeper_stations s
  WHERE s.id = p_station_id;
$$;

CREATE OR REPLACE FUNCTION public.scorekeeper_list_tournament_stations_public(
  p_tournament_id uuid
)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  table_number integer,
  label text,
  active boolean,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.tournament_id, s.table_number, s.label, s.active,
         s.last_used_at, s.created_by, s.created_at, s.updated_at
  FROM public.scorekeeper_stations s
  WHERE s.tournament_id = p_tournament_id
  ORDER BY s.table_number;
$$;

GRANT EXECUTE ON FUNCTION public.scorekeeper_get_station_summary(uuid)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scorekeeper_list_tournament_stations_public(uuid)
  TO anon, authenticated;

-- ---------- Scorekeeper-authenticated RPCs ----------
-- All three require (station_id, pin_hash). They re-verify the station every
-- call by comparing the hash against scorekeeper_stations.pin_hash. This is the
-- only path through which the scorekeeper API can mutate match rows after RLS
-- is enabled.

-- 1. Login + heartbeat: validates credentials, touches last_used_at, returns
--    the same fields the API needs to issue a session cookie.
CREATE OR REPLACE FUNCTION public.scorekeeper_validate_station(
  p_station_id uuid,
  p_pin_hash text
)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  table_number integer,
  label text,
  active boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_station public.scorekeeper_stations;
BEGIN
  SELECT * INTO v_station
  FROM public.scorekeeper_stations s
  WHERE s.id = p_station_id
    AND s.active = true
    AND s.pin_hash = p_pin_hash;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.scorekeeper_stations
    SET last_used_at = now(),
        updated_at = now()
    WHERE id = v_station.id;

  RETURN QUERY
  SELECT v_station.id, v_station.tournament_id, v_station.table_number,
         v_station.label, v_station.active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scorekeeper_validate_station(uuid, text)
  TO anon, authenticated;

-- 2. Field-restricted single-match update (start match, live score).
--    Only updates the columns the scorekeeper UI is allowed to touch.
CREATE OR REPLACE FUNCTION public.scorekeeper_update_match_field(
  p_station_id uuid,
  p_pin_hash text,
  p_match_id uuid,
  p_status text DEFAULT NULL,
  p_started_at timestamptz DEFAULT NULL,
  p_player1_score integer DEFAULT NULL,
  p_player2_score integer DEFAULT NULL
)
RETURNS public.matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_station public.scorekeeper_stations;
  v_match public.matches;
BEGIN
  SELECT * INTO v_station
  FROM public.scorekeeper_stations s
  WHERE s.id = p_station_id
    AND s.active = true
    AND s.pin_hash = p_pin_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_station' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF NOT FOUND
     OR v_match.tournament_id <> v_station.tournament_id
     OR v_match.table_number IS NULL
     OR v_match.table_number <> v_station.table_number THEN
    RAISE EXCEPTION 'match_not_at_station' USING ERRCODE = '28000';
  END IF;

  UPDATE public.matches
  SET
    status        = COALESCE(p_status, status),
    started_at    = COALESCE(p_started_at, started_at),
    player1_score = COALESCE(p_player1_score, player1_score),
    player2_score = COALESCE(p_player2_score, player2_score),
    updated_at    = now()
  WHERE id = p_match_id
  RETURNING * INTO v_match;

  RETURN v_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scorekeeper_update_match_field(
  uuid, text, uuid, text, timestamptz, integer, integer
) TO anon, authenticated;

-- 3. Multi-match advancement update (finalize). Mirrors apply_match_updates
--    body but validates every target match belongs to the station's tournament
--    before applying.
CREATE OR REPLACE FUNCTION public.scorekeeper_apply_match_updates(
  p_station_id uuid,
  p_pin_hash text,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_station public.scorekeeper_stations;
  patch jsonb;
  target_match_id uuid;
  target_tournament_id uuid;
BEGIN
  SELECT * INTO v_station
  FROM public.scorekeeper_stations s
  WHERE s.id = p_station_id
    AND s.active = true
    AND s.pin_hash = p_pin_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_station' USING ERRCODE = '28000';
  END IF;

  IF jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'p_updates must be a JSON array';
  END IF;

  -- First pass: verify every match belongs to the station's tournament.
  FOR patch IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    target_match_id := (patch->>'matchId')::uuid;
    IF target_match_id IS NULL THEN
      RAISE EXCEPTION 'Every match update must include matchId';
    END IF;

    SELECT tournament_id INTO target_tournament_id
    FROM public.matches WHERE id = target_match_id;

    IF NOT FOUND OR target_tournament_id <> v_station.tournament_id THEN
      RAISE EXCEPTION 'match_not_in_station_tournament' USING ERRCODE = '28000';
    END IF;
  END LOOP;

  -- Second pass: apply the updates (same logic as apply_match_updates).
  FOR patch IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    target_match_id := (patch->>'matchId')::uuid;

    UPDATE public.matches
    SET
      player1_id = CASE WHEN patch ? 'player1_id' THEN NULLIF(patch->>'player1_id','')::uuid ELSE player1_id END,
      player2_id = CASE WHEN patch ? 'player2_id' THEN NULLIF(patch->>'player2_id','')::uuid ELSE player2_id END,
      winner_id  = CASE WHEN patch ? 'winner_id'  THEN NULLIF(patch->>'winner_id','')::uuid  ELSE winner_id  END,
      player1_score = CASE WHEN patch ? 'player1_score' THEN (patch->>'player1_score')::int ELSE player1_score END,
      player2_score = CASE WHEN patch ? 'player2_score' THEN (patch->>'player2_score')::int ELSE player2_score END,
      status     = CASE WHEN patch ? 'status'     THEN patch->>'status'                      ELSE status     END,
      completed_at = CASE WHEN patch ? 'completed_at' THEN NULLIF(patch->>'completed_at','')::timestamptz ELSE completed_at END,
      started_at = CASE WHEN patch ? 'started_at' THEN NULLIF(patch->>'started_at','')::timestamptz ELSE started_at END,
      table_number = CASE WHEN patch ? 'table_number' THEN NULLIF(patch->>'table_number','')::int ELSE table_number END,
      notes      = CASE WHEN patch ? 'notes'      THEN patch->>'notes'                       ELSE notes      END,
      updated_at = now()
    WHERE id = target_match_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Match % not found', target_match_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scorekeeper_apply_match_updates(uuid, text, jsonb)
  TO anon, authenticated;
