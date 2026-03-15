create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text null,
  game_type text null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_leagues_slug_unique
  on public.leagues (slug);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  slug text not null,
  name text not null,
  description text null,
  status text not null default 'draft',
  published boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_seasons_league_slug_unique
  on public.seasons (league_id, slug);

create unique index if not exists idx_seasons_active_per_league
  on public.seasons (league_id)
  where status = 'active';

create index if not exists idx_seasons_league_id
  on public.seasons (league_id);

create index if not exists idx_seasons_status
  on public.seasons (status);

alter table public.tournaments
  add column if not exists season_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname = 'tournaments_season_id_fkey'
  ) then
    alter table public.tournaments
      add constraint tournaments_season_id_fkey
      foreign key (season_id) references public.seasons(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_tournaments_season_id
  on public.tournaments (season_id);

create table if not exists public.scorekeeper_stations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  table_number integer not null,
  label text null,
  pin_hash text not null,
  active boolean not null default true,
  last_used_at timestamptz null,
  created_by uuid null references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scorekeeper_stations_table_number_positive check (table_number > 0)
);

create unique index if not exists idx_scorekeeper_stations_tournament_table_unique
  on public.scorekeeper_stations (tournament_id, table_number);

create index if not exists idx_scorekeeper_stations_tournament_table
  on public.scorekeeper_stations (tournament_id, table_number);

create or replace view public.season_player_leaderboard as
with season_tournaments as (
  select
    s.id as season_id,
    s.league_id,
    t.id as tournament_id,
    t.slug as tournament_slug,
    t.title as tournament_title,
    t.format,
    t.game_type,
    t.status,
    t.tournament_start_at
  from public.seasons s
  join public.tournaments t
    on t.season_id = s.id
  where t.published = true
), match_results as (
  select
    st.season_id,
    st.league_id,
    p.player_id,
    m.id as match_id,
    case when m.winner_id = p.id then 1 else 0 end as is_win,
    case when m.winner_id is not null and m.winner_id <> p.id then 1 else 0 end as is_loss,
    coalesce(m.completed_at, m.started_at, m.updated_at, m.created_at) as played_at
  from season_tournaments st
  join public.matches m
    on m.tournament_id = st.tournament_id
  join public.participants p
    on p.id in (m.player1_id, m.player2_id)
  where m.status = 'completed'
    and m.winner_id is not null
    and p.player_id is not null
), round_robin_standings as (
  select
    st.season_id,
    st.league_id,
    st.tournament_id,
    p.player_id,
    row_number() over (
      partition by st.id
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
  from season_tournaments st
  join public.participants p
    on p.tournament_id = st.tournament_id
  left join public.matches m
    on m.tournament_id = st.tournament_id
   and (m.player1_id = p.id or m.player2_id = p.id)
  where st.format = 'round_robin'
    and st.status = 'completed'
    and p.player_id is not null
  group by st.season_id, st.league_id, st.id, p.player_id
), elimination_places as (
  select distinct on (st.season_id, m.tournament_id)
    st.season_id,
    st.league_id,
    m.tournament_id,
    winner_participant.player_id as champion_player_id,
    runner_up_participant.player_id as runner_up_player_id
  from season_tournaments st
  join public.matches m
    on m.tournament_id = st.tournament_id
  left join public.participants winner_participant
    on winner_participant.id = m.winner_id
  left join public.participants runner_up_participant
    on runner_up_participant.id = case
      when m.winner_id = m.player1_id then m.player2_id
      else m.player1_id
    end
  where st.format <> 'round_robin'
    and st.status = 'completed'
    and m.status = 'completed'
    and m.winner_id is not null
    and m.next_match_id is null
  order by
    st.season_id,
    m.tournament_id,
    coalesce(m.completed_at, m.updated_at, m.created_at) desc,
    m.match_number desc
), round_robin_places as (
  select
    rrs.season_id,
    rrs.league_id,
    rrs.tournament_id,
    (array_agg(rrs.player_id order by rrs.standing_rank) filter (where rrs.standing_rank = 1))[1] as champion_player_id,
    (array_agg(rrs.player_id order by rrs.standing_rank) filter (where rrs.standing_rank = 2))[1] as runner_up_player_id
  from round_robin_standings rrs
  group by rrs.season_id, rrs.league_id, rrs.tournament_id
), placements as (
  select * from elimination_places
  union all
  select * from round_robin_places
), title_counts as (
  select
    season_id,
    league_id,
    champion_player_id as player_id,
    count(*) as titles
  from placements
  where champion_player_id is not null
  group by season_id, league_id, champion_player_id
), runner_up_counts as (
  select
    season_id,
    league_id,
    runner_up_player_id as player_id,
    count(*) as runner_ups
  from placements
  where runner_up_player_id is not null
  group by season_id, league_id, runner_up_player_id
), tournament_entries as (
  select
    st.season_id,
    st.league_id,
    p.player_id,
    count(distinct p.tournament_id) as tournaments_played
  from season_tournaments st
  join public.participants p
    on p.tournament_id = st.tournament_id
  where p.player_id is not null
  group by st.season_id, st.league_id, p.player_id
), match_totals as (
  select
    mr.season_id,
    mr.league_id,
    mr.player_id,
    count(distinct mr.match_id) as matches_played,
    sum(mr.is_win) as match_wins,
    sum(mr.is_loss) as match_losses,
    max(mr.played_at) as last_played_at
  from match_results mr
  group by mr.season_id, mr.league_id, mr.player_id
)
select
  te.season_id,
  te.league_id,
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
  mt.last_played_at,
  (
    coalesce(te.tournaments_played, 0)
    + (coalesce(mt.match_wins, 0) * 3)
    + (coalesce(tc.titles, 0) * 12)
    + (coalesce(ru.runner_ups, 0) * 6)
  ) as points
from tournament_entries te
join public.players
  on players.id = te.player_id
left join match_totals mt
  on mt.season_id = te.season_id
 and mt.league_id = te.league_id
 and mt.player_id = te.player_id
left join title_counts tc
  on tc.season_id = te.season_id
 and tc.league_id = te.league_id
 and tc.player_id = te.player_id
left join runner_up_counts ru
  on ru.season_id = te.season_id
 and ru.league_id = te.league_id
 and ru.player_id = te.player_id;

grant select on public.leagues to anon, authenticated;
grant select on public.seasons to anon, authenticated;
grant select on public.season_player_leaderboard to anon, authenticated;
grant select on public.scorekeeper_stations to anon, authenticated;

grant insert, update on public.leagues to authenticated;
grant insert, update on public.seasons to authenticated;
grant insert, update on public.scorekeeper_stations to authenticated;
