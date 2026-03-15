'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type SyntheticEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
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
  FormControlLabel,
  Checkbox,
  DialogContentText,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import CloseIcon from '@mui/icons-material/Close';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import Papa from 'papaparse';
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
  validateParticipantImportRows,
  type ParticipantImportRowInput,
  type ParticipantImportValidationResult,
} from '@/lib/participant-import';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

// ============================================================
// Constants
// ============================================================

const GOLD = '#D4AF37';
const BG_DARK = '#050505';
const BG_CARD = '#0a0a0a';
const BORDER = 'rgba(212,175,55,0.15)';

const DIALOG_PAPER_SX = {
  bgcolor: '#111111',
  border: `1px solid ${BORDER}`,
  borderRadius: 2,
  backgroundImage: 'none',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
} as const;

/** Prevents trackpad/touch scroll from leaking through dialogs to the page behind.
 *  - flex + minHeight: 0 ensures the DialogContent shrinks and scrolls inside the flex Paper
 *  - overscrollBehavior: contain stops scroll events from leaking to the page */
const DIALOG_CONTENT_SX = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto' as const,
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
};

function stopScrollPropagation(event: ReactWheelEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) {
  event.stopPropagation();
}

const DIALOG_SCROLL_CONTAIN_PROPS = {
  onWheelCapture: stopScrollPropagation,
  onTouchMoveCapture: stopScrollPropagation,
} as const;

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

  if (!participantName || !playerName) {
    return false;
  }

  if (participantName === playerName) {
    return true;
  }

  const participantTokens = new Set(participantName.split(' ').filter(Boolean));
  const playerTokens = new Set(playerName.split(' ').filter(Boolean));
  const sharedTokens = [...participantTokens].filter((token) => playerTokens.has(token));
  const overlapRatio =
    participantTokens.size === 0 ? 0 : sharedTokens.length / participantTokens.size;
  const missingContact = !player.primary_email && !player.primary_phone;

  return missingContact && overlapRatio >= 0.6;
}

// ============================================================
// Sortable Row Component
// ============================================================

function SortableRow({
  participant: p,
  linkedPlayer,
  isMobile,
  reorderMode,
  selected,
  onSelect,
  onEditOpen,
  onDeleteConfirm,
  onToggleCheckIn,
  onManageIdentity,
}: {
  participant: Participant;
  linkedPlayer: Player | null;
  isMobile: boolean;
  reorderMode: boolean;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onEditOpen: (p: Participant) => void;
  onDeleteConfirm: (id: string) => void;
  onToggleCheckIn: (p: Participant) => void;
  onManageIdentity: (p: Participant) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          py: 1.5,
        },
        '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
        transition: 'background-color 0.15s',
        ...(isDragging && {
          bgcolor: 'rgba(212,175,55,0.08)',
          outline: `2px solid ${GOLD}`,
          borderRadius: 1,
          zIndex: 10,
        }),
      }}
    >
      {reorderMode && (
        <TableCell sx={{ width: 40, px: 0.5 }}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{
              color: GOLD,
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
              touchAction: 'none',
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        </TableCell>
      )}
      {!reorderMode && (
        <TableCell sx={{ width: 44, px: 0.5 }}>
          <Checkbox
            checked={selected}
            onChange={(e) => onSelect(p.id, e.target.checked)}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.25)',
              '&.Mui-checked': { color: GOLD },
              p: 0.5,
            }}
          />
        </TableCell>
      )}
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
          <Chip
            label={linkedPlayer ? `Linked: ${linkedPlayer.display_name}` : 'Unlinked'}
            size="small"
            sx={{
              height: 22,
              bgcolor: linkedPlayer ? 'rgba(57,168,122,0.12)' : 'rgba(239,83,80,0.08)',
              color: linkedPlayer ? '#81c784' : '#ef9a9a',
              border: `1px solid ${linkedPlayer ? 'rgba(57,168,122,0.22)' : 'rgba(239,83,80,0.18)'}`,
              fontSize: '0.68rem',
              fontWeight: 600,
              maxWidth: 220,
            }}
          />
          {isMobile && p.handicap > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
              HC: {p.handicap}
            </Typography>
          )}
        </Box>
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
          onChange={() => onToggleCheckIn(p)}
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
            onClick={() => onManageIdentity(p)}
            sx={{ color: 'text.secondary', '&:hover': { color: '#81c784' } }}
          >
            <ManageAccountsIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onEditOpen(p)}
            sx={{ color: 'text.secondary', '&:hover': { color: GOLD } }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDeleteConfirm(p.id)}
            sx={{ color: 'text.secondary', '&:hover': { color: '#ef5350' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
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
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

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
      setLinkedPlayers(
        Object.fromEntries(players.map((player) => [player.id, player]))
      );
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

  const showSnack = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

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

  // ----------------------------------------------------------
  // Bulk Selection Handlers
  // ----------------------------------------------------------

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => removeParticipant(id)));
      setSelectedIds(new Set());
      await fetchData();
      showSnack(`Removed ${selectedIds.size} player${selectedIds.size > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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
        .then((players) => {
          if (isActive) setBulkLinkResults(players);
        })
        .catch((err) => {
          console.error(err);
          if (isActive) showSnack('Failed to search player profiles', 'error');
        })
        .finally(() => {
          if (isActive) setBulkLinkLoading(false);
        });
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
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
    } catch (err) {
      console.error(err);
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

  const resetImportState = () => {
    setImportDialogOpen(false);
    setImportFileName('');
    setImportValidation(null);
    setIncludeWarningRows(false);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const handleCsvFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse<ParticipantImportRowInput>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const validation = validateParticipantImportRows(
          results.data,
          participants,
          results.meta.fields ?? []
        );
        setImportFileName(file.name);
        setImportValidation(validation);
        setIncludeWarningRows(false);
        setImportDialogOpen(true);
      },
      error: (parseError) => {
        console.error(parseError);
        showSnack('Failed to parse CSV file', 'error');
      },
    });
  };

  const handleImportCsv = async () => {
    if (!importValidation) {
      return;
    }

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
        (maxSeed, participant) => Math.max(maxSeed, participant.seed ?? 0),
        0
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
          seed: allRowsHaveSeeds
            ? row.normalized.seed
            : currentMaxSeed + index + 1,
        }))
      );

      if (allRowsHaveSeeds) {
        const refreshedParticipants = await getParticipants(tournamentId);
        const orderedIds = [...refreshedParticipants]
          .sort((left, right) => {
            const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
            const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;
            if (leftSeed !== rightSeed) {
              return leftSeed - rightSeed;
            }
            return left.created_at.localeCompare(right.created_at);
          })
          .map((participant) => participant.id);

        await reseedParticipants(tournamentId, orderedIds);
      }

      await fetchData();
      resetImportState();
      showSnack(
        `${rowsToImport.length} participant${rowsToImport.length === 1 ? '' : 's'} imported`
      );
    } catch (importError) {
      console.error(importError);
      showSnack('Failed to import participants', 'error');
    } finally {
      setImportSubmitting(false);
    }
  };

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
    if (!identityDialog.participant) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      setIdentityLoading(true);
      void getPlayers(identityDialog.query, 12)
        .then((players) => {
          if (!isActive) {
            return;
          }
          setIdentityResults(players);
        })
        .catch((searchError) => {
          console.error(searchError);
          if (isActive) {
            showSnack('Failed to search player profiles', 'error');
          }
        })
        .finally(() => {
          if (isActive) {
            setIdentityLoading(false);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [identityDialog.participant, identityDialog.query, showSnack]);

  const handleRelinkPlayer = async () => {
    if (!identityDialog.participant || !identityDialog.selectedPlayerId) {
      return;
    }

    try {
      setIdentitySubmitting(true);
      await relinkParticipantToPlayer(identityDialog.participant.id, identityDialog.selectedPlayerId);
      await fetchData();
      closeIdentityDialog();
      showSnack('Participant identity updated');
    } catch (relinkError) {
      console.error(relinkError);
      showSnack('Failed to relink participant', 'error');
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const handleMergePlayers = async () => {
    const currentPlayerId = identityDialog.participant?.player_id;
    const selectedPlayerId = identityDialog.selectedPlayerId;

    if (!currentPlayerId || !selectedPlayerId || currentPlayerId === selectedPlayerId) {
      return;
    }

    try {
      setIdentitySubmitting(true);
      await mergePlayerRecords(currentPlayerId, selectedPlayerId);
      await fetchData();
      closeIdentityDialog();
      showSnack('Player records merged');
    } catch (mergeError) {
      console.error(mergeError);
      showSnack('Failed to merge player records', 'error');
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const selectIdentityTarget = useCallback((playerId: string) => {
    setIdentityDialog((current) => ({ ...current, selectedPlayerId: playerId }));
    setIdentityMergeQueue((current) => {
      if (!current.has(playerId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
  }, []);

  const toggleIdentityMergeQueue = useCallback((playerId: string, checked: boolean) => {
    setIdentityMergeQueue((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  }, []);

  const handleMergeQueuedPlayers = async () => {
    const targetPlayerId = identityDialog.selectedPlayerId;
    const sourcePlayerIds = Array.from(identityMergeQueue).filter((playerId) => playerId !== targetPlayerId);
    let mergedCount = 0;

    if (!targetPlayerId || sourcePlayerIds.length === 0) {
      return;
    }

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
    } catch (mergeError) {
      console.error(mergeError);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = participants.findIndex((p) => p.id === active.id);
    const newIndex = participants.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the array
    const reordered = [...participants];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Update seed numbers
    const withNewSeeds = reordered.map((p, idx) => ({ ...p, seed: idx + 1 }));
    setParticipants(withNewSeeds);

    // Persist
    const newOrderedIds = withNewSeeds.map((p) => p.id);
    try {
      await reseedParticipants(tournamentId, newOrderedIds);
      showSnack('Seed order updated');
    } catch (err) {
      console.error(err);
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

  const participantIds = useMemo(
    () => visibleParticipants.map((p) => p.id),
    [visibleParticipants]
  );
  const importableRows = useMemo(
    () => getImportableParticipantRows(importValidation?.rows ?? [], includeWarningRows),
    [importValidation, includeWarningRows]
  );
  const warningRowCount = useMemo(
    () => importValidation?.rows.filter((row) => row.warnings.length > 0 && row.errors.length === 0).length ?? 0,
    [importValidation]
  );
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

    if (currentIdentityPlayer) {
      players.set(currentIdentityPlayer.id, currentIdentityPlayer);
    }

    duplicateSuggestions.forEach((player) => {
      players.set(player.id, player);
    });

    identityResults.forEach((player) => {
      players.set(player.id, player);
    });

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
        if (player.id !== identityDialog.selectedPlayerId) {
          next.add(player.id);
        }
      });
      return next;
    });
  }, [duplicateSuggestions, identityDialog.selectedPlayerId]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(visibleParticipants.map((p) => p.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [visibleParticipants]
  );

  const allVisibleSelected = visibleParticipants.length > 0 && visibleParticipants.every((p) => selectedIds.has(p.id));
  const someVisibleSelected = visibleParticipants.some((p) => selectedIds.has(p.id));

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
          disabled={participants.length < 2 || reorderMode}
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
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{
            borderColor: BORDER,
            color: '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: GOLD, color: GOLD },
          }}
        >
          Import CSV
          <input
            ref={importFileInputRef}
            hidden
            accept=".csv,text/csv"
            type="file"
            onChange={handleCsvFileSelected}
          />
        </Button>
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
        <Button
          variant={reorderMode ? 'contained' : 'outlined'}
          startIcon={<SwapVertIcon />}
          onClick={() => setReorderMode((prev) => !prev)}
          disabled={participants.length < 2}
          sx={{
            borderColor: reorderMode ? GOLD : BORDER,
            bgcolor: reorderMode ? GOLD : 'transparent',
            color: reorderMode ? BG_DARK : '#f5f5f0',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: GOLD,
              bgcolor: reorderMode ? '#c9a030' : 'rgba(212,175,55,0.08)',
              color: reorderMode ? BG_DARK : GOLD,
            },
            '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
          }}
        >
          {reorderMode ? 'Done Reordering' : 'Reorder Seeds'}
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

      {participants.length > 0 && !reorderMode && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255,255,255,0.02)',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25,
            flexWrap: 'wrap',
          }}
        >
          <ManageAccountsIcon sx={{ color: GOLD, fontSize: 20, mt: 0.1 }} />
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '0.9rem' }}>
              Bulk player management
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.35 }}>
              Use the checkboxes on the left side of the table to select multiple rows, then use
              <strong style={{ color: '#f5f5f0' }}> Bulk Link Selected</strong> to connect them all
              to one player profile at once.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(212,175,55,0.08)',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            px: 2,
            py: 1.25,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: '0.85rem', mr: 0.5 }}>
            {selectedIds.size} selected
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircleIcon />}
            onClick={handleBulkCheckIn}
            sx={{
              borderColor: 'rgba(76,175,80,0.4)',
              color: '#81c784',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              '&:hover': { borderColor: '#81c784', bgcolor: 'rgba(76,175,80,0.08)' },
            }}
          >
            Check In
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleBulkUncheck}
            sx={{
              borderColor: BORDER,
              color: '#f5f5f0',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              '&:hover': { borderColor: '#ef5350', color: '#ef9a9a' },
            }}
          >
            Uncheck
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
            disabled={submitting}
            sx={{
              borderColor: 'rgba(239,83,80,0.4)',
              color: '#ef9a9a',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
            }}
          >
            {submitting ? 'Removing...' : 'Delete'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ManageAccountsIcon />}
            onClick={openBulkLinkDialog}
            sx={{
              borderColor: BORDER,
              color: GOLD,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              '&:hover': { borderColor: GOLD, bgcolor: 'rgba(212,175,55,0.08)' },
            }}
          >
            Bulk Link to Player
          </Button>
          <Box sx={{ flex: 1 }} />
          <IconButton
            size="small"
            onClick={() => setSelectedIds(new Set())}
            sx={{ color: 'text.secondary', '&:hover': { color: '#f5f5f0' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

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
          {reorderMode && (
            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: 'rgba(212,175,55,0.06)',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <SwapVertIcon sx={{ fontSize: 16, color: GOLD }} />
              <Typography variant="caption" sx={{ color: GOLD, fontWeight: 600, fontSize: '0.75rem' }}>
                Drag rows to reorder seeds
              </Typography>
            </Box>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={participantIds} strategy={verticalListSortingStrategy}>
              <TableContainer sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow
                      sx={{
                        '& .MuiTableCell-head': {
                          bgcolor: '#0f0f0f',
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
                      {reorderMode && <TableCell sx={{ width: 40, px: 0.5 }} />}
                      {!reorderMode && (
                        <TableCell sx={{ width: 44, px: 0.5 }}>
                          <Checkbox
                            checked={allVisibleSelected}
                            indeterminate={someVisibleSelected && !allVisibleSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            size="small"
                            sx={{
                              color: 'rgba(255,255,255,0.25)',
                              '&.Mui-checked': { color: GOLD },
                              '&.MuiCheckbox-indeterminate': { color: GOLD },
                              p: 0.5,
                            }}
                          />
                        </TableCell>
                      )}
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
                      <SortableRow
                        key={p.id}
                        participant={p}
                        linkedPlayer={p.player_id ? linkedPlayers[p.player_id] ?? null : null}
                        isMobile={isMobile}
                        reorderMode={reorderMode}
                        selected={selectedIds.has(p.id)}
                        onSelect={handleSelectOne}
                        onEditOpen={handleEditOpen}
                        onDeleteConfirm={setDeleteConfirmId}
                        onToggleCheckIn={handleToggleCheckIn}
                        onManageIdentity={openIdentityDialog}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SortableContext>
          </DndContext>
        </Paper>
      )}

      {/* Add Player Dialog */}
      <Dialog
        open={addOpen}
        onClose={handleAddClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Add Player
        </DialogTitle>
        <DialogContent {...DIALOG_SCROLL_CONTAIN_PROPS} sx={DIALOG_CONTENT_SX}>
          {renderForm(false)}
        </DialogContent>
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
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Edit Player
        </DialogTitle>
        <DialogContent {...DIALOG_SCROLL_CONTAIN_PROPS} sx={DIALOG_CONTENT_SX}>
          {renderForm(true)}
        </DialogContent>
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

      <Dialog
        open={importDialogOpen}
        onClose={resetImportState}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: DIALOG_PAPER_SX }}
      >
        <DialogTitle sx={{ color: GOLD, fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
          Import Players from CSV
        </DialogTitle>
        <DialogContent
          {...DIALOG_SCROLL_CONTAIN_PROPS}
          sx={{ ...DIALOG_CONTENT_SX, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Accepted headers: <strong>name</strong> required, plus optional <strong>email</strong>,{' '}
            <strong>phone</strong>, <strong>handicap</strong>, <strong>seed</strong>, <strong>notes</strong>,
            and <strong>checked_in</strong>.
          </DialogContentText>

          {importFileName && (
            <Typography sx={{ color: '#f5f5f0', fontWeight: 600, fontSize: '0.9rem' }}>
              File: {importFileName}
            </Typography>
          )}

          {importValidation?.unsupportedHeaders.length ? (
            <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#f5f5f0' }}>
              Unsupported headers: {importValidation.unsupportedHeaders.join(', ')}
            </Alert>
          ) : null}

          {importValidation && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${importValidation.rows.length} rows parsed`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#f5f5f0', fontWeight: 600 }}
              />
              <Chip
                label={`${importableRows.length} ready to import`}
                size="small"
                sx={{ bgcolor: 'rgba(57,168,122,0.12)', color: '#81c784', fontWeight: 600 }}
              />
              <Chip
                label={`${importValidation.rows.filter((row) => row.errors.length > 0).length} blocked`}
                size="small"
                sx={{ bgcolor: 'rgba(239,83,80,0.12)', color: '#ef9a9a', fontWeight: 600 }}
              />
            </Box>
          )}

          {warningRowCount > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeWarningRows}
                  onChange={(event) => setIncludeWarningRows(event.target.checked)}
                  sx={{
                    color: GOLD,
                    '&.Mui-checked': { color: GOLD },
                  }}
                />
              }
              label={`Include ${warningRowCount} warning row${warningRowCount === 1 ? '' : 's'} instead of skipping them`}
              sx={{ color: '#d7d7d2', mt: -1 }}
            />
          )}

          {importValidation?.rows.length ? (
            <TableContainer
              {...DIALOG_SCROLL_CONTAIN_PROPS}
              sx={{
                border: `1px solid ${BORDER}`,
                borderRadius: 2,
                maxHeight: 360,
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Row', 'Name', 'Email / Phone', 'Seed', 'Status'].map((label) => (
                      <TableCell
                        key={label}
                        sx={{
                          bgcolor: '#0f0f0f',
                          color: GOLD,
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importValidation.rows.map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.normalized.name}`}>
                      <TableCell sx={{ color: 'text.secondary' }}>{row.rowNumber}</TableCell>
                      <TableCell sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                        {row.normalized.name || 'Missing name'}
                      </TableCell>
                      <TableCell sx={{ color: '#d7d7d2', fontSize: '0.8rem' }}>
                        {[row.normalized.email, row.normalized.phone].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell sx={{ color: '#d7d7d2' }}>
                        {row.normalized.seed ?? 'Append'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {row.errors.map((message) => (
                            <Chip
                              key={`error-${row.rowNumber}-${message}`}
                              label={message}
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                bgcolor: 'rgba(239,83,80,0.12)',
                                color: '#ef9a9a',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                          {row.warnings.map((message) => (
                            <Chip
                              key={`warning-${row.rowNumber}-${message}`}
                              label={message}
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                bgcolor: 'rgba(255,193,7,0.12)',
                                color: '#ffda6a',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                          {row.errors.length === 0 && row.warnings.length === 0 && (
                            <Chip
                              label="Ready"
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                bgcolor: 'rgba(57,168,122,0.12)',
                                color: '#81c784',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>
              No rows were parsed from this CSV.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={resetImportState} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleImportCsv}
            variant="contained"
            disabled={
              importSubmitting ||
              !importValidation ||
              importValidation.unsupportedHeaders.length > 0 ||
              importableRows.length === 0
            }
            sx={{
              bgcolor: GOLD,
              color: BG_DARK,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#c9a030' },
              '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(5,5,5,0.5)' },
            }}
          >
            {importSubmitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : 'Import Players'}
          </Button>
        </DialogActions>
      </Dialog>

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
                              {[player.primary_email, player.primary_phone].filter(Boolean).join(' • ') || 'No contact info'}
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
                          {[player.primary_email, player.primary_phone].filter(Boolean).join(' • ') || 'No contact info'}
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
