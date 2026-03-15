import type { MatchStatus } from './types';

export interface GeneratedMatchForSave {
  round_index: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id?: string | null;
  bracket_position: number;
  next_match_number: number | null;
  next_match_slot: number | null;
  loser_next_match_number: number | null;
  loser_next_match_slot: number | null;
  status: MatchStatus;
}

type SlotSourceKind = 'winner' | 'loser';

interface SlotSource {
  matchNumber: number;
  kind: SlotSourceKind;
}

type SlotState =
  | { kind: 'player'; playerId: string }
  | { kind: 'empty' }
  | { kind: 'unresolved' };

function getWinnerOutcome(match: GeneratedMatchForSave): SlotState {
  if (match.status === 'bye') {
    const survivor = match.winner_id ?? match.player1_id ?? match.player2_id;
    return survivor ? { kind: 'player', playerId: survivor } : { kind: 'empty' };
  }

  if (match.status === 'completed' && match.winner_id) {
    return { kind: 'player', playerId: match.winner_id };
  }

  return { kind: 'unresolved' };
}

function getLoserOutcome(match: GeneratedMatchForSave): SlotState {
  if (match.status === 'bye') {
    return { kind: 'empty' };
  }

  if (match.status === 'completed') {
    const loserId =
      match.player1_id === match.winner_id ? match.player2_id : match.player1_id;

    return loserId ? { kind: 'player', playerId: loserId } : { kind: 'empty' };
  }

  return { kind: 'unresolved' };
}

function getSlotState(
  match: GeneratedMatchForSave,
  slot: 1 | 2,
  matchMap: Map<number, GeneratedMatchForSave>,
  sourceMap: Map<string, SlotSource[]>
): SlotState {
  const currentPlayer = slot === 1 ? match.player1_id : match.player2_id;
  if (currentPlayer) {
    return { kind: 'player', playerId: currentPlayer };
  }

  const sources = sourceMap.get(`${match.match_number}:${slot}`) ?? [];
  if (sources.length === 0) {
    return { kind: 'empty' };
  }

  let sawUnresolved = false;

  for (const source of sources) {
    const sourceMatch = matchMap.get(source.matchNumber);
    if (!sourceMatch) {
      continue;
    }

    const outcome =
      source.kind === 'winner'
        ? getWinnerOutcome(sourceMatch)
        : getLoserOutcome(sourceMatch);

    if (outcome.kind === 'player') {
      return outcome;
    }

    if (outcome.kind === 'unresolved') {
      sawUnresolved = true;
    }
  }

  return sawUnresolved ? { kind: 'unresolved' } : { kind: 'empty' };
}

export function materializeGeneratedBracket(
  matches: GeneratedMatchForSave[]
): GeneratedMatchForSave[] {
  const resolvedMatches = matches.map((match) => ({
    ...match,
    winner_id:
      match.winner_id ??
      (match.status === 'bye' ? match.player1_id ?? match.player2_id : null),
  }));

  const matchMap = new Map(
    resolvedMatches.map((match) => [match.match_number, match] as const)
  );
  const sourceMap = new Map<string, SlotSource[]>();

  for (const match of resolvedMatches) {
    if (match.next_match_number && match.next_match_slot) {
      const key = `${match.next_match_number}:${match.next_match_slot}`;
      sourceMap.set(key, [
        ...(sourceMap.get(key) ?? []),
        { matchNumber: match.match_number, kind: 'winner' },
      ]);
    }

    if (match.loser_next_match_number && match.loser_next_match_slot) {
      const key = `${match.loser_next_match_number}:${match.loser_next_match_slot}`;
      sourceMap.set(key, [
        ...(sourceMap.get(key) ?? []),
        { matchNumber: match.match_number, kind: 'loser' },
      ]);
    }
  }

  let changed = true;
  let iterations = 0;

  while (changed && iterations < resolvedMatches.length * 4) {
    changed = false;
    iterations += 1;

    for (const match of resolvedMatches) {
      if (match.status === 'completed') {
        continue;
      }

      const slot1State = getSlotState(match, 1, matchMap, sourceMap);
      const slot2State = getSlotState(match, 2, matchMap, sourceMap);

      if (!match.player1_id && slot1State.kind === 'player') {
        match.player1_id = slot1State.playerId;
        changed = true;
      }

      if (!match.player2_id && slot2State.kind === 'player') {
        match.player2_id = slot2State.playerId;
        changed = true;
      }

      const player1Id = match.player1_id;
      const player2Id = match.player2_id;
      const slot1Empty = !player1Id && slot1State.kind === 'empty';
      const slot2Empty = !player2Id && slot2State.kind === 'empty';

      if (player1Id && player2Id) {
        if (match.status !== 'ready') {
          match.status = 'ready';
          changed = true;
        }
        if (match.winner_id !== null) {
          match.winner_id = null;
          changed = true;
        }
        continue;
      }

      if (slot1Empty || slot2Empty) {
        const survivorId = player1Id ?? player2Id ?? null;

        if (match.status !== 'bye') {
          match.status = 'bye';
          changed = true;
        }

        if (match.winner_id !== survivorId) {
          match.winner_id = survivorId;
          changed = true;
        }

        continue;
      }

      if (match.status !== 'pending') {
        match.status = 'pending';
        changed = true;
      }

      if (match.winner_id !== null) {
        match.winner_id = null;
        changed = true;
      }
    }
  }

  return resolvedMatches;
}
