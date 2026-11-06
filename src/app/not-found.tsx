'use client';

import Link from 'next/link';
import { Box, Typography, Button } from '@mui/material';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#070707',
        gap: 2,
        px: 3,
      }}
    >
      <Typography
        sx={{
          color: '#f5f5f0',
          fontFamily: '"Playfair Display", serif',
          fontSize: '1.5rem',
          textAlign: 'center',
        }}
      >
        Page not found
      </Typography>
      <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem', textAlign: 'center' }}>
        That page does not exist or has moved.
      </Typography>
      <Button
        component={Link}
        href="/"
        variant="outlined"
        sx={{
          mt: 1,
          color: '#D4AF37',
          borderColor: '#D4AF37',
          textTransform: 'none',
          '&:hover': { borderColor: '#c5a030', bgcolor: 'rgba(212,175,55,0.06)' },
        }}
      >
        Back to home
      </Button>
    </Box>
  );
}
