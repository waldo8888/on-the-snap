import type { Match, MatchUpdate } from './types';

type MatchUpdateMap = Map<string, MatchUpdate>;

function mergeMatchUpdate(updates: MatchUpdateMap, patch: MatchUpdate) {
  if (!patch.matchId) {
    return;
  }

  const current = updates.get(patch.matchId) ?? { matchId: patch.matchId };
  updates.set(patch.matchId, { ...current, ...patch });
}

function getProjectedMatch(
  matchId: string,
  allMatches: Match[],
  updates: MatchUpdateMap
): Match | null {
  const baseMatch = allMatches.find((match) => match.id === matchId);
  if (!baseMatch) {
    return null;
  }

  const patch = updates.get(matchId);
  return patch ? ({ ...baseMatch, ...patch } as Match) : baseMatch;
}

function hasBothPlayers(match: Pick<Match, 'player1_id' | 'player2_id'>) {
  return Boolean(match.player1_id && match.player2_id);
}

function getLoserId(match: Match, winnerId: string) {
  return match.player1_id === winnerId ? match.player2_id : match.player1_id;
}

function isConditionalResetMatch(match: Match) {
  return Boolean(
    match.next_match_id &&
      match.loser_next_match_id &&
      match.next_match_id === match.loser_next_match_id &&
      match.next_match_slot &&
      match.loser_next_match_slot &&
      match.next_match_slot !== match.loser_next_match_slot
  );
}

function propagateByeWinner(
  match: Match,
  winnerId: string,
  allMatches: Match[],
  updates: MatchUpdateMap,
  timestamp: string
) {
  if (!match.next_match_id || !match.next_match_slot) {
    return;
  }

  applyEntrantToMatch(
    match.next_match_id,
    match.next_match_slot as 1 | 2,
    winnerId,
    allMatches,
    updates,
    timestamp
  );
}

function applyEntrantToMatch(
  targetMatchId: string,
  slot: 1 | 2,
  playerId: string,
  allMatches: Match[],
  updates: MatchUpdateMap,
  timestamp: string
) {
  const slotKey = slot === 1 ? 'player1_id' : 'player2_id';

  mergeMatchUpdate(updates, {
    matchId: targetMatchId,
    [slotKey]: playerId,
  });

  const projectedMatch = getProjectedMatch(targetMatchId, allMatches, updates);
  if (!projectedMatch) {
    return;
  }

  if (projectedMatch.status === 'bye') {
    if (hasBothPlayers(projectedMatch)) {
      mergeMatchUpdate(updates, {
        matchId: projectedMatch.id,
        status: 'ready',
        winner_id: null,
        completed_at: null,
      });
      return;
    }

    const byeWinnerId = projectedMatch.player1_id ?? projectedMatch.player2_id;
    mergeMatchUpdate(updates, {
      matchId: projectedMatch.id,
      status: 'bye',
      winner_id: byeWinnerId,
      completed_at: byeWinnerId ? timestamp : null,
    });

    if (byeWinnerId) {
      propagateByeWinner(projectedMatch, byeWinnerId, allMatches, updates, timestamp);
    }

    return;
  }

  if (hasBothPlayers(projectedMatch) && projectedMatch.status === 'pending') {
    mergeMatchUpdate(updates, {
      matchId: projectedMatch.id,
      status: 'ready',
    });
  }
}

function clearPropagatedSlot(
  targetMatchId: string | null,
  slot: number | null,
  allMatches: Match[],
  updates: MatchUpdateMap
) {
  if (!targetMatchId || (slot !== 1 && slot !== 2)) {
    return;
  }

  const projectedMatch = getProjectedMatch(targetMatchId, allMatches, updates);
  if (!projectedMatch) {
    return;
  }

  const slotKey = slot === 1 ? 'player1_id' : 'player2_id';
  const autoAdvancedByeWinner =
    projectedMatch.status === 'bye' ? projectedMatch.winner_id : null;

  mergeMatchUpdate(updates, {
    matchId: targetMatchId,
    [slotKey]: null,
  });

  if (autoAdvancedByeWinner) {
    mergeMatchUpdate(updates, {
      matchId: targetMatchId,
      winner_id: null,
      completed_at: null,
      status: 'bye',
    });

    if (projectedMatch.next_match_id && projectedMatch.next_match_slot) {
      clearPropagatedSlot(
        projectedMatch.next_match_id,
        projectedMatch.next_match_slot,
        allMatches,
        updates
      );
    }

    return;
  }

  const afterClear = getProjectedMatch(targetMatchId, allMatches, updates);
  if (!afterClear) {
    return;
  }

  if (afterClear.status === 'bye') {
    mergeMatchUpdate(updates, {
      matchId: targetMatchId,
      winner_id: null,
      completed_at: null,
      status: 'bye',
    });
    return;
  }

  mergeMatchUpdate(updates, {
    matchId: targetMatchId,
    winner_id: null,
    completed_at: null,
    status: hasBothPlayers(afterClear) ? 'ready' : 'pending',
  });
}

function collectDownstreamMatches(match: Match, allMatches: Match[]) {
  const matchMap = new Map(allMatches.map((item) => [item.id, item] as const));
  const seen = new Set<string>();
  const queue = [match.next_match_id, match.loser_next_match_id].filter(
    (id): id is string => Boolean(id)
  );
  const downstream: Match[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (seen.has(currentId)) {
      continue;
    }
    seen.add(currentId);

    const current = matchMap.get(currentId);
    if (!current) {
      continue;
    }

    downstream.push(current);

    if (current.next_match_id) {
      queue.push(current.next_match_id);
    }
    if (current.loser_next_match_id) {
      queue.push(current.loser_next_match_id);
    }
  }

  return downstream;
}

/**
 * Process a match result and compute downstream updates.
 * Pure function — takes current state, returns list of updates to apply.
 */
export function advanceWinner(
  completedMatch: Match,
  winnerId: string,
  player1Score: number,
  player2Score: number,
  allMatches: Match[]
): MatchUpdate[] {
  const updates: MatchUpdateMap = new Map();
  const loserId = getLoserId(completedMatch, winnerId);
  const timestamp = new Date().toISOString();

  mergeMatchUpdate(updates, {
    matchId: completedMatch.id,
    winner_id: winnerId,
    player1_score: player1Score,
    player2_score: player2Score,
    status: 'completed',
    completed_at: timestamp,
  });

  if (isConditionalResetMatch(completedMatch)) {
    if (
      winnerId === completedMatch.player2_id &&
      completedMatch.next_match_id &&
      completedMatch.next_match_slot &&
      completedMatch.loser_next_match_id &&
      completedMatch.loser_next_match_slot &&
      loserId
    ) {
      applyEntrantToMatch(
        completedMatch.next_match_id,
        completedMatch.next_match_slot as 1 | 2,
        winnerId,
        allMatches,
        updates,
        timestamp
      );
      applyEntrantToMatch(
        completedMatch.loser_next_match_id,
        completedMatch.loser_next_match_slot as 1 | 2,
        loserId,
        allMatches,
        updates,
        timestamp
      );
    }

    return Array.from(updates.values());
  }

  if (
    completedMatch.next_match_id &&
    completedMatch.next_match_slot &&
    winnerId
  ) {
    applyEntrantToMatch(
      completedMatch.next_match_id,
      completedMatch.next_match_slot as 1 | 2,
      winnerId,
      allMatches,
      updates,
      timestamp
    );
  }

  if (
    completedMatch.loser_next_match_id &&
    completedMatch.loser_next_match_slot &&
    loserId
  ) {
    applyEntrantToMatch(
      completedMatch.loser_next_match_id,
      completedMatch.loser_next_match_slot as 1 | 2,
      loserId,
      allMatches,
      updates,
      timestamp
    );
  }

  return Array.from(updates.values());
}

/**
 * Check if correcting a match result is safe (no downstream matches have been played).
 */
export function canCorrectMatch(
  match: Match,
  allMatches: Match[]
): { safe: boolean; reason?: string } {
  if (match.status !== 'completed') {
    return { safe: false, reason: 'Match is not completed' };
  }

  const downstreamMatches = collectDownstreamMatches(match, allMatches);

  const blockedMatch = downstreamMatches.find(
    (candidate) =>
      candidate.status === 'completed' || candidate.status === 'in_progress'
  );

  if (blockedMatch) {
    return {
      safe: false,
      reason:
        blockedMatch.status === 'in_progress'
          ? 'A downstream match is currently in progress.'
          : 'A downstream match has already been completed. Reset the bracket from that point first.',
    };
  }

  return { safe: true };
}

/**
 * Revert a match result and clear downstream effects.
 * Returns updates to apply to undo the match.
 */
export function revertMatch(match: Match, allMatches: Match[]): MatchUpdate[] {
  const check = canCorrectMatch(match, allMatches);
  if (!check.safe) {
    throw new Error(check.reason);
  }

  const updates: MatchUpdateMap = new Map();

  mergeMatchUpdate(updates, {
    matchId: match.id,
    winner_id: null,
    player1_score: null,
    player2_score: null,
    status: 'ready',
    completed_at: null,
  });

  clearPropagatedSlot(match.next_match_id, match.next_match_slot, allMatches, updates);
  clearPropagatedSlot(
    match.loser_next_match_id,
    match.loser_next_match_slot,
    allMatches,
    updates
  );

  return Array.from(updates.values());
}
