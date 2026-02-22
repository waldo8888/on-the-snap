'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import { useState } from 'react';

interface TournamentBracketProps {
    url: string;
}

export default function TournamentBracket({ url }: TournamentBracketProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <Box
            sx={{
                width: '100%',
                height: { xs: 500, md: 650 },
                position: 'relative',
                bgcolor: 'rgba(0,0,0,0.5)',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(212,175,55,0.2)',
                mt: 3,
            }}
        >
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        zIndex: 1,
                    }}
                >
                    <CircularProgress sx={{ color: 'primary.main' }} />
                    <Typography sx={{ color: 'text.secondary', fontFamily: 'var(--font-inter)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Loading Bracket...
                    </Typography>
                </Box>
            )}

            <iframe
                src={`https://challonge.com/${url}/module?show_standings=1`}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="auto"
                // @ts-expect-error -- lowercase HTML attribute for iframe transparency
                allowtransparency="true"
                onLoad={() => setIsLoading(false)}
                style={{
                    position: 'relative',
                    zIndex: 2,
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.5s ease',
                    filter: 'invert(0.92) hue-rotate(180deg) saturate(0.6) brightness(0.85)',
                }}
            />
        </Box>
    );
}
