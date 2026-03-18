'use client';

import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import type { PlayerFormData } from './shared';
import {
  GOLD,
  BG_DARK,
  BORDER,
  DIALOG_PAPER_SX,
  DIALOG_CONTENT_SX,
  DIALOG_SCROLL_CONTAIN_PROPS,
} from './shared';

export interface AddParticipantDialogProps {
  open: boolean;
  formData: PlayerFormData;
  submitting: boolean;
  /** When true, shows the Seed field and uses Edit labels */
  isEdit?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onUpdateField: (field: keyof PlayerFormData, value: string | number | null) => void;
}

export default function AddParticipantDialog({
  open,
  formData,
  submitting,
  isEdit = false,
  onClose,
  onSubmit,
  onUpdateField,
}: AddParticipantDialogProps) {
  const title = isEdit ? 'Edit Player' : 'Add Player';
  const submitLabel = isEdit ? 'Save Changes' : 'Add Player';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: DIALOG_PAPER_SX }}
    >
      <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
        {title}
      </DialogTitle>
      <DialogContent {...DIALOG_SCROLL_CONTAIN_PROPS} sx={DIALOG_CONTENT_SX}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            required
            fullWidth
            autoFocus
            slotProps={{
              inputLabel: { sx: { color: 'text.secondary' } },
              input: {
                sx: {
                  color: '#f5f5f0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                },
              },
            }}
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => onUpdateField('email', e.target.value)}
            fullWidth
            slotProps={{
              inputLabel: { sx: { color: 'text.secondary' } },
              input: {
                sx: {
                  color: '#f5f5f0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                },
              },
            }}
          />
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => onUpdateField('phone', e.target.value)}
            fullWidth
            slotProps={{
              inputLabel: { sx: { color: 'text.secondary' } },
              input: {
                sx: {
                  color: '#f5f5f0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                },
              },
            }}
          />
          <TextField
            label="Handicap"
            type="number"
            value={formData.handicap}
            onChange={(e) => onUpdateField('handicap', parseInt(e.target.value, 10) || 0)}
            fullWidth
            slotProps={{
              inputLabel: { sx: { color: 'text.secondary' } },
              input: {
                sx: {
                  color: '#f5f5f0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                },
              },
            }}
          />
          {isEdit && (
            <TextField
              label="Seed"
              type="number"
              value={formData.seed ?? ''}
              onChange={(e) => onUpdateField('seed', e.target.value ? parseInt(e.target.value, 10) : null)}
              fullWidth
              slotProps={{
                inputLabel: { sx: { color: 'text.secondary' } },
                input: {
                  sx: {
                    color: '#f5f5f0',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  },
                },
              }}
            />
          )}
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => onUpdateField('notes', e.target.value)}
            fullWidth
            multiline
            rows={2}
            slotProps={{
              inputLabel: { sx: { color: 'text.secondary' } },
              input: {
                sx: {
                  color: '#f5f5f0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                },
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={!formData.name.trim() || submitting}
          sx={{
            bgcolor: GOLD,
            color: BG_DARK,
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#c9a030' },
            '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
          }}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
