'use client';

import { Box, Container, Typography, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const GALLERY_IMAGES = [
    { src: '/images/venue_tables_1.jpg', alt: 'Premium pool tables at On The Snap', label: 'The Tables' },
    { src: '/images/venue_bar.jpg', alt: 'Bar and lounge area at On The Snap', label: 'The Bar' },
    { src: '/images/venue_crowd.jpg', alt: 'Crowd at On The Snap', label: 'Tournament Night' },
    { src: '/images/venue_tables_2.jpg', alt: 'Pool tables at On The Snap', label: 'Open Play' },
    { src: '/images/venue_darts_1.jpg', alt: 'Darts area at On The Snap', label: 'Precision Darts' },
    { src: '/images/venue_tables_3.jpg', alt: 'Pool tables at On The Snap', label: 'League Night' },
    { src: '/images/venue_darts_2.jpg', alt: 'Darts at On The Snap', label: 'Darts Arena' },
];

// Masonry layout: define column spans and row heights for visual variety
const LAYOUT = [
    { col: 'span 2', row: '1 / span 2' }, // [0] wide tall — hero shot
    { col: 'span 1', row: '1 / span 1' }, // [1]
    { col: 'span 1', row: '1 / span 1' }, // [2]
    { col: 'span 1', row: '2 / span 1' }, // [3]
    { col: 'span 1', row: '2 / span 1' }, // [4]
    { col: 'span 2', row: '3 / span 1' }, // [5] wide
    { col: 'span 2', row: '3 / span 1' }, // [6] wide
];

export default function Gallery() {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const closeLightbox = useCallback(() => setLightboxIndex(null), []);
    const prev = useCallback(() => setLightboxIndex((i) => (i === null ? 0 : (i - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)), []);
    const next = useCallback(() => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % GALLERY_IMAGES.length)), []);

    useEffect(() => {
        if (lightboxIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex, closeLightbox, prev, next]);

    return (
        <Box
            id="gallery"
            sx={{
                py: { xs: 12, md: 18 },
                bgcolor: '#060606',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Ambient glow */}
            <Box sx={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 1000, height: 600, background: 'radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(60px)' }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 1 }}
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
                            textAlign: 'center',
                        }}
                    >
                        Inside The Snap
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
                        The Experience
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: { xs: 8, md: 10 } }}>
                        <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D4AF37', boxShadow: '0 0 10px rgba(212,175,55,0.7)' }} />
                        <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
                    </Box>
                </motion.div>

                {/* Masonry grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                        gridTemplateRows: { xs: 'auto', md: 'repeat(3, 220px)' },
                        gap: { xs: 1.5, md: 2 },
                    }}
                >
                    {GALLERY_IMAGES.map((img, i) => (
                        <motion.div
                            key={img.src}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.7, delay: i * 0.08 }}
                            style={{
                                gridColumn: LAYOUT[i]?.col,
                                gridRow: LAYOUT[i]?.row,
                                cursor: 'pointer',
                            }}
                            onClick={() => setLightboxIndex(i)}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: { xs: 160, md: '100%' },
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    '&:hover .gallery-img': {
                                        transform: 'scale(1.06)',
                                        filter: 'brightness(0.8)',
                                    },
                                    '&:hover .gallery-label': {
                                        opacity: 1,
                                        transform: 'translateY(0)',
                                    },
                                }}
                            >
                                <Box
                                    className="gallery-img"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        transition: 'transform 0.6s ease, filter 0.5s ease',
                                    }}
                                >
                                    <Image
                                        src={img.src}
                                        alt={img.alt}
                                        fill
                                        sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </Box>
                                {/* Hover overlay */}
                                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)', opacity: 0, transition: 'opacity 0.4s ease', '&:hover': { opacity: 1 } }} />
                                {/* Label */}
                                <Box
                                    className="gallery-label"
                                    sx={{
                                        position: 'absolute',
                                        bottom: 14,
                                        left: 16,
                                        zIndex: 2,
                                        opacity: 0,
                                        transform: 'translateY(6px)',
                                        transition: 'all 0.35s ease',
                                    }}
                                >
                                    <Typography sx={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                                        {img.label}
                                    </Typography>
                                </Box>
                                {/* Gold corner accent */}
                                <Box sx={{
                                    position: 'absolute', top: 0, left: 0,
                                    width: 20, height: 20,
                                    borderTop: '2px solid rgba(212,175,55,0.5)',
                                    borderLeft: '2px solid rgba(212,175,55,0.5)',
                                }} />
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </Container>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 2000,
                            background: 'rgba(0,0,0,0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onClick={closeLightbox}
                    >
                        {/* Close */}
                        <IconButton
                            onClick={closeLightbox}
                            sx={{ position: 'absolute', top: 20, right: 20, color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 0, zIndex: 10 }}
                        >
                            <CloseIcon />
                        </IconButton>

                        {/* Prev */}
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            sx={{ position: 'absolute', left: { xs: 8, md: 24 }, color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 0, zIndex: 10, '&:hover': { bgcolor: 'rgba(212,175,55,0.1)' } }}
                        >
                            <ArrowBackIosNewIcon />
                        </IconButton>

                        {/* Next */}
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            sx={{ position: 'absolute', right: { xs: 8, md: 24 }, color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 0, zIndex: 10, '&:hover': { bgcolor: 'rgba(212,175,55,0.1)' } }}
                        >
                            <ArrowForwardIosIcon />
                        </IconButton>

                        {/* Image */}
                        <motion.div
                            key={lightboxIndex}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ position: 'relative', width: '90vw', maxWidth: 1100, height: '80vh' }}
                        >
                            <Image
                                src={GALLERY_IMAGES[lightboxIndex].src}
                                alt={GALLERY_IMAGES[lightboxIndex].alt}
                                fill
                                style={{ objectFit: 'contain' }}
                                priority
                            />
                            {/* Caption */}
                            <Box sx={{ position: 'absolute', bottom: -40, left: 0, right: 0, textAlign: 'center' }}>
                                <Typography sx={{ color: 'rgba(212,175,55,0.8)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                    {GALLERY_IMAGES[lightboxIndex].label}
                                    <Box component="span" sx={{ color: 'rgba(255,255,255,0.25)', mx: 2 }}>·</Box>
                                    {lightboxIndex + 1} / {GALLERY_IMAGES.length}
                                </Typography>
                            </Box>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}
