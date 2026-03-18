'use client';

import { Box, Typography, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { TournamentWithDetails, TournamentStatus } from '@/lib/tournament-engine/types';

const GOLD = '#D4AF37';

interface StepConfig {
  key: string;
  label: string;
  description: string;
  statuses: TournamentStatus[];
  requirementsFn: (t: TournamentWithDetails) => string[];
  actionLabel?: string | ((t: TournamentWithDetails) => string);
  nextStatus?: TournamentStatus | ((t: TournamentWithDetails) => TournamentStatus | undefined);
}

const STEPS: StepConfig[] = [
  {
    key: 'setup',
    label: 'Setup',
    description: 'Configure tournament settings',
    statuses: ['draft'],
    requirementsFn: (t) => {
      const issues: string[] = [];
      if (!t.title) issues.push('Title required');
      if (!t.tournament_start_at) issues.push('Start date required');
      return issues;
    },
    actionLabel: 'Open Registration',
    nextStatus: 'open',
  },
  {
    key: 'registration',
    label: 'Registration',
    description: 'Participants joining',
    statuses: ['open'],
    requirementsFn: (t) => {
      const issues: string[] = [];
      if (!t.published) issues.push('Tournament must be published');
      const count = t.participants?.length ?? 0;
      if (count < 2) issues.push('Need at least 2 participants');
      return issues;
    },
    actionLabel: t => t.check_in_required ? 'Open Check-in' : 'Generate Bracket',
    nextStatus: t => t.check_in_required ? 'check_in' : undefined,
  },
  {
    key: 'check_in',
    label: 'Check-in',
    description: 'Check in players below, then generate bracket',
    statuses: ['check_in'],
    requirementsFn: (t) => {
      const checked = t.participants?.filter((p) => p.checked_in).length ?? 0;
      if (checked < 2) return ['Need at least 2 checked-in participants'];
      return [];
    },
    actionLabel: 'Generate Bracket',
  },
  {
    key: 'bracket',
    label: 'Bracket',
    description: 'Generate bracket',
    statuses: [], // Virtual step - bracket is generated while in open/check_in
    requirementsFn: (t) => {
      if (!t.bracket_generated_at) return ['Bracket not yet generated'];
      return [];
    },
    actionLabel: 'Start Tournament',
    nextStatus: 'live',
  },
  {
    key: 'live',
    label: 'Live',
    description: 'Tournament in progress',
    statuses: ['live'],
    requirementsFn: () => [],
    actionLabel: 'Complete Tournament',
    nextStatus: 'completed',
  },
  {
    key: 'complete',
    label: 'Complete',
    description: 'Results finalized',
    statuses: ['completed'],
    requirementsFn: () => [],
  },
];

function getActiveStepIndex(tournament: TournamentWithDetails): number {
  const status = tournament.status;

  if (status === 'cancelled') return -1;

  if (status === 'draft') return 0;
  if (status === 'open') {
    // If bracket is generated, we're at the bracket step
    if (tournament.bracket_generated_at) return 3;
    return 1;
  }
  if (status === 'check_in') {
    if (tournament.bracket_generated_at) return 3;
    return 2;
  }
  if (status === 'live') return 4;
  if (status === 'completed') return 5;

  return 0;
}

interface TournamentStepperProps {
  tournament: TournamentWithDetails;
  onStatusChange?: (newStatus: TournamentStatus) => void;
  onGenerateBracket?: () => void;
  loading?: boolean;
}

export default function TournamentStepper({
  tournament,
  onStatusChange,
  onGenerateBracket,
  loading = false,
}: TournamentStepperProps) {
  const activeStep = getActiveStepIndex(tournament);
  const isCancelled = tournament.status === 'cancelled';

  if (isCancelled) {
    return (
      <Box sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: 2, p: 2, mb: 3 }}>
        <Chip label="CANCELLED" sx={{ bgcolor: '#d32f2f', color: '#fff', fontWeight: 700 }} />
      </Box>
    );
  }

  // Skip check-in step if not required
  const visibleSteps = tournament.check_in_required
    ? STEPS
    : STEPS.filter((s) => s.key !== 'check_in');

  // Adjust active index for skipped check-in
  const adjustedActive = !tournament.check_in_required && activeStep > 2 ? activeStep - 1 : activeStep;

  return (
    <Box sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: 2, p: 2, mb: 3 }}>
      {/* Step indicators */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, overflowX: 'auto' }}>
        {visibleSteps.map((step, idx) => {
          const adjustedIdx = !tournament.check_in_required && idx >= 2 ? idx + 1 : idx;
          const isCompleted = adjustedIdx < activeStep;
          const isCurrent = adjustedIdx === activeStep;
          const isPending = adjustedIdx > activeStep;

          return (
            <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Step dot/icon */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                {isCompleted ? (
                  <CheckCircleIcon sx={{ color: GOLD, fontSize: 28 }} />
                ) : isCurrent ? (
                  <FiberManualRecordIcon sx={{ color: GOLD, fontSize: 28 }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ color: '#555', fontSize: 28 }} />
                )}
                <Typography
                  sx={{
                    color: isCurrent ? GOLD : isCompleted ? '#ccc' : '#555',
                    fontSize: '0.75rem',
                    fontWeight: isCurrent ? 700 : 500,
                    mt: 0.5,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </Typography>
              </Box>

              {/* Connector line */}
              {idx < visibleSteps.length - 1 && (
                <Box sx={{
                  height: 2,
                  flex: 1,
                  minWidth: 20,
                  bgcolor: isCompleted ? GOLD : '#333',
                  mt: -2,
                }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Current step info and action */}
      {activeStep >= 0 && activeStep < STEPS.length && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ color: '#f5f5f0', fontSize: '0.95rem', fontWeight: 600 }}>
              {STEPS[activeStep].description}
            </Typography>
            {(() => {
              const requirements = STEPS[activeStep].requirementsFn(tournament);
              if (requirements.length === 0) return null;
              return (
                <Box sx={{ mt: 0.5 }}>
                  {requirements.map((req) => (
                    <Typography key={req} sx={{ color: '#d32f2f', fontSize: '0.8rem' }}>
                      &bull; {req}
                    </Typography>
                  ))}
                </Box>
              );
            })()}
          </Box>

          {(() => {
            const step = STEPS[activeStep];
            const requirements = step.requirementsFn(tournament);
            const disabled = requirements.length > 0 || loading;

            // Bracket step needs special handling
            if (step.key === 'bracket' && !tournament.bracket_generated_at) {
              return (
                <Button
                  variant="contained"
                  onClick={onGenerateBracket}
                  disabled={disabled}
                  sx={{
                    bgcolor: GOLD, color: '#000', fontWeight: 700,
                    '&:hover': { bgcolor: '#c5a030' },
                    '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                  }}
                >
                  Generate Bracket
                </Button>
              );
            }

            if (step.key === 'registration' && !tournament.bracket_generated_at) {
              const resolvedLabel = typeof step.actionLabel === 'function'
                ? step.actionLabel(tournament)
                : step.actionLabel;

              if (resolvedLabel === 'Generate Bracket') {
                return (
                  <Button
                    variant="contained"
                    onClick={onGenerateBracket}
                    disabled={disabled}
                    sx={{
                      bgcolor: GOLD, color: '#000', fontWeight: 700,
                      '&:hover': { bgcolor: '#c5a030' },
                      '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                    }}
                  >
                    {resolvedLabel}
                  </Button>
                );
              }

              const resolvedStatus = typeof step.nextStatus === 'function'
                ? step.nextStatus(tournament)
                : step.nextStatus;

              if (resolvedStatus && onStatusChange) {
                return (
                  <Button
                    variant="contained"
                    onClick={() => onStatusChange(resolvedStatus)}
                    disabled={disabled}
                    sx={{
                      bgcolor: GOLD, color: '#000', fontWeight: 700,
                      '&:hover': { bgcolor: '#c5a030' },
                      '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                    }}
                  >
                    {resolvedLabel}
                  </Button>
                );
              }

              return null;
            }

            if (!step.actionLabel || !step.nextStatus) return null;

            const resolvedLabel = typeof step.actionLabel === 'function'
              ? step.actionLabel(tournament)
              : step.actionLabel;
            const resolvedStatus = typeof step.nextStatus === 'function'
              ? step.nextStatus(tournament)
              : step.nextStatus;

            if (!resolvedStatus) return null;

            return (
              <Button
                variant="contained"
                onClick={() => onStatusChange?.(resolvedStatus)}
                disabled={disabled}
                sx={{
                  bgcolor: activeStep === 4 ? '#4caf50' : GOLD,
                  color: activeStep === 4 ? '#fff' : '#000',
                  fontWeight: 700,
                  '&:hover': { bgcolor: activeStep === 4 ? '#388e3c' : '#c5a030' },
                  '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                }}
              >
                {resolvedLabel}
              </Button>
            );
          })()}
        </Box>
      )}
    </Box>
  );
}
