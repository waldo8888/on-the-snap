'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type {
  GameType,
  PlayerLeaderboardEntry,
  TournamentFormat,
} from '@/lib/tournament-engine/types';

const gameTypeOptions: Array<{ value: GameType | 'all'; label: string }> = [
  { value: 'all', label: 'All Games' },
  { value: '8-ball', label: '8-Ball' },
  { value: '9-ball', label: '9-Ball' },
  { value: '10-ball', label: '10-Ball' },
  { value: 'straight_pool', label: 'Straight Pool' },
  { value: 'scotch_doubles', label: 'Scotch Doubles' },
];

const formatOptions: Array<{ value: TournamentFormat | 'all'; label: string }> = [
  { value: 'all', label: 'All Formats' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
];

function formatLastPlayed(value: string | null) {
  if (!value) {
    return 'No completed matches';
  }

  return new Date(value).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface LeaderboardClientProps {
  entries: PlayerLeaderboardEntry[];
  currentGameType: GameType | 'all';
  currentFormat: TournamentFormat | 'all';
  currentQuery: string;
}

export default function LeaderboardClient({
  entries,
  currentGameType,
  currentFormat,
  currentQuery,
}: LeaderboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentQuery);

  useEffect(() => {
    setSearch(currentQuery);
  }, [currentQuery]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (normalizedSearch && !entry.display_name.toLowerCase().includes(normalizedSearch)) {
        return false;
      }

      return true;
    });
  }, [entries, search]);

  const updateUrl = (
    nextGameType: GameType | 'all',
    nextFormat: TournamentFormat | 'all',
    nextQuery: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextGameType === 'all') {
      params.delete('gameType');
    } else {
      params.set('gameType', nextGameType);
    }

    if (nextFormat === 'all') {
      params.delete('format');
    } else {
      params.set('format', nextFormat);
    }

    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim());
    } else {
      params.delete('q');
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 220px 220px' },
          gap: 1.5,
        }}
      >
        <TextField
          label="Search players"
          value={search}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setSearch(nextQuery);
            updateUrl(currentGameType, currentFormat, nextQuery);
          }}
          fullWidth
          slotProps={{
            inputLabel: { sx: { color: 'text.secondary' } },
            input: {
              sx: {
                color: '#f5f5f0',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212,175,55,0.15)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
              },
            },
          }}
        />

        <TextField
          select
          label="Game Type"
          value={currentGameType}
          onChange={(event) =>
            updateUrl(event.target.value as GameType | 'all', currentFormat, search)
          }
          fullWidth
          slotProps={{ inputLabel: { sx: { color: 'text.secondary' } } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#f5f5f0',
              '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
              '&:hover fieldset': { borderColor: '#D4AF37' },
              '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
            },
          }}
        >
          {gameTypeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Format"
          value={currentFormat}
          onChange={(event) =>
            updateUrl(currentGameType, event.target.value as TournamentFormat | 'all', search)
          }
          fullWidth
          slotProps={{ inputLabel: { sx: { color: 'text.secondary' } } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#f5f5f0',
              '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
              '&:hover fieldset': { borderColor: '#D4AF37' },
              '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
            },
          }}
        >
          {formatOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Alert
        severity="info"
        sx={{
          bgcolor: 'rgba(212,175,55,0.08)',
          color: '#f5f5f0',
          border: '1px solid rgba(212,175,55,0.16)',
          '& .MuiAlert-icon': { color: '#D4AF37' },
        }}
      >
        Find yourself by name, then open your profile for full match history. Points: 1 per
        tournament appearance, 3 per match win, 12 for a title, and 6 for a runner-up finish.
      </Alert>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={`${filteredEntries.length} ranked player${filteredEntries.length === 1 ? '' : 's'}`}
          sx={{
            bgcolor: 'rgba(212,175,55,0.12)',
            color: '#D4AF37',
            fontWeight: 700,
          }}
        />
        {(currentGameType !== 'all' || currentFormat !== 'all') && (
          <Chip
            label="Filtered view"
            sx={{
              bgcolor: 'rgba(57,168,122,0.12)',
              color: '#81c784',
              fontWeight: 700,
            }}
          />
        )}
      </Box>

      {filteredEntries.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1 }}>
            No leaderboard entries match these filters
          </Typography>
          <Typography sx={{ color: '#a0a0a0' }}>
            Try a different search term or filter combination.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& .MuiTableCell-head': {
                    bgcolor: 'rgba(212,175,55,0.06)',
                    color: '#D4AF37',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid rgba(212,175,55,0.12)',
                  },
                }}
              >
                <TableCell>Rank</TableCell>
                <TableCell>Player</TableCell>
                <TableCell align="right">Points</TableCell>
                <TableCell align="right">Titles</TableCell>
                <TableCell align="right">Wins</TableCell>
                <TableCell align="right">Win Rate</TableCell>
                <TableCell align="right">Events</TableCell>
                <TableCell align="right">Last Played</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.map((entry, index) => (
                <TableRow
                  key={entry.player_id}
                  sx={{
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      color: '#f5f5f0',
                    },
                    '&:hover': { bgcolor: 'rgba(212,175,55,0.03)' },
                  }}
                >
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>
                    #{index + 1}
                  </TableCell>
                  <TableCell>
                    <Typography
                      component={Link}
                      href={`/players/${entry.player_id}`}
                      sx={{
                        color: '#f5f5f0',
                        fontWeight: 700,
                        textDecoration: 'none',
                        '&:hover': { color: '#D4AF37' },
                      }}
                    >
                      {entry.display_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                    {entry.points}
                  </TableCell>
                  <TableCell align="right">{entry.titles}</TableCell>
                  <TableCell align="right">{entry.match_wins}</TableCell>
                  <TableCell align="right">{entry.win_rate.toFixed(2)}%</TableCell>
                  <TableCell align="right">{entry.tournaments_played}</TableCell>
                  <TableCell align="right" sx={{ color: '#a0a0a0' }}>
                    {formatLastPlayed(entry.last_played_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
