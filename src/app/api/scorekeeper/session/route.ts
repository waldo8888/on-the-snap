import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createScorekeeperSessionValue,
  getScorekeeperSessionCookieOptions,
  isScorekeeperConfigError,
  SCOREKEEPER_SESSION_COOKIE,
  verifyScorekeeperPin,
} from '@/lib/scorekeeper-auth';
import type { ScorekeeperStation } from '@/lib/tournament-engine/types';

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, {
    prefix: 'scorekeeper-session',
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 attempts per minute
  });
  if (rateLimited) return rateLimited;
  const body = (await request.json()) as {
    stationId?: string;
    pin?: string;
  };

  if (!body.stationId || !body.pin) {
    return NextResponse.json(
      { error: 'stationId and pin are required' },
      { status: 400 }
    );
  }

  const { data, error } = await insforge.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('id', body.stationId)
    .maybeSingle();

  if (error) {
    console.error('[scorekeeper-session] lookup failed:', error.message);
    return NextResponse.json({ error: 'Unable to verify station' }, { status: 400 });
  }

  const station = (data as ScorekeeperStation | null) ?? null;
  if (!station) {
    return NextResponse.json({ error: 'Station not found' }, { status: 404 });
  }

  if (!station.active) {
    return NextResponse.json({ error: 'This station is inactive' }, { status: 403 });
  }

  let pinValid = false;
  let sessionValue = '';

  try {
    pinValid = verifyScorekeeperPin(station.id, body.pin, station.pin_hash);
    if (pinValid) {
      sessionValue = createScorekeeperSessionValue({
        stationId: station.id,
        tournamentId: station.tournament_id,
        tableNumber: station.table_number,
      });
    }
  } catch (error) {
    if (isScorekeeperConfigError(error)) {
      console.error('[scorekeeper-session] config error:', error.message);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    throw error;
  }

  if (!pinValid) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 });
  }

  await insforge.database
    .from('scorekeeper_stations')
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', station.id);

  const response = NextResponse.json({
    success: true,
    station: {
      id: station.id,
      tournament_id: station.tournament_id,
      table_number: station.table_number,
      label: station.label,
      active: station.active,
    },
  });

  response.cookies.set(
    SCOREKEEPER_SESSION_COOKIE,
    sessionValue,
    getScorekeeperSessionCookieOptions()
  );

  return response;
}
