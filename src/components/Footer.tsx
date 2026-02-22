'use client';

import { Box, Container, Typography, Grid, IconButton, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Image from 'next/image';

// Decorative row of 15 pool balls
const BALL_COLORS = [
    '#F5C800', // 1 yellow
    '#1A5CC8', // 2 blue
    '#C02020', // 3 red
    '#6A0DAD', // 4 purple
    '#E06000', // 5 orange
    '#188040', // 6 green
    '#8B0000', // 7 maroon
    '#1a1a1a', // 8 black
    '#F5C800', // 9 stripe yellow
    '#1A5CC8', // 10 stripe blue
    '#C02020', // 11 stripe red
    '#6A0DAD', // 12 stripe purple
    '#E06000', // 13 stripe orange
    '#188040', // 14 stripe green
    '#8B0000', // 15 stripe maroon
];

function FooterBall({ color, n }: { color: string; n: number }) {
    const id = `footer-ball-${n}`;
    const isStripe = n >= 9;
    return (
        <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id={id} cx="38%" cy="32%" r="55%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <clipPath id={`clip-${id}`}>
                    <circle cx="16" cy="16" r="14" />
                </clipPath>
            </defs>
            <circle cx="16" cy="16" r="14" fill={isStripe ? '#f0f0f0' : color} />
            {isStripe && (
                <rect x="2" y="10" width="28" height="12" fill={color} clipPath={`url(#clip-${id})`} />
            )}
            <circle cx="16" cy="16" r="14" fill={`url(#${id})`} />
            <circle cx="16" cy="16" r="5.5" fill="rgba(255,255,255,0.92)" />
            <text x="16" y="16" textAnchor="middle" dominantBaseline="central" fontSize={n >= 10 ? '4.5' : '5.5'} fontWeight="800" fill="#111" fontFamily="Arial,sans-serif">{n}</text>
        </svg>
    );
}

export default function Footer() {
    return (
        <Box
            id="contact"
            component="footer"
            sx={{
                bgcolor: '#040404',
                color: 'text.secondary',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Background glow */}
            <Box sx={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(212,175,55,0.03) 0%, transparent 65%)', pointerEvents: 'none' }} />

            {/* Pool balls decorative row */}
            <Box
                sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    py: 2.5,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1.5, md: 2 }, flexWrap: 'wrap' }}>
                        {BALL_COLORS.map((color, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.04 }}
                                whileHover={{ y: -4, scale: 1.2 }}
                            >
                                <FooterBall color={color} n={i + 1} />
                            </motion.div>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Main footer content */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 }, position: 'relative', zIndex: 1 }}>
                <Grid container spacing={6}>
                    {/* Brand */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Box sx={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                                    <Image
                                        src="/images/onthesnap_logo.png"
                                        alt="On The Snap"
                                        fill
                                        style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.4))' }}
                                    />
                                </Box>
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: 'text.primary',
                                            fontFamily: 'var(--font-playfair)',
                                            letterSpacing: '0.08em',
                                            lineHeight: 1,
                                            mb: 0.4,
                                        }}
                                    >
                                        ON THE SNAP
                                    </Typography>
                                    <Typography sx={{ color: 'rgba(212,175,55,0.65)', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                                        Billiards &amp; Lounge
                                    </Typography>
                                </Box>
                            </Box>

                            <Typography variant="body2" sx={{ mb: 4, lineHeight: 1.9, maxWidth: 300, color: 'rgba(255,255,255,0.45)' }}>
                                Hamilton&apos;s premier billiards &amp; lounge. Professional tables,
                                great food, live streaming, and a luxury atmosphere for casual nights or competitive league play.
                            </Typography>

                            {/* Social links */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {[
                                    { icon: <FacebookIcon fontSize="small" />, href: 'https://www.facebook.com/profile.php?id=100082684215769', label: 'Facebook' },
                                    { icon: <InstagramIcon fontSize="small" />, href: '#', label: 'Instagram' },
                                ].map(({ icon, href, label }) => (
                                    <IconButton
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        sx={{
                                            color: 'rgba(255,255,255,0.4)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 0,
                                            p: 1.2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                color: '#D4AF37',
                                                borderColor: 'rgba(212,175,55,0.4)',
                                                bgcolor: 'rgba(212,175,55,0.07)',
                                                transform: 'translateY(-3px)',
                                            },
                                        }}
                                    >
                                        {icon}
                                    </IconButton>
                                ))}
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Contact */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'text.primary',
                                    mb: 4,
                                    fontSize: '0.8rem',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    fontFamily: 'var(--font-inter)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    '&::after': {
                                        content: '""',
                                        flex: 1,
                                        height: '1px',
                                        background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)',
                                    },
                                }}
                            >
                                Find Us
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                                <LocationOnIcon sx={{ color: 'primary.main', fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 0.3 }}>152 Gray Rd</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>Stoney Creek, ON L8G 3V2</Typography>
                                    <Typography
                                        component="a"
                                        href="https://maps.google.com/?q=152+Gray+Rd+Stoney+Creek+ON"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            color: 'rgba(212,175,55,0.6)',
                                            fontSize: '0.75rem',
                                            textDecoration: 'none',
                                            mt: 0.8,
                                            display: 'inline-block',
                                            letterSpacing: '0.06em',
                                            transition: 'color 0.3s',
                                            '&:hover': { color: 'primary.main' },
                                        }}
                                    >
                                        Get Directions →
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <PhoneIcon sx={{ color: 'primary.main', fontSize: 18, flexShrink: 0 }} />
                                <Typography
                                    component="a"
                                    href="tel:+19059307688"
                                    variant="body2"
                                    sx={{
                                        color: 'rgba(255,255,255,0.75)',
                                        textDecoration: 'none',
                                        transition: 'color 0.3s',
                                        '&:hover': { color: '#D4AF37' },
                                    }}
                                >
                                    +1 905-930-7688
                                </Typography>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Hours */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'text.primary',
                                    mb: 4,
                                    fontSize: '0.8rem',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    fontFamily: 'var(--font-inter)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    '&::after': {
                                        content: '""',
                                        flex: 1,
                                        height: '1px',
                                        background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)',
                                    },
                                }}
                            >
                                <AccessTimeIcon sx={{ fontSize: 16 }} />
                                Hours
                            </Typography>

                            {[
                                { day: 'Sunday – Friday', hours: '11:00 AM – 2:00 AM' },
                                { day: 'Saturday', hours: '11:00 AM – 2:00 AM' },
                            ].map(({ day, hours }) => (
                                <Box
                                    key={day}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 2.5,
                                        pb: 2.5,
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>{day}</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{hours}</Typography>
                                </Box>
                            ))}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                                <Box
                                    sx={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        bgcolor: '#39FF14',
                                        boxShadow: '0 0 10px rgba(57,255,20,0.7)',
                                        animation: 'glowPulse 2s ease-in-out infinite',
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                    Open late every day. Contact us for Monday daytime hours.
                                </Typography>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Bottom bar */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            py: 3,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
                            &copy; {new Date().getFullYear()} On The Snap Billiards &amp; Lounge. All rights reserved.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 4 }}>
                            {[
                                { label: 'Menu', href: '/menu' },
                                { label: 'Privacy Policy', href: '/privacy-policy' },
                                { label: 'Terms of Service', href: '/terms-of-service' }
                            ].map(({ label, href }) => (
                                <Typography
                                    key={label}
                                    component="a"
                                    href={href}
                                    variant="body2"
                                    sx={{
                                        color: 'rgba(255,255,255,0.2)',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        transition: 'color 0.3s ease',
                                        '&:hover': { color: 'primary.main' },
                                    }}
                                >
                                    {label}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}
