'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminAuthShell from '@/components/admin/AdminAuthShell';
import { insforge } from '@/lib/insforge';
import { getPasswordErrors, isPasswordValid } from '@/lib/password-validation';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: sendError } = await insforge.auth.sendResetPasswordEmail({
        email: email.trim(),
      });

      if (sendError) {
        setError(sendError.message || 'Failed to send reset email');
        return;
      }

      if (data?.success) {
        setStep('code');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: exchangeError } = await insforge.auth.exchangeResetPasswordToken({
        email: email.trim(),
        code: code.trim(),
      });

      if (exchangeError) {
        setError(exchangeError.message || 'Invalid or expired code');
        return;
      }

      if (data?.token) {
        setOtp(data.token);
        setStep('password');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const passwordErrors = newPassword ? getPasswordErrors(newPassword) : [];
  const passwordIsValid = newPassword ? isPasswordValid(newPassword) : false;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordIsValid) {
      setError('Password does not meet requirements');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await insforge.auth.resetPassword({
        newPassword,
        otp,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to reset password');
        return;
      }

      setStep('done');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <AdminAuthShell
        title="Password Updated"
        subtitle="Your password has been changed successfully."
      >
        <Alert severity="success" sx={{ mb: 3 }}>
          Password updated. You can now sign in with your new password.
        </Alert>
        <Button
          component={Link}
          href="/admin/login"
          variant="contained"
          fullWidth
          size="large"
          sx={{
            py: 1.5,
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Sign In
        </Button>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell
      title="Reset Password"
      subtitle={
        step === 'email'
          ? 'Enter your email to receive a reset code.'
          : step === 'code'
            ? 'Enter the 6-digit code from your inbox.'
            : 'Choose a new password.'
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211,47,47,0.1)', border: '1px solid rgba(211,47,47,0.3)' }}>
          {error}
        </Alert>
      )}

      {step === 'email' && (
        <form onSubmit={handleSendCode}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 3 }}
            autoComplete="email"
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
            {loading ? <CircularProgress size={24} sx={{ color: '#050505' }} /> : 'Send Reset Code'}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleExchangeCode}>
          <TextField
            fullWidth
            label="Reset Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            sx={{ mb: 3 }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
            helperText={`Code sent to ${email}`}
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
            {loading ? <CircularProgress size={24} sx={{ color: '#050505' }} /> : 'Verify Code'}
          </Button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleResetPassword}>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            sx={{ mb: 3 }}
            autoComplete="new-password"
            error={newPassword.length > 0 && !passwordIsValid}
            helperText={
              newPassword.length > 0 && passwordErrors.length > 0
                ? `Missing: ${passwordErrors.join(', ').toLowerCase()}`
                : 'Min 8 characters, uppercase, lowercase, and a number'
            }
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !passwordIsValid}
            sx={{
              py: 1.5,
              fontSize: '0.95rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#050505' }} /> : 'Update Password'}
          </Button>
        </form>
      )}

      <Stack sx={{ mt: 3 }}>
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
