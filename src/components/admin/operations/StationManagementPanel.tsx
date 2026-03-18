'use client';

import Link from 'next/link';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import type { ScorekeeperStationSummary } from '@/lib/tournament-engine/types';

// ============================================================
// Props
// ============================================================

export interface StationManagementPanelProps {
  stations: ScorekeeperStationSummary[];
  stationError: string | null;

  // Create station form
  stationTableInput: string;
  onStationTableInputChange: (value: string) => void;
  stationLabelInput: string;
  onStationLabelInputChange: (value: string) => void;
  onCreateStation: () => void;

  // Station actions
  onStationAction: (
    stationId: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => void;

  // PIN reveal
  revealedPins: Record<string, string>;

  actionLoading: string | null;
}

// ============================================================
// Component
// ============================================================

export default function StationManagementPanel({
  stations,
  stationError,
  stationTableInput,
  onStationTableInputChange,
  stationLabelInput,
  onStationLabelInputChange,
  onCreateStation,
  onStationAction,
  revealedPins,
  actionLoading,
}: StationManagementPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: 2.5,
        bgcolor: '#0a0a0a',
        border: '1px solid rgba(212,175,55,0.12)',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography sx={{ color: '#f5f5f0', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
            Scorekeeper Stations
          </Typography>
          <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem', maxWidth: 720 }}>
            Create one station per table. PINs are hashed server-side, so the only time a PIN can
            be shown again is immediately after creation or rotation. A station only sees matches
            assigned to that exact table number.
          </Typography>
        </Box>
      </Box>

      {stationError && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            bgcolor: 'rgba(255,167,38,0.1)',
            color: '#ffb74d',
          }}
        >
          {stationError}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '160px 1fr auto' }, gap: 1.25, mb: 2.5 }}>
        <TextField
          size="small"
          label="Table"
          value={stationTableInput}
          onChange={(event) => onStationTableInputChange(event.target.value)}
          inputProps={{ inputMode: 'numeric' }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#f5f5f0',
              '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
              '&:hover fieldset': { borderColor: '#D4AF37' },
              '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
            },
            '& .MuiInputLabel-root': { color: '#a0a0a0' },
          }}
        />
        <TextField
          size="small"
          label="Label (optional)"
          value={stationLabelInput}
          onChange={(event) => onStationLabelInputChange(event.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#f5f5f0',
              '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
              '&:hover fieldset': { borderColor: '#D4AF37' },
              '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
            },
            '& .MuiInputLabel-root': { color: '#a0a0a0' },
          }}
        />
        <Button
          variant="contained"
          onClick={() => void onCreateStation()}
          disabled={Boolean(actionLoading?.startsWith('station-create-'))}
          sx={{
            bgcolor: '#D4AF37',
            color: '#050505',
            fontWeight: 800,
            textTransform: 'none',
            '&:hover': { bgcolor: '#e0bb53' },
          }}
        >
          Create / Rotate
        </Button>
      </Box>

      {stations.length === 0 ? (
        <Typography sx={{ color: '#8f8f8f', fontSize: '0.85rem' }}>
          No scorekeeper stations yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {stations.map((station) => (
            <Box
              key={station.id}
              sx={{
                p: 1.5,
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(255,255,255,0.02)',
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ color: '#f5f5f0', fontWeight: 700 }}>
                    {station.label || `Table ${station.table_number}`}
                  </Typography>
                  <Typography sx={{ color: '#8f8f8f', fontSize: '0.82rem', mt: 0.35 }}>
                    /scorekeeper/{station.id}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={Link}
                    href={`/scorekeeper/${station.id}`}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 700 }}
                  >
                    Open Station
                  </Button>
                  <Button
                    size="small"
                    startIcon={<VpnKeyIcon />}
                    onClick={() =>
                      void onStationAction(
                        station.id,
                        { action: 'rotate' },
                        `PIN rotated for table ${station.table_number}`
                      )
                    }
                    sx={{ color: '#D4AF37', textTransform: 'none', fontWeight: 700 }}
                  >
                    Rotate PIN
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      void onStationAction(
                        station.id,
                        { action: 'set-active', active: !station.active },
                        station.active ? 'Station deactivated' : 'Station reactivated'
                      )
                    }
                    sx={{
                      color: station.active ? '#ef9a9a' : '#81c784',
                      textTransform: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {station.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </Box>
              </Box>

              {revealedPins[station.id] && (
                <Typography sx={{ color: '#D4AF37', fontSize: '0.85rem', mt: 1 }}>
                  Current visible PIN: <strong>{revealedPins[station.id]}</strong>
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
