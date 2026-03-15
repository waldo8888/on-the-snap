'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { Match, Participant } from '@/lib/tournament-engine/types';

interface RoundRobinTableProps {
  matches: Match[];
  participants: Participant[];
}

interface Standing {
  participant: Participant;
  wins: number;
  losses: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
}

export default function RoundRobinTable({ matches, participants }: RoundRobinTableProps) {
  const standings = useMemo(() => {
    const stats = new Map<string, Standing>();

    participants.forEach((p) => {
      stats.set(p.id, {
        participant: p,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    });

    matches
      .filter((m) => m.status === 'completed' && m.winner_id)
      .forEach((m) => {
        const p1 = stats.get(m.player1_id!);
        const p2 = stats.get(m.player2_id!);

        if (p1) {
          p1.matchesPlayed++;
          p1.pointsFor += m.player1_score || 0;
          p1.pointsAgainst += m.player2_score || 0;
          if (m.winner_id === m.player1_id) p1.wins++;
          else p1.losses++;
        }

        if (p2) {
          p2.matchesPlayed++;
          p2.pointsFor += m.player2_score || 0;
          p2.pointsAgainst += m.player1_score || 0;
          if (m.winner_id === m.player2_id) p2.wins++;
          else p2.losses++;
        }
      });

    return Array.from(stats.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aDiff = a.pointsFor - a.pointsAgainst;
      const bDiff = b.pointsFor - b.pointsAgainst;
      return bDiff - aDiff;
    });
  }, [matches, participants]);

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        bgcolor: 'rgba(15,15,15,0.8)',
        border: '1px solid rgba(212,175,55,0.1)',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              #
            </TableCell>
            <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              Player
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              W
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              L
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              PF
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              PA
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              +/-
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((s, idx) => (
            <TableRow
              key={s.participant.id}
              sx={{
                bgcolor: idx === 0 ? 'rgba(212,175,55,0.05)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(212,175,55,0.03)' },
              }}
            >
              <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {idx === 0 && <EmojiEventsIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                  <Typography variant="body2" sx={{ fontWeight: 600, color: idx === 0 ? 'primary.main' : 'text.primary' }}>
                    {idx + 1}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? 'primary.main' : 'text.primary' }}>
                  {s.participant.name}
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#39a87a', fontWeight: 600 }}>
                {s.wins}
              </TableCell>
              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ef5350', fontWeight: 600 }}>
                {s.losses}
              </TableCell>
              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'text.secondary' }}>
                {s.pointsFor}
              </TableCell>
              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'text.secondary' }}>
                {s.pointsAgainst}
              </TableCell>
              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Chip
                  label={s.pointsFor - s.pointsAgainst >= 0 ? `+${s.pointsFor - s.pointsAgainst}` : `${s.pointsFor - s.pointsAgainst}`}
                  size="small"
                  sx={{
                    bgcolor: s.pointsFor - s.pointsAgainst >= 0 ? 'rgba(57,168,122,0.1)' : 'rgba(239,83,80,0.1)',
                    color: s.pointsFor - s.pointsAgainst >= 0 ? '#39a87a' : '#ef5350',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
