'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
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
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import type {
  TournamentWithDetails,
  Match,
  MatchWithPlayers,
  Announcement,
  ScorekeeperStationSummary,
} from '@/lib/tournament-engine/types';
import {
  getTournamentById,
  getMatchesWithPlayers,
  getMatches,
  updateMatch,
  updateTournament,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementPin,
} from '@/lib/tournaments';
import { insforge } from '@/lib/insforge';
import { canCorrectMatch } from '@/lib/tournament-engine/advancement';
import { useTournamentRealtime } from '@/lib/tournament-realtime';
import { formatMatchDuration } from '@/lib/match-formatting';
import {
  correctMatchResult,
  finalizeMatchResult,
  getRaceToExamples,
  parseScoreInput,
  startMatch,
  validateMatchScores,
} from '@/lib/match-operations';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

// ============================================================
// Tab Navigation (shared pattern)
// ============================================================

const adminTabs = [
  { label: 'Details', path: '' },
  { label: 'Participants', path: '/participants' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'Operations', path: '/operations' },
];

const STATION_AUTH_ERROR_PATTERN = /jwt expired|invalid jwt|authentication required/i;

async function refreshAdminInsforgeSession() {
  const { data, error } = await insforge.auth.getCurrentSession();

  if (error || !data.session?.accessToken) {
    throw new Error(
      'Admin session expired. Sign out and sign back in to manage scorekeeper stations.'
    );
  }
}

async function runStationJsonRequest<T extends { error?: string }>(
  input: string,
  init?: RequestInit
) {
  const execute = async () => {
    const response = await fetch(input, {
      cache: 'no-store',
      ...init,
    });

    const payload = (await response.json()) as T;
    if (!response.ok) {
      throw new Error(payload.error || 'Scorekeeper station request failed');
    }

    return payload;
  };

  try {
    return await execute();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Scorekeeper station request failed';

    if (!STATION_AUTH_ERROR_PATTERN.test(message)) {
      throw error;
    }

    await refreshAdminInsforgeSession();
    return execute();
  }
}

const assignmentStatusOrder: Record<Match['status'], number> = {
  in_progress: 0,
  ready: 1,
  pending: 2,
  completed: 3,
  bye: 4,
};

function getAssignmentStatusChipStyles(status: Match['status']) {
  switch (status) {
    case 'in_progress':
      return {
        label: 'Live',
        sx: {
          bgcolor: 'rgba(66,165,245,0.15)',
          color: '#42a5f5',
        },
      };
    case 'ready':
      return {
        label: 'Ready',
        sx: {
          bgcolor: 'rgba(212,175,55,0.15)',
          color: '#D4AF37',
        },
      };
    case 'pending':
      return {
        label: 'Pending',
        sx: {
          bgcolor: 'rgba(255,255,255,0.08)',
          color: '#c9c9c3',
        },
      };
    case 'completed':
      return {
        label: 'Done',
        sx: {
          bgcolor: 'rgba(102,187,106,0.15)',
          color: '#66bb6a',
        },
      };
    default:
      return {
        label: status,
        sx: {
          bgcolor: 'rgba(255,255,255,0.08)',
          color: '#c9c9c3',
        },
      };
  }
}

function formatAssignmentPlayers(match: MatchWithPlayers) {
  return `${match.player1?.name ?? 'TBD'} vs ${match.player2?.name ?? 'TBD'}`;
}

function parseTableInputValue(value?: string) {
  if (!value) {
    return null;
  }

  const tableNumber = parseInt(value, 10);
  if (Number.isNaN(tableNumber) || tableNumber < 1) {
    return null;
  }

  return tableNumber;
}

// ============================================================
// Operations Page
// ============================================================

export default function OperationsPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tournamentId = resolveTournamentAdminRouteId(params.id, pathname);

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matchesWithPlayers, setMatchesWithPlayers] = useState<MatchWithPlayers[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [completingTournament, setCompletingTournament] = useState(false);

  // Table assignment state
  const [tableInputs, setTableInputs] = useState<Record<string, string>>({});

  // Score inputs
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});

  // Correction dialog
  const [correctDialogMatch, setCorrectDialogMatch] = useState<MatchWithPlayers | null>(null);
  const [correctScores, setCorrectScores] = useState<{ p1: string; p2: string }>({ p1: '', p2: '' });

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [stations, setStations] = useState<ScorekeeperStationSummary[]>([]);
  const [stationTableInput, setStationTableInput] = useState('');
  const [stationLabelInput, setStationLabelInput] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, string>>({});

  // ----------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------

  const fetchCoreData = useCallback(async (showLoader = true) => {
    if (!tournamentId) {
      setError('Invalid tournament route');
      setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError(null);

      const tournamentData = await getTournamentById(tournamentId);
      if (!tournamentData) {
        setError('Tournament not found');
        return;
      }
      setTournament(tournamentData);

      const [mwp, rawMatches, ann] = await Promise.allSettled([
        getMatchesWithPlayers(tournamentId),
        getMatches(tournamentId),
        getAnnouncements(tournamentId),
      ]);

      if (mwp.status === 'fulfilled') setMatchesWithPlayers(mwp.value);
      if (rawMatches.status === 'fulfilled') setAllMatches(rawMatches.value);
      if (ann.status === 'fulfilled') setAnnouncements(ann.value);

      const failures = [mwp, rawMatches, ann].filter(
        (r) => r.status === 'rejected'
      );
      if (failures.length > 0) {
        const firstReason = (failures[0] as PromiseRejectedResult).reason;
        setError(firstReason instanceof Error ? firstReason.message : 'Some data failed to load');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchCoreData();
  }, [fetchCoreData]);

  const fetchStationData = useCallback(async () => {
    if (!tournamentId) {
      setStationError('Invalid tournament route');
      setStations([]);
      return;
    }

    try {
      const payload = await runStationJsonRequest<{
        error?: string;
        stations?: ScorekeeperStationSummary[];
      }>(`/api/admin/scorekeeper-stations?tournamentId=${tournamentId}`);

      setStations(payload.stations ?? []);
      setStationError(null);
    } catch (err) {
      setStations([]);
      setStationError(
        err instanceof Error
          ? err.message
          : 'Unable to load scorekeeper stations'
      );
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchStationData();
  }, [fetchStationData]);

  useTournamentRealtime({
    tournamentId,
    onEvent: () => fetchCoreData(false),
  });

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
  const assignedTableMatches = [...matchesWithPlayers]
    .filter(
      (m) =>
        m.table_number !== null &&
        m.status !== 'bye'
    )
    .sort((left, right) => {
      const leftTable = left.table_number ?? Number.MAX_SAFE_INTEGER;
      const rightTable = right.table_number ?? Number.MAX_SAFE_INTEGER;

      if (leftTable !== rightTable) {
        return leftTable - rightTable;
      }

      if (assignmentStatusOrder[left.status] !== assignmentStatusOrder[right.status]) {
        return assignmentStatusOrder[left.status] - assignmentStatusOrder[right.status];
      }

      return left.match_number - right.match_number;
    });
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

  const handleAssignTable = async (
    matchId: string,
    explicitTableNumber?: number | null
  ) => {
    const tableNum = explicitTableNumber ?? parseTableInputValue(tableInputs[matchId]);
    if (!tableNum) {
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
      await fetchCoreData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign table');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateStation = async () => {
    const tableNumber = parseInt(stationTableInput, 10);
    if (Number.isNaN(tableNumber) || tableNumber < 1) {
      setError('Enter a valid table number for the station');
      return;
    }

    try {
      setActionLoading(`station-create-${tableNumber}`);
      setError(null);
      setSuccess(null);
      setStationError(null);

      const payload = await runStationJsonRequest<{
        error?: string;
        station?: ScorekeeperStationSummary;
        pin?: string;
        rotated?: boolean;
      }>('/api/admin/scorekeeper-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          tableNumber,
          label: stationLabelInput.trim() || null,
        }),
      });

      if (!payload.station || !payload.pin) {
        throw new Error('Failed to create station');
      }

      setStationTableInput('');
      setStationLabelInput('');
      setRevealedPins((current) => ({ ...current, [payload.station!.id]: payload.pin! }));
      setSuccess(
        payload.rotated
          ? `Station PIN rotated for table ${payload.station.table_number}`
          : `Station created for table ${payload.station.table_number}`
      );
      await fetchStationData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create station';
      setError(message);
      setStationError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStationAction = async (
    stationId: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    try {
      setActionLoading(stationId);
      setError(null);
      setSuccess(null);
      setStationError(null);

      const payload = await runStationJsonRequest<{
        error?: string;
        station?: ScorekeeperStationSummary;
        pin?: string;
      }>(`/api/admin/scorekeeper-stations/${stationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (payload.pin) {
        setRevealedPins((current) => ({ ...current, [stationId]: payload.pin! }));
      }

      setSuccess(successMessage);
      await fetchStationData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Station update failed';
      setError(message);
      setStationError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartMatch = async (match: MatchWithPlayers) => {
    const draftedTableNumber = parseTableInputValue(tableInputs[match.id]);
    const effectiveTableNumber = match.table_number ?? draftedTableNumber;

    if (!effectiveTableNumber) {
      setSuccess(null);
      setError(
        'Assign a table before starting this match so the scorekeeper station can load it.'
      );
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setActionLoading(match.id);

      if (!match.table_number) {
        await updateMatch(match.id, { table_number: effectiveTableNumber });
        setTableInputs((prev) => ({ ...prev, [match.id]: '' }));
      }

      await startMatch(match.id);
      setSuccess(`Match started on table ${effectiveTableNumber}`);
      await fetchCoreData(false);
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
      await finalizeMatchResult({
        matchId: match.id,
        tournamentId,
        player1Score: p1Score,
        player2Score: p2Score,
      });

      setScoreInputs((prev) => {
        const next = { ...prev };
        delete next[match.id];
        return next;
      });
      setSuccess(`Result reported — ${p1Score > p2Score ? match.player1?.name : match.player2?.name} wins`);
      await fetchCoreData(false);
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
      await correctMatchResult({
        matchId: correctDialogMatch.id,
        tournamentId,
        player1Score: p1Score,
        player2Score: p2Score,
      });

      setCorrectDialogMatch(null);
      setSuccess('Result corrected successfully');
      await fetchCoreData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to correct result');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostAnnouncement = async () => {
    const msg = announcementText.trim();
    if (!msg) return;

    try {
      setPostingAnnouncement(true);
      const ann = await createAnnouncement(tournamentId, msg);
      setAnnouncements((prev) => [ann, ...prev]);
      setAnnouncementText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    try {
      await toggleAnnouncementPin(id, pinned);
      setAnnouncements((prev) =>
        prev
          .map((a) => (a.id === id ? { ...a, pinned } : a))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update pin');
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
          {error || 'Tournament not found'}
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

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
              Scorekeeper Stations
            </Typography>
            <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', maxWidth: 720 }}>
              Create one station per table. PINs are hashed server-side, so the only time a PIN can
              be shown again is immediately after creation or rotation. A station only sees matches
              assigned to that exact table number.
            </Typography>
          </Box>
        </Box>

        {stationError && (
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              bgcolor: 'rgba(255,167,38,0.1)',
              color: '#ffb74d',
            }}
          >
            {stationError}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '160px 1fr auto' }, gap: 1.25, mb: 2.5 }}>
          <TextField
            size="small"
            label="Table"
            value={stationTableInput}
            onChange={(event) => setStationTableInput(event.target.value)}
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
            size="small"
            label="Label (optional)"
            value={stationLabelInput}
            onChange={(event) => setStationLabelInput(event.target.value)}
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
          <Button
            variant="contained"
            onClick={() => void handleCreateStation()}
            disabled={Boolean(actionLoading?.startsWith('station-create-'))}
            sx={{
              bgcolor: '#D4AF37',
              color: '#050505',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { bgcolor: '#e0bb53' },
            }}
          >
            Create / Rotate
          </Button>
        </Box>

        {stations.length === 0 ? (
          <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem' }}>
            No scorekeeper stations yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {stations.map((station) => (
              <Box
                key={station.id}
                sx={{
                  p: 1.5,
                  border: '1px solid rgba(255,255,255,0.06)',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderRadius: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                      {station.label || `Table ${station.table_number}`}
                    </Typography>
                    <Typography sx={{ color: '#8f8f8f', fontSize: '0.82rem', mt: 0.35 }}>
                      /scorekeeper/{station.id}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      component={Link}
                      href={`/scorekeeper/${station.id}`}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
                      sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 700 }}
                    >
                      Open Station
                    </Button>
                    <Button
                      size="small"
                      startIcon={<VpnKeyIcon />}
                      onClick={() =>
                        void handleStationAction(
                          station.id,
                          { action: 'rotate' },
                          `PIN rotated for table ${station.table_number}`
                        )
                      }
                      sx={{ color: '#D4AF37', textTransform: 'none', fontWeight: 700 }}
                    >
                      Rotate PIN
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        void handleStationAction(
                          station.id,
                          { action: 'set-active', active: !station.active },
                          station.active ? 'Station deactivated' : 'Station reactivated'
                        )
                      }
                      sx={{
                        color: station.active ? '#ef9a9a' : '#81c784',
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      {station.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Box>
                </Box>

                {revealedPins[station.id] && (
                  <Typography sx={{ color: '#D4AF37', fontSize: '0.85rem', mt: 1 }}>
                    Current visible PIN: <strong>{revealedPins[station.id]}</strong>
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Announcements Panel */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          onClick={() => setAnnouncementsExpanded((prev) => !prev)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CampaignIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f5f5f0', fontSize: '0.9rem' }}>
              Announcements
            </Typography>
            {announcements.length > 0 && (
              <Chip
                label={announcements.length}
                size="small"
                sx={{
                  height: 20,
                  minWidth: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(212,175,55,0.15)',
                  color: '#D4AF37',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Box>
          {announcementsExpanded ? (
            <ExpandLessIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          ) : (
            <ExpandMoreIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          )}
        </Box>

        {announcementsExpanded && (
          <Box sx={{ px: 2.5, pb: 2 }}>
            {/* Post new */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Post an announcement to players..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handlePostAnnouncement();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#050505',
                    '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                    '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                  },
                  '& input': { color: '#f5f5f0', fontSize: '0.85rem' },
                }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={postingAnnouncement || !announcementText.trim()}
                onClick={handlePostAnnouncement}
                sx={{
                  bgcolor: '#D4AF37',
                  color: '#050505',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#c5a030' },
                  '&:disabled': { bgcolor: 'rgba(212,175,55,0.2)', color: 'rgba(5,5,5,0.5)' },
                }}
              >
                Post
              </Button>
            </Box>

            {/* Announcements list */}
            {announcements.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', textAlign: 'center', py: 2 }}>
                No announcements yet. Post one to notify players.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {announcements.map((ann) => (
                  <Box
                    key={ann.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: ann.pinned ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${ann.pinned ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    {ann.pinned && (
                      <PushPinIcon sx={{ color: '#D4AF37', fontSize: 16, mt: 0.25, flexShrink: 0 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: '#f5f5f0', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                        {ann.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePin(ann.id, !ann.pinned)}
                        sx={{
                          color: ann.pinned ? '#D4AF37' : 'text.secondary',
                          '&:hover': { color: '#D4AF37' },
                        }}
                      >
                        <PushPinIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: '#ef5350' },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>

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

      {tournament.bracket_generated_at && (
        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            mb: 2.5,
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TableBarIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#f5f5f0', fontSize: '0.95rem' }}
            >
              Table Assignments
            </Typography>
          </Box>
          <Typography sx={{ color: '#a0a0a0', fontSize: '0.82rem', mb: 2 }}>
            Stations can control only matches on their exact table, and only after those matches
            reach Ready or In Progress.
          </Typography>

          {assignedTableMatches.length === 0 ? (
            <Typography sx={{ color: '#a0a0a0', fontSize: '0.82rem' }}>
              No matches have a table assignment yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {assignedTableMatches.map((match) => {
                const statusChip = getAssignmentStatusChipStyles(match.status);

                return (
                  <Box
                    key={match.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5,
                      flexWrap: 'wrap',
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(212,175,55,0.08)',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '0.88rem' }}>
                        Table {match.table_number} · Match #{match.match_number}
                      </Typography>
                      <Typography sx={{ color: '#d7d7d2', fontSize: '0.82rem' }}>
                        {formatAssignmentPlayers(match)}
                      </Typography>
                      <Typography sx={{ color: '#8f8f8f', fontSize: '0.72rem' }}>
                        {roundNameMap.get(match.round_id) ?? 'Round pending'}
                      </Typography>
                    </Box>

                    <Chip
                      label={statusChip.label}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        ...statusChip.sx,
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      label="Ready"
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                    />
                    {match.table_number && (
                      <Chip
                        label={`Table ${match.table_number}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(212,175,55,0.16)',
                          color: '#D4AF37',
                        }}
                      />
                    )}
                  </Box>
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

                {!match.table_number && (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: '#a0a0a0', fontSize: '0.72rem', mb: 1.25 }}
                  >
                    The entered table is only saved after you click the table button or start the
                    match.
                  </Typography>
                )}

                {/* Start button */}
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#050505' }} /> : <PlayArrowIcon />}
                  disabled={actionLoading === match.id}
                  onClick={() => handleStartMatch(match)}
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
                  {match.table_number ? 'Start Match' : 'Assign Table + Start'}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      label="Live"
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(66,165,245,0.15)', color: '#42a5f5' }}
                    />
                    {match.table_number && (
                      <Chip
                        label={`Table ${match.table_number}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(212,175,55,0.16)',
                          color: '#D4AF37',
                        }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Table */}
                {match.table_number ? (
                  <Typography variant="caption" sx={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TableBarIcon sx={{ fontSize: 14 }} /> Table {match.table_number}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Table #"
                      value={tableInputs[match.id] ?? ''}
                      onChange={(e) =>
                        setTableInputs((prev) => ({ ...prev, [match.id]: e.target.value }))
                      }
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          style: { padding: '6px 8px', fontSize: '0.8rem' },
                        },
                      }}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#050505',
                          '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(66,165,245,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                        },
                        '& input': { color: '#f5f5f0' },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleAssignTable(match.id)}
                      disabled={actionLoading === match.id}
                      sx={{
                        color: '#42a5f5',
                        border: '1px solid rgba(66,165,245,0.24)',
                        borderRadius: 1,
                        px: 1,
                      }}
                    >
                      <TableBarIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      label="Done"
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(102,187,106,0.15)', color: '#66bb6a' }}
                    />
                    {match.table_number && (
                      <Chip
                        label={`Table ${match.table_number}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(212,175,55,0.16)',
                          color: '#D4AF37',
                        }}
                      />
                    )}
                  </Box>
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

                {formatMatchDuration(match.started_at, match.completed_at) && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#a0a0a0',
                      display: 'block',
                      mb: 1,
                      fontSize: '0.7rem',
                    }}
                  >
                    Duration: {formatMatchDuration(match.started_at, match.completed_at)}
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
