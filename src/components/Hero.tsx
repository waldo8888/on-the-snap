'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

// Floating billiard ball decoration
function FloatingBall({
    number,
    color,
    x,
    y,
    size,
    delay,
    duration,
}: {
    number: number;
    color: string;
    x: string;
    y: string;
    size: number;
    delay: number;
    duration: number;
}) {
    const id = `hero-ball-${number}`;
    return (
        <motion.div
            style={{ position: 'absolute', left: x, top: y, zIndex: 1 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: [0, 0.28, 0.28],
                scale: [0, 1, 1],
                y: [0, -18, 0, 12, 0],
                rotate: [0, 120, 240, 360],
            }}
            transition={{
                opacity: { delay, duration: 1 },
                scale: { delay, duration: 0.8, ease: 'backOut' },
                y: { delay: delay + 1, duration, repeat: Infinity, ease: 'easeInOut' },
                rotate: { delay: delay + 1, duration: duration * 1.4, repeat: Infinity, ease: 'linear' },
            }}
        >
            <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id={id} cx="35%" cy="30%" r="58%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="30" fill={color} />
                <circle cx="32" cy="32" r="30" fill={`url(#${id})`} />
                <circle cx="32" cy="32" r="11" fill="rgba(255,255,255,0.9)" />
                <text
                    x="32"
                    y="36"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#111"
                    fontFamily="Arial, sans-serif"
                    dominantBaseline="middle"
                >
                    {number}
                </text>
            </svg>
        </motion.div>
    );
}

const FLOATING_BALLS = [
    { number: 1,  color: '#F5C800', x: '6%',  y: '18%', size: 52, delay: 1.2, duration: 5.5 },
    { number: 8,  color: '#1a1a1a', x: '90%', y: '22%', size: 44, delay: 1.8, duration: 6.2 },
    { number: 3,  color: '#C02020', x: '82%', y: '62%', size: 40, delay: 0.9, duration: 7.0 },
    { number: 9,  color: '#F5C800', x: '10%', y: '70%', size: 48, delay: 2.2, duration: 5.8 },
    { number: 2,  color: '#1C4FC0', x: '72%', y: '10%', size: 36, delay: 1.5, duration: 6.5 },
    { number: 5,  color: '#E06000', x: '3%',  y: '44%', size: 34, delay: 2.5, duration: 7.5 },
];

const MARQUEE_ITEMS = [
    'POOL', 'DARTS', 'LOUNGE', 'TOURNAMENTS', 'LIVE STREAMING',
    'HAMILTON', '15 TABLES', 'CRAFT COCKTAILS', 'LEAGUES', 'OPEN LATE',
    'POOL', 'DARTS', 'LOUNGE', 'TOURNAMENTS', 'LIVE STREAMING',
    'HAMILTON', '15 TABLES', 'CRAFT COCKTAILS', 'LEAGUES', 'OPEN LATE',
];

export default function Hero() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

    const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
    const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
    const logoScale  = useTransform(scrollYProgress, [0, 0.5], [1, 0.82]);

    return (
        <Box
            ref={ref}
            id="home"
            sx={{
                position: 'relative',
                height: '100vh',
                minHeight: 680,
                width: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#040404',
            }}
        >
            {/* ── Background image with parallax ── */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    y: backgroundY,
                    zIndex: 0,
                }}
            >
                <motion.div
                    initial={{ scale: 1.12 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 12, ease: 'easeOut' }}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                >
                    <Image
                        src="/images/hero_pool_hall.jpeg"
                        alt="Luxurious pool hall at On The Snap"
                        fill
                        priority
                        style={{
                            objectFit: 'cover',
                            filter: 'brightness(0.42) contrast(1.15) saturate(1.05)',
                        }}
                    />
                </motion.div>

                {/* Layered vignette gradients */}
                <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%)' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #070707 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.5) 100%)' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%)' }} />
            </motion.div>

            {/* ── Floating pool balls ── */}
            {FLOATING_BALLS.map((b) => (
                <FloatingBall key={b.number} {...b} />
            ))}

            {/* ── Hero content ── */}
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', mt: { xs: 0, md: -6 } }}>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.6, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
                    style={{ opacity: textOpacity, scale: logoScale }}
                >
                    {/* Logo */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, md: 3 } }}>
                        <motion.div
                            whileHover={{ scale: 1.06 }}
                            transition={{ type: 'spring', stiffness: 250 }}
                        >
                            <Box sx={{ position: 'relative', width: { xs: 220, sm: 280, md: 340 }, height: { xs: 220, sm: 280, md: 340 } }}>
                                <Image
                                    src="/images/onthesnap_logo.png"
                                    alt="On The Snap Logo"
                                    fill
                                    style={{
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 0 40px rgba(212,175,55,0.6)) drop-shadow(0 0 80px rgba(212,175,55,0.3))',
                                    }}
                                    priority
                                />
                            </Box>
                        </motion.div>
                    </Box>

                    {/* Eyebrow */}
                    <motion.div
                        initial={{ opacity: 0, letterSpacing: '0.5em' }}
                        animate={{ opacity: 1, letterSpacing: '0.25em' }}
                        transition={{ duration: 1.2, delay: 0.6 }}
                    >
                        <Typography
                            sx={{
                                color: 'rgba(212,175,55,0.8)',
                                fontSize: { xs: '0.65rem', md: '0.75rem' },
                                letterSpacing: '0.25em',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                mb: 2,
                                fontFamily: 'var(--font-inter)',
                            }}
                        >
                            Hamilton&apos;s Premier Billiards &amp; Lounge
                        </Typography>
                    </motion.div>

                    {/* Subtitle with decorative lines */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: { xs: 1.5, md: 3 },
                            mb: { xs: 5, md: 7 },
                            mt: 2,
                        }}
                    >
                        <Box sx={{ flexGrow: 1, maxWidth: 80, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6))' }} />
                        <Typography
                            sx={{
                                color: 'rgba(245,245,240,0.55)',
                                fontSize: { xs: '0.75rem', md: '0.9rem' },
                                letterSpacing: '0.3em',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Pool &middot; Darts &middot; Tournaments &middot; Lounge
                        </Typography>
                        <Box sx={{ flexGrow: 1, maxWidth: 80, height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.6), transparent)' }} />
                    </Box>

                    {/* Visually-hidden h1 for SEO */}
                    <Box
                        component="h1"
                        sx={{
                            position: 'absolute',
                            width: 1,
                            height: 1,
                            overflow: 'hidden',
                            clip: 'rect(0 0 0 0)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        On The Snap – Hamilton&apos;s Premier Billiards &amp; Lounge
                    </Box>

                    {/* CTA Buttons */}
                    <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.96 }}>
                            <Button
                                variant="contained"
                                size="large"
                                href="#find-us"
                                sx={{
                                    px: { xs: 4, md: 7 },
                                    py: { xs: 1.6, md: 2.1 },
                                    fontSize: { xs: '0.85rem', md: '1rem' },
                                    letterSpacing: '0.12em',
                                    fontWeight: 800,
                                    color: '#050505',
                                    background: 'linear-gradient(135deg, #D4AF37 0%, #F0CF70 50%, #D4AF37 100%)',
                                    backgroundSize: '200% 100%',
                                    boxShadow: '0 0 30px rgba(212,175,55,0.45), 0 8px 32px rgba(0,0,0,0.4)',
                                    borderRadius: 0,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0, left: '-120%',
                                        width: '60%', height: '100%',
                                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)',
                                        transform: 'skewX(-20deg)',
                                        animation: 'btnShimmer 3.5s infinite',
                                    },
                                    '&:hover': {
                                        backgroundPosition: '100% 0',
                                        boxShadow: '0 0 50px rgba(212,175,55,0.65), 0 12px 40px rgba(0,0,0,0.5)',
                                    },
                                    '@keyframes btnShimmer': {
                                        '0%':   { left: '-120%' },
                                        '25%':  { left: '220%' },
                                        '100%': { left: '220%' },
                                    },
                                }}
                            >
                                Reserve a Table
                            </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.96 }}>
                            <Button
                                variant="outlined"
                                size="large"
                                href="#leagues"
                                sx={{
                                    px: { xs: 4, md: 7 },
                                    py: { xs: 1.6, md: 2.1 },
                                    fontSize: { xs: '0.85rem', md: '1rem' },
                                    letterSpacing: '0.12em',
                                    fontWeight: 700,
                                    color: 'rgba(245,245,240,0.85)',
                                    borderColor: 'rgba(212,175,55,0.35)',
                                    backdropFilter: 'blur(10px)',
                                    bgcolor: 'rgba(255,255,255,0.04)',
                                    borderRadius: 0,
                                    '&:hover': {
                                        borderColor: '#D4AF37',
                                        bgcolor: 'rgba(212,175,55,0.1)',
                                        color: '#D4AF37',
                                        boxShadow: '0 0 20px rgba(212,175,55,0.2)',
                                    },
                                }}
                            >
                                View Tournaments
                            </Button>
                        </motion.div>
                    </Box>
                </motion.div>
            </Container>

            {/* ── Scroll indicator ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 1 }}
                style={{
                    position: 'absolute',
                    bottom: 100,
                    left: '50%',
                    translateX: '-50%',
                    opacity: textOpacity,
                    zIndex: 2,
                }}
            >
                <Box sx={{ width: 28, height: 46, border: '1.5px solid rgba(212,175,55,0.35)', borderRadius: '14px', display: 'flex', justifyContent: 'center', pt: 1 }}>
                    <motion.div
                        animate={{ y: [0, 14, 0] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        style={{ width: 3, height: 9, background: '#D4AF37', borderRadius: 2 }}
                    />
                </Box>
            </motion.div>

            {/* ── Marquee ticker at bottom ── */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 3,
                    bgcolor: 'rgba(212,175,55,0.92)',
                    overflow: 'hidden',
                    py: 0.9,
                    borderTop: '1px solid rgba(212,175,55,0.4)',
                }}
            >
                <Box className="marquee-track" sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    {MARQUEE_ITEMS.map((item, i) => (
                        <Box
                            key={i}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0,
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: '#050505',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.2em',
                                    fontFamily: 'var(--font-inter)',
                                    px: 2.5,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {item}
                            </Typography>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.35)', flexShrink: 0 }} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
