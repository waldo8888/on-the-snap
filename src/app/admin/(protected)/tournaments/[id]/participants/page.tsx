'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import type { Participant, Tournament } from '@/lib/tournament-engine/types';
import {
  getParticipants,
  addParticipant,
  updateParticipant,
  removeParticipant,
  getTournamentById,
  reseedParticipants,
} from '@/lib/tournaments';

// ============================================================
// Constants
// ============================================================

const GOLD = '#D4AF37';
const BG_DARK = '#050505';
const BG_CARD = '#0a0a0a';
const BORDER = 'rgba(212,175,55,0.15)';

const TAB_LABELS = ['Details', 'Participants', 'Bracket', 'Operations'];
const TAB_ROUTES = ['', '/participants', '/bracket', '/operations'];

// ============================================================
// Form State
// ============================================================

interface PlayerFormData {
  name: string;
  email: string;
  phone: string;
  handicap: number;
  notes: string;
  seed: number | null;
}

const emptyForm: PlayerFormData = {
  name: '',
  email: '',
  phone: '',
  handicap: 0,
  notes: '',
  seed: null,
};

// ============================================================
// Page Component
// ============================================================

export default function ParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tournamentId = params.id as string;

  // Data state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ----------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([
        getTournamentById(tournamentId),
        getParticipants(tournamentId),
      ]);
      if (t) setTournament(t);
      setParticipants(p);
      setError(null);
    } catch (err) {
      setError('Failed to load tournament data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddOpen = () => {
    setFormData({ ...emptyForm, seed: participants.length + 1 });
    setAddOpen(true);
  };

  const handleAddClose = () => {
    setAddOpen(false);
    setFormData(emptyForm);
  };

  const handleAddSubmit = async () => {
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      await addParticipant({
        tournament_id: tournamentId,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        handicap: formData.handicap,
        notes: formData.notes.trim() || undefined,
        seed: formData.seed ?? participants.length + 1,
      });
      await fetchData();
      handleAddClose();
      showSnack(`${formData.name} added successfully`);
    } catch (err) {
      console.error(err);
      showSnack('Failed to add player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (p: Participant) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      email: p.email || '',
      phone: p.phone || '',
      handicap: p.handicap,
      notes: p.notes || '',
      seed: p.seed,
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleEditSubmit = async () => {
    if (!editingId || !formData.name.trim()) return;
    setSubmitting(true);
    try {
      await updateParticipant(editingId, {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        handicap: formData.handicap,
        notes: formData.notes.trim() || null,
        seed: formData.seed,
      });
      await fetchData();
      handleEditClose();
      showSnack('Player updated');
    } catch (err) {
      console.error(err);
      showSnack('Failed to update player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await removeParticipant(id);
      await fetchData();
      setDeleteConfirmId(null);
      showSnack('Player removed');
    } catch (err) {
      console.error(err);
      showSnack('Failed to remove player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCheckIn = async (p: Participant) => {
    const newCheckedIn = !p.checked_in;
    // Optimistic update
    setParticipants((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, checked_in: newCheckedIn, checked_in_at: newCheckedIn ? new Date().toISOString() : null }
          : x
      )
    );
    try {
      await updateParticipant(p.id, {
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error(err);
      // Revert on failure
      setParticipants((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, checked_in: p.checked_in, checked_in_at: p.checked_in_at } : x))
      );
      showSnack('Failed to update check-in', 'error');
    }
  };

  const handleCheckInAll = async () => {
    const unchecked = participants.filter((p) => !p.checked_in);
    if (unchecked.length === 0) return;

    // Optimistic
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, checked_in: true, checked_in_at: p.checked_in_at || new Date().toISOString() }))
    );

    try {
      await Promise.all(
        unchecked.map((p) =>
          updateParticipant(p.id, { checked_in: true, checked_in_at: new Date().toISOString() })
        )
      );
      showSnack(`${unchecked.length} player${unchecked.length > 1 ? 's' : ''} checked in`);
    } catch (err) {
      console.error(err);
      await fetchData();
      showSnack('Failed to check in all players', 'error');
    }
  };

  const handleResetCheckInAll = async () => {
    const checkedInPlayers = participants.filter((p) => p.checked_in);
    if (checkedInPlayers.length === 0) return;

    setParticipants((prev) =>
      prev.map((p) => ({ ...p, checked_in: false, checked_in_at: null }))
    );

    try {
      await Promise.all(
        checkedInPlayers.map((p) =>
          updateParticipant(p.id, { checked_in: false, checked_in_at: null })
        )
      );
      showSnack(`Reset check-in for ${checkedInPlayers.length} player${checkedInPlayers.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      await fetchData();
      showSnack('Failed to reset check-ins', 'error');
    }
  };

  const handleRandomizeSeeds = async () => {
    if (participants.length === 0) return;

    // Fisher-Yates shuffle to create random seed assignment
    const ids = participants.map((p) => p.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Optimistic update
    const seedMap = new Map(shuffled.map((id, idx) => [id, idx + 1]));
    setParticipants((prev) =>
      [...prev]
        .map((p) => ({ ...p, seed: seedMap.get(p.id) ?? p.seed }))
        .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    );

    try {
      await reseedParticipants(tournamentId, shuffled);
      await fetchData();
      showSnack('Seeds randomized');
    } catch (err) {
      console.error(err);
      await fetchData();
      showSnack('Failed to randomize seeds', 'error');
    }
  };

  // ----------------------------------------------------------
  // Tab Navigation
  // ----------------------------------------------------------

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const base = `/admin/tournaments/${tournamentId}`;
    router.push(`${base}${TAB_ROUTES[newValue]}`);
  };

  // ----------------------------------------------------------
  // Derived
  // ----------------------------------------------------------

  const checkedInCount = participants.filter((p) => p.checked_in).length;
  const maxDisplay = tournament?.max_participants
    ? `${participants.length} / ${tournament.max_participants}`
    : `${participants.length}`;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleParticipants = normalizedSearch
    ? participants.filter((participant) =>
        [participant.name, participant.email ?? '', participant.phone ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : participants;

  // ----------------------------------------------------------
  // Form field updater
  // ----------------------------------------------------------

  const updateField = (field: keyof PlayerFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ----------------------------------------------------------
  // Player Form (shared between Add and Edit)
  // ----------------------------------------------------------

  const renderForm = (isEdit: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => updateField('name', e.target.value)}
        required
        fullWidth
        autoFocus
        slotProps={{
          inputLabel: { sx: { color: 'text.secondary' } },
          input: {
            sx: {
              color: '#f5f5f0',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
            },
          },
        }}
      />
      <TextField
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        fullWidth
        slotProps={{
          inputLabel: { sx: { color: 'text.secondary' } },
          input: {
            sx: {
              color: '#f5f5f0',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
            },
          },
        }}
      />
      <TextField
        label="Phone"
        value={formData.phone}
        onChange={(e) => updateField('phone', e.target.value)}
        fullWidth
        slotProps={{
          inputLabel: { sx: { color: 'text.secondary' } },
          input: {
            sx: {
              color: '#f5f5f0',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
            },
          },
        }}
      />
      <TextField
        label="Handicap"
        type="number"
        value={formData.handicap}
        onChange={(e) => updateField('handicap', parseInt(e.target.value, 10) || 0)}
        fullWidth
        slotProps={{
          inputLabel: { sx: { color: 'text.secondary' } },
          input: {
            sx: {
              color: '#f5f5f0',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
            },
          },
        }}
      />
      {isEdit && (
        <TextField
          label="Seed"
          type="number"
          value={formData.seed ?? ''}
          onChange={(e) => updateField('seed', e.target.value ? parseInt(e.target.value, 10) : null)}
          fullWidth
          slotProps={{
            inputLabel: { sx: { color: 'text.secondary' } },
            input: {
              sx: {
                color: '#f5f5f0',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              },
            },
          }}
        />
      )}
      <TextField
        label="Notes"
        value={formData.notes}
        onChange={(e) => updateField('notes', e.target.value)}
        fullWidth
        multiline
        rows={2}
        slotProps={{
          inputLabel: { sx: { color: 'text.secondary' } },
          input: {
            sx: {
              color: '#f5f5f0',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD },
            },
          },
        }}
      />
    </Box>
  );

  // ----------------------------------------------------------
  // Loading / Error States
  // ----------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ bgcolor: 'rgba(211,47,47,0.1)', color: '#f5f5f0' }}>
          {error || 'Tournament not found.'}
        </Alert>
      </Box>
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Breadcrumb */}
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}
      >
        Admin / Tournaments / {tournament.title}
      </Typography>

      {/* Header */}
      <Box sx={{ mb: 3, mt: 1 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
            mb: 0.5,
          }}
        >
          {tournament.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Participant Management
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Tabs
        value={1}
        onChange={handleTabChange}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : false}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          '& .MuiTab-root': {
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 44,
          },
          '& .Mui-selected': { color: GOLD },
          '& .MuiTabs-indicator': { backgroundColor: GOLD },
        }}
      >
        {TAB_LABELS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Quick Stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          icon={<GroupIcon sx={{ fontSize: 16 }} />}
          label={`${maxDisplay} Players`}
          size="small"
          sx={{
            bgcolor: 'rgba(212,175,55,0.12)',
            color: GOLD,
            border: `1px solid ${BORDER}`,
            fontWeight: 600,
            '& .MuiChip-icon': { color: GOLD },
          }}
        />
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          label={`${checkedInCount} / ${participants.length} Checked In`}
          size="small"
          sx={{
            bgcolor: checkedInCount === participants.length && participants.length > 0
              ? 'rgba(76,175,80,0.15)'
              : 'rgba(255,255,255,0.05)',
            color: checkedInCount === participants.length && participants.length > 0
              ? '#81c784'
              : '#f5f5f0',
            border: `1px solid ${
              checkedInCount === participants.length && participants.length > 0
                ? 'rgba(76,175,80,0.3)'
                : BORDER
            }`,
            fontWeight: 600,
            '& .MuiChip-icon': {
              color: checkedInCount === participants.length && participants.length > 0 ? '#81c784' : 'text.secondary',
            },
          }}
        />
        {normalizedSearch && (
          <Chip
            label={`Showing ${visibleParticipants.length} of ${participants.length}`}
            size="small"
            sx={{
              bgcolor: 'rgba(66,165,245,0.12)',
              color: '#90caf9',
              border: '1px solid rgba(66,165,245,0.22)',
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Action Bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAddOpen}
          sx={{
            bgcolor: GOLD,
            color: BG_DARK,
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#c9a030' },
          }}
        >
          Add Player
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShuffleIcon />}
          onClick={handleRandomizeSeeds}
          disabled={participants.length < 2}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: GOLD, color: GOLD },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Randomize Seeds
        </Button>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={handleCheckInAll}
          disabled={participants.length === 0 || checkedInCount === participants.length}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: '#81c784', color: '#81c784' },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Check In All
        </Button>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={handleResetCheckInAll}
          disabled={checkedInCount === 0}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: '#ef5350', color: '#ef9a9a' },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Reset Check-In
        </Button>
        <TextField
          size="small"
          placeholder="Search players"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            minWidth: { xs: '100%', sm: 220 },
            '& .MuiOutlinedInput-root': {
              bgcolor: '#050505',
              color: '#f5f5f0',
              '& fieldset': { borderColor: BORDER },
              '&:hover fieldset': { borderColor: GOLD },
              '&.Mui-focused fieldset': { borderColor: GOLD },
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
      </Box>

      {/* Player List */}
      {participants.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            p: { xs: 4, md: 6 },
            textAlign: 'center',
          }}
        >
          <GroupIcon sx={{ fontSize: 56, color: 'rgba(212,175,55,0.25)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#f5f5f0', fontWeight: 600, mb: 1 }}>
            No players registered yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Add the first player to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddOpen}
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
            }}
          >
            Add Player
          </Button>
        </Paper>
      ) : visibleParticipants.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            p: { xs: 4, md: 5 },
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ color: '#f5f5f0', fontWeight: 600, mb: 1 }}>
            No matching players
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Try a different name, email, or phone number.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setSearchQuery('')}
            sx={{
              borderColor: BORDER,
              color: '#f5f5f0',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { borderColor: GOLD, color: GOLD },
            }}
          >
            Clear Search
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            bgcolor: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead>
                <TableRow
                  sx={{
                    '& .MuiTableCell-head': {
                      bgcolor: 'rgba(212,175,55,0.06)',
                      color: GOLD,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      borderBottom: `1px solid ${BORDER}`,
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  <TableCell sx={{ width: 60 }}>Seed</TableCell>
                  <TableCell>Name</TableCell>
                  {!isMobile && <TableCell sx={{ width: 100 }}>Handicap</TableCell>}
                  <TableCell sx={{ width: 120 }} align="center">
                    Checked In
                  </TableCell>
                  <TableCell sx={{ width: 100 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleParticipants.map((p) => (
                  <TableRow
                    key={p.id}
                    sx={{
                      '& .MuiTableCell-root': {
                        borderBottom: `1px solid rgba(255,255,255,0.04)`,
                        py: 1.5,
                      },
                      '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: GOLD,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      >
                        #{p.seed ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#f5f5f0', fontSize: '0.925rem' }}>
                        {p.name}
                      </Typography>
                      {isMobile && p.handicap > 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          HC: {p.handicap}
                        </Typography>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        {p.handicap > 0 ? (
                          <Chip
                            label={`+${p.handicap}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(212,175,55,0.1)',
                              color: GOLD,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24,
                            }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.25)' }}>
                            --
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <Switch
                        checked={p.checked_in}
                        onChange={() => handleToggleCheckIn(p)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#81c784' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: 'rgba(76,175,80,0.4)',
                          },
                          '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.15)' },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditOpen(p)}
                          sx={{ color: 'text.secondary', '&:hover': { color: GOLD } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmId(p.id)}
                          sx={{ color: 'text.secondary', '&:hover': { color: '#ef5350' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Add Player Dialog */}
      <Dialog
        open={addOpen}
        onClose={handleAddClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111111',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Add Player
        </DialogTitle>
        <DialogContent>{renderForm(false)}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleAddClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSubmit}
            variant="contained"
            disabled={!formData.name.trim() || submitting}
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : 'Add Player'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111111',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Edit Player
        </DialogTitle>
        <DialogContent>{renderForm(true)}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleEditClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!formData.name.trim() || submitting}
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        PaperProps={{
          sx: {
            bgcolor: '#111111',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontWeight: 600 }}>Remove Player</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to remove{' '}
            <strong style={{ color: '#f5f5f0' }}>
              {participants.find((p) => p.id === deleteConfirmId)?.name}
            </strong>{' '}
            from this tournament? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteConfirmId(null)}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            variant="contained"
            disabled={submitting}
            sx={{
              bgcolor: '#d32f2f',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#b71c1c' },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
