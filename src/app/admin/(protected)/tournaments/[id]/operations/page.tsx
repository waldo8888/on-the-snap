'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
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
import {
  correctMatchResult,
  finalizeMatchResult,
  parseScoreInput,
  startMatch,
  validateMatchScores,
} from '@/lib/match-operations';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

import MatchScoringPanel from '@/components/admin/operations/MatchScoringPanel';
import StationManagementPanel from '@/components/admin/operations/StationManagementPanel';
import AnnouncementsPanel from '@/components/admin/operations/AnnouncementsPanel';
import MatchCorrectionDialog from '@/components/admin/operations/MatchCorrectionDialog';

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
  // Quick stats
  // ----------------------------------------------------------

  const totalMatches = matchesWithPlayers.filter((m) => m.status !== 'bye').length;
  const completedCount = matchesWithPlayers.filter((m) => m.status === 'completed').length;
  const inProgressCount = matchesWithPlayers.filter((m) => m.status === 'in_progress').length;
  const readyCount = matchesWithPlayers.filter((m) => m.status === 'ready').length;
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

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component="a"
              href={`/tournaments/${tournament.slug}/on-deck`}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              sx={{
                bgcolor: '#D4AF37',
                color: '#000',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: '#c5a030',
                },
              }}
            >
              On Deck TV
            </Button>
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
              Bracket
            </Button>
          </Box>
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

      {/* Scorekeeper Stations */}
      <StationManagementPanel
        stations={stations}
        stationError={stationError}
        stationTableInput={stationTableInput}
        onStationTableInputChange={setStationTableInput}
        stationLabelInput={stationLabelInput}
        onStationLabelInputChange={setStationLabelInput}
        onCreateStation={handleCreateStation}
        onStationAction={handleStationAction}
        revealedPins={revealedPins}
        actionLoading={actionLoading}
      />

      {/* Announcements */}
      <AnnouncementsPanel
        announcements={announcements}
        announcementText={announcementText}
        onAnnouncementTextChange={setAnnouncementText}
        announcementsExpanded={announcementsExpanded}
        onToggleExpanded={() => setAnnouncementsExpanded((prev) => !prev)}
        postingAnnouncement={postingAnnouncement}
        onPostAnnouncement={handlePostAnnouncement}
        onDeleteAnnouncement={handleDeleteAnnouncement}
        onTogglePin={handleTogglePin}
      />

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

      {/* Match Scoring (table assignments + three columns) */}
      {tournament.bracket_generated_at && (
        <MatchScoringPanel
          matchesWithPlayers={matchesWithPlayers}
          raceTo={tournament.race_to}
          roundNameMap={roundNameMap}
          bracketGenerated={!!tournament.bracket_generated_at}
          tableInputs={tableInputs}
          onTableInputChange={(matchId, value) =>
            setTableInputs((prev) => ({ ...prev, [matchId]: value }))
          }
          onAssignTable={(matchId) => handleAssignTable(matchId)}
          scoreInputs={scoreInputs}
          onScoreInputChange={(matchId, field, value) =>
            setScoreInputs((prev) => ({
              ...prev,
              [matchId]: {
                p1: field === 'p1' ? value : (prev[matchId]?.p1 ?? ''),
                p2: field === 'p2' ? value : (prev[matchId]?.p2 ?? ''),
              },
            }))
          }
          onStartMatch={handleStartMatch}
          onReportResult={handleReportResult}
          onOpenCorrectDialog={handleOpenCorrectDialog}
          actionLoading={actionLoading}
        />
      )}

      {/* Correction Dialog */}
      <MatchCorrectionDialog
        match={correctDialogMatch}
        correctScores={correctScores}
        onScoreChange={(field, value) =>
          setCorrectScores((prev) => ({ ...prev, [field]: value }))
        }
        onClose={() => setCorrectDialogMatch(null)}
        onApply={handleCorrectResult}
        raceTo={tournament.race_to}
        actionLoading={actionLoading}
      />
    </Box>
  );
}
