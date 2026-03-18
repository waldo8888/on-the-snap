'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import type { MatchWithPlayers } from '@/lib/tournament-engine/types';

// ============================================================
// Props
// ============================================================

export interface MatchCorrectionDialogProps {
  match: MatchWithPlayers | null;
  correctScores: { p1: string; p2: string };
  onScoreChange: (field: 'p1' | 'p2', value: string) => void;
  onClose: () => void;
  onApply: () => void;
  raceTo: number;
  actionLoading: string | null;
}

// ============================================================
// Component
// ============================================================

export default function MatchCorrectionDialog({
  match,
  correctScores,
  onScoreChange,
  onClose,
  onApply,
  raceTo,
  actionLoading,
}: MatchCorrectionDialogProps) {
  return (
    <Dialog
      open={!!match}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 2,
          maxWidth: 400,
          width: '100%',
        },
      }}
    >
      {match && (
        <>
          <DialogTitle sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1rem' }}>
            Correct Match #{match.match_number}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
              Enter the corrected scores. This will revert the current result and apply the new one.
            </DialogContentText>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                {match.player1?.name ?? 'Player 1'}
              </Typography>
              <TextField
                size="small"
                type="number"
                placeholder="0"
                value={correctScores.p1}
                onChange={(e) => onScoreChange('p1', e.target.value)}
                slotProps={{ htmlInput: { min: 0, max: raceTo, style: { padding: '8px', fontSize: '0.9rem', textAlign: 'center', width: 48 } } }}
                sx={{
                  width: 64,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#050505',
                    '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                  },
                  '& input': { color: '#f5f5f0' },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                {match.player2?.name ?? 'Player 2'}
              </Typography>
              <TextField
                size="small"
                type="number"
                placeholder="0"
                value={correctScores.p2}
                onChange={(e) => onScoreChange('p2', e.target.value)}
                slotProps={{ htmlInput: { min: 0, max: raceTo, style: { padding: '8px', fontSize: '0.9rem', textAlign: 'center', width: 48 } } }}
                sx={{
                  width: 64,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#050505',
                    '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                  },
                  '& input': { color: '#f5f5f0' },
                }}
              />
            </Box>

            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mt: 1.5 }}
            >
              Winner must reach exactly {raceTo}. Blank fields count as 0.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={onClose}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#050505' }} /> : <CheckIcon />}
              disabled={actionLoading === match.id}
              onClick={onApply}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#c5a030' },
              }}
            >
              Apply Correction
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
