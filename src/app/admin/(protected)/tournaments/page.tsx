'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getTournaments } from '@/lib/tournaments';
import type { Tournament, TournamentStatus } from '@/lib/tournament-engine/types';

const STATUS_FILTERS: { label: string; value: TournamentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'open' },
  { label: 'Live', value: 'live' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
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

export default function TournamentsListPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTournaments();
        setTournaments(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentFilter = STATUS_FILTERS[activeTab].value;
  const filtered = currentFilter === 'all'
    ? tournaments
    : tournaments.filter((t) => t.status === currentFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatLabel = (str: string) => str.replace(/_/g, ' ');

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Admin / Tournaments
      </Typography>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
          }}
        >
          Tournaments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/admin/tournaments/new')}
          sx={{
            bgcolor: '#D4AF37',
            color: '#050505',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: '#c5a030' },
          }}
        >
          New Tournament
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          {error}
        </Alert>
      )}

      {/* Filter Tabs */}
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
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
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
          {STATUS_FILTERS.map((f) => (
            <Tab key={f.value} label={f.label} />
          ))}
        </Tabs>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#D4AF37' }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: 'rgba(212,175,55,0.15)', mb: 1.5 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
              {currentFilter === 'all' ? 'No tournaments yet' : `No ${currentFilter} tournaments`}
            </Typography>
            {currentFilter === 'all' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push('/admin/tournaments/new')}
                sx={{
                  borderColor: 'rgba(212,175,55,0.3)',
                  color: '#D4AF37',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                }}
              >
                Create your first tournament
              </Button>
            )}
          </Box>
        ) : (
          /* Tournament table-style list */
          <Box>
            {/* Header row */}
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '1fr 130px 130px 100px 160px',
                gap: 2,
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid rgba(212,175,55,0.08)',
              }}
            >
              {['Title', 'Format', 'Game Type', 'Status', 'Date'].map((h) => (
                <Typography key={h} variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            {filtered.map((tournament) => (
              <Box
                key={tournament.id}
                onClick={() => router.push(`/admin/tournaments/${tournament.id}`)}
                sx={{
                  display: { xs: 'block', md: 'grid' },
                  gridTemplateColumns: '1fr 130px 130px 100px 160px',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(212,175,55,0.06)',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
                }}
              >
                {/* Title */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#f5f5f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tournament.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '0.7rem', display: { md: 'none' } }}
                  >
                    {formatLabel(tournament.format)} &middot; {tournament.game_type}
                  </Typography>
                </Box>

                {/* Format */}
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    display: { xs: 'none', md: 'block' },
                  }}
                >
                  {formatLabel(tournament.format)}
                </Typography>

                {/* Game Type */}
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    display: { xs: 'none', md: 'block' },
                  }}
                >
                  {tournament.game_type}
                </Typography>

                {/* Status Chip */}
                <Box sx={{ mt: { xs: 1, md: 0 } }}>
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
                      border: 'none',
                    }}
                  />
                </Box>

                {/* Date */}
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontSize: '0.75rem', display: { xs: 'none', md: 'block' } }}
                >
                  {formatDate(tournament.tournament_start_at)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
