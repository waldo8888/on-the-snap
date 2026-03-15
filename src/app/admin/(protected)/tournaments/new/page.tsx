'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@insforge/nextjs';
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
  Grid,
  CircularProgress,
  Alert,
  InputLabel,
  FormControl,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { createTournament, generateSlug } from '@/lib/tournaments';
import type { TournamentFormat, GameType } from '@/lib/tournament-engine/types';

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

const goldInputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(212,175,55,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#D4AF37' },
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setError(null);

      const slug = generateSlug(form.title, form.tournament_start_at);

      const tournament = await createTournament({
        slug,
        title: form.title.trim(),
        description: form.description.trim() || null,
        format: form.format,
        game_type: form.game_type,
        race_to: form.race_to,
        alternate_break: form.alternate_break,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        entry_fee: form.entry_fee ? Number(form.entry_fee) : 0,
        venue_name: 'On The Snap',
        venue_address: null,
        tournament_start_at: new Date(form.tournament_start_at).toISOString(),
        registration_open_at: form.registration_open_at ? new Date(form.registration_open_at).toISOString() : null,
        registration_close_at: form.registration_close_at ? new Date(form.registration_close_at).toISOString() : null,
        late_entry_cutoff_at: null,
        check_in_required: form.check_in_required,
        status: 'draft',
        published: form.published,
        rules: form.rules.trim() || null,
        prize_notes: form.prize_notes.trim() || null,
        created_by: user?.id || null,
      });

      router.push(`/admin/tournaments/${tournament.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Admin / Tournaments / New
      </Typography>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, mb: 3 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/tournaments')}
          sx={{ color: 'text.secondary', textTransform: 'none' }}
        >
          Back
        </Button>
        <Typography
          variant="h4"
          sx={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#f5f5f0', flex: 1 }}
        >
          New Tournament
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 2,
          p: 3,
        }}
      >
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
              placeholder="Tournament rules and regulations..."
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
              placeholder="Prize pool breakdown..."
              sx={goldInputSx}
            />
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4, pt: 3, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} sx={{ color: '#050505' }} /> : <SaveIcon />}
            onClick={handleSubmit}
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
            {saving ? 'Creating...' : 'Create Tournament'}
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
      </Paper>
    </Box>
  );
}
