import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Amenities from '@/components/Amenities';
import Gallery from '@/components/Gallery';
import Leagues from '@/components/Leagues';
import LiveStreaming from '@/components/LiveStreaming';
import FindUs from '@/components/FindUs';
import { Box } from '@mui/material';
import { fetchTournaments } from '@/lib/challonge';
import { mockTournaments } from '@/lib/challongeMockData';
import type { Tournament } from '@/lib/challonge';

export const revalidate = 300; // re-fetch every 5 minutes

export default async function Home() {
  const liveTournaments = await fetchTournaments(4);

  // Use live data if available, otherwise fall back to mock data
  const tournaments: Tournament[] = liveTournaments ?? mockTournaments.map((t) => ({
    id: t.id,
    name: t.name,
    url: t.url,
    tournament_type: t.tournament_type,
    state: t.state,
    starts_at: t.starts_at,
    game_name: t.game_name,
    participants_count: t.participants_count,
  }));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Hero />
      <Stats />
      <Amenities />
      <Gallery />
      <Leagues tournaments={tournaments} />
      <LiveStreaming />
      <FindUs />
    </Box>
  );
}
