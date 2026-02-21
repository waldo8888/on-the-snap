import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Amenities from '@/components/Amenities';
import Leagues from '@/components/Leagues';
import LiveStreaming from '@/components/LiveStreaming';
import { Box } from '@mui/material';

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Hero />
      <Stats />
      <Amenities />
      <Leagues />
      <LiveStreaming />
    </Box>
  );
}
