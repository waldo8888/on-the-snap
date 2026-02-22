'use client';

import { Box, Container, Typography, Button, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TvIcon from '@mui/icons-material/Tv';

const VENUE_SHOTS = [
    { label: 'Feature Tables', image: '/images/venue_tables_1.jpg' },
    { label: 'League Night', image: '/images/venue_tables_2.jpg' },
    { label: 'The Bar', image: '/images/venue_bar.jpg' },
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
                                maxWidth: 560,
                                mx: 'auto',
                                fontSize: '1.1rem',
                                lineHeight: 1.9,
                            }}
                        >
                            We&apos;re bringing live tournament coverage to the web. Subscribe on YouTube
                            to be the first notified when we go live.
                        </Typography>
                    </Box>
                </motion.div>

                {/* Coming soon + venue shots */}
                <Grid container spacing={3} alignItems="stretch">
                    {/* Main panel */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.1 }}
                            style={{ height: '100%' }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    paddingTop: '56.25%',
                                    bgcolor: '#050505',
                                    border: '1px solid rgba(212,175,55,0.2)',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Background image — venue atmosphere */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: 'url(/images/venue_crowd.jpg)',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: 'brightness(0.28) blur(3px)',
                                    }}
                                />
                                {/* Scanline overlay */}
                                <Box sx={{
                                    position: 'absolute', inset: 0,
                                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)',
                                    pointerEvents: 'none', zIndex: 2,
                                }} />
                                {/* Gold vignette edges */}
                                <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)', zIndex: 2 }} />

                                {/* Content */}
                                <Box
                                    sx={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        zIndex: 4, gap: 3,
                                    }}
                                >
                                    {/* YouTube icon */}
                                    <motion.div
                                        animate={{ scale: [1, 1.07, 1] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                    >
                                        <Box
                                            sx={{
                                                width: 80, height: 80,
                                                borderRadius: '50%',
                                                border: '1.5px solid rgba(212,175,55,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(212,175,55,0.06)',
                                                backdropFilter: 'blur(10px)',
                                            }}
                                        >
                                            <YouTubeIcon sx={{ fontSize: 38, color: '#D4AF37' }} />
                                        </Box>
                                    </motion.div>
                                    <Box sx={{ textAlign: 'center', px: 3 }}>
                                        <Typography sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair)', fontSize: { xs: '1.4rem', md: '1.9rem' }, fontWeight: 700, mb: 1 }}>
                                            Coming Soon
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
                                            Live tournament broadcasts — subscribe to be notified
                                        </Typography>
                                    </Box>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                                        <Button
                                            variant="contained"
                                            href="https://youtube.com/@onthesnap"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<YouTubeIcon />}
                                            sx={{
                                                px: 5, py: 1.5,
                                                background: 'linear-gradient(135deg, #D4AF37 0%, #F0CF70 50%, #D4AF37 100%)',
                                                color: '#050505',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.1em',
                                                borderRadius: 0,
                                                boxShadow: '0 0 25px rgba(212,175,55,0.4)',
                                                '&:hover': { boxShadow: '0 0 40px rgba(212,175,55,0.65)' },
                                            }}
                                        >
                                            Subscribe on YouTube
                                        </Button>
                                    </motion.div>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Venue shots sidebar */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3 }}
                            style={{ height: '100%' }}
                        >
                            <Box
                                sx={{
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    bgcolor: 'rgba(255,255,255,0.02)',
                                    overflow: 'hidden',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
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
                                        Inside The Snap
                                    </Typography>
                                </Box>

                                {VENUE_SHOTS.map((shot, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            flex: 1,
                                            position: 'relative',
                                            minHeight: 90,
                                            borderBottom: i < VENUE_SHOTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute', inset: 0,
                                                backgroundImage: `url(${shot.image})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                filter: 'brightness(0.55)',
                                                transition: 'filter 0.4s ease, transform 0.5s ease',
                                                '&:hover': { filter: 'brightness(0.75)', transform: 'scale(1.04)' },
                                            }}
                                        />
                                        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                                        <Box sx={{ position: 'absolute', bottom: 10, left: 14, zIndex: 2 }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                                                {shot.label}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}

