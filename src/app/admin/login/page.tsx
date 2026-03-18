'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@insforge/nextjs';
import {
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AdminAuthShell from '@/components/admin/AdminAuthShell';
import { getAdminAccessState } from '@/lib/admin-users';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setForbidden(params.get('reason') === 'forbidden');
    setVerified(params.get('verified') === '1');
  }, []);

  useEffect(() => {
    async function handleExistingSessionRedirect() {
      if (!isLoaded) {
        return;
      }

      if (isSignedIn) {
        try {
          const accessState = await getAdminAccessState();
          if (accessState.role === 'owner' || accessState.role === 'staff') {
            router.replace('/admin');
            return;
          }

          router.replace('/admin/access');
        } catch {
          router.replace('/admin/access');
        }
      }
    }

    void handleExistingSessionRedirect();
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (forbidden) {
      setError('Your account is signed in, but it does not have owner or staff access.');
    }
  }, [forbidden]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email.trim(), password);

      if ('error' in result && result.error) {
        setError(result.error || 'Invalid credentials');
        return;
      }

      try {
        const accessState = await getAdminAccessState();
        router.replace(
          accessState.role === 'owner' || accessState.role === 'staff'
            ? '/admin'
            : '/admin/access'
        );
      } catch {
        router.replace('/admin/access');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthShell
      title="Tournament Administration"
      subtitle="Sign in with an approved owner or staff account."
    >
      {verified && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Email verified. If an owner has granted you access, you can sign in now.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211,47,47,0.1)', border: '1px solid rgba(211,47,47,0.3)' }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ mb: 2 }}
          autoComplete="email"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          sx={{ mb: 3 }}
          autoComplete="current-password"
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#050505' }} /> : 'Sign In'}
        </Button>
      </form>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', color: 'text.secondary' }}
        >
          Staff access only. Contact the owner for credentials.
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Forgot your password?{' '}
          <Typography
            component={Link}
            href="/admin/forgot-password"
            sx={{ color: 'primary.main', textDecoration: 'none' }}
          >
            Reset it
          </Typography>
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Have a verification code?{' '}
          <Typography
            component={Link}
            href="/admin/verify-email"
            sx={{ color: 'primary.main', textDecoration: 'none' }}
          >
            Verify email
          </Typography>
        </Typography>
      </Stack>
    </AdminAuthShell>
  );
}
