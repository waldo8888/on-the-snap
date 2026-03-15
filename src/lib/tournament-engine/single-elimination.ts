import type { GeneratedMatch, GeneratedRound, GeneratedBracket } from './types';
import { generateSeededOrder, placeByes, nextPowerOf2 } from './seeding';

// ============================================================
// Round Naming
// ============================================================

function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber; // 0 = final, 1 = semis, etc.
  if (roundsFromEnd === 0) return 'Finals';
  if (roundsFromEnd === 1) return 'Semifinals';
  if (roundsFromEnd === 2) return 'Quarterfinals';
  return `Round ${roundNumber}`;
}

// ============================================================
// Single Elimination Bracket Generator
// ============================================================

/**
 * Generates a complete single-elimination bracket structure.
 *
 * Works for any participant count from 2 to 128. The bracket is
 * padded to the next power of 2 with byes. Seeding follows
 * standard tournament seeding order (1v16, 8v9, etc.) and byes
 * are placed so the highest seeds receive them first.
 *
 * All wiring uses match_number (not database IDs) since IDs are
 * assigned later when rows are persisted.
 */
export function generateSingleElimination(participantCount: number): GeneratedBracket {
  if (participantCount < 2 || participantCount > 128) {
    throw new Error(`Participant count must be between 2 and 128, got ${participantCount}`);
  }

  const totalSlots = nextPowerOf2(participantCount);
  const totalRounds = Math.log2(totalSlots);

  // Seeded order maps bracket positions to seed numbers.
  // For 16 slots: [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
  const seededOrder = generateSeededOrder(totalSlots);

  // Bye positions: set of bracket-slot indices (0-based) that are byes.
  const { byePositions } = placeByes(participantCount);

  const rounds: GeneratedRound[] = [];
  let matchNumber = 1;

  // ----------------------------------------------------------
  // Round 1: Seed assignments and bye detection
  // ----------------------------------------------------------
  const round1MatchCount = totalSlots / 2;
  const round1Matches: GeneratedMatch[] = [];

  for (let i = 0; i < round1MatchCount; i++) {
    const slotA = i * 2;     // top slot index in seeded order
    const slotB = i * 2 + 1; // bottom slot index

    const seedA = seededOrder[slotA];
    const seedB = seededOrder[slotB];

    const aIsBye = byePositions.has(slotA);
    const bIsBye = byePositions.has(slotB);

    // Determine if this match is a bye (exactly one real player)
    const isBye = aIsBye !== bIsBye; // XOR — one is bye, one is real

    let player1Seed: number | null;
    let player2Seed: number | null;

    if (isBye) {
      // Real player goes to player1_seed, bye side is null
      player1Seed = aIsBye ? seedB : seedA;
      player2Seed = null;
    } else if (aIsBye && bIsBye) {
      // Both byes — shouldn't happen with proper bye placement, but handle it
      player1Seed = null;
      player2Seed = null;
    } else {
      // Normal match: top seed in player1, bottom seed in player2
      player1Seed = seedA;
      player2Seed = seedB;
    }

    // Wiring: match i (0-based) in round R feeds into
    //   match Math.floor(i/2) in round R+1.
    //   Slot 1 if i is even, slot 2 if i is odd.
    const nextMatchIndexInRound = Math.floor(i / 2);
    // next_match_number is offset by all prior matches
    const nextMatchNumber =
      totalRounds > 1 ? round1MatchCount + 1 + nextMatchIndexInRound : null;
    const nextMatchSlot = totalRounds > 1 ? (i % 2 === 0 ? 1 : 2) : null;

    round1Matches.push({
      match_number: matchNumber,
      player1_seed: player1Seed,
      player2_seed: player2Seed,
      bracket_position: i + 1,
      next_match_number: nextMatchNumber,
      next_match_slot: nextMatchSlot,
      loser_next_match_number: null,
      loser_next_match_slot: null,
      is_bye: isBye,
    });

    matchNumber++;
  }

  rounds.push({
    round_number: 1,
    bracket_side: 'winners',
    name: getRoundName(1, totalRounds),
    matches: round1Matches,
  });

  // ----------------------------------------------------------
  // Subsequent rounds (2 .. totalRounds)
  // ----------------------------------------------------------
  let prevRoundSize = round1MatchCount;

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = prevRoundSize / 2;
    const roundMatches: GeneratedMatch[] = [];

    // The first match_number for the NEXT round (for wiring)
    const currentRoundStart = matchNumber;
    const isLastRound = round === totalRounds;

    for (let i = 0; i < matchesInRound; i++) {
      const nextMatchIndexInRound = Math.floor(i / 2);
      const nextMatchNumber = isLastRound
        ? null
        : currentRoundStart + matchesInRound + nextMatchIndexInRound;
      const nextMatchSlot = isLastRound ? null : (i % 2 === 0 ? 1 : 2);

      roundMatches.push({
        match_number: matchNumber,
        player1_seed: null, // TBD — filled when winners advance
        player2_seed: null,
        bracket_position: i + 1,
        next_match_number: nextMatchNumber,
        next_match_slot: nextMatchSlot,
        loser_next_match_number: null,
        loser_next_match_slot: null,
        is_bye: false,
      });

      matchNumber++;
    }

    rounds.push({
      round_number: round,
      bracket_side: 'winners',
      name: getRoundName(round, totalRounds),
      matches: roundMatches,
    });

    prevRoundSize = matchesInRound;
  }

  return {
    rounds,
    total_rounds: totalRounds,
  };
}
