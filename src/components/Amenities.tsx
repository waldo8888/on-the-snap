'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import { motion } from 'framer-motion';

// SVG pool ball icon with authentic shine & number
function PoolBall({ number, color, size = 72 }: { number: number; color: string; size?: number }) {
    const gradId = `ball-grad-${number}`;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 72 72"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: `drop-shadow(0 0 14px ${color}66)` }}
        >
            <defs>
                <radialGradient id={gradId} cx="38%" cy="30%" r="56%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                    <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                </radialGradient>
            </defs>
            {/* Shadow */}
            <ellipse cx="36" cy="68" rx="20" ry="4" fill="rgba(0,0,0,0.3)" />
            {/* Ball body */}
            <circle cx="36" cy="34" r="32" fill={color} />
            {/* Gloss overlay */}
            <circle cx="36" cy="34" r="32" fill={`url(#${gradId})`} />
            {/* Number circle */}
            <circle cx="36" cy="34" r="12.5" fill="rgba(255,255,255,0.94)" />
            {/* Number */}
            <text
                x="36"
                y="34"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={number >= 10 ? '10' : '12'}
                fontWeight="800"
                fill="#111"
                fontFamily="Arial, sans-serif"
            >
                {number}
            </text>
        </svg>
    );
}

const amenities = [
    {
        ballNum: 1,
        ballColor: '#F5C800',
        title: '15 Premium Tables',
        description:
            'Impeccably maintained 9-foot tournament tables with Simonis 860 felt, polished Aramith balls, and precision leveling. Every rack, every time.',
        tag: 'PLAY',
    },
    {
        ballNum: 9,
        ballColor: '#F5C800',
        title: 'Precision Darts',
        description:
            '4 pro-grade steel-tip dartboards in a dedicated arena. Perfect for friendly competition, league nights, or stepping up your game.',
        tag: 'COMPETE',
    },
    {
        ballNum: 2,
        ballColor: '#1A5CC8',
        title: 'Lounge & Bar',
        description:
            'A fully licensed bar pouring curated cocktails, cold craft drafts, and a kitchen menu highlighted by our legendary signature wings.',
        tag: 'UNWIND',
    },
    {
        ballNum: 10,
        ballColor: '#1A5CC8',
        title: 'Tournaments',
        description:
            'Home to CPA, OPPL, and weekly in-house 8-ball & 9-ball tournaments. Whether you are hunting glory or your first trophy, there is a format for you.',
        tag: 'WIN',
    },
];

export default function Amenities() {
    return (
        <Box
            id="amenities"
            sx={{
                py: { xs: 12, md: 18 },
                bgcolor: '#080808',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden',
            }}
        >
            {/* Background glow orbs */}
            <Box sx={{ position: 'absolute', top: -150, left: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.055) 0%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

            <Container maxWidth="lg">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                >
                    <Typography
                        variant="h6"
                        align="center"
                        sx={{
                            color: 'primary.main',
                            mb: 1.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.25em',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-inter)',
                            fontWeight: 700,
                        }}
                    >
                        Everything You Need
                    </Typography>

                    <Typography
                        variant="h2"
                        align="center"
                        sx={{
                            mb: 3,
                            color: 'text.primary',
                            fontFamily: 'var(--font-playfair)',
                            fontSize: { xs: '2.4rem', md: '3.5rem' },
                        }}
                    >
                        The Atmosphere
                    </Typography>

                    {/* Gold accent bar */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 5 }}>
                        <Box sx={{ width: 60, height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
                        {/* Mini billiard ball divider */}
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D4AF37', boxShadow: '0 0 10px rgba(212,175,55,0.7)' }} />
                        <Box sx={{ width: 60, height: '1px', background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
                    </Box>

                    <Typography
                        variant="body1"
                        align="center"
                        sx={{
                            maxWidth: 640,
                            mx: 'auto',
                            mb: { xs: 8, md: 12 },
                            color: 'text.secondary',
                            fontSize: '1.15rem',
                            lineHeight: 1.9,
                        }}
                    >
                        At On The Snap, we elevate the pool hall experience. Meticulously maintained
                        equipment meets a luxurious atmosphere — whether you&apos;re a seasoned competitor
                        or looking for a premium night out.
                    </Typography>
                </motion.div>

                {/* Amenity Cards */}
                <Grid container spacing={3}>
                    {amenities.map((item, index) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.9, delay: index * 0.14, ease: 'easeOut' }}
                                style={{ height: '100%' }}
                            >
                                <motion.div
                                    whileHover={{ y: -10, scale: 1.015 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    style={{ height: '100%' }}
                                >
                                    <Box
                                        sx={{
                                            p: { xs: 4, md: 5 },
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            bgcolor: 'rgba(255,255,255,0.025)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 0,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'default',
                                            transition: 'all 0.4s ease',
                                            // Top edge glow that appears on hover
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0, left: 0, right: 0,
                                                height: '2px',
                                                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.9), transparent)',
                                                opacity: 0,
                                                transition: 'opacity 0.4s ease',
                                            },
                                            // Corner bracket top-left
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                top: -1, left: -1,
                                                width: 24, height: 24,
                                                borderTop: '2px solid rgba(212,175,55,0.5)',
                                                borderLeft: '2px solid rgba(212,175,55,0.5)',
                                                opacity: 0,
                                                transition: 'opacity 0.4s ease',
                                            },
                                            '&:hover': {
                                                bgcolor: 'rgba(212,175,55,0.07)',
                                                borderColor: 'rgba(212,175,55,0.25)',
                                                boxShadow: '0 24px 50px rgba(0,0,0,0.45), 0 0 30px rgba(212,175,55,0.08)',
                                                '&::before': { opacity: 1 },
                                                '&::after': { opacity: 1 },
                                            },
                                        }}
                                    >
                                        {/* Corner bracket bottom-right */}
                                        <Box sx={{
                                            position: 'absolute', bottom: -1, right: -1,
                                            width: 24, height: 24,
                                            borderBottom: '2px solid rgba(212,175,55,0)',
                                            borderRight: '2px solid rgba(212,175,55,0)',
                                            transition: 'border-color 0.4s ease',
                                            '.card-root:hover &': { borderColor: 'rgba(212,175,55,0.5)' },
                                        }} />

                                        {/* Tag badge */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 18,
                                                right: 18,
                                                bgcolor: 'rgba(212,175,55,0.1)',
                                                border: '1px solid rgba(212,175,55,0.25)',
                                                px: 1.2,
                                                py: 0.3,
                                                fontSize: '0.55rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.2em',
                                                color: '#D4AF37',
                                                fontFamily: 'var(--font-inter)',
                                            }}
                                        >
                                            {item.tag}
                                        </Box>

                                        {/* Pool ball badge */}
                                        <Box sx={{ mb: 3.5, mt: 1 }}>
                                            <motion.div
                                                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.12 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <PoolBall number={item.ballNum} color={item.ballColor} size={72} />
                                            </motion.div>
                                        </Box>

                                        <Typography
                                            variant="h5"
                                            sx={{
                                                mb: 2,
                                                color: 'text.primary',
                                                fontWeight: 700,
                                                fontFamily: 'var(--font-playfair)',
                                                fontSize: { xs: '1.1rem', md: '1.2rem' },
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'text.secondary',
                                                lineHeight: 1.8,
                                                flexGrow: 1,
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            {item.description}
                                        </Typography>
                                    </Box>
                                </motion.div>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
