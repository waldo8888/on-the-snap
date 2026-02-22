'use client';

import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Paper, Tabs, Tab, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { foodMenu, drinksMenu, nonAlcoholicMenu, studentMenu, weeklySpecials, extras, MenuSection, MenuCategory, MenuItem } from '@/data/menu';

const MotionPaper = motion(Paper);
// Ornamental divider component
function OrnamentalDivider({ width = 200, my = 3 }: { width?: number; my?: number }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my, gap: 1.5 }}>
            <Box sx={{
                width: width * 0.35,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))',
            }} />
            <Box sx={{
                width: 6, height: 6,
                transform: 'rotate(45deg)',
                backgroundColor: 'rgba(212,175,55,0.6)',
            }} />
            <Box sx={{
                width: width * 0.35,
                height: '1px',
                background: 'linear-gradient(270deg, transparent, rgba(212,175,55,0.5))',
            }} />
        </Box>
    );
}

// Sub-filter groups for the Drink Menu tab
const drinkSubGroups: { label: string; filter: string[] }[] = [
    { label: "All", filter: [] },
    { label: "Beer", filter: ["Beer in a Bottle", "Beer in a Can (Tall boys)", "Draft Beer"] },
    { label: "Cocktails", filter: ["Cocktails"] },
    { label: "Coolers", filter: ["Coolers"] },
    { label: "Shots", filter: ["Shoot Your Shot \u2014 Fun Shots", "Shoot Your Shot \u2014 Chilled Shots"] },
    { label: "Spirits", filter: ["Hard Shots \u2014 Vodka", "Hard Shots \u2014 Tequila", "Hard Shots \u2014 Cognac", "Hard Shots \u2014 Rum", "Hard Shots \u2014 Liqueurs", "Hard Shots \u2014 Whiskey & Rye", "Hard Shots \u2014 Bourbon & Scotch", "Hard Shots \u2014 Brandy & Gin"] },
    { label: "Wine", filter: ["Wines from Pillitteri Estates Winery"] },
];

// Tab icons for the premium feel
const tabIcons: Record<number, string> = { 0: '🍽', 1: '🍸', 2: '☕', 3: '🎓' };

export default function MenuUI() {
    const [activeTab, setActiveTab] = useState(0);
    const [drinkFilter, setDrinkFilter] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setDrinkFilter(0);
    };

    const sections: MenuSection[] = [foodMenu, drinksMenu, nonAlcoholicMenu, studentMenu];

    const getFilteredCategories = (): MenuCategory[] => {
        const section = sections[activeTab];
        if (activeTab !== 1 || drinkFilter === 0) return section.categories;
        const group = drinkSubGroups[drinkFilter];
        return section.categories.filter(c => group.filter.includes(c.title));
    };

    const filteredCategories = getFilteredCategories();

    return (
        <Box sx={{
            minHeight: '100vh',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#050505',
            // Layered radial gradients for depth
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: `
                    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 60%),
                    radial-gradient(ellipse 60% 40% at 20% 80%, rgba(212,175,55,0.02) 0%, transparent 50%),
                    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(212,175,55,0.02) 0%, transparent 50%)
                `,
                zIndex: 0,
                pointerEvents: 'none',
            },
            // Subtle noise texture overlay
            '&::after': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0.015,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                zIndex: 0,
                pointerEvents: 'none',
            },
        }}>
            {/* ── Premium Header Section ── */}
            <Box sx={{
                pt: { xs: 14, md: 18 },
                pb: { xs: 4, md: 6 },
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
            }}>
                <Container maxWidth="md">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Small top label */}
                        <Typography
                            sx={{
                                color: 'rgba(212,175,55,0.5)',
                                fontSize: '0.75rem',
                                letterSpacing: '0.35em',
                                textTransform: 'uppercase',
                                fontFamily: 'var(--font-inter)',
                                mb: 2,
                            }}
                        >
                            On The Snap Pool Hall & Bar
                        </Typography>

                        {/* Main title with shimmer */}
                        <Typography
                            variant="h1"
                            className="shimmer-gold"
                            sx={{
                                fontSize: { xs: '3rem', sm: '4rem', md: '5.5rem' },
                                fontWeight: 700,
                                fontFamily: 'var(--font-playfair)',
                                lineHeight: 1,
                                mb: 1,
                            }}
                        >
                            The Menu
                        </Typography>

                        <OrnamentalDivider width={260} my={2.5} />

                        <Typography
                            sx={{
                                color: 'rgba(255,255,255,0.45)',
                                fontWeight: 300,
                                maxWidth: '520px',
                                mx: 'auto',
                                fontSize: { xs: '0.95rem', md: '1.1rem' },
                                lineHeight: 1.7,
                                fontFamily: 'var(--font-inter)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            Elevated bar classics, handcrafted cocktails, and specials made for every moment.
                        </Typography>
                    </motion.div>
                </Container>
            </Box>

            {/* ── Main Content ── */}
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pb: { xs: 8, md: 12 } }}>

                {/* ── Premium Tab Navigation ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <Box sx={{
                        mb: { xs: 4, md: 5 },
                        display: 'flex',
                        justifyContent: 'center',
                    }}>
                        <Box sx={{
                            display: 'inline-flex',
                            background: 'rgba(255,255,255,0.02)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(212,175,55,0.12)',
                            borderRadius: '60px',
                            p: 0.5,
                        }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                variant="scrollable"
                                scrollButtons={false}
                                TabIndicatorProps={{ style: { display: 'none' } }}
                                sx={{
                                    minHeight: 'unset',
                                    '& .MuiTab-root': {
                                        color: 'rgba(255,255,255,0.4)',
                                        fontSize: { xs: '0.8rem', md: '0.9rem' },
                                        fontFamily: 'var(--font-inter)',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        letterSpacing: '0.04em',
                                        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                                        px: { xs: 2, md: 3 },
                                        py: 1.2,
                                        minHeight: 'unset',
                                        borderRadius: '50px',
                                        '&.Mui-selected': {
                                            color: '#000',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #D4AF37, #F0CF70)',
                                            boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
                                        },
                                        '&:not(.Mui-selected):hover': {
                                            color: 'rgba(212,175,55,0.8)',
                                            background: 'rgba(212,175,55,0.06)',
                                        },
                                    },
                                }}
                            >
                                {sections.map((section, i) => (
                                    <Tab
                                        key={i}
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                <span style={{ fontSize: '1rem' }}>{tabIcons[i]}</span>
                                                <span>{section.title}</span>
                                            </Box>
                                        }
                                    />
                                ))}
                            </Tabs>
                        </Box>
                    </Box>
                </motion.div>

                {/* ── Drink Sub-Filters ── */}
                {activeTab === 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 1,
                            mb: 5,
                        }}>
                            {drinkSubGroups.map((g, i) => {
                                const isActive = drinkFilter === i;
                                return (
                                    <Chip
                                        key={i}
                                        label={g.label}
                                        onClick={() => setDrinkFilter(i)}
                                        sx={{
                                            cursor: 'pointer',
                                            fontWeight: isActive ? 700 : 400,
                                            fontSize: '0.82rem',
                                            px: 1.5,
                                            py: 0.3,
                                            letterSpacing: '0.03em',
                                            backgroundColor: isActive
                                                ? 'transparent'
                                                : 'rgba(255,255,255,0.03)',
                                            color: isActive ? 'var(--color-gold)' : 'rgba(255,255,255,0.45)',
                                            border: isActive
                                                ? '1px solid var(--color-gold)'
                                                : '1px solid rgba(255,255,255,0.07)',
                                            borderRadius: '20px',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: isActive ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.06)',
                                                color: 'var(--color-gold)',
                                                borderColor: 'rgba(212,175,55,0.4)',
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </motion.div>
                )}

                {/* ── Tab Content ── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${activeTab}-${drinkFilter}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Grid container spacing={{ xs: 2.5, md: 3.5 }}>
                            {filteredCategories.map((category, index) => (
                                <Grid size={{ xs: 12, md: activeTab === 3 ? 12 : 6 }} key={index}>
                                    <MenuCategoryCard category={category} delay={index * 0.06} />
                                </Grid>
                            ))}
                        </Grid>

                        {/* ── Food tab extras: Weekly Specials + Customize ── */}
                        {activeTab === 0 && (
                            <>
                                {/* Weekly Specials */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ marginTop: '3.5rem' }}
                                >
                                    <Paper sx={{
                                        p: { xs: 3, md: 5 },
                                        background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(15,15,15,0.6) 100%)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(212,175,55,0.12)',
                                        borderRadius: '20px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0, left: '10%', right: '10%',
                                            height: '1px',
                                            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
                                        },
                                    }}>
                                        <Typography sx={{
                                            color: 'rgba(212,175,55,0.45)',
                                            fontSize: '0.7rem',
                                            letterSpacing: '0.3em',
                                            textTransform: 'uppercase',
                                            textAlign: 'center',
                                            mb: 1,
                                        }}>
                                            Available Daily
                                        </Typography>
                                        <Typography variant="h4" sx={{
                                            color: 'var(--color-gold)',
                                            fontFamily: 'var(--font-playfair)',
                                            textAlign: 'center',
                                            fontSize: { xs: '1.5rem', md: '2rem' },
                                            mb: 0.5,
                                        }}>
                                            Weekly Specials
                                        </Typography>
                                        <OrnamentalDivider width={160} my={2} />
                                        <Grid container spacing={2}>
                                            {weeklySpecials.map((spec, i) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                                                    <Box sx={{
                                                        textAlign: 'center',
                                                        py: 2,
                                                        px: 1.5,
                                                        borderRadius: '12px',
                                                        background: 'rgba(0,0,0,0.2)',
                                                        border: '1px solid rgba(212,175,55,0.06)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            borderColor: 'rgba(212,175,55,0.2)',
                                                            background: 'rgba(212,175,55,0.03)',
                                                        },
                                                    }}>
                                                        <Typography sx={{
                                                            color: 'var(--color-gold)',
                                                            fontWeight: 600,
                                                            fontFamily: 'var(--font-playfair)',
                                                            fontSize: '1.15rem',
                                                            mb: 0.8,
                                                        }}>
                                                            {spec.day}
                                                        </Typography>
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.55)',
                                                            fontSize: '0.85rem',
                                                            lineHeight: 1.5,
                                                        }}>
                                                            {spec.special}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Paper>
                                </motion.div>

                                {/* Customize Your Order */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ marginTop: '2rem' }}
                                >
                                    <Paper sx={{
                                        p: { xs: 3, md: 5 },
                                        background: 'rgba(10, 10, 10, 0.7)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: '20px',
                                    }}>
                                        <Typography sx={{
                                            color: 'rgba(255,255,255,0.3)',
                                            fontSize: '0.7rem',
                                            letterSpacing: '0.3em',
                                            textTransform: 'uppercase',
                                            textAlign: 'center',
                                            mb: 1,
                                        }}>
                                            Make It Yours
                                        </Typography>
                                        <Typography variant="h4" sx={{
                                            color: 'var(--color-gold)',
                                            fontFamily: 'var(--font-playfair)',
                                            textAlign: 'center',
                                            fontSize: { xs: '1.5rem', md: '2rem' },
                                            mb: 0.5,
                                        }}>
                                            Customize Your Order
                                        </Typography>
                                        <OrnamentalDivider width={160} my={2} />
                                        <Grid container spacing={3}>
                                            {[
                                                { label: 'Toppings', items: extras.toppings },
                                                { label: 'Sauces', items: extras.sauces },
                                                { label: 'Breads', items: extras.breads },
                                                { label: 'Soup of the Day', items: extras.soupOfTheDay },
                                            ].map((group, i) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                                                    <Typography sx={{
                                                        color: 'var(--color-gold)',
                                                        fontWeight: 600,
                                                        fontFamily: 'var(--font-playfair)',
                                                        mb: 1.5,
                                                        fontSize: '1rem',
                                                        letterSpacing: '0.02em',
                                                    }}>
                                                        {group.label}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                                                        {group.items.map((item, j) => (
                                                            <Chip
                                                                key={j}
                                                                label={item}
                                                                size="small"
                                                                sx={{
                                                                    fontSize: '0.72rem',
                                                                    backgroundColor: 'rgba(212,175,55,0.05)',
                                                                    color: 'rgba(255,255,255,0.5)',
                                                                    border: '1px solid rgba(212,175,55,0.1)',
                                                                    borderRadius: '6px',
                                                                    transition: 'all 0.25s ease',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(212,175,55,0.12)',
                                                                        color: 'var(--color-gold)',
                                                                        borderColor: 'rgba(212,175,55,0.3)',
                                                                    },
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Paper>
                                </motion.div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Container>
        </Box>
    );
}

/* ── Category Card ── */
function MenuCategoryCard({ category, delay }: { category: MenuCategory; delay: number }) {
    return (
        <MotionPaper
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3.5 },
                height: '100%',
                background: 'linear-gradient(145deg, rgba(18,18,18,0.85) 0%, rgba(10,10,10,0.9) 100%)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                // Gold accent line at top
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: '15%', right: '15%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
                    transition: 'all 0.4s ease',
                },
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.04)',
                    borderColor: 'rgba(212,175,55,0.15)',
                    '&::before': {
                        left: '5%', right: '5%',
                        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
                    },
                },
            }}
        >
            {/* Category Title */}
            <Box sx={{ mb: category.subtext ? 0.5 : 2.5 }}>
                <Typography
                    variant="h5"
                    sx={{
                        color: 'var(--color-gold)',
                        fontFamily: 'var(--font-playfair)',
                        fontSize: { xs: '1.15rem', md: '1.35rem' },
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                    }}
                >
                    {category.title}
                </Typography>
                <Box sx={{
                    width: 40,
                    height: '2px',
                    mt: 0.8,
                    background: 'linear-gradient(90deg, var(--color-gold), transparent)',
                    borderRadius: '2px',
                }} />
            </Box>

            {category.subtext && (
                <Typography sx={{
                    color: 'rgba(212,175,55,0.5)',
                    fontSize: '0.78rem',
                    mb: 2.5,
                    fontStyle: 'italic',
                    letterSpacing: '0.02em',
                }}>
                    {category.subtext}
                </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {category.items.map((item, idx) => (
                    <MenuItemRow key={idx} item={item} isLast={idx === category.items.length - 1} />
                ))}
            </Box>
        </MotionPaper>
    );
}

/* ── Menu Item Row ── */
function MenuItemRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
    const priceIsString = typeof item.price === 'string';
    return (
        <Box sx={{
            py: 1.2,
            borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)',
            transition: 'background 0.25s ease',
            px: 0.5,
            mx: -0.5,
            borderRadius: '4px',
            '&:hover': {
                background: 'rgba(212,175,55,0.02)',
            },
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Typography sx={{
                        color: 'rgba(255,255,255,0.88)',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        fontFamily: 'var(--font-inter)',
                        letterSpacing: '0.01em',
                    }}>
                        {item.name}
                    </Typography>
                    {item.isNew && (
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                color: '#000',
                                background: 'linear-gradient(135deg, #D4AF37, #F0CF70)',
                                px: 0.8,
                                py: 0.15,
                                borderRadius: '3px',
                                lineHeight: 1.5,
                                textTransform: 'uppercase',
                            }}
                        >
                            New
                        </Box>
                    )}
                </Box>

                {!item.options && item.price !== undefined && (
                    <>
                        <Box sx={{
                            flexGrow: 1,
                            borderBottom: '1px dotted rgba(212,175,55,0.12)',
                            mx: 1.5,
                            position: 'relative',
                            top: '-4px',
                            minWidth: '20px',
                        }} />
                        <Typography sx={{
                            color: 'var(--color-gold)',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            fontFamily: 'var(--font-inter)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.02em',
                        }}>
                            {priceIsString ? String(item.price) : `$${Number(item.price).toFixed(2)}`}
                        </Typography>
                    </>
                )}
            </Box>

            {item.options && (
                <Box sx={{ display: 'flex', gap: 2.5, mt: 0.5, ml: 0.5 }}>
                    {item.options.map((opt, oIdx) => (
                        <Box key={oIdx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: '0.8rem',
                                fontFamily: 'var(--font-inter)',
                            }}>
                                {opt.size}
                            </Typography>
                            <Typography sx={{
                                color: 'var(--color-gold)',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                fontFamily: 'var(--font-inter)',
                            }}>
                                ${Number(opt.price).toFixed(2)}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {item.description && (
                <Typography sx={{
                    color: 'rgba(255,255,255,0.32)',
                    fontSize: '0.78rem',
                    mt: 0.4,
                    ml: 0.5,
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                    fontFamily: 'var(--font-inter)',
                    letterSpacing: '0.01em',
                }}>
                    {item.description}
                </Typography>
            )}
        </Box>
    );
}
