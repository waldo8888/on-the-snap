'use client';

import { useState } from 'react';
import { Box, Typography, Button, Collapse, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import Link from 'next/link';
import type {
  TournamentStatus,
  TournamentWithDetails,
} from '@/lib/tournament-engine/types';
import TournamentBracket from './TournamentBracket';

interface TournamentListProps {
  tournaments: TournamentWithDetails[];
}

function formatGameType(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatTournamentFormat(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getParticipantCount(tournament: TournamentWithDetails) {
  return tournament.participants?.length || tournament.max_participants || 0;
}

function getStatusInfo(status: TournamentStatus) {
  switch (status) {
    case 'live':
      return {
        label: 'Live Now',
        color: '#D4AF37',
        icon: <PlayCircleFilledWhiteIcon sx={{ fontSize: 14 }} />,
      };
    case 'open':
      return {
        label: 'Registration Open',
        color: '#39a87a',
        icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
      };
    case 'check_in':
      return {
        label: 'Check-In Open',
        color: '#42a5f5',
        icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
      };
    case 'completed':
      return {
        label: 'Completed',
        color: '#a0a0a0',
        icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: '#ef5350',
        icon: <CancelIcon sx={{ fontSize: 14 }} />,
      };
    default:
      return {
        label: 'Upcoming',
        color: '#c0c0c0',
        icon: <AccessTimeIcon sx={{ fontSize: 14 }} />,
      };
  }
}

export default function TournamentList({ tournaments = [] }: TournamentListProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const handleToggle = (tournamentId: string) => {
    setSelectedTournamentId((current) =>
      current === tournamentId ? null : tournamentId
    );
  };

  if (tournaments.length === 0) {
    return (
      <Box sx={{ mt: { xs: 8, md: 12 }, textAlign: 'center', py: 6 }}>
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: 'var(--font-inter)',
            fontSize: '0.95rem',
          }}
        >
          Featured tournaments will appear here once they are published.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: { xs: 8, md: 12 } }}>
      <Typography
        variant="h3"
        sx={{
          color: 'text.primary',
          mb: 4,
          fontFamily: 'var(--font-playfair)',
          fontSize: { xs: '2rem', md: '2.5rem' },
          textAlign: 'center',
        }}
      >
        Featured{' '}
        <Box
          component="span"
          sx={{
            background: 'linear-gradient(90deg, #9e7f1e, #F0CF70, #D4AF37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Tournament Coverage
        </Box>
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {tournaments.map((tournament, idx) => {
          const isSelected = selectedTournamentId === tournament.id;
          const statusInfo = getStatusInfo(tournament.status);
          const participantCount = getParticipantCount(tournament);

          return (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
            >
              <Box
                sx={{
                  bgcolor: 'rgba(10,10,10,0.6)',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&:hover': {
                    borderColor: 'rgba(212,175,55,0.3)',
                    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
                  },
                }}
              >
                {tournament.status === 'live' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: '#D4AF37',
                    }}
                  />
                )}

                <Box
                  sx={{
                    p: { xs: 3, md: 4 },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggle(tournament.id)}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 280 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          mb: 1.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${statusInfo.color}15`,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}40`,
                            fontFamily: 'var(--font-inter)',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            '& .MuiChip-icon': {
                              color: statusInfo.color,
                            },
                          }}
                        />
                        <Typography
                          sx={{
                            color: 'primary.main',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {formatGameType(tournament.game_type)}
                        </Typography>
                      </Box>

                      <Typography
                        variant="h5"
                        sx={{
                          color: 'text.primary',
                          fontFamily: 'var(--font-playfair)',
                          mb: 1.25,
                          fontWeight: 600,
                        }}
                      >
                        {tournament.title}
                      </Typography>

                      {tournament.description && (
                        <Typography
                          sx={{
                            color: 'text.secondary',
                            fontFamily: 'var(--font-inter)',
                            fontSize: '0.95rem',
                            lineHeight: 1.7,
                            mb: 2.5,
                            maxWidth: 720,
                          }}
                        >
                          {tournament.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'text.secondary',
                          }}
                        >
                          <CalendarTodayIcon
                            sx={{ fontSize: 16, color: 'primary.main' }}
                          />
                          <Typography sx={{ fontSize: '0.9rem' }}>
                            {formatDate(tournament.tournament_start_at)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'text.secondary',
                          }}
                        >
                          <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography sx={{ fontSize: '0.9rem' }}>
                            {participantCount > 0
                              ? `${participantCount} Players`
                              : 'Open Entry'}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'text.secondary',
                          }}
                        >
                          <EmojiEventsIcon
                            sx={{ fontSize: 18, color: 'primary.main' }}
                          />
                          <Typography sx={{ fontSize: '0.9rem' }}>
                            {formatTournamentFormat(tournament.format)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        justifyContent: 'flex-end',
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        component={Link}
                        href={`/tournaments/${tournament.slug}`}
                        variant="text"
                        sx={{
                          color: 'text.secondary',
                          textTransform: 'none',
                          fontFamily: 'var(--font-inter)',
                          fontWeight: 500,
                          px: 1,
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'transparent',
                          },
                        }}
                      >
                        Tournament Page
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => handleToggle(tournament.id)}
                        sx={{
                          borderColor: isSelected
                            ? 'primary.main'
                            : 'rgba(255,255,255,0.1)',
                          color: isSelected ? 'primary.main' : 'text.primary',
                          borderRadius: '30px',
                          px: 3,
                          py: 1,
                          textTransform: 'none',
                          fontFamily: 'var(--font-inter)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            borderColor: 'primary.main',
                            background: 'rgba(212,175,55,0.05)',
                          },
                        }}
                      >
                        {isSelected ? 'Hide Bracket' : 'View Bracket'}
                      </Button>
                    </Box>
                  </Box>

                  <Collapse in={isSelected}>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Box onClick={(event) => event.stopPropagation()}>
                            <TournamentBracket tournament={tournament} />
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Collapse>
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
}
