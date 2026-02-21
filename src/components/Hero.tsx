'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

export default function Hero() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start'],
    });

    // Parallax translation for the background image
    const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

    // Fade out effect for the text as user scrolls down
    const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

    return (
        <Box
            ref={ref}
            sx={{
                position: 'relative',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#050505',
            }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    y: backgroundY,
                    zIndex: 0,
                }}
            >
                <motion.div
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 10, ease: 'easeOut' }}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                >
                    <Image
                        src="/images/hero_pool_hall.jpeg"
                        alt="Luxurious pool hall with pristine green felt table"
                        fill
                        priority
                        style={{
                            objectFit: 'cover',
                            filter: 'brightness(0.5) contrast(1.2) saturate(1.1)',
                        }}
                    />
                </motion.div>
                {/* Multi-layered gradient for depth */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, #0a0a0a 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
                    }}
                />
            </motion.div>

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', mt: -10 }}>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    style={{ opacity: textOpacity, scale: logoScale }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                            transition={{ duration: 0.4 }}
                            style={{ position: 'relative', width: 220, height: 220 }}
                        >
                            <Image
                                src="/images/onthesnap_logo.png"
                                alt="On The Snap Logo"
                                fill
                                style={{ objectFit: 'contain', filter: 'drop-shadow(0px 0px 25px rgba(212, 175, 55, 0.5))' }}
                                priority
                            />
                        </motion.div>
                    </Box>

                    <Typography
                        variant="h1"
                        sx={{
                            color: 'text.primary',
                            fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem' },
                            lineHeight: 1.1,
                            mb: 2,
                            letterSpacing: '-0.02em',
                            textShadow: '0 10px 30px rgba(0,0,0,0.8)',
                            fontFamily: 'var(--font-playfair)',
                        }}
                    >
                        ON THE SNAP
                    </Typography>

                    <Typography
                        variant="h4"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 400,
                            fontSize: { xs: '1rem', md: '1.5rem' },
                            mb: 6,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            textShadow: '0 4px 15px rgba(212,175,55,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <Box component="span" sx={{ width: 40, height: '1px', bgcolor: 'primary.main', opacity: 0.5 }} />
                        Billiards & Lounge
                        <Box component="span" sx={{ width: 40, height: '1px', bgcolor: 'primary.main', opacity: 0.5 }} />
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{
                                    px: 6,
                                    py: 2,
                                    color: 'background.default',
                                    fontSize: '1rem',
                                    letterSpacing: '0.1em',
                                    bgcolor: 'primary.main',
                                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '50%',
                                        height: '100%',
                                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
                                        transform: 'skewX(-25deg)',
                                        animation: 'shimmer 3s infinite',
                                    },
                                    '&:hover': {
                                        bgcolor: 'primary.light',
                                        boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)',
                                    },
                                    '@keyframes shimmer': {
                                        '0%': { left: '-100%' },
                                        '20%': { left: '200%' },
                                        '100%': { left: '200%' },
                                    }
                                }}
                            >
                                Reserve a Table
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="large"
                                sx={{
                                    px: 6,
                                    py: 2,
                                    fontSize: '1rem',
                                    letterSpacing: '0.1em',
                                    borderWidth: '1px',
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(10px)',
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'rgba(212, 175, 55, 0.1)',
                                        color: 'primary.main',
                                        borderWidth: '1px',
                                    },
                                }}
                            >
                                Tournaments
                            </Button>
                        </motion.div>
                    </Box>
                </motion.div>
            </Container>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                style={{
                    position: 'absolute',
                    bottom: 40,
                    left: '50%',
                    translateX: '-50%',
                    opacity: textOpacity,
                }}
            >
                <Box
                    sx={{
                        width: 30,
                        height: 50,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: 15,
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 1,
                    }}
                >
                    <motion.div
                        animate={{ y: [0, 15, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        style={{
                            width: 4,
                            height: 10,
                            backgroundColor: '#D4AF37',
                            borderRadius: 2,
                        }}
                    />
                </Box>
            </motion.div>
        </Box>
    );
}
