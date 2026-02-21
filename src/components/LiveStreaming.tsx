'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function LiveStreaming() {
    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, right: '-5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(212,175,55,0.02) 0%, transparent 60%)', filter: 'blur(80px)' }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 500 }}>
                            Watch the Action
                        </Typography>
                        <Typography variant="h2" sx={{ color: 'text.primary', mb: 4, fontFamily: 'var(--font-playfair)' }}>
                            Live Streaming
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto', fontSize: '1.2rem', lineHeight: 1.8 }}>
                            Catch the most intense matches and high-stakes tournaments live from On The Snap. We broadcast selected feature tables in high definition, complete with commentary and multiple angles.
                        </Typography>
                    </Box>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            width: '100%',
                            paddingTop: '56.25%', // 16:9 Aspect Ratio
                            bgcolor: '#000',
                            borderRadius: 4,
                            overflow: 'hidden',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            cursor: 'pointer',
                            display: 'block',
                            '&:hover .play-icon': {
                                transform: 'scale(1.1)',
                                color: '#fff',
                            },
                            '&:hover .video-bg': {
                                filter: 'brightness(0.6) blur(0px)',
                                transform: 'scale(1.02)'
                            }
                        }}
                    >
                        {/* Simulated video thumbnail / placeholder */}
                        <Box
                            className="video-bg"
                            sx={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundImage: 'url(/images/hero_pool_hall.jpeg)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'brightness(0.4) blur(3px)',
                                transition: 'all 0.6s ease',
                            }}
                        />

                        {/* LIVE Badge */}
                        <Box sx={{ position: 'absolute', top: 30, left: 30, zIndex: 3, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', px: 2, py: 1, borderRadius: 2, border: '1px solid rgba(255,100,100,0.3)' }}>
                            <motion.div
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                            >
                                <FiberManualRecordIcon sx={{ color: '#ff3b3b', fontSize: 16 }} />
                            </motion.div>
                            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, letterSpacing: 1 }}>LIVE</Typography>
                        </Box>

                        {/* Play Button Overlay */}
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                            <Box sx={{ position: 'relative' }}>
                                {/* Ripple effect behind play button */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    opacity: 0.2,
                                    animation: 'ripple 2s infinite',
                                    '@keyframes ripple': {
                                        '0%': { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0.5 },
                                        '100%': { transform: 'translate(-50%, -50%) scale(2)', opacity: 0 }
                                    }
                                }} />
                                <PlayCircleOutlineIcon className="play-icon" sx={{ fontSize: 90, color: 'primary.main', transition: 'all 0.3s ease', filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.8))', position: 'relative', zIndex: 1 }} />
                            </Box>
                            <Typography variant="h5" sx={{ color: '#fff', mt: 2, textShadow: '0 2px 10px rgba(0,0,0,0.8)', fontWeight: 500, letterSpacing: 1 }}>
                                Featured Match: Table 1
                            </Typography>
                        </Box>
                    </Box>
                </motion.div>

                <Box sx={{ textAlign: 'center', mt: 8 }}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ display: 'inline-block' }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="large"
                            sx={{
                                px: 6,
                                py: 2,
                                fontSize: '1.1rem',
                                borderWidth: '2px',
                                '&:hover': {
                                    borderWidth: '2px',
                                    boxShadow: '0 0 20px rgba(212,175,55,0.3)',
                                }
                            }}
                            href="https://youtube.com/@onthesnap"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Subscribe on YouTube
                        </Button>
                    </motion.div>
                </Box>
            </Container>
        </Box>
    );
}
