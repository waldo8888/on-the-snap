'use client';

import { Box, Button, useMediaQuery, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { ReactNode } from 'react';

interface ZoomableBracketSectionProps {
  children: ReactNode;
}

export default function ZoomableBracketSection({ children }: ZoomableBracketSectionProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const isTouchDevice =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  if (!isCompact || !isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <TransformWrapper
      minScale={0.55}
      initialScale={0.82}
      maxScale={2.4}
      doubleClick={{ disabled: true }}
      wheel={{ disabled: true }}
      pinch={{ step: 5 }}
      panning={{ velocityDisabled: true }}
      limitToBounds={false}
      centerOnInit
    >
      {({ resetTransform }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={() => resetTransform()}
              sx={{
                textTransform: 'none',
                color: '#D4AF37',
                borderColor: 'rgba(212,175,55,0.24)',
                '&:hover': {
                  borderColor: '#D4AF37',
                  bgcolor: 'rgba(212,175,55,0.06)',
                },
              }}
              variant="outlined"
            >
              Reset Zoom
            </Button>
          </Box>
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              overflow: 'hidden',
            }}
            contentStyle={{
              width: '100%',
            }}
          >
            <Box sx={{ width: '100%' }}>{children}</Box>
          </TransformComponent>
        </Box>
      )}
    </TransformWrapper>
  );
}
