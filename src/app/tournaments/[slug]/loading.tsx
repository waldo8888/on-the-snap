import { Box, CircularProgress } from '@mui/material';

export default function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#070707' }}>
      <CircularProgress sx={{ color: '#D4AF37' }} />
    </Box>
  );
}
