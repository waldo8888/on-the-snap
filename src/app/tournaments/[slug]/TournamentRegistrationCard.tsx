'use client';

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import type { Tournament } from '@/lib/tournament-engine/types';
import {
  getTournamentRegistrationAvailability,
  registerParticipantForTournament,
} from '@/lib/tournaments';

type PublicTournamentRegistration = Pick<
  Tournament,
  | 'id'
  | 'title'
  | 'published'
  | 'status'
  | 'registration_open_at'
  | 'registration_close_at'
  | 'max_participants'
  | 'check_in_required'
  | 'entry_fee'
>;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5f5f0',
    '& fieldset': { borderColor: 'rgba(212,175,55,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.36)' },
    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(160,160,160,0.85)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#D4AF37' },
};

interface TournamentRegistrationCardProps {
  tournament: PublicTournamentRegistration;
  participantCount: number;
}

export default function TournamentRegistrationCard({
  tournament,
  participantCount,
}: TournamentRegistrationCardProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(participantCount);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setCurrentParticipantCount(participantCount);
  }, [participantCount]);

  const availability = useMemo(
    () => getTournamentRegistrationAvailability(tournament, currentParticipantCount),
    [currentParticipantCount, tournament]
  );

  const seatsLeft = tournament.max_participants
    ? Math.max(tournament.max_participants - currentParticipantCount, 0)
    : null;

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await registerParticipantForTournament({
        tournamentId: tournament.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      setCurrentParticipantCount((previous) => previous + 1);
      setForm({ name: '', email: '', phone: '' });
      setSuccess(
        tournament.check_in_required
          ? 'Registration received. Check in on-site before the bracket locks.'
          : 'Registration received. You are on the player list.'
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (submissionError: unknown) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Registration could not be completed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 3,
        bgcolor: '#111111',
        border: '1px solid rgba(212,175,55,0.12)',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#f5f5f0',
              fontSize: '1.1rem',
              mb: 0.5,
            }}
          >
            Join This Tournament
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: '#a0a0a0',
              fontSize: '0.88rem',
              lineHeight: 1.6,
            }}
          >
            {availability.message}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Chip
            label={
              tournament.max_participants
                ? `${currentParticipantCount} / ${tournament.max_participants} players`
                : `${currentParticipantCount} players`
            }
            size="small"
            sx={{
              bgcolor: 'rgba(212,175,55,0.08)',
              color: '#D4AF37',
              fontWeight: 600,
            }}
          />
          {seatsLeft !== null && (
            <Chip
              label={seatsLeft === 0 ? 'Waitlist only' : `${seatsLeft} spot${seatsLeft !== 1 ? 's' : ''} left`}
              size="small"
              sx={{
                bgcolor: seatsLeft === 0 ? 'rgba(239,83,80,0.14)' : 'rgba(57,168,122,0.12)',
                color: seatsLeft === 0 ? '#ef5350' : '#39a87a',
                fontWeight: 600,
              }}
            />
          )}
          {tournament.entry_fee > 0 && (
            <Chip
              label={`$${tournament.entry_fee} entry`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.06)',
                color: '#f5f5f0',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </Box>

      {tournament.check_in_required && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            bgcolor: 'rgba(66,165,245,0.08)',
            color: '#9fd3ff',
            border: '1px solid rgba(66,165,245,0.16)',
            '& .MuiAlert-icon': { color: '#64a0ff' },
          }}
        >
          This event requires on-site check-in before the bracket is generated.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            bgcolor: 'rgba(239,83,80,0.08)',
            color: '#ffb3b3',
            border: '1px solid rgba(239,83,80,0.16)',
            '& .MuiAlert-icon': { color: '#ef5350' },
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            bgcolor: 'rgba(57,168,122,0.08)',
            color: '#b7f0d5',
            border: '1px solid rgba(57,168,122,0.16)',
            '& .MuiAlert-icon': { color: '#39a87a' },
          }}
        >
          {success}
        </Alert>
      )}

      {availability.isOpen ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.5 }}>
          <TextField
            label="Player Name"
            value={form.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            required
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(event) => handleFieldChange('phone', event.target.value)}
            fullWidth
            helperText="Use the same email or phone each week so staff can confirm your spot quickly."
            FormHelperTextProps={{ sx: { color: 'rgba(160,160,160,0.72)' } }}
            sx={inputSx}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={submitting || isRefreshing}
            sx={{
              mt: 0.5,
              bgcolor: '#D4AF37',
              color: '#111111',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c5a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.32)', color: '#111111' },
            }}
          >
            {submitting || isRefreshing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: '#111111' }} />
                Processing registration...
              </Box>
            ) : (
              `Register for ${tournament.title}`
            )}
          </Button>
        </Box>
      ) : (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            color: '#a0a0a0',
            fontSize: '0.88rem',
            lineHeight: 1.6,
          }}
        >
          Public registration is unavailable right now. Staff can still add players from the admin desk if needed.
        </Typography>
      )}
    </Paper>
  );
}
