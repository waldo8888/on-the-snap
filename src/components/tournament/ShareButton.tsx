'use client';

import { useState } from 'react';
import { IconButton, Tooltip, Snackbar } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <>
      <Tooltip title="Share" arrow>
        <IconButton
          onClick={handleShare}
          sx={{
            color: '#a0a0a0',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 2,
            '&:hover': { color: '#D4AF37', borderColor: 'rgba(212,175,55,0.4)', bgcolor: 'rgba(212,175,55,0.06)' },
          }}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#D4AF37',
            fontWeight: 600,
            border: '1px solid rgba(212,175,55,0.2)',
          },
        }}
      />
    </>
  );
}
