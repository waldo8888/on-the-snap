'use client';

import { useMemo, useRef, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Papa from 'papaparse';
import type { Participant } from '@/lib/tournament-engine/types';
import {
  getImportableParticipantRows,
  validateParticipantImportRows,
  type ParticipantImportRowInput,
  type ParticipantImportValidationResult,
} from '@/lib/participant-import';
import {
  GOLD,
  BG_DARK,
  BORDER,
  DIALOG_PAPER_SX,
  DIALOG_CONTENT_SX,
  DIALOG_SCROLL_CONTAIN_PROPS,
} from './shared';

export interface ImportParticipantsDialogProps {
  open: boolean;
  fileName: string;
  validation: ParticipantImportValidationResult | null;
  includeWarningRows: boolean;
  submitting: boolean;
  onOpen: (
    fileName: string,
    validation: ParticipantImportValidationResult,
  ) => void;
  onClose: () => void;
  onImport: () => void;
  onIncludeWarningRowsChange: (checked: boolean) => void;
  participants: Participant[];
  showSnack: (message: string, severity?: 'success' | 'error') => void;
}

export default function ImportParticipantsDialog({
  open,
  fileName,
  validation,
  includeWarningRows,
  submitting,
  onOpen,
  onClose,
  onImport,
  onIncludeWarningRowsChange,
  participants,
  showSnack,
}: ImportParticipantsDialogProps) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const importableRows = useMemo(
    () => getImportableParticipantRows(validation?.rows ?? [], includeWarningRows),
    [validation, includeWarningRows]
  );

  const warningRowCount = useMemo(
    () => validation?.rows.filter((row) => row.warnings.length > 0 && row.errors.length === 0).length ?? 0,
    [validation]
  );

  const handleCsvFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<ParticipantImportRowInput>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const validationResult = validateParticipantImportRows(
          results.data,
          participants,
          results.meta.fields ?? []
        );
        onOpen(file.name, validationResult);
      },
      error: (parseError) => {
        console.error(parseError);
        showSnack('Failed to parse CSV file', 'error');
      },
    });
  };

  const handleClose = () => {
    onClose();
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* File input trigger button (rendered inline in the action bar) */}
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

      {/* Import Preview Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
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

          {fileName && (
            <Typography sx={{ color: '#f5f5f0', fontWeight: 600, fontSize: '0.9rem' }}>
              File: {fileName}
            </Typography>
          )}

          {validation?.unsupportedHeaders.length ? (
            <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#f5f5f0' }}>
              Unsupported headers: {validation.unsupportedHeaders.join(', ')}
            </Alert>
          ) : null}

          {validation && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${validation.rows.length} rows parsed`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#f5f5f0', fontWeight: 600 }}
              />
              <Chip
                label={`${importableRows.length} ready to import`}
                size="small"
                sx={{ bgcolor: 'rgba(57,168,122,0.12)', color: '#81c784', fontWeight: 600 }}
              />
              <Chip
                label={`${validation.rows.filter((row) => row.errors.length > 0).length} blocked`}
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
                  onChange={(event) => onIncludeWarningRowsChange(event.target.checked)}
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

          {validation?.rows.length ? (
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
                  {validation.rows.map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.normalized.name}`}>
                      <TableCell sx={{ color: 'text.secondary' }}>{row.rowNumber}</TableCell>
                      <TableCell sx={{ color: '#f5f5f0', fontWeight: 600 }}>
                        {row.normalized.name || 'Missing name'}
                      </TableCell>
                      <TableCell sx={{ color: '#d7d7d2', fontSize: '0.8rem' }}>
                        {[row.normalized.email, row.normalized.phone].filter(Boolean).join(' / ') || '\u2014'}
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
          <Button onClick={handleClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={onImport}
            variant="contained"
            disabled={
              submitting ||
              !validation ||
              validation.unsupportedHeaders.length > 0 ||
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
            {submitting ? <CircularProgress size={20} sx={{ color: BG_DARK }} /> : 'Import Players'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
