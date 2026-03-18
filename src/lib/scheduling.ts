import type { GameType, Match, Round, Tournament } from './tournament-engine/types';

// ============================================================
// Match Duration Estimation
// ============================================================

/**
 * Average minutes per rack by game type (based on typical pool hall play).
 * These are rough heuristics that can be refined with actual tournament data.
 */
const MINUTES_PER_RACK: Record<GameType, number> = {
  '8-ball': 7,
  '9-ball': 5,
  '10-ball': 6,
  'straight_pool': 8,
  'scotch_doubles': 8,
};

/** Buffer time between matches (table changeover, chalk up, etc.) */
const TABLE_CHANGEOVER_MINUTES = 5;

/**
 * Estimate match duration in minutes based on race-to and game type.
 * Uses average racks per match (typically ~70% of max possible racks).
 */
export function estimateMatchDuration(raceTo: number, gameType: GameType): number {
  const perRack = MINUTES_PER_RACK[gameType] ?? 6;
  // Average match plays about 70% of max possible racks (raceTo + raceTo - 1)
  const avgRacks = Math.ceil((raceTo + raceTo - 1) * 0.7);
  return avgRacks * perRack;
}

/**
 * Get the effective match duration for a tournament.
 * Uses admin override if set, otherwise estimates from race-to and game type.
 */
export function getEffectiveMatchDuration(tournament: Tournament): number {
  if (tournament.estimated_match_duration_minutes) {
    return tournament.estimated_match_duration_minutes;
  }
  return estimateMatchDuration(tournament.race_to, tournament.game_type);
}

// ============================================================
// Schedule Calculation
// ============================================================

export interface ScheduledMatchInfo {
  matchId: string;
  matchNumber: number;
  scheduledAt: Date;
  estimatedDurationMinutes: number;
  tableNumber: number | null;
  roundNumber: number;
  bracketSide: string;
}

/**
 * Build a round lookup map from rounds array.
 */
function buildRoundMap(rounds: Round[]): Map<string, Round> {
  return new Map(rounds.map((r) => [r.id, r]));
}

/**
 * Calculate scheduled times for all matches in a tournament.
 * Walks the bracket round by round, assigns times based on:
 * - Tournament start time
 * - Number of available tables (stations)
 * - Estimated match duration
 * - Match dependencies (a match can't start until its feeder matches finish)
 *
 * Matches with `scheduled_at_manual = true` are left as-is.
 */
export function calculateMatchSchedule(
  tournament: Tournament,
  matches: Match[],
  rounds: Round[],
  tableCount: number
): ScheduledMatchInfo[] {
  if (!tournament.tournament_start_at || tableCount === 0) {
    return [];
  }

  const startTime = new Date(tournament.tournament_start_at);
  const duration = getEffectiveMatchDuration(tournament);
  const roundMap = buildRoundMap(rounds);

  // Group matches by round, sorted by round number within each bracket side
  const matchesByRound = new Map<string, Match[]>();
  for (const match of matches) {
    const round = roundMap.get(match.round_id);
    if (!round) continue;
    const key = `${round.bracket_side}-${round.round_number}`;
    const group = matchesByRound.get(key) || [];
    group.push(match);
    matchesByRound.set(key, group);
  }

  // Track when each table becomes available
  const tableAvailability: Date[] = Array.from(
    { length: tableCount },
    () => new Date(startTime)
  );

  // Track when each match is expected to finish (for dependency resolution)
  const matchFinishTime = new Map<string, Date>();

  // Sort rounds by bracket side priority then round number
  const sidePriority: Record<string, number> = {
    winners: 0,
    round_robin: 0,
    losers: 1,
    finals: 2,
  };

  const sortedRounds = [...rounds].sort((a, b) => {
    const aPri = sidePriority[a.bracket_side] ?? 0;
    const bPri = sidePriority[b.bracket_side] ?? 0;
    if (aPri !== bPri) return aPri - bPri;
    return a.round_number - b.round_number;
  });

  const scheduled: ScheduledMatchInfo[] = [];

  for (const round of sortedRounds) {
    const roundMatches = matchesByRound.get(`${round.bracket_side}-${round.round_number}`) || [];

    for (const match of roundMatches) {
      // Skip byes - they don't use time or tables
      if (match.status === 'bye') continue;

      // Skip manually scheduled matches
      if (match.scheduled_at_manual && match.scheduled_at) {
        const manualTime = new Date(match.scheduled_at);
        matchFinishTime.set(match.id, new Date(manualTime.getTime() + duration * 60000));
        scheduled.push({
          matchId: match.id,
          matchNumber: match.match_number,
          scheduledAt: manualTime,
          estimatedDurationMinutes: duration,
          tableNumber: match.table_number,
          roundNumber: round.round_number,
          bracketSide: round.bracket_side,
        });
        continue;
      }

      // Find the earliest this match can start based on dependencies
      let earliestStart = new Date(startTime);

      // Check if this match depends on previous matches (feeder matches)
      // A match depends on matches that feed into it via next_match_id
      for (const feeder of matches) {
        if (feeder.next_match_id === match.id || feeder.loser_next_match_id === match.id) {
          const feederFinish = matchFinishTime.get(feeder.id);
          if (feederFinish && feederFinish > earliestStart) {
            earliestStart = feederFinish;
          }
        }
      }

      // Add changeover time if not the very first match
      if (earliestStart > startTime) {
        earliestStart = new Date(earliestStart.getTime() + TABLE_CHANGEOVER_MINUTES * 60000);
      }

      // Find the earliest available table at or after earliestStart
      let bestTableIdx = 0;
      let bestTime = new Date(Math.max(
        tableAvailability[0].getTime(),
        earliestStart.getTime()
      ));

      for (let t = 1; t < tableCount; t++) {
        const available = new Date(Math.max(
          tableAvailability[t].getTime(),
          earliestStart.getTime()
        ));
        if (available < bestTime) {
          bestTime = available;
          bestTableIdx = t;
        }
      }

      const scheduledAt = bestTime;
      const finishAt = new Date(scheduledAt.getTime() + duration * 60000);

      // Update table availability
      tableAvailability[bestTableIdx] = finishAt;
      matchFinishTime.set(match.id, finishAt);

      scheduled.push({
        matchId: match.id,
        matchNumber: match.match_number,
        scheduledAt,
        estimatedDurationMinutes: duration,
        tableNumber: match.table_number ?? bestTableIdx + 1, // 1-indexed table numbers
        roundNumber: round.round_number,
        bracketSide: round.bracket_side,
      });
    }
  }

  return scheduled;
}

// ============================================================
// Schedule Formatting Helpers
// ============================================================

/**
 * Format a scheduled time as a short time string (e.g., "2:30 PM").
 */
export function formatScheduledTime(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Estimate tournament end time based on schedule.
 */
export function estimateTournamentEndTime(schedule: ScheduledMatchInfo[]): Date | null {
  if (schedule.length === 0) return null;

  let latest = schedule[0].scheduledAt;
  let latestDuration = schedule[0].estimatedDurationMinutes;

  for (const entry of schedule) {
    if (entry.scheduledAt > latest) {
      latest = entry.scheduledAt;
      latestDuration = entry.estimatedDurationMinutes;
    }
  }

  return new Date(latest.getTime() + latestDuration * 60000);
}

/**
 * Get estimated wait time for a specific match from now.
 */
export function getEstimatedWait(scheduledAt: Date | string | null): string | null {
  if (!scheduledAt) return null;
  const scheduled = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const now = new Date();
  const diffMs = scheduled.getTime() - now.getTime();

  if (diffMs <= 0) return 'Now';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `~${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `~${hours}h ${remainingMinutes}min` : `~${hours}h`;
}
