create or replace function public.apply_match_updates(p_updates jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  patch jsonb;
  target_match_id uuid;
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'p_updates must be a JSON array';
  end if;

  for patch in
    select value
    from jsonb_array_elements(p_updates)
  loop
    target_match_id := (patch->>'matchId')::uuid;

    if target_match_id is null then
      raise exception 'Every match update must include matchId';
    end if;

    update public.matches
    set
      player1_id = case
        when patch ? 'player1_id' then (patch->>'player1_id')::uuid
        else player1_id
      end,
      player2_id = case
        when patch ? 'player2_id' then (patch->>'player2_id')::uuid
        else player2_id
      end,
      winner_id = case
        when patch ? 'winner_id' then (patch->>'winner_id')::uuid
        else winner_id
      end,
      player1_score = case
        when patch ? 'player1_score' then (patch->>'player1_score')::int
        else player1_score
      end,
      player2_score = case
        when patch ? 'player2_score' then (patch->>'player2_score')::int
        else player2_score
      end,
      status = case
        when patch ? 'status' then patch->>'status'
        else status
      end,
      completed_at = case
        when patch ? 'completed_at' then (patch->>'completed_at')::timestamptz
        else completed_at
      end,
      started_at = case
        when patch ? 'started_at' then (patch->>'started_at')::timestamptz
        else started_at
      end,
      table_number = case
        when patch ? 'table_number' then (patch->>'table_number')::int
        else table_number
      end,
      notes = case
        when patch ? 'notes' then patch->>'notes'
        else notes
      end,
      updated_at = now()
    where id = target_match_id;

    if not found then
      raise exception 'Match % not found', target_match_id;
    end if;
  end loop;
end;
$$;

create or replace function public.reseed_tournament_participants(
  p_tournament_id uuid,
  p_participant_ids uuid[]
)
returns void
language plpgsql
security invoker
as $$
declare
  tournament_participant_count int;
  provided_participant_count int;
  distinct_participant_count int;
begin
  if p_tournament_id is null then
    raise exception 'p_tournament_id is required';
  end if;

  provided_participant_count := coalesce(array_length(p_participant_ids, 1), 0);

  if provided_participant_count = 0 then
    raise exception 'p_participant_ids must include at least one participant';
  end if;

  select count(*)
  into tournament_participant_count
  from public.participants
  where tournament_id = p_tournament_id;

  if tournament_participant_count <> provided_participant_count then
    raise exception
      'Seed order must include every participant in the tournament (% expected, % provided)',
      tournament_participant_count,
      provided_participant_count;
  end if;

  select count(distinct participant_id)
  into distinct_participant_count
  from unnest(p_participant_ids) as ordered(participant_id);

  if distinct_participant_count <> provided_participant_count then
    raise exception 'p_participant_ids contains duplicate participant ids';
  end if;

  update public.participants
  set
    seed = coalesce(seed, 0) + 1000,
    updated_at = now()
  where tournament_id = p_tournament_id;

  with ordered as (
    select participant_id, ordinality as new_seed
    from unnest(p_participant_ids) with ordinality as t(participant_id, ordinality)
  )
  update public.participants as participants
  set
    seed = ordered.new_seed::int,
    updated_at = now()
  from ordered
  where participants.id = ordered.participant_id
    and participants.tournament_id = p_tournament_id;
end;
$$;

create or replace function public.public_register_tournament_participant(
  p_tournament_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_handicap integer default 0,
  p_notes text default null
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_record public.tournaments%rowtype;
  inserted_participant public.participants%rowtype;
  normalized_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  trimmed_phone text := nullif(trim(coalesce(p_phone, '')), '');
  normalized_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  current_participant_count int;
  next_seed int;
begin
  if p_tournament_id is null then
    raise exception 'p_tournament_id is required';
  end if;

  if normalized_name = '' then
    raise exception 'Name is required';
  end if;

  select *
  into tournament_record
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if not tournament_record.published then
    raise exception 'Registration is not available on the public site yet';
  end if;

  if tournament_record.status not in ('open', 'check_in') then
    raise exception 'Registration is not open for this tournament';
  end if;

  if tournament_record.registration_open_at is not null
    and tournament_record.registration_open_at > now()
  then
    raise exception 'Registration has not opened yet';
  end if;

  if tournament_record.registration_close_at is not null
    and tournament_record.registration_close_at < now()
  then
    raise exception 'Registration has already closed';
  end if;

  select count(*)
  into current_participant_count
  from public.participants
  where tournament_id = p_tournament_id;

  if tournament_record.max_participants is not null
    and current_participant_count >= tournament_record.max_participants
  then
    raise exception 'This tournament is full';
  end if;

  if normalized_email is not null and exists (
    select 1
    from public.participants
    where tournament_id = p_tournament_id
      and lower(coalesce(email, '')) = normalized_email
  ) then
    raise exception 'A player with this email is already registered';
  end if;

  if normalized_phone is not null and exists (
    select 1
    from public.participants
    where tournament_id = p_tournament_id
      and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = normalized_phone
  ) then
    raise exception 'A player with this phone number is already registered';
  end if;

  if exists (
    select 1
    from public.participants
    where tournament_id = p_tournament_id
      and lower(trim(name)) = lower(normalized_name)
      and (
        (normalized_email is null and normalized_phone is null)
        or lower(coalesce(email, '')) = coalesce(normalized_email, '')
        or regexp_replace(coalesce(phone, ''), '\D', '', 'g') = coalesce(normalized_phone, '')
      )
  ) then
    raise exception 'A matching player is already registered';
  end if;

  select coalesce(max(seed), 0) + 1
  into next_seed
  from public.participants
  where tournament_id = p_tournament_id;

  insert into public.participants (
    tournament_id,
    name,
    email,
    phone,
    seed,
    handicap,
    notes
  )
  values (
    p_tournament_id,
    normalized_name,
    normalized_email,
    trimmed_phone,
    next_seed,
    coalesce(p_handicap, 0),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into inserted_participant;

  return inserted_participant;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.apply_match_updates(jsonb) to authenticated;
    grant execute on function public.reseed_tournament_participants(uuid, uuid[]) to authenticated;
    grant execute on function public.public_register_tournament_participant(uuid, text, text, text, integer, text) to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_register_tournament_participant(uuid, text, text, text, integer, text) to anon;
  end if;
end;
$$;
