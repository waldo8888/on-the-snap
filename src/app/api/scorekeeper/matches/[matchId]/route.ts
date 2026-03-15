import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import {
  parseScorekeeperSessionValue,
  SCOREKEEPER_SESSION_COOKIE,
} from '@/lib/scorekeeper-auth';
import {
  finalizeMatchResult,
  startMatch,
  updateLiveMatchScore,
  validateMatchScores,
} from '@/lib/match-operations';
import type { Match, ScorekeeperStation, Tournament } from '@/lib/tournament-engine/types';

async function getAuthorizedMatchContext(
  request: NextRequest,
  matchId: string
) {
  const session = parseScorekeeperSessionValue(
    request.cookies.get(SCOREKEEPER_SESSION_COOKIE)?.value
  );

  if (!session) {
    return { error: 'Scorekeeper session required', status: 401 as const };
  }

  const [{ data: stationData, error: stationError }, { data: matchData, error: matchError }] =
    await Promise.all([
      insforge.database
        .from('scorekeeper_stations')
        .select('*')
        .eq('id', session.stationId)
        .maybeSingle(),
      insforge.database.from('matches').select('*').eq('id', matchId).maybeSingle(),
    ]);

  if (stationError) {
    return { error: stationError.message, status: 400 as const };
  }

  if (matchError) {
    return { error: matchError.message, status: 400 as const };
  }

  const station = (stationData as ScorekeeperStation | null) ?? null;
  const match = (matchData as Match | null) ?? null;

  if (!station || !station.active) {
    return { error: 'Station is inactive', status: 403 as const };
  }

  if (!match) {
    return { error: 'Match not found', status: 404 as const };
  }

  if (session.stationId !== station.id || match.tournament_id !== session.tournamentId) {
    return { error: 'This match is not assigned to your station', status: 403 as const };
  }

  const matchIsAssignedToStation =
    match.table_number !== null &&
    Number(match.table_number) === Number(session.tableNumber);

  if (!matchIsAssignedToStation) {
    return { error: 'This match is not assigned to your station', status: 403 as const };
  }

  const { data: tournamentData, error: tournamentError } = await insforge.database
    .from('tournaments')
    .select('*')
    .eq('id', match.tournament_id)
    .maybeSingle();

  if (tournamentError) {
    return { error: tournamentError.message, status: 400 as const };
  }

  const tournament = (tournamentData as Tournament | null) ?? null;
  if (!tournament) {
    return { error: 'Tournament not found', status: 404 as const };
  }

  return {
    session,
    station,
    match,
    tournament,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const context = await getAuthorizedMatchContext(request, matchId);

  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const body = (await request.json()) as
    | { action?: 'start' }
    | { action?: 'update-score'; player1Score?: number; player2Score?: number }
    | { action?: 'finalize'; player1Score?: number; player2Score?: number };

  try {
    if (body.action === 'start') {
      if (context.match.status !== 'ready') {
        return NextResponse.json(
          { error: 'Only ready matches can be started' },
          { status: 400 }
        );
      }

      await startMatch(matchId);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update-score') {
      if (context.match.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'Only in-progress matches can receive live score updates' },
          { status: 400 }
        );
      }

      const player1Score = Number(body.player1Score);
      const player2Score = Number(body.player2Score);

      if (
        Number.isNaN(player1Score) ||
        Number.isNaN(player2Score) ||
        player1Score < 0 ||
        player2Score < 0
      ) {
        return NextResponse.json({ error: 'Scores must be non-negative numbers' }, { status: 400 });
      }

      await updateLiveMatchScore(matchId, player1Score, player2Score);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'finalize') {
      if (!['ready', 'in_progress'].includes(context.match.status)) {
        return NextResponse.json(
          { error: 'Only ready or in-progress matches can be finalized' },
          { status: 400 }
        );
      }

      const player1Score = Number(body.player1Score);
      const player2Score = Number(body.player2Score);
      const scoreError = validateMatchScores(
        player1Score,
        player2Score,
        context.tournament.race_to
      );

      if (scoreError) {
        return NextResponse.json({ error: scoreError }, { status: 400 });
      }

      await finalizeMatchResult({
        matchId,
        tournamentId: context.match.tournament_id,
        player1Score,
        player2Score,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Match update failed' },
      { status: 400 }
    );
  }
}
