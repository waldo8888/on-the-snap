import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createScorekeeperSessionValue,
  getScorekeeperSessionCookieOptions,
  hashScorekeeperPin,
  isScorekeeperConfigError,
  SCOREKEEPER_SESSION_COOKIE,
} from '@/lib/scorekeeper-auth';

interface ValidatedStation {
  id: string;
  tournament_id: string;
  table_number: number;
  label: string | null;
  active: boolean;
}

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

  // Per-station cap so rotating client IPs cannot brute-force a 6-digit PIN.
  const stationLimited = checkRateLimit(request, {
    prefix: 'scorekeeper-station',
    key: String(body.stationId),
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (stationLimited) return stationLimited;

  let pinHash = '';
  try {
    pinHash = hashScorekeeperPin(body.stationId, body.pin);
  } catch (error) {
    if (isScorekeeperConfigError(error)) {
      console.error('[scorekeeper-session] config error:', error.message);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    throw error;
  }

  const { data, error } = await insforge.database.rpc('scorekeeper_validate_station', {
    p_station_id: body.stationId,
    p_pin_hash: pinHash,
  });

  if (error) {
    console.error('[scorekeeper-session] validate failed:', error.message);
    return NextResponse.json({ error: 'Unable to verify station' }, { status: 400 });
  }

  const station = (Array.isArray(data) ? data[0] : data) as ValidatedStation | null;
  if (!station) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 });
  }

  const sessionValue = createScorekeeperSessionValue({
    stationId: station.id,
    tournamentId: station.tournament_id,
    tableNumber: station.table_number,
    pinHash,
  });

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
