'use client';

import { Box, Container, Typography, Button, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import TvIcon from '@mui/icons-material/Tv';

const CAMERA_FEEDS = [
    { label: 'Table 1 — Feature Match', active: true, image: '/images/venue_tables_1.jpg' },
    { label: 'Table 3 — League Night', active: false, image: '/images/venue_tables_2.jpg' },
    { label: 'Table 7 — Open Play', active: false, image: '/images/venue_tables_3.jpg' },
];

export default function LiveStreaming() {
    return (
        <Box
            id="live"
            sx={{
                py: { xs: 12, md: 18 },
                bgcolor: '#0a0a0a',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Ambient background */}
            <Box sx={{ position: 'absolute', top: '-5%', right: '-8%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 55%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: '0%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(26,76,200,0.04) 0%, transparent 60%)', filter: 'blur(90px)', pointerEvents: 'none' }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                >
                    <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
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
                                justifyContent: 'center',
                                gap: 1.5,
                            }}
                        >
                            <OndemandVideoIcon sx={{ fontSize: 16 }} />
                            Watch The Action
                        </Typography>

                        <Typography
                            variant="h2"
                            sx={{
                                color: 'text.primary',
                                mb: 3,
                                fontFamily: 'var(--font-playfair)',
                                fontSize: { xs: '2.4rem', md: '3.5rem' },
                            }}
                        >
                            Live Streaming
                        </Typography>

                        {/* Gold bar */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 4 }}>
                            <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D4AF37', boxShadow: '0 0 10px rgba(212,175,55,0.7)' }} />
                            <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
                        </Box>

                        <Typography
                            variant="body1"
                            sx={{
                                color: 'text.secondary',
                                maxWidth: 620,
                                mx: 'auto',
                                fontSize: '1.1rem',
                                lineHeight: 1.9,
                            }}
                        >
                            Watch the most intense matches and high-stakes tournaments live from On The Snap.
                            We broadcast feature tables in HD with multi-angle coverage and live commentary.
                        </Typography>
                    </Box>
                </motion.div>

                {/* Main broadcast area */}
                <Grid container spacing={3} alignItems="flex-start">
                    {/* Main video player */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    paddingTop: '56.25%',
                                    bgcolor: '#000',
                                    border: '1px solid rgba(212,175,55,0.25)',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    '&:hover .play-icon': { transform: 'scale(1.12)', color: '#fff' },
                                    '&:hover .video-bg': { filter: 'brightness(0.55)', transform: 'scale(1.03)' },
                                }}
                            >
                                {/* Video background */}
                                <Box
                                    className="video-bg"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: 'url(/images/hero_pool_hall.jpeg)',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: 'brightness(0.38) blur(2px)',
                                        transition: 'all 0.55s ease',
                                    }}
                                />
                                {/* Scanline overlay */}
                                <Box sx={{
                                    position: 'absolute', inset: 0,
                                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
                                    pointerEvents: 'none', zIndex: 2,
                                }} />

                                {/* LIVE badge */}
                                <Box
                                    sx={{
                                        position: 'absolute', top: 20, left: 20, zIndex: 4,
                                        display: 'flex', alignItems: 'center', gap: 1,
                                        bgcolor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                                        px: 2, py: 0.8, border: '1px solid rgba(255,60,60,0.4)',
                                    }}
                                >
                                    <motion.div
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                                    >
                                        <FiberManualRecordIcon sx={{ color: '#ff3b3b', fontSize: 14 }} />
                                    </motion.div>
                                    <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em' }}>LIVE</Typography>
                                </Box>

                                {/* Broadcast corner info */}
                                <Box
                                    sx={{
                                        position: 'absolute', bottom: 20, left: 20, zIndex: 4,
                                        bgcolor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                                        px: 2, py: 0.8, border: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <Typography sx={{ color: '#D4AF37', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                        On The Snap — Table 1
                                    </Typography>
                                </Box>

                                {/* Play button */}
                                <Box
                                    sx={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', zIndex: 3,
                                    }}
                                >
                                    {/* Ripple */}
                                    <Box sx={{
                                        position: 'absolute',
                                        top: '50%', left: '50%',
                                        width: 90, height: 90, borderRadius: '50%',
                                        bgcolor: 'primary.main', opacity: 0.18,
                                        animation: 'rippleExpand 2.2s infinite',
                                        '@keyframes rippleExpand': {
                                            '0%':   { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0.7 },
                                            '100%': { transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0 },
                                        },
                                    }} />
                                    <PlayCircleOutlineIcon
                                        className="play-icon"
                                        sx={{
                                            fontSize: { xs: 72, md: 100 },
                                            color: 'primary.main',
                                            transition: 'all 0.3s ease',
                                            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.9))',
                                            position: 'relative', zIndex: 1,
                                        }}
                                    />
                                    <Typography
                                        sx={{
                                            color: '#fff', mt: 2,
                                            fontSize: { xs: '0.9rem', md: '1.1rem' },
                                            fontWeight: 600, letterSpacing: '0.05em',
                                            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                                        }}
                                    >
                                        Featured Match: Table 1
                                    </Typography>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Camera feed list sidebar */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3 }}
                        >
                            <Box
                                sx={{
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    bgcolor: 'rgba(255,255,255,0.02)',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        px: 3, py: 2,
                                        bgcolor: 'rgba(212,175,55,0.08)',
                                        borderBottom: '1px solid rgba(212,175,55,0.15)',
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                    }}
                                >
                                    <TvIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                                    <Typography sx={{ color: 'primary.main', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                        Camera Feeds
                                    </Typography>
                                </Box>

                                {CAMERA_FEEDS.map((feed, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ x: 4 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Box
                                            sx={{
                                                px: 3, py: 2.5,
                                                display: 'flex', alignItems: 'center', gap: 2,
                                                borderBottom: i < CAMERA_FEEDS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                cursor: 'pointer',
                                                transition: 'background 0.25s ease',
                                                bgcolor: feed.active ? 'rgba(212,175,55,0.06)' : 'transparent',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                            }}
                                        >
                                            {/* Mini thumbnail */}
                                            <Box
                                                sx={{
                                                    width: 60,
                                                    height: 40,
                                                    bgcolor: '#111',
                                                    backgroundImage: `url(${feed.image})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    filter: feed.active ? 'brightness(0.7)' : 'brightness(0.35)',
                                                    flexShrink: 0,
                                                    position: 'relative',
                                                    border: feed.active ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                                }}
                                            >
                                                {feed.active && (
                                                    <Box sx={{ position: 'absolute', top: 3, left: 3, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                                        <motion.div
                                                            animate={{ opacity: [1, 0.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1.2 }}
                                                        >
                                                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#ff3b3b' }} />
                                                        </motion.div>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box>
                                                <Typography
                                                    sx={{
                                                        color: feed.active ? 'text.primary' : 'text.secondary',
                                                        fontSize: '0.82rem',
                                                        fontWeight: feed.active ? 600 : 400,
                                                        mb: 0.3,
                                                    }}
                                                >
                                                    {feed.label}
                                                </Typography>
                                                <Typography sx={{ color: feed.active ? 'primary.main' : 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em' }}>
                                                    {feed.active ? '● LIVE' : '○ IDLE'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </motion.div>
                                ))}
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>

                {/* CTA */}
                <Box sx={{ textAlign: 'center', mt: { xs: 8, md: 10 } }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <Typography sx={{ color: 'text.secondary', mb: 4, fontSize: '1rem' }}>
                            Never miss a match — subscribe for live alerts &amp; event announcements.
                        </Typography>
                        <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} style={{ display: 'inline-block' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                size="large"
                                href="https://youtube.com/@onthesnap"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                    px: 7, py: 2,
                                    fontSize: '0.9rem',
                                    letterSpacing: '0.12em',
                                    borderWidth: '1px',
                                    borderColor: 'rgba(212,175,55,0.45)',
                                    borderRadius: 0,
                                    '&:hover': {
                                        borderWidth: '1px',
                                        borderColor: 'primary.main',
                                        boxShadow: '0 0 30px rgba(212,175,55,0.25)',
                                        bgcolor: 'rgba(212,175,55,0.07)',
                                    },
                                }}
                            >
                                Subscribe on YouTube
                            </Button>
                        </motion.div>
                    </motion.div>
                </Box>
            </Container>
        </Box>
    );
}
