'use client';

import { Box, Typography, Button } from '@mui/material';
export default function Error({ reset }: { error: Error; reset: () => void }) {
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
        Something went wrong
      </Typography>
      <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem', textAlign: 'center' }}>
        We couldn&apos;t load this tournament. Please try again.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
        <Button
          onClick={reset}
          variant="outlined"
          sx={{
            color: '#D4AF37',
            borderColor: '#D4AF37',
            textTransform: 'none',
            '&:hover': { borderColor: '#c5a030', bgcolor: 'rgba(212,175,55,0.06)' },
          }}
        >
          Try Again
        </Button>
        <Button
          href="/tournaments"
          variant="text"
          sx={{
            color: '#a0a0a0',
            textTransform: 'none',
            '&:hover': { color: '#f5f5f0' },
          }}
        >
          All Tournaments
        </Button>
      </Box>
    </Box>
  );
}
