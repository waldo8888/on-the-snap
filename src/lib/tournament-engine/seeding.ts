import type { SeedEntry } from './types';

// ============================================================
// Tournament Seeding Utilities
// ============================================================

/**
 * Find the smallest power of 2 that is >= n.
 */
export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
}

/**
 * Generate the standard bracket seeding order for a given size.
 *
 * For 8 players the result is [1, 8, 5, 4, 3, 6, 7, 2] which produces
 * first-round matchups: 1v8, 5v4, 3v6, 7v2. This guarantees the top
 * seeds land on opposite sides of the bracket and meet as late as
 * possible.
 *
 * The algorithm works by recursively splitting. A bracket of size 2 is
 * simply [1, 2]. To go from size N to size 2N, each pair (a, b) at
 * positions i in the previous round is expanded: seed a stays, and a
 * new opponent is added such that every first-round matchup sums to
 * 2N + 1.
 */
export function generateSeededOrder(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];

  // Start with the trivial bracket of size 2
  let order: number[] = [1, 2];

  // Double the bracket size until we reach the target
  while (order.length < count) {
    const size = order.length * 2;
    const expanded: number[] = [];
    for (const seed of order) {
      // Each existing seed is paired with (size + 1 - seed)
      // They go into adjacent slots so the matchup is correct
      expanded.push(seed, size + 1 - seed);
    }
    order = expanded;
  }

  return order;
}

/**
 * Determine which bracket slots are byes given the actual participant
 * count. The total number of slots is rounded up to the next power of 2.
 * Byes are assigned to the top seeds first (seed 1 gets a bye before
 * seed 2, etc.).
 *
 * Returns the total slot count and a set of 0-based positions that
 * should be byes in the seeded bracket order.
 */
export function placeByes(participantCount: number): {
  totalSlots: number;
  byePositions: Set<number>;
} {
  const totalSlots = nextPowerOf2(participantCount);
  const byeCount = totalSlots - participantCount;
  const byePositions = new Set<number>();

  if (byeCount === 0) {
    return { totalSlots, byePositions };
  }

  // The seeded order tells us which seed occupies each slot.
  // Byes replace the lowest-ranked opponents of the top seeds.
  // In the seeded order, matches are laid out as pairs:
  //   slot 0 vs slot 1, slot 2 vs slot 3, etc.
  // A bye means the weaker seed in a pair is absent.
  // We want the top `byeCount` seeds to receive byes.
  const order = generateSeededOrder(totalSlots);

  // Collect matchup pairs with the position of the higher seed
  // and the position of the lower seed (the bye candidate).
  const pairs: { topSeed: number; byeSlot: number }[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const seedA = order[i];
    const seedB = order[i + 1];
    if (seedA < seedB) {
      pairs.push({ topSeed: seedA, byeSlot: i + 1 });
    } else {
      pairs.push({ topSeed: seedB, byeSlot: i });
    }
  }

  // Sort by topSeed ascending so seed 1 gets a bye first
  pairs.sort((a, b) => a.topSeed - b.topSeed);

  for (let i = 0; i < byeCount; i++) {
    byePositions.add(pairs[i].byeSlot);
  }

  return { totalSlots, byePositions };
}

/**
 * Randomly assign seeds to a list of participants.
 * Uses Fisher-Yates shuffle, then assigns seeds 1..N.
 */
export function randomizeSeeds(
  participants: { id: string; name: string }[]
): SeedEntry[] {
  // Shallow copy so we don't mutate the input
  const shuffled = [...participants];

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((p, index) => ({
    participantId: p.id,
    seed: index + 1,
    name: p.name,
  }));
}

/**
 * Assign seeds to participants, preserving any pre-existing seed values.
 * Participants that already have a seed keep it. Those without a seed
 * are assigned the remaining seed numbers in the order they appear.
 */
export function assignSeeds(
  participants: { id: string; name: string; seed?: number | null }[]
): SeedEntry[] {
  const totalCount = participants.length;

  // Collect seeds that are already taken
  const takenSeeds = new Set<number>();
  for (const p of participants) {
    if (p.seed != null && p.seed > 0) {
      takenSeeds.add(p.seed);
    }
  }

  // Build a list of available seed numbers (1..N), excluding taken ones
  const availableSeeds: number[] = [];
  for (let s = 1; s <= totalCount; s++) {
    if (!takenSeeds.has(s)) {
      availableSeeds.push(s);
    }
  }

  let nextAvailableIndex = 0;
  return participants.map((p) => {
    const seed =
      p.seed != null && p.seed > 0
        ? p.seed
        : availableSeeds[nextAvailableIndex++];

    return {
      participantId: p.id,
      seed,
      name: p.name,
    };
  });
}
