'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { RealtimeErrorPayload, SocketMessage } from '@insforge/sdk';
import { insforge } from './insforge';

export const TOURNAMENT_REALTIME_EVENTS = [
  'INSERT_match',
  'UPDATE_match',
  'DELETE_match',
  'INSERT_tournament',
  'UPDATE_tournament',
  'DELETE_tournament',
  'INSERT_participant',
  'UPDATE_participant',
  'DELETE_participant',
  'INSERT_announcement',
  'UPDATE_announcement',
  'DELETE_announcement',
] as const;

type TournamentRealtimeEvent = (typeof TOURNAMENT_REALTIME_EVENTS)[number];

interface UseTournamentRealtimeOptions {
  tournamentId?: string | null;
  enabled?: boolean;
  debounceMs?: number;
  events?: readonly TournamentRealtimeEvent[];
  onEvent: () => void | Promise<void>;
  onError?: (message: string) => void;
}

let realtimeConnectPromise: Promise<void> | null = null;
const channelSubscriberCounts = new Map<string, number>();

function resetRealtimeConnection() {
  realtimeConnectPromise = null;
  channelSubscriberCounts.clear();
}

async function ensureRealtimeConnection() {
  if (!realtimeConnectPromise) {
    realtimeConnectPromise = insforge.realtime.connect().catch((error) => {
      realtimeConnectPromise = null;
      throw error;
    });
  }

  return realtimeConnectPromise;
}

async function subscribeToTournamentChannel(channel: string) {
  const existingCount = channelSubscriberCounts.get(channel) ?? 0;
  channelSubscriberCounts.set(channel, existingCount + 1);

  if (existingCount > 0) {
    return;
  }

  await ensureRealtimeConnection();
  const response = await insforge.realtime.subscribe(channel);
  if (!response.ok) {
    channelSubscriberCounts.delete(channel);
    throw new Error(response.error?.message ?? `Failed to subscribe to ${channel}`);
  }
}

function unsubscribeFromTournamentChannel(channel: string) {
  const existingCount = channelSubscriberCounts.get(channel);
  if (!existingCount) {
    return;
  }

  if (existingCount === 1) {
    channelSubscriberCounts.delete(channel);
    insforge.realtime.unsubscribe(channel);
    return;
  }

  channelSubscriberCounts.set(channel, existingCount - 1);
}

export function useTournamentRealtime({
  tournamentId,
  enabled = true,
  debounceMs = 250,
  events = TOURNAMENT_REALTIME_EVENTS,
  onEvent,
  onError,
}: UseTournamentRealtimeOptions) {
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const channel = tournamentId ? `tournament:${tournamentId}` : null;
  const eventsKey = useMemo(() => events.join('|'), [events]);

  useEffect(() => {
    if (!enabled || !channel) {
      return;
    }

    let isActive = true;
    let timeoutId: number | null = null;
    let reconnectTimeoutId: number | null = null;

    const flushRefetch = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        if (!isActive) {
          return;
        }

        void Promise.resolve(onEventRef.current()).catch(() => {
          // Transient refresh failures are expected — data will sync on next event
        });
      }, debounceMs);
    };

    const handleMessage = (message: SocketMessage) => {
      if (message.meta?.channel && message.meta.channel !== channel) {
        return;
      }

      flushRefetch();
    };

    const attemptReconnect = () => {
      if (!isActive || reconnectTimeoutId) {
        return;
      }

      reconnectTimeoutId = window.setTimeout(() => {
        reconnectTimeoutId = null;
        if (!isActive) {
          return;
        }

        resetRealtimeConnection();
        void subscribeToTournamentChannel(channel).catch(() => {
          // Silent — will retry on next error cycle
        });
      }, 3000);
    };

    const handleRealtimeError = (payload: RealtimeErrorPayload) => {
      if (payload.channel && payload.channel !== channel) {
        return;
      }

      // Attempt automatic reconnection instead of surfacing transient errors
      attemptReconnect();
    };

    events.forEach((eventName) => insforge.realtime.on(eventName, handleMessage));
    insforge.realtime.on('error', handleRealtimeError);

    void subscribeToTournamentChannel(channel).catch((error) => {
      if (isActive) {
        onErrorRef.current?.(
          error instanceof Error ? error.message : `Failed to subscribe to ${channel}`
        );
      }
    });

    return () => {
      isActive = false;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      if (reconnectTimeoutId) {
        window.clearTimeout(reconnectTimeoutId);
      }

      events.forEach((eventName) => insforge.realtime.off(eventName, handleMessage));
      insforge.realtime.off('error', handleRealtimeError);
      unsubscribeFromTournamentChannel(channel);
    };
  }, [channel, debounceMs, enabled, events, eventsKey]);
}
