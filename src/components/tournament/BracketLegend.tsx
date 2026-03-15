'use client';

import { Box, Typography } from '@mui/material';

const LEGEND_ITEMS = [
  { label: 'In Progress', color: '#D4AF37', pulse: true },
  { label: 'Completed', color: '#66bb6a', pulse: false },
  { label: 'Ready', color: '#42a5f5', pulse: false },
  { label: 'Pending / Bye', color: '#757575', pulse: false },
];

export default function BracketLegend() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        flexWrap: 'wrap',
        py: 1,
        px: 0.5,
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '2px',
              bgcolor: `${item.color}30`,
              border: `2px solid ${item.color}`,
              ...(item.pulse && {
                animation: 'legend-pulse 2s ease-in-out infinite',
                '@keyframes legend-pulse': {
                  '0%, 100%': { boxShadow: `0 0 0 0 ${item.color}40` },
                  '50%': { boxShadow: `0 0 6px 2px ${item.color}40` },
                },
              }),
            }}
          />
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: '#a0a0a0',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
