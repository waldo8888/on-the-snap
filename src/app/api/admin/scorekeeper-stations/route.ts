import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { getAuthenticatedServerInsforgeClient } from '@/lib/insforge-server';
import {
  generateScorekeeperPin,
  hashScorekeeperPin,
  isScorekeeperConfigError,
} from '@/lib/scorekeeper-auth';
import type { ScorekeeperStation } from '@/lib/tournament-engine/types';

function sanitizeStation(station: ScorekeeperStation) {
  const { pin_hash: pinHash, ...rest } = station;
  void pinHash;
  return rest;
}

function authAwareErrorResponse(message: string) {
  if (/jwt expired|invalid jwt|authentication required/i.test(message)) {
    return NextResponse.json(
      { error: 'Admin session expired. Refresh the page or sign in again.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const tournamentId = request.nextUrl.searchParams.get('tournamentId');
  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
  }

  const serverClient = await getAuthenticatedServerInsforgeClient();
  if (!serverClient) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await serverClient.client.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('table_number', { ascending: true });

  if (error) {
    return authAwareErrorResponse(error.message);
  }

  return NextResponse.json({
    stations: ((data as ScorekeeperStation[]) || []).map(sanitizeStation),
  });
}

export async function POST(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const serverClient = await getAuthenticatedServerInsforgeClient();
  if (!serverClient) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = (await request.json()) as {
    tournamentId?: string;
    tableNumber?: number;
    label?: string | null;
  };

  if (!body.tournamentId || !body.tableNumber || body.tableNumber < 1) {
    return NextResponse.json(
      { error: 'tournamentId and a valid tableNumber are required' },
      { status: 400 }
    );
  }

  const { data: existingData, error: existingError } = await serverClient.client.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('tournament_id', body.tournamentId)
    .eq('table_number', body.tableNumber)
    .limit(1);

  if (existingError) {
    return authAwareErrorResponse(existingError.message);
  }

  const existingStation = ((existingData as ScorekeeperStation[]) || [])[0] ?? null;
  const stationId = existingStation?.id ?? crypto.randomUUID();
  const pin = generateScorekeeperPin();
  let pinHash = '';

  try {
    pinHash = hashScorekeeperPin(stationId, pin);
  } catch (error) {
    if (isScorekeeperConfigError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    throw error;
  }

  const label = body.label?.trim() || null;

  if (existingStation) {
    const { data, error } = await serverClient.client.database
      .from('scorekeeper_stations')
      .update({
        label,
        active: true,
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingStation.id)
      .select('*')
      .single();

    if (error) {
      return authAwareErrorResponse(error.message);
    }

    return NextResponse.json({
      station: sanitizeStation(data as ScorekeeperStation),
      pin,
      rotated: true,
    });
  }

  const { data, error } = await serverClient.client.database
    .from('scorekeeper_stations')
    .insert({
      id: stationId,
      tournament_id: body.tournamentId,
      table_number: body.tableNumber,
      label,
      pin_hash: pinHash,
      active: true,
      created_by: adminSession.userId,
    })
    .select('*')
    .single();

  if (error) {
    return authAwareErrorResponse(error.message);
  }

  return NextResponse.json(
    {
      station: sanitizeStation(data as ScorekeeperStation),
      pin,
      rotated: false,
    },
    { status: 201 }
  );
}
