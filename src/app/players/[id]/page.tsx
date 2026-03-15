import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import Navbar from '@/components/Navbar';
import { getPlayerLeaderboard, getPlayerProfileData } from '@/lib/tournaments';

export const revalidate = 60;

function formatTournamentFormat(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatGameType(value: string) {
  return value
    .split('_')
    .map((part) =>
      part
        .split('-')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('-')
    )
    .join(' ');
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No completed matches yet';
  }

  return new Date(value).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPlacement(place: number | null) {
  if (!place) {
    return 'In progress';
  }

  const remainderTen = place % 10;
  const remainderHundred = place % 100;

  if (remainderTen === 1 && remainderHundred !== 11) return `${place}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${place}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${place}rd`;
  return `${place}th`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPlayerProfileData(id);

  if (!profile) {
    return { title: 'Player Not Found | On The Snap' };
  }

  return {
    title: `${profile.player.display_name} | On The Snap`,
    description: `${profile.player.display_name}'s tournament profile, match history, and career stats.`,
  };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, leaderboard] = await Promise.all([
    getPlayerProfileData(id),
    getPlayerLeaderboard(),
  ]);

  if (!profile) {
    notFound();
  }

  const leaderboardEntry = leaderboard.find((entry) => entry.player_id === id) ?? null;
  const rank = leaderboardEntry ? leaderboard.findIndex((entry) => entry.player_id === id) + 1 : null;
  const summaryCards = [
    { label: 'Points', value: leaderboardEntry?.points ?? 0, accent: '#D4AF37' },
    { label: 'Titles', value: profile.stats.titles, accent: '#f5f5f0' },
    { label: 'Win Rate', value: `${profile.stats.win_rate.toFixed(2)}%`, accent: '#39a87a' },
    { label: 'Events', value: profile.stats.tournaments_played, accent: '#90caf9' },
    {
      label: 'Favorite Game',
      value: profile.summary.favorite_game_type
        ? formatGameType(profile.summary.favorite_game_type)
        : 'Mixed',
      accent: '#ffcc80',
    },
    {
      label: 'Best Finish',
      value: profile.summary.best_finish
        ? formatPlacement(profile.summary.best_finish)
        : 'In progress',
      accent: '#ce93d8',
    },
    {
      label: 'Last 5',
      value:
        profile.summary.last_five_form.length > 0
          ? profile.summary.last_five_form.join(' ')
          : 'No form yet',
      accent: '#80cbc4',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 4 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {rank && (
                <Chip
                  label={`Rank #${rank}`}
                  sx={{
                    bgcolor: 'rgba(212,175,55,0.12)',
                    color: '#D4AF37',
                    fontWeight: 700,
                  }}
                />
              )}
              <Chip
                label={`${profile.stats.match_wins}-${profile.stats.match_losses}`}
                sx={{
                  bgcolor: 'rgba(57,168,122,0.12)',
                  color: '#81c784',
                  fontWeight: 700,
                }}
              />
            </Box>

            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: { xs: '2.2rem', md: '3.4rem' },
                color: '#f5f5f0',
                lineHeight: 1.05,
                mb: 1,
              }}
            >
              {profile.player.display_name}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                color: '#a0a0a0',
                fontSize: '1rem',
                lineHeight: 1.7,
                maxWidth: 720,
              }}
            >
              Canonical player profile across published On The Snap events, including tournament
              finishes, recent results, and career totals.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
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
                Back to Leaderboard
              </Button>
            </Link>
          </Box>
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {summaryCards.map((card) => (
            <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.25,
                  bgcolor: '#111111',
                  border: '1px solid rgba(212,175,55,0.12)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  sx={{
                    color: card.accent,
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    mb: 0.35,
                  }}
                >
                  {card.value}
                </Typography>
                <Typography
                  sx={{
                    color: '#8b8b86',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: '#111111',
                border: '1px solid rgba(212,175,55,0.12)',
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: '#f5f5f0',
                  fontSize: '1.2rem',
                  mb: 2,
                }}
              >
                Recent Tournaments
              </Typography>

              {profile.tournaments.length === 0 ? (
                <Typography sx={{ color: '#a0a0a0' }}>
                  No published tournament history yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {profile.tournaments.slice(0, 10).map((entry, index) => (
                    <Box key={`${entry.tournament_id}-${entry.participant_id}`}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Link
                            href={`/tournaments/${entry.tournament_slug}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Typography
                              sx={{
                                color: '#f5f5f0',
                                fontWeight: 700,
                                textDecoration: 'none',
                                '&:hover': { color: '#D4AF37' },
                              }}
                            >
                              {entry.tournament_title}
                            </Typography>
                          </Link>
                          <Typography sx={{ color: '#8b8b86', fontSize: '0.82rem', mt: 0.35 }}>
                            {formatGameType(entry.tournament_game_type)} •{' '}
                            {formatTournamentFormat(entry.tournament_format)} •{' '}
                            {formatDate(entry.tournament_start_at)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Chip
                            label={formatPlacement(entry.final_place)}
                            sx={{
                              bgcolor: 'rgba(212,175,55,0.12)',
                              color: '#D4AF37',
                              fontWeight: 700,
                            }}
                          />
                          {entry.recent_result && (
                            <Chip
                              label={`Last score ${entry.recent_result}`}
                              sx={{
                                bgcolor: 'rgba(255,255,255,0.06)',
                                color: '#d7d7d2',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      {index < profile.tournaments.slice(0, 10).length - 1 && (
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 1.5 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
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
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: '#f5f5f0',
                  fontSize: '1.2rem',
                  mb: 2,
                }}
              >
                Recent Match Results
              </Typography>

              {profile.matches.length === 0 ? (
                <Typography sx={{ color: '#a0a0a0' }}>
                  No completed matches recorded yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {profile.matches.slice(0, 12).map((match, index) => (
                    <Box key={match.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                          <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                            {match.result === 'win' ? 'Win' : 'Loss'} vs{' '}
                            {match.opponent_player_id ? (
                              <Link
                                href={`/players/${match.opponent_player_id}`}
                                style={{ textDecoration: 'none' }}
                              >
                                <Typography
                                  component="span"
                                  sx={{
                                    display: 'inline',
                                    color: '#D4AF37',
                                    textDecoration: 'none',
                                    '&:hover': { color: '#f5f5f0' },
                                  }}
                                >
                                  {match.opponent_name}
                                </Typography>
                              </Link>
                            ) : (
                              <Typography component="span" sx={{ display: 'inline', color: '#D4AF37' }}>
                                {match.opponent_name}
                              </Typography>
                            )}
                          </Typography>
                          <Typography sx={{ color: '#8b8b86', fontSize: '0.82rem', mt: 0.35 }}>
                            <Link
                              href={`/tournaments/${match.tournament_slug}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {match.tournament_title}
                            </Link>
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ color: match.result === 'win' ? '#81c784' : '#ef9a9a', fontWeight: 700 }}>
                            {match.scoreline ?? 'No score'}
                          </Typography>
                          <Typography sx={{ color: '#8b8b86', fontSize: '0.78rem', mt: 0.35 }}>
                            {formatDate(match.completed_at ?? match.started_at ?? match.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                      {index < profile.matches.slice(0, 12).length - 1 && (
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 1.25 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
