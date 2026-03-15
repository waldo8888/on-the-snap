import type { MatchUpdate } from './tournament-engine/types';
import { insforge } from './insforge';
import {
  applyMatchUpdates,
  getMatches,
  updateMatch,
} from './tournaments';
import {
  advanceWinner,
  canCorrectMatch,
  revertMatch,
} from './tournament-engine/advancement';

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

export async function startMatch(matchId: string) {
  return updateMatch(matchId, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });
}

export async function updateLiveMatchScore(
  matchId: string,
  player1Score: number,
  player2Score: number
) {
  const { startedAt } = await (async () => {
    const matches = await getMatchesForMatchId(matchId);
    return matches;
  })();

  return updateMatch(matchId, {
    status: 'in_progress',
    started_at: startedAt ?? new Date().toISOString(),
    player1_score: player1Score,
    player2_score: player2Score,
  });
}

export async function finalizeMatchResult(options: {
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

  await applyMatchUpdates(updates);
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
