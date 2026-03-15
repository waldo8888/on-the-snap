import { NextRequest, NextResponse } from 'next/server';
import { getMatchesWithPlayers, getTournamentById } from '@/lib/tournaments';
import { insforge } from '@/lib/insforge';
import {
  parseScorekeeperSessionValue,
  SCOREKEEPER_SESSION_COOKIE,
} from '@/lib/scorekeeper-auth';
import type { ScorekeeperStation } from '@/lib/tournament-engine/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;
  const session = parseScorekeeperSessionValue(
    request.cookies.get(SCOREKEEPER_SESSION_COOKIE)?.value
  );

  if (!session || session.stationId !== stationId) {
    return NextResponse.json({ error: 'Scorekeeper session required' }, { status: 401 });
  }

  const { data, error } = await insforge.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('id', stationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const station = (data as ScorekeeperStation | null) ?? null;
  if (!station || !station.active) {
    return NextResponse.json({ error: 'Station is inactive' }, { status: 403 });
  }

  if (
    session.tournamentId !== station.tournament_id ||
    Number(session.tableNumber) !== Number(station.table_number)
  ) {
    return NextResponse.json({ error: 'Station scope mismatch' }, { status: 403 });
  }

  const [tournament, matches] = await Promise.all([
    getTournamentById(station.tournament_id),
    getMatchesWithPlayers(station.tournament_id),
  ]);

  return NextResponse.json({
    tournament,
    matches: matches.filter(
      (match) => Number(match.table_number) === Number(station.table_number)
    ),
  });
}
