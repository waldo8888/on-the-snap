'use client';

import { Box, Container, Typography, Grid, IconButton, Divider } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function Footer() {
    return (
        <Box component="footer" sx={{ bgcolor: '#000', py: 8, color: 'text.secondary', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Container maxWidth="lg">
                <Grid container spacing={6}>
                    {/* Brand Info */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="h5" sx={{ color: 'text.primary', fontFamily: 'var(--font-playfair), serif', mb: 2, letterSpacing: 1 }}>
                            ON THE SNAP
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8, maxWidth: 300 }}>
                            Hamilton&apos;s premier billiards & lounge destination. Professional tables, great food, and a luxury atmosphere for casual nights or competitive leagues.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton color="primary" href="https://www.facebook.com/profile.php?id=100082684215769" target="_blank">
                                <FacebookIcon />
                            </IconButton>
                            <IconButton color="primary">
                                <InstagramIcon />
                            </IconButton>
                        </Box>
                    </Grid>

                    {/* Contact */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="h6" sx={{ color: 'text.primary', mb: 3 }}>Location & Contact</Typography>

                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            <LocationOnIcon color="primary" fontSize="small" sx={{ mt: 0.5 }} />
                            <Box>
                                <Typography variant="body2">152 Gray Rd</Typography>
                                <Typography variant="body2">Stoney Creek, ON L8G 3V2</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <PhoneIcon color="primary" fontSize="small" />
                            <Typography variant="body2">+1 905-930-7688</Typography>
                        </Box>
                    </Grid>

                    {/* Hours */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="h6" sx={{ color: 'text.primary', mb: 3 }}>Hours of Operation</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Sunday - Friday</Typography>
                            <Typography variant="body2">11:00 AM - 2:00 AM</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Saturday</Typography>
                            <Typography variant="body2">11:00 AM - 2:00 AM</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 2, fontStyle: 'italic', opacity: 0.7 }}>
                            * Open late every day. Contact us directly to confirm Monday daytime hours.
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 4 }} />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        &copy; {new Date().getFullYear()} On The Snap Billiards & Lounge. All rights reserved.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, mt: { xs: 2, sm: 0 } }}>
                        <Typography variant="body2" sx={{ opacity: 0.6, cursor: 'pointer', '&:hover': { color: 'primary.main', opacity: 1 } }}>Privacy Policy</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6, cursor: 'pointer', '&:hover': { color: 'primary.main', opacity: 1 } }}>Terms of Service</Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
