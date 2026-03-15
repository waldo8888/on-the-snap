create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null,
  primary_email text null,
  primary_phone text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_players_primary_email on public.players (primary_email);
create index if not exists idx_players_primary_phone on public.players (primary_phone);
create index if not exists idx_players_normalized_name on public.players (normalized_name);

alter table public.participants
  add column if not exists player_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.participants'::regclass
      and conname = 'participants_player_id_fkey'
  ) then
    alter table public.participants
      add constraint participants_player_id_fkey
      foreign key (player_id) references public.players(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_participants_player_id on public.participants (player_id);

create or replace function public.notify_participant_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  payload_tournament_id uuid;
  payload_row public.participants%rowtype;
begin
  payload_row := case when tg_op = 'DELETE' then old else new end;
  payload_tournament_id := payload_row.tournament_id;

  perform realtime.publish(
    'tournament:' || payload_tournament_id::text,
    tg_op || '_participant',
    jsonb_build_object(
      'id', payload_row.id,
      'tournament_id', payload_tournament_id,
      'name', payload_row.name,
      'email', payload_row.email,
      'phone', payload_row.phone,
      'seed', payload_row.seed,
      'checked_in', payload_row.checked_in,
      'player_id', payload_row.player_id
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists participant_realtime_insert on public.participants;
drop trigger if exists participant_realtime_update on public.participants;
drop trigger if exists participant_realtime_delete on public.participants;

create trigger participant_realtime_insert
  after insert on public.participants
  for each row
  execute function public.notify_participant_changes();

create trigger participant_realtime_update
  after update on public.participants
  for each row
  execute function public.notify_participant_changes();

create trigger participant_realtime_delete
  after delete on public.participants
  for each row
  execute function public.notify_participant_changes();

create or replace function public.notify_announcement_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  payload_tournament_id uuid;
  payload_row public.announcements%rowtype;
begin
  payload_row := case when tg_op = 'DELETE' then old else new end;
  payload_tournament_id := payload_row.tournament_id;

  perform realtime.publish(
    'tournament:' || payload_tournament_id::text,
    tg_op || '_announcement',
    jsonb_build_object(
      'id', payload_row.id,
      'tournament_id', payload_tournament_id,
      'message', payload_row.message,
      'pinned', payload_row.pinned,
      'created_at', payload_row.created_at
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists announcement_realtime_insert on public.announcements;
drop trigger if exists announcement_realtime_update on public.announcements;
drop trigger if exists announcement_realtime_delete on public.announcements;

create trigger announcement_realtime_insert
  after insert on public.announcements
  for each row
  execute function public.notify_announcement_changes();

create trigger announcement_realtime_update
  after update on public.announcements
  for each row
  execute function public.notify_announcement_changes();

create trigger announcement_realtime_delete
  after delete on public.announcements
  for each row
  execute function public.notify_announcement_changes();

create or replace function public.normalize_player_name(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(trim(coalesce(p_value, ''))), '\s+', ' ', 'g'), '')
$$;

create or replace function public.normalize_player_email(p_value text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(coalesce(p_value, ''))), '')
$$;

create or replace function public.normalize_player_phone(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '')
$$;

create or replace function public.resolve_player_identity(
  p_display_name text,
  p_email text default null,
  p_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name_value text := coalesce(nullif(trim(coalesce(p_display_name, '')), ''), 'Unknown Player');
  normalized_name_value text := coalesce(public.normalize_player_name(p_display_name), 'unknown player');
  normalized_email_value text := public.normalize_player_email(p_email);
  normalized_phone_value text := public.normalize_player_phone(p_phone);
  resolved_player_id uuid;
begin
  if normalized_email_value is not null then
    select players.id
    into resolved_player_id
    from public.players
    where primary_email = normalized_email_value
    order by updated_at desc, created_at asc
    limit 1;
  end if;

  if resolved_player_id is null and normalized_phone_value is not null then
    select players.id
    into resolved_player_id
    from public.players
    where primary_phone = normalized_phone_value
    order by updated_at desc, created_at asc
    limit 1;
  end if;

  if resolved_player_id is null then
    insert into public.players (
      display_name,
      normalized_name,
      primary_email,
      primary_phone,
      notes
    )
    values (
      display_name_value,
      normalized_name_value,
      normalized_email_value,
      normalized_phone_value,
      nullif(trim(coalesce(p_notes, '')), '')
    )
    returning id into resolved_player_id;
  else
    update public.players as existing
    set
      display_name = case
        when nullif(trim(coalesce(existing.display_name, '')), '') is null
          then display_name_value
        else existing.display_name
      end,
      normalized_name = coalesce(nullif(existing.normalized_name, ''), normalized_name_value),
      primary_email = coalesce(existing.primary_email, normalized_email_value),
      primary_phone = coalesce(existing.primary_phone, normalized_phone_value),
      notes = coalesce(existing.notes, nullif(trim(coalesce(p_notes, '')), '')),
      updated_at = now()
    where existing.id = resolved_player_id;
  end if;

  return resolved_player_id;
end;
$$;

create or replace function public.assign_participant_player_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_id is null then
    new.player_id := public.resolve_player_identity(new.name, new.email, new.phone, new.notes);
  end if;

  return new;
end;
$$;

drop trigger if exists participants_assign_player_id on public.participants;

create trigger participants_assign_player_id
  before insert or update of name, email, phone, notes, player_id
  on public.participants
  for each row
  execute function public.assign_participant_player_id();

update public.participants
set
  player_id = public.resolve_player_identity(name, email, phone, notes),
  updated_at = now()
where player_id is null;

create or replace function public.relink_participant_player(
  p_participant_id uuid,
  p_player_id uuid
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_participant public.participants%rowtype;
begin
  if p_participant_id is null then
    raise exception 'p_participant_id is required';
  end if;

  if p_player_id is null then
    raise exception 'p_player_id is required';
  end if;

  perform 1
  from public.players
  where id = p_player_id;

  if not found then
    raise exception 'Target player not found';
  end if;

  update public.participants
  set
    player_id = p_player_id,
    updated_at = now()
  where id = p_participant_id
  returning * into updated_participant;

  if not found then
    raise exception 'Participant not found';
  end if;

  return updated_participant;
end;
$$;

create or replace function public.merge_players(
  p_source_player_id uuid,
  p_target_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_player public.players%rowtype;
begin
  if p_source_player_id is null or p_target_player_id is null then
    raise exception 'Both player ids are required';
  end if;

  if p_source_player_id = p_target_player_id then
    raise exception 'Source and target player ids must be different';
  end if;

  select *
  into source_player
  from public.players
  where id = p_source_player_id;

  if not found then
    raise exception 'Source player not found';
  end if;

  perform 1
  from public.players
  where id = p_target_player_id;

  if not found then
    raise exception 'Target player not found';
  end if;

  update public.players as target
  set
    display_name = case
      when nullif(trim(coalesce(target.display_name, '')), '') is null
        then source_player.display_name
      else target.display_name
    end,
    normalized_name = coalesce(nullif(target.normalized_name, ''), source_player.normalized_name),
    primary_email = coalesce(target.primary_email, source_player.primary_email),
    primary_phone = coalesce(target.primary_phone, source_player.primary_phone),
    notes = concat_ws(E'\n\n', nullif(target.notes, ''), nullif(source_player.notes, '')),
    updated_at = now()
  where target.id = p_target_player_id;

  update public.participants
  set
    player_id = p_target_player_id,
    updated_at = now()
  where player_id = p_source_player_id;

  delete from public.players
  where id = p_source_player_id;
end;
$$;

grant execute on function public.relink_participant_player(uuid, uuid) to authenticated;
grant execute on function public.merge_players(uuid, uuid) to authenticated;

create or replace view public.player_career_stats as
with match_results as (
  select
    p.player_id,
    m.tournament_id,
    m.id as match_id,
    case when m.winner_id = p.id then 1 else 0 end as is_win,
    case when m.winner_id is not null and m.winner_id <> p.id then 1 else 0 end as is_loss,
    coalesce(m.completed_at, m.started_at, m.updated_at, m.created_at) as played_at
  from public.matches m
  join public.participants p
    on p.id in (m.player1_id, m.player2_id)
  where m.status = 'completed'
    and m.winner_id is not null
    and p.player_id is not null
), round_robin_standings as (
  select
    t.id as tournament_id,
    p.player_id,
    count(m.id) filter (
      where m.status = 'completed'
        and m.winner_id is not null
        and (m.player1_id = p.id or m.player2_id = p.id)
    ) as matches_played,
    count(m.id) filter (where m.winner_id = p.id) as wins,
    sum(
      case
        when m.player1_id = p.id then coalesce(m.player1_score, 0)
        when m.player2_id = p.id then coalesce(m.player2_score, 0)
        else 0
      end
    ) as points_for,
    sum(
      case
        when m.player1_id = p.id then coalesce(m.player2_score, 0)
        when m.player2_id = p.id then coalesce(m.player1_score, 0)
        else 0
      end
    ) as points_against,
    row_number() over (
      partition by t.id
      order by
        count(m.id) filter (where m.winner_id = p.id) desc,
        (
          sum(
            case
              when m.player1_id = p.id then coalesce(m.player1_score, 0)
              when m.player2_id = p.id then coalesce(m.player2_score, 0)
              else 0
            end
          )
          -
          sum(
            case
              when m.player1_id = p.id then coalesce(m.player2_score, 0)
              when m.player2_id = p.id then coalesce(m.player1_score, 0)
              else 0
            end
          )
        ) desc,
        max(p.created_at) asc
    ) as standing_rank
  from public.tournaments t
  join public.participants p
    on p.tournament_id = t.id
  left join public.matches m
    on m.tournament_id = t.id
   and (m.player1_id = p.id or m.player2_id = p.id)
  where t.format = 'round_robin'
    and t.status = 'completed'
    and p.player_id is not null
  group by t.id, p.player_id
), elimination_places as (
  select distinct on (m.tournament_id)
    m.tournament_id,
    winner_participant.player_id as champion_player_id,
    runner_up_participant.player_id as runner_up_player_id
  from public.matches m
  join public.tournaments t
    on t.id = m.tournament_id
  left join public.participants winner_participant
    on winner_participant.id = m.winner_id
  left join public.participants runner_up_participant
    on runner_up_participant.id = case
      when m.winner_id = m.player1_id then m.player2_id
      else m.player1_id
    end
  where t.format <> 'round_robin'
    and t.status = 'completed'
    and m.status = 'completed'
    and m.winner_id is not null
    and m.next_match_id is null
  order by
    m.tournament_id,
    coalesce(m.completed_at, m.updated_at, m.created_at) desc,
    m.match_number desc
), round_robin_places as (
  select
    tournament_id,
    (array_agg(player_id order by standing_rank) filter (where standing_rank = 1))[1] as champion_player_id,
    (array_agg(player_id order by standing_rank) filter (where standing_rank = 2))[1] as runner_up_player_id
  from round_robin_standings
  group by tournament_id
), placements as (
  select * from elimination_places
  union all
  select * from round_robin_places
), title_counts as (
  select
    champion_player_id as player_id,
    count(*) as titles
  from placements
  where champion_player_id is not null
  group by champion_player_id
), runner_up_counts as (
  select
    runner_up_player_id as player_id,
    count(*) as runner_ups
  from placements
  where runner_up_player_id is not null
  group by runner_up_player_id
), tournament_entries as (
  select
    p.player_id,
    count(distinct p.tournament_id) as tournaments_played
  from public.participants p
  where p.player_id is not null
  group by p.player_id
), match_totals as (
  select
    mr.player_id,
    count(distinct mr.match_id) as matches_played,
    sum(mr.is_win) as match_wins,
    sum(mr.is_loss) as match_losses,
    max(mr.played_at) as last_played_at
  from match_results mr
  group by mr.player_id
)
select
  players.id as player_id,
  players.display_name,
  coalesce(te.tournaments_played, 0) as tournaments_played,
  coalesce(mt.matches_played, 0) as matches_played,
  coalesce(mt.match_wins, 0) as match_wins,
  coalesce(mt.match_losses, 0) as match_losses,
  case
    when coalesce(mt.matches_played, 0) = 0 then 0::numeric
    else round((coalesce(mt.match_wins, 0)::numeric / mt.matches_played::numeric) * 100, 2)
  end as win_rate,
  coalesce(tc.titles, 0) as titles,
  coalesce(ru.runner_ups, 0) as runner_ups,
  mt.last_played_at
from public.players
left join tournament_entries te
  on te.player_id = players.id
left join match_totals mt
  on mt.player_id = players.id
left join title_counts tc
  on tc.player_id = players.id
left join runner_up_counts ru
  on ru.player_id = players.id;

create or replace view public.player_leaderboard as
select
  pcs.*,
  (
    coalesce(pcs.tournaments_played, 0)
    + (coalesce(pcs.match_wins, 0) * 3)
    + (coalesce(pcs.titles, 0) * 12)
    + (coalesce(pcs.runner_ups, 0) * 6)
  ) as points
from public.player_career_stats pcs;

grant select on public.players to anon, authenticated;
grant select on public.player_career_stats to anon, authenticated;
grant select on public.player_leaderboard to anon, authenticated;
