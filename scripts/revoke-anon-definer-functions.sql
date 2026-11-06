-- HELD FOR WALDO'S OK: do not run against production without explicit approval.
--
-- Problem (found in the 2026-11-06 health check): merge_players,
-- relink_participant_player and resolve_player_identity are SECURITY DEFINER and
-- write to players/participants, but EXECUTE was never revoked from PUBLIC, so the
-- anon role can call them. tournament-roadmap.sql only granted to `authenticated`.
--
-- Safe because:
--   * the admin UI calls merge_players / relink_participant_player with a signed-in
--     admin token (src/lib/tournaments.ts), i.e. the `authenticated` role;
--   * public_register_tournament_participant is itself SECURITY DEFINER (owner
--     postgres), so its inner call to resolve_player_identity does not depend on
--     the caller's EXECUTE grant;
--   * authenticated keeps EXECUTE on all three, so nothing admin-side changes.
--
-- Follow-up (not in this script): add an is_app_admin() check inside each function
-- body so a non-admin authenticated user cannot call them either.

begin;

revoke execute on function public.merge_players(uuid, uuid) from public, anon;
revoke execute on function public.relink_participant_player(uuid, uuid) from public, anon;
revoke execute on function public.resolve_player_identity(text, text, text, text) from public, anon;

grant execute on function public.merge_players(uuid, uuid) to authenticated;
grant execute on function public.relink_participant_player(uuid, uuid) to authenticated;
grant execute on function public.resolve_player_identity(text, text, text, text) to authenticated;

commit;

-- Verify: anon_x should be false and auth_x true for all three rows.
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_x,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_x
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('merge_players', 'relink_participant_player', 'resolve_player_identity');

-- Rollback (only if something unexpected breaks):
--   grant execute on function public.merge_players(uuid, uuid) to anon;
--   grant execute on function public.relink_participant_player(uuid, uuid) to anon;
--   grant execute on function public.resolve_player_identity(text, text, text, text) to anon;
