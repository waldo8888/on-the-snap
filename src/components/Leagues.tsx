'use client';

import { Box, Container, Typography, Grid, Paper, Chip } from '@mui/material';
import { motion } from 'framer-motion';

const leagueTypes = [
    '8-Ball', '9-Ball', '10-Ball', 'Open Doubles', 'Scotch Doubles', 'CPA Leagues', 'Ontario Pool Players League (OPPL)'
];

export default function Leagues() {
    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: '#050505', position: 'relative', overflow: 'hidden' }}>
            {/* Subtle light flares */}
            <Box sx={{ position: 'absolute', top: '20%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 60%)', filter: 'blur(60px)' }} />

            <Container maxWidth="lg">
                <Grid container spacing={8} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        >
                            <Typography variant="h6" sx={{ color: 'primary.main', mb: 2, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 500 }}>
                                Competitive Play
                            </Typography>
                            <Typography variant="h2" sx={{ color: 'text.primary', mb: 4, lineHeight: 1.1, fontFamily: 'var(--font-playfair)' }}>
                                Leagues & Tournaments
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, fontSize: '1.2rem', lineHeight: 1.8 }}>
                                Join the thriving billiards community at On The Snap. Whether you are looking for casual weekly play or serious competitive leagues, we host multiple formats to suit every skill level, from in-house single-player tournaments to official CPA and OPPL league nights.
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                                {leagueTypes.map((league, i) => (
                                    <motion.div
                                        key={league}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: i * 0.1 }}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                    >
                                        <Chip
                                            label={league}
                                            sx={{
                                                bgcolor: 'rgba(212, 175, 55, 0.05)',
                                                color: 'primary.main',
                                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                                borderRadius: 2,
                                                px: 2,
                                                py: 2.5,
                                                fontSize: '0.95rem',
                                                fontWeight: 500,
                                                backdropFilter: 'blur(5px)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    bgcolor: 'rgba(212, 175, 55, 0.15)',
                                                    borderColor: 'primary.main',
                                                    boxShadow: '0 4px 15px rgba(212,175,55,0.2)',
                                                }
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </Box>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                        >
                            <Box sx={{ position: 'relative', p: '1px', borderRadius: 4, overflow: 'hidden' }}>
                                {/* Animated gradient border */}
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(45deg, rgba(212,175,55,0.1), rgba(212,175,55,0.8), rgba(212,175,55,0.1))',
                                    backgroundSize: '200% 200%',
                                    animation: 'gradientFlow 5s ease infinite',
                                    zIndex: 0,
                                    '@keyframes gradientFlow': {
                                        '0%': { backgroundPosition: '0% 50%' },
                                        '50%': { backgroundPosition: '100% 50%' },
                                        '100%': { backgroundPosition: '0% 50%' },
                                    }
                                }} />

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: { xs: 5, md: 7 },
                                        bgcolor: 'rgba(10,10,10,0.95)',
                                        backdropFilter: 'blur(20px)',
                                        position: 'relative',
                                        zIndex: 1,
                                        borderRadius: 'calc(16px - 1px)',
                                        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                                    }}
                                >
                                    {/* Decorative corner accent */}
                                    <Box sx={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'linear-gradient(135deg, transparent 50%, rgba(212, 175, 55, 0.15) 50%)', borderTopRightRadius: 'calc(16px - 1px)' }} />

                                    <Typography variant="h4" sx={{ color: 'primary.main', mb: 1, fontFamily: 'var(--font-playfair)' }}>Table Rates</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5, textTransform: 'uppercase', letterSpacing: 2 }}>
                                        Everyday Pricing
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                                        <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 700, mr: 1, letterSpacing: '-0.02em' }}>$7.50</Typography>
                                        <Typography variant="h5" sx={{ color: 'primary.main', opacity: 0.8 }}>/ HR</Typography>
                                    </Box>

                                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0, lineHeight: 1.8, fontSize: '1.1rem' }}>
                                        Enjoy our meticulously maintained tables at an accessible rate. Walk-ins are always welcome, but reservations are recommended for peak hours and league nights.
                                    </Typography>
                                </Paper>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
