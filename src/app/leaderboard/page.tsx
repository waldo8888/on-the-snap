import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import LeaderboardClient from './LeaderboardClient';
import { getPlayerLeaderboard } from '@/lib/tournaments';
import type { GameType, TournamentFormat } from '@/lib/tournament-engine/types';

export const revalidate = 60;

export const metadata = {
  title: 'Player Leaderboard | On The Snap',
  description: 'Career rankings, points, titles, and win rates for On The Snap tournament players.',
};

const validGameTypes: Array<GameType | 'all'> = [
  'all',
  '8-ball',
  '9-ball',
  '10-ball',
  'straight_pool',
  'scotch_doubles',
];

const validFormats: Array<TournamentFormat | 'all'> = [
  'all',
  'single_elimination',
  'double_elimination',
  'round_robin',
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gameType?: string; format?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameType = validGameTypes.includes((resolvedSearchParams.gameType ?? 'all') as GameType | 'all')
    ? ((resolvedSearchParams.gameType ?? 'all') as GameType | 'all')
    : 'all';
  const format = validFormats.includes((resolvedSearchParams.format ?? 'all') as TournamentFormat | 'all')
    ? ((resolvedSearchParams.format ?? 'all') as TournamentFormat | 'all')
    : 'all';
  const q = resolvedSearchParams.q?.trim() ?? '';

  const entries = await getPlayerLeaderboard({ gameType, format });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: 10 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 2,
            flexWrap: 'wrap',
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: { xs: '2.4rem', md: '3.6rem' },
                color: '#f5f5f0',
                lineHeight: 1.05,
                mb: 1,
              }}
            >
              Player Leaderboard
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                color: '#a0a0a0',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                maxWidth: 760,
                lineHeight: 1.7,
              }}
            >
              Canonical player profiles roll up tournament appearances, match wins, titles, and
              runner-up finishes across published events. Search by name to find your player card
              and deep-link directly to a filtered ranking view.
            </Typography>
          </Box>

          <Link href="/tournaments" style={{ textDecoration: 'none' }}>
            <Button
              variant="outlined"
              sx={{
                borderColor: 'rgba(212,175,55,0.24)',
                color: '#D4AF37',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#D4AF37',
                  bgcolor: 'rgba(212,175,55,0.05)',
                },
              }}
            >
              Browse Tournaments
            </Button>
          </Link>
        </Box>

        <LeaderboardClient
          entries={entries}
          currentGameType={gameType}
          currentFormat={format}
          currentQuery={q}
        />
      </Container>
    </Box>
  );
}
