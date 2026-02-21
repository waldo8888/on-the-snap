'use client';

import { Box, Container, Typography, Grid, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import Brightness1Icon from '@mui/icons-material/Brightness1';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import SportsScoreIcon from '@mui/icons-material/SportsScore'; // Using as proxy for Darts
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const amenities = [
    {
        title: '15 Premium Tables',
        description: 'Immaculately maintained 9-foot tables featuring tournament-grade felt and polished Aramith balls.',
        icon: <Brightness1Icon sx={{ fontSize: 56, color: 'primary.main', mb: 3, filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.6))' }} />,
    },
    {
        title: 'Precision Darts',
        description: '4 professional dartboards in a dedicated space. Perfect for friendly competition or serious league play.',
        icon: <SportsScoreIcon sx={{ fontSize: 56, color: 'primary.main', mb: 3, filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.6))' }} />,
    },
    {
        title: 'Lounge & Bar',
        description: 'A fully licensed bar serving curated cocktails, cold drafts, and a menu highlighted by our signature wings.',
        icon: <LocalBarIcon sx={{ fontSize: 56, color: 'primary.main', mb: 3, filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.6))' }} />,
    },
    {
        title: 'Tournaments',
        description: 'Home to multiple leagues including CPA, OPPL, and weekly in-house 8-ball and 9-ball tournaments.',
        icon: <EmojiEventsIcon sx={{ fontSize: 56, color: 'primary.main', mb: 3, filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.6))' }} />,
    }
];

export default function Amenities() {
    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: '#0a0a0a', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
            {/* Background decorative elements */}
            <Box sx={{ position: 'absolute', top: -200, left: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)', zIndex: -1, filter: 'blur(40px)' }} />
            <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)', zIndex: -1, filter: 'blur(50px)' }} />

            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                >
                    <Typography
                        variant="h2"
                        align="center"
                        sx={{
                            mb: 2,
                            color: 'text.primary',
                            letterSpacing: '-0.01em',
                            fontFamily: 'var(--font-playfair)',
                        }}
                    >
                        The Atmosphere
                    </Typography>
                    <Box sx={{ width: 80, height: 3, bgcolor: 'primary.main', mx: 'auto', mb: 6, borderRadius: 2, boxShadow: '0 0 15px rgba(212,175,55,0.5)' }} />

                    <Typography
                        variant="body1"
                        align="center"
                        sx={{
                            maxWidth: 700,
                            mx: 'auto',
                            mb: 12,
                            color: 'text.secondary',
                            fontSize: '1.25rem',
                            lineHeight: 1.8,
                        }}
                    >
                        At On The Snap, we elevate the traditional pool hall experience. Whether you&apos;re a seasoned league player or looking for a sophisticated night out, our meticulously maintained equipment and luxurious environment cater to all.
                    </Typography>
                </motion.div>

                <Grid container spacing={4}>
                    {amenities.map((item, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.8, delay: index * 0.15, ease: 'easeOut' }}
                                style={{ height: '100%' }}
                            >
                                <motion.div
                                    whileHover={{ y: -12, scale: 1.02 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ height: '100%' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: { xs: 4, md: 5 },
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: 4,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'all 0.4s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '2px',
                                                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)',
                                                opacity: 0,
                                                transition: 'opacity 0.4s ease',
                                            },
                                            '&:hover': {
                                                bgcolor: 'rgba(212, 175, 55, 0.08)',
                                                borderColor: 'rgba(212, 175, 55, 0.3)',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.1)',
                                                '&::before': { opacity: 1 }
                                            }
                                        }}
                                    >
                                        <motion.div
                                            whileHover={{ rotate: 5, scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            <Box sx={{ textAlign: 'center' }}>
                                                {item.icon}
                                            </Box>
                                        </motion.div>
                                        <Typography variant="h5" align="center" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" align="center" sx={{ color: 'text.secondary', lineHeight: 1.7, flexGrow: 1 }}>
                                            {item.description}
                                        </Typography>

                                        {/* Corner accent */}
                                        <Box sx={{ position: 'absolute', bottom: 10, right: 10, opacity: 0.1 }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </Box>
                                    </Paper>
                                </motion.div>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
