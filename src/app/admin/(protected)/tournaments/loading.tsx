import { Box, CircularProgress } from '@mui/material';

export default function Loading() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#D4AF37' }} />
    </Box>
  );
}
