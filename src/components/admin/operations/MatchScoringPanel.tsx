'use client';

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import TableBarIcon from '@mui/icons-material/TableBar';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import SportsIcon from '@mui/icons-material/Sports';
import PendingIcon from '@mui/icons-material/PendingActions';
import type { Match, MatchWithPlayers } from '@/lib/tournament-engine/types';
import { formatMatchDuration } from '@/lib/match-formatting';
import { getRaceToExamples } from '@/lib/match-operations';

// ============================================================
// Helpers (moved from operations page)
// ============================================================

const assignmentStatusOrder: Record<Match['status'], number> = {
  in_progress: 0,
  ready: 1,
  pending: 2,
  completed: 3,
  bye: 4,
};

function getAssignmentStatusChipStyles(status: Match['status']) {
  switch (status) {
    case 'in_progress':
      return {
        label: 'Live',
        sx: {
          bgcolor: 'rgba(66,165,245,0.15)',
          color: '#42a5f5',
        },
      };
    case 'ready':
      return {
        label: 'Ready',
        sx: {
          bgcolor: 'rgba(212,175,55,0.15)',
          color: '#D4AF37',
        },
      };
    case 'pending':
      return {
        label: 'Pending',
        sx: {
          bgcolor: 'rgba(255,255,255,0.08)',
          color: '#c9c9c3',
        },
      };
    case 'completed':
      return {
        label: 'Done',
        sx: {
          bgcolor: 'rgba(102,187,106,0.15)',
          color: '#66bb6a',
        },
      };
    default:
      return {
        label: status,
        sx: {
          bgcolor: 'rgba(255,255,255,0.08)',
          color: '#c9c9c3',
        },
      };
  }
}

function formatAssignmentPlayers(match: MatchWithPlayers) {
  return `${match.player1?.name ?? 'TBD'} vs ${match.player2?.name ?? 'TBD'}`;
}

// ============================================================
// Props
// ============================================================

export interface MatchScoringPanelProps {
  matchesWithPlayers: MatchWithPlayers[];
  raceTo: number;
  roundNameMap: Map<string, string>;
  bracketGenerated: boolean;

  // Table assignment
  tableInputs: Record<string, string>;
  onTableInputChange: (matchId: string, value: string) => void;
  onAssignTable: (matchId: string) => void;

  // Score inputs
  scoreInputs: Record<string, { p1: string; p2: string }>;
  onScoreInputChange: (matchId: string, field: 'p1' | 'p2', value: string) => void;

  // Actions
  onStartMatch: (match: MatchWithPlayers) => void;
  onReportResult: (match: MatchWithPlayers) => void;
  onOpenCorrectDialog: (match: MatchWithPlayers) => void;

  actionLoading: string | null;
}

// ============================================================
// Component
// ============================================================

export default function MatchScoringPanel({
  matchesWithPlayers,
  raceTo,
  roundNameMap,
  bracketGenerated,
  tableInputs,
  onTableInputChange,
  onAssignTable,
  scoreInputs,
  onScoreInputChange,
  onStartMatch,
  onReportResult,
  onOpenCorrectDialog,
  actionLoading,
}: MatchScoringPanelProps) {
  // Categorize matches
  const readyMatches = matchesWithPlayers.filter((m) => m.status === 'ready');
  const activeMatches = matchesWithPlayers.filter((m) => m.status === 'in_progress');
  const assignedTableMatches = [...matchesWithPlayers]
    .filter(
      (m) =>
        m.table_number !== null &&
        m.status !== 'bye'
    )
    .sort((left, right) => {
      const leftTable = left.table_number ?? Number.MAX_SAFE_INTEGER;
      const rightTable = right.table_number ?? Number.MAX_SAFE_INTEGER;

      if (leftTable !== rightTable) {
        return leftTable - rightTable;
      }

      if (assignmentStatusOrder[left.status] !== assignmentStatusOrder[right.status]) {
        return assignmentStatusOrder[left.status] - assignmentStatusOrder[right.status];
      }

      return left.match_number - right.match_number;
    });
  const completedMatches = matchesWithPlayers
    .filter((m) => m.status === 'completed')
    .sort((a, b) => {
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  const readyCount = readyMatches.length;
  const inProgressCount = activeMatches.length;
  const completedCount = matchesWithPlayers.filter((m) => m.status === 'completed').length;

  if (!bracketGenerated) {
    return null;
  }

  return (
    <>
      {/* Table Assignments */}
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          mb: 2.5,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TableBarIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: '#f5f5f0', fontSize: '0.95rem' }}
          >
            Table Assignments
          </Typography>
        </Box>
        <Typography sx={{ color: '#a0a0a0', fontSize: '0.82rem', mb: 2 }}>
          Stations can control only matches on their exact table, and only after those matches
          reach Ready or In Progress.
        </Typography>

        {assignedTableMatches.length === 0 ? (
          <Typography sx={{ color: '#a0a0a0', fontSize: '0.82rem' }}>
            No matches have a table assignment yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {assignedTableMatches.map((match) => {
              const statusChip = getAssignmentStatusChipStyles(match.status);

              return (
                <Box
                  key={match.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(212,175,55,0.08)',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '0.88rem' }}>
                      Table {match.table_number} · Match #{match.match_number}
                    </Typography>
                    <Typography sx={{ color: '#d7d7d2', fontSize: '0.82rem' }}>
                      {formatAssignmentPlayers(match)}
                    </Typography>
                    <Typography sx={{ color: '#8f8f8f', fontSize: '0.72rem' }}>
                      {roundNameMap.get(match.round_id) ?? 'Round pending'}
                    </Typography>
                  </Box>

                  <Chip
                    label={statusChip.label}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      ...statusChip.sx,
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Three Columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Ready Matches */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PendingIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#D4AF37', fontSize: '0.9rem' }}>
              Ready ({readyCount})
            </Typography>
          </Box>

          {readyMatches.length === 0 && (
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                No matches ready
              </Typography>
            </Paper>
          )}

          {readyMatches.map((match) => (
            <Paper
              key={match.id}
              elevation={0}
              sx={{
                p: 2,
                mb: 1.5,
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212,175,55,0.12)',
                borderRadius: 1.5,
              }}
            >
              {/* Match header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip
                    label="Ready"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                  />
                  {match.table_number && (
                    <Chip
                      label={`Table ${match.table_number}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(212,175,55,0.16)',
                        color: '#D4AF37',
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Players */}
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                {match.player1?.name ?? 'TBD'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>vs</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem', mb: 1.5 }}>
                {match.player2?.name ?? 'TBD'}
              </Typography>

              {/* Table assignment */}
              {match.table_number ? (
                <Typography variant="caption" sx={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <TableBarIcon sx={{ fontSize: 14 }} /> Table {match.table_number}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Table #"
                    value={tableInputs[match.id] ?? ''}
                    onChange={(e) => onTableInputChange(match.id, e.target.value)}
                    slotProps={{ htmlInput: { min: 1, style: { padding: '6px 8px', fontSize: '0.8rem' } } }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#050505',
                        '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                        '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                      },
                      '& input': { color: '#f5f5f0' },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onAssignTable(match.id)}
                    disabled={actionLoading === match.id}
                    sx={{ color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 1, px: 1 }}
                  >
                    <TableBarIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}

              {!match.table_number && (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: '#a0a0a0', fontSize: '0.72rem', mb: 1.25 }}
                >
                  The entered table is only saved after you click the table button or start the
                  match.
                </Typography>
              )}

              {/* Start button */}
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#050505' }} /> : <PlayArrowIcon />}
                disabled={actionLoading === match.id}
                onClick={() => onStartMatch(match)}
                sx={{
                  bgcolor: '#D4AF37',
                  color: '#050505',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.75,
                  '&:hover': { bgcolor: '#c5a030' },
                }}
              >
                {match.table_number ? 'Start Match' : 'Assign Table + Start'}
              </Button>
            </Paper>
          ))}
        </Box>

        {/* Active Matches */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SportsIcon sx={{ color: '#42a5f5', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#42a5f5', fontSize: '0.9rem' }}>
              In Progress ({inProgressCount})
            </Typography>
          </Box>

          {activeMatches.length === 0 && (
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                No active matches
              </Typography>
            </Paper>
          )}

          {activeMatches.map((match) => (
            <Paper
              key={match.id}
              elevation={0}
              sx={{
                p: 2,
                mb: 1.5,
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(66,165,245,0.2)',
                borderRadius: 1.5,
              }}
            >
              {/* Match header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip
                    label="Live"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(66,165,245,0.15)', color: '#42a5f5' }}
                  />
                  {match.table_number && (
                    <Chip
                      label={`Table ${match.table_number}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(212,175,55,0.16)',
                        color: '#D4AF37',
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Table */}
              {match.table_number ? (
                <Typography variant="caption" sx={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <TableBarIcon sx={{ fontSize: 14 }} /> Table {match.table_number}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Table #"
                    value={tableInputs[match.id] ?? ''}
                    onChange={(e) =>
                      onTableInputChange(match.id, e.target.value)
                    }
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        style: { padding: '6px 8px', fontSize: '0.8rem' },
                      },
                    }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#050505',
                        '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(66,165,245,0.4)' },
                        '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                      },
                      '& input': { color: '#f5f5f0' },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onAssignTable(match.id)}
                    disabled={actionLoading === match.id}
                    sx={{
                      color: '#42a5f5',
                      border: '1px solid rgba(66,165,245,0.24)',
                      borderRadius: 1,
                      px: 1,
                    }}
                  >
                    <TableBarIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}

              {/* Player 1 score row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                  {match.player1?.name ?? 'TBD'}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="0"
                  value={scoreInputs[match.id]?.p1 ?? ''}
                  onChange={(e) =>
                    onScoreInputChange(match.id, 'p1', e.target.value)
                  }
                  slotProps={{ htmlInput: { min: 0, max: raceTo, style: { padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center', width: 40 } } }}
                  sx={{
                    width: 56,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#050505',
                      '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                    '& input': { color: '#f5f5f0' },
                  }}
                />
              </Box>

              {/* Player 2 score row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#f5f5f0', fontSize: '0.85rem' }}>
                  {match.player2?.name ?? 'TBD'}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="0"
                  value={scoreInputs[match.id]?.p2 ?? ''}
                  onChange={(e) =>
                    onScoreInputChange(match.id, 'p2', e.target.value)
                  }
                  slotProps={{ htmlInput: { min: 0, max: raceTo, style: { padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center', width: 40 } } }}
                  sx={{
                    width: 56,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#050505',
                      '& fieldset': { borderColor: 'rgba(66,165,245,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                    '& input': { color: '#f5f5f0' },
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mb: 1.5 }}
              >
                Race to {raceTo}. Leave a blank score as 0. Example scores: {getRaceToExamples(raceTo)}.
              </Typography>

              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={actionLoading === match.id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <ScoreboardIcon />}
                disabled={actionLoading === match.id}
                onClick={() => onReportResult(match)}
                sx={{
                  bgcolor: '#42a5f5',
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.75,
                  '&:hover': { bgcolor: '#1e88e5' },
                }}
              >
                Report Result
              </Button>
            </Paper>
          ))}
        </Box>

        {/* Completed Matches */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CheckIcon sx={{ color: '#66bb6a', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#66bb6a', fontSize: '0.9rem' }}>
              Completed ({completedCount})
            </Typography>
          </Box>

          {completedMatches.length === 0 && (
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.06)', borderRadius: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                No completed matches yet
              </Typography>
            </Paper>
          )}

          {completedMatches.map((match) => (
            <Paper
              key={match.id}
              elevation={0}
              sx={{
                p: 2,
                mb: 1.5,
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(102,187,106,0.12)',
                borderRadius: 1.5,
              }}
            >
              {/* Match header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Match #{match.match_number} &middot; {roundNameMap.get(match.round_id) ?? ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip
                    label="Done"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(102,187,106,0.15)', color: '#66bb6a' }}
                  />
                  {match.table_number && (
                    <Chip
                      label={`Table ${match.table_number}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(212,175,55,0.16)',
                        color: '#D4AF37',
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Player 1 */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: match.winner_id === match.player1_id ? 700 : 400,
                    color: match.winner_id === match.player1_id ? '#D4AF37' : '#f5f5f0',
                    fontSize: '0.85rem',
                  }}
                >
                  {match.player1?.name ?? 'TBD'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: match.winner_id === match.player1_id ? '#D4AF37' : 'text.secondary',
                    fontSize: '0.9rem',
                  }}
                >
                  {match.player1_score ?? 0}
                </Typography>
              </Box>

              {/* Player 2 */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: match.winner_id === match.player2_id ? 700 : 400,
                    color: match.winner_id === match.player2_id ? '#D4AF37' : '#f5f5f0',
                    fontSize: '0.85rem',
                  }}
                >
                  {match.player2?.name ?? 'TBD'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: match.winner_id === match.player2_id ? '#D4AF37' : 'text.secondary',
                    fontSize: '0.9rem',
                  }}
                >
                  {match.player2_score ?? 0}
                </Typography>
              </Box>

              {/* Table */}
              {match.table_number && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontSize: '0.7rem' }}>
                  <TableBarIcon sx={{ fontSize: 12 }} /> Table {match.table_number}
                </Typography>
              )}

              {formatMatchDuration(match.started_at, match.completed_at) && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#a0a0a0',
                    display: 'block',
                    mb: 1,
                    fontSize: '0.7rem',
                  }}
                >
                  Duration: {formatMatchDuration(match.started_at, match.completed_at)}
                </Typography>
              )}

              {/* Correct button */}
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={() => onOpenCorrectDialog(match)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.5,
                  '&:hover': { borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' },
                }}
              >
                Correct Result
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    </>
  );
}
