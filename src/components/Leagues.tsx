'use client';

import { Box, Container, Typography, Grid, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GradeIcon from '@mui/icons-material/Grade';
import type { Tournament } from '@/lib/challonge';
import TournamentList from './TournamentList';

const leagueTypes = [
    '8-Ball',
    '9-Ball',
    '10-Ball',
    'Open Doubles',
    'Scotch Doubles',
    'CSI Leagues',
    'Ontario Pool Players League',
];

// Triangle rack visual using staggered ball grid
const RACK_BALLS = [
    { color: '#F5C800', n: 1 },
    { color: '#1A5CC8', n: 2 },
    { color: '#C02020', n: 3 },
    { color: '#6A0DAD', n: 4 },
    { color: '#E06000', n: 5 },
    { color: '#1a1a1a', n: 8 },
    { color: '#C02020', n: 7 },
    { color: '#F5C800', n: 9 },
    { color: '#1A5CC8', n: 10 },
    { color: '#6A0DAD', n: 12 },
    { color: '#E06000', n: 13 },
    { color: '#1a1a1a', n: 14 },
    { color: '#188040', n: 6 },
    { color: '#C02020', n: 11 },
    { color: '#B8860B', n: 15 },
];

const RACK_ROWS = [
    [0],
    [1, 2],
    [3, 4, 5],
    [6, 7, 8, 9],
    [10, 11, 12, 13, 14],
];

function RackBall({ color, n, size = 36 }: { color: string; n: number; size?: number }) {
    const id = `rack-${n}`;
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id={id} cx="38%" cy="32%" r="55%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="18" fill={color} />
            <circle cx="20" cy="20" r="18" fill={`url(#${id})`} />
            <circle cx="20" cy="20" r="7" fill="rgba(255,255,255,0.92)" />
            <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize={n >= 10 ? '6' : '7'} fontWeight="800" fill="#111" fontFamily="Arial, sans-serif">{n}</text>
        </svg>
    );
}

interface LeaguesProps {
    tournaments: Tournament[];
}

export default function Leagues({ tournaments = [] }: LeaguesProps) {
    return (
        <Box
            id="leagues"
            sx={{
                py: { xs: 12, md: 18 },
                bgcolor: '#050505',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Ambient light flares */}
            <Box sx={{ position: 'absolute', top: '10%', left: '-8%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 60%)', filter: 'blur(70px)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: '5%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(26,76,200,0.04) 0%, transparent 60%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 8, md: 10 }} alignItems="flex-start">

                    {/* Left column: text & league chips */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        >
                            <Typography
                                sx={{
                                    color: 'primary.main',
                                    mb: 1.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.25em',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-inter)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <EmojiEventsIcon sx={{ fontSize: 16 }} />
                                Competitive Play
                            </Typography>

                            <Typography
                                variant="h2"
                                sx={{
                                    color: 'text.primary',
                                    mb: 4,
                                    lineHeight: 1.05,
                                    fontFamily: 'var(--font-playfair)',
                                    fontSize: { xs: '2.4rem', md: '3.5rem' },
                                }}
                            >
                                Leagues &amp;
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'block',
                                        background: 'linear-gradient(90deg, #9e7f1e, #F0CF70, #D4AF37)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    Tournaments
                                </Box>
                            </Typography>

                            <Typography
                                variant="body1"
                                sx={{
                                    color: 'text.secondary',
                                    mb: 6,
                                    fontSize: '1.1rem',
                                    lineHeight: 1.9,
                                    maxWidth: 480,
                                }}
                            >
                                Join the thriving billiards community at On The Snap. From casual weekly
                                play to official CSI and OPPL league nights — there&apos;s a seat at the table
                                for every skill level.
                            </Typography>

                            {/* League chips */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 6 }}>
                                {leagueTypes.map((league, i) => (
                                    <motion.div
                                        key={league}
                                        initial={{ opacity: 0, scale: 0.75 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: i * 0.08 }}
                                        whileHover={{ scale: 1.06, y: -2 }}
                                    >
                                        <Chip
                                            icon={<GradeIcon sx={{ fontSize: '14px !important', color: 'rgba(212,175,55,0.6) !important' }} />}
                                            label={league}
                                            sx={{
                                                bgcolor: 'rgba(212,175,55,0.06)',
                                                color: 'primary.main',
                                                border: '1px solid rgba(212,175,55,0.2)',
                                                borderRadius: 0,
                                                px: 1.5,
                                                py: 2.5,
                                                fontSize: '0.82rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.04em',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    bgcolor: 'rgba(212,175,55,0.14)',
                                                    borderColor: 'rgba(212,175,55,0.5)',
                                                    boxShadow: '0 4px 20px rgba(212,175,55,0.15)',
                                                },
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </Box>

                            {/* Rack visual */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.3 }}
                            >
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', mb: 2, fontFamily: 'var(--font-inter)' }}>
                                        The Full Rack
                                    </Typography>
                                    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        {RACK_ROWS.map((row, ri) => (
                                            <Box key={ri} sx={{ display: 'flex', gap: 0.5 }}>
                                                {row.map((ballIdx) => {
                                                    const ball = RACK_BALLS[ballIdx];
                                                    return (
                                                        <motion.div
                                                            key={ball.n}
                                                            initial={{ opacity: 0, scale: 0 }}
                                                            whileInView={{ opacity: 1, scale: 1 }}
                                                            viewport={{ once: true }}
                                                            transition={{ duration: 0.4, delay: 0.5 + ballIdx * 0.04 }}
                                                            whileHover={{ scale: 1.2, zIndex: 10 }}
                                                            style={{ position: 'relative', zIndex: 1 }}
                                                        >
                                                            <RackBall color={ball.color} n={ball.n} size={34} />
                                                        </motion.div>
                                                    );
                                                })}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </motion.div>
                        </motion.div>
                    </Grid>

                    {/* Right column: pricing card */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 30 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 1.2, delay: 0.15, ease: 'easeOut' }}
                        >
                            {/* Animated gradient border wrapper */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    p: '1.5px',
                                    borderRadius: 0,
                                    background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(240,207,112,0.9) 50%, rgba(212,175,55,0.15) 100%)',
                                    backgroundSize: '300% 300%',
                                    animation: 'gradientBorder 6s ease infinite',
                                    '@keyframes gradientBorder': {
                                        '0%': { backgroundPosition: '0% 50%' },
                                        '50%': { backgroundPosition: '100% 50%' },
                                        '100%': { backgroundPosition: '0% 50%' },
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        p: { xs: 5, md: 7 },
                                        bgcolor: '#0a0a0a',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Corner accent */}
                                    <Box sx={{ position: 'absolute', top: 0, right: 0, width: 90, height: 90, background: 'linear-gradient(135deg, transparent 50%, rgba(212,175,55,0.12) 50%)' }} />

                                    {/* Inner glow */}
                                    <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(212,175,55,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

                                    <Typography
                                        sx={{
                                            color: 'primary.main',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.3em',
                                            textTransform: 'uppercase',
                                            mb: 1,
                                            fontFamily: 'var(--font-inter)',
                                        }}
                                    >
                                        Everyday Rate
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            color: 'text.primary',
                                            mb: 5,
                                            fontFamily: 'var(--font-playfair)',
                                        }}
                                    >
                                        Table Rates
                                    </Typography>

                                    {/* Big price */}
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, lineHeight: 1 }}>
                                        <Typography
                                            sx={{
                                                fontSize: { xs: '1.2rem', md: '1.5rem' },
                                                color: 'primary.main',
                                                fontWeight: 700,
                                                mt: { xs: 1.2, md: 1.8 },
                                                mr: 0.5,
                                                fontFamily: 'var(--font-inter)',
                                            }}
                                        >
                                            $
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: { xs: '5rem', md: '7rem' },
                                                fontFamily: 'var(--font-playfair)',
                                                fontWeight: 700,
                                                color: 'text.primary',
                                                letterSpacing: '-0.04em',
                                                lineHeight: 1,
                                                textShadow: '0 0 40px rgba(212,175,55,0.2)',
                                            }}
                                        >
                                            16.50
                                        </Typography>
                                        <Box sx={{ ml: 1.5, mt: { xs: 1.5, md: 2 } }}>
                                            <Typography sx={{ color: 'primary.main', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>/ HR</Typography>
                                            <Typography sx={{ color: 'text.secondary', fontSize: '0.65rem', letterSpacing: '0.1em', mt: 0.5 }}>PER TABLE</Typography>
                                        </Box>
                                    </Box>

                                    {/* Gold divider */}
                                    <Box sx={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.6), transparent)', mb: 4, mt: 2 }} />

                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            lineHeight: 1.9,
                                            fontSize: '1rem',
                                            mb: 4,
                                        }}
                                    >
                                        Walk-ins always welcome. Reservations recommended
                                        for peak hours &amp; league nights. No hustle — just pure game.
                                    </Typography>

                                    {/* Feature list */}
                                    {['Premium Simonis felt tables', 'Aramith tournament balls', 'House cues & chalk provided', 'Walk-ins welcome'].map((feat) => (
                                        <Box key={feat} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, boxShadow: '0 0 8px rgba(212,175,55,0.6)' }} />
                                            <Typography sx={{ color: 'rgba(245,245,240,0.7)', fontSize: '0.88rem' }}>
                                                {feat}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>

                <TournamentList tournaments={tournaments} />
            </Container>
        </Box>
    );
}
