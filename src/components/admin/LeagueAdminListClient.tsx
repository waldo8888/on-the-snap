'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  createLeague,
  getLeagues,
  generateSlug,
} from '@/lib/tournaments';
import type { GameType, LeagueWithDetails } from '@/lib/tournament-engine/types';

const gameTypeOptions: Array<{ value: GameType | ''; label: string }> = [
  { value: '', label: 'Mixed / Any' },
  { value: '8-ball', label: '8-Ball' },
  { value: '9-ball', label: '9-Ball' },
  { value: '10-ball', label: '10-Ball' },
  { value: 'straight_pool', label: 'Straight Pool' },
  { value: 'scotch_doubles', label: 'Scotch Doubles' },
];

const emptyLeagueForm = {
  name: '',
  slug: '',
  description: '',
  game_type: '' as GameType | '',
  published: false,
};

export default function LeagueAdminListClient() {
  const [leagues, setLeagues] = useState<LeagueWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyLeagueForm);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await getLeagues({
        includeUnpublishedTournaments: true,
      })) as LeagueWithDetails[];
      setLeagues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeagues();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('League name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createLeague({
        name: form.name,
        slug: form.slug.trim() || generateSlug(form.name),
        description: form.description,
        game_type: form.game_type || null,
        published: form.published,
      });
      setSuccess('League created');
      setCreateOpen(false);
      setForm(emptyLeagueForm);
      await loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif', fontWeight: 700 }}
          >
            Leagues
          </Typography>
          <Typography sx={{ color: '#a0a0a0', mt: 0.5 }}>
            Manage published league shells, active seasons, and standings previews.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setCreateOpen(true)}
          sx={{
            bgcolor: '#D4AF37',
            color: '#050505',
            fontWeight: 800,
            textTransform: 'none',
            '&:hover': { bgcolor: '#e0bb53' },
          }}
        >
          New League
        </Button>
      </Box>

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

      {loading ? (
        <Typography sx={{ color: '#a0a0a0' }}>Loading leagues…</Typography>
      ) : (
        <Grid container spacing={3}>
          {leagues.map((league) => (
            <Grid key={league.id} size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  bgcolor: '#111111',
                  border: '1px solid rgba(212,175,55,0.12)',
                  borderRadius: 2,
                }}
              >
                <Typography sx={{ color: '#D4AF37', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', mb: 1 }}>
                  {league.published ? 'Published' : 'Draft'}
                </Typography>
                <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1.35rem', mb: 1 }}>
                  {league.name}
                </Typography>
                <Typography sx={{ color: '#a0a0a0', mb: 2 }}>
                  {league.description || 'No description yet.'}
                </Typography>

                <Typography sx={{ color: '#d7d7d2', fontSize: '0.9rem', mb: 0.6 }}>
                  {league.seasons?.length ?? 0} season{(league.seasons?.length ?? 0) === 1 ? '' : 's'}
                </Typography>
                <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mb: 2 }}>
                  {league.activeSeason
                    ? `Active: ${league.activeSeason.name}`
                    : 'No active season'}
                </Typography>

                <Button
                  component={Link}
                  href={`/admin/leagues/${league.id}`}
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(212,175,55,0.24)',
                    color: '#D4AF37',
                    textTransform: 'none',
                    fontWeight: 700,
                    '&:hover': {
                      borderColor: '#D4AF37',
                      bgcolor: 'rgba(212,175,55,0.05)',
                    },
                  }}
                >
                  Manage League
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0' }}>Create League</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          <TextField
            label="League Name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                slug:
                  current.slug === '' || current.slug === generateSlug(current.name)
                    ? generateSlug(event.target.value)
                    : current.slug,
              }))
            }
            fullWidth
          />
          <TextField
            label="Slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: generateSlug(event.target.value) }))}
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            multiline
            rows={3}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Primary Game Type</InputLabel>
            <Select
              value={form.game_type}
              label="Primary Game Type"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  game_type: event.target.value as GameType | '',
                }))
              }
            >
              {gameTypeOptions.map((option) => (
                <MenuItem key={option.label} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#f5f5f0' }}>Publish immediately</Typography>
            <Switch
              checked={form.published}
              onChange={(event) =>
                setForm((current) => ({ ...current, published: event.target.checked }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#a0a0a0', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={submitting}
            variant="contained"
            sx={{
              bgcolor: '#D4AF37',
              color: '#050505',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { bgcolor: '#e0bb53' },
            }}
          >
            {submitting ? 'Creating…' : 'Create League'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
