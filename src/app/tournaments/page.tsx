import { Box, Container, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';
import { getTournaments } from '@/lib/tournaments';
import TournamentListing from './TournamentListing';

export const revalidate = 60;

export const metadata = {
  title: 'Tournaments | On The Snap',
  description: 'Weekly competitive pool tournaments at On The Snap. View upcoming, live, and completed tournaments.',
};

export default async function TournamentsPage() {
  const tournaments = await getTournaments({ published: true });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <Navbar />

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 14, md: 18 },
          pb: { xs: 6, md: 10 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h1"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              fontSize: { xs: '2.5rem', md: '4rem' },
              color: '#f5f5f0',
              mb: 2,
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'shimmer 3s ease-in-out infinite',
              '@keyframes shimmer': {
                '0%, 100%': { backgroundPosition: '0% center' },
                '50%': { backgroundPosition: '200% center' },
              },
            }}
          >
            Tournaments
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: '#a0a0a0',
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.15rem' },
              letterSpacing: '0.02em',
            }}
          >
            Weekly competitive pool at On The Snap
          </Typography>
        </Container>
      </Box>

      {/* Tournament Listing (Client Component) */}
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <TournamentListing tournaments={tournaments} />
      </Container>
    </Box>
  );
}
