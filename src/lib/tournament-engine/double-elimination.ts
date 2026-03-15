import type { GeneratedMatch, GeneratedRound, GeneratedBracket } from './types';
import { generateSingleElimination } from './single-elimination';

// ============================================================
// Double Elimination Bracket Generator
// ============================================================
//
// Produces a full double-elimination bracket with:
//   - Winners bracket (identical to single elimination)
//   - Losers bracket  (alternating drop-in / reduction rounds)
//   - Grand finals     (best-of-two: guaranteed match + reset)
//
// Supports 4–64 participants. Byes are handled by the winners
// bracket via the single-elimination generator.
// ============================================================

/**
 * Generate a complete double-elimination bracket for the given
 * number of participants.
 */
export function generateDoubleElimination(participantCount: number): GeneratedBracket {
  if (participantCount < 4) {
    throw new Error('Double elimination requires at least 4 participants');
  }
  if (participantCount > 64) {
    throw new Error('Double elimination supports at most 64 participants');
  }

  // ----------------------------------------------------------
  // 1. Winners bracket — reuse single-elimination structure
  // ----------------------------------------------------------
  const winnersBracket = generateSingleElimination(participantCount);
  const winnersRounds = winnersBracket.rounds.map<GeneratedRound>((r) => ({
    ...r,
    bracket_side: 'winners',
    name: r.round_number === winnersBracket.total_rounds
      ? 'Winners Finals'
      : `Winners Round ${r.round_number}`,
  }));

  // Collect the number of winners rounds for indexing
  const numWinnersRounds = winnersRounds.length;

  // ----------------------------------------------------------
  // 2. Build losers bracket structure
  // ----------------------------------------------------------
  //
  // For a bracket with W winners rounds, the losers bracket has
  // 2*(W-1) rounds:
  //   - For each winners round i (1..W-1):
  //       a) A "reduction" round (odd losers-round): losers
  //          from winners round i play each other (or play
  //          survivors from previous losers round).
  //       b) A "drop-in" round (even losers-round): losers
  //          from winners round i+1 drop into the bracket and
  //          play the survivors of the previous losers round.
  //
  // The first losers round is special: losers from W-R1 face
  // each other directly (reduction). Then W-R2 losers drop in
  // against those survivors, etc.
  //
  // Total losers rounds = 2 * (numWinnersRounds - 1)
  // ----------------------------------------------------------

  const losersRounds: GeneratedRound[] = [];
  let matchNumber = getMaxMatchNumber(winnersRounds) + 1;
  const numLosersRounds = 2 * (numWinnersRounds - 1);

  // We track how many "active" players flow through each losers
  // round so we know how many matches to create.
  //
  // After Winners R1 (totalSlots/2 matches), totalSlots/2 losers
  // drop into LR1.  Those losers pair up → totalSlots/4 matches
  // in LR1.  Then Winners R2 losers (totalSlots/4) drop in for
  // LR2, etc.
  //
  // Strategy: compute match counts per losers round, then wire.
  // ----------------------------------------------------------

  // matchesPerWinnersRound[i] = number of matches in winners round i (0-indexed)
  const matchesPerWinnersRound: number[] = winnersRounds.map(
    (r) => r.matches.length,
  );

  // Compute match counts for each losers round
  const losersRoundMatchCounts: number[] = [];
  let losersActivePlayers = 0;

  for (let lr = 0; lr < numLosersRounds; lr++) {
    if (lr === 0) {
      // LR1 (reduction): losers from Winners R1 pair up
      const droppedIn = matchesPerWinnersRound[0]; // = totalSlots / 2
      losersActivePlayers = droppedIn;
      const matches = losersActivePlayers / 2;
      losersRoundMatchCounts.push(matches);
      losersActivePlayers = matches; // survivors
    } else if (lr % 2 === 1) {
      // Drop-in round: losers from next winners round join
      const winnersRoundIndex = Math.floor(lr / 2) + 1;
      const droppedIn = matchesPerWinnersRound[winnersRoundIndex];
      // Survivors from previous losers round + new drop-ins
      // droppedIn should equal losersActivePlayers for a power-of-2 bracket
      const matches = Math.max(losersActivePlayers, droppedIn);
      losersRoundMatchCounts.push(matches);
      losersActivePlayers = matches; // survivors
    } else {
      // Reduction round (even, lr >= 2): no new drop-ins, just halve
      const matches = losersActivePlayers / 2;
      losersRoundMatchCounts.push(matches);
      losersActivePlayers = matches;
    }
  }

  // Build losers round objects with matches
  for (let lr = 0; lr < numLosersRounds; lr++) {
    const matchCount = losersRoundMatchCounts[lr];
    const roundNumber = lr + 1;
    const isLast = lr === numLosersRounds - 1;

    const matches: GeneratedMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        match_number: matchNumber++,
        player1_seed: null,
        player2_seed: null,
        bracket_position: m + 1,
        next_match_number: null,   // wired below
        next_match_slot: null,
        loser_next_match_number: null, // losers bracket losers are eliminated
        loser_next_match_slot: null,
        is_bye: false,
      });
    }

    losersRounds.push({
      round_number: roundNumber,
      bracket_side: 'losers',
      name: isLast ? 'Losers Finals' : `Losers Round ${roundNumber}`,
      matches,
    });
  }

  // ----------------------------------------------------------
  // 3. Grand finals
  // ----------------------------------------------------------
  const grandFinal1: GeneratedMatch = {
    match_number: matchNumber++,
    player1_seed: null,
    player2_seed: null,
    bracket_position: 1,
    next_match_number: null, // wired below (to reset if needed)
    next_match_slot: null,
    loser_next_match_number: null,
    loser_next_match_slot: null,
    is_bye: false,
  };

  const grandFinal2: GeneratedMatch = {
    match_number: matchNumber++,
    player1_seed: null,
    player2_seed: null,
    bracket_position: 1,
    next_match_number: null,
    next_match_slot: null,
    loser_next_match_number: null,
    loser_next_match_slot: null,
    is_bye: false,
  };

  // Grand final 1 conditionally triggers the reset match.
  // The advancement logic treats the shared winner/loser target
  // as "reset only if the challenger's side wins."
  grandFinal1.next_match_number = grandFinal2.match_number;
  grandFinal1.next_match_slot = 1;
  grandFinal1.loser_next_match_number = grandFinal2.match_number;
  grandFinal1.loser_next_match_slot = 2;

  const finalsRounds: GeneratedRound[] = [
    {
      round_number: 1,
      bracket_side: 'finals',
      name: 'Grand Finals',
      matches: [grandFinal1],
    },
    {
      round_number: 2,
      bracket_side: 'finals',
      name: 'Grand Finals Reset',
      matches: [grandFinal2],
    },
  ];

  // ----------------------------------------------------------
  // 4. Wire winners bracket → next match + loser drop paths
  // ----------------------------------------------------------
  // Winners bracket internal wiring (next_match) is already set
  // by generateSingleElimination, but we need to add loser paths.

  for (let ri = 0; ri < numWinnersRounds; ri++) {
    const round = winnersRounds[ri];
    const isLastWinnersRound = ri === numWinnersRounds - 1;

    for (let mi = 0; mi < round.matches.length; mi++) {
      const match = round.matches[mi];

      if (isLastWinnersRound) {
        // Winners finals winner → grand finals match 1, slot 1
        match.next_match_number = grandFinal1.match_number;
        match.next_match_slot = 1;
        // Winners finals loser → grand finals match 1, slot 2
        match.loser_next_match_number = grandFinal1.match_number;
        match.loser_next_match_slot = 2;
      } else {
        // Losers from winners round i drop into losers bracket.
        // Winners R1 losers → LR1 (index 0)
        // Winners R2 losers → LR2 (index 1, the drop-in round)
        // Winners R3 losers → LR4 (index 3)
        // Winners R(k+1) losers → LR(2k) for k >= 1
        // General: Winners round index ri:
        //   ri=0 → losers round index 0
        //   ri=k (k>=1) → losers round index 2*k - 1

        let losersRoundIndex: number;
        if (ri === 0) {
          losersRoundIndex = 0;
        } else {
          losersRoundIndex = 2 * ri - 1;
        }

        const targetLosersRound = losersRounds[losersRoundIndex];

        if (targetLosersRound) {
          // Determine which match slot the loser feeds into.
          // For LR1 (reduction round, ri=0): losers pair up.
          //   W-R1 match 0 loser → LR1 match 0 slot 1
          //   W-R1 match 1 loser → LR1 match 0 slot 2
          //   W-R1 match 2 loser → LR1 match 1 slot 1 ...
          //
          // For drop-in rounds (ri >= 1): losers from winners
          // play against survivors of the previous losers round.
          //   The dropped-in player goes to a specific slot.
          //   Convention: drop-ins fill slot 2, LB survivors slot 1.

          if (ri === 0) {
            // Reduction: pair up losers. Match mi → LR1 match floor(mi/2)
            const targetMatchIndex = Math.floor(mi / 2);
            const slot = (mi % 2) + 1; // 1 or 2
            if (targetMatchIndex < targetLosersRound.matches.length) {
              match.loser_next_match_number =
                targetLosersRound.matches[targetMatchIndex].match_number;
              match.loser_next_match_slot = slot as 1 | 2;
            }
          } else {
            // Drop-in round: each winners loser maps 1:1
            // to a match in the losers round, taking slot 2.
            // We may need to reverse the mapping to get better
            // seeding, but for MVP, direct mapping works.
            if (mi < targetLosersRound.matches.length) {
              match.loser_next_match_number =
                targetLosersRound.matches[mi].match_number;
              match.loser_next_match_slot = 2;
            }
          }
        }
      }
    }
  }

  // ----------------------------------------------------------
  // 5. Wire losers bracket internal next-match pointers
  // ----------------------------------------------------------
  for (let lr = 0; lr < losersRounds.length; lr++) {
    const round = losersRounds[lr];
    const isLast = lr === losersRounds.length - 1;

    for (let mi = 0; mi < round.matches.length; mi++) {
      const match = round.matches[mi];

      if (isLast) {
        // Losers finals winner → grand finals slot 2
        match.next_match_number = grandFinal1.match_number;
        match.next_match_slot = 2;
      } else {
        const nextRound = losersRounds[lr + 1];
        const nextIsDropIn = (lr + 1) % 2 === 1;

        if (nextIsDropIn) {
          // Next round is a drop-in round: survivors go 1:1
          // into slot 1 of the next round's matches.
          if (mi < nextRound.matches.length) {
            match.next_match_number = nextRound.matches[mi].match_number;
            match.next_match_slot = 1;
          }
        } else {
          // Next round is a reduction round: pair up survivors
          const targetMatchIndex = Math.floor(mi / 2);
          const slot = (mi % 2) + 1;
          if (targetMatchIndex < nextRound.matches.length) {
            match.next_match_number =
              nextRound.matches[targetMatchIndex].match_number;
            match.next_match_slot = slot as 1 | 2;
          }
        }
      }
    }
  }

  // ----------------------------------------------------------
  // 6. Handle byes in losers bracket
  // ----------------------------------------------------------
  // If any winners R1 match is a bye, the "loser" slot is empty
  // — there is no loser to drop. The corresponding LR1 match
  // may end up with only one player. We mark those as byes and
  // auto-advance.
  propagateLoserByes(winnersRounds, losersRounds);

  // ----------------------------------------------------------
  // 7. Combine all rounds and return
  // ----------------------------------------------------------
  const allRounds: GeneratedRound[] = [
    ...winnersRounds,
    ...losersRounds,
    ...finalsRounds,
  ];

  const totalRounds =
    numWinnersRounds + numLosersRounds + finalsRounds.length;

  return {
    rounds: allRounds,
    total_rounds: totalRounds,
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Get the highest match number across all rounds.
 */
function getMaxMatchNumber(rounds: GeneratedRound[]): number {
  let max = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.match_number > max) {
        max = match.match_number;
      }
    }
  }
  return max;
}

/**
 * Propagate byes from the winners bracket into the losers bracket.
 *
 * When a winners R1 match is a bye, there is no actual loser —
 * the favoured player advances automatically. The losers bracket
 * match that expected that loser will only have one entrant (or
 * zero). We mark the affected LR1 match as a bye and auto-wire
 * the survivor forward.
 */
function propagateLoserByes(
  winnersRounds: GeneratedRound[],
  losersRounds: GeneratedRound[],
): void {
  if (losersRounds.length === 0) return;

  const lr1 = losersRounds[0];

  // Build a lookup: match_number → match reference for LR1
  const lr1ByNumber = new Map<number, GeneratedMatch>();
  for (const m of lr1.matches) {
    lr1ByNumber.set(m.match_number, m);
  }

  // Check each winners R1 match for byes
  const wr1 = winnersRounds[0];
  for (const match of wr1.matches) {
    if (!match.is_bye) continue;

    // This bye match has no real loser, so the LR1 slot it
    // feeds is empty.
    if (match.loser_next_match_number != null) {
      const targetMatch = lr1ByNumber.get(match.loser_next_match_number);
      if (targetMatch) {
        // Mark the slot as empty (null seed stays null).
        // If both slots feeding this match are byes, mark
        // the whole match as a bye.
        const otherSlotMatch = findMatchFeedingSlot(
          wr1,
          match.loser_next_match_number,
          match.loser_next_match_slot === 1 ? 2 : 1,
        );

        if (otherSlotMatch && otherSlotMatch.is_bye) {
          // Both feeders are byes — this LR1 match has no players
          targetMatch.is_bye = true;
        }
        // If only one feeder is a bye, the other loser gets a
        // bye in LR1 (auto-advance). Mark as bye.
        else {
          targetMatch.is_bye = true;
        }
      }
    }
  }

  // For any LR1 match marked as a bye, auto-wire: clear its
  // seeds and let the advancement logic handle it at runtime.
  // The match stays wired to its next_match_number so the
  // survivor (or nobody) advances properly.
}

/**
 * Find the winners R1 match whose loser feeds a given losers
 * bracket match number at a given slot.
 */
function findMatchFeedingSlot(
  winnersR1: GeneratedRound,
  targetMatchNumber: number,
  targetSlot: number,
): GeneratedMatch | undefined {
  return winnersR1.matches.find(
    (m) =>
      m.loser_next_match_number === targetMatchNumber &&
      m.loser_next_match_slot === targetSlot,
  );
}
