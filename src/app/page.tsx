import Hero from '@/components/Hero';
import Amenities from '@/components/Amenities';
import Leagues from '@/components/Leagues';
import LiveStreaming from '@/components/LiveStreaming';
import { Box } from '@mui/material';

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Hero />
      <Amenities />
      <Leagues />
      <LiveStreaming />
    </Box>
  );
}
