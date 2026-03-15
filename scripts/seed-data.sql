-- ============================================================
-- SEED DATA for On The Snap Tournament Platform
-- Run via: insforge db import scripts/seed-data.sql
-- ============================================================

-- 1. 8-Player Single Elimination Tournament (Completed)
INSERT INTO public.tournaments (
  id, slug, title, description, format, game_type, race_to,
  entry_fee, status, published, tournament_start_at,
  venue_name, venue_address, rules, prize_notes
) VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'friday-9ball-march-07',
  'Friday Night 9-Ball',
  'Weekly 9-ball tournament. Race to 5, single elimination. Open to all skill levels.',
  'single_elimination', '9-ball', 5,
  20.00, 'completed', true, '2026-03-07T19:00:00-05:00',
  'On The Snap', '152 Gray Rd, Stoney Creek, ON L8G 3V2',
  'BCA rules. Winner break. Call pocket on 9.',
  '1st: $100 | 2nd: $40 | 3rd: $20'
);

-- Participants for 8-player SE
INSERT INTO public.participants (id, tournament_id, name, seed, checked_in, handicap) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Mike Stevens', 1, true, 0),
  ('p0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Dave Chen', 2, true, 0),
  ('p0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Tony Reyes', 3, true, 0),
  ('p0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Chris Walker', 4, true, 0),
  ('p0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'James Park', 5, true, 0),
  ('p0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'Ryan O''Brien', 6, true, 0),
  ('p0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'Sam Wilson', 7, true, 0),
  ('p0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'Alex Turner', 8, true, 0);

-- 2. 12-Player Double Elimination Tournament (Live)
INSERT INTO public.tournaments (
  id, slug, title, description, format, game_type, race_to,
  entry_fee, status, published, tournament_start_at,
  venue_name, venue_address, rules, prize_notes, max_participants
) VALUES (
  'a0000002-0000-0000-0000-000000000002',
  'saturday-8ball-championship-03-14',
  'Saturday 8-Ball Championship',
  'Monthly 8-ball championship. Double elimination, race to 4. Handicaps in effect.',
  'double_elimination', '8-ball', 4,
  30.00, 'live', true, '2026-03-14T18:00:00-05:00',
  'On The Snap', '152 Gray Rd, Stoney Creek, ON L8G 3V2',
  'BCA 8-ball rules. Alternate break after first game. Call pocket required.',
  '1st: $200 | 2nd: $80 | 3rd: $40',
  16
);

-- Participants for 12-player DE
INSERT INTO public.participants (id, tournament_id, name, seed, checked_in, handicap) VALUES
  ('p0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Mike Stevens', 1, true, 7),
  ('p0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Lisa Nguyen', 2, true, 6),
  ('p0000002-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Dave Chen', 3, true, 7),
  ('p0000002-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Tony Reyes', 4, true, 5),
  ('p0000002-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'Sarah Kim', 5, true, 6),
  ('p0000002-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002', 'Chris Walker', 6, true, 5),
  ('p0000002-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002', 'James Park', 7, true, 4),
  ('p0000002-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'Ryan O''Brien', 8, true, 6),
  ('p0000002-0000-0000-0000-000000000009', 'a0000002-0000-0000-0000-000000000002', 'Maria Santos', 9, true, 5),
  ('p0000002-0000-0000-0000-000000000010', 'a0000002-0000-0000-0000-000000000002', 'Tom Bradley', 10, true, 4),
  ('p0000002-0000-0000-0000-000000000011', 'a0000002-0000-0000-0000-000000000002', 'Kevin Patel', 11, true, 5),
  ('p0000002-0000-0000-0000-000000000012', 'a0000002-0000-0000-0000-000000000002', 'Jordan Lee', 12, true, 3);

-- 3. 6-Player Round Robin (Completed)
INSERT INTO public.tournaments (
  id, slug, title, description, format, game_type, race_to,
  entry_fee, status, published, tournament_start_at,
  venue_name, venue_address, rules, prize_notes
) VALUES (
  'a0000003-0000-0000-0000-000000000003',
  'wednesday-10ball-round-robin-03-05',
  'Wednesday 10-Ball Round Robin',
  'Casual round robin format. Everyone plays everyone. Race to 3.',
  'round_robin', '10-ball', 3,
  15.00, 'completed', true, '2026-03-05T19:30:00-05:00',
  'On The Snap', '152 Gray Rd, Stoney Creek, ON L8G 3V2',
  'Standard 10-ball rules. Winner break.',
  'Winner gets free table time next week!'
);

-- Participants for 6-player RR
INSERT INTO public.participants (id, tournament_id, name, seed, checked_in, handicap) VALUES
  ('p0000003-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'Mike Stevens', 1, true, 0),
  ('p0000003-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'Dave Chen', 2, true, 0),
  ('p0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'Lisa Nguyen', 3, true, 0),
  ('p0000003-0000-0000-0000-000000000004', 'a0000003-0000-0000-0000-000000000003', 'Tony Reyes', 4, true, 0),
  ('p0000003-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000003', 'Sarah Kim', 5, true, 0),
  ('p0000003-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'Chris Walker', 6, true, 0);

-- 4. Upcoming Tournament (Registration Open)
INSERT INTO public.tournaments (
  id, slug, title, description, format, game_type, race_to,
  entry_fee, status, published, tournament_start_at,
  registration_open_at, registration_close_at,
  venue_name, venue_address, rules, prize_notes,
  max_participants, check_in_required
) VALUES (
  'a0000004-0000-0000-0000-000000000004',
  'friday-9ball-march-21',
  'Friday Night 9-Ball — March 21',
  'Weekly 9-ball. All levels welcome. Cash prizes.',
  'single_elimination', '9-ball', 5,
  20.00, 'open', true, '2026-03-21T19:00:00-05:00',
  '2026-03-14T10:00:00-05:00', '2026-03-21T18:30:00-05:00',
  'On The Snap', '152 Gray Rd, Stoney Creek, ON L8G 3V2',
  'BCA rules. Winner break. Call pocket on 9.',
  '1st: $100 | 2nd: $40 | 3rd: $20',
  16, true
);

-- A few early registrations for the upcoming tournament
INSERT INTO public.participants (id, tournament_id, name, seed, checked_in) VALUES
  ('p0000004-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'Mike Stevens', 1, false),
  ('p0000004-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004', 'Dave Chen', 2, false),
  ('p0000004-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'Lisa Nguyen', 3, false);
