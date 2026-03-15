'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import SportsBarIcon from '@mui/icons-material/SportsBar';

interface AdminAuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AdminAuthShell({
  title,
  subtitle,
  children,
}: AdminAuthShellProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#050505',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: 4,
          border: '1px solid rgba(212,175,55,0.15)',
          bgcolor: 'rgba(15,15,15,0.95)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SportsBarIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              color: 'primary.main',
              mb: 0.5,
            }}
          >
            On The Snap
          </Typography>
          <Typography variant="body1" sx={{ color: '#f5f5f0', fontWeight: 600, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>

        {children}
      </Paper>
    </Box>
  );
}
