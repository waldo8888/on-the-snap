'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
} from '@mui/material';
import { motion } from 'framer-motion';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navLinks = [
    { label: 'MENU', href: '/menu' },
    { label: 'PLAY', href: '/#amenities' },
    { label: 'LEAGUES', href: '/#leagues' },
    { label: 'LIVE', href: '/#live' },
    { label: 'CONTACT', href: '/#contact' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 80);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
            <Box
                component="nav"
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                    transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    bgcolor: scrolled ? 'rgba(5,5,5,0.90)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
                    boxShadow: scrolled ? '0 1px 0 rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.6)' : 'none',
                }}
            >
                {/* Animated gold accent line at bottom */}
                <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: scrolled ? 1 : 0, opacity: scrolled ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.7) 30%, rgba(240,207,112,0.9) 50%, rgba(212,175,55,0.7) 70%, transparent 100%)',
                        transformOrigin: 'center',
                    }}
                />

                <Container maxWidth="xl">
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: scrolled ? 1.5 : 2.5,
                            transition: 'padding 0.4s ease',
                        }}
                    >
                        {/* Logo */}
                        <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                            <Box
                                component="a"
                                href="/"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                }}
                            >
                                {/* OTS badge */}
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #D4AF37 0%, #9e7f1e 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        fontWeight: 900,
                                        color: '#050505',
                                        fontFamily: 'var(--font-inter)',
                                        letterSpacing: '0.05em',
                                        boxShadow: '0 0 18px rgba(212,175,55,0.5)',
                                        flexShrink: 0,
                                    }}
                                >
                                    OTS
                                </Box>
                                <Box>
                                    <Box
                                        sx={{
                                            fontFamily: 'var(--font-playfair)',
                                            fontSize: { xs: '0.85rem', sm: '1rem' },
                                            fontWeight: 700,
                                            color: '#f5f5f0',
                                            letterSpacing: '0.1em',
                                            lineHeight: 1,
                                        }}
                                    >
                                        ON THE SNAP
                                    </Box>
                                    <Box
                                        sx={{
                                            fontSize: '0.5rem',
                                            color: 'rgba(212,175,55,0.75)',
                                            letterSpacing: '0.28em',
                                            textTransform: 'uppercase',
                                            lineHeight: 1,
                                            mt: 0.4,
                                        }}
                                    >
                                        Billiards &amp; Lounge
                                    </Box>
                                </Box>
                            </Box>
                        </motion.div>

                        {/* Desktop Links */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 4 }}>
                            {navLinks.map((link) => (
                                <Box
                                    key={link.label}
                                    component="a"
                                    href={link.href}
                                    sx={{
                                        color: 'rgba(245,245,240,0.65)',
                                        textDecoration: 'none',
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.18em',
                                        fontWeight: 700,
                                        fontFamily: 'var(--font-inter)',
                                        position: 'relative',
                                        pb: 0.5,
                                        transition: 'color 0.3s ease',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            width: 0,
                                            height: '1.5px',
                                            background: 'linear-gradient(90deg, #D4AF37, #F0CF70)',
                                            transition: 'width 0.35s ease',
                                        },
                                        '&:hover': {
                                            color: '#D4AF37',
                                            '&::after': { width: '100%' },
                                        },
                                    }}
                                >
                                    {link.label}
                                </Box>
                            ))}

                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    sx={{
                                        background: 'linear-gradient(135deg, #D4AF37 0%, #F0CF70 50%, #D4AF37 100%)',
                                        backgroundSize: '200% 100%',
                                        color: '#050505',
                                        px: 3.5,
                                        py: 1.1,
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.12em',
                                        fontWeight: 800,
                                        borderRadius: 0,
                                        boxShadow: '0 0 20px rgba(212,175,55,0.35)',
                                        '&:hover': {
                                            backgroundPosition: '100% 0',
                                            boxShadow: '0 0 35px rgba(212,175,55,0.6)',
                                        },
                                    }}
                                >
                                    BOOK A TABLE
                                </Button>
                            </motion.div>
                        </Box>

                        {/* Mobile Menu Button */}
                        <IconButton
                            sx={{
                                display: { xs: 'flex', md: 'none' },
                                color: '#D4AF37',
                                border: '1px solid rgba(212,175,55,0.3)',
                                borderRadius: 0,
                                p: 1,
                            }}
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open menu"
                        >
                            <MenuIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Container>
            </Box>

            {/* Mobile Drawer */}
            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                PaperProps={{
                    sx: {
                        width: 300,
                        bgcolor: '#070707',
                        borderLeft: '1px solid rgba(212,175,55,0.15)',
                    },
                }}
            >
                <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                        <Box
                            sx={{
                                fontFamily: 'var(--font-playfair)',
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: '#D4AF37',
                                letterSpacing: '0.1em',
                            }}
                        >
                            ON THE SNAP
                        </Box>
                        <IconButton sx={{ color: 'rgba(255,255,255,0.5)', p: 0.5 }} onClick={() => setMobileOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                        {navLinks.map((link, i) => (
                            <ListItem key={link.label} disablePadding>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: mobileOpen ? 1 : 0, x: mobileOpen ? 0 : 20 }}
                                    transition={{ delay: i * 0.08, duration: 0.3 }}
                                    style={{ width: '100%' }}
                                >
                                    <Box
                                        component="a"
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        sx={{
                                            display: 'block',
                                            color: 'rgba(245,245,240,0.8)',
                                            textDecoration: 'none',
                                            fontSize: '1.6rem',
                                            fontFamily: 'var(--font-playfair)',
                                            fontWeight: 700,
                                            py: 1.5,
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'color 0.3s ease',
                                            '&:hover': { color: '#D4AF37' },
                                        }}
                                    >
                                        {link.label}
                                    </Box>
                                </motion.div>
                            </ListItem>
                        ))}
                    </List>

                    <Button
                        variant="contained"
                        fullWidth
                        sx={{
                            background: 'linear-gradient(135deg, #D4AF37, #F0CF70)',
                            color: '#050505',
                            py: 1.8,
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            letterSpacing: '0.15em',
                            borderRadius: 0,
                        }}
                    >
                        BOOK A TABLE
                    </Button>
                </Box>
            </Drawer>
        </>
    );
}
