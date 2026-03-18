'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  Chip,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Participant } from '@/lib/tournament-engine/types';
import { updateParticipant, addParticipant } from '@/lib/tournaments';

const GOLD = '#D4AF37';
const BORDER = 'rgba(212,175,55,0.15)';

interface QuickCheckInPanelProps {
  tournamentId: string;
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  onRefresh: () => Promise<void>;
  tournamentAdminPath: string;
}

export default function QuickCheckInPanel({
  tournamentId,
  participants,
  onParticipantsChange,
  onRefresh,
  tournamentAdminPath,
}: QuickCheckInPanelProps) {
  const [search, setSearch] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [addingWalkIn, setAddingWalkIn] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

  const checkedInCount = participants.filter((p) => p.checked_in).length;

  const filtered = useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.toLowerCase();
    return participants.filter((p) => p.name.toLowerCase().includes(q));
  }, [participants, search]);

  // Sort: unchecked first, then checked-in
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.checked_in === b.checked_in) return (a.seed ?? 999) - (b.seed ?? 999);
      return a.checked_in ? 1 : -1;
    });
  }, [filtered]);

  const handleToggleCheckIn = async (p: Participant) => {
    const newCheckedIn = !p.checked_in;
    // Optimistic update
    onParticipantsChange(
      participants.map((x) =>
        x.id === p.id
          ? { ...x, checked_in: newCheckedIn, checked_in_at: newCheckedIn ? new Date().toISOString() : null }
          : x
      )
    );
    try {
      await updateParticipant(p.id, {
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      });
    } catch {
      // Revert on failure
      onParticipantsChange(
        participants.map((x) =>
          x.id === p.id ? { ...x, checked_in: p.checked_in, checked_in_at: p.checked_in_at } : x
        )
      );
    }
  };

  const handleCheckInAll = async () => {
    const unchecked = participants.filter((p) => !p.checked_in);
    if (unchecked.length === 0) return;
    setCheckingAll(true);
    // Optimistic
    onParticipantsChange(
      participants.map((p) => ({
        ...p,
        checked_in: true,
        checked_in_at: p.checked_in_at || new Date().toISOString(),
      }))
    );
    try {
      await Promise.all(
        unchecked.map((p) =>
          updateParticipant(p.id, { checked_in: true, checked_in_at: new Date().toISOString() })
        )
      );
    } catch {
      await onRefresh();
    } finally {
      setCheckingAll(false);
    }
  };

  const handleAddWalkIn = async () => {
    const name = walkInName.trim();
    if (!name) return;
    setAddingWalkIn(true);
    try {
      await addParticipant({
        tournament_id: tournamentId,
        name,
        seed: participants.length + 1,
      });
      setWalkInName('');
      await onRefresh();
    } catch {
      // noop — refresh will show current state
    } finally {
      setAddingWalkIn(false);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'rgba(10, 10, 10, 0.45)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        overflow: 'hidden',
        mb: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <CheckCircleIcon sx={{ color: GOLD, fontSize: 22 }} />
        <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1rem', mr: 'auto' }}>
          Player Check-In
        </Typography>

        <Chip
          label={`${checkedInCount} / ${participants.length} checked in`}
          size="small"
          sx={{
            bgcolor: checkedInCount === participants.length && participants.length > 0
              ? 'rgba(76,175,80,0.15)'
              : 'rgba(212,175,55,0.1)',
            color: checkedInCount === participants.length && participants.length > 0
              ? '#81c784'
              : GOLD,
            fontWeight: 600,
            border: `1px solid ${
              checkedInCount === participants.length && participants.length > 0
                ? 'rgba(76,175,80,0.3)'
                : BORDER
            }`,
          }}
        />

        <Button
          variant="outlined"
          size="small"
          onClick={handleCheckInAll}
          disabled={checkingAll || participants.length === 0 || checkedInCount === participants.length}
          startIcon={checkingAll ? <CircularProgress size={14} /> : undefined}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
            '&:hover': { borderColor: '#81c784', color: '#81c784' },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Check In All
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2.5, pt: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#555', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
              '&.Mui-focused fieldset': { borderColor: GOLD },
            },
            '& .MuiInputBase-input': { color: '#f5f5f0', fontSize: '0.85rem' },
          }}
        />
      </Box>

      {/* Participant list */}
      <Box
        sx={{
          maxHeight: 360,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          px: 1,
          py: 1,
        }}
      >
        {sorted.length === 0 ? (
          <Typography sx={{ color: '#555', textAlign: 'center', py: 3, fontSize: '0.85rem' }}>
            {search ? 'No players match your search' : 'No participants registered yet'}
          </Typography>
        ) : (
          sorted.map((p) => (
            <Box
              key={p.id}
              onClick={() => handleToggleCheckIn(p)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.8,
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              <Checkbox
                checked={!!p.checked_in}
                size="small"
                sx={{
                  color: '#555',
                  p: 0.5,
                  '&.Mui-checked': { color: '#81c784' },
                }}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleToggleCheckIn(p)}
              />
              <Typography
                sx={{
                  color: p.checked_in ? '#81c784' : '#f5f5f0',
                  fontSize: '0.88rem',
                  fontWeight: p.checked_in ? 500 : 400,
                  flex: 1,
                }}
              >
                {p.name}
              </Typography>
              {p.seed != null && (
                <Typography sx={{ color: '#555', fontSize: '0.75rem' }}>
                  #{p.seed}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Footer: Walk-in add + link */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderTop: `1px solid ${BORDER}`,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Walk-in name"
          value={walkInName}
          onChange={(e) => setWalkInName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAddWalkIn();
            }
          }}
          sx={{
            flex: 1,
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
              '&.Mui-focused fieldset': { borderColor: GOLD },
            },
            '& .MuiInputBase-input': { color: '#f5f5f0', fontSize: '0.85rem' },
          }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={addingWalkIn ? <CircularProgress size={14} /> : <PersonAddIcon />}
          onClick={handleAddWalkIn}
          disabled={addingWalkIn || !walkInName.trim()}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
            '&:hover': { borderColor: GOLD, color: GOLD },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Add
        </Button>
        <Button
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
          href={`${tournamentAdminPath}/participants`}
          sx={{
            color: '#888',
            textTransform: 'none',
            fontSize: '0.78rem',
            ml: 'auto',
            '&:hover': { color: GOLD },
          }}
        >
          Full Participant Management
        </Button>
      </Box>
    </Box>
  );
}
