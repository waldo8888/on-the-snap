'use client';

import { Chip } from '@mui/material';
import type { TournamentStatus, MatchStatus } from '@/lib/tournament-engine/types';

const tournamentStatusConfig: Record<TournamentStatus, { label: string; color: string; bgColor: string; pulse?: boolean }> = {
  draft: { label: 'Draft', color: '#888', bgColor: 'rgba(136,136,136,0.12)' },
  open: { label: 'Registration Open', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.12)' },
  check_in: { label: 'Check-In', color: '#42a5f5', bgColor: 'rgba(66,165,245,0.12)' },
  live: { label: 'LIVE', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)', pulse: true },
  completed: { label: 'Completed', color: '#39a87a', bgColor: 'rgba(57,168,122,0.12)' },
  cancelled: { label: 'Cancelled', color: '#ef5350', bgColor: 'rgba(239,83,80,0.12)' },
};

const matchStatusConfig: Record<MatchStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#888', bgColor: 'rgba(136,136,136,0.12)' },
  ready: { label: 'Ready', color: '#42a5f5', bgColor: 'rgba(66,165,245,0.12)' },
  in_progress: { label: 'In Progress', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)' },
  completed: { label: 'Completed', color: '#39a87a', bgColor: 'rgba(57,168,122,0.12)' },
  bye: { label: 'BYE', color: '#888', bgColor: 'rgba(136,136,136,0.08)' },
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const config = tournamentStatusConfig[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        color: config.color,
        bgcolor: config.bgColor,
        border: `1px solid ${config.color}33`,
        fontWeight: 600,
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        animation: config.pulse ? 'glowPulse 2s ease-in-out infinite' : 'none',
      }}
    />
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config = matchStatusConfig[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        color: config.color,
        bgcolor: config.bgColor,
        border: `1px solid ${config.color}33`,
        fontWeight: 500,
        fontSize: '0.65rem',
        letterSpacing: '0.05em',
      }}
    />
  );
}

export function GameTypeBadge({ gameType }: { gameType: string }) {
  return (
    <Chip
      label={gameType}
      size="small"
      sx={{
        color: '#39a87a',
        bgcolor: 'rgba(57,168,122,0.1)',
        border: '1px solid rgba(57,168,122,0.2)',
        fontWeight: 500,
        fontSize: '0.7rem',
      }}
    />
  );
}

export function FormatBadge({ format }: { format: string }) {
  const label = format.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      sx={{
        color: '#a0a0a0',
        borderColor: 'rgba(160,160,160,0.2)',
        fontWeight: 500,
        fontSize: '0.7rem',
      }}
    />
  );
}
