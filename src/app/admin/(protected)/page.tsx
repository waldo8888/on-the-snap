'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@insforge/nextjs';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { insforge } from '@/lib/insforge';
import type { Tournament } from '@/lib/tournament-engine/types';

interface DashboardStats {
  total: number;
  live: number;
  upcoming: number;
  totalPlayers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, live: 0, upcoming: 0, totalPlayers: 0 });
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [tournamentsRes, participantsRes] = await Promise.all([
          insforge.database.from('tournaments').select('*').order('tournament_start_at', { ascending: false }),
          insforge.database.from('participants').select('id', { count: 'exact', head: true }),
        ]);

        if (tournamentsRes.error) throw tournamentsRes.error;
        if (participantsRes.error) throw participantsRes.error;

        const tournaments = (tournamentsRes.data as Tournament[]) || [];
        const totalPlayers = participantsRes.count || 0;

        const now = new Date().toISOString();
        const live = tournaments.filter((t) => t.status === 'live').length;
        const upcoming = tournaments.filter(
          (t) => (t.status === 'draft' || t.status === 'open') && t.tournament_start_at > now
        ).length;

        setStats({ total: tournaments.length, live, upcoming, totalPlayers });
        setRecentTournaments(tournaments.slice(0, 5));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Tournaments', value: stats.total, icon: <EmojiEventsIcon />, color: '#D4AF37' },
    { label: 'Live Now', value: stats.live, icon: <PlayCircleIcon />, color: '#ef5350' },
    { label: 'Upcoming', value: stats.upcoming, icon: <ScheduleIcon />, color: '#42a5f5' },
    { label: 'Total Players', value: stats.totalPlayers, icon: <PeopleIcon />, color: '#66bb6a' },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'live': return '#D4AF37';
      case 'completed': return '#66bb6a';
      case 'open': return '#42a5f5';
      case 'draft': return '#9e9e9e';
      case 'cancelled': return '#ef5350';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Admin
      </Typography>

      {/* Welcome Header */}
      <Box sx={{ mb: 4, mt: 1 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
            mb: 0.5,
          }}
        >
          Welcome back, {user?.profile?.name || 'Admin'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Here is what is happening with your tournaments.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          {error}
        </Alert>
      )}

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid key={card.label} size={{ xs: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: 2,
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: 'rgba(212,175,55,0.25)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif', mb: 0.5 }}
              >
                {card.value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {card.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
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
          Create Tournament
        </Button>
        <Button
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={() => window.open('/', '_blank')}
          sx={{
            borderColor: 'rgba(212,175,55,0.3)',
            color: '#D4AF37',
            textTransform: 'none',
            '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
          }}
        >
          View Public Site
        </Button>
      </Box>

      {/* Recent Tournaments */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#f5f5f0', fontSize: '1rem' }}
          >
            Recent Tournaments
          </Typography>
          <Button
            size="small"
            onClick={() => router.push('/admin/tournaments')}
            sx={{ color: '#D4AF37', textTransform: 'none', fontSize: '0.8rem' }}
          >
            View All
          </Button>
        </Box>

        {recentTournaments.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <EmojiEventsIcon sx={{ fontSize: 48, color: 'rgba(212,175,55,0.2)', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No tournaments yet. Create your first one!
            </Typography>
          </Box>
        ) : (
          recentTournaments.map((tournament, idx) => (
            <Box
              key={tournament.id}
              onClick={() => router.push(`/admin/tournaments/${tournament.id}`)}
              sx={{
                px: 2.5,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                borderTop: idx === 0 ? '1px solid rgba(212,175,55,0.08)' : 'none',
                borderBottom: '1px solid rgba(212,175,55,0.08)',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#f5f5f0', mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {tournament.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {tournament.game_type} &middot; {tournament.format.replace(/_/g, ' ')} &middot; {formatDate(tournament.tournament_start_at)}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: `${statusColor(tournament.status)}18`,
                  color: statusColor(tournament.status),
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}
              >
                {tournament.status}
              </Box>
              <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
}
