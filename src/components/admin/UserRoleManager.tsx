'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { UserRole, AdminUserRecord } from '@/lib/admin-users';
import { assignUserRole, listRoleAssignableUsers } from '@/lib/admin-users';
import { getPasswordErrors, isPasswordValid } from '@/lib/password-validation';

const ROLE_OPTIONS: UserRole[] = ['user', 'staff', 'owner'];

const roleDescriptions: Record<UserRole, string> = {
  user: 'No admin access',
  staff: 'Can operate tournaments',
  owner: 'Can manage roles and admin access',
};

interface UserRoleManagerProps {
  currentUserId: string;
}

export default function UserRoleManager({ currentUserId }: UserRoleManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /* ── Create Account dialog state ────────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const rows = await listRoleAssignableUsers();
        setUsers(rows);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  const ownerCount = useMemo(
    () => users.filter((user) => user.role === 'owner').length,
    [users]
  );

  const handleRoleChange =
    (userId: string) => async (event: SelectChangeEvent<UserRole>) => {
      const nextRole = event.target.value as UserRole;

      try {
        setSavingUserId(userId);
        setError(null);
        setSuccessMessage(null);

        const updatedUser = await assignUserRole(userId, nextRole);
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? updatedUser : user
          )
        );
        setSuccessMessage(
          `${updatedUser.display_name} is now ${updatedUser.role}.`
        );

        if (userId === currentUserId && nextRole !== 'owner') {
          router.replace('/admin');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update role');
      } finally {
        setSavingUserId(null);
      }
    };

  const newPasswordErrors = newPassword ? getPasswordErrors(newPassword) : [];
  const newPasswordIsValid = newPassword ? isPasswordValid(newPassword) : false;

  const handleCreateAccount = async () => {
    if (!newEmail.trim() || !newPassword || !newPasswordIsValid) return;

    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        setCreateError(data.error || 'Failed to create account');
        return;
      }

      // Refresh user list
      const rows = await listRoleAssignableUsers();
      setUsers(rows);

      const verifyNote = data.requireEmailVerification
        ? ' A verification email has been sent.'
        : '';
      setSuccessMessage(
        `Account created for ${newEmail.trim()} as ${newRole}.${verifyNote}`
      );

      // Reset and close
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('staff');
    } catch {
      setCreateError('An unexpected error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontSize: '0.7rem',
        }}
      >
        Admin
      </Typography>

      <Box sx={{ mt: 1, mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: 700,
              color: '#f5f5f0',
              mb: 0.5,
            }}
          >
            User Access
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 760 }}>
            Verified accounts can exist without admin access. Only owners can elevate users to staff or owner.
            Staff can operate tournaments, but they cannot manage roles.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{
            textTransform: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            mt: 0.5,
          }}
        >
          Create Account
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip
          label={`${users.length} total accounts`}
          sx={{
            bgcolor: 'rgba(212,175,55,0.12)',
            color: 'primary.main',
            border: '1px solid rgba(212,175,55,0.2)',
          }}
        />
        <Chip
          label={`${ownerCount} owner${ownerCount === 1 ? '' : 's'}`}
          sx={{
            bgcolor: 'rgba(212,175,55,0.12)',
            color: 'primary.main',
            border: '1px solid rgba(212,175,55,0.2)',
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(212,175,55,0.1)' }}>
                User
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(212,175,55,0.1)' }}>
                Verification
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(212,175,55,0.1)' }}>
                Role
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(212,175,55,0.1)' }}>
                Created
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{
                    borderColor: 'rgba(212,175,55,0.08)',
                    py: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  No accounts have been created yet.
                </TableCell>
              </TableRow>
            )}

            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isSaving = savingUserId === user.id;

              return (
                <TableRow key={user.id}>
                  <TableCell sx={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                    <Typography variant="body2" sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                      {user.display_name || 'Unnamed User'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {user.email}
                    </Typography>
                    {isCurrentUser && (
                      <Chip
                        label="You"
                        size="small"
                        sx={{
                          ml: 1,
                          height: 20,
                          bgcolor: 'rgba(212,175,55,0.12)',
                          color: 'primary.main',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                    <Chip
                      label={user.email_verified ? 'Verified' : 'Pending'}
                      size="small"
                      sx={{
                        bgcolor: user.email_verified
                          ? 'rgba(102,187,106,0.12)'
                          : 'rgba(66,165,245,0.12)',
                        color: user.email_verified ? '#66bb6a' : '#42a5f5',
                        border: '1px solid',
                        borderColor: user.email_verified
                          ? 'rgba(102,187,106,0.25)'
                          : 'rgba(66,165,245,0.25)',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(212,175,55,0.08)', minWidth: 220 }}>
                    <FormControl fullWidth size="small">
                      <Select<UserRole>
                        value={user.role}
                        onChange={handleRoleChange(user.id)}
                        disabled={isSaving}
                        sx={{
                          color: '#f5f5f0',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(212,175,55,0.2)',
                          },
                        }}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <MenuItem key={role} value={role}>
                            <Box>
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {role}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {roleDescriptions[role]}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Create Account Dialog ────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => !createLoading && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f0f0f',
            border: '1px solid rgba(212,175,55,0.15)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
          }}
        >
          Create Account
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Create an account for a staff member or owner. They will receive a
            verification email and can then sign in at the admin login page.
          </Typography>

          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            autoComplete="off"
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
            autoComplete="off"
          />
          <TextField
            fullWidth
            label="Temporary Password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
            autoComplete="off"
            error={newPassword.length > 0 && !newPasswordIsValid}
            helperText={
              newPassword.length > 0 && newPasswordErrors.length > 0
                ? `Missing: ${newPasswordErrors.join(', ').toLowerCase()}`
                : 'Min 8 chars, uppercase, lowercase, number. Share with the employee.'
            }
          />
          <FormControl fullWidth size="small">
            <Select<UserRole>
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              sx={{
                color: '#f5f5f0',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(212,175,55,0.2)',
                },
              }}
            >
              {ROLE_OPTIONS.map((role) => (
                <MenuItem key={role} value={role}>
                  <Box>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {role}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {roleDescriptions[role]}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={createLoading}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAccount}
            disabled={createLoading || !newEmail.trim() || !newPasswordIsValid}
            sx={{ textTransform: 'none' }}
          >
            {createLoading ? (
              <CircularProgress size={20} sx={{ color: '#050505' }} />
            ) : (
              'Create Account'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
