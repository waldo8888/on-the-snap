'use client';

import { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Checkbox,
  Switch,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
import type { Participant, Player } from '@/lib/tournament-engine/types';
import { GOLD, BG_CARD, BORDER } from './shared';

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
// ParticipantTable Component
// ============================================================

export interface ParticipantTableProps {
  participants: Participant[];
  visibleParticipants: Participant[];
  linkedPlayers: Record<string, Player>;
  isMobile: boolean;
  reorderMode: boolean;
  selectedIds: Set<string>;
  submitting: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEditOpen: (p: Participant) => void;
  onDeleteConfirm: (id: string) => void;
  onToggleCheckIn: (p: Participant) => void;
  onManageIdentity: (p: Participant) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAddOpen: () => void;
  onBulkCheckIn: () => void;
  onBulkUncheck: () => void;
  onBulkDelete: () => void;
  onBulkLinkOpen: () => void;
  onClearSelection: () => void;
}

export default function ParticipantTable({
  participants,
  visibleParticipants,
  linkedPlayers,
  isMobile,
  reorderMode,
  selectedIds,
  submitting,
  searchQuery,
  onSearchQueryChange,
  onSelectOne,
  onSelectAll,
  onEditOpen,
  onDeleteConfirm,
  onToggleCheckIn,
  onManageIdentity,
  onDragEnd,
  onAddOpen,
  onBulkCheckIn,
  onBulkUncheck,
  onBulkDelete,
  onBulkLinkOpen,
  onClearSelection,
}: ParticipantTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const participantIds = useMemo(
    () => visibleParticipants.map((p) => p.id),
    [visibleParticipants]
  );

  const allVisibleSelected = visibleParticipants.length > 0 && visibleParticipants.every((p) => selectedIds.has(p.id));
  const someVisibleSelected = visibleParticipants.some((p) => selectedIds.has(p.id));

  return (
    <>
      {/* Search */}
      <TextField
        size="small"
        placeholder="Search players"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        sx={{
          minWidth: { xs: '100%', sm: 220 },
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#050505',
            color: '#f5f5f0',
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: GOLD },
            '&.Mui-focused fieldset': { borderColor: GOLD },
          },
        }}
      />

      {/* Bulk management hint */}
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
            onClick={onBulkCheckIn}
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
            onClick={onBulkUncheck}
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
            onClick={onBulkDelete}
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
            onClick={onBulkLinkOpen}
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
            onClick={onClearSelection}
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
            onClick={onAddOpen}
            sx={{
              bgcolor: GOLD,
              color: '#050505',
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
            onClick={() => onSearchQueryChange('')}
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
            onDragEnd={onDragEnd}
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
                            onChange={(e) => onSelectAll(e.target.checked)}
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
                        onSelect={onSelectOne}
                        onEditOpen={onEditOpen}
                        onDeleteConfirm={onDeleteConfirm}
                        onToggleCheckIn={onToggleCheckIn}
                        onManageIdentity={onManageIdentity}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SortableContext>
          </DndContext>
        </Paper>
      )}
    </>
  );
}
