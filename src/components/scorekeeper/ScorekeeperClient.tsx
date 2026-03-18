'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import type { MatchWithPlayers, TournamentWithDetails } from '@/lib/tournament-engine/types';
import { useTournamentRealtime } from '@/lib/tournament-realtime';

interface ScorekeeperClientProps {
  stationId: string;
  tournament: TournamentWithDetails | null;
  initialMatches: MatchWithPlayers[];
  authorized: boolean;
  tableNumber: number | null;
  stationLabel: string | null;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return 'No score entered yet';
  }

  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatStationMatchLabel(match: MatchWithPlayers) {
  return `Match #${match.match_number} · ${match.player1?.name ?? 'TBD'} vs ${match.player2?.name ?? 'TBD'}`;
}

export default function ScorekeeperClient({
  stationId,
  tournament,
  initialMatches,
  authorized,
  tableNumber,
  stationLabel,
}: ScorekeeperClientProps) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [matches, setMatches] = useState(initialMatches);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, { p1: string; p2: string }>>({});

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  const refreshMatches = async () => {
    if (!tournament || !tableNumber) {
      return;
    }

    const response = await fetch(`/api/scorekeeper/stations/${stationId}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Unable to refresh station matches');
    }

    const payload = (await response.json()) as {
      matches?: MatchWithPlayers[];
    };
    setMatches(payload.matches ?? []);
  };

  useTournamentRealtime({
    tournamentId: tournament?.id,
    enabled: Boolean(tournament?.id && authorized),
    onEvent: () => {
      void refreshMatches().catch(() => {
        setActionError('Unable to refresh live scores for this station');
      });
    },
  });

  const inProgressMatches = matches.filter((match) => match.status === 'in_progress');
  const readyMatches = matches.filter((match) => match.status === 'ready');
  const pendingMatches = [...matches]
    .filter((match) => match.status === 'pending')
    .sort((left, right) => left.match_number - right.match_number);
  const currentMatch = inProgressMatches[0] ?? readyMatches[0] ?? null;
  const readyQueue = readyMatches.filter(
    (match) => match.status === 'ready' && match.id !== currentMatch?.id
  );
  const recentCompleted = [...matches]
    .filter((match) => match.status === 'completed')
    .sort((left, right) => {
      const leftTime = new Date(left.completed_at ?? left.updated_at).getTime();
      const rightTime = new Date(right.completed_at ?? right.updated_at).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 3);

  useEffect(() => {
    if (!currentMatch) {
      return;
    }

    setScores((prev) => ({
      ...prev,
      [currentMatch.id]: {
        p1:
          prev[currentMatch.id]?.p1 ??
          (currentMatch.player1_score !== null ? String(currentMatch.player1_score) : ''),
        p2:
          prev[currentMatch.id]?.p2 ??
          (currentMatch.player2_score !== null ? String(currentMatch.player2_score) : ''),
      },
    }));
  }, [currentMatch]);

  const handleAuthorize = async () => {
    try {
      setSubmitting(true);
      setAuthError(null);

      const response = await fetch('/api/scorekeeper/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, pin }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to unlock station');
      }

      router.refresh();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to unlock station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/scorekeeper/session/logout', { method: 'POST' });
    router.refresh();
  };

  const runMatchAction = async (
    matchId: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    try {
      setSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const response = await fetch(`/api/scorekeeper/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Match update failed');
      }

      setActionSuccess(successMessage);

      // Clear stale scores for finalized match so next match initializes fresh
      if (body.action === 'finalize') {
        setScores((prev) => {
          const next = { ...prev };
          delete next[matchId];
          return next;
        });
      }

      // Refresh is best-effort — action already succeeded
      await refreshMatches().catch(() => {});
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Match update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentScores = currentMatch ? scores[currentMatch.id] ?? { p1: '', p2: '' } : null;

  if (!authorized || !tournament || !tableNumber) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#070707', px: 2, py: 6 }}>
        <Box sx={{ maxWidth: 420, mx: 'auto', pt: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.14)',
              borderRadius: 2,
            }}
          >
            <Typography
              sx={{
                color: '#D4AF37',
                fontSize: '0.72rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Scorekeeper Mode
            </Typography>
            <Typography
              sx={{
                color: '#f5f5f0',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: '1.8rem',
                mb: 1,
              }}
            >
              Unlock Table Station
            </Typography>
            <Typography sx={{ color: '#a0a0a0', mb: 2.5, lineHeight: 1.7 }}>
              Enter the table PIN provided by staff. This station can only score matches assigned to
              its table.
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
                {authError}
              </Alert>
            )}

            <TextField
              label="6-digit PIN"
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#f5f5f0',
                  '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleAuthorize}
              disabled={submitting || pin.trim().length !== 6}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': { bgcolor: '#e0bb53' },
              }}
            >
              {submitting ? 'Unlocking…' : 'Unlock Station'}
            </Button>

            <Button
              component={Link}
              href="/tournaments"
              fullWidth
              sx={{ mt: 1.5, color: '#D4AF37', textTransform: 'none', fontWeight: 700 }}
            >
              Back to public tournaments
            </Button>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707', px: 2, py: 3 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ color: '#D4AF37', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', mb: 0.75 }}>
            Scorekeeper Station
          </Typography>
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1.35rem', mb: 0.35 }}>
            {stationLabel || `Table ${tableNumber}`}
          </Typography>
          <Typography sx={{ color: '#a0a0a0', fontSize: '0.95rem' }}>
            {tournament.title} · Race to {tournament.race_to}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button
              onClick={handleLogout}
              variant="outlined"
              sx={{
                borderColor: 'rgba(212,175,55,0.24)',
                color: '#D4AF37',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
              }}
            >
              Logout
            </Button>
          </Box>
        </Paper>

        {actionError && (
          <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
            {actionError}
          </Alert>
        )}
        {actionSuccess && (
          <Alert severity="success" sx={{ bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a' }}>
            {actionSuccess}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
            {currentMatch?.status === 'in_progress' ? 'Current Match' : 'Next Match'}
          </Typography>

          {!currentMatch ? (
            pendingMatches.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                  Matches are assigned to this table, but none are ready yet.
                </Typography>
                <Typography sx={{ color: '#a0a0a0' }}>
                  Scorekeeper controls appear once the bracket advances one of these matches to
                  Ready or In Progress.
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ color: '#a0a0a0' }}>
                No matches are assigned to this table right now.
              </Typography>
            )
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                {currentMatch.player1?.name ?? 'TBD'} vs {currentMatch.player2?.name ?? 'TBD'}
              </Typography>
              <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem' }}>
                Match #{currentMatch.match_number} · Last change {formatUpdatedAt(currentMatch.updated_at)}
              </Typography>
              <Typography sx={{ color: '#a0a0a0', fontSize: '0.8rem' }}>
                {currentMatch.status === 'in_progress'
                  ? 'Enter the final score and press Finalize Result when the match is over.'
                  : 'This match is ready. Start it here when players are breaking.'}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                <TextField
                  label={currentMatch.player1?.name ?? 'Player 1'}
                  value={currentScores?.p1 ?? ''}
                  onChange={(event) =>
                    setScores((prev) => ({
                      ...prev,
                      [currentMatch.id]: {
                        p1: event.target.value,
                        p2: prev[currentMatch.id]?.p2 ?? '',
                      },
                    }))
                  }
                  inputProps={{ inputMode: 'numeric' }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#f5f5f0',
                      '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                      '&:hover fieldset': { borderColor: '#D4AF37' },
                      '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                    },
                    '& .MuiInputLabel-root': { color: '#a0a0a0' },
                  }}
                />
                <TextField
                  label={currentMatch.player2?.name ?? 'Player 2'}
                  value={currentScores?.p2 ?? ''}
                  onChange={(event) =>
                    setScores((prev) => ({
                      ...prev,
                      [currentMatch.id]: {
                        p1: prev[currentMatch.id]?.p1 ?? '',
                        p2: event.target.value,
                      },
                    }))
                  }
                  inputProps={{ inputMode: 'numeric' }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#f5f5f0',
                      '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                      '&:hover fieldset': { borderColor: '#D4AF37' },
                      '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                    },
                    '& .MuiInputLabel-root': { color: '#a0a0a0' },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {currentMatch.status === 'ready' && (
                  <Button
                    variant="contained"
                    disabled={submitting}
                    onClick={() =>
                      void runMatchAction(currentMatch.id, { action: 'start' }, 'Match started')
                    }
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#050505',
                      fontWeight: 800,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#e0bb53' },
                    }}
                  >
                    Start Match
                  </Button>
                )}

                <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={() =>
                    void runMatchAction(
                      currentMatch.id,
                      {
                        action: 'finalize',
                        player1Score: Number(currentScores?.p1 ?? 0),
                        player2Score: Number(currentScores?.p2 ?? 0),
                      },
                      'Result finalized'
                    )
                  }
                  sx={{
                    bgcolor: '#39a87a',
                    color: '#050505',
                    fontWeight: 800,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#53bc8f' },
                  }}
                >
                  Finalize Result
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {pendingMatches.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
              Assigned but Not Ready
            </Typography>
            <Typography sx={{ color: '#a0a0a0', mb: 1.5 }}>
              These matches are already on this table. The scorer controls unlock when the bracket
              moves them to Ready.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {pendingMatches.map((match) => (
                <Typography key={match.id} sx={{ color: '#d7d7d2' }}>
                  {formatStationMatchLabel(match)}
                </Typography>
              ))}
            </Box>
          </Paper>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
            Ready Queue
          </Typography>

          {readyQueue.length === 0 ? (
            <Typography sx={{ color: '#a0a0a0' }}>No additional matches are queued for this table.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {readyQueue.map((match, idx) => (
                <Box key={match.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {idx === 0 && (
                    <Box sx={{
                      bgcolor: '#D4AF37', color: '#000', px: 1, py: 0.25,
                      borderRadius: 1, fontSize: '0.65rem', fontWeight: 800,
                      letterSpacing: 1, whiteSpace: 'nowrap',
                    }}>
                      ON DECK
                    </Box>
                  )}
                  <Typography sx={{ color: '#d7d7d2', flex: 1 }}>
                    Match #{match.match_number} · {match.player1?.name ?? 'TBD'} vs{' '}
                    {match.player2?.name ?? 'TBD'}
                  </Typography>
                  {match.scheduled_at && (
                    <Typography sx={{ color: '#D4AF37', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(match.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
            Recently Completed
          </Typography>

          {recentCompleted.length === 0 ? (
            <Typography sx={{ color: '#a0a0a0' }}>No completed matches on this table yet.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentCompleted.map((match) => (
                <Typography key={match.id} sx={{ color: '#d7d7d2' }}>
                  Match #{match.match_number} · {match.player1?.name ?? 'TBD'} {match.player1_score ?? 0} -{' '}
                  {match.player2_score ?? 0} {match.player2?.name ?? 'TBD'}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
