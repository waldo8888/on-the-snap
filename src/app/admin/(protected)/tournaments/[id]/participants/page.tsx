'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SyntheticEvent,
} from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Snackbar,
  useMediaQuery,
  useTheme,
  IconButton,
  Checkbox,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Participant, Tournament, Player } from '@/lib/tournament-engine/types';
import {
  getParticipants,
  addParticipant,
  addParticipantsBulk,
  updateParticipant,
  removeParticipant,
  getTournamentById,
  reseedParticipants,
  getPlayers,
  getPlayersByIds,
  relinkParticipantToPlayer,
  mergePlayerRecords,
} from '@/lib/tournaments';
import {
  getImportableParticipantRows,
  type ParticipantImportValidationResult,
} from '@/lib/participant-import';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

// Sub-components
import ParticipantTable from '@/components/admin/participants/ParticipantTable';
import AddParticipantDialog from '@/components/admin/participants/AddParticipantDialog';
import ImportParticipantsDialog from '@/components/admin/participants/ImportParticipantsDialog';
import SeedingControls from '@/components/admin/participants/SeedingControls';
import CheckInPanel from '@/components/admin/participants/CheckInPanel';
import {
  GOLD,
  BG_DARK,
  BORDER,
  DIALOG_PAPER_SX,
  DIALOG_CONTENT_SX,
  DIALOG_SCROLL_CONTAIN_PROPS,
  emptyForm,
  type PlayerFormData,
} from '@/components/admin/participants/shared';

// ============================================================
// Constants
// ============================================================

const TAB_LABELS = ['Details', 'Participants', 'Bracket', 'Operations'];
const TAB_ROUTES = ['', '/participants', '/bracket', '/operations'];

// ============================================================
// Identity helpers
// ============================================================

interface IdentityDialogState {
  participant: Participant | null;
  query: string;
  selectedPlayerId: string;
}

function normalizeIdentityName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function isLikelyDuplicatePlayer(participant: Participant, player: Player) {
  const participantName = normalizeIdentityName(participant.name);
  const playerName = normalizeIdentityName(player.display_name);

  if (!participantName || !playerName) return false;
  if (participantName === playerName) return true;

  const participantTokens = new Set(participantName.split(' ').filter(Boolean));
  const playerTokens = new Set(playerName.split(' ').filter(Boolean));
  const sharedTokens = [...participantTokens].filter((token) => playerTokens.has(token));
  const overlapRatio = participantTokens.size === 0 ? 0 : sharedTokens.length / participantTokens.size;
  const missingContact = !player.primary_email && !player.primary_phone;

  return missingContact && overlapRatio >= 0.6;
}

// ============================================================
// Page Component
// ============================================================

export default function ParticipantsPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tournamentId = resolveTournamentAdminRouteId(params.id, pathname);

  // Data state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [linkedPlayers, setLinkedPlayers] = useState<Record<string, Player>>({});
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

  // Drag-and-drop
  const [reorderMode, setReorderMode] = useState(false);

  // CSV import
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importValidation, setImportValidation] = useState<ParticipantImportValidationResult | null>(null);
  const [includeWarningRows, setIncludeWarningRows] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);

  // Identity management
  const [identityDialog, setIdentityDialog] = useState<IdentityDialogState>({
    participant: null,
    query: '',
    selectedPlayerId: '',
  });
  const [identityResults, setIdentityResults] = useState<Player[]>([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [identityMergeQueue, setIdentityMergeQueue] = useState<Set<string>>(new Set());

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk link dialog
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);
  const [bulkLinkQuery, setBulkLinkQuery] = useState('');
  const [bulkLinkResults, setBulkLinkResults] = useState<Player[]>([]);
  const [bulkLinkLoading, setBulkLinkLoading] = useState(false);
  const [bulkLinkSelectedPlayerId, setBulkLinkSelectedPlayerId] = useState('');
  const [bulkLinkSubmitting, setBulkLinkSubmitting] = useState(false);

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
    if (!tournamentId) {
      setError('Invalid tournament route.');
      setLoading(false);
      return;
    }

    try {
      const [t, p] = await Promise.all([
        getTournamentById(tournamentId),
        getParticipants(tournamentId),
      ]);
      if (t) setTournament(t);
      setParticipants(p);
      const linkedIds = Array.from(
        new Set(
          p.map((participant) => participant.player_id).filter((playerId): playerId is string => Boolean(playerId))
        )
      );
      const players = await getPlayersByIds(linkedIds);
      setLinkedPlayers(Object.fromEntries(players.map((player) => [player.id, player])));
      setError(null);
    } catch (err) {
      setError('Failed to load tournament data.');
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

  const showSnack = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const updateField = (field: keyof PlayerFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add
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
      showSnack('Failed to add player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit
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
      showSnack('Failed to update player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await removeParticipant(id);
      await fetchData();
      setDeleteConfirmId(null);
      showSnack('Player removed');
    } catch (err) {
      showSnack('Failed to remove player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Check-in
  const handleToggleCheckIn = async (p: Participant) => {
    const newCheckedIn = !p.checked_in;
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
    } catch {
      setParticipants((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, checked_in: p.checked_in, checked_in_at: p.checked_in_at } : x))
      );
      showSnack('Failed to update check-in', 'error');
    }
  };

  const handleCheckInAll = async () => {
    const unchecked = participants.filter((p) => !p.checked_in);
    if (unchecked.length === 0) return;
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
    } catch {
      await fetchData();
      showSnack('Failed to check in all players', 'error');
    }
  };

  const handleResetCheckInAll = async () => {
    const checkedInPlayers = participants.filter((p) => p.checked_in);
    if (checkedInPlayers.length === 0) return;
    setParticipants((prev) => prev.map((p) => ({ ...p, checked_in: false, checked_in_at: null })));
    try {
      await Promise.all(
        checkedInPlayers.map((p) =>
          updateParticipant(p.id, { checked_in: false, checked_in_at: null })
        )
      );
      showSnack(`Reset check-in for ${checkedInPlayers.length} player${checkedInPlayers.length > 1 ? 's' : ''}`);
    } catch {
      await fetchData();
      showSnack('Failed to reset check-ins', 'error');
    }
  };

  // ----------------------------------------------------------
  // Bulk Selection
  // ----------------------------------------------------------

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(visibleParticipants.map((p) => p.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [participants, searchQuery]
  );

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => removeParticipant(id)));
      setSelectedIds(new Set());
      await fetchData();
      showSnack(`Removed ${selectedIds.size} player${selectedIds.size > 1 ? 's' : ''}`);
    } catch {
      await fetchData();
      showSnack('Failed to remove some players', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCheckIn = async () => {
    const targets = participants.filter((p) => selectedIds.has(p.id) && !p.checked_in);
    if (targets.length === 0) return;
    setParticipants((prev) =>
      prev.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, checked_in: true, checked_in_at: p.checked_in_at || new Date().toISOString() }
          : p
      )
    );
    try {
      await Promise.all(
        targets.map((p) =>
          updateParticipant(p.id, { checked_in: true, checked_in_at: new Date().toISOString() })
        )
      );
      showSnack(`Checked in ${targets.length} player${targets.length > 1 ? 's' : ''}`);
    } catch {
      await fetchData();
      showSnack('Failed to check in selected players', 'error');
    }
  };

  const handleBulkUncheck = async () => {
    const targets = participants.filter((p) => selectedIds.has(p.id) && p.checked_in);
    if (targets.length === 0) return;
    setParticipants((prev) =>
      prev.map((p) =>
        selectedIds.has(p.id) ? { ...p, checked_in: false, checked_in_at: null } : p
      )
    );
    try {
      await Promise.all(
        targets.map((p) => updateParticipant(p.id, { checked_in: false, checked_in_at: null }))
      );
      showSnack(`Unchecked ${targets.length} player${targets.length > 1 ? 's' : ''}`);
    } catch {
      await fetchData();
      showSnack('Failed to uncheck selected players', 'error');
    }
  };

  // ----------------------------------------------------------
  // Bulk Link to Player
  // ----------------------------------------------------------

  const openBulkLinkDialog = () => {
    setBulkLinkOpen(true);
    setBulkLinkQuery('');
    setBulkLinkResults([]);
    setBulkLinkSelectedPlayerId('');
  };

  const closeBulkLinkDialog = () => {
    setBulkLinkOpen(false);
    setBulkLinkQuery('');
    setBulkLinkResults([]);
    setBulkLinkSelectedPlayerId('');
  };

  useEffect(() => {
    if (!bulkLinkOpen || !bulkLinkQuery.trim()) {
      setBulkLinkResults([]);
      return;
    }
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      setBulkLinkLoading(true);
      void getPlayers(bulkLinkQuery, 12)
        .then((players) => { if (isActive) setBulkLinkResults(players); })
        .catch(() => { if (isActive) showSnack('Failed to search player profiles', 'error'); })
        .finally(() => { if (isActive) setBulkLinkLoading(false); });
    }, 250);
    return () => { isActive = false; window.clearTimeout(timeoutId); };
  }, [bulkLinkOpen, bulkLinkQuery, showSnack]);

  const handleBulkLink = async () => {
    if (!bulkLinkSelectedPlayerId || selectedIds.size === 0) return;
    setBulkLinkSubmitting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((participantId) =>
          relinkParticipantToPlayer(participantId, bulkLinkSelectedPlayerId)
        )
      );
      await fetchData();
      const count = selectedIds.size;
      setSelectedIds(new Set());
      closeBulkLinkDialog();
      showSnack(`Linked ${count} participant${count > 1 ? 's' : ''} to player profile`);
    } catch {
      await fetchData();
      showSnack('Failed to link some participants', 'error');
    } finally {
      setBulkLinkSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // Export CSV
  // ----------------------------------------------------------

  const handleExportCsv = useCallback(() => {
    if (participants.length === 0) return;
    const headers = ['seed', 'name', 'email', 'phone', 'handicap', 'checked_in', 'notes'];
    const rows = participants.map((p) => [
      p.seed ?? '',
      p.name,
      p.email ?? '',
      p.phone ?? '',
      p.handicap ?? 0,
      p.checked_in ? 'yes' : 'no',
      p.notes ?? '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tournament?.title ?? 'tournament'}-players.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSnack('CSV exported');
  }, [participants, tournament?.title, showSnack]);

  // ----------------------------------------------------------
  // Seeding
  // ----------------------------------------------------------

  const handleRandomizeSeeds = async () => {
    if (participants.length === 0) return;
    const ids = participants.map((p) => p.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
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
    } catch {
      await fetchData();
      showSnack('Failed to randomize seeds', 'error');
    }
  };

  // ----------------------------------------------------------
  // Import CSV
  // ----------------------------------------------------------

  const resetImportState = () => {
    setImportDialogOpen(false);
    setImportFileName('');
    setImportValidation(null);
    setIncludeWarningRows(false);
  };

  const handleImportOpen = (fileName: string, validation: ParticipantImportValidationResult) => {
    setImportFileName(fileName);
    setImportValidation(validation);
    setIncludeWarningRows(false);
    setImportDialogOpen(true);
  };

  const handleImportCsv = async () => {
    if (!importValidation) return;
    if (importValidation.unsupportedHeaders.length > 0) {
      showSnack('Remove unsupported CSV headers before importing', 'error');
      return;
    }
    const rowsToImport = getImportableParticipantRows(importValidation.rows, includeWarningRows);
    if (rowsToImport.length === 0) {
      showSnack('No valid participant rows remain to import', 'error');
      return;
    }
    try {
      setImportSubmitting(true);
      const currentMaxSeed = participants.reduce(
        (maxSeed, participant) => Math.max(maxSeed, participant.seed ?? 0), 0
      );
      const allRowsHaveSeeds = rowsToImport.every((row) => row.normalized.seed !== null);
      const timestamp = new Date().toISOString();
      await addParticipantsBulk(
        rowsToImport.map((row, index) => ({
          tournament_id: tournamentId,
          name: row.normalized.name,
          email: row.normalized.email,
          phone: row.normalized.phone,
          handicap: row.normalized.handicap,
          notes: row.normalized.notes,
          checked_in: row.normalized.checked_in,
          checked_in_at: row.normalized.checked_in ? timestamp : null,
          seed: allRowsHaveSeeds ? row.normalized.seed : currentMaxSeed + index + 1,
        }))
      );
      if (allRowsHaveSeeds) {
        const refreshedParticipants = await getParticipants(tournamentId);
        const orderedIds = [...refreshedParticipants]
          .sort((left, right) => {
            const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
            const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;
            if (leftSeed !== rightSeed) return leftSeed - rightSeed;
            return left.created_at.localeCompare(right.created_at);
          })
          .map((participant) => participant.id);
        await reseedParticipants(tournamentId, orderedIds);
      }
      await fetchData();
      resetImportState();
      showSnack(`${rowsToImport.length} participant${rowsToImport.length === 1 ? '' : 's'} imported`);
    } catch {
      showSnack('Failed to import participants', 'error');
    } finally {
      setImportSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // Identity Management
  // ----------------------------------------------------------

  const openIdentityDialog = (participant: Participant) => {
    setIdentityDialog({
      participant,
      query: participant.name,
      selectedPlayerId: participant.player_id ?? '',
    });
    setIdentityMergeQueue(new Set());
  };

  const closeIdentityDialog = () => {
    setIdentityDialog({ participant: null, query: '', selectedPlayerId: '' });
    setIdentityResults([]);
    setIdentityMergeQueue(new Set());
  };

  useEffect(() => {
    if (!identityDialog.participant) return;
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      setIdentityLoading(true);
      void getPlayers(identityDialog.query, 12)
        .then((players) => { if (isActive) setIdentityResults(players); })
        .catch(() => { if (isActive) showSnack('Failed to search player profiles', 'error'); })
        .finally(() => { if (isActive) setIdentityLoading(false); });
    }, 250);
    return () => { isActive = false; window.clearTimeout(timeoutId); };
  }, [identityDialog.participant, identityDialog.query, showSnack]);

  const handleRelinkPlayer = async () => {
    if (!identityDialog.participant || !identityDialog.selectedPlayerId) return;
    try {
      setIdentitySubmitting(true);
      await relinkParticipantToPlayer(identityDialog.participant.id, identityDialog.selectedPlayerId);
      await fetchData();
      closeIdentityDialog();
      showSnack('Participant identity updated');
    } catch {
      showSnack('Failed to relink participant', 'error');
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const handleMergePlayers = async () => {
    const currentPlayerId = identityDialog.participant?.player_id;
    const selectedPlayerId = identityDialog.selectedPlayerId;
    if (!currentPlayerId || !selectedPlayerId || currentPlayerId === selectedPlayerId) return;
    try {
      setIdentitySubmitting(true);
      await mergePlayerRecords(currentPlayerId, selectedPlayerId);
      await fetchData();
      closeIdentityDialog();
      showSnack('Player records merged');
    } catch {
      showSnack('Failed to merge player records', 'error');
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const selectIdentityTarget = useCallback((playerId: string) => {
    setIdentityDialog((current) => ({ ...current, selectedPlayerId: playerId }));
    setIdentityMergeQueue((current) => {
      if (!current.has(playerId)) return current;
      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
  }, []);

  const toggleIdentityMergeQueue = useCallback((playerId: string, checked: boolean) => {
    setIdentityMergeQueue((current) => {
      const next = new Set(current);
      if (checked) next.add(playerId);
      else next.delete(playerId);
      return next;
    });
  }, []);

  const handleMergeQueuedPlayers = async () => {
    const targetPlayerId = identityDialog.selectedPlayerId;
    const sourcePlayerIds = Array.from(identityMergeQueue).filter((playerId) => playerId !== targetPlayerId);
    let mergedCount = 0;
    if (!targetPlayerId || sourcePlayerIds.length === 0) return;
    try {
      setIdentitySubmitting(true);
      for (const sourcePlayerId of sourcePlayerIds) {
        await mergePlayerRecords(sourcePlayerId, targetPlayerId);
        mergedCount += 1;
      }
      await fetchData();
      const targetPlayerName = identityVisiblePlayers.get(targetPlayerId)?.display_name ?? 'selected player';
      closeIdentityDialog();
      showSnack(
        `Merged ${sourcePlayerIds.length} duplicate record${sourcePlayerIds.length === 1 ? '' : 's'} into ${targetPlayerName}`
      );
    } catch {
      await fetchData();
      showSnack(
        mergedCount > 0
          ? `Merged ${mergedCount} duplicate record${mergedCount === 1 ? '' : 's'} before the queue stopped. Review the remaining duplicates and retry.`
          : sourcePlayerIds.length === 1
          ? 'Failed to merge the queued duplicate record'
          : 'Merge queue stopped before every duplicate record was merged. Review the remaining duplicates and retry.',
        'error'
      );
    } finally {
      setIdentitySubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // Drag-and-Drop Seeding
  // ----------------------------------------------------------

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = participants.findIndex((p) => p.id === active.id);
    const newIndex = participants.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...participants];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const withNewSeeds = reordered.map((p, idx) => ({ ...p, seed: idx + 1 }));
    setParticipants(withNewSeeds);
    const newOrderedIds = withNewSeeds.map((p) => p.id);
    try {
      await reseedParticipants(tournamentId, newOrderedIds);
      showSnack('Seed order updated');
    } catch {
      await fetchData();
      showSnack('Failed to update seed order', 'error');
    }
  };

  // ----------------------------------------------------------
  // Tab Navigation
  // ----------------------------------------------------------

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
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

  const currentIdentityPlayer = identityDialog.participant?.player_id
    ? linkedPlayers[identityDialog.participant.player_id] ?? null
    : null;
  const duplicateSuggestions = useMemo(
    () =>
      identityDialog.participant
        ? identityResults.filter((player) => isLikelyDuplicatePlayer(identityDialog.participant!, player))
        : [],
    [identityDialog.participant, identityResults]
  );
  const duplicateSuggestionIds = useMemo(
    () => new Set(duplicateSuggestions.map((player) => player.id)),
    [duplicateSuggestions]
  );
  const identitySearchResults = useMemo(
    () => identityResults.filter((player) => !duplicateSuggestionIds.has(player.id)),
    [identityResults, duplicateSuggestionIds]
  );
  const identityVisiblePlayers = useMemo(() => {
    const players = new Map<string, Player>();
    if (currentIdentityPlayer) players.set(currentIdentityPlayer.id, currentIdentityPlayer);
    duplicateSuggestions.forEach((player) => players.set(player.id, player));
    identityResults.forEach((player) => players.set(player.id, player));
    return players;
  }, [currentIdentityPlayer, duplicateSuggestions, identityResults]);
  const queuedIdentityMergeIds = useMemo(
    () => Array.from(identityMergeQueue).filter((playerId) => playerId !== identityDialog.selectedPlayerId),
    [identityMergeQueue, identityDialog.selectedPlayerId]
  );
  const queuedIdentityMergePlayers = useMemo(
    () =>
      queuedIdentityMergeIds
        .map((playerId) => identityVisiblePlayers.get(playerId))
        .filter((player): player is Player => Boolean(player)),
    [queuedIdentityMergeIds, identityVisiblePlayers]
  );
  const queueableDuplicateSuggestionCount = useMemo(
    () =>
      duplicateSuggestions.filter(
        (player) =>
          player.id !== identityDialog.selectedPlayerId && !identityMergeQueue.has(player.id)
      ).length,
    [duplicateSuggestions, identityDialog.selectedPlayerId, identityMergeQueue]
  );
  const handleQueueAllDuplicateSuggestions = useCallback(() => {
    setIdentityMergeQueue((current) => {
      const next = new Set(current);
      duplicateSuggestions.forEach((player) => {
        if (player.id !== identityDialog.selectedPlayerId) next.add(player.id);
      });
      return next;
    });
  }, [duplicateSuggestions, identityDialog.selectedPlayerId]);

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
    <Box>
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

        <SeedingControls
          participantCount={participants.length}
          reorderMode={reorderMode}
          onRandomizeSeeds={handleRandomizeSeeds}
          onToggleReorderMode={() => setReorderMode((prev) => !prev)}
        />

        <ImportParticipantsDialog
          open={importDialogOpen}
          fileName={importFileName}
          validation={importValidation}
          includeWarningRows={includeWarningRows}
          submitting={importSubmitting}
          onOpen={handleImportOpen}
          onClose={resetImportState}
          onImport={handleImportCsv}
          onIncludeWarningRowsChange={setIncludeWarningRows}
          participants={participants}
          showSnack={showSnack}
        />

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCsv}
          disabled={participants.length === 0}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: GOLD, color: GOLD },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          Export CSV
        </Button>

        <Button
          variant="outlined"
          startIcon={<ManageAccountsIcon />}
          onClick={openBulkLinkDialog}
          disabled={selectedIds.size === 0 || reorderMode}
          sx={{
            borderColor: BORDER,
            color: GOLD,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: GOLD, bgcolor: 'rgba(212,175,55,0.08)' },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          {selectedIds.size > 0 ? `Bulk Link Selected (${selectedIds.size})` : 'Bulk Link Selected'}
        </Button>

        <CheckInPanel
          participantCount={participants.length}
          checkedInCount={checkedInCount}
          onCheckInAll={handleCheckInAll}
          onResetCheckInAll={handleResetCheckInAll}
        />

        <Box sx={{ flex: 1 }} />
      </Box>

      {/* Participant Table */}
      <ParticipantTable
        participants={participants}
        visibleParticipants={visibleParticipants}
        linkedPlayers={linkedPlayers}
        isMobile={isMobile}
        reorderMode={reorderMode}
        selectedIds={selectedIds}
        submitting={submitting}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSelectOne={handleSelectOne}
        onSelectAll={handleSelectAll}
        onEditOpen={handleEditOpen}
        onDeleteConfirm={setDeleteConfirmId}
        onToggleCheckIn={handleToggleCheckIn}
        onManageIdentity={openIdentityDialog}
        onDragEnd={handleDragEnd}
        onAddOpen={handleAddOpen}
        onBulkCheckIn={handleBulkCheckIn}
        onBulkUncheck={handleBulkUncheck}
        onBulkDelete={handleBulkDelete}
        onBulkLinkOpen={openBulkLinkDialog}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Add Player Dialog */}
      <AddParticipantDialog
        open={addOpen}
        formData={formData}
        submitting={submitting}
        onClose={handleAddClose}
        onSubmit={handleAddSubmit}
        onUpdateField={updateField}
      />

      {/* Edit Player Dialog */}
      <AddParticipantDialog
        open={editOpen}
        formData={formData}
        submitting={submitting}
        isEdit
        onClose={handleEditClose}
        onSubmit={handleEditSubmit}
        onUpdateField={updateField}
      />

      {/* Identity Management Dialog */}
      <Dialog
        open={Boolean(identityDialog.participant)}
        onClose={closeIdentityDialog}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Manage Player Identity
        </DialogTitle>
        <DialogContent
          {...DIALOG_SCROLL_CONTAIN_PROPS}
          sx={{ ...DIALOG_CONTENT_SX, display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Link this tournament participant to a canonical player profile, or merge a duplicate identity into another record.
          </DialogContentText>

          {identityDialog.participant && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: '#0a0a0a',
                border: `1px solid ${BORDER}`,
              }}
            >
              <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                {identityDialog.participant.name}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.5 }}>
                Current link: {currentIdentityPlayer ? currentIdentityPlayer.display_name : 'Unlinked'}
              </Typography>
            </Box>
          )}

          <TextField
            label="Search players"
            value={identityDialog.query}
            onChange={(event) =>
              setIdentityDialog((current) => ({ ...current, query: event.target.value }))
            }
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

          <Box
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'rgba(212,175,55,0.05)',
              border: `1px solid ${BORDER}`,
            }}
          >
            <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: '0.8rem' }}>
              Need to merge several duplicates into one canonical name?
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', mt: 0.5 }}>
              Click a row to choose the one profile you want to keep as the target. Then use the
              checkbox on any duplicate rows below to queue them for merge into that target in one shot.
            </Typography>
          </Box>

          {queuedIdentityMergePlayers.length > 0 && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'rgba(239,83,80,0.08)',
                border: '1px solid rgba(239,83,80,0.2)',
              }}
            >
              <Typography sx={{ color: '#ef9a9a', fontWeight: 700, fontSize: '0.8rem', mb: 0.75 }}>
                {queuedIdentityMergePlayers.length} duplicate record{queuedIdentityMergePlayers.length === 1 ? '' : 's'} queued for merge
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {queuedIdentityMergePlayers.map((player) => (
                  <Chip
                    key={`queued-${player.id}`}
                    label={player.display_name}
                    onDelete={() => toggleIdentityMergeQueue(player.id, false)}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(239,83,80,0.1)',
                      color: '#f5f5f0',
                      border: '1px solid rgba(239,83,80,0.22)',
                      '& .MuiChip-deleteIcon': { color: '#ef9a9a' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box
            {...DIALOG_SCROLL_CONTAIN_PROPS}
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              overflowX: 'hidden',
              overflowY: 'auto',
              maxHeight: 360,
              overscrollBehavior: 'contain',
              flex: '1 1 auto',
              minHeight: 0,
            }}
          >
            {duplicateSuggestions.length > 0 && (
              <Box sx={{ p: 1.5, borderBottom: `1px solid ${BORDER}`, bgcolor: 'rgba(212,175,55,0.04)' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: '0.78rem' }}>
                    Likely duplicate suggestions
                  </Typography>
                  <Button
                    onClick={handleQueueAllDuplicateSuggestions}
                    disabled={identitySubmitting || queueableDuplicateSuggestionCount === 0}
                    size="small"
                    sx={{
                      color: GOLD,
                      textTransform: 'none',
                      fontWeight: 700,
                      minWidth: 0,
                      px: 0,
                    }}
                  >
                    Queue all suggestions
                  </Button>
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', mb: 1 }}>
                  Suggestion only. Review manually before linking when names are very close or the
                  player record has no contact info.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {duplicateSuggestions.map((player) => {
                    const selected = identityDialog.selectedPlayerId === player.id;
                    const queuedForMerge = identityMergeQueue.has(player.id);
                    return (
                      <Box
                        key={`suggestion-${player.id}`}
                        onClick={() => selectIdentityTarget(player.id)}
                        sx={{
                          px: 1.25,
                          py: 1,
                          cursor: 'pointer',
                          border: '1px solid rgba(212,175,55,0.16)',
                          bgcolor: selected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                          '&:hover': { bgcolor: 'rgba(212,175,55,0.07)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                              {player.display_name}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
                              {[player.primary_email, player.primary_phone].filter(Boolean).join(' \u2022 ') || 'No contact info'}
                            </Typography>
                          </Box>
                          <Box
                            onClick={(event) => event.stopPropagation()}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}
                          >
                            {selected ? (
                              <Chip
                                label="Target"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(212,175,55,0.12)',
                                  color: GOLD,
                                  border: `1px solid ${BORDER}`,
                                  fontWeight: 700,
                                }}
                              />
                            ) : (
                              <>
                                <Checkbox
                                  checked={queuedForMerge}
                                  onChange={(event) => toggleIdentityMergeQueue(player.id, event.target.checked)}
                                  size="small"
                                  sx={{
                                    color: GOLD,
                                    '&.Mui-checked': { color: GOLD },
                                    p: 0.25,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    color: queuedForMerge ? '#f5f5f0' : 'text.secondary',
                                    fontSize: '0.72rem',
                                    fontWeight: queuedForMerge ? 600 : 500,
                                  }}
                                >
                                  Queue merge
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {identityLoading ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} sx={{ color: GOLD }} />
              </Box>
            ) : identitySearchResults.length === 0 && duplicateSuggestions.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center' }}>
                  No player profiles match this search.
                </Typography>
              </Box>
            ) : (
              identitySearchResults.map((player) => {
                const selected = identityDialog.selectedPlayerId === player.id;
                const queuedForMerge = identityMergeQueue.has(player.id);
                return (
                  <Box
                    key={player.id}
                    onClick={() => selectIdentityTarget(player.id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      bgcolor: selected ? 'rgba(212,175,55,0.08)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(212,175,55,0.05)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                          {player.display_name}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                          {[player.primary_email, player.primary_phone].filter(Boolean).join(' \u2022 ') || 'No contact info'}
                        </Typography>
                      </Box>
                      <Box
                        onClick={(event) => event.stopPropagation()}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}
                      >
                        {selected ? (
                          <Chip
                            label="Target"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(212,175,55,0.12)',
                              color: GOLD,
                              border: `1px solid ${BORDER}`,
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          <>
                            <Checkbox
                              checked={queuedForMerge}
                              onChange={(event) => toggleIdentityMergeQueue(player.id, event.target.checked)}
                              size="small"
                              sx={{
                                color: GOLD,
                                '&.Mui-checked': { color: GOLD },
                                p: 0.25,
                              }}
                            />
                            <Typography
                              sx={{
                                color: queuedForMerge ? '#f5f5f0' : 'text.secondary',
                                fontSize: '0.72rem',
                                fontWeight: queuedForMerge ? 600 : 500,
                              }}
                            >
                              Queue merge
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeIdentityDialog} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleMergeQueuedPlayers}
            startIcon={<MergeTypeIcon />}
            disabled={identitySubmitting || !identityDialog.selectedPlayerId || queuedIdentityMergeIds.length === 0}
            sx={{
              color: '#ef9a9a',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {queuedIdentityMergeIds.length > 0
              ? `Merge ${queuedIdentityMergeIds.length} Queued into Target`
              : 'Merge Queued into Target'}
          </Button>
          <Button
            onClick={handleMergePlayers}
            startIcon={<MergeTypeIcon />}
            disabled={
              identitySubmitting ||
              !identityDialog.participant?.player_id ||
              !identityDialog.selectedPlayerId ||
              identityDialog.participant.player_id === identityDialog.selectedPlayerId
            }
            sx={{
              color: '#ef9a9a',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Merge Current into Target
          </Button>
          <Button
            onClick={handleRelinkPlayer}
            variant="contained"
            startIcon={<ManageAccountsIcon />}
            disabled={identitySubmitting || !identityDialog.selectedPlayerId}
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
            }}
          >
            {identitySubmitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : 'Link Participant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
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

      {/* Bulk Link to Player Dialog */}
      <Dialog
        open={bulkLinkOpen}
        onClose={closeBulkLinkDialog}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Link {selectedIds.size} Participant{selectedIds.size !== 1 ? 's' : ''} to Player
        </DialogTitle>
        <DialogContent
          {...DIALOG_SCROLL_CONTAIN_PROPS}
          sx={{ ...DIALOG_CONTENT_SX, display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Search for a player profile, then link all selected participants to it at once.
          </DialogContentText>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {Array.from(selectedIds).map((id) => {
              const p = participants.find((x) => x.id === id);
              return p ? (
                <Chip
                  key={id}
                  label={p.name}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(212,175,55,0.1)',
                    color: '#f5f5f0',
                    border: `1px solid ${BORDER}`,
                    fontWeight: 600,
                    fontSize: '0.72rem',
                  }}
                />
              ) : null;
            })}
          </Box>

          <TextField
            label="Search players"
            value={bulkLinkQuery}
            onChange={(e) => setBulkLinkQuery(e.target.value)}
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

          <Box
            {...DIALOG_SCROLL_CONTAIN_PROPS}
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              overflowX: 'hidden',
              overflowY: 'auto',
              maxHeight: 300,
              overscrollBehavior: 'contain',
              flex: '1 1 auto',
              minHeight: 0,
            }}
          >
            {bulkLinkLoading ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} sx={{ color: GOLD }} />
              </Box>
            ) : bulkLinkResults.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center' }}>
                  {bulkLinkQuery.trim() ? 'No player profiles match this search.' : 'Type a name to search player profiles.'}
                </Typography>
              </Box>
            ) : (
              bulkLinkResults.map((player) => {
                const selected = bulkLinkSelectedPlayerId === player.id;
                return (
                  <Box
                    key={player.id}
                    onClick={() => setBulkLinkSelectedPlayerId(player.id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      bgcolor: selected ? 'rgba(212,175,55,0.08)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(212,175,55,0.05)' },
                    }}
                  >
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                      {player.display_name}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                      {[player.primary_email, player.primary_phone].filter(Boolean).join(' \u2022 ') || 'No contact info'}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeBulkLinkDialog} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkLink}
            variant="contained"
            startIcon={<ManageAccountsIcon />}
            disabled={bulkLinkSubmitting || !bulkLinkSelectedPlayerId}
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
            }}
          >
            {bulkLinkSubmitting
              ? <CircularProgress size={20} sx={{ color: BG_DARK }} />
              : `Link ${selectedIds.size} Participant${selectedIds.size !== 1 ? 's' : ''}`
            }
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
