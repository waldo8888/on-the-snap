import Link from 'next/link';
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';
import { getLeagues } from '@/lib/tournaments';
import type { LeagueWithDetails } from '@/lib/tournament-engine/types';

export const revalidate = 120;

export const metadata = {
  title: 'Leagues | On The Snap',
  description:
    'Browse published On The Snap leagues, active seasons, recent linked tournaments, and standings previews.',
};

export default async function LeaguesPage() {
  const leagues = (await getLeagues({ published: true })) as LeagueWithDetails[];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: 10 }}>
        <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: { xs: '2.3rem', md: '3.5rem' },
                color: '#f5f5f0',
                mb: 1,
              }}
            >
              League Seasons
            </Typography>
            <Typography sx={{ color: '#a0a0a0', maxWidth: 760, lineHeight: 1.7 }}>
              Every published league season rolls up linked tournament results into a live standings
              table. Open a league to track its active season, archive, and player profiles.
            </Typography>
          </Box>

          <Link href="/leaderboard" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
            <Button
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
              Find Your Player Profile
            </Button>
          </Link>
        </Box>

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
                <Typography
                  sx={{
                    color: '#D4AF37',
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    mb: 1,
                  }}
                >
                  {league.game_type ? league.game_type.replace(/_/g, ' ') : 'Mixed formats'}
                </Typography>
                <Typography
                  sx={{
                    color: '#f5f5f0',
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: '1.6rem',
                    mb: 1,
                  }}
                >
                  {league.name}
                </Typography>
                <Typography sx={{ color: '#a0a0a0', lineHeight: 1.7, mb: 2 }}>
                  {league.description || 'League play built from linked tournament results and public season standings.'}
                </Typography>

                <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1 }}>
                  {league.activeSeason
                    ? `Active season: ${league.activeSeason.name}`
                    : 'No active season right now'}
                </Typography>
                <Typography sx={{ color: '#8f8f8f', fontSize: '0.9rem', mb: 2 }}>
                  {league.recentTournaments?.length ?? 0} linked tournament
                  {(league.recentTournaments?.length ?? 0) === 1 ? '' : 's'}
                </Typography>

                {(league.standingsPreview?.length ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2 }}>
                    {league.standingsPreview!.slice(0, 5).map((entry, index) => (
                      <Typography key={entry.player_id} sx={{ color: index === 0 ? '#D4AF37' : '#d7d7d2', fontSize: '0.9rem' }}>
                        {index + 1}.{' '}
                        <Link href={`/players/${entry.player_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {entry.display_name}
                        </Link>{' '}
                        · {entry.points} pts
                      </Typography>
                    ))}
                  </Box>
                )}

                <Link href={`/leagues/${league.slug}`} style={{ textDecoration: 'none' }}>
                  <Button
                    variant="outlined"
                    sx={{
                      mt: 1,
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
                    Open League
                  </Button>
                </Link>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
