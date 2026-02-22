'use client';

import { Box, Container, Typography, Grid, Button } from '@mui/material';
import { motion } from 'framer-motion';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TableBarIcon from '@mui/icons-material/TableBar';

const HOURS = [
    { day: 'Tuesday – Friday', hours: '4:00 PM – 2:00 AM' },
    { day: 'Saturday – Sunday', hours: '11:00 AM – 2:00 AM' },
    { day: 'Monday', hours: 'Call for hours' },
];

export default function FindUs() {
    return (
        <Box
            id="find-us"
            sx={{
                py: { xs: 12, md: 18 },
                bgcolor: '#050505',
                position: 'relative',
                overflow: 'hidden',
                borderTop: '1px solid rgba(212,175,55,0.1)',
            }}
        >
            {/* Ambient glow */}
            <Box sx={{ position: 'absolute', top: '-10%', right: '-10%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 60%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: '5%', left: '-8%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(26,76,200,0.03) 0%, transparent 60%)', filter: 'blur(90px)', pointerEvents: 'none' }} />

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
                        Come Visit Us
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
                        Find Us
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: { xs: 8, md: 12 } }}>
                        <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D4AF37', boxShadow: '0 0 10px rgba(212,175,55,0.7)' }} />
                        <Box sx={{ width: 55, height: '1px', background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
                    </Box>
                </motion.div>

                <Grid container spacing={{ xs: 6, md: 8 }} alignItems="stretch">
                    {/* Map */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ height: '100%' }}
                        >
                            <Box
                                sx={{
                                    width: '100%',
                                    height: { xs: 320, md: 460 },
                                    border: '1px solid rgba(212,175,55,0.25)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                        border: '1px solid rgba(212,175,55,0.12)',
                                        pointerEvents: 'none',
                                        zIndex: 2,
                                    },
                                }}
                            >
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2907.0!2d-79.7174!3d43.2185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882c9b3c3b3c3b3b%3A0x0!2s152+Gray+Rd%2C+Stoney+Creek%2C+ON+L8G+3V2!5e0!3m2!1sen!2sca!4v1"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, filter: 'invert(0.9) hue-rotate(180deg) saturate(0.4) brightness(0.85)' }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="On The Snap location map"
                                />
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Info */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
                        >
                            <Box
                                sx={{
                                    p: { xs: 4, md: 5 },
                                    bgcolor: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0,
                                        height: '2px',
                                        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)',
                                    },
                                }}
                            >
                                {/* Address */}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <LocationOnIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                        <Typography sx={{ color: 'primary.main', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                            Address
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ color: 'rgba(245,245,240,0.85)', fontSize: '1.05rem', lineHeight: 1.8, mb: 1.5 }}>
                                        152 Gray Rd<br />
                                        Stoney Creek, ON L8G 3V2<br />
                                        Hamilton, Ontario
                                    </Typography>
                                    <Typography
                                        component="a"
                                        href="https://maps.google.com/?q=152+Gray+Rd+Stoney+Creek+ON"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            color: 'rgba(212,175,55,0.65)',
                                            fontSize: '0.78rem',
                                            textDecoration: 'none',
                                            letterSpacing: '0.08em',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            transition: 'color 0.3s',
                                            '&:hover': { color: 'primary.main' },
                                        }}
                                    >
                                        Get Directions →
                                    </Typography>
                                </Box>

                                {/* Divider */}
                                <Box sx={{ height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)' }} />

                                {/* Phone */}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <PhoneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                        <Typography sx={{ color: 'primary.main', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                            Phone
                                        </Typography>
                                    </Box>
                                    <Typography
                                        component="a"
                                        href="tel:+19059307688"
                                        sx={{
                                            color: 'rgba(245,245,240,0.85)',
                                            fontSize: '1.3rem',
                                            fontFamily: 'var(--font-playfair)',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            letterSpacing: '0.05em',
                                            transition: 'color 0.3s',
                                            '&:hover': { color: '#D4AF37' },
                                        }}
                                    >
                                        905-930-7688
                                    </Typography>
                                </Box>

                                {/* Divider */}
                                <Box sx={{ height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)' }} />

                                {/* Hours */}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                        <Typography sx={{ color: 'primary.main', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                            Hours
                                        </Typography>
                                    </Box>
                                    {HOURS.map(({ day, hours }) => (
                                        <Box key={day} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>{day}</Typography>
                                            <Typography sx={{ color: 'rgba(245,245,240,0.85)', fontSize: '0.85rem', fontWeight: 600 }}>{hours}</Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* CTA */}
                                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        href="tel:+19059307688"
                                        startIcon={<TableBarIcon />}
                                        sx={{
                                            mt: 'auto',
                                            background: 'linear-gradient(135deg, #D4AF37 0%, #F0CF70 50%, #D4AF37 100%)',
                                            color: '#050505',
                                            py: 1.8,
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            letterSpacing: '0.12em',
                                            borderRadius: 0,
                                            boxShadow: '0 0 25px rgba(212,175,55,0.35)',
                                            '&:hover': { boxShadow: '0 0 40px rgba(212,175,55,0.6)' },
                                        }}
                                    >
                                        Reserve a Table
                                    </Button>
                                </motion.div>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
