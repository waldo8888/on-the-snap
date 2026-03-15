'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { Match, Participant } from '@/lib/tournament-engine/types';
import { formatMatchDuration } from '@/lib/match-formatting';

interface MatchDetailDialogProps {
  match: Match | null;
  participants: Participant[];
  roundName?: string;
  onClose: () => void;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#66bb6a';
    case 'in_progress': return '#D4AF37';
    case 'ready': return '#42a5f5';
    case 'bye': return '#9e9e9e';
    default: return '#757575';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'ready': return 'Ready';
    case 'pending': return 'Pending';
    case 'bye': return 'Bye';
    default: return status;
  }
};

function getParticipant(id: string | null, participants: Participant[]): Participant | null {
  if (!id) return null;
  return participants.find((p) => p.id === id) ?? null;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MatchDetailDialog({ match, participants, roundName, onClose }: MatchDetailDialogProps) {
  if (!match) return null;

  const player1 = getParticipant(match.player1_id, participants);
  const player2 = getParticipant(match.player2_id, participants);
  const isComplete = match.status === 'completed';
  const duration = formatMatchDuration(match.started_at, match.completed_at);

  return (
    <Dialog
      open={!!match}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontWeight: 700,
              color: '#f5f5f0',
              fontSize: '1.1rem',
            }}
          >
            Match #{match.match_number}
          </Typography>
          <Chip
            label={statusLabel(match.status)}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: `${statusColor(match.status)}18`,
              color: statusColor(match.status),
              textTransform: 'capitalize',
            }}
          />
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {roundName && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            {roundName}
          </Typography>
        )}

        {/* Player Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
          <PlayerCard
            player={player1}
            score={match.player1_score}
            isWinner={!!match.winner_id && match.winner_id === match.player1_id}
            isComplete={isComplete}
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(160,160,160,0.4)', fontSize: '0.7rem', fontWeight: 600 }}>
              VS
            </Typography>
          </Box>
          <PlayerCard
            player={player2}
            score={match.player2_score}
            isWinner={!!match.winner_id && match.winner_id === match.player2_id}
            isComplete={isComplete}
          />
        </Box>

        {/* Winner */}
        {isComplete && match.winner_id && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              mb: 2,
              borderRadius: 1.5,
              bgcolor: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <EmojiEventsIcon sx={{ color: '#D4AF37', fontSize: 18 }} />
            <Typography sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.85rem' }}>
              {(() => {
                const winner = getParticipant(match.winner_id, participants);
                if (winner?.player_id) {
                  return (
                    <Link href={`/players/${winner.player_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {winner.name}
                    </Link>
                  );
                }

                return winner?.name ?? 'Unknown';
              })()}{' '}
              wins
            </Typography>
          </Box>
        )}

        {/* Details grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
          }}
        >
          {match.table_number && (
            <DetailItem label="Table" value={`Table ${match.table_number}`} />
          )}
          {match.started_at && (
            <DetailItem label="Started" value={formatTimestamp(match.started_at)} />
          )}
          {match.completed_at && (
            <DetailItem label="Completed" value={formatTimestamp(match.completed_at)} />
          )}
          {duration && (
            <DetailItem label="Duration" value={duration} />
          )}
          {match.notes && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <DetailItem label="Notes" value={match.notes} />
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function PlayerCard({
  player,
  score,
  isWinner,
  isComplete,
}: {
  player: Participant | null;
  score: number | null;
  isWinner: boolean;
  isComplete: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: isWinner ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isWinner ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component={player?.player_id ? Link : 'span'}
          href={player?.player_id ? `/players/${player.player_id}` : undefined}
          sx={{
            fontSize: '0.95rem',
            fontWeight: isWinner ? 700 : 500,
            color: isWinner ? '#D4AF37' : player ? '#f5f5f0' : 'rgba(160,160,160,0.4)',
            textDecoration: 'none',
          }}
        >
          {player?.name ?? 'TBD'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          {player?.seed && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Seed #{player.seed}
            </Typography>
          )}
          {player && player.handicap > 0 && (
            <Typography variant="caption" sx={{ color: 'rgba(100,160,255,0.7)', fontSize: '0.7rem' }}>
              HC {player.handicap}
            </Typography>
          )}
        </Box>
      </Box>
      {isComplete && score !== null && (
        <Typography
          sx={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: isWinner ? '#D4AF37' : '#a0a0a0',
            fontFamily: 'var(--font-playfair), "Playfair Display", serif',
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.65rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#f5f5f0', fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}
