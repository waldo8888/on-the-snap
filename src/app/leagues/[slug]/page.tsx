import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';
import { getLeagueBySlug } from '@/lib/tournaments';

export const revalidate = 120;

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug, { publishedOnly: true });

  if (!league) {
    notFound();
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: 10 }}>
        <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: '#D4AF37', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', mb: 1 }}>
              League Overview
            </Typography>
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
              {league.name}
            </Typography>
            <Typography sx={{ color: '#a0a0a0', maxWidth: 760, lineHeight: 1.7 }}>
              {league.description || 'Published league view with active season standings, archive, and linked tournaments.'}
            </Typography>
          </Box>

          <Link href="/leagues" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
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
              Back to Leagues
            </Button>
          </Link>
        </Box>

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
              <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
                {league.activeSeason
                  ? `Active season: ${league.activeSeason.name}`
                  : 'No active season'}
              </Typography>
              <Typography sx={{ color: '#a0a0a0', lineHeight: 1.7, mb: 2 }}>
                {league.activeSeason?.description ||
                  'Activate a season to publish standings and link tournaments into a single table.'}
              </Typography>

              {league.activeSeason && (
                <Link
                  href={`/leagues/${league.slug}/seasons/${league.activeSeason.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#050505',
                      fontWeight: 800,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#e0bb53' },
                    }}
                  >
                    View Active Season Standings
                  </Button>
                </Link>
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
                <Typography sx={{ color: '#a0a0a0' }}>No linked tournaments are published yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {league.recentTournaments!.map((tournament) => (
                    <Box key={tournament.id} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 1.2 }}>
                      <Link href={`/tournaments/${tournament.slug}`} style={{ color: '#f5f5f0', textDecoration: 'none', fontWeight: 700 }}>
                        {tournament.title}
                      </Link>
                      <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mt: 0.4 }}>
                        {new Date(tournament.tournament_start_at).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {tournament.format.replace(/_/g, ' ')}
                      </Typography>
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
                mb: 3,
              }}
            >
              <Typography sx={{ color: '#f5f5f0', fontWeight: 700, mb: 2 }}>
                Standings Teaser
              </Typography>

              {(league.standingsPreview?.length ?? 0) === 0 ? (
                <Typography sx={{ color: '#a0a0a0' }}>
                  Standings will populate after linked tournaments publish results.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {league.standingsPreview!.map((entry, index) => (
                    <Typography key={entry.player_id} sx={{ color: index === 0 ? '#D4AF37' : '#d7d7d2' }}>
                      {index + 1}.{' '}
                      <Link href={`/players/${entry.player_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {entry.display_name}
                      </Link>{' '}
                      · {entry.points} pts
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
                Season Archive
              </Typography>

              {(league.seasons?.length ?? 0) === 0 ? (
                <Typography sx={{ color: '#a0a0a0' }}>No seasons published yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {league.seasons!.map((season) => (
                    <Box key={season.id}>
                      <Link
                        href={`/leagues/${league.slug}/seasons/${season.slug}`}
                        style={{ color: '#f5f5f0', textDecoration: 'none', fontWeight: 700 }}
                      >
                        {season.name}
                      </Link>
                      <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mt: 0.35 }}>
                        {season.status} ·{' '}
                        {new Date(season.start_at).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
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
