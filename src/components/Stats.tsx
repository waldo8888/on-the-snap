'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref as React.RefObject<Element>, { once: true });
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const duration = 2200;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(target);
        };
        requestAnimationFrame(tick);
    }, [inView, target]);

    return (
        <span ref={ref}>
            {count}
            {suffix}
        </span>
    );
}

const stats = [
    {
        value: 15,
        suffix: '',
        label: 'Premium Tables',
        desc: 'Tournament-grade 9-foot',
        color: '#D4AF37',
    },
    {
        value: 4,
        suffix: '',
        label: 'Pro Dart Boards',
        desc: 'Dedicated league area',
        color: '#D4AF37',
    },
    {
        value: 7,
        suffix: '+',
        label: 'League Formats',
        desc: 'CSI, OPPL & in-house',
        color: '#D4AF37',
    },
    {
        value: 2,
        suffix: ' AM',
        label: 'Close Time',
        desc: 'Open late every night',
        color: '#D4AF37',
    },
];

export default function Stats() {
    return (
        <Box
            id="stats"
            sx={{
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#0b1f14',
                borderTop: '1px solid rgba(212,175,55,0.12)',
                borderBottom: '1px solid rgba(212,175,55,0.12)',
            }}
        >
            {/* Felt-style dot pattern */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                        'radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                    pointerEvents: 'none',
                }}
            />
            {/* Diagonal stripe overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                        'repeating-linear-gradient(-45deg, transparent, transparent 14px, rgba(255,255,255,0.012) 14px, rgba(255,255,255,0.012) 28px)',
                    pointerEvents: 'none',
                }}
            />
            {/* Radial gold glow center */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 800,
                    height: 300,
                    background:
                        'radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Grid container sx={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                    {stats.map((stat, index) => (
                        <Grid
                            size={{ xs: 6, md: 3 }}
                            key={index}
                            sx={{
                                borderRight:
                                    index < 3
                                        ? { xs: index % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', md: '1px solid rgba(255,255,255,0.05)' }
                                        : 'none',
                                borderBottom: { xs: index < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none', md: 'none' },
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.9, delay: index * 0.12 }}
                            >
                                <Box
                                    sx={{
                                        textAlign: 'center',
                                        py: { xs: 5, md: 7 },
                                        px: { xs: 2, md: 5 },
                                        position: 'relative',
                                    }}
                                >
                                    {/* Stat Number */}
                                    <Typography
                                        sx={{
                                            fontSize: { xs: '3.2rem', sm: '4rem', md: '5.5rem' },
                                            fontFamily: 'var(--font-playfair)',
                                            fontWeight: 700,
                                            color: '#D4AF37',
                                            lineHeight: 1,
                                            mb: 1.5,
                                            letterSpacing: '-0.02em',
                                            textShadow:
                                                '0 0 40px rgba(212,175,55,0.35), 0 4px 20px rgba(0,0,0,0.5)',
                                        }}
                                    >
                                        <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                                    </Typography>

                                    {/* Thin gold divider line */}
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: '1.5px',
                                            background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                                            mx: 'auto',
                                            mb: 1.5,
                                        }}
                                    />

                                    <Typography
                                        sx={{
                                            color: '#f5f5f0',
                                            fontSize: { xs: '0.75rem', md: '0.85rem' },
                                            fontWeight: 700,
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            mb: 0.6,
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: 'rgba(255,255,255,0.35)',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        {stat.desc}
                                    </Typography>
                                </Box>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
