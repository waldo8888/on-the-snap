'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  InputLabel,
  FormControl,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  deleteTournament,
  canDeleteTournament,
  cloneTournament,
  getEligibleParticipantsForBracket,
  getTournamentRegistrationAvailability,
  generateAndSaveTournamentBracket,
  generateSlug,
  getSeasons,
  getTournamentById,
  updateTournament,
} from '@/lib/tournaments';
import type { AdminRole } from '@/lib/admin-auth';
import type {
  Tournament,
  TournamentWithDetails,
  TournamentFormat,
  GameType,
  TournamentStatus,
  SeasonWithDetails,
} from '@/lib/tournament-engine/types';
import DateTimePickerField from '@/components/admin/DateTimePickerField';
import TournamentStepper from '@/components/admin/TournamentStepper';
import QuickCheckInPanel from '@/components/admin/QuickCheckInPanel';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
];

const GAME_TYPES: { value: GameType; label: string }[] = [
  { value: '8-ball', label: '8-Ball' },
  { value: '9-ball', label: '9-Ball' },
  { value: '10-ball', label: '10-Ball' },
  { value: 'straight_pool', label: 'Straight Pool' },
  { value: 'scotch_doubles', label: 'Scotch Doubles' },
];

const DETAIL_TABS = [
  { label: 'Details', path: '' },
  { label: 'Participants', path: '/participants' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'Operations', path: '/operations' },
];

const statusChipColor = (status: TournamentStatus): string => {
  switch (status) {
    case 'live': return '#D4AF37';
    case 'completed': return '#66bb6a';
    case 'open': return '#42a5f5';
    case 'check_in': return '#ab47bc';
    case 'draft': return '#9e9e9e';
    case 'cancelled': return '#ef5350';
    default: return '#9e9e9e';
  }
};

type StatusActionTone = 'primary' | 'secondary' | 'danger';

type StatusAction = {
  next: TournamentStatus;
  label: string;
  tone: StatusActionTone;
};

function getStatusTransitions(
  tournament: Pick<Tournament, 'status' | 'check_in_required'>
): StatusAction[] {
  switch (tournament.status) {
    case 'draft':
      return [
        { next: 'open', label: 'Open Registration', tone: 'primary' },
        { next: 'cancelled', label: 'Cancel', tone: 'danger' },
      ];
    case 'open':
      return [
        ...(tournament.check_in_required
          ? [{ next: 'check_in' as const, label: 'Open Check-In', tone: 'secondary' as const }]
          : []),
        {
          next: 'live',
          label: tournament.check_in_required ? 'Start Tournament Anyway' : 'Start Tournament',
          tone: 'primary',
        },
        { next: 'cancelled', label: 'Cancel', tone: 'danger' },
      ];
    case 'check_in':
      return [
        { next: 'live', label: 'Start Tournament', tone: 'primary' },
        { next: 'cancelled', label: 'Cancel', tone: 'danger' },
      ];
    case 'live':
      return [
        { next: 'completed', label: 'Mark Completed', tone: 'primary' },
        { next: 'cancelled', label: 'Cancel', tone: 'danger' },
      ];
    case 'completed':
    case 'cancelled':
    default:
      return [];
  }
}

const goldInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    transition: 'all 0.3s ease',
    '& fieldset': { borderColor: 'rgba(212,175,55,0.15)', transition: 'all 0.3s ease' },
    '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.35)' },
    '&.Mui-focused': { bgcolor: 'rgba(0,0,0,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#D4AF37' },
};

const toLocalDatetime = (isoStr: string | null) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

interface TournamentEditClientProps {
  role: AdminRole;
}

export default function TournamentEditClient({ role }: TournamentEditClientProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = resolveTournamentAdminRouteId(params.id, pathname);

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [seasonOptions, setSeasonOptions] = useState<SeasonWithDetails[]>([]);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    format: 'single_elimination' as TournamentFormat,
    game_type: '8-ball' as GameType,
    season_id: '',
    race_to: 5,
    alternate_break: true,
    max_participants: '',
    entry_fee: '',
    tournament_start_at: '',
    registration_open_at: '',
    registration_close_at: '',
    check_in_required: false,
    rules: '',
    prize_notes: '',
    published: false,
    estimated_match_duration_minutes: '',
    auto_assign_tables: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const refreshTournament = useCallback(async (fallback?: Tournament) => {
    const fresh = await getTournamentById(id);
    if (fresh) {
      setTournament(fresh);
      return;
    }

    if (fallback) {
      setTournament((previous) => (previous ? { ...previous, ...fallback } : (fallback as TournamentWithDetails)));
    }
  }, [id]);

  const loadTournament = useCallback(async () => {
    if (!id) {
      setError('Invalid tournament route');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [data, seasons] = await Promise.all([
        getTournamentById(id),
        getSeasons({ includeStandings: false, includeTournaments: false }),
      ]);
      if (!data) {
        setError('Tournament not found');
        return;
      }
      setSeasonOptions(seasons as SeasonWithDetails[]);
      setTournament(data);
      // Auto-collapse settings during active phases — the admin needs operational UI, not settings
      if (data.status === 'check_in' || data.status === 'live') {
        setSettingsExpanded(false);
      }
      setForm({
        title: data.title,
        description: data.description || '',
        format: data.format,
        game_type: data.game_type,
        season_id: data.season_id || '',
        race_to: data.race_to,
        alternate_break: data.alternate_break,
        max_participants: data.max_participants?.toString() || '',
        entry_fee: data.entry_fee?.toString() || '',
        tournament_start_at: toLocalDatetime(data.tournament_start_at),
        registration_open_at: toLocalDatetime(data.registration_open_at),
        registration_close_at: toLocalDatetime(data.registration_close_at),
        check_in_required: data.check_in_required,
        rules: data.rules || '',
        prize_notes: data.prize_notes || '',
        published: data.published,
        estimated_match_duration_minutes: data.estimated_match_duration_minutes?.toString() || '',
        auto_assign_tables: data.auto_assign_tables ?? true,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.tournament_start_at) errors.tournament_start_at = 'Start date is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !tournament) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const previousSeasonId = tournament.season_id ?? '';
      const nextSeasonId = form.season_id || '';
      const seasonChanged = previousSeasonId !== nextSeasonId;

      if (seasonChanged && ['live', 'completed'].includes(tournament.status)) {
        if (role !== 'owner') {
          setError('Only owners can reassign a live or completed tournament to a different season.');
          setSaving(false);
          return;
        }

        const confirmed = window.confirm(
          'This tournament is already live or completed. Reassigning its season is intended for historical backfill or correction. Continue?'
        );

        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      const slug = form.title !== tournament.title
        ? generateSlug(form.title, form.tournament_start_at)
        : tournament.slug;

      const updated = await updateTournament(tournament.id, {
        slug,
        title: form.title.trim(),
        description: form.description.trim() || null,
        format: form.format,
        game_type: form.game_type,
        season_id: form.season_id || null,
        race_to: form.race_to,
        alternate_break: form.alternate_break,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        entry_fee: form.entry_fee ? Number(form.entry_fee) : 0,
        tournament_start_at: new Date(form.tournament_start_at).toISOString(),
        registration_open_at: form.registration_open_at ? new Date(form.registration_open_at).toISOString() : null,
        registration_close_at: form.registration_close_at ? new Date(form.registration_close_at).toISOString() : null,
        check_in_required: form.check_in_required,
        rules: form.rules.trim() || null,
        prize_notes: form.prize_notes.trim() || null,
        published: form.published,
        estimated_match_duration_minutes: form.estimated_match_duration_minutes ? Number(form.estimated_match_duration_minutes) : null,
        auto_assign_tables: form.auto_assign_tables,
      });

      await refreshTournament(updated);
      setSuccess('Tournament updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tournament');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: TournamentStatus) => {
    if (!tournament) return;

    try {
      setSaving(true);
      setError(null);

      if (newStatus === 'live' && !tournament.bracket_generated_at) {
        await generateAndSaveTournamentBracket(tournament.id);
      }

      const updated = await updateTournament(tournament.id, { status: newStatus });
      await refreshTournament(updated);
      // Collapse settings form when entering active phases
      if (newStatus === 'check_in' || newStatus === 'live') {
        setSettingsExpanded(false);
      }
      setSuccess(
        newStatus === 'live' && !tournament.bracket_generated_at
          ? 'Bracket generated and tournament is now live'
          : `Status changed to ${newStatus}`
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = (nextStatus: TournamentStatus) => {
    if (nextStatus === 'live') {
      setStatusDialogOpen(true);
      return;
    }

    void handleStatusChange(nextStatus);
  };

  const handleDelete = async () => {
    if (!tournament) return;

    try {
      setDeleting(true);
      await deleteTournament(tournament.id);
      router.push('/admin/tournaments');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete tournament');
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleClone = async () => {
    if (!tournament) return;
    try {
      setCloning(true);
      setError(null);
      const cloned = await cloneTournament(tournament.id);
      router.push(`/admin/tournaments/${cloned.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate tournament');
      setCloning(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      router.push(`/admin/tournaments/${id}`);
    } else {
      const path = DETAIL_TABS[newValue].path;
      router.push(`/admin/tournaments/${id}${path}`);
    }
  };

  const canDelete = tournament && canDeleteTournament(tournament.status, role);
  const transitions = tournament ? getStatusTransitions(tournament) : [];

  const participants = tournament?.participants ?? [];
  const participantCount = participants.length;
  const checkedInCount = participants.filter((participant) => participant.checked_in).length;
  const eligibleParticipants = tournament ? getEligibleParticipantsForBracket(tournament) : [];
  const eligibleCount = eligibleParticipants.length;
  const matches = tournament?.rounds?.flatMap((round) => round.matches ?? []) ?? [];
  const playableMatches = matches.filter((match) => match.status !== 'bye');
  const completedPlayableMatches = playableMatches.filter((match) => match.status === 'completed').length;
  const allMatchesComplete = playableMatches.length > 0 && completedPlayableMatches === playableMatches.length;
  const registrationAvailability = tournament
    ? getTournamentRegistrationAvailability(tournament, participantCount)
    : null;
  const minimumParticipantsToStart = tournament?.format === 'double_elimination' ? 4 : 2;
  const hasEnoughEligiblePlayers = eligibleCount >= minimumParticipantsToStart;

  const lifecycleMessage = (() => {
    if (!tournament) return null;

    if (tournament.status === 'draft') {
      return {
        severity: 'warning' as const,
        title: 'Draft mode',
        description: tournament.published
          ? 'This tournament is visible on the site, but registration is still closed until you open it.'
          : 'This tournament is hidden from the public. Publish it and open registration when you are ready.',
      };
    }

    if (tournament.status === 'open') {
      return {
        severity: 'info' as const,
        title: 'Registration is live',
        description: tournament.check_in_required
          ? 'When walk-ins and payments begin, move this event into Check-In so you can confirm paid players before the bracket locks.'
          : 'Keep registration open until the field is ready, then start the tournament to generate the bracket.',
      };
    }

    if (tournament.status === 'check_in') {
      return {
        severity: 'info' as const,
        title: 'Check-In is active',
        description: 'Use the check-in panel below to confirm players as they arrive. Only checked-in players will be seeded in the bracket.',
      };
    }

    if (tournament.status === 'live') {
      return {
        severity: allMatchesComplete ? 'success' as const : 'info' as const,
        title: allMatchesComplete ? 'All matches are complete' : 'Tournament is live',
        description: allMatchesComplete
          ? 'You can mark the tournament completed now to lock in the results and show the podium view publicly.'
          : 'Use Operations to assign tables, start matches, and report results as the event progresses.',
      };
    }

    if (tournament.status === 'completed') {
      return {
        severity: 'success' as const,
        title: 'Tournament completed',
        description: 'This event is closed out. Public results and final standings are now the main experience.',
      };
    }

    return {
      severity: 'warning' as const,
      title: 'Tournament cancelled',
      description: 'This event is cancelled and no longer accepting players or match activity.',
    };
  })();

  const preflightWarnings = tournament
    ? [
        !tournament.published
          ? 'This tournament is still unpublished. Staff can run it, but players will not see the public event page.'
          : null,
        tournament.check_in_required && tournament.status === 'open'
          ? 'Check-in is required. The recommended flow is to open Check-In first so payment can be confirmed before the bracket locks.'
          : null,
        registrationAvailability?.isOpen
          ? 'Registration is currently open. Starting the tournament now will close new signups immediately.'
          : null,
        !hasEnoughEligiblePlayers
          ? `You need at least ${minimumParticipantsToStart} eligible players to start this ${tournament.format.replace(/_/g, ' ')} event.`
          : null,
      ].filter((warning): warning is string => Boolean(warning))
    : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          {error || 'Tournament not found'}
        </Alert>
        <Button
          onClick={() => router.push('/admin/tournaments')}
          sx={{ color: '#D4AF37', textTransform: 'none' }}
        >
          Back to Tournaments
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Admin / Tournaments / Edit
      </Typography>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/tournaments')}
          sx={{ color: 'text.secondary', textTransform: 'none' }}
        >
          Back
        </Button>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              variant="h4"
              sx={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#f5f5f0' }}
            >
              {tournament.title}
            </Typography>
            <Chip
              label={tournament.status}
              size="small"
              sx={{
                bgcolor: `${statusChipColor(tournament.status)}18`,
                color: statusChipColor(tournament.status),
                fontWeight: 600,
                fontSize: '0.7rem',
                textTransform: 'capitalize',
                height: 24,
              }}
            />
            <Chip
              label={tournament.format.replace(/_/g, ' ')}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'rgba(212,175,55,0.3)',
                color: 'text.secondary',
                fontSize: '0.7rem',
                textTransform: 'capitalize',
                height: 24,
              }}
            />
            <Button
              size="small"
              startIcon={cloning ? <CircularProgress size={14} sx={{ color: '#D4AF37' }} /> : <ContentCopyIcon />}
              onClick={handleClone}
              disabled={cloning}
              sx={{
                color: '#D4AF37',
                textTransform: 'none',
                fontSize: '0.8rem',
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(212,175,55,0.08)' },
              }}
            >
              Duplicate
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Status Transitions */}
      {transitions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {transitions.map((t) => (
            <Button
              key={t.next}
              variant={t.tone === 'primary' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleStatusAction(t.next)}
              disabled={saving}
              sx={
                t.tone === 'danger'
                  ? {
                      borderColor: 'rgba(239,83,80,0.4)',
                      color: '#ef5350',
                      textTransform: 'none',
                      fontSize: '0.85rem',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
                    }
                  : t.tone === 'secondary'
                    ? {
                        borderColor: 'rgba(66,165,245,0.35)',
                        color: '#90caf9',
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': { borderColor: '#42a5f5', bgcolor: 'rgba(66,165,245,0.08)' },
                      }
                  : {
                      bgcolor: '#D4AF37',
                      color: '#050505',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '0.85rem',
                      borderRadius: 2,
                      boxShadow: '0 4px 14px rgba(212,175,55,0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { bgcolor: '#e5c150', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(212,175,55,0.4)' },
                    }
              }
            >
              {t.label}
            </Button>
          ))}
          {canDelete && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                borderColor: 'rgba(239,83,80,0.4)',
                color: '#ef5350',
                textTransform: 'none',
                fontSize: '0.8rem',
                ml: 'auto',
                '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      )}

      {/* Standalone delete button for completed/cancelled (no transitions bar) */}
      {canDelete && transitions.length === 0 && (
        <Box sx={{ display: 'flex', mb: 3 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            sx={{
              borderColor: 'rgba(239,83,80,0.4)',
              color: '#ef5350',
              textTransform: 'none',
              fontSize: '0.8rem',
              ml: 'auto',
              '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
            }}
          >
            Delete Tournament
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a' }}>
          {success}
        </Alert>
      )}

      {lifecycleMessage && (
        <Alert
          severity={lifecycleMessage.severity}
          sx={{
            mb: 3,
            bgcolor:
              lifecycleMessage.severity === 'success'
                ? 'rgba(102,187,106,0.1)'
                : lifecycleMessage.severity === 'warning'
                  ? 'rgba(255,167,38,0.1)'
                  : 'rgba(66,165,245,0.1)',
            color:
              lifecycleMessage.severity === 'success'
                ? '#66bb6a'
                : lifecycleMessage.severity === 'warning'
                  ? '#ffb74d'
                  : '#90caf9',
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{lifecycleMessage.title}</Typography>
          <Typography variant="body2">{lifecycleMessage.description}</Typography>
        </Alert>
      )}

      {/* Tab Navigation — placed prominently below heading */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(212,175,55,0.12)',
          '& .MuiTab-root': {
            textTransform: 'none',
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.85rem',
            minHeight: 48,
            '&.Mui-selected': { color: '#D4AF37' },
          },
          '& .MuiTabs-indicator': { bgcolor: '#D4AF37' },
        }}
      >
        {DETAIL_TABS.map((tab) => (
          <Tab key={tab.label} label={tab.label} />
        ))}
      </Tabs>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          bgcolor: 'rgba(10, 10, 10, 0.45)',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
          Tournament Readiness
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[
            { label: tournament.published ? 'Published' : 'Hidden', value: tournament.published ? 'Public page visible' : 'Public page hidden' },
            { label: 'Registration', value: tournament.status === 'check_in' ? 'Closed for check-in' : registrationAvailability?.message ?? 'Not available' },
            { label: 'Players', value: `${participantCount} registered` },
            { label: 'Checked In', value: `${checkedInCount} confirmed` },
            { label: 'Bracket Eligible', value: `${eligibleCount} eligible` },
            { label: 'Matches', value: playableMatches.length > 0 ? `${completedPlayableMatches} / ${playableMatches.length} completed` : 'Bracket not generated' },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                minWidth: { xs: '100%', sm: 180 },
                flex: '1 1 180px',
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.35, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Tournament Progress Stepper */}
      <TournamentStepper
        tournament={tournament}
        onStatusChange={handleStatusAction}
        onGenerateBracket={async () => {
          try {
            setSaving(true);
            setError(null);
            await generateAndSaveTournamentBracket(tournament.id);
            await refreshTournament();
            setSuccess('Bracket generated successfully');
            setTimeout(() => setSuccess(null), 3000);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate bracket');
          } finally {
            setSaving(false);
          }
        }}
        loading={saving}
      />

      {/* Quick Check-In Panel — surfaces inline during check-in phase */}
      {tournament.status === 'check_in' && (
        <QuickCheckInPanel
          tournamentId={tournament.id}
          participants={participants}
          onParticipantsChange={(updated) => {
            setTournament((prev) => prev ? { ...prev, participants: updated } : prev);
          }}
          onRefresh={() => refreshTournament()}
          tournamentAdminPath={`/admin/tournaments/${id}`}
        />
      )}

      {/* Details Form */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(10, 10, 10, 0.45)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Collapsible toggle for active phases */}
          {(tournament.status === 'check_in' || tournament.status === 'live') && (
            <Button
              onClick={() => setSettingsExpanded((prev) => !prev)}
              endIcon={settingsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                color: '#888',
                textTransform: 'none',
                fontSize: '0.82rem',
                mb: settingsExpanded ? 2 : 0,
                px: 0,
                '&:hover': { color: '#D4AF37', bgcolor: 'transparent' },
              }}
            >
              {settingsExpanded ? 'Hide Tournament Settings' : 'Show Tournament Settings'}
            </Button>
          )}
          <Collapse in={settingsExpanded || (tournament.status !== 'check_in' && tournament.status !== 'live')}>
          <Grid container spacing={3}>
            {/* Title */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tournament Title"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                error={!!validationErrors.title}
                helperText={validationErrors.title}
                required
                sx={goldInputSx}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                multiline
                rows={3}
                sx={goldInputSx}
              />
            </Grid>

            {/* Format */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth sx={goldInputSx}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={form.format}
                  label="Format"
                  onChange={(e) => updateField('format', e.target.value as TournamentFormat)}
                >
                  {FORMATS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Game Type */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth sx={goldInputSx}>
                <InputLabel>Game Type</InputLabel>
                <Select
                  value={form.game_type}
                  label="Game Type"
                  onChange={(e) => updateField('game_type', e.target.value as GameType)}
                >
                  {GAME_TYPES.map((g) => (
                    <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth sx={goldInputSx}>
                <InputLabel>League Season</InputLabel>
                <Select
                  value={form.season_id}
                  label="League Season"
                  onChange={(e) => updateField('season_id', e.target.value)}
                >
                  <MenuItem value="">Standalone tournament</MenuItem>
                  {seasonOptions.map((season) => (
                    <MenuItem key={season.id} value={season.id}>
                      {season.league?.name ?? 'League'} · {season.name} ({season.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography sx={{ color: '#8f8f8f', fontSize: '0.78rem', mt: 0.8 }}>
                Staff can assign seasons before the event goes live. Owners can backfill or correct
                season links after the event starts.
              </Typography>
            </Grid>

            {/* Race To */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Race To"
                type="number"
                value={form.race_to}
                onChange={(e) => updateField('race_to', Math.max(1, Number(e.target.value)))}
                inputProps={{ min: 1 }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Max Participants */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Max Participants"
                type="number"
                value={form.max_participants}
                onChange={(e) => updateField('max_participants', e.target.value)}
                placeholder="Unlimited"
                inputProps={{ min: 2 }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Entry Fee */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Entry Fee ($)"
                type="number"
                value={form.entry_fee}
                onChange={(e) => updateField('entry_fee', e.target.value)}
                placeholder="0"
                inputProps={{ min: 0, step: '0.01' }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Alternate Break */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.alternate_break}
                    onChange={(e) => updateField('alternate_break', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#D4AF37' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#D4AF37' },
                    }}
                  />
                }
                label="Alternate Break"
                sx={{ color: '#f5f5f0' }}
              />
            </Grid>

            {/* Check-in Required */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.check_in_required}
                    onChange={(e) => updateField('check_in_required', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#D4AF37' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#D4AF37' },
                    }}
                  />
                }
                label="Check-in Required"
                sx={{ color: '#f5f5f0' }}
              />
            </Grid>

            {/* Estimated Match Duration */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Est. Match Duration (min)"
                value={form.estimated_match_duration_minutes}
                onChange={(e) => updateField('estimated_match_duration_minutes', e.target.value)}
                fullWidth
                size="small"
                type="number"
                placeholder="Auto"
                helperText="Leave blank to auto-estimate from race-to"
                inputProps={{ min: 5, max: 300 }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Auto-assign Tables */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.auto_assign_tables}
                    onChange={(e) => updateField('auto_assign_tables', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#D4AF37' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#D4AF37' },
                    }}
                  />
                }
                label="Auto-assign Tables"
                sx={{ color: '#f5f5f0' }}
              />
            </Grid>

            {/* Published */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.published}
                    onChange={(e) => updateField('published', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#D4AF37' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#D4AF37' },
                    }}
                  />
                }
                label="Published"
                sx={{ color: '#f5f5f0' }}
              />
            </Grid>

            {/* Start Date */}
            <Grid size={{ xs: 12, md: 4 }}>
              <DateTimePickerField
                label="Start Date & Time"
                value={form.tournament_start_at}
                onChange={(value) => updateField('tournament_start_at', value)}
                error={!!validationErrors.tournament_start_at}
                helperText={validationErrors.tournament_start_at || 'Required. Pick the tournament day and start time.'}
                required
                sx={goldInputSx}
              />
            </Grid>

            {/* Registration Open */}
            <Grid size={{ xs: 12, md: 4 }}>
              <DateTimePickerField
                label="Registration Opens"
                value={form.registration_open_at}
                onChange={(value) => updateField('registration_open_at', value)}
                helperText="Optional. Leave blank if registration should open immediately."
                sx={goldInputSx}
              />
            </Grid>

            {/* Registration Close */}
            <Grid size={{ xs: 12, md: 4 }}>
              <DateTimePickerField
                label="Registration Closes"
                value={form.registration_close_at}
                onChange={(value) => updateField('registration_close_at', value)}
                helperText="Optional. Leave blank if you do not want a registration cutoff."
                sx={goldInputSx}
              />
            </Grid>

            {/* Rules */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Rules"
                value={form.rules}
                onChange={(e) => updateField('rules', e.target.value)}
                multiline
                rows={4}
                sx={goldInputSx}
              />
            </Grid>

            {/* Prize Notes */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Prize Notes"
                value={form.prize_notes}
                onChange={(e) => updateField('prize_notes', e.target.value)}
                multiline
                rows={4}
                sx={goldInputSx}
              />
            </Grid>
          </Grid>
          </Collapse>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: settingsExpanded || (tournament.status !== 'check_in' && tournament.status !== 'live') ? 4 : 2, pt: 3, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} sx={{ color: '#050505' }} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                boxShadow: '0 4px 14px rgba(212,175,55,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { bgcolor: '#e5c150', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(212,175,55,0.4)' },
                '&:disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)', transform: 'none', boxShadow: 'none' },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/tournaments')}
              disabled={saving}
              sx={{
                borderColor: 'rgba(212,175,55,0.3)',
                color: 'text.secondary',
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                transition: 'all 0.3s ease',
                '&:hover': { borderColor: 'rgba(212,175,55,0.5)', bgcolor: 'rgba(212,175,55,0.05)' },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={statusDialogOpen}
        onClose={() => !saving && setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.24)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif' }}>
          Start Tournament
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
            Starting the tournament will generate the bracket if needed and close public registration.
          </DialogContentText>

          <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
            {[
              { label: 'Format', value: tournament.format.replace(/_/g, ' ') },
              { label: 'Registered Players', value: participantCount.toString() },
              { label: 'Checked-In Players', value: checkedInCount.toString() },
              { label: 'Bracket Eligible', value: eligibleCount.toString() },
              { label: 'Registration', value: registrationAvailability?.isOpen ? 'Still open' : 'Already closed' },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 1.5,
                  py: 1.1,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#f5f5f0', fontWeight: 700, textTransform: item.label === 'Format' ? 'capitalize' : 'none' }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>

          {preflightWarnings.length > 0 && (
            <Alert severity="warning" sx={{ bgcolor: 'rgba(255,167,38,0.1)', color: '#ffb74d' }}>
              <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Before you go live</Typography>
              {preflightWarnings.map((warning) => (
                <Typography key={warning} variant="body2" sx={{ mb: 0.5 }}>
                  {warning}
                </Typography>
              ))}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {tournament.check_in_required && tournament.status === 'open' && (
            <Button
              onClick={() => {
                setStatusDialogOpen(false);
                void handleStatusChange('check_in');
              }}
              disabled={saving}
              sx={{ color: '#90caf9', textTransform: 'none', mr: 'auto' }}
            >
              Open Check-In Instead
            </Button>
          )}
          <Button
            onClick={() => setStatusDialogOpen(false)}
            disabled={saving}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setStatusDialogOpen(false);
              void handleStatusChange('live');
            }}
            disabled={saving || !hasEnoughEligiblePlayers}
            sx={{
              bgcolor: '#D4AF37',
              color: '#050505',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#e5c150' },
              '&:disabled': { bgcolor: 'rgba(212,175,55,0.25)', color: 'rgba(5,5,5,0.55)' },
            }}
          >
            Start Tournament
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif' }}>
          Delete Tournament
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete &ldquo;{tournament.title}&rdquo;? This action cannot be undone and will remove all participants, brackets, and match data.
          </Typography>
          {(tournament.status === 'completed' || tournament.status === 'live') && (
            <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(255,167,38,0.1)', color: '#ffb74d' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                This tournament has {tournament.status === 'live' ? 'active matches in progress' : 'completed results'}.
                Deleting it will permanently remove all participant data, brackets, and match history.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}
            sx={{
              bgcolor: '#ef5350',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Tournament'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
