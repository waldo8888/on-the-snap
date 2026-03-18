'use client';

import { Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BORDER } from './shared';

export interface CheckInPanelProps {
  participantCount: number;
  checkedInCount: number;
  onCheckInAll: () => void;
  onResetCheckInAll: () => void;
}

export default function CheckInPanel({
  participantCount,
  checkedInCount,
  onCheckInAll,
  onResetCheckInAll,
}: CheckInPanelProps) {
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        onClick={onCheckInAll}
        disabled={participantCount === 0 || checkedInCount === participantCount}
        sx={{
          borderColor: BORDER,
          color: '#f5f5f0',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { borderColor: '#81c784', color: '#81c784' },
          '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
        }}
      >
        Check In All
      </Button>
      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        onClick={onResetCheckInAll}
        disabled={checkedInCount === 0}
        sx={{
          borderColor: BORDER,
          color: '#f5f5f0',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { borderColor: '#ef5350', color: '#ef9a9a' },
          '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
        }}
      >
        Reset Check-In
      </Button>
    </>
  );
}
