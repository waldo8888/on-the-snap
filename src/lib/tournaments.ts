import { insforge } from './insforge';
import type {
  Tournament,
  TournamentWithDetails,
  Participant,
  Round,
  Match,
  MatchWithPlayers,
  TournamentStatus,
  MatchUpdate,
} from './tournament-engine/types';
import { assignSeeds } from './tournament-engine/seeding';
import { generateSingleElimination } from './tournament-engine/single-elimination';
import { generateDoubleElimination } from './tournament-engine/double-elimination';
import { generateRoundRobin } from './tournament-engine/round-robin';
import {
  materializeGeneratedBracket,
  type GeneratedMatchForSave,
} from './tournament-engine/materialize-generated-bracket';

const REGISTRATION_OPEN_STATUSES: TournamentStatus[] = ['open'];

export interface TournamentRegistrationAvailability {
  isOpen: boolean;
  reason: 'open' | 'unpublished' | 'status' | 'not_open_yet' | 'closed' | 'full';
  message: string;
}

export interface TournamentRegistrationInput {
  tournamentId: string;
  name: string;
  email?: string;
  phone?: string;
  handicap?: number;
  notes?: string;
}

export interface GeneratedTournamentBracketResult {
  tournament: TournamentWithDetails;
  eligibleParticipants: Participant[];
  totalMatches: number;
  totalRounds: number;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

function formatRegistrationTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function compareParticipantsForBracket(a: Participant, b: Participant) {
  const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
  const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;

  if (seedA !== seedB) {
    return seedA - seedB;
  }

  return a.created_at.localeCompare(b.created_at);
}

export function getTournamentRegistrationAvailability(
  tournament: Pick<
    Tournament,
    'published' | 'status' | 'registration_open_at' | 'registration_close_at' | 'max_participants'
  >,
  participantCount = 0,
  now = new Date()
): TournamentRegistrationAvailability {
  if (!tournament.published) {
    return {
      isOpen: false,
      reason: 'unpublished',
      message: 'Registration is not available on the public site yet.',
    };
  }

  if (!REGISTRATION_OPEN_STATUSES.includes(tournament.status)) {
    return {
      isOpen: false,
      reason: 'status',
      message:
        tournament.status === 'check_in'
          ? 'Registration is closed while check-in is in progress.'
          : tournament.status === 'live'
          ? 'Registration closes once tournament play begins.'
          : tournament.status === 'completed'
            ? 'Registration is closed for completed tournaments.'
            : tournament.status === 'cancelled'
              ? 'Registration is closed because this tournament was cancelled.'
              : 'Registration is not available for this tournament.',
    };
  }

  if (tournament.registration_open_at && new Date(tournament.registration_open_at) > now) {
    return {
      isOpen: false,
      reason: 'not_open_yet',
      message: `Registration opens ${formatRegistrationTimestamp(tournament.registration_open_at)}.`,
    };
  }

  if (tournament.registration_close_at && new Date(tournament.registration_close_at) < now) {
    return {
      isOpen: false,
      reason: 'closed',
      message: 'Registration has closed for this tournament.',
    };
  }

  if (tournament.max_participants !== null && participantCount >= tournament.max_participants) {
    return {
      isOpen: false,
      reason: 'full',
      message: 'This tournament is full.',
    };
  }

  return {
    isOpen: true,
    reason: 'open',
    message: tournament.registration_close_at
      ? `Registration is open until ${formatRegistrationTimestamp(tournament.registration_close_at)}.`
      : 'Registration is open now.',
  };
}

export function getEligibleParticipantsForBracket(
  tournament: Pick<Tournament, 'check_in_required'> & { participants?: Participant[] | null }
) {
  const participants = tournament.participants ?? [];
  const eligibleParticipants = tournament.check_in_required
    ? participants.filter((participant) => participant.checked_in)
    : participants;

  return [...eligibleParticipants].sort(compareParticipantsForBracket);
}

// ============================================================
// Tournament Queries
// ============================================================

export async function getTournaments(options?: {
  status?: TournamentStatus | TournamentStatus[];
  published?: boolean;
  limit?: number;
}) {
  let query = insforge.database.from('tournaments').select('*');

  if (options?.published !== undefined) {
    query = query.eq('published', options.published);
  }

  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }

  query = query.order('tournament_start_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Tournament[]) || [];
}

export async function getTournamentBySlug(slug: string): Promise<TournamentWithDetails | null> {
  const { data, error } = await insforge.database
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const tournament = data as Tournament;

  // Fetch related data
  const [participantsRes, roundsRes, matchesRes] = await Promise.all([
    insforge.database
      .from('participants')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('seed', { ascending: true }),
    insforge.database
      .from('rounds')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('round_number', { ascending: true }),
    insforge.database
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number', { ascending: true }),
  ]);

  const participants = (participantsRes.data as Participant[]) || [];
  const rounds = (roundsRes.data as Round[]) || [];
  const matches = (matchesRes.data as Match[]) || [];

  // Attach matches to their rounds
  const roundsWithMatches = rounds.map((r) => ({
    ...r,
    matches: matches.filter((m) => m.round_id === r.id),
  }));

  return {
    ...tournament,
    participants,
    rounds: roundsWithMatches,
  };
}

export async function getTournamentById(id: string): Promise<TournamentWithDetails | null> {
  const { data, error } = await insforge.database
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const tournament = data as Tournament;

  const [participantsRes, roundsRes, matchesRes] = await Promise.all([
    insforge.database
      .from('participants')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('seed', { ascending: true }),
    insforge.database
      .from('rounds')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('round_number', { ascending: true }),
    insforge.database
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number', { ascending: true }),
  ]);

  const participants = (participantsRes.data as Participant[]) || [];
  const rounds = (roundsRes.data as Round[]) || [];
  const matches = (matchesRes.data as Match[]) || [];

  const roundsWithMatches = rounds.map((r) => ({
    ...r,
    matches: matches.filter((m) => m.round_id === r.id),
  }));

  return { ...tournament, participants, rounds: roundsWithMatches };
}

// ============================================================
// Tournament Mutations
// ============================================================

export async function createTournament(
  data: Omit<Tournament, 'id' | 'created_at' | 'updated_at' | 'bracket_generated_at' | 'total_rounds'>
) {
  const { data: result, error } = await insforge.database
    .from('tournaments')
    .insert(data)
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Tournament;
}

export async function updateTournament(id: string, data: Partial<Tournament>) {
  const { data: result, error } = await insforge.database
    .from('tournaments')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Tournament;
}

export async function deleteTournament(id: string) {
  const { error } = await insforge.database
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// Participant Mutations
// ============================================================

export async function addParticipant(data: {
  tournament_id: string;
  name: string;
  email?: string;
  phone?: string;
  seed?: number;
  handicap?: number;
  notes?: string;
}) {
  const { data: result, error } = await insforge.database
    .from('participants')
    .insert(data)
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Participant;
}

export async function updateParticipant(id: string, data: Partial<Participant>) {
  const { data: result, error } = await insforge.database
    .from('participants')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Participant;
}

export async function removeParticipant(id: string) {
  const { error } = await insforge.database
    .from('participants')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getParticipants(tournamentId: string) {
  const { data, error } = await insforge.database
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true });

  if (error) throw error;
  return (data as Participant[]) || [];
}

export async function registerParticipantForTournament(
  input: TournamentRegistrationInput
): Promise<Participant> {
  const normalizedName = normalizeName(input.name);

  if (!normalizedName) {
    throw new Error('Name is required');
  }

  const { data, error } = await insforge.database.rpc('public_register_tournament_participant', {
    p_tournament_id: input.tournamentId,
    p_name: normalizedName,
    p_email: normalizeEmail(input.email),
    p_phone: input.phone?.trim() || null,
    p_handicap: input.handicap ?? 0,
    p_notes: input.notes?.trim() || null,
  });

  if (error) throw error;

  const participant = Array.isArray(data) ? data[0] : data;
  return participant as Participant;
}

export async function reseedParticipants(
  tournamentId: string,
  participantIdsInSeedOrder: string[]
) {
  const { error } = await insforge.database.rpc('reseed_tournament_participants', {
    p_tournament_id: tournamentId,
    p_participant_ids: participantIdsInSeedOrder,
  });

  if (error) throw error;
}

// ============================================================
// Match Mutations
// ============================================================

export async function updateMatch(id: string, data: Partial<Match>) {
  const { data: result, error } = await insforge.database
    .from('matches')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Match;
}

export async function applyMatchUpdates(updates: MatchUpdate[]) {
  const serializedUpdates = updates
    .filter((update): update is MatchUpdate & { matchId: string } => Boolean(update.matchId))
    .map((update) => {
      const { matchId, ...patch } = update;
      return { matchId, ...patch };
    });

  if (serializedUpdates.length === 0) {
    return;
  }

  const { error } = await insforge.database.rpc('apply_match_updates', {
    p_updates: serializedUpdates,
  });

  if (error) throw error;
}

export async function getMatches(tournamentId: string): Promise<Match[]> {
  const { data, error } = await insforge.database
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true });

  if (error) throw error;
  return (data as Match[]) || [];
}

export async function getMatchesWithPlayers(tournamentId: string): Promise<MatchWithPlayers[]> {
  const [matches, participants] = await Promise.all([
    getMatches(tournamentId),
    getParticipants(tournamentId),
  ]);

  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return matches.map((m) => ({
    ...m,
    player1: m.player1_id ? participantMap.get(m.player1_id) || null : null,
    player2: m.player2_id ? participantMap.get(m.player2_id) || null : null,
    winner: m.winner_id ? participantMap.get(m.winner_id) || null : null,
  }));
}

// ============================================================
// Bracket Generation (writes to DB)
// ============================================================

export async function generateAndSaveTournamentBracket(
  tournamentId: string
): Promise<GeneratedTournamentBracketResult> {
  const tournament = await getTournamentById(tournamentId);

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const eligibleParticipants = getEligibleParticipantsForBracket(tournament);

  if (eligibleParticipants.length < 2) {
    throw new Error(
      tournament.check_in_required
        ? 'Need at least 2 checked-in participants to generate a bracket'
        : 'Need at least 2 participants to generate a bracket'
    );
  }

  const seeds = assignSeeds(
    eligibleParticipants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      seed: participant.seed,
    }))
  );

  const seedToParticipantId = new Map(seeds.map((seed) => [seed.seed, seed.participantId]));

  let generatedBracket;
  switch (tournament.format) {
    case 'single_elimination':
      generatedBracket = generateSingleElimination(eligibleParticipants.length);
      break;
    case 'double_elimination':
      generatedBracket = generateDoubleElimination(eligibleParticipants.length);
      break;
    case 'round_robin':
      generatedBracket = generateRoundRobin(eligibleParticipants.length);
      break;
    default:
      throw new Error(`Unsupported format: ${tournament.format}`);
  }

  const roundsForSave = generatedBracket.rounds.map((round) => ({
    bracket_side: round.bracket_side,
    round_number: round.round_number,
    name: round.name,
  }));

  const matchesForSave: GeneratedMatchForSave[] = [];

  generatedBracket.rounds.forEach((round, roundIndex) => {
    round.matches.forEach((match) => {
      const player1Id =
        match.player1_seed !== null ? seedToParticipantId.get(match.player1_seed) ?? null : null;
      const player2Id =
        match.player2_seed !== null ? seedToParticipantId.get(match.player2_seed) ?? null : null;

      matchesForSave.push({
        round_index: roundIndex,
        match_number: match.match_number,
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: null,
        bracket_position: match.bracket_position,
        next_match_number: match.next_match_number,
        next_match_slot: match.next_match_slot,
        loser_next_match_number: match.loser_next_match_number,
        loser_next_match_slot: match.loser_next_match_slot,
        status: match.is_bye ? 'bye' : player1Id && player2Id ? 'ready' : 'pending',
      });
    });
  });

  const resolvedMatchesForSave = materializeGeneratedBracket(matchesForSave);

  await saveBracket(tournamentId, roundsForSave, resolvedMatchesForSave);

  const updatedTournament = await getTournamentById(tournamentId);

  if (!updatedTournament) {
    throw new Error('Tournament could not be reloaded after bracket generation');
  }

  return {
    tournament: updatedTournament,
    eligibleParticipants,
    totalMatches: resolvedMatchesForSave.length,
    totalRounds: roundsForSave.length,
  };
}

export async function saveBracket(
  tournamentId: string,
  rounds: { bracket_side: string; round_number: number; name: string }[],
  matches: GeneratedMatchForSave[]
) {
  // 1. Delete existing rounds & matches (cascade deletes matches)
  await insforge.database.from('rounds').delete().eq('tournament_id', tournamentId);

  // 2. Insert rounds
  const roundInserts = rounds.map((r) => ({
    tournament_id: tournamentId,
    bracket_side: r.bracket_side,
    round_number: r.round_number,
    name: r.name,
  }));

  const { data: insertedRounds, error: roundError } = await insforge.database
    .from('rounds')
    .insert(roundInserts)
    .select();

  if (roundError) throw roundError;
  const roundIds = (insertedRounds as Round[]).map((r) => r.id);

  // 3. Insert matches (first pass — without next_match_id wiring)
  const matchInserts = matches.map((m) => ({
    tournament_id: tournamentId,
    round_id: roundIds[m.round_index],
    match_number: m.match_number,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    winner_id: m.winner_id ?? null,
    bracket_position: m.bracket_position,
    status: m.status,
    completed_at:
      m.status === 'bye' && m.winner_id ? new Date().toISOString() : null,
  }));

  const { data: insertedMatches, error: matchError } = await insforge.database
    .from('matches')
    .insert(matchInserts)
    .select();

  if (matchError) throw matchError;

  const dbMatches = insertedMatches as Match[];
  const matchNumberToId = new Map(dbMatches.map((m) => [m.match_number, m.id]));

  // 4. Wire up next_match_id and loser_next_match_id
  for (const m of matches) {
    const dbMatchId = matchNumberToId.get(m.match_number);
    if (!dbMatchId) continue;

    const updates: Partial<Match> = {};
    if (m.next_match_number !== null) {
      updates.next_match_id = matchNumberToId.get(m.next_match_number) || null;
      updates.next_match_slot = m.next_match_slot;
    }
    if (m.loser_next_match_number !== null) {
      updates.loser_next_match_id = matchNumberToId.get(m.loser_next_match_number) || null;
      updates.loser_next_match_slot = m.loser_next_match_slot;
    }

    if (Object.keys(updates).length > 0) {
      await insforge.database.from('matches').update(updates).eq('id', dbMatchId);
    }
  }

  // 5. Update tournament metadata
  await insforge.database
    .from('tournaments')
    .update({
      bracket_generated_at: new Date().toISOString(),
      total_rounds: rounds.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tournamentId);

  return { rounds: insertedRounds, matches: dbMatches };
}

// ============================================================
// Slug generation
// ============================================================

export function generateSlug(title: string, dateStr?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${base}-${month}-${day}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}
