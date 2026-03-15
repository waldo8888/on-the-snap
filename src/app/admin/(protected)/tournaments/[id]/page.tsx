'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  DialogActions,
  CircularProgress,
  Alert,
  InputLabel,
  FormControl,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  deleteTournament,
  generateAndSaveTournamentBracket,
  generateSlug,
  getTournamentById,
  updateTournament,
} from '@/lib/tournaments';
import type { Tournament, TournamentFormat, GameType, TournamentStatus } from '@/lib/tournament-engine/types';

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

const STATUS_TRANSITIONS: Record<TournamentStatus, { next: TournamentStatus; label: string }[]> = {
  draft: [
    { next: 'open', label: 'Open Registration' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  open: [
    { next: 'live', label: 'Start Tournament' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  check_in: [
    { next: 'live', label: 'Start Tournament' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  live: [
    { next: 'completed', label: 'Mark Completed' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  completed: [],
  cancelled: [],
};

const goldInputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(212,175,55,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.4)' },
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

export default function TournamentEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [form, setForm] = useState({
    title: '',
    description: '',
    format: 'single_elimination' as TournamentFormat,
    game_type: '8-ball' as GameType,
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
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadTournament = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTournamentById(id);
      if (!data) {
        setError('Tournament not found');
        return;
      }
      setTournament(data);
      setForm({
        title: data.title,
        description: data.description || '',
        format: data.format,
        game_type: data.game_type,
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

      const slug = form.title !== tournament.title
        ? generateSlug(form.title, form.tournament_start_at)
        : tournament.slug;

      const updated = await updateTournament(tournament.id, {
        slug,
        title: form.title.trim(),
        description: form.description.trim() || null,
        format: form.format,
        game_type: form.game_type,
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
      });

      setTournament(updated);
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
      setTournament(updated);
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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      router.push(`/admin/tournaments/${id}`);
    } else {
      const path = DETAIL_TABS[newValue].path;
      router.push(`/admin/tournaments/${id}${path}`);
    }
  };

  const canDelete = tournament && (tournament.status === 'draft' || tournament.status === 'cancelled');
  const transitions = tournament ? STATUS_TRANSITIONS[tournament.status] || [] : [];

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
          </Box>
        </Box>
      </Box>

      {/* Status Transitions */}
      {transitions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {transitions.map((t) => (
            <Button
              key={t.next}
              variant={t.next === 'cancelled' ? 'outlined' : 'contained'}
              size="small"
              onClick={() => handleStatusChange(t.next)}
              disabled={saving}
              sx={
                t.next === 'cancelled'
                  ? {
                      borderColor: 'rgba(239,83,80,0.4)',
                      color: '#ef5350',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
                    }
                  : {
                      bgcolor: '#D4AF37',
                      color: '#050505',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      '&:hover': { bgcolor: '#c5a030' },
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

      {/* Tab Navigation */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: '1px solid rgba(212,175,55,0.08)',
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

        {/* Details Form */}
        <Box sx={{ p: 3 }}>
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
              <TextField
                fullWidth
                label="Start Date & Time"
                type="datetime-local"
                value={form.tournament_start_at}
                onChange={(e) => updateField('tournament_start_at', e.target.value)}
                error={!!validationErrors.tournament_start_at}
                helperText={validationErrors.tournament_start_at}
                required
                slotProps={{ inputLabel: { shrink: true } }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Registration Open */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Registration Opens"
                type="datetime-local"
                value={form.registration_open_at}
                onChange={(e) => updateField('registration_open_at', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={goldInputSx}
              />
            </Grid>

            {/* Registration Close */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Registration Closes"
                type="datetime-local"
                value={form.registration_close_at}
                onChange={(e) => updateField('registration_close_at', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
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

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4, pt: 3, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} sx={{ color: '#050505' }} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#c5a030' },
                '&:disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
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
                '&:hover': { borderColor: 'rgba(212,175,55,0.5)', bgcolor: 'rgba(212,175,55,0.05)' },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>

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
