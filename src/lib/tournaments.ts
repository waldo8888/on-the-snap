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
  Announcement,
  Player,
  PlayerCareerStats,
  PlayerLeaderboardEntry,
  PlayerMatchHistoryEntry,
  PlayerTournamentHistoryEntry,
  PlayerProfileData,
  League,
  LeagueWithDetails,
  Season,
  SeasonStatus,
  SeasonWithDetails,
  SeasonLeaderboardEntry,
  ScorekeeperStation,
  ScorekeeperStationSummary,
} from './tournament-engine/types';
import type { AdminRole } from './admin-auth';
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

function normalizePhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, '');
  return digits ? digits : null;
}

function toNullableTrimmed(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatScoreline(
  match: Match,
  participantId: string
) {
  if (match.player1_score === null || match.player2_score === null) {
    return null;
  }

  if (match.player1_id === participantId) {
    return `${match.player1_score}-${match.player2_score}`;
  }

  if (match.player2_id === participantId) {
    return `${match.player2_score}-${match.player1_score}`;
  }

  return null;
}

function inferFinalPlaceForParticipant(
  tournament: Tournament,
  participants: Participant[],
  matches: Match[],
  participantId: string
) {
  if (tournament.status !== 'completed') {
    return null;
  }

  const completedMatches = [...matches]
    .filter((match) => match.status === 'completed' && match.winner_id)
    .sort((a, b) => b.match_number - a.match_number);

  if (completedMatches.length === 0) {
    return null;
  }

  if (tournament.format === 'round_robin') {
    const winMap = new Map<string, number>();
    const pointsMap = new Map<string, number>();

    completedMatches.forEach((match) => {
      if (match.winner_id) {
        winMap.set(match.winner_id, (winMap.get(match.winner_id) ?? 0) + 1);
      }

      if (match.player1_id) {
        pointsMap.set(
          match.player1_id,
          (pointsMap.get(match.player1_id) ?? 0) + (match.player1_score ?? 0)
        );
      }

      if (match.player2_id) {
        pointsMap.set(
          match.player2_id,
          (pointsMap.get(match.player2_id) ?? 0) + (match.player2_score ?? 0)
        );
      }
    });

    const ordered = [...participants].sort(
      (left, right) =>
        (winMap.get(right.id) ?? 0) - (winMap.get(left.id) ?? 0) ||
        (pointsMap.get(right.id) ?? 0) - (pointsMap.get(left.id) ?? 0)
    );
    const position = ordered.findIndex((participant) => participant.id === participantId);
    return position === -1 ? null : position + 1;
  }

  const finalMatch = completedMatches[0];
  const standings: string[] = [];
  const placed = new Set<string>();

  if (finalMatch.winner_id) {
    standings.push(finalMatch.winner_id);
    placed.add(finalMatch.winner_id);
  }

  const runnerUpId =
    finalMatch.player1_id === finalMatch.winner_id ? finalMatch.player2_id : finalMatch.player1_id;

  if (runnerUpId) {
    standings.push(runnerUpId);
    placed.add(runnerUpId);
  }

  completedMatches.forEach((match) => {
    if (!match.winner_id) {
      return;
    }

    const loserId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;
    if (loserId && !placed.has(loserId)) {
      standings.push(loserId);
      placed.add(loserId);
    }
  });

  participants.forEach((participant) => {
    if (!placed.has(participant.id)) {
      standings.push(participant.id);
      placed.add(participant.id);
    }
  });

  const position = standings.findIndex((id) => id === participantId);
  return position === -1 ? null : position + 1;
}

function calculatePlayerLeaderboardEntries(
  players: Player[],
  tournaments: Tournament[],
  participants: Participant[],
  matches: Match[]
): PlayerLeaderboardEntry[] {
  const tournamentMap = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const participantsByTournament = new Map<string, Participant[]>();
  const matchesByTournament = new Map<string, Match[]>();
  const matchesByParticipant = new Map<string, Match[]>();

  participants.forEach((participant) => {
    const existing = participantsByTournament.get(participant.tournament_id) ?? [];
    existing.push(participant);
    participantsByTournament.set(participant.tournament_id, existing);
  });

  matches.forEach((match) => {
    const existing = matchesByTournament.get(match.tournament_id) ?? [];
    existing.push(match);
    matchesByTournament.set(match.tournament_id, existing);

    [match.player1_id, match.player2_id].forEach((participantId) => {
      if (!participantId) {
        return;
      }

      const participantMatches = matchesByParticipant.get(participantId) ?? [];
      participantMatches.push(match);
      matchesByParticipant.set(participantId, participantMatches);
    });
  });

  const rawEntries = players.map((player): PlayerLeaderboardEntry | null => {
      const playerParticipants = participants.filter((participant) => participant.player_id === player.id);
      if (playerParticipants.length === 0) {
        return null;
      }

      const tournamentIds = new Set(playerParticipants.map((participant) => participant.tournament_id));
      const participantIds = new Set(playerParticipants.map((participant) => participant.id));

      let matchWins = 0;
      let matchLosses = 0;
      let titles = 0;
      let runnerUps = 0;
      let lastPlayedAt: string | null = null;

      participantIds.forEach((participantId) => {
        const participantMatches = matchesByParticipant.get(participantId) ?? [];
        participantMatches.forEach((match) => {
          if (match.status !== 'completed' || !match.winner_id) {
            return;
          }

          if (match.winner_id === participantId) {
            matchWins += 1;
          } else {
            matchLosses += 1;
          }

          const timestamp =
            match.completed_at ?? match.started_at ?? match.updated_at ?? match.created_at;
          if (!lastPlayedAt || new Date(timestamp).getTime() > new Date(lastPlayedAt).getTime()) {
            lastPlayedAt = timestamp;
          }
        });
      });

      playerParticipants.forEach((participant) => {
        const tournament = tournamentMap.get(participant.tournament_id);
        if (!tournament) {
          return;
        }

        const place = inferFinalPlaceForParticipant(
          tournament,
          participantsByTournament.get(participant.tournament_id) ?? [],
          matchesByTournament.get(participant.tournament_id) ?? [],
          participant.id
        );

        if (place === 1) {
          titles += 1;
        } else if (place === 2) {
          runnerUps += 1;
        }
      });

      const tournamentsPlayed = tournamentIds.size;
      const matchesPlayed = matchWins + matchLosses;
      const winRate = matchesPlayed === 0 ? 0 : Number(((matchWins / matchesPlayed) * 100).toFixed(2));
      const points = tournamentsPlayed + matchWins * 3 + titles * 12 + runnerUps * 6;

      return {
        player_id: player.id,
        display_name: player.display_name,
        tournaments_played: tournamentsPlayed,
        matches_played: matchesPlayed,
        match_wins: matchWins,
        match_losses: matchLosses,
        win_rate: winRate,
        titles,
        runner_ups: runnerUps,
        last_played_at: lastPlayedAt,
        points,
      } satisfies PlayerLeaderboardEntry;
    });

  const entries = rawEntries.filter((entry): entry is PlayerLeaderboardEntry => entry !== null);

  return entries.sort((left, right) => {
    return (
      right.points - left.points ||
      right.titles - left.titles ||
      right.match_wins - left.match_wins ||
      right.win_rate - left.win_rate ||
      new Date(right.last_played_at ?? 0).getTime() - new Date(left.last_played_at ?? 0).getTime()
    );
  });
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

async function enrichTournamentsWithSeasonContext<T extends Tournament>(
  tournaments: T[]
): Promise<Array<T & { season?: Season | null; league?: League | null }>> {
  if (tournaments.length === 0) {
    return [] as Array<T & { season?: Season | null; league?: League | null }>;
  }

  const seasonIds = Array.from(
    new Set(
      tournaments
        .map((tournament) => tournament.season_id)
        .filter((seasonId): seasonId is string => Boolean(seasonId))
    )
  );

  if (seasonIds.length === 0) {
    return tournaments.map((tournament) => ({
      ...tournament,
      season: null,
      league: null,
    }));
  }

  const { data: seasonsData, error: seasonsError } = await insforge.database
    .from('seasons')
    .select('*')
    .in('id', seasonIds);

  if (seasonsError) throw seasonsError;

  const seasons = (seasonsData as Season[]) || [];
  const leagueIds = Array.from(new Set(seasons.map((season) => season.league_id)));

  const { data: leaguesData, error: leaguesError } = await insforge.database
    .from('leagues')
    .select('*')
    .in('id', leagueIds);

  if (leaguesError) throw leaguesError;

  const seasonMap = new Map(seasons.map((season) => [season.id, season]));
  const leagueMap = new Map(((leaguesData as League[]) || []).map((league) => [league.id, league]));

  return tournaments.map((tournament) => {
    const season = tournament.season_id ? seasonMap.get(tournament.season_id) ?? null : null;
    const league = season ? leagueMap.get(season.league_id) ?? null : null;

    return {
      ...tournament,
      season,
      league,
    };
  });
}

function getFavoriteGameType(
  tournamentHistory: PlayerTournamentHistoryEntry[]
): Tournament['game_type'] | null {
  if (tournamentHistory.length === 0) {
    return null;
  }

  const counts = new Map<
    Tournament['game_type'],
    { count: number; latestStartAt: string }
  >();

  tournamentHistory.forEach((entry) => {
    const existing = counts.get(entry.tournament_game_type);
    if (!existing) {
      counts.set(entry.tournament_game_type, {
        count: 1,
        latestStartAt: entry.tournament_start_at,
      });
      return;
    }

    counts.set(entry.tournament_game_type, {
      count: existing.count + 1,
      latestStartAt:
        new Date(entry.tournament_start_at).getTime() >
        new Date(existing.latestStartAt).getTime()
          ? entry.tournament_start_at
          : existing.latestStartAt,
    });
  });

  return [...counts.entries()].sort((left, right) => {
    const countDiff = right[1].count - left[1].count;
    if (countDiff !== 0) {
      return countDiff;
    }

    return (
      new Date(right[1].latestStartAt).getTime() -
      new Date(left[1].latestStartAt).getTime()
    );
  })[0]?.[0] ?? null;
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

  const tournaments = (data as Tournament[]) || [];
  return enrichTournamentsWithSeasonContext(tournaments);
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
  const [enrichedTournament] = await enrichTournamentsWithSeasonContext([tournament]);

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
    ...enrichedTournament,
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
  const [enrichedTournament] = await enrichTournamentsWithSeasonContext([tournament]);

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

  return { ...enrichedTournament, participants, rounds: roundsWithMatches };
}

async function buildLeagueDetails(
  leagues: League[],
  options?: {
    includeUnpublishedTournaments?: boolean;
    standingsPreviewLimit?: number;
    publishedOnly?: boolean;
  }
): Promise<LeagueWithDetails[]> {
  if (leagues.length === 0) {
    return [];
  }

  const leagueIds = leagues.map((league) => league.id);
  const { data: seasonsData, error: seasonsError } = await insforge.database
    .from('seasons')
    .select('*')
    .in('league_id', leagueIds)
    .order('start_at', { ascending: false });

  if (seasonsError) throw seasonsError;

  const seasons = ((seasonsData as Season[]) || []).filter((season) =>
    options?.publishedOnly ? season.published : true
  );
  const seasonIds = seasons.map((season) => season.id);

  let tournaments: Tournament[] = [];
  if (seasonIds.length > 0) {
    const tournamentQuery = insforge.database
      .from('tournaments')
      .select('*')
      .in('season_id', seasonIds)
      .order('tournament_start_at', { ascending: false });

    const { data: tournamentsData, error: tournamentsError } =
      options?.includeUnpublishedTournaments
        ? await tournamentQuery
        : await tournamentQuery.eq('published', true);

    if (tournamentsError) throw tournamentsError;
    tournaments = (tournamentsData as Tournament[]) || [];
  }

  const seasonGroups = new Map<string, Season[]>();
  seasons.forEach((season) => {
    const existing = seasonGroups.get(season.league_id) ?? [];
    existing.push(season);
    seasonGroups.set(season.league_id, existing);
  });

  const tournamentGroups = new Map<string, Tournament[]>();
  tournaments.forEach((tournament) => {
    if (!tournament.season_id) {
      return;
    }

    const season = seasons.find((candidate) => candidate.id === tournament.season_id);
    if (!season) {
      return;
    }

    const existing = tournamentGroups.get(season.league_id) ?? [];
    existing.push(tournament);
    tournamentGroups.set(season.league_id, existing);
  });

  const activeSeasonIds = seasons
    .filter((season) => season.status === 'active')
    .map((season) => season.id);

  const standingsBySeason = new Map<string, SeasonLeaderboardEntry[]>();
  if (activeSeasonIds.length > 0) {
    const { data: standingsData, error: standingsError } = await insforge.database
      .from('season_player_leaderboard')
      .select('*')
      .in('season_id', activeSeasonIds)
      .order('points', { ascending: false });

    if (standingsError) throw standingsError;

    ((standingsData as SeasonLeaderboardEntry[]) || []).forEach((entry) => {
      const existing = standingsBySeason.get(entry.season_id) ?? [];
      existing.push(entry);
      standingsBySeason.set(entry.season_id, existing);
    });
  }

  return leagues.map((league) => {
    const leagueSeasons = seasonGroups.get(league.id) ?? [];
    const activeSeason =
      leagueSeasons.find((season) => season.status === 'active') ?? null;

    return {
      ...league,
      seasons: leagueSeasons,
      activeSeason,
      recentTournaments: (tournamentGroups.get(league.id) ?? []).slice(0, 6),
      standingsPreview: activeSeason
        ? (standingsBySeason.get(activeSeason.id) ?? []).slice(
            0,
            options?.standingsPreviewLimit ?? 5
          )
        : [],
    } satisfies LeagueWithDetails;
  });
}

export async function getLeagues(options?: {
  published?: boolean;
  includeDetails?: boolean;
  includeUnpublishedTournaments?: boolean;
  limit?: number;
}) {
  let query = insforge.database
    .from('leagues')
    .select('*')
    .order('name', { ascending: true });

  if (options?.published !== undefined) {
    query = query.eq('published', options.published);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  const leagues = (data as League[]) || [];

  if (options?.includeDetails === false) {
    return leagues;
  }

  return buildLeagueDetails(leagues, {
    includeUnpublishedTournaments: options?.includeUnpublishedTournaments,
    publishedOnly: options?.published === true,
  });
}

export async function getLeagueById(
  id: string,
  options?: { publishedOnly?: boolean }
): Promise<LeagueWithDetails | null> {
  let query = insforge.database.from('leagues').select('*').eq('id', id);

  if (options?.publishedOnly) {
    query = query.eq('published', true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [league] = await buildLeagueDetails([data as League], {
    includeUnpublishedTournaments: !options?.publishedOnly,
    publishedOnly: options?.publishedOnly,
  });
  return league ?? null;
}

export async function getLeagueBySlug(
  slug: string,
  options?: { publishedOnly?: boolean }
): Promise<LeagueWithDetails | null> {
  let query = insforge.database.from('leagues').select('*').eq('slug', slug);

  if (options?.publishedOnly) {
    query = query.eq('published', true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [league] = await buildLeagueDetails([data as League], {
    includeUnpublishedTournaments: !options?.publishedOnly,
    publishedOnly: options?.publishedOnly,
  });
  return league ?? null;
}

export async function createLeague(
  data: Omit<League, 'id' | 'created_at' | 'updated_at'>
) {
  const { data: result, error } = await insforge.database
    .from('leagues')
    .insert({
      ...data,
      slug: data.slug.trim().toLowerCase(),
      name: data.name.trim(),
      description: toNullableTrimmed(data.description),
    })
    .select()
    .single();

  if (error) throw error;
  return result as League;
}

export async function updateLeague(id: string, data: Partial<League>) {
  const { data: result, error } = await insforge.database
    .from('leagues')
    .update({
      ...data,
      slug: data.slug ? data.slug.trim().toLowerCase() : data.slug,
      name: data.name ? data.name.trim() : data.name,
      description:
        data.description === undefined ? data.description : toNullableTrimmed(data.description),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as League;
}

async function enrichSeasons(
  seasons: Season[],
  options?: {
    includeStandings?: boolean;
    includeTournaments?: boolean;
    publishedOnly?: boolean;
  }
): Promise<SeasonWithDetails[]> {
  if (seasons.length === 0) {
    return [];
  }

  const leagueIds = Array.from(new Set(seasons.map((season) => season.league_id)));
  const { data: leaguesData, error: leaguesError } = await insforge.database
    .from('leagues')
    .select('*')
    .in('id', leagueIds);

  if (leaguesError) throw leaguesError;

  const leagueMap = new Map(((leaguesData as League[]) || []).map((league) => [league.id, league]));

  const seasonIds = seasons.map((season) => season.id);
  const tournamentsBySeason = new Map<string, Tournament[]>();
  if (options?.includeTournaments !== false) {
    let tournamentsQuery = insforge.database
      .from('tournaments')
      .select('*')
      .in('season_id', seasonIds)
      .order('tournament_start_at', { ascending: false });

    if (options?.publishedOnly) {
      tournamentsQuery = tournamentsQuery.eq('published', true);
    }

    const { data: tournamentsData, error: tournamentsError } = await tournamentsQuery;

    if (tournamentsError) throw tournamentsError;

    ((tournamentsData as Tournament[]) || [])
      .forEach((tournament) => {
        if (!tournament.season_id) {
          return;
        }

        const existing = tournamentsBySeason.get(tournament.season_id) ?? [];
        existing.push(tournament);
        tournamentsBySeason.set(tournament.season_id, existing);
      });
  }

  const standingsBySeason = new Map<string, SeasonLeaderboardEntry[]>();
  if (options?.includeStandings !== false) {
    const { data: standingsData, error: standingsError } = await insforge.database
      .from('season_player_leaderboard')
      .select('*')
      .in('season_id', seasonIds)
      .order('points', { ascending: false });

    if (standingsError) throw standingsError;

    ((standingsData as SeasonLeaderboardEntry[]) || []).forEach((entry) => {
      const existing = standingsBySeason.get(entry.season_id) ?? [];
      existing.push(entry);
      standingsBySeason.set(entry.season_id, existing);
    });
  }

  return seasons.map((season) => ({
    ...season,
    league: leagueMap.get(season.league_id) ?? null,
    tournaments: tournamentsBySeason.get(season.id) ?? [],
    standings: standingsBySeason.get(season.id) ?? [],
  }));
}

export async function getSeasons(options?: {
  leagueId?: string;
  published?: boolean;
  status?: SeasonStatus | SeasonStatus[];
  includeStandings?: boolean;
  includeTournaments?: boolean;
}) {
  let query = insforge.database
    .from('seasons')
    .select('*')
    .order('start_at', { ascending: false });

  if (options?.leagueId) {
    query = query.eq('league_id', options.leagueId);
  }

  if (options?.published !== undefined) {
    query = query.eq('published', options.published);
  }

  if (options?.status) {
    query = Array.isArray(options.status)
      ? query.in('status', options.status)
      : query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return enrichSeasons((data as Season[]) || [], {
    includeStandings: options?.includeStandings,
    includeTournaments: options?.includeTournaments,
    publishedOnly: options?.published === true,
  });
}

export async function getSeasonById(
  id: string,
  options?: { publishedOnly?: boolean }
): Promise<SeasonWithDetails | null> {
  let query = insforge.database.from('seasons').select('*').eq('id', id);

  if (options?.publishedOnly) {
    query = query.eq('published', true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [season] = await enrichSeasons([data as Season], {
    publishedOnly: options?.publishedOnly,
  });
  return season ?? null;
}

export async function getSeasonBySlug(
  leagueSlug: string,
  seasonSlug: string,
  options?: { publishedOnly?: boolean }
): Promise<SeasonWithDetails | null> {
  const league = await getLeagueBySlug(leagueSlug, options);
  if (!league) {
    return null;
  }

  let query = insforge.database
    .from('seasons')
    .select('*')
    .eq('league_id', league.id)
    .eq('slug', seasonSlug);

  if (options?.publishedOnly) {
    query = query.eq('published', true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [season] = await enrichSeasons([data as Season], {
    publishedOnly: options?.publishedOnly,
  });
  return season ?? null;
}

export async function createSeason(
  data: Omit<Season, 'id' | 'created_at' | 'updated_at'>
) {
  const { data: result, error } = await insforge.database
    .from('seasons')
    .insert({
      ...data,
      slug: data.slug.trim().toLowerCase(),
      name: data.name.trim(),
      description: toNullableTrimmed(data.description),
    })
    .select()
    .single();

  if (error) throw error;
  return result as Season;
}

export async function updateSeason(id: string, data: Partial<Season>) {
  const { data: result, error } = await insforge.database
    .from('seasons')
    .update({
      ...data,
      slug: data.slug ? data.slug.trim().toLowerCase() : data.slug,
      name: data.name ? data.name.trim() : data.name,
      description:
        data.description === undefined ? data.description : toNullableTrimmed(data.description),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as Season;
}

export async function getSeasonLeaderboard(seasonId: string) {
  const { data, error } = await insforge.database
    .from('season_player_leaderboard')
    .select('*')
    .eq('season_id', seasonId)
    .order('points', { ascending: false });

  if (error) throw error;
  return (data as SeasonLeaderboardEntry[]) || [];
}

export async function getScorekeeperStations(
  tournamentId: string
): Promise<ScorekeeperStationSummary[]> {
  const { data, error } = await insforge.database
    .from('scorekeeper_stations')
    .select(
      'id, tournament_id, table_number, label, active, last_used_at, created_by, created_at, updated_at'
    )
    .eq('tournament_id', tournamentId)
    .order('table_number', { ascending: true });

  if (error) throw error;
  return (data as ScorekeeperStationSummary[]) || [];
}

export async function getScorekeeperStationById(
  stationId: string
): Promise<ScorekeeperStation | null> {
  const { data, error } = await insforge.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('id', stationId)
    .maybeSingle();

  if (error) throw error;
  return (data as ScorekeeperStation | null) ?? null;
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

export async function deleteTournaments(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await insforge.database
    .from('tournaments')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function deleteOldTournaments(
  statuses: TournamentStatus[],
  olderThan: string
) {
  if (statuses.length === 0) return;
  const { error } = await insforge.database
    .from('tournaments')
    .delete()
    .in('status', statuses)
    .lt('tournament_start_at', olderThan);

  if (error) throw error;
}

export function canDeleteTournament(
  status: TournamentStatus,
  role: AdminRole
): boolean {
  if (role === 'owner') return true;
  return status === 'draft' || status === 'cancelled';
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
    .insert({
      ...data,
      name: normalizeName(data.name),
      email: normalizeEmail(data.email),
      phone: normalizePhone(data.phone),
      notes: toNullableTrimmed(data.notes),
      handicap: data.handicap ?? 0,
    })
    .select()
    ;

  if (error) throw error;
  return result?.[0] as Participant;
}

export async function addParticipantsBulk(
  rows: Array<{
    tournament_id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    seed?: number | null;
    handicap?: number;
    notes?: string | null;
    checked_in?: boolean;
    checked_in_at?: string | null;
  }>
) {
  if (rows.length === 0) {
    return [] as Participant[];
  }

  const { data: result, error } = await insforge.database
    .from('participants')
    .insert(
      rows.map((row) => ({
        ...row,
        name: normalizeName(row.name),
        email: normalizeEmail(row.email),
        phone: normalizePhone(row.phone),
        notes: toNullableTrimmed(row.notes),
        handicap: row.handicap ?? 0,
      }))
    )
    .select();

  if (error) throw error;
  return (result as Participant[]) || [];
}

export async function updateParticipant(id: string, data: Partial<Participant>) {
  const { data: result, error } = await insforge.database
    .from('participants')
    .update({
      ...data,
      name: data.name ? normalizeName(data.name) : data.name,
      email: data.email === undefined ? data.email : normalizeEmail(data.email),
      phone: data.phone === undefined ? data.phone : normalizePhone(data.phone),
      notes: data.notes === undefined ? data.notes : toNullableTrimmed(data.notes),
      updated_at: new Date().toISOString(),
    })
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

export async function getPlayers(search?: string, limit = 25) {
  const baseQuery = () =>
    insforge.database
      .from('players')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

  const normalized = search?.trim();
  if (!normalized) {
    const { data, error } = await baseQuery();
    if (error) throw error;
    return (data as Player[]) || [];
  }

  const pattern = `%${normalized.replace(/[\\%_]/g, '\\$&')}%`;
  const results = await Promise.all([
    baseQuery().ilike('display_name', pattern),
    baseQuery().ilike('primary_email', pattern),
    baseQuery().ilike('primary_phone', pattern),
  ]);

  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) {
    throw failedResult.error;
  }

  const players = new Map<string, Player>();
  results.forEach((result) => {
    ((result.data as Player[]) || []).forEach((player) => {
      players.set(player.id, player);
    });
  });

  return Array.from(players.values())
    .sort((left, right) => {
      const rightTime = right.updated_at ? Date.parse(right.updated_at) || 0 : 0;
      const leftTime = left.updated_at ? Date.parse(left.updated_at) || 0 : 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export async function getPlayersByIds(playerIds: string[]) {
  if (playerIds.length === 0) {
    return [] as Player[];
  }

  const { data, error } = await insforge.database
    .from('players')
    .select('*')
    .in('id', playerIds);

  if (error) throw error;
  return (data as Player[]) || [];
}

export async function getPlayerById(playerId: string) {
  const { data, error } = await insforge.database
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  if (error) throw error;
  return (data as Player | null) ?? null;
}

export async function getPlayerCareerStats(playerId: string) {
  const { data, error } = await insforge.database
    .from('player_career_stats')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw error;
  return (data as PlayerCareerStats | null) ?? null;
}

export async function getPlayerLeaderboard(filters?: {
  gameType?: Tournament['game_type'] | 'all';
  format?: Tournament['format'] | 'all';
}): Promise<PlayerLeaderboardEntry[]> {
  const [playersRes, tournamentsRes, participantsRes, matchesRes] = await Promise.all([
    insforge.database.from('players').select('*'),
    insforge.database.from('tournaments').select('*'),
    insforge.database.from('participants').select('*'),
    insforge.database.from('matches').select('*'),
  ]);

  if (playersRes.error) throw playersRes.error;
  if (tournamentsRes.error) throw tournamentsRes.error;
  if (participantsRes.error) throw participantsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const tournaments = ((tournamentsRes.data as Tournament[]) || []).filter((tournament) => {
    if (!tournament.published) {
      return false;
    }

    const gameTypeMatches =
      !filters?.gameType || filters.gameType === 'all' || tournament.game_type === filters.gameType;
    const formatMatches =
      !filters?.format || filters.format === 'all' || tournament.format === filters.format;

    return gameTypeMatches && formatMatches;
  });
  const allowedTournamentIds = new Set(tournaments.map((tournament) => tournament.id));
  const participants = ((participantsRes.data as Participant[]) || []).filter(
    (participant) => participant.player_id && allowedTournamentIds.has(participant.tournament_id)
  );
  const matches = ((matchesRes.data as Match[]) || []).filter((match) =>
    allowedTournamentIds.has(match.tournament_id)
  );

  return calculatePlayerLeaderboardEntries(
    (playersRes.data as Player[]) || [],
    tournaments,
    participants,
    matches
  );
}

export async function relinkParticipantToPlayer(participantId: string, playerId: string) {
  const { data, error } = await insforge.database.rpc('relink_participant_player', {
    p_participant_id: participantId,
    p_player_id: playerId,
  });

  if (error) throw error;

  const participant = Array.isArray(data) ? data[0] : data;
  return participant as Participant;
}

export async function mergePlayerRecords(sourcePlayerId: string, targetPlayerId: string) {
  const { error } = await insforge.database.rpc('merge_players', {
    p_source_player_id: sourcePlayerId,
    p_target_player_id: targetPlayerId,
  });

  if (error) throw error;
}

export async function getPlayerProfileData(
  playerId: string
): Promise<PlayerProfileData | null> {
  const [player, tournamentsRes, participantsRes, matchesRes] = await Promise.all([
    getPlayerById(playerId),
    insforge.database
      .from('tournaments')
      .select('*')
      .eq('published', true)
      .order('tournament_start_at', { ascending: false }),
    insforge.database.from('participants').select('*').eq('player_id', playerId),
    insforge.database.from('matches').select('*'),
  ]);

  if (!player) {
    return null;
  }

  if (tournamentsRes.error) throw tournamentsRes.error;
  if (participantsRes.error) throw participantsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const tournaments = (tournamentsRes.data as Tournament[]) || [];
  const participants = (participantsRes.data as Participant[]) || [];
  const matches = (matchesRes.data as Match[]) || [];
  const tournamentMap = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const participantsByTournament = new Map<string, Participant[]>();
  const allParticipantsRes = await insforge.database.from('participants').select('*');

  if (allParticipantsRes.error) throw allParticipantsRes.error;

  const allParticipants = (allParticipantsRes.data as Participant[]) || [];
  const allParticipantsMap = new Map(allParticipants.map((participant) => [participant.id, participant]));

  allParticipants.forEach((participant) => {
    const existing = participantsByTournament.get(participant.tournament_id) ?? [];
    existing.push(participant);
    participantsByTournament.set(participant.tournament_id, existing);
  });

  const matchesByTournament = new Map<string, Match[]>();
  matches.forEach((match) => {
    const existing = matchesByTournament.get(match.tournament_id) ?? [];
    existing.push(match);
    matchesByTournament.set(match.tournament_id, existing);
  });

  const tournamentHistory = participants
    .map((participant) => {
      const tournament = tournamentMap.get(participant.tournament_id);
      if (!tournament) {
        return null;
      }

      const tournamentMatches = matchesByTournament.get(participant.tournament_id) ?? [];
      const recentMatch = [...tournamentMatches]
        .filter(
          (match) =>
            match.status === 'completed' &&
            (match.player1_id === participant.id || match.player2_id === participant.id)
        )
        .sort((left, right) => right.match_number - left.match_number)[0];

      return {
        tournament_id: tournament.id,
        tournament_slug: tournament.slug,
        tournament_title: tournament.title,
        tournament_format: tournament.format,
        tournament_game_type: tournament.game_type,
        tournament_status: tournament.status,
        tournament_start_at: tournament.tournament_start_at,
        participant_id: participant.id,
        participant_name: participant.name,
        participant_seed: participant.seed,
        final_place: inferFinalPlaceForParticipant(
          tournament,
          participantsByTournament.get(tournament.id) ?? [],
          tournamentMatches,
          participant.id
        ),
        recent_result: recentMatch ? formatScoreline(recentMatch, participant.id) : null,
      } satisfies PlayerTournamentHistoryEntry;
    })
    .filter((entry): entry is PlayerTournamentHistoryEntry => entry !== null)
    .sort(
      (left, right) =>
        new Date(right.tournament_start_at).getTime() - new Date(left.tournament_start_at).getTime()
    );

  const playerMatchHistory = participants
    .flatMap((participant) =>
      matches
        .filter(
          (match) =>
            match.status === 'completed' &&
            match.winner_id &&
            (match.player1_id === participant.id || match.player2_id === participant.id)
        )
        .map((match) => {
          const tournament = tournamentMap.get(match.tournament_id);
          if (!tournament) {
            return null;
          }

          const opponentParticipantId =
            match.player1_id === participant.id ? match.player2_id : match.player1_id;
          const opponentParticipant = opponentParticipantId
            ? allParticipantsMap.get(opponentParticipantId) ?? null
            : null;

          return {
            ...match,
            tournament_slug: tournament.slug,
            tournament_title: tournament.title,
            opponent_name: opponentParticipant?.name ?? 'TBD',
            opponent_player_id: opponentParticipant?.player_id ?? null,
            result: match.winner_id === participant.id ? 'win' : 'loss',
            scoreline: formatScoreline(match, participant.id),
          } satisfies PlayerMatchHistoryEntry;
        })
    )
    .filter((entry): entry is PlayerMatchHistoryEntry => entry !== null)
    .sort((left, right) => {
      const leftTime = new Date(
        left.completed_at ?? left.started_at ?? left.updated_at ?? left.created_at
      ).getTime();
      const rightTime = new Date(
        right.completed_at ?? right.started_at ?? right.updated_at ?? right.created_at
      ).getTime();
      return rightTime - leftTime;
    });

  return {
    player,
    stats: {
      player_id: player.id,
      display_name: player.display_name,
      tournaments_played: tournamentHistory.length,
      matches_played: playerMatchHistory.length,
      match_wins: playerMatchHistory.filter((match) => match.result === 'win').length,
      match_losses: playerMatchHistory.filter((match) => match.result === 'loss').length,
      win_rate:
        playerMatchHistory.length === 0
          ? 0
          : Number(
              (
                (playerMatchHistory.filter((match) => match.result === 'win').length /
                  playerMatchHistory.length) *
                100
              ).toFixed(2)
            ),
      titles: tournamentHistory.filter((entry) => entry.final_place === 1).length,
      runner_ups: tournamentHistory.filter((entry) => entry.final_place === 2).length,
      last_played_at:
        playerMatchHistory[0]?.completed_at ??
        playerMatchHistory[0]?.started_at ??
        playerMatchHistory[0]?.updated_at ??
        playerMatchHistory[0]?.created_at ??
        null,
    },
    tournaments: tournamentHistory,
    matches: playerMatchHistory,
    summary: {
      favorite_game_type: getFavoriteGameType(tournamentHistory),
      best_finish:
        tournamentHistory
          .map((entry) => entry.final_place)
          .filter((place): place is number => place !== null)
          .sort((left, right) => left - right)[0] ?? null,
      last_five_form: playerMatchHistory.slice(0, 5).map((match) =>
        match.result === 'win' ? 'W' : 'L'
      ),
    },
  };
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
    p_phone: normalizePhone(input.phone),
    p_handicap: input.handicap ?? 0,
    p_notes: toNullableTrimmed(input.notes),
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

export async function getRounds(tournamentId: string): Promise<Round[]> {
  const { data, error } = await insforge.database
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  if (error) throw error;
  return (data as Round[]) || [];
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
// Announcements
// ============================================================

export async function getAnnouncements(tournamentId: string): Promise<Announcement[]> {
  const { data, error } = await insforge.database
    .from('announcements')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Announcement[]) || [];
}

export async function createAnnouncement(
  tournamentId: string,
  message: string,
  pinned = false
): Promise<Announcement> {
  const { data, error } = await insforge.database
    .from('announcements')
    .insert({ tournament_id: tournamentId, message, pinned })
    .select();

  if (error) throw error;
  return data?.[0] as Announcement;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await insforge.database
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleAnnouncementPin(id: string, pinned: boolean) {
  const { error } = await insforge.database
    .from('announcements')
    .update({ pinned })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// Clone
// ============================================================

export async function cloneTournament(sourceId: string): Promise<Tournament> {
  const source = await getTournamentById(sourceId);
  if (!source) throw new Error('Tournament not found');

  const title = `${source.title} (Copy)`;
  const slug = generateSlug(title);

  const { data: result, error } = await insforge.database
    .from('tournaments')
    .insert({
      slug,
      title,
      description: source.description,
      format: source.format,
      game_type: source.game_type,
      race_to: source.race_to,
      alternate_break: source.alternate_break,
      max_participants: source.max_participants,
      entry_fee: source.entry_fee,
      venue_name: source.venue_name,
      venue_address: source.venue_address,
      check_in_required: source.check_in_required,
      rules: source.rules,
      prize_notes: source.prize_notes,
      status: 'draft' as TournamentStatus,
      published: false,
      tournament_start_at: source.tournament_start_at,
      registration_open_at: null,
      registration_close_at: null,
      late_entry_cutoff_at: null,
      bracket_generated_at: null,
      total_rounds: null,
    })
    .select();

  if (error) throw error;
  return result?.[0] as Tournament;
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
