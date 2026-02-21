'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D4AF37', // Luxurious Gold
    },
    secondary: {
      main: '#FFC107',
    },
    background: {
      default: '#0a0a0a',
      paper: '#151515',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), sans-serif',
    h1: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 600,
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
      fontFamily: 'var(--font-playfair), serif',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      letterSpacing: '0.05em',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // More editorial, sharp edges for a modern magazine feel
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(21, 21, 21, 0.7)',
          backdropFilter: 'blur(10px)',
        }
      }
    }
  },
});

export default theme;
