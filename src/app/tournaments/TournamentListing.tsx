'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Tabs,
  Tab,
  Grid,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import SportsIcon from '@mui/icons-material/Sports';
import type { Tournament, TournamentStatus } from '@/lib/tournament-engine/types';

type FilterTab = 'all' | 'upcoming' | 'live' | 'completed';

const filterTabConfig: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Live', value: 'live' },
  { label: 'Completed', value: 'completed' },
];

function getStatusesForFilter(filter: FilterTab): TournamentStatus[] | null {
  switch (filter) {
    case 'upcoming':
      return ['draft', 'open', 'check_in'];
    case 'live':
      return ['live'];
    case 'completed':
      return ['completed', 'cancelled'];
    default:
      return null;
  }
}

function formatGameType(gt: string): string {
  return gt
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatTournamentFormat(fmt: string): string {
  return fmt
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isRegistrationOpen(t: Tournament): boolean {
  if (t.status !== 'open') return false;
  const now = new Date();
  if (t.registration_open_at && new Date(t.registration_open_at) > now) return false;
  if (t.registration_close_at && new Date(t.registration_close_at) < now) return false;
  return true;
}

// ── Status Badge ──

function StatusBadge({ tournament }: { tournament: Tournament }) {
  const regOpen = isRegistrationOpen(tournament);

  if (tournament.status === 'live') {
    return (
      <Chip
        label="LIVE"
        size="small"
        sx={{
          bgcolor: '#D4AF37',
          color: '#111',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          animation: 'pulse-live 2s ease-in-out infinite',
          '@keyframes pulse-live': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.5)' },
            '50%': { boxShadow: '0 0 12px 4px rgba(57,168,122,0.4)' },
          },
        }}
      />
    );
  }

  if (regOpen) {
    return (
      <Chip
        label="REGISTRATION OPEN"
        size="small"
        variant="outlined"
        sx={{
          borderColor: '#D4AF37',
          color: '#D4AF37',
          fontWeight: 600,
          fontSize: '0.65rem',
          letterSpacing: '0.06em',
        }}
      />
    );
  }

  if (['open', 'check_in', 'draft'].includes(tournament.status)) {
    return (
      <Chip
        label="UPCOMING"
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'rgba(100,160,255,0.6)',
          color: 'rgba(100,160,255,0.9)',
          fontWeight: 600,
          fontSize: '0.65rem',
          letterSpacing: '0.06em',
        }}
      />
    );
  }

  if (tournament.status === 'completed') {
    return (
      <Chip
        label="COMPLETED"
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'rgba(160,160,160,0.4)',
          color: '#a0a0a0',
          fontWeight: 600,
          fontSize: '0.65rem',
          letterSpacing: '0.06em',
        }}
      />
    );
  }

  return (
    <Chip
      label={tournament.status.toUpperCase()}
      size="small"
      variant="outlined"
      sx={{
        borderColor: 'rgba(160,160,160,0.3)',
        color: '#a0a0a0',
        fontWeight: 600,
        fontSize: '0.65rem',
      }}
    />
  );
}

// ── Tournament Card ──

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: '#111111',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'rgba(212,175,55,0.3)',
            boxShadow: '0 4px 24px rgba(212,175,55,0.08)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Status Badge */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusBadge tournament={tournament} />
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            color: '#f5f5f0',
            fontSize: '1.15rem',
            mb: 1.5,
            lineHeight: 1.3,
          }}
        >
          {tournament.title}
        </Typography>

        {/* Game Type & Format Chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={<SportsIcon sx={{ fontSize: 14, color: '#39a87a !important' }} />}
            label={formatGameType(tournament.game_type)}
            size="small"
            sx={{
              bgcolor: 'rgba(57,168,122,0.1)',
              color: '#39a87a',
              fontSize: '0.72rem',
              fontWeight: 500,
              height: 24,
            }}
          />
          <Chip
            label={formatTournamentFormat(tournament.format)}
            size="small"
            sx={{
              bgcolor: 'rgba(212,175,55,0.08)',
              color: 'rgba(212,175,55,0.8)',
              fontSize: '0.72rem',
              fontWeight: 500,
              height: 24,
            }}
          />
        </Box>

        {/* Date & Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CalendarTodayIcon sx={{ fontSize: 15, color: '#a0a0a0' }} />
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.82rem',
              color: '#a0a0a0',
            }}
          >
            {formatDate(tournament.tournament_start_at)}
            {' \u00B7 '}
            {formatTime(tournament.tournament_start_at)}
          </Typography>
        </Box>

        {/* Player Count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <GroupIcon sx={{ fontSize: 15, color: '#a0a0a0' }} />
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.82rem',
              color: '#a0a0a0',
            }}
          >
            {tournament.max_participants
              ? `${tournament.max_participants} Players Max`
              : 'Open Entry'}
          </Typography>
        </Box>

        {/* Entry Fee & Race To */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {tournament.entry_fee > 0 && (
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.82rem',
                color: '#D4AF37',
                fontWeight: 600,
              }}
            >
              ${tournament.entry_fee} Entry
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.82rem',
              color: '#a0a0a0',
            }}
          >
            Race to {tournament.race_to}
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* View Details Button */}
        <Button
          component={Link}
          href={`/tournaments/${tournament.slug}`}
          variant="outlined"
          fullWidth
          sx={{
            mt: 1,
            borderColor: 'rgba(212,175,55,0.3)',
            color: '#D4AF37',
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            fontSize: '0.82rem',
            textTransform: 'none',
            letterSpacing: '0.02em',
            '&:hover': {
              borderColor: '#D4AF37',
              bgcolor: 'rgba(212,175,55,0.06)',
            },
          }}
        >
          View Details
        </Button>
      </Paper>
    </motion.div>
  );
}

// ── Main Listing Component ──

export default function TournamentListing({ tournaments }: { tournaments: Tournament[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    const statuses = getStatusesForFilter(activeTab);
    if (!statuses) return tournaments;
    return tournaments.filter((t) => statuses.includes(t.status));
  }, [tournaments, activeTab]);

  return (
    <>
      {/* Filter Tabs */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#D4AF37',
              height: 2,
            },
            '& .MuiTab-root': {
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#a0a0a0',
              textTransform: 'none',
              letterSpacing: '0.02em',
              minWidth: 90,
              '&.Mui-selected': {
                color: '#D4AF37',
              },
            },
          }}
        >
          {filterTabConfig.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Box>

      {/* Tournament Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
            }}
          >
            <EmojiEventsIcon
              sx={{ fontSize: 56, color: 'rgba(212,175,55,0.2)', mb: 2 }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Playfair Display", serif',
                color: '#a0a0a0',
                mb: 1,
              }}
            >
              No tournaments found
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                color: 'rgba(160,160,160,0.6)',
                fontSize: '0.9rem',
              }}
            >
              {activeTab === 'live'
                ? 'No tournaments are currently live. Check back soon!'
                : activeTab === 'upcoming'
                  ? 'No upcoming tournaments scheduled yet.'
                  : activeTab === 'completed'
                    ? 'No completed tournaments to show.'
                    : 'No tournaments available at this time.'}
            </Typography>
          </Box>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Grid container spacing={3}>
              {filtered.map((tournament, index) => (
                <Grid key={tournament.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <TournamentCard tournament={tournament} index={index} />
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
