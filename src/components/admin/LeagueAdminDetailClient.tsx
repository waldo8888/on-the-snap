'use client';

import { useCallback, useEffect, useState } from 'react';
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
  createSeason,
  generateSlug,
  getLeagueById,
  updateLeague,
  updateSeason,
} from '@/lib/tournaments';
import type {
  GameType,
  LeagueWithDetails,
  Season,
  SeasonStatus,
} from '@/lib/tournament-engine/types';

const gameTypeOptions: Array<{ value: GameType | ''; label: string }> = [
  { value: '', label: 'Mixed / Any' },
  { value: '8-ball', label: '8-Ball' },
  { value: '9-ball', label: '9-Ball' },
  { value: '10-ball', label: '10-Ball' },
  { value: 'straight_pool', label: 'Straight Pool' },
  { value: 'scotch_doubles', label: 'Scotch Doubles' },
];

const seasonStatusOptions: SeasonStatus[] = ['draft', 'active', 'completed'];

function toLocalDateTime(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

const emptySeasonForm = {
  id: '',
  name: '',
  slug: '',
  description: '',
  status: 'draft' as SeasonStatus,
  published: false,
  start_at: '',
  end_at: '',
};

export default function LeagueAdminDetailClient({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<LeagueWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonForm, setSeasonForm] = useState(emptySeasonForm);
  const [leagueForm, setLeagueForm] = useState({
    name: '',
    slug: '',
    description: '',
    game_type: '' as GameType | '',
    published: false,
  });

  const loadLeague = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextLeague = await getLeagueById(leagueId);
      if (!nextLeague) {
        setError('League not found');
        return;
      }

      setLeague(nextLeague);
      setLeagueForm({
        name: nextLeague.name,
        slug: nextLeague.slug,
        description: nextLeague.description || '',
        game_type: nextLeague.game_type || '',
        published: nextLeague.published,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load league');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void loadLeague();
  }, [loadLeague]);

  const handleSaveLeague = async () => {
    if (!league) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateLeague(league.id, {
        name: leagueForm.name,
        slug: leagueForm.slug,
        description: leagueForm.description,
        game_type: leagueForm.game_type || null,
        published: leagueForm.published,
      });
      setSuccess('League updated');
      await loadLeague();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update league');
    } finally {
      setSaving(false);
    }
  };

  const openSeasonDialog = (season?: Season) => {
    if (!season) {
      setSeasonForm(emptySeasonForm);
      setSeasonDialogOpen(true);
      return;
    }

    setSeasonForm({
      id: season.id,
      name: season.name,
      slug: season.slug,
      description: season.description || '',
      status: season.status,
      published: season.published,
      start_at: toLocalDateTime(season.start_at),
      end_at: toLocalDateTime(season.end_at),
    });
    setSeasonDialogOpen(true);
  };

  const handleSaveSeason = async () => {
    if (!league || !seasonForm.name.trim() || !seasonForm.start_at) {
      setError('Season name and start date are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        league_id: league.id,
        name: seasonForm.name,
        slug: seasonForm.slug.trim() || generateSlug(seasonForm.name),
        description: seasonForm.description,
        status: seasonForm.status,
        published: seasonForm.published,
        start_at: new Date(seasonForm.start_at).toISOString(),
        end_at: seasonForm.end_at ? new Date(seasonForm.end_at).toISOString() : null,
      };

      if (seasonForm.id) {
        await updateSeason(seasonForm.id, payload);
        setSuccess('Season updated');
      } else {
        await createSeason(payload);
        setSuccess('Season created');
      }

      setSeasonDialogOpen(false);
      setSeasonForm(emptySeasonForm);
      await loadLeague();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save season');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography sx={{ color: '#a0a0a0' }}>Loading league…</Typography>;
  }

  if (!league) {
    return (
      <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
        {error || 'League not found'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif', fontWeight: 700 }}
          >
            {league.name}
          </Typography>
          <Typography sx={{ color: '#a0a0a0', mt: 0.5 }}>
            Manage league metadata, season status, linked tournaments, and public standings previews.
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/admin/leagues"
          variant="outlined"
          sx={{
            borderColor: 'rgba(212,175,55,0.24)',
            color: '#D4AF37',
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
          }}
        >
          Back to Leagues
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

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 2 }}>League Settings</Typography>

            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="League Name"
                value={leagueForm.name}
                onChange={(event) =>
                  setLeagueForm((current) => ({
                    ...current,
                    name: event.target.value,
                    slug:
                      current.slug === generateSlug(current.name) || current.slug === ''
                        ? generateSlug(event.target.value)
                        : current.slug,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Slug"
                value={leagueForm.slug}
                onChange={(event) =>
                  setLeagueForm((current) => ({
                    ...current,
                    slug: generateSlug(event.target.value),
                  }))
                }
                fullWidth
              />
              <TextField
                label="Description"
                value={leagueForm.description}
                onChange={(event) =>
                  setLeagueForm((current) => ({ ...current, description: event.target.value }))
                }
                fullWidth
                multiline
                rows={4}
              />
              <FormControl fullWidth>
                <InputLabel>Primary Game Type</InputLabel>
                <Select
                  value={leagueForm.game_type}
                  label="Primary Game Type"
                  onChange={(event) =>
                    setLeagueForm((current) => ({
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
                <Typography sx={{ color: '#f5f5f0' }}>Published</Typography>
                <Switch
                  checked={leagueForm.published}
                  onChange={(event) =>
                    setLeagueForm((current) => ({ ...current, published: event.target.checked }))
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  onClick={() => void handleSaveLeague()}
                  disabled={saving}
                  variant="contained"
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#050505',
                    fontWeight: 800,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#e0bb53' },
                  }}
                >
                  {saving ? 'Saving…' : 'Save League'}
                </Button>
                <Button
                  component={Link}
                  href={`/leagues/${league.slug}`}
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(212,175,55,0.24)',
                    color: '#D4AF37',
                    textTransform: 'none',
                    fontWeight: 700,
                    '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                  }}
                >
                  Open Public Page
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>Seasons</Typography>
              <Button
                onClick={() => openSeasonDialog()}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(212,175,55,0.24)',
                  color: '#D4AF37',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                }}
              >
                New Season
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(league.seasons ?? []).map((season) => (
                <Box
                  key={season.id}
                  sx={{
                    p: 1.6,
                    border: '1px solid rgba(255,255,255,0.06)',
                    bgcolor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                    {season.name}
                  </Typography>
                  <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mt: 0.35 }}>
                    {season.status} · {season.published ? 'public' : 'hidden'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.2, mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => openSeasonDialog(season)}
                      sx={{ color: '#D4AF37', textTransform: 'none', fontWeight: 700, px: 0 }}
                    >
                      Edit
                    </Button>
                    <Button
                      component={Link}
                      href={`/leagues/${league.slug}/seasons/${season.slug}`}
                      size="small"
                      sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 700, px: 0 }}
                    >
                      Public View
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 2 }}>
              Active Season Standings Preview
            </Typography>

            {(league.standingsPreview?.length ?? 0) === 0 ? (
              <Typography sx={{ color: '#a0a0a0' }}>
                No active season standings yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {league.standingsPreview!.map((entry, index) => (
                  <Typography key={entry.player_id} sx={{ color: index === 0 ? '#D4AF37' : '#d7d7d2' }}>
                    {index + 1}. {entry.display_name} · {entry.points} pts
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#111111',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 2 }}>
              Linked Tournaments
            </Typography>

            {(league.recentTournaments?.length ?? 0) === 0 ? (
              <Typography sx={{ color: '#a0a0a0' }}>
                No tournaments are linked into this league yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {league.recentTournaments!.map((tournament) => (
                  <Box key={tournament.id}>
                    <Link href={`/admin/tournaments/${tournament.id}`} style={{ color: '#f5f5f0', textDecoration: 'none', fontWeight: 700 }}>
                      {tournament.title}
                    </Link>
                    <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mt: 0.35 }}>
                      {tournament.status} · {tournament.format.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={seasonDialogOpen}
        onClose={() => !saving && setSeasonDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#f5f5f0' }}>
          {seasonForm.id ? 'Edit Season' : 'Create Season'}
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          <TextField
            label="Season Name"
            value={seasonForm.name}
            onChange={(event) =>
              setSeasonForm((current) => ({
                ...current,
                name: event.target.value,
                slug:
                  current.slug === generateSlug(current.name) || current.slug === ''
                    ? generateSlug(event.target.value)
                    : current.slug,
              }))
            }
            fullWidth
          />
          <TextField
            label="Slug"
            value={seasonForm.slug}
            onChange={(event) =>
              setSeasonForm((current) => ({
                ...current,
                slug: generateSlug(event.target.value),
              }))
            }
            fullWidth
          />
          <TextField
            label="Description"
            value={seasonForm.description}
            onChange={(event) =>
              setSeasonForm((current) => ({ ...current, description: event.target.value }))
            }
            fullWidth
            multiline
            rows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={seasonForm.status}
              label="Status"
              onChange={(event) =>
                setSeasonForm((current) => ({
                  ...current,
                  status: event.target.value as SeasonStatus,
                }))
              }
            >
              {seasonStatusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Starts At"
            type="datetime-local"
            value={seasonForm.start_at}
            onChange={(event) =>
              setSeasonForm((current) => ({ ...current, start_at: event.target.value }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Ends At"
            type="datetime-local"
            value={seasonForm.end_at}
            onChange={(event) =>
              setSeasonForm((current) => ({ ...current, end_at: event.target.value }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#f5f5f0' }}>Published</Typography>
            <Switch
              checked={seasonForm.published}
              onChange={(event) =>
                setSeasonForm((current) => ({ ...current, published: event.target.checked }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeasonDialogOpen(false)} sx={{ color: '#a0a0a0', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSaveSeason()}
            disabled={saving}
            variant="contained"
            sx={{
              bgcolor: '#D4AF37',
              color: '#050505',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { bgcolor: '#e0bb53' },
            }}
          >
            {saving ? 'Saving…' : seasonForm.id ? 'Save Season' : 'Create Season'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
