import type { Match, MatchUpdate, ScorekeeperStationSummary, Round } from './tournament-engine/types';

// ============================================================
// Auto Table Assignment Engine
// ============================================================

export interface TableAssignment {
  matchId: string;
  tableNumber: number;
  scheduledAt: string;
}

/**
 * Determine which tables are currently free (no in_progress match assigned).
 */
function getFreeTables(
  stations: ScorekeeperStationSummary[],
  matches: Match[]
): number[] {
  const activeTables = new Set<number>();

  for (const match of matches) {
    if (match.status === 'in_progress' && match.table_number !== null) {
      activeTables.add(match.table_number);
    }
  }

  return stations
    .filter((s) => s.active && !activeTables.has(s.table_number))
    .map((s) => s.table_number)
    .sort((a, b) => a - b);
}

/**
 * Get matches that are ready but not yet assigned to a table.
 * Sorted by priority: lower round numbers first, then by match number.
 */
function getUnassignedReadyMatches(
  matches: Match[],
  rounds: Round[]
): Match[] {
  const roundMap = new Map(rounds.map((r) => [r.id, r]));

  return matches
    .filter(
      (m) =>
        m.status === 'ready' &&
        m.table_number === null &&
        m.player1_id !== null &&
        m.player2_id !== null
    )
    .sort((a, b) => {
      // Sort by round number ascending (earlier rounds first)
      const aRound = roundMap.get(a.round_id);
      const bRound = roundMap.get(b.round_id);
      const aRoundNum = aRound?.round_number ?? 0;
      const bRoundNum = bRound?.round_number ?? 0;
      if (aRoundNum !== bRoundNum) return aRoundNum - bRoundNum;
      // Then by match number
      return a.match_number - b.match_number;
    });
}

/**
 * Compute auto table assignments for ready matches.
 * Returns MatchUpdate[] that can be applied via applyMatchUpdates.
 *
 * This is a pure function - it computes assignments but doesn't write to DB.
 * Called after match finalization to fill freed tables with next ready matches.
 */
export function computeAutoAssignments(
  matches: Match[],
  rounds: Round[],
  stations: ScorekeeperStationSummary[]
): MatchUpdate[] {
  const freeTables = getFreeTables(stations, matches);
  const readyMatches = getUnassignedReadyMatches(matches, rounds);

  if (freeTables.length === 0 || readyMatches.length === 0) {
    return [];
  }

  const updates: MatchUpdate[] = [];
  const assignCount = Math.min(freeTables.length, readyMatches.length);

  for (let i = 0; i < assignCount; i++) {
    updates.push({
      matchId: readyMatches[i].id,
      table_number: freeTables[i],
      scheduled_at: new Date().toISOString(),
    });
  }

  return updates;
}

/**
 * Get the match queue for a tournament - all ready/pending matches
 * that haven't been assigned to a table yet, in priority order.
 */
export function getMatchQueue(
  matches: Match[],
  rounds: Round[]
): Match[] {
  const roundMap = new Map(rounds.map((r) => [r.id, r]));

  return matches
    .filter(
      (m) =>
        (m.status === 'ready' || m.status === 'pending') &&
        m.table_number === null
    )
    .sort((a, b) => {
      // Ready matches before pending
      if (a.status !== b.status) {
        return a.status === 'ready' ? -1 : 1;
      }
      // Then by round number
      const aRound = roundMap.get(a.round_id);
      const bRound = roundMap.get(b.round_id);
      const aRoundNum = aRound?.round_number ?? 0;
      const bRoundNum = bRound?.round_number ?? 0;
      if (aRoundNum !== bRoundNum) return aRoundNum - bRoundNum;
      return a.match_number - b.match_number;
    });
}

/**
 * Get active matches currently being played at tables.
 */
export function getActiveTableMatches<T extends Match>(matches: T[]): T[] {
  return matches
    .filter((m) => m.status === 'in_progress' && m.table_number !== null)
    .sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
}

/**
 * Get the next N matches in the queue (for "on deck" display).
 */
export function getOnDeckMatches<T extends Match>(
  matches: T[],
  rounds: Round[],
  count: number = 3
): T[] {
  const queue = getMatchQueue(matches, rounds);
  return (queue.filter((m) => m.status === 'ready') as T[]).slice(0, count);
}
