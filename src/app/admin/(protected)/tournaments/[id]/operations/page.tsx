'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import TableBarIcon from '@mui/icons-material/TableBar';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import SportsIcon from '@mui/icons-material/Sports';
import PendingIcon from '@mui/icons-material/Pending';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import type {
  TournamentWithDetails,
  Match,
  MatchWithPlayers,
  MatchUpdate,
} from '@/lib/tournament-engine/types';
import {
  getTournamentById,
  getMatchesWithPlayers,
  getMatches,
  updateMatch,
  applyMatchUpdates,
  updateTournament,
} from '@/lib/tournaments';
import { advanceWinner, canCorrectMatch, revertMatch } from '@/lib/tournament-engine/advancement';

// ============================================================
// Tab Navigation (shared pattern)
// ============================================================

const adminTabs = [
  { label: 'Details', path: '' },
  { label: 'Participants', path: '/participants' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'Operations', path: '/operations' },
];

function parseScoreInput(value?: string) {
  if (!value || value.trim() === '') {
    return 0;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function validateMatchScores(player1Score: number | null, player2Score: number | null, raceTo: number) {
  if (player1Score === null || player2Score === null || player1Score < 0 || player2Score < 0) {
    return 'Enter valid non-negative scores';
  }

  if (player1Score === player2Score) {
    return 'Scores cannot be tied — one player must win';
  }

  const winningScore = Math.max(player1Score, player2Score);
  if (winningScore > raceTo) {
    return `Winning score cannot be higher than race to ${raceTo}`;
  }

  if (winningScore !== raceTo) {
    return `The winner must reach exactly ${raceTo}`;
  }

  return null;
}

function getRaceToExamples(raceTo: number) {
  const closeScore = Math.max(raceTo - 1, 0);
  const midScore = raceTo > 2 ? raceTo - 2 : 0;
  return `${raceTo}-0, ${raceTo}-${midScore}, ${raceTo}-${closeScore}`;
}

// ============================================================
// Operations Page
// ============================================================

export default function OperationsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matchesWithPlayers, setMatchesWithPlayers] = useState<MatchWithPlayers[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [completingTournament, setCompletingTournament] = useState(false);

  // Table assignment state
  const [tableInputs, setTableInputs] = useState<Record<string, string>>({});

  // Score inputs
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});

  // Correction dialog
  const [correctDialogMatch, setCorrectDialogMatch] = useState<MatchWithPlayers | null>(null);
  const [correctScores, setCorrectScores] = useState<{ p1: string; p2: string }>({ p1: '', p2: '' });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      const [tournamentData, mwp, rawMatches] = await Promise.all([
        getTournamentById(tournamentId),
        getMatchesWithPlayers(tournamentId),
        getMatches(tournamentId),
      ]);

      if (!tournamentData) {
        setError('Tournament not found');
        return;
      }

      setTournament(tournamentData);
      setMatchesWithPlayers(mwp);
      setAllMatches(rawMatches);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh polling (10 seconds)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  // ----------------------------------------------------------
  // Round name lookup
  // ----------------------------------------------------------

  const roundNameMap = new Map<string, string>();
  if (tournament?.rounds) {
    for (const round of tournament.rounds) {
      roundNameMap.set(round.id, round.name ?? `Round ${round.round_number}`);
    }
  }

  // ----------------------------------------------------------
  // Categorize matches
  // ----------------------------------------------------------

  const readyMatches = matchesWithPlayers.filter((m) => m.status === 'ready');
  const activeMatches = matchesWithPlayers.filter((m) => m.status === 'in_progress');
  const completedMatches = matchesWithPlayers
    .filter((m) => m.status === 'completed')
    .sort((a, b) => {
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  // Quick stats
  const totalMatches = matchesWithPlayers.filter((m) => m.status !== 'bye').length;
  const completedCount = matchesWithPlayers.filter((m) => m.status === 'completed').length;
  const inProgressCount = activeMatches.length;
  const readyCount = readyMatches.length;
  const pendingCount = matchesWithPlayers.filter((m) => m.status === 'pending').length;
  const allPlayableMatchesCompleted = totalMatches > 0 && completedCount === totalMatches;

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  const handleAssignTable = async (matchId: string) => {
    const tableNum = parseInt(tableInputs[matchId] ?? '', 10);
    if (isNaN(tableNum) || tableNum < 1) {
      setSuccess(null);
      setError('Enter a valid table number');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setActionLoading(matchId);
      await updateMatch(matchId, { table_number: tableNum });
      setTableInputs((prev) => ({ ...prev, [matchId]: '' }));
      setSuccess(`Table ${tableNum} assigned`);
      await fetchData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign table');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartMatch = async (matchId: string) => {
    try {
      setError(null);
      setSuccess(null);
      setActionLoading(matchId);
      await updateMatch(matchId, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
      setSuccess('Match started');
      await fetchData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start match');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportResult = async (match: MatchWithPlayers) => {
    const scores = scoreInputs[match.id];
    const p1Score = parseScoreInput(scores?.p1);
    const p2Score = parseScoreInput(scores?.p2);

    const scoreError = validateMatchScores(p1Score, p2Score, tournament?.race_to ?? 0);
    if (scoreError) {
      setSuccess(null);
      setError(scoreError);
      return;
    }

    if (p1Score === null || p2Score === null) {
      setSuccess(null);
      setError('Enter valid non-negative scores');
      return;
    }

    const winnerId = p1Score > p2Score ? match.player1_id : match.player2_id;
    if (!winnerId) {
      setSuccess(null);
      setError('Cannot determine winner');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setActionLoading(match.id);

      // Get fresh match data for advancement
      const freshMatches = await getMatches(tournamentId);
      const freshMatch = freshMatches.find((m) => m.id === match.id);
      if (!freshMatch) throw new Error('Match not found');

      const updates: MatchUpdate[] = advanceWinner(
        freshMatch,
        winnerId,
        p1Score,
        p2Score,
        freshMatches
      );
      await applyMatchUpdates(updates);

      setScoreInputs((prev) => {
        const next = { ...prev };
        delete next[match.id];
        return next;
      });
      setSuccess(`Result reported — ${p1Score > p2Score ? match.player1?.name : match.player2?.name} wins`);
      await fetchData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to report result');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCorrectDialog = (match: MatchWithPlayers) => {
    const check = canCorrectMatch(
      allMatches.find((m) => m.id === match.id)!,
      allMatches
    );

    if (!check.safe) {
      setError(check.reason ?? 'Cannot correct this match');
      return;
    }

    setCorrectDialogMatch(match);
    setCorrectScores({ p1: '', p2: '' });
  };

  const handleCorrectResult = async () => {
    if (!correctDialogMatch) return;

    const p1Score = parseScoreInput(correctScores.p1);
    const p2Score = parseScoreInput(correctScores.p2);

    const scoreError = validateMatchScores(p1Score, p2Score, tournament?.race_to ?? 0);
    if (scoreError) {
      setSuccess(null);
      setError(scoreError);
      return;
    }

    if (p1Score === null || p2Score === null) {
      setSuccess(null);
      setError('Enter valid non-negative scores');
      return;
    }

    const winnerId = p1Score > p2Score ? correctDialogMatch.player1_id : correctDialogMatch.player2_id;
    if (!winnerId) {
      setSuccess(null);
      setError('Cannot determine winner');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setActionLoading(correctDialogMatch.id);

      // Get fresh data
      const freshMatches = await getMatches(tournamentId);
      const freshMatch = freshMatches.find((m) => m.id === correctDialogMatch.id);
      if (!freshMatch) throw new Error('Match not found');

      // First revert the old result
      const revertUpdates = revertMatch(freshMatch, freshMatches);
      await applyMatchUpdates(revertUpdates);

      // Get matches again after revert
      const postRevertMatches = await getMatches(tournamentId);
      const postRevertMatch = postRevertMatches.find((m) => m.id === correctDialogMatch.id);
      if (!postRevertMatch) throw new Error('Match not found after revert');

      // Apply new result
      const advanceUpdates = advanceWinner(
        postRevertMatch,
        winnerId,
        p1Score,
        p2Score,
        postRevertMatches
      );
      await applyMatchUpdates(advanceUpdates);

      setCorrectDialogMatch(null);
      setSuccess('Result corrected successfully');
      await fetchData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to correct result');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkTournamentCompleted = async () => {
    if (!tournament) return;

    try {
      setError(null);
      setSuccess(null);
      setCompletingTournament(true);
      await updateTournament(tournament.id, { status: 'completed' });
      setTournament((previous) => (previous ? { ...previous, status: 'completed' } : previous));
      setSuccess('Tournament marked as completed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete tournament');
    } finally {
      setCompletingTournament(false);
    }
  };

  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          Tournament not found
        </Alert>
      </Box>
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}
      >
        Admin / Tournaments / {tournament.title}
      </Typography>

      {/* Header */}
      <Box sx={{ mb: 3, mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'var(--font-playfair), serif',
                fontWeight: 700,
                color: '#f5f5f0',
                mb: 0.5,
              }}
            >
              {tournament.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Live Operations Board &middot; Race to {tournament.race_to}
            </Typography>
          </Box>

          <Button
            component="a"
            href={`/tournaments/${tournament.slug}/bracket`}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
            startIcon={<OpenInFullIcon />}
            sx={{
              borderColor: 'rgba(212,175,55,0.22)',
              color: '#D4AF37',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212,175,55,0.05)',
              },
            }}
          >
            Open Wallboard
          </Button>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Tabs
        value={3}
        onChange={(_, val) => {
          const base = `/admin/tournaments/${tournamentId}`;
          router.push(base + adminTabs[val].path);
        }}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          '& .MuiTab-root': {
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 44,
          },
          '& .Mui-selected': { color: '#D4AF37' },
          '& .MuiTabs-indicator': { backgroundColor: '#D4AF37' },
        }}
      >
        {adminTabs.map((tab) => (
          <Tab key={tab.label} label={tab.label} />
        ))}
      </Tabs>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a' }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {allPlayableMatchesCompleted && tournament.status !== 'completed' && tournament.status !== 'cancelled' && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            bgcolor: 'rgba(102,187,106,0.1)',
            color: '#66bb6a',
            alignItems: 'center',
          }}
          action={
            <Button
              onClick={handleMarkTournamentCompleted}
              disabled={completingTournament}
              sx={{
                color: '#66bb6a',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {completingTournament ? 'Closing Out...' : 'Mark Completed'}
            </Button>
          }
        >
          All bracket matches are complete. Close out the tournament so the final results become the main public state.
        </Alert>
      )}

      {/* Quick Stats Bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Total', value: totalMatches, color: '#f5f5f0' },
          { label: 'Completed', value: completedCount, color: '#66bb6a' },
          { label: 'In Progress', value: inProgressCount, color: '#42a5f5' },
          { label: 'Ready', value: readyCount, color: '#D4AF37' },
          { label: 'Pending', value: pendingCount, color: '#757575' },
        ].map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{
              px: 2,
              py: 1,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212,175,55,0.08)',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 'fit-content',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color, fontSize: '1.1rem', fontFamily: 'var(--font-playfair), serif' }}>
              {stat.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {stat.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* No bracket message */}
      {!tournament.bracket_generated_at && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.1)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <ScoreboardIcon sx={{ fontSize: 56, color: 'rgba(212,175,55,0.2)', mb: 2 }} />
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#f5f5f0', mb: 1 }}>
            Generate a Bracket First
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Go to the Bracket tab to generate the bracket before running operations.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push(`/admin/tournaments/${tournamentId}/bracket`)}
            sx={{
              borderColor: 'rgba(212,175,55,0.3)',
              color: '#D4AF37',
              textTransform: 'none',
              '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
            }}
          >
            Go to Bracket
          </Button>
        </Paper>
      )}

      {/* Three Columns */}
      {tournament.bracket_generated_at && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          {/* Ready Matches */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PendingIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#D4AF37', fontSize: '0.9rem' }}>
                Ready ({readyCount})
              </Typography>
            </Box>

            {readyMatches.length === 0 && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  No matches ready
                </Typography>
              </Paper>
            )}

            {readyMatches.map((match) => (
              <Paper
                key={match.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  bgcolor: '#0a0a0a',
                  border: '1px solid rgba(212,175,55,0.12)',
                  borderRadius: 1.5,
                }}
              >
                {/* Match header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                    Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                  </Typography>
                  <Chip
                    label="Ready"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                  />
                </Box>

                {/* Players */}
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                  {match.player1?.name ?? 'TBD'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>vs</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem', mb: 1.5 }}>
                  {match.player2?.name ?? 'TBD'}
                </Typography>

                {/* Table assignment */}
                {match.table_number ? (
                  <Typography variant="caption" sx={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TableBarIcon sx={{ fontSize: 14 }} /> Table {match.table_number}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Table #"
                      value={tableInputs[match.id] ?? ''}
                      onChange={(e) => setTableInputs((prev) => ({ ...prev, [match.id]: e.target.value }))}
                      slotProps={{ htmlInput: { min: 1, style: { padding: '6px 8px', fontSize: '0.8rem' } } }}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#050505',
                          '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                          '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                        },
                        '& input': { color: '#f5f5f0' },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleAssignTable(match.id)}
                      disabled={actionLoading === match.id}
                      sx={{ color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 1, px: 1 }}
                    >
                      <TableBarIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}

                {/* Start button */}
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#050505' }} /> : <PlayArrowIcon />}
                  disabled={actionLoading === match.id}
                  onClick={() => handleStartMatch(match.id)}
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#050505',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    py: 0.75,
                    '&:hover': { bgcolor: '#c5a030' },
                  }}
                >
                  Start Match
                </Button>
              </Paper>
            ))}
          </Box>

          {/* Active Matches */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SportsIcon sx={{ color: '#42a5f5', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#42a5f5', fontSize: '0.9rem' }}>
                In Progress ({inProgressCount})
              </Typography>
            </Box>

            {activeMatches.length === 0 && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  No active matches
                </Typography>
              </Paper>
            )}

            {activeMatches.map((match) => (
              <Paper
                key={match.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  bgcolor: '#0a0a0a',
                  border: '1px solid rgba(66,165,245,0.2)',
                  borderRadius: 1.5,
                }}
              >
                {/* Match header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                    Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                  </Typography>
                  <Chip
                    label="Live"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(66,165,245,0.15)', color: '#42a5f5' }}
                  />
                </Box>

                {/* Table */}
                {match.table_number && (
                  <Typography variant="caption" sx={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TableBarIcon sx={{ fontSize: 14 }} /> Table {match.table_number}
                  </Typography>
                )}

                {/* Player 1 score row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                    {match.player1?.name ?? 'TBD'}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="0"
                    value={scoreInputs[match.id]?.p1 ?? ''}
                    onChange={(e) =>
                      setScoreInputs((prev) => ({
                        ...prev,
                        [match.id]: { p1: e.target.value, p2: prev[match.id]?.p2 ?? '' },
                      }))
                    }
                    slotProps={{ htmlInput: { min: 0, max: tournament.race_to, style: { padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center', width: 40 } } }}
                    sx={{
                      width: 56,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#050505',
                        '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                      },
                      '& input': { color: '#f5f5f0' },
                    }}
                  />
                </Box>

                {/* Player 2 score row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                    {match.player2?.name ?? 'TBD'}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="0"
                    value={scoreInputs[match.id]?.p2 ?? ''}
                    onChange={(e) =>
                      setScoreInputs((prev) => ({
                        ...prev,
                        [match.id]: { p1: prev[match.id]?.p1 ?? '', p2: e.target.value },
                      }))
                    }
                    slotProps={{ htmlInput: { min: 0, max: tournament.race_to, style: { padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center', width: 40 } } }}
                    sx={{
                      width: 56,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#050505',
                        '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                      },
                      '& input': { color: '#f5f5f0' },
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mb: 1.5 }}
                >
                  Race to {tournament.race_to}. Leave a blank score as 0. Example scores: {getRaceToExamples(tournament.race_to)}.
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <ScoreboardIcon />}
                  disabled={actionLoading === match.id}
                  onClick={() => handleReportResult(match)}
                  sx={{
                    bgcolor: '#42a5f5',
                    color: '#fff',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    py: 0.75,
                    '&:hover': { bgcolor: '#1e88e5' },
                  }}
                >
                  Report Result
                </Button>
              </Paper>
            ))}
          </Box>

          {/* Completed Matches */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckIcon sx={{ color: '#66bb6a', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#66bb6a', fontSize: '0.9rem' }}>
                Completed ({completedCount})
              </Typography>
            </Box>

            {completedMatches.length === 0 && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  No completed matches yet
                </Typography>
              </Paper>
            )}

            {completedMatches.map((match) => (
              <Paper
                key={match.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  bgcolor: '#0a0a0a',
                  border: '1px solid rgba(102,187,106,0.12)',
                  borderRadius: 1.5,
                }}
              >
                {/* Match header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                    Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                  </Typography>
                  <Chip
                    label="Done"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(102,187,106,0.15)', color: '#66bb6a' }}
                  />
                </Box>

                {/* Player 1 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: match.winner_id === match.player1_id ? 700 : 400,
                      color: match.winner_id === match.player1_id ? '#D4AF37' : '#f5f5f0',
                      fontSize: '0.85rem',
                    }}
                  >
                    {match.player1?.name ?? 'TBD'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: match.winner_id === match.player1_id ? '#D4AF37' : 'text.secondary',
                      fontSize: '0.9rem',
                    }}
                  >
                    {match.player1_score ?? 0}
                  </Typography>
                </Box>

                {/* Player 2 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: match.winner_id === match.player2_id ? 700 : 400,
                      color: match.winner_id === match.player2_id ? '#D4AF37' : '#f5f5f0',
                      fontSize: '0.85rem',
                    }}
                  >
                    {match.player2?.name ?? 'TBD'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: match.winner_id === match.player2_id ? '#D4AF37' : 'text.secondary',
                      fontSize: '0.9rem',
                    }}
                  >
                    {match.player2_score ?? 0}
                  </Typography>
                </Box>

                {/* Table */}
                {match.table_number && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontSize: '0.7rem' }}>
                    <TableBarIcon sx={{ fontSize: 12 }} /> Table {match.table_number}
                  </Typography>
                )}

                {/* Correct button */}
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleOpenCorrectDialog(match)}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'text.secondary',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    py: 0.5,
                    '&:hover': { borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' },
                  }}
                >
                  Correct Result
                </Button>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Correction Dialog */}
      <Dialog
        open={!!correctDialogMatch}
        onClose={() => setCorrectDialogMatch(null)}
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 2,
            maxWidth: 400,
            width: '100%',
          },
        }}
      >
        {correctDialogMatch && (
          <>
            <DialogTitle sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1rem' }}>
              Correct Match #{correctDialogMatch.match_number}
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
                Enter the corrected scores. This will revert the current result and apply the new one.
              </DialogContentText>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                  {correctDialogMatch.player1?.name ?? 'Player 1'}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="0"
                  value={correctScores.p1}
                  onChange={(e) => setCorrectScores((prev) => ({ ...prev, p1: e.target.value }))}
                  slotProps={{ htmlInput: { min: 0, max: tournament.race_to, style: { padding: '8px', fontSize: '0.9rem', textAlign: 'center', width: 48 } } }}
                  sx={{
                    width: 64,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#050505',
                      '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                      '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                    },
                    '& input': { color: '#f5f5f0' },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                  {correctDialogMatch.player2?.name ?? 'Player 2'}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="0"
                  value={correctScores.p2}
                  onChange={(e) => setCorrectScores((prev) => ({ ...prev, p2: e.target.value }))}
                  slotProps={{ htmlInput: { min: 0, max: tournament.race_to, style: { padding: '8px', fontSize: '0.9rem', textAlign: 'center', width: 48 } } }}
                  sx={{
                    width: 64,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#050505',
                      '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                      '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                    },
                    '& input': { color: '#f5f5f0' },
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mt: 1.5 }}
              >
                Winner must reach exactly {tournament.race_to}. Blank fields count as 0.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button
                onClick={() => setCorrectDialogMatch(null)}
                sx={{ color: 'text.secondary', textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={actionLoading === correctDialogMatch.id ? <CircularProgress size={14} sx={{ color: '#050505' }} /> : <CheckIcon />}
                disabled={actionLoading === correctDialogMatch.id}
                onClick={handleCorrectResult}
                sx={{
                  bgcolor: '#D4AF37',
                  color: '#050505',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#c5a030' },
                }}
              >
                Apply Correction
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
