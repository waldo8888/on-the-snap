'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInsforge } from '@insforge/nextjs';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminAuthShell from '@/components/admin/AdminAuthShell';
import { ensureCurrentUserProfile } from '@/lib/admin-users';
import { insforge } from '@/lib/insforge';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail, signOut } = useInsforge();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextEmail = params.get('email');
    if (nextEmail) {
      setEmail(nextEmail);
    }
  }, []);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await verifyEmail(otp.trim(), email.trim());

      if ('error' in result && result.error) {
        setError(result.error || 'Verification failed');
        return;
      }

      try {
        await ensureCurrentUserProfile();
      } catch {
        // Verification succeeded; profile creation is best-effort.
      }

      await signOut();
      router.push('/admin/login?verified=1');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const { data, error: resendError } = await insforge.auth.resendVerificationEmail({
        email: email.trim(),
      });

      if (resendError) {
        setError(resendError.message || 'Failed to resend code');
        return;
      }

      if (data?.success) {
        setSuccess('A new verification code was sent.');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setResending(false);
    }
  };

  return (
    <AdminAuthShell
      title="Verify Email"
      subtitle="Enter the 6-digit code from your inbox to activate the account."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleVerify}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          sx={{ mb: 2 }}
          autoComplete="email"
        />
        <TextField
          fullWidth
          label="Verification Code"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          sx={{ mb: 3 }}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
          helperText="InsForge is configured for 6-digit code verification."
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
            mb: 1.5,
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: '#050505' }} />
          ) : (
            'Verify Email'
          )}
        </Button>
      </form>

      <Button
        variant="outlined"
        fullWidth
        disabled={resending || !email.trim()}
        onClick={handleResend}
        sx={{
          borderColor: 'rgba(212,175,55,0.3)',
          color: 'primary.main',
          textTransform: 'none',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(212,175,55,0.05)',
          },
        }}
      >
        {resending ? 'Sending…' : 'Resend Code'}
      </Button>

      <Stack spacing={1} sx={{ mt: 3 }}>
        <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Verification confirms the email address. Admin access still depends on owner or staff role assignment.
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Back to{' '}
          <Typography
            component={Link}
            href="/admin/login"
            sx={{ color: 'primary.main', textDecoration: 'none' }}
          >
            sign in
          </Typography>
        </Typography>
      </Stack>
    </AdminAuthShell>
  );
}
