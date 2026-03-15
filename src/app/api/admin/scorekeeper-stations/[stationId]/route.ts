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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const serverClient = await getAuthenticatedServerInsforgeClient();
  if (!serverClient) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { stationId } = await params;
  const body = (await request.json()) as
    | { action?: 'rotate' }
    | { action?: 'set-active'; active?: boolean }
    | { action?: 'set-label'; label?: string | null };

  const { data: stationData, error: stationError } = await serverClient.client.database
    .from('scorekeeper_stations')
    .select('*')
    .eq('id', stationId)
    .maybeSingle();

  if (stationError) {
    return authAwareErrorResponse(stationError.message);
  }

  const station = (stationData as ScorekeeperStation | null) ?? null;
  if (!station) {
    return NextResponse.json({ error: 'Station not found' }, { status: 404 });
  }

  if (body.action === 'rotate') {
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

    const { data, error } = await serverClient.client.database
      .from('scorekeeper_stations')
      .update({
        pin_hash: pinHash,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .select('*')
      .single();

    if (error) {
      return authAwareErrorResponse(error.message);
    }

    return NextResponse.json({
      station: sanitizeStation(data as ScorekeeperStation),
      pin,
    });
  }

  if (body.action === 'set-active') {
    const { data, error } = await serverClient.client.database
      .from('scorekeeper_stations')
      .update({
        active: Boolean(body.active),
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .select('*')
      .single();

    if (error) {
      return authAwareErrorResponse(error.message);
    }

    return NextResponse.json({
      station: sanitizeStation(data as ScorekeeperStation),
    });
  }

  if (body.action === 'set-label') {
    const { data, error } = await serverClient.client.database
      .from('scorekeeper_stations')
      .update({
        label: body.label?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .select('*')
      .single();

    if (error) {
      return authAwareErrorResponse(error.message);
    }

    return NextResponse.json({
      station: sanitizeStation(data as ScorekeeperStation),
    });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
