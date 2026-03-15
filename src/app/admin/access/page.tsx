'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth, useUser } from '@insforge/nextjs';
import { claimInitialOwner, getAdminAccessState, type AdminAccessState } from '@/lib/admin-users';

export default function AdminAccessPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const [accessState, setAccessState] = useState<AdminAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccessState() {
      try {
        setLoading(true);
        setError(null);

        const state = await getAdminAccessState();
        setAccessState(state);

        if (state.role === 'owner' || state.role === 'staff') {
          router.replace('/admin');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load access state');
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      void loadAccessState();
    }
  }, [isLoaded, router]);

  const handleClaimOwner = async () => {
    try {
      setClaiming(true);
      setError(null);
      await claimInitialOwner();
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim owner access');
    } finally {
      setClaiming(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  const title = accessState?.can_claim_owner
    ? 'Claim Owner Access'
    : accessState?.needs_owner_bootstrap
      ? 'Platform Owner Setup Incomplete'
      : 'Awaiting Approval';

  const message = (() => {
    if (!accessState) {
      return 'Loading account status.';
    }

    if (accessState.can_claim_owner) {
      return 'This verified account matches the configured bootstrap owner email. Claim owner access once and then manage the platform entirely from the admin frontend.';
    }

    if (!accessState.email_verified) {
      return 'This account is not verified yet. Verify the email first, then return here.';
    }

    if (accessState.needs_owner_bootstrap && !accessState.bootstrap_configured) {
      return 'No owner exists yet, but the bootstrap owner email has not been configured in the backend. Configure it once, then the owner can claim access from this page.';
    }

    if (accessState.needs_owner_bootstrap && accessState.bootstrap_configured) {
      return 'No owner exists yet, but this account does not match the configured bootstrap owner email. Sign in with the intended owner account or update the bootstrap email configuration.';
    }

    return 'Your account is verified but does not currently have owner or staff access. An owner must grant your role from the admin frontend.';
  })();

  if (!isLoaded || loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#050505' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#050505',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 560,
          width: '100%',
          p: 4,
          border: '1px solid rgba(212,175,55,0.15)',
          bgcolor: 'rgba(15,15,15,0.95)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: '0.7rem',
          }}
        >
          Admin Access
        </Typography>

        <Typography
          variant="h4"
          sx={{
            mt: 1,
            mb: 1,
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
          }}
        >
          {title}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {message}
        </Typography>

        {user?.email && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Signed in as {user.email}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.5}>
          {accessState?.can_claim_owner && (
            <Button
              variant="contained"
              size="large"
              onClick={handleClaimOwner}
              disabled={claiming}
              sx={{
                py: 1.5,
                fontSize: '0.95rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {claiming ? 'Claiming…' : 'Claim Owner Access'}
            </Button>
          )}

          {!accessState?.email_verified && (
            <Button
              component={Link}
              href={`/admin/verify-email?email=${encodeURIComponent(accessState?.email || user?.email || '')}`}
              variant="outlined"
              sx={{
                borderColor: 'rgba(212,175,55,0.3)',
                color: 'primary.main',
                textTransform: 'none',
              }}
            >
              Verify Email
            </Button>
          )}

          <Button
            component={Link}
            href="/admin/login"
            variant="text"
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Back to Login
          </Button>

          <Button
            variant="text"
            onClick={handleSignOut}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Sign Out
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
