import type { GeneratedMatch, GeneratedRound, GeneratedBracket } from './types';

/**
 * Generate round robin pairings using the circle method (polygon scheduling).
 *
 * The algorithm fixes participant 0 in place and rotates the remaining
 * participants around a circle. Each rotation yields one round of n/2
 * matches, guaranteeing every participant faces every other exactly once.
 *
 * Works for 3-32 participants. If the count is odd, a dummy "bye"
 * participant is added so that each round one real participant sits out.
 */
export function generateRoundRobin(participantCount: number): GeneratedBracket {
  const isOdd = participantCount % 2 !== 0;
  // If odd, add a phantom bye participant to make the count even.
  const n = isOdd ? participantCount + 1 : participantCount;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;

  // Build the participant list as seed numbers (1-based).
  // Index n-1 is the bye slot when the original count was odd.
  // We use seed = null for the bye participant in match output.
  const BYE_INDEX = isOdd ? n - 1 : -1; // index of the dummy participant

  // Participants array that will be rotated. Index 0 is fixed.
  const participants: number[] = Array.from({ length: n }, (_, i) => i);

  const rounds: GeneratedRound[] = [];
  let matchNumber = 1;

  for (let round = 0; round < totalRounds; round++) {
    const matches: GeneratedMatch[] = [];

    for (let i = 0; i < matchesPerRound; i++) {
      // Pair the i-th element from the top with the i-th element from the bottom.
      const home = participants[i];
      const away = participants[n - 1 - i];

      const homeIsBye = home === BYE_INDEX;
      const awayIsBye = away === BYE_INDEX;
      const isBye = homeIsBye || awayIsBye;

      // Seeds are 1-based; bye participant maps to null.
      const player1Seed = homeIsBye ? null : home + 1;
      const player2Seed = awayIsBye ? null : away + 1;

      const match: GeneratedMatch = {
        match_number: matchNumber++,
        player1_seed: player1Seed,
        player2_seed: player2Seed,
        bracket_position: i + 1,
        next_match_number: null,
        next_match_slot: null,
        loser_next_match_number: null,
        loser_next_match_slot: null,
        is_bye: isBye,
      };

      matches.push(match);
    }

    rounds.push({
      round_number: round + 1,
      bracket_side: 'round_robin',
      name: `Round ${round + 1}`,
      matches,
    });

    // Circle-method rotation: fix index 0, rotate the rest one position.
    // [0, 1, 2, 3, 4] -> [0, 4, 1, 2, 3]
    const last = participants[n - 1];
    for (let i = n - 1; i > 1; i--) {
      participants[i] = participants[i - 1];
    }
    participants[1] = last;
  }

  return {
    rounds,
    total_rounds: totalRounds,
  };
}
