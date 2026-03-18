'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, Chip, Paper } from '@mui/material';
import {
  getTournamentBySlug,
  getMatchesWithPlayers,
  getRounds,
  getParticipants,
  getScorekeeperStations,
} from '@/lib/tournaments';
import { getActiveTableMatches, getOnDeckMatches } from '@/lib/table-assignment';
import { formatScheduledTime, getEstimatedWait } from '@/lib/scheduling';
import { useTournamentRealtime } from '@/lib/tournament-realtime';
import BracketViewer from '@/components/tournament/BracketViewer';
import type {
  TournamentWithDetails,
  MatchWithPlayers,
  Participant,
  Round,
  ScorekeeperStationSummary,
} from '@/lib/tournament-engine/types';

const GOLD = '#D4AF37';
const BG = '#0a0a0a';
const CARD_BG = '#141414';
const SURFACE = '#1a1a1a';
const POLL_INTERVAL = 30_000;

export default function OnDeckPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matchesWithPlayers, setMatchesWithPlayers] = useState<MatchWithPlayers[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stations, setStations] = useState<ScorekeeperStationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    try {
      const t = await getTournamentBySlug(slug);
      if (!t) return;
      setTournament(t);

      const [m, r, p, s] = await Promise.all([
        getMatchesWithPlayers(t.id),
        getRounds(t.id),
        getParticipants(t.id),
        getScorekeeperStations(t.id),
      ]);
      setMatchesWithPlayers(m);
      setRounds(r);
      setParticipants(p);
      setStations(s);
      setLastUpdated(new Date());
    } catch {
      // Silent - display will retry on next realtime event or poll
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fallback polling every 30s as safety net for WebSocket disconnects
  useEffect(() => {
    const interval = setInterval(() => { void fetchData(); }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time updates
  useTournamentRealtime({
    tournamentId: tournament?.id,
    enabled: !!tournament?.id,
    onEvent: fetchData,
  });

  const activeMatches = getActiveTableMatches<MatchWithPlayers>(matchesWithPlayers);
  const onDeckMatches = getOnDeckMatches<MatchWithPlayers>(matchesWithPlayers, rounds, 4);

  const completedCount = matchesWithPlayers.filter(
    (m) => m.status === 'completed' || m.status === 'bye'
  ).length;
  const totalNonBye = matchesWithPlayers.filter((m) => m.status !== 'bye').length;
  const roundMap = new Map(rounds.map((r) => [r.id, r]));

  // Merge matches onto rounds for BracketViewer
  const roundsWithMatches = useMemo(
    () => rounds.map((r) => ({ ...r, matches: matchesWithPlayers.filter((m) => m.round_id === r.id) })),
    [rounds, matchesWithPlayers]
  );

  const hasBracket = rounds.length > 0 && matchesWithPlayers.length > 0;

  // Format "last updated" relative text
  const lastUpdatedText = lastUpdated
    ? (() => {
        const diffSec = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 1000);
        if (diffSec < 10) return 'Updated just now';
        if (diffSec < 60) return `Updated ${diffSec}s ago`;
        return `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      })()
    : 'Connecting...';

  if (loading) {
    return (
      <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: GOLD, fontSize: '2rem' }}>Loading...</Typography>
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: '#f5f5f0', fontSize: '2rem' }}>Tournament not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', p: 3, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ color: GOLD, fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.1 }}>
            {tournament.title}
          </Typography>
          <Typography sx={{ color: '#888', fontSize: '1.1rem', mt: 0.5 }}>
            {tournament.venue_name}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: '#f5f5f0', fontSize: '2rem', fontWeight: 600 }}>
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </Typography>
          <Chip
            label={totalNonBye > 0 ? `${completedCount}/${totalNonBye} matches` : 'No matches'}
            sx={{ bgcolor: SURFACE, color: GOLD, fontWeight: 600, fontSize: '0.9rem' }}
          />
        </Box>
      </Box>

      {/* Now Playing */}
      <Typography sx={{ color: GOLD, fontSize: '1.4rem', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 2 }}>
        Now Playing
      </Typography>

      {activeMatches.length === 0 ? (
        <Paper sx={{ bgcolor: CARD_BG, p: 3, mb: 3, border: '1px solid #333' }}>
          <Typography sx={{ color: '#666', fontSize: '1.3rem', textAlign: 'center' }}>
            No active matches
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(activeMatches.length, stations.length || 4)}, 1fr)` }, gap: 2, mb: 3 }}>
          {activeMatches.map((match) => {
            const round = roundMap.get(match.round_id);
            return (
              <Paper
                key={match.id}
                sx={{
                  bgcolor: CARD_BG,
                  border: `2px solid ${GOLD}`,
                  p: 2.5,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Table badge */}
                {match.table_number && (
                  <Chip
                    label={`Table ${match.table_number}`}
                    size="small"
                    sx={{ bgcolor: GOLD, color: '#000', fontWeight: 700, position: 'absolute', top: 8, right: 8, fontSize: '0.85rem' }}
                  />
                )}

                {round && (
                  <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
                    {round.name || `Round ${round.round_number}`} &middot; Match #{match.match_number}
                  </Typography>
                )}

                {/* Player 1 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ color: '#f5f5f0', fontSize: '1.6rem', fontWeight: 600 }}>
                    {match.player1?.name || 'TBD'}
                  </Typography>
                  <Typography sx={{ color: GOLD, fontSize: '2rem', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
                    {match.player1_score ?? '-'}
                  </Typography>
                </Box>

                {/* VS divider */}
                <Box sx={{ borderTop: '1px solid #333', my: 0.5 }} />

                {/* Player 2 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography sx={{ color: '#f5f5f0', fontSize: '1.6rem', fontWeight: 600 }}>
                    {match.player2?.name || 'TBD'}
                  </Typography>
                  <Typography sx={{ color: GOLD, fontSize: '2rem', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
                    {match.player2_score ?? '-'}
                  </Typography>
                </Box>

                {/* Race info */}
                <Typography sx={{ color: '#555', fontSize: '0.8rem', mt: 1, textAlign: 'center' }}>
                  Race to {tournament.race_to}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* On Deck */}
      <Typography sx={{ color: '#f5f5f0', fontSize: '1.4rem', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 2 }}>
        On Deck
      </Typography>

      {onDeckMatches.length === 0 ? (
        <Paper sx={{ bgcolor: CARD_BG, p: 3, mb: 3, border: '1px solid #333' }}>
          <Typography sx={{ color: '#666', fontSize: '1.3rem', textAlign: 'center' }}>
            {completedCount === totalNonBye && totalNonBye > 0
              ? 'Tournament Complete!'
              : 'No matches waiting'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          {onDeckMatches.map((match, idx) => {
            const round = roundMap.get(match.round_id);
            const wait = getEstimatedWait(match.scheduled_at);
            const scheduledTime = formatScheduledTime(match.scheduled_at);

            return (
              <Paper
                key={match.id}
                sx={{
                  bgcolor: CARD_BG,
                  border: idx === 0 ? `1px solid ${GOLD}` : '1px solid #333',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {/* Position indicator */}
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  bgcolor: idx === 0 ? GOLD : SURFACE,
                  color: idx === 0 ? '#000' : '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1.3rem', flexShrink: 0,
                }}>
                  {idx + 1}
                </Box>

                {/* Match info */}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#f5f5f0', fontSize: '1.3rem', fontWeight: 600 }}>
                    {match.player1?.name || 'TBD'} vs {match.player2?.name || 'TBD'}
                  </Typography>
                  <Typography sx={{ color: '#888', fontSize: '0.9rem' }}>
                    {round?.name || `Round ${round?.round_number}`} &middot; Match #{match.match_number}
                  </Typography>
                </Box>

                {/* Timing info */}
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  {scheduledTime && (
                    <Typography sx={{ color: GOLD, fontSize: '1.1rem', fontWeight: 600 }}>
                      {scheduledTime}
                    </Typography>
                  )}
                  {wait && (
                    <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>
                      {wait}
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Bracket */}
      {hasBracket && (
        <>
          <Typography sx={{ color: GOLD, fontSize: '1.4rem', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 2 }}>
            Bracket
          </Typography>
          <Paper
            sx={{
              bgcolor: CARD_BG,
              border: '1px solid #333',
              p: 2,
              mb: 3,
              minHeight: '50vh',
              overflow: 'auto',
            }}
          >
            <BracketViewer
              rounds={roundsWithMatches}
              participants={participants}
              displayMode
            />
          </Paper>
        </>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: '#444', fontSize: '0.85rem' }}>
          On The Snap Tournament System
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#39a87a',
              animation: 'pulse-dot 2s ease-in-out infinite',
              '@keyframes pulse-dot': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.3 },
              },
            }}
          />
          <Typography sx={{ color: '#444', fontSize: '0.85rem' }}>
            {lastUpdatedText}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
