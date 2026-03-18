'use client';

import { Button } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { GOLD, BG_DARK, BORDER } from './shared';

export interface SeedingControlsProps {
  participantCount: number;
  reorderMode: boolean;
  onRandomizeSeeds: () => void;
  onToggleReorderMode: () => void;
}

export default function SeedingControls({
  participantCount,
  reorderMode,
  onRandomizeSeeds,
  onToggleReorderMode,
}: SeedingControlsProps) {
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ShuffleIcon />}
        onClick={onRandomizeSeeds}
        disabled={participantCount < 2 || reorderMode}
        sx={{
          borderColor: BORDER,
          color: '#f5f5f0',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { borderColor: GOLD, color: GOLD },
          '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
        }}
      >
        Randomize Seeds
      </Button>
      <Button
        variant={reorderMode ? 'contained' : 'outlined'}
        startIcon={<SwapVertIcon />}
        onClick={onToggleReorderMode}
        disabled={participantCount < 2}
        sx={{
          borderColor: reorderMode ? GOLD : BORDER,
          bgcolor: reorderMode ? GOLD : 'transparent',
          color: reorderMode ? BG_DARK : '#f5f5f0',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            borderColor: GOLD,
            bgcolor: reorderMode ? '#c9a030' : 'rgba(212,175,55,0.08)',
            color: reorderMode ? BG_DARK : GOLD,
          },
          '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
        }}
      >
        {reorderMode ? 'Done Reordering' : 'Reorder Seeds'}
      </Button>
    </>
  );
}
