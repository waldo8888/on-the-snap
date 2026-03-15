'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { TournamentWithDetails, Match } from '@/lib/tournament-engine/types';
import {
  generateAndSaveTournamentBracket,
  getEligibleParticipantsForBracket,
  getTournamentById,
} from '@/lib/tournaments';
import MatchDetailDialog from '@/components/tournament/MatchDetailDialog';
import BracketLegend from '@/components/tournament/BracketLegend';
import BracketViewer from '@/components/tournament/BracketViewer';
import RoundRobinTable from '@/components/tournament/RoundRobinTable';
import ZoomableBracketSection from '@/components/tournament/ZoomableBracketSection';
import { downloadBracketSectionsAsPdf, downloadBracketSvgAsPng } from '@/lib/bracket-export';
import { resolveTournamentAdminRouteId } from '@/lib/route-params';

// ============================================================
// Tab Navigation (shared pattern)
// ============================================================

const adminTabs = [
  { label: 'Details', path: '' },
  { label: 'Participants', path: '/participants' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'Operations', path: '/operations' },
];

// ============================================================
// Helpers
// ============================================================

const sideLabel: Record<string, string> = {
  winners: 'Winners Bracket',
  losers: 'Losers Bracket',
  finals: 'Finals',
  round_robin: 'Round Robin',
};

// ============================================================
// Bracket Page
// ============================================================

export default function BracketPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tournamentId = resolveTournamentAdminRouteId(params.id, pathname);

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const winnersSvgRef = useRef<SVGSVGElement | null>(null);
  const losersSvgRef = useRef<SVGSVGElement | null>(null);
  const finalsSvgRef = useRef<SVGSVGElement | null>(null);

  const fetchData = useCallback(async () => {
    if (!tournamentId) {
      setError('Invalid tournament route');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getTournamentById(tournamentId);
      if (!data) {
        setError('Tournament not found');
        return;
      }
      setTournament(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----------------------------------------------------------
  // Bracket Generation
  // ----------------------------------------------------------

  const handleGenerateBracket = async (isRegenerate = false) => {
    if (!tournament) return;

    const eligibleParticipants = getEligibleParticipantsForBracket(tournament);
    if (eligibleParticipants.length < 2) {
      setError(
        tournament.check_in_required
          ? 'Need at least 2 checked-in participants to generate a bracket'
          : 'Need at least 2 participants to generate a bracket'
      );
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const result = await generateAndSaveTournamentBracket(tournamentId);

      setSuccess(isRegenerate ? 'Bracket regenerated successfully' : 'Bracket generated successfully');
      setRegenDialogOpen(false);
      setTournament(result.tournament);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPng = async () => {
    const svg =
      winnersSvgRef.current ?? losersSvgRef.current ?? finalsSvgRef.current;

    if (!svg || !tournament) {
      setError('Bracket export is only available after the native bracket preview renders.');
      return;
    }

    try {
      await downloadBracketSvgAsPng(
        svg,
        `${tournament.title.toLowerCase().replace(/\s+/g, '-')}-bracket.png`
      );
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export bracket PNG');
    }
  };

  const handleExportPdf = async () => {
    if (!tournament) {
      setError('Bracket export is only available after the native bracket preview renders.');
      return;
    }

    const sections = [
      { label: 'Winners Bracket', svg: winnersSvgRef.current },
      { label: 'Losers Bracket', svg: losersSvgRef.current },
      { label: 'Finals', svg: finalsSvgRef.current },
    ].filter((section): section is { label: string; svg: SVGSVGElement } => Boolean(section.svg));

    if (sections.length === 0) {
      setError('Bracket export is only available after the native bracket preview renders.');
      return;
    }

    try {
      await downloadBracketSectionsAsPdf(
        sections,
        `${tournament.title.toLowerCase().replace(/\s+/g, '-')}-bracket.pdf`
      );
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export bracket PDF');
    }
  };

  // ----------------------------------------------------------
  // Render helpers
  // ----------------------------------------------------------

  const bracketGenerated = !!tournament?.bracket_generated_at;
  const participantCount = tournament?.participants?.length ?? 0;
  const eligibleParticipantCount = tournament ? getEligibleParticipantsForBracket(tournament).length : 0;
  const canGenerate = eligibleParticipantCount >= 2 && !bracketGenerated;
  const rounds = tournament?.rounds ?? [];
  const winnersRounds = rounds.filter((round) => round.bracket_side === 'winners');
  const losersRounds = rounds.filter((round) => round.bracket_side === 'losers');
  const finalsRounds = rounds.filter((round) => round.bracket_side === 'finals');
  const allMatches = rounds.flatMap((round) => round.matches ?? []);
  const hasBracketSections =
    winnersRounds.length > 0 || losersRounds.length > 0 || finalsRounds.length > 0;

  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }}>
          Tournament not found
        </Alert>
      </Box>
    );
  }

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
          {tournament.format.replace(/_/g, ' ')} &middot; {tournament.game_type} &middot; Race to {tournament.race_to}
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Tabs
        value={2}
        onChange={(_, val) => {
          const base = `/admin/tournaments/${tournamentId}`;
          router.push(base + adminTabs[val].path);
        }}
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
          '& .Mui-selected': { color: '#D4AF37' },
          '& .MuiTabs-indicator': { backgroundColor: '#D4AF37' },
        }}
      >
        {adminTabs.map((tab) => (
          <Tab key={tab.label} label={tab.label} />
        ))}
      </Tabs>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,83,80,0.1)', color: '#ef5350' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a' }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Bracket Status */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountTreeIcon sx={{ color: bracketGenerated ? '#66bb6a' : '#9e9e9e' }} />
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#f5f5f0' }}>
              Bracket Status
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {bracketGenerated
                ? `Generated on ${new Date(tournament.bracket_generated_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                : tournament.check_in_required
                  ? `${participantCount} registered, ${eligibleParticipantCount} checked in — ${eligibleParticipantCount >= 2 ? 'ready to generate' : 'need at least 2 checked-in players'}`
                  : `${participantCount} participant${participantCount !== 1 ? 's' : ''} registered — ${participantCount >= 2 ? 'ready to generate' : 'need at least 2'}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {bracketGenerated && (
            <Button
              component="a"
              href={`/tournaments/${tournament.slug}/bracket`}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              startIcon={<OpenInFullIcon />}
              sx={{
                borderColor: 'rgba(212,175,55,0.24)',
                color: '#D4AF37',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
              }}
            >
              Open Wallboard
            </Button>
          )}

          {bracketGenerated && hasBracketSections && (
            <>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportPng}
                sx={{
                  borderColor: 'rgba(212,175,55,0.24)',
                  color: '#D4AF37',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                }}
              >
                Export PNG
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                onClick={handleExportPdf}
                sx={{
                  borderColor: 'rgba(212,175,55,0.24)',
                  color: '#D4AF37',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.05)' },
                }}
              >
                Export PDF
              </Button>
            </>
          )}

          {canGenerate && (
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={16} sx={{ color: '#050505' }} /> : <AccountTreeIcon />}
              disabled={generating}
              onClick={() => handleGenerateBracket(false)}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#c5a030' },
                '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: '#050505' },
              }}
            >
              {generating ? 'Generating...' : 'Generate Bracket'}
            </Button>
          )}

          {bracketGenerated && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => setRegenDialogOpen(true)}
              sx={{
                borderColor: 'rgba(239,83,80,0.4)',
                color: '#ef5350',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.05)' },
              }}
            >
              Regenerate
            </Button>
          )}
        </Box>
      </Paper>

      {/* Bracket Preview */}
      {bracketGenerated && rounds.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tournament.format === 'round_robin' ? (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  color: '#D4AF37',
                  fontSize: '1rem',
                  mb: 2,
                }}
              >
                {sideLabel.round_robin}
              </Typography>
              <RoundRobinTable
                matches={allMatches}
                participants={tournament.participants ?? []}
              />
            </Paper>
          ) : (
            <>
              <BracketLegend />

              {[
                { key: 'winners', label: sideLabel.winners, rounds: winnersRounds, ref: winnersSvgRef, tone: '#D4AF37' },
                { key: 'losers', label: sideLabel.losers, rounds: losersRounds, ref: losersSvgRef, tone: '#a0a0a0' },
                { key: 'finals', label: sideLabel.finals, rounds: finalsRounds, ref: finalsSvgRef, tone: '#D4AF37' },
              ]
                .filter((section) => section.rounds.length > 0)
                .map((section) => (
                  <Paper
                    key={section.key}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      bgcolor: '#0a0a0a',
                      border: '1px solid rgba(212,175,55,0.1)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'var(--font-playfair), serif',
                        fontWeight: 700,
                        color: section.tone,
                        fontSize: '1rem',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <AccountTreeIcon sx={{ fontSize: 20 }} />
                      {section.label}
                    </Typography>

                    <ZoomableBracketSection>
                      <BracketViewer
                        ref={section.ref}
                        rounds={section.rounds}
                        participants={tournament.participants ?? []}
                        bracketSide={section.key as 'winners' | 'losers' | 'finals'}
                        onMatchClick={setSelectedMatch}
                      />
                    </ZoomableBracketSection>
                  </Paper>
                ))}
            </>
          )}
        </Box>
      )}

      {/* No bracket yet */}
      {!bracketGenerated && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.1)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <AccountTreeIcon sx={{ fontSize: 56, color: 'rgba(212,175,55,0.2)', mb: 2 }} />
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#f5f5f0', mb: 1 }}>
            No Bracket Generated
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
            {participantCount < 2
              ? 'Add at least 2 participants to the tournament before generating a bracket.'
              : 'Click "Generate Bracket" above to create the bracket and start seeding matches.'}
          </Typography>
        </Paper>
      )}

      {/* Match Detail Dialog */}
      <MatchDetailDialog
        match={selectedMatch}
        participants={tournament?.participants ?? []}
        roundName={
          selectedMatch
            ? tournament?.rounds?.find((r) =>
                (r.matches ?? []).some((m) => m.id === selectedMatch.id)
              )?.name ?? undefined
            : undefined
        }
        onClose={() => setSelectedMatch(null)}
      />

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={regenDialogOpen}
        onClose={() => setRegenDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 2,
            maxWidth: 440,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef5350', fontWeight: 700 }}>
          <WarningAmberIcon />
          Regenerate Bracket
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            This will delete all current bracket data, match results, and scores. A new bracket will be generated with fresh seeding. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setRegenDialogOpen(false)}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <RefreshIcon />}
            disabled={generating}
            onClick={() => handleGenerateBracket(true)}
            sx={{
              bgcolor: '#ef5350',
              color: '#fff',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#e53935' },
            }}
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
