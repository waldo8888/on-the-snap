import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Navbar from '@/components/Navbar';
import { getSeasonBySlug } from '@/lib/tournaments';

export const revalidate = 120;

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ slug: string; seasonSlug: string }>;
}) {
  const { slug, seasonSlug } = await params;
  const season = await getSeasonBySlug(slug, seasonSlug, { publishedOnly: true });

  if (!season || !season.league) {
    notFound();
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: 10 }}>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ color: '#D4AF37', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', mb: 1 }}>
            {season.league.name}
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
            {season.name}
          </Typography>
          <Typography sx={{ color: '#a0a0a0', maxWidth: 760, lineHeight: 1.7 }}>
            {season.description || 'Season standings aggregate points and tiebreakers from linked published tournaments only.'}
          </Typography>
        </Box>

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
            Season Standings
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& .MuiTableCell-head': {
                      color: '#D4AF37',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
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
                </TableRow>
              </TableHead>
              <TableBody>
                {(season.standings ?? []).map((entry, index) => (
                  <TableRow
                    key={entry.player_id}
                    sx={{
                      '& .MuiTableCell-root': {
                        color: '#f5f5f0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      },
                    }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Link href={`/players/${entry.player_id}`} style={{ color: '#f5f5f0', textDecoration: 'none' }}>
                        {entry.display_name}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{entry.points}</TableCell>
                    <TableCell align="right">{entry.titles}</TableCell>
                    <TableCell align="right">{entry.match_wins}</TableCell>
                    <TableCell align="right">{entry.win_rate.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
            Linked Tournament Schedule & Results
          </Typography>

          {(season.tournaments?.length ?? 0) === 0 ? (
            <Typography sx={{ color: '#a0a0a0' }}>
              No linked tournaments are published for this season yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {season.tournaments!.map((tournament) => (
                <Box key={tournament.id} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 1.2 }}>
                  <Link href={`/tournaments/${tournament.slug}`} style={{ color: '#f5f5f0', textDecoration: 'none', fontWeight: 700 }}>
                    {tournament.title}
                  </Link>
                  <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', mt: 0.35 }}>
                    {new Date(tournament.tournament_start_at).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {tournament.status} · {tournament.format.replace(/_/g, ' ')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
