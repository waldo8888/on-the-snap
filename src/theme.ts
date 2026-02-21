'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D4AF37',
      light: '#F0CF70',
      dark: '#9e7f1e',
    },
    secondary: {
      main: '#39a87a', // felt green accent
    },
    background: {
      default: '#070707',
      paper: '#111111',
    },
    text: {
      primary: '#f5f5f0',
      secondary: '#a0a0a0',
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), sans-serif',
    h1: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 500,
    },
    h5: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: 'var(--font-inter), sans-serif',
      fontWeight: 600,
      letterSpacing: '0.06em',
    },
    button: {
      textTransform: 'none',
      letterSpacing: '0.08em',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          transition: 'all 0.3s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #D4AF37 0%, #F0CF70 50%, #D4AF37 100%)',
          backgroundSize: '200% 100%',
          color: '#050505',
          fontWeight: 800,
          '&:hover': {
            backgroundPosition: '100% 0',
            boxShadow: '0 0 30px rgba(212,175,55,0.5)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 15, 15, 0.8)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

export default theme;
