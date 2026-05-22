import type { Match, MatchUpdate } from './tournament-engine/types';
import { insforge } from './insforge';
import {
  applyMatchUpdates,
  getMatches,
  getRounds,
  getScorekeeperStations,
  getTournamentById,
  updateMatch,
} from './tournaments';
import {
  advanceWinner,
  canCorrectMatch,
  revertMatch,
} from './tournament-engine/advancement';
import { computeAutoAssignments } from './table-assignment';

export interface ScorekeeperCredentials {
  stationId: string;
  pinHash: string;
}

async function scorekeeperUpdateMatchField(
  matchId: string,
  patch: {
    status?: string;
    started_at?: string;
    player1_score?: number;
    player2_score?: number;
  },
  creds: ScorekeeperCredentials
): Promise<Match> {
  const { data, error } = await insforge.database.rpc(
    'scorekeeper_update_match_field',
    {
      p_station_id: creds.stationId,
      p_pin_hash: creds.pinHash,
      p_match_id: matchId,
      p_status: patch.status ?? null,
      p_started_at: patch.started_at ?? null,
      p_player1_score: patch.player1_score ?? null,
      p_player2_score: patch.player2_score ?? null,
    }
  );

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as Match;
}

async function scorekeeperApplyMatchUpdates(
  updates: MatchUpdate[],
  creds: ScorekeeperCredentials
): Promise<void> {
  const serializedUpdates = updates
    .filter((update): update is MatchUpdate & { matchId: string } => Boolean(update.matchId))
    .map((update) => {
      const { matchId, ...patch } = update;
      return { matchId, ...patch };
    });

  if (serializedUpdates.length === 0) {
    return;
  }

  const { error } = await insforge.database.rpc(
    'scorekeeper_apply_match_updates',
    {
      p_station_id: creds.stationId,
      p_pin_hash: creds.pinHash,
      p_updates: serializedUpdates,
    }
  );

  if (error) throw error;
}

export function parseScoreInput(value?: string) {
  if (!value || value.trim() === '') {
    return 0;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function validateMatchScores(
  player1Score: number | null,
  player2Score: number | null,
  raceTo: number
) {
  if (player1Score === null || player2Score === null || player1Score < 0 || player2Score < 0) {
    return 'Enter valid non-negative scores';
  }

  if (player1Score === player2Score) {
    return 'Scores cannot be tied — one player must win';
  }

  const winningScore = Math.max(player1Score, player2Score);
  if (winningScore > raceTo) {
    return `Winning score cannot be higher than race to ${raceTo}`;
  }

  if (winningScore !== raceTo) {
    return `The winner must reach exactly ${raceTo}`;
  }

  return null;
}

export function getRaceToExamples(raceTo: number) {
  const closeScore = Math.max(raceTo - 1, 0);
  const midScore = raceTo > 2 ? raceTo - 2 : 0;
  return `${raceTo}-0, ${raceTo}-${midScore}, ${raceTo}-${closeScore}`;
}

export async function startMatch(matchId: string, creds?: ScorekeeperCredentials) {
  if (creds) {
    return scorekeeperUpdateMatchField(
      matchId,
      {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
      creds
    );
  }

  return updateMatch(matchId, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });
}

export async function updateLiveMatchScore(
  matchId: string,
  player1Score: number,
  player2Score: number,
  creds?: ScorekeeperCredentials
) {
  const { startedAt } = await (async () => {
    const matches = await getMatchesForMatchId(matchId);
    return matches;
  })();

  const startedAtIso = startedAt ?? new Date().toISOString();

  if (creds) {
    return scorekeeperUpdateMatchField(
      matchId,
      {
        status: 'in_progress',
        started_at: startedAtIso,
        player1_score: player1Score,
        player2_score: player2Score,
      },
      creds
    );
  }

  return updateMatch(matchId, {
    status: 'in_progress',
    started_at: startedAtIso,
    player1_score: player1Score,
    player2_score: player2Score,
  });
}

export async function finalizeMatchResult(options: {
  matchId: string;
  tournamentId: string;
  player1Score: number;
  player2Score: number;
  scorekeeperCredentials?: ScorekeeperCredentials;
}) {
  const freshMatches = await getMatches(options.tournamentId);
  const freshMatch = freshMatches.find((match) => match.id === options.matchId);

  if (!freshMatch) {
    throw new Error('Match not found');
  }

  const winnerId =
    options.player1Score > options.player2Score
      ? freshMatch.player1_id
      : freshMatch.player2_id;

  if (!winnerId) {
    throw new Error('Cannot determine winner');
  }

  const updates: MatchUpdate[] = advanceWinner(
    freshMatch,
    winnerId,
    options.player1Score,
    options.player2Score,
    freshMatches
  );

  if (options.scorekeeperCredentials) {
    await scorekeeperApplyMatchUpdates(updates, options.scorekeeperCredentials);
  } else {
    await applyMatchUpdates(updates);
  }

  // Auto-assign freed tables to next ready matches
  await autoAssignTablesAfterFinalize(options.tournamentId, options.scorekeeperCredentials);
}

/**
 * After a match is finalized, check if the tournament has auto_assign_tables enabled
 * and assign any freed tables to the next ready matches in the queue.
 */
async function autoAssignTablesAfterFinalize(
  tournamentId: string,
  creds?: ScorekeeperCredentials
) {
  try {
    const tournament = await getTournamentById(tournamentId);
    if (!tournament?.auto_assign_tables) return;

    const [matches, rounds, stations] = await Promise.all([
      getMatches(tournamentId),
      getRounds(tournamentId),
      getScorekeeperStations(tournamentId),
    ]);

    const assignments = computeAutoAssignments(matches, rounds, stations);
    if (assignments.length > 0) {
      if (creds) {
        await scorekeeperApplyMatchUpdates(assignments, creds);
      } else {
        await applyMatchUpdates(assignments);
      }
    }
  } catch {
    // Auto-assignment is best-effort - don't fail the finalization
    console.error('Auto table assignment failed (non-blocking)');
  }
}

async function getMatchesForMatchId(matchId: string) {
  const { data, error } = await insforge.database
    .from('matches')
    .select('id, tournament_id, started_at')
    .eq('id', matchId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Match not found');
  }

  return {
    tournamentId: data.tournament_id as string,
    startedAt: (data.started_at as string | null) ?? null,
  };
}

export async function correctMatchResult(options: {
  matchId: string;
  tournamentId: string;
  player1Score: number;
  player2Score: number;
}) {
  const freshMatches = await getMatches(options.tournamentId);
  const freshMatch = freshMatches.find((match) => match.id === options.matchId);

  if (!freshMatch) {
    throw new Error('Match not found');
  }

  const correctionCheck = canCorrectMatch(freshMatch, freshMatches);
  if (!correctionCheck.safe) {
    throw new Error(correctionCheck.reason ?? 'Cannot correct this match');
  }

  const winnerId =
    options.player1Score > options.player2Score
      ? freshMatch.player1_id
      : freshMatch.player2_id;

  if (!winnerId) {
    throw new Error('Cannot determine winner');
  }

  await applyMatchUpdates(revertMatch(freshMatch, freshMatches));

  const refreshedMatches = await getMatches(options.tournamentId);
  const refreshedMatch = refreshedMatches.find((match) => match.id === options.matchId);

  if (!refreshedMatch) {
    throw new Error('Match not found after revert');
  }

  await applyMatchUpdates(
    advanceWinner(
      refreshedMatch,
      winnerId,
      options.player1Score,
      options.player2Score,
      refreshedMatches
    )
  );
}
