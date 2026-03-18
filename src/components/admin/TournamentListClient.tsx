'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Checkbox,
  IconButton,
  Tooltip,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  getTournaments,
  deleteTournament,
  deleteTournaments,
  deleteOldTournaments,
  canDeleteTournament,
  cloneTournament,
} from '@/lib/tournaments';
import type { AdminRole } from '@/lib/admin-auth';
import type { Tournament, TournamentStatus } from '@/lib/tournament-engine/types';

const STATUS_FILTERS: { label: string; value: TournamentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'open' },
  { label: 'Live', value: 'live' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const statusChipColor = (status: TournamentStatus): string => {
  switch (status) {
    case 'live': return '#D4AF37';
    case 'completed': return '#66bb6a';
    case 'open': return '#42a5f5';
    case 'check_in': return '#ab47bc';
    case 'draft': return '#9e9e9e';
    case 'cancelled': return '#ef5350';
    default: return '#9e9e9e';
  }
};

const CLEANUP_PERIODS = [
  { label: 'Older than 30 days', value: '30d' },
  { label: 'Older than 90 days', value: '90d' },
  { label: 'Older than 6 months', value: '6m' },
  { label: 'All time', value: 'all' },
];

function computeCutoffDate(period: string): string {
  if (period === 'all') return new Date(2099, 0, 1).toISOString();
  const now = new Date();
  if (period === '30d') now.setDate(now.getDate() - 30);
  else if (period === '90d') now.setDate(now.getDate() - 90);
  else if (period === '6m') now.setMonth(now.getMonth() - 6);
  return now.toISOString();
}

const emptyStateMessage = (filter: string) => {
  switch (filter) {
    case 'draft': return 'No draft tournaments. Create one to get started.';
    case 'open': return 'No tournaments with open registration right now.';
    case 'live': return 'No tournaments running at the moment.';
    case 'completed': return 'No completed tournaments yet. History will appear here.';
    case 'cancelled': return 'No cancelled tournaments.';
    case 'check_in': return 'No tournaments in check-in right now.';
    default: return 'No tournaments yet';
  }
};

interface TournamentListClientProps {
  role: AdminRole;
}

export default function TournamentListClient({ role }: TournamentListClientProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline delete state
  const [inlineDeleteTarget, setInlineDeleteTarget] = useState<Tournament | null>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuTarget, setMobileMenuTarget] = useState<Tournament | null>(null);
  const [inlineDeleting, setInlineDeleting] = useState(false);

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Cleanup state
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupCompleted, setCleanupCompleted] = useState(true);
  const [cleanupCancelled, setCleanupCancelled] = useState(true);
  const [cleanupPeriod, setCleanupPeriod] = useState('90d');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTournaments();
        setTournaments(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tournaments.length };
    for (const t of tournaments) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tournaments]);

  const currentFilter = STATUS_FILTERS[activeTab].value;
  const filtered = currentFilter === 'all'
    ? tournaments
    : tournaments.filter((t) => t.status === currentFilter);

  // Cleanup preview count
  const cleanupPreviewCount = useMemo(() => {
    const cutoff = computeCutoffDate(cleanupPeriod);
    const statusesToClean: TournamentStatus[] = [];
    if (cleanupCompleted) statusesToClean.push('completed');
    if (cleanupCancelled) statusesToClean.push('cancelled');
    return tournaments.filter(
      (t) => statusesToClean.includes(t.status) && t.tournament_start_at < cutoff
    ).length;
  }, [tournaments, cleanupCompleted, cleanupCancelled, cleanupPeriod]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatLabel = (str: string) => str.replace(/_/g, ' ');

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.id)));
    }
  };

  // Inline delete
  const handleInlineDelete = async () => {
    if (!inlineDeleteTarget) return;
    try {
      setInlineDeleting(true);
      await deleteTournament(inlineDeleteTarget.id);
      setTournaments((prev) => prev.filter((t) => t.id !== inlineDeleteTarget.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(inlineDeleteTarget.id);
        return next;
      });
      setSuccess(`"${inlineDeleteTarget.title}" deleted`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete tournament');
    } finally {
      setInlineDeleting(false);
      setInlineDeleteTarget(null);
    }
  };

  // Bulk delete
  const selectedTournaments = tournaments.filter((t) => selected.has(t.id));
  const deletableSelected = selectedTournaments.filter((t) => canDeleteTournament(t.status, role));
  const undeletableSelected = selectedTournaments.filter((t) => !canDeleteTournament(t.status, role));

  const handleBulkDelete = async () => {
    if (deletableSelected.length === 0) return;
    try {
      setBulkDeleting(true);
      await deleteTournaments(deletableSelected.map((t) => t.id));
      const deletedIds = new Set(deletableSelected.map((t) => t.id));
      setTournaments((prev) => prev.filter((t) => !deletedIds.has(t.id)));
      setSelected(new Set());
      setBulkDeleteDialogOpen(false);
      setSuccess(`${deletableSelected.length} tournament${deletableSelected.length > 1 ? 's' : ''} deleted`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete tournaments');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Cleanup handler
  const handleCleanup = async () => {
    const statusesToClean: TournamentStatus[] = [];
    if (cleanupCompleted) statusesToClean.push('completed');
    if (cleanupCancelled) statusesToClean.push('cancelled');
    if (statusesToClean.length === 0) return;

    try {
      setCleaningUp(true);
      const cutoff = computeCutoffDate(cleanupPeriod);
      await deleteOldTournaments(statusesToClean, cutoff);
      const data = await getTournaments();
      setTournaments(data);
      setSelected(new Set());
      setCleanupDialogOpen(false);
      setSuccess('Old tournaments cleaned up');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clean up tournaments');
    } finally {
      setCleaningUp(false);
    }
  };

  // Clone handler
  const handleClone = async (tournament: Tournament) => {
    try {
      setError(null);
      const cloned = await cloneTournament(tournament.id);
      setTournaments((prev) => [cloned, ...prev]);
      setSuccess(`"${tournament.title}" duplicated`);
      setTimeout(() => setSuccess(null), 3000);
      router.push(`/admin/tournaments/${cloned.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clone tournament');
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const someFilteredSelected = filtered.some((t) => selected.has(t.id)) && !allFilteredSelected;

  return (
    <Box>
      {/* Breadcrumb */}
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Admin / Tournaments
      </Typography>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 3, gap: 1.5, flexWrap: 'wrap' }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: '#f5f5f0',
          }}
        >
          Tournaments
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {role === 'owner' && (
            <Button
              variant="outlined"
              startIcon={<CleaningServicesIcon />}
              onClick={() => setCleanupDialogOpen(true)}
              sx={{
                borderColor: 'rgba(239,83,80,0.3)',
                color: '#ef5350',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                transition: 'all 0.3s ease',
                '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.05)' },
              }}
            >
              Clean Up
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/admin/tournaments/new')}
            sx={{
              bgcolor: '#D4AF37',
              color: '#050505',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              boxShadow: '0 4px 14px rgba(212,175,55,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { bgcolor: '#e5c150', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(212,175,55,0.4)' },
            }}
          >
            New Tournament
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a' }}>
          {success}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(10, 10, 10, 0.45)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => { setActiveTab(v); setSelected(new Set()); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid rgba(212,175,55,0.08)',
            '& .MuiTab-root': {
              textTransform: 'none',
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.85rem',
              minHeight: 48,
              '&.Mui-selected': { color: '#D4AF37' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#D4AF37' },
          }}
        >
          {STATUS_FILTERS.map((f, idx) => (
            <Tab
              key={f.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {f.label}
                  {(statusCounts[f.value] ?? 0) > 0 && (
                    <Chip
                      label={statusCounts[f.value]}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: activeTab === idx ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
                        color: activeTab === idx ? '#D4AF37' : 'text.secondary',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Bulk Action Toolbar */}
        {selected.size > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2.5,
              py: 1.5,
              bgcolor: 'rgba(212,175,55,0.08)',
              borderBottom: '1px solid rgba(212,175,55,0.15)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#D4AF37', fontWeight: 600 }}>
              {selected.size} selected
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => setBulkDeleteDialogOpen(true)}
              sx={{
                borderColor: 'rgba(239,83,80,0.4)',
                color: '#ef5350',
                textTransform: 'none',
                '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
              }}
            >
              Delete Selected
            </Button>
            <Button
              size="small"
              onClick={() => setSelected(new Set())}
              sx={{ color: 'text.secondary', textTransform: 'none', ml: 'auto' }}
            >
              Clear Selection
            </Button>
          </Box>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#D4AF37' }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: 'rgba(212,175,55,0.15)', mb: 1.5 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
              {emptyStateMessage(currentFilter)}
            </Typography>
            {currentFilter === 'all' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push('/admin/tournaments/new')}
                sx={{
                  borderColor: 'rgba(212,175,55,0.3)',
                  color: '#D4AF37',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                }}
              >
                Create your first tournament
              </Button>
            )}
          </Box>
        ) : (
          /* Tournament table-style list */
          <Box>
            {/* Header row */}
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '48px 1fr 130px 130px 100px 160px 88px',
                gap: 2,
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid rgba(212,175,55,0.08)',
                alignItems: 'center',
              }}
            >
              <Checkbox
                size="small"
                checked={allFilteredSelected}
                indeterminate={someFilteredSelected}
                onChange={toggleSelectAll}
                sx={{
                  color: 'rgba(212,175,55,0.3)',
                  '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#D4AF37' },
                  p: 0,
                }}
              />
              {['Title', 'Format', 'Game Type', 'Status', 'Date', ''].map((h) => (
                <Typography key={h || 'action'} variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            {filtered.map((tournament) => {
              const isSelected = selected.has(tournament.id);
              const canDelete = canDeleteTournament(tournament.status, role);

              return (
                <Box
                  key={tournament.id}
                  onClick={() => router.push(`/admin/tournaments/${tournament.id}`)}
                  sx={{
                    display: { xs: 'block', md: 'grid' },
                    gridTemplateColumns: '48px 1fr 130px 130px 100px 160px 88px',
                    gap: 2,
                    px: 3,
                    py: 2.5,
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(212,175,55,0.06)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: isSelected ? 'rgba(212,175,55,0.06)' : 'transparent',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '3px',
                      bottom: 0,
                      bgcolor: 'primary.main',
                      transform: isSelected ? 'scaleY(1)' : 'scaleY(0)',
                      transition: 'transform 0.3s ease',
                      transformOrigin: 'center',
                    },
                    '&:hover': {
                      bgcolor: 'rgba(212,175,55,0.06)',
                      transform: 'translateX(6px)',
                      '&::after': { transform: 'scaleY(1)' },
                      '& .row-action': { opacity: 1 },
                    },
                  }}
                >
                  {/* Checkbox */}
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(tournament.id)}
                      sx={{
                        color: 'rgba(212,175,55,0.3)',
                        '&.Mui-checked': { color: '#D4AF37' },
                        p: 0,
                      }}
                    />
                  </Box>

                  {/* Title */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#f5f5f0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tournament.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontSize: '0.7rem', display: { md: 'none' } }}
                    >
                      {formatLabel(tournament.format)} &middot; {tournament.game_type}
                    </Typography>
                  </Box>

                  {/* Format */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.8rem',
                      textTransform: 'capitalize',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {formatLabel(tournament.format)}
                  </Typography>

                  {/* Game Type */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.8rem',
                      textTransform: 'capitalize',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {tournament.game_type}
                  </Typography>

                  {/* Status Chip + Mobile Menu */}
                  <Box sx={{ mt: { xs: 1, md: 0 }, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={tournament.status}
                      size="small"
                      sx={{
                        bgcolor: `${statusChipColor(tournament.status)}18`,
                        color: statusChipColor(tournament.status),
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        textTransform: 'capitalize',
                        height: 24,
                        border: 'none',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileMenuAnchor(e.currentTarget);
                        setMobileMenuTarget(tournament);
                      }}
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        ml: 'auto',
                        color: 'text.secondary',
                        '&:hover': { color: '#D4AF37' },
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Date */}
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '0.75rem', display: { xs: 'none', md: 'block' } }}
                  >
                    {formatDate(tournament.tournament_start_at)}
                  </Typography>

                  {/* Quick actions */}
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                    <Tooltip title="Duplicate" arrow>
                      <IconButton
                        className="row-action"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleClone(tournament);
                        }}
                        sx={{
                          color: 'text.secondary',
                          opacity: 0,
                          transition: 'all 0.2s ease',
                          '&:hover': { color: '#D4AF37', bgcolor: 'rgba(212,175,55,0.08)' },
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canDelete && (
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          className="row-action"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInlineDeleteTarget(tournament);
                          }}
                          sx={{
                            color: 'text.secondary',
                            opacity: 0,
                            transition: 'all 0.2s ease',
                            '&:hover': { color: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Mobile overflow menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={!!mobileMenuAnchor}
        onClose={() => { setMobileMenuAnchor(null); setMobileMenuTarget(null); }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#141414',
              border: '1px solid rgba(212,175,55,0.12)',
              minWidth: 160,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (mobileMenuTarget) void handleClone(mobileMenuTarget);
            setMobileMenuAnchor(null);
            setMobileMenuTarget(null);
          }}
          sx={{ color: '#f5f5f0', fontSize: '0.85rem', gap: 1.5 }}
        >
          <ContentCopyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Duplicate
        </MenuItem>
        {mobileMenuTarget && canDeleteTournament(mobileMenuTarget.status, role) && (
          <MenuItem
            onClick={() => {
              setInlineDeleteTarget(mobileMenuTarget);
              setMobileMenuAnchor(null);
              setMobileMenuTarget(null);
            }}
            sx={{ color: '#ef5350', fontSize: '0.85rem', gap: 1.5 }}
          >
            <DeleteIcon fontSize="small" />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Inline Delete Confirmation Dialog */}
      <Dialog
        open={!!inlineDeleteTarget}
        onClose={() => !inlineDeleting && setInlineDeleteTarget(null)}
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif' }}>
          Delete Tournament
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete &ldquo;{inlineDeleteTarget?.title}&rdquo;? This action cannot be undone and will remove all participants, brackets, and match data.
          </Typography>
          {inlineDeleteTarget && (inlineDeleteTarget.status === 'completed' || inlineDeleteTarget.status === 'live') && (
            <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(255,167,38,0.1)', color: '#ffb74d' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                This tournament has {inlineDeleteTarget.status === 'live' ? 'active matches in progress' : 'completed results'}.
                All match history will be permanently removed.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setInlineDeleteTarget(null)}
            disabled={inlineDeleting}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInlineDelete}
            disabled={inlineDeleting}
            variant="contained"
            startIcon={inlineDeleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}
            sx={{
              bgcolor: '#ef5350',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            {inlineDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !bulkDeleting && setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif' }}>
          Delete {deletableSelected.length} Tournament{deletableSelected.length !== 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            This will permanently remove the following tournament{deletableSelected.length !== 1 ? 's' : ''} and all associated data:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
            {deletableSelected.slice(0, 5).map((t) => (
              <Box
                key={t.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography variant="body2" sx={{ color: '#f5f5f0', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </Typography>
                <Chip
                  label={t.status}
                  size="small"
                  sx={{
                    bgcolor: `${statusChipColor(t.status)}18`,
                    color: statusChipColor(t.status),
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    height: 22,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
            ))}
            {deletableSelected.length > 5 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', pl: 1 }}>
                and {deletableSelected.length - 5} more...
              </Typography>
            )}
          </Box>

          {undeletableSelected.length > 0 && (
            <Alert severity="info" sx={{ bgcolor: 'rgba(66,165,245,0.1)', color: '#90caf9' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {undeletableSelected.length} selected tournament{undeletableSelected.length > 1 ? 's' : ''} cannot be deleted
              </Typography>
              <Typography variant="caption">
                Only the owner can delete completed or live tournaments. These will be skipped.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={bulkDeleting}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkDelete}
            disabled={bulkDeleting || deletableSelected.length === 0}
            variant="contained"
            startIcon={bulkDeleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}
            sx={{
              bgcolor: '#ef5350',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            {bulkDeleting ? 'Deleting...' : `Delete ${deletableSelected.length} Tournament${deletableSelected.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog
        open={cleanupDialogOpen}
        onClose={() => !cleaningUp && setCleanupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(239,83,80,0.24)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f5f5f0', fontFamily: 'var(--font-playfair), serif' }}>
          Clean Up Old Tournaments
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Remove finished tournaments you no longer need. This permanently deletes the tournament and all associated participants, brackets, and match data.
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#f5f5f0', fontWeight: 700, mb: 1.5 }}>
            Which statuses to clean up?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cleanupCompleted}
                  onChange={(e) => setCleanupCompleted(e.target.checked)}
                  sx={{
                    color: 'rgba(102,187,106,0.4)',
                    '&.Mui-checked': { color: '#66bb6a' },
                  }}
                />
              }
              label="Completed"
              sx={{ color: '#f5f5f0' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cleanupCancelled}
                  onChange={(e) => setCleanupCancelled(e.target.checked)}
                  sx={{
                    color: 'rgba(239,83,80,0.4)',
                    '&.Mui-checked': { color: '#ef5350' },
                  }}
                />
              }
              label="Cancelled"
              sx={{ color: '#f5f5f0' }}
            />
          </Box>

          <FormControl
            fullWidth
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.35)' },
                '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#D4AF37' },
            }}
          >
            <InputLabel>Time Period</InputLabel>
            <Select
              value={cleanupPeriod}
              label="Time Period"
              onChange={(e) => setCleanupPeriod(e.target.value)}
            >
              {CLEANUP_PERIODS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: cleanupPreviewCount > 0 ? 'rgba(239,83,80,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${cleanupPreviewCount > 0 ? 'rgba(239,83,80,0.2)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: cleanupPreviewCount > 0 ? '#ef5350' : 'text.secondary', fontFamily: 'var(--font-playfair), serif' }}>
              {cleanupPreviewCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              tournament{cleanupPreviewCount !== 1 ? 's' : ''} will be deleted
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setCleanupDialogOpen(false)}
            disabled={cleaningUp}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCleanup}
            disabled={cleaningUp || cleanupPreviewCount === 0 || (!cleanupCompleted && !cleanupCancelled)}
            variant="contained"
            startIcon={cleaningUp ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CleaningServicesIcon />}
            sx={{
              bgcolor: '#ef5350',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#d32f2f' },
              '&:disabled': { bgcolor: 'rgba(239,83,80,0.25)', color: 'rgba(255,255,255,0.4)' },
            }}
          >
            {cleaningUp ? 'Cleaning Up...' : `Delete ${cleanupPreviewCount} Tournament${cleanupPreviewCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
