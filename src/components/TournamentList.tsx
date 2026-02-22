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
import type { Tournament } from '@/lib/challonge';
import TournamentBracket from './TournamentBracket';

interface TournamentListProps {
    tournaments: Tournament[];
}

export default function TournamentList({ tournaments = [] }: TournamentListProps) {
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

    const handleToggle = (url: string) => {
        if (selectedUrl === url) {
            setSelectedUrl(null);
        } else {
            setSelectedUrl(url);
        }
    };

    const getStateInfo = (state: string) => {
        switch (state) {
            case 'pending':
                return { label: 'Upcoming', color: '#c0c0c0', icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> };
            case 'underway':
                return { label: 'Live Now', color: '#1a5cc8', icon: <PlayCircleFilledWhiteIcon sx={{ fontSize: 14 }} /> };
            case 'complete':
                return { label: 'Completed', color: '#d4af37', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> };
            default:
                return { label: state, color: '#c0c0c0', icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> };
        }
    };

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
                Upcoming & Live{' '}
                <Box
                    component="span"
                    sx={{
                        background: 'linear-gradient(90deg, #9e7f1e, #F0CF70, #D4AF37)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    Tournaments
                </Box>
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tournaments.map((tournament, idx) => {
                    const isSelected = selectedUrl === tournament.url;
                    const stateInfo = getStateInfo(tournament.state);
                    const formattedDate = tournament.starts_at ? new Date(tournament.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';

                    return (
                        <motion.div
                            key={tournament.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
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
                                    }
                                }}
                            >
                                {/* Highlight bar for Live tournaments */}
                                {tournament.state === 'underway' && (
                                    <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: '#1a5cc8' }} />
                                )}

                                <Box
                                    sx={{
                                        p: { xs: 3, md: 4 },
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => handleToggle(tournament.url)}
                                >
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                        <Box sx={{ flex: 1, minWidth: 280 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                                <Chip
                                                    icon={stateInfo.icon}
                                                    label={stateInfo.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${stateInfo.color}15`,
                                                        color: stateInfo.color,
                                                        border: `1px solid ${stateInfo.color}40`,
                                                        fontFamily: 'var(--font-inter)',
                                                        fontWeight: 600,
                                                        letterSpacing: '0.05em',
                                                        fontSize: '0.7rem',
                                                        textTransform: 'uppercase',
                                                        '& .MuiChip-icon': {
                                                            color: stateInfo.color,
                                                        }
                                                    }}
                                                />
                                                <Typography sx={{ color: 'primary.main', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    {tournament.game_name}
                                                </Typography>
                                            </Box>

                                            <Typography variant="h5" sx={{ color: 'text.primary', fontFamily: 'var(--font-playfair)', mb: 2, fontWeight: 600 }}>
                                                {tournament.name}
                                            </Typography>

                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                    <Typography sx={{ fontSize: '0.9rem' }}>{formattedDate}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                                    <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                                    <Typography sx={{ fontSize: '0.9rem' }}>{tournament.participants_count} Players</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                                    <EmojiEventsIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                                    <Typography sx={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{tournament.tournament_type}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        <Button
                                            variant="outlined"
                                            sx={{
                                                borderColor: isSelected ? 'primary.main' : 'rgba(255,255,255,0.1)',
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
                                                }
                                            }}
                                        >
                                            {isSelected ? 'Hide Bracket' : 'View Bracket'}
                                        </Button>
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
                                                    <Box onClick={(e) => e.stopPropagation()}>
                                                        <TournamentBracket url={tournament.url} />
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
