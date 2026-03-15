'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, Chip, CircularProgress, Paper } from '@mui/material';
import BracketViewer from '@/components/tournament/BracketViewer';
import RoundRobinTable from '@/components/tournament/RoundRobinTable';
import { TournamentStatusBadge } from '@/components/tournament/StatusBadge';
import { insforge } from '@/lib/insforge';
import type { Tournament, Participant, Round, Match } from '@/lib/tournament-engine/types';

const POLL_INTERVAL = 15_000;

function getPlayerName(playerId: string | null, participants: Participant[]) {
  if (!playerId) return 'TBD';
  return participants.find((participant) => participant.id === playerId)?.name ?? 'TBD';
}

function formatUpdatedAt(date: Date | null) {
  if (!date) return 'Waiting for first refresh';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function FullscreenBracketPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rounds, setRounds] = useState<(Round & { matches?: Match[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: t, error: tErr } = await insforge.database
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!t) {
        setError('Tournament not found');
        return;
      }

      const tournament = t as Tournament;
      setTournament(tournament);

      const [pRes, rRes, mRes] = await Promise.all([
        insforge.database
          .from('participants')
          .select('*')
          .eq('tournament_id', tournament.id)
          .order('seed', { ascending: true }),
        insforge.database
          .from('rounds')
          .select('*')
          .eq('tournament_id', tournament.id)
          .order('round_number', { ascending: true }),
        insforge.database
          .from('matches')
          .select('*')
          .eq('tournament_id', tournament.id)
          .order('match_number', { ascending: true }),
      ]);

      setParticipants((pRes.data as Participant[]) || []);
      const fetchedRounds = (rRes.data as Round[]) || [];
      const fetchedMatches = (mRes.data as Match[]) || [];

      setRounds(
        fetchedRounds.map((r) => ({
          ...r,
          matches: fetchedMatches.filter((m) => m.round_id === r.id),
        }))
      );
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch bracket data:', err);
      setError('Failed to load bracket');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#050505',
        }}
      >
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  // Error / not found
  if (error || !tournament) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#050505',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            color: '#a0a0a0',
            fontSize: '1.2rem',
          }}
        >
          {error || 'Tournament not found'}
        </Typography>
      </Box>
    );
  }

  const isRoundRobin = tournament.format === 'round_robin';
  const allMatches = rounds.flatMap((r) => r.matches || []);
  const activeMatches = allMatches
    .filter((match) => match.status === 'in_progress')
    .sort((a, b) => (a.table_number ?? Number.MAX_SAFE_INTEGER) - (b.table_number ?? Number.MAX_SAFE_INTEGER));
  const readyMatches = allMatches
    .filter((match) => match.status === 'ready')
    .sort((a, b) => a.match_number - b.match_number);
  const liveTableCount = new Set(activeMatches.map((match) => match.table_number).filter(Boolean)).size;
  const readyTableCount = readyMatches.filter((match) => match.table_number).length;
  const summaryCards = [
    { label: 'Players', value: participants.length, tone: '#f5f5f0' },
    { label: 'Race', value: `To ${tournament.race_to}`, tone: '#D4AF37' },
    { label: 'Live Tables', value: liveTableCount, tone: '#39a87a' },
    { label: 'On Deck', value: readyMatches.length, tone: '#42a5f5' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#050505',
        p: { xs: 2, md: 4 },
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: { xs: 3, md: 4 },
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontSize: { xs: '1.5rem', md: '2.2rem' },
            color: '#f5f5f0',
            textAlign: 'center',
          }}
        >
          {tournament.title}
        </Typography>
        <TournamentStatusBadge status={tournament.status} />
        <Chip
          label={tournament.game_type.replace('_', '-').toUpperCase()}
          size="small"
          sx={{
            bgcolor: 'rgba(57,168,122,0.1)',
            color: '#39a87a',
            fontWeight: 600,
            fontSize: { xs: '0.7rem', md: '0.8rem' },
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            sx={{
              p: 1.75,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212,175,55,0.08)',
              borderRadius: 2,
            }}
          >
            <Typography
              sx={{
                color: card.tone,
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.2rem' },
                mb: 0.35,
              }}
            >
              {card.value}
            </Typography>
            <Typography
              sx={{
                color: '#a0a0a0',
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {card.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {(activeMatches.length > 0 || readyMatches.length > 0) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' },
            gap: 2,
            mb: { xs: 3, md: 4 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(57,168,122,0.14)',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  color: '#39a87a',
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  fontSize: { xs: '1rem', md: '1.1rem' },
                }}
              >
                Live Tables
              </Typography>
              <Chip
                label={liveTableCount > 0 ? `${liveTableCount} table${liveTableCount === 1 ? '' : 's'} active` : 'Waiting for first match'}
                size="small"
                sx={{
                  bgcolor: 'rgba(57,168,122,0.1)',
                  color: '#39a87a',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Box>

            {activeMatches.length === 0 ? (
              <Typography sx={{ color: '#a0a0a0', fontFamily: '"Inter", sans-serif', fontSize: '0.9rem' }}>
                No matches are currently in progress.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                {activeMatches.slice(0, 6).map((match) => (
                  <Box
                    key={match.id}
                    sx={{
                      p: 1.5,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(57,168,122,0.12)',
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.78rem', mb: 0.75 }}>
                      {match.table_number ? `Table ${match.table_number}` : `Match ${match.match_number}`}
                    </Typography>
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 600, fontSize: '0.92rem' }}>
                      {getPlayerName(match.player1_id, participants)}
                    </Typography>
                    <Typography sx={{ color: '#a0a0a0', fontSize: '0.75rem', my: 0.35 }}>
                      vs
                    </Typography>
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 600, fontSize: '0.92rem' }}>
                      {getPlayerName(match.player2_id, participants)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(66,165,245,0.14)',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  color: '#42a5f5',
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  fontSize: { xs: '1rem', md: '1.1rem' },
                }}
              >
                On Deck
              </Typography>
              <Chip
                label={readyTableCount > 0 ? `${readyTableCount} table${readyTableCount === 1 ? '' : 's'} assigned` : 'Awaiting table calls'}
                size="small"
                sx={{
                  bgcolor: 'rgba(66,165,245,0.1)',
                  color: '#42a5f5',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Box>

            {readyMatches.length === 0 ? (
              <Typography sx={{ color: '#a0a0a0', fontFamily: '"Inter", sans-serif', fontSize: '0.9rem' }}>
                No matches are waiting to be called.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {readyMatches.slice(0, 5).map((match) => (
                  <Box
                    key={match.id}
                    sx={{
                      p: 1.25,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(66,165,245,0.12)',
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography sx={{ color: '#90caf9', fontSize: '0.72rem', fontWeight: 700, mb: 0.5 }}>
                      {match.table_number ? `Table ${match.table_number}` : `Match ${match.match_number}`}
                    </Typography>
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 600, fontSize: '0.86rem', lineHeight: 1.45 }}>
                      {getPlayerName(match.player1_id, participants)} vs {getPlayerName(match.player2_id, participants)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Bracket Content */}
      {rounds.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: '#a0a0a0',
              fontSize: { xs: '1rem', md: '1.2rem' },
            }}
          >
            Bracket has not been generated yet.
          </Typography>
        </Box>
      ) : isRoundRobin ? (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <RoundRobinTable matches={allMatches} participants={participants} />
        </Box>
      ) : (
        <>
          {/* Winners bracket */}
          <BracketViewer
            rounds={rounds.filter((r) => r.bracket_side === 'winners')}
            participants={participants}
            bracketSide="winners"
            displayMode
          />

          {/* Losers bracket (double elimination) */}
          {tournament.format === 'double_elimination' &&
            rounds.some((r) => r.bracket_side === 'losers') && (
              <Box sx={{ mt: 5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 600,
                    color: '#a0a0a0',
                    textAlign: 'center',
                    mb: 3,
                    fontSize: { xs: '1.1rem', md: '1.4rem' },
                  }}
                >
                  Losers Bracket
                </Typography>
                <BracketViewer
                  rounds={rounds.filter((r) => r.bracket_side === 'losers')}
                  participants={participants}
                  bracketSide="losers"
                  displayMode
                />
              </Box>
            )}

          {/* Grand Finals (double elimination) */}
          {tournament.format === 'double_elimination' &&
            rounds.some((r) => r.bracket_side === 'finals') && (
              <Box sx={{ mt: 5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 600,
                    color: '#D4AF37',
                    textAlign: 'center',
                    mb: 3,
                    fontSize: { xs: '1.1rem', md: '1.4rem' },
                  }}
                >
                  Grand Finals
                </Typography>
                <BracketViewer
                  rounds={rounds.filter((r) => r.bracket_side === 'finals')}
                  participants={participants}
                  bracketSide="finals"
                  displayMode
                />
              </Box>
            )}
        </>
      )}

      {/* Auto-refresh indicator */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          opacity: 0.4,
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#39a87a',
            animation: 'blink 3s ease-in-out infinite',
            '@keyframes blink': {
              '0%, 100%': { opacity: 0.3 },
              '50%': { opacity: 1 },
            },
          }}
        />
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.65rem',
            color: '#a0a0a0',
          }}
        >
          Live updating every 15s &middot; Updated {formatUpdatedAt(lastUpdated)}
        </Typography>
      </Box>
    </Box>
  );
}
