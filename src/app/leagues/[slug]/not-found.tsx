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
          color: '#D4AF37',
          fontFamily: '"Playfair Display", serif',
          fontSize: '3rem',
          fontWeight: 700,
        }}
      >
        404
      </Typography>
      <Typography
        sx={{
          color: '#f5f5f0',
          fontFamily: '"Playfair Display", serif',
          fontSize: '1.3rem',
          textAlign: 'center',
        }}
      >
        League not found
      </Typography>
      <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem', textAlign: 'center' }}>
        This league may have been removed or the link is incorrect.
      </Typography>
      <Button
        href="/leagues"
        variant="outlined"
        sx={{
          mt: 1,
          color: '#D4AF37',
          borderColor: '#D4AF37',
          textTransform: 'none',
          '&:hover': { borderColor: '#c5a030', bgcolor: 'rgba(212,175,55,0.06)' },
        }}
      >
        Browse Leagues
      </Button>
    </Box>
  );
}
