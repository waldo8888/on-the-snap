'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import BracketViewer from '@/components/tournament/BracketViewer';
import RoundRobinTable from '@/components/tournament/RoundRobinTable';
import type {
  TournamentWithDetails,
  Participant,
  Match,
} from '@/lib/tournament-engine/types';

type TabValue = 'overview' | 'bracket' | 'players' | 'results';

interface Props {
  tournament: TournamentWithDetails;
}

function getPlayerName(id: string | null, participants: Participant[]): string {
  if (!id) return 'TBD';
  const p = participants.find((pp) => pp.id === id);
  return p?.name || 'TBD';
}

// ── Overview Tab ──

function OverviewPanel({ tournament }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {tournament.description && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#f5f5f0',
              mb: 2,
              fontSize: '1.05rem',
            }}
          >
            About This Tournament
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: '#a0a0a0',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {tournament.description}
          </Typography>
        </Paper>
      )}

      {tournament.rules && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#f5f5f0',
              mb: 2,
              fontSize: '1.05rem',
            }}
          >
            Rules
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: '#a0a0a0',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {tournament.rules}
          </Typography>
        </Paper>
      )}

      {!tournament.description && !tournament.rules && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', color: '#a0a0a0' }}>
            No additional details available for this tournament.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Bracket Tab ──

function BracketPanel({ tournament }: Props) {
  const rounds = tournament.rounds || [];
  const participants = tournament.participants || [];
  const allMatches = rounds.flatMap((round) => round.matches || []);

  if (rounds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', color: '#a0a0a0' }}>
          Bracket has not been generated yet.
        </Typography>
      </Box>
    );
  }

  if (tournament.format === 'round_robin') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              sx={{
                color: '#D4AF37',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: '1rem',
                mb: 0.5,
              }}
            >
              Live standings
            </Typography>
            <Typography
              sx={{
                color: '#a0a0a0',
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.9rem',
                lineHeight: 1.6,
              }}
            >
              Round robin events use fixtures and standings instead of an elimination tree.
            </Typography>
          </Box>

          <Button
            component={Link}
            href={`/tournaments/${tournament.slug}/bracket`}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInFullIcon />}
            variant="outlined"
            sx={{
              borderColor: 'rgba(212,175,55,0.3)',
              color: '#D4AF37',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212,175,55,0.06)',
              },
            }}
          >
            Open display view
          </Button>
        </Box>

        <RoundRobinTable matches={allMatches} participants={participants} />
      </Box>
    );
  }

  const winnersRounds = rounds.filter((round) => round.bracket_side === 'winners');
  const losersRounds = rounds.filter((round) => round.bracket_side === 'losers');
  const finalsRounds = rounds.filter((round) => round.bracket_side === 'finals');
  const activeMatches = allMatches.filter(
    (match) => match.status === 'ready' || match.status === 'in_progress'
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography
            sx={{
              color: '#D4AF37',
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              fontSize: '1rem',
              mb: 0.5,
            }}
          >
            Native bracket view
          </Typography>
          <Typography
            sx={{
              color: '#a0a0a0',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            Winners, losers, and finals update from your own tournament platform with no Challonge embed.
          </Typography>
        </Box>

        <Button
          component={Link}
          href={`/tournaments/${tournament.slug}/bracket`}
          target="_blank"
          rel="noreferrer"
          startIcon={<OpenInFullIcon />}
          variant="outlined"
          sx={{
            borderColor: 'rgba(212,175,55,0.3)',
            color: '#D4AF37',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#D4AF37',
              bgcolor: 'rgba(212,175,55,0.06)',
            },
          }}
        >
          Open display view
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: '#0d0d0d',
          border: '1px solid rgba(212,175,55,0.12)',
          borderRadius: 2,
        }}
      >
        {tournament.format === 'double_elimination' && (
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#D4AF37',
              mb: 2,
              fontSize: '1rem',
            }}
          >
            Winners Bracket
          </Typography>
        )}

        <BracketViewer rounds={winnersRounds} participants={participants} />
      </Paper>

      {losersRounds.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: '#0d0d0d',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#a0a0a0',
              mb: 2,
              fontSize: '1rem',
            }}
          >
            Losers Bracket
          </Typography>

          <BracketViewer
            rounds={losersRounds}
            participants={participants}
            bracketSide="losers"
          />
        </Paper>
      )}

      {finalsRounds.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: '#0d0d0d',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#D4AF37',
              mb: 2,
              fontSize: '1rem',
            }}
          >
            Finals
          </Typography>

          <BracketViewer
            rounds={finalsRounds}
            participants={participants}
            bracketSide="finals"
          />
        </Paper>
      )}

      {activeMatches.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#f5f5f0',
              mb: 1.5,
              fontSize: '1rem',
            }}
          >
            Active Tables
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activeMatches.slice(0, 6).map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                participants={participants}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function MatchCard({
  match,
  participants,
}: {
  match: Match;
  participants: Participant[];
}) {
  const isActive = match.status === 'in_progress';
  const isComplete = match.status === 'completed';

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2.5,
        py: 1.5,
        bgcolor: isActive ? 'rgba(212,175,55,0.05)' : '#111111',
        border: `1px solid ${isActive ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.7rem',
          color: 'rgba(160,160,160,0.5)',
          fontWeight: 600,
          minWidth: 24,
        }}
      >
        M{match.match_number}
      </Typography>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <PlayerRow
          name={getPlayerName(match.player1_id, participants)}
          score={match.player1_score}
          isWinner={isComplete && match.winner_id === match.player1_id}
        />
        <PlayerRow
          name={getPlayerName(match.player2_id, participants)}
          score={match.player2_score}
          isWinner={isComplete && match.winner_id === match.player2_id}
        />
      </Box>

      {match.table_number && (
        <Chip
          label={`T${match.table_number}`}
          size="small"
          sx={{
            bgcolor: 'rgba(57,168,122,0.1)',
            color: '#39a87a',
            fontSize: '0.65rem',
            fontWeight: 600,
            height: 22,
          }}
        />
      )}

      {isActive && (
        <Chip
          label="LIVE"
          size="small"
          sx={{
            bgcolor: '#D4AF37',
            color: '#111',
            fontWeight: 700,
            fontSize: '0.6rem',
            height: 20,
          }}
        />
      )}
    </Paper>
  );
}

function PlayerRow({
  name,
  score,
  isWinner,
}: {
  name: string;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography
        sx={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.82rem',
          color: isWinner ? '#D4AF37' : name === 'TBD' ? 'rgba(160,160,160,0.4)' : '#f5f5f0',
          fontWeight: isWinner ? 700 : 400,
        }}
      >
        {name}
      </Typography>
      {score !== null && (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.82rem',
            color: isWinner ? '#D4AF37' : '#a0a0a0',
            fontWeight: isWinner ? 700 : 500,
            ml: 2,
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
  );
}

// ── Players Tab ──

function PlayersPanel({ tournament }: Props) {
  const participants = tournament.participants || [];

  if (participants.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', color: '#a0a0a0' }}>
          No players registered yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#111111',
        border: '1px solid rgba(212,175,55,0.12)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {participants.map((p, i) => (
        <Box
          key={p.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5,
            borderBottom:
              i < participants.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            '&:hover': { bgcolor: 'rgba(212,175,55,0.03)' },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.75rem',
              color: 'rgba(160,160,160,0.5)',
              fontWeight: 600,
              minWidth: 28,
              textAlign: 'center',
            }}
          >
            {p.seed || i + 1}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.9rem',
              color: '#f5f5f0',
              fontWeight: 500,
              flex: 1,
            }}
          >
            {p.name}
          </Typography>
          {p.handicap > 0 && (
            <Chip
              label={`HC ${p.handicap}`}
              size="small"
              sx={{
                bgcolor: 'rgba(100,160,255,0.1)',
                color: 'rgba(100,160,255,0.8)',
                fontSize: '0.65rem',
                fontWeight: 600,
                height: 22,
              }}
            />
          )}
        </Box>
      ))}
    </Paper>
  );
}

// ── Results Tab ──

function formatOrdinal(place: number) {
  const remainderTen = place % 10;
  const remainderHundred = place % 100;

  if (remainderTen === 1 && remainderHundred !== 11) return `${place}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${place}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${place}rd`;
  return `${place}th`;
}

function getRecentResultLabel(match: Match, participantId: string) {
  if (match.player1_score === null || match.player2_score === null) return null;
  if (match.player1_id === participantId) return `${match.player1_score} - ${match.player2_score}`;
  if (match.player2_id === participantId) return `${match.player2_score} - ${match.player1_score}`;
  return null;
}

function ResultsPanel({ tournament }: Props) {
  const participants = tournament.participants || [];
  const rounds = tournament.rounds || [];
  const allMatches = rounds.flatMap((r) => r.matches || []);

  if (tournament.status !== 'completed') {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', color: '#a0a0a0' }}>
          Results will be available after the tournament is completed.
        </Typography>
      </Box>
    );
  }

  // Determine final standings for elimination formats
  // Champion is the winner of the last match
  const completedMatches = allMatches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.match_number - a.match_number);

  const finalMatch = completedMatches[0];
  const championId = finalMatch?.winner_id;
  const recentResultMap = new Map<string, string>();

  // Build simple standings: champion first, runner-up second, rest by elimination order
  const standings: { participant: Participant; place: number }[] = [];

  completedMatches.forEach((match) => {
    if (match.player1_id && !recentResultMap.has(match.player1_id)) {
      const label = getRecentResultLabel(match, match.player1_id);
      if (label) recentResultMap.set(match.player1_id, label);
    }
    if (match.player2_id && !recentResultMap.has(match.player2_id)) {
      const label = getRecentResultLabel(match, match.player2_id);
      if (label) recentResultMap.set(match.player2_id, label);
    }
  });

  if (tournament.format === 'round_robin') {
    // Use win count for round robin
    const winMap = new Map<string, number>();
    const ptsMap = new Map<string, number>();
    allMatches.forEach((m) => {
      if (m.status !== 'completed' || !m.winner_id) return;
      winMap.set(m.winner_id, (winMap.get(m.winner_id) || 0) + 1);
      if (m.player1_id) ptsMap.set(m.player1_id, (ptsMap.get(m.player1_id) || 0) + (m.player1_score || 0));
      if (m.player2_id) ptsMap.set(m.player2_id, (ptsMap.get(m.player2_id) || 0) + (m.player2_score || 0));
    });
    const sorted = [...participants].sort(
      (a, b) => (winMap.get(b.id) || 0) - (winMap.get(a.id) || 0) || (ptsMap.get(b.id) || 0) - (ptsMap.get(a.id) || 0)
    );
    sorted.forEach((p, i) => standings.push({ participant: p, place: i + 1 }));
  } else {
    // Elimination: champion + runner-up from final match, then the rest
    if (finalMatch) {
      const champion = participants.find((p) => p.id === championId);
      const runnerUpId =
        finalMatch.player1_id === championId ? finalMatch.player2_id : finalMatch.player1_id;
      const runnerUp = participants.find((p) => p.id === runnerUpId);

      if (champion) standings.push({ participant: champion, place: 1 });
      if (runnerUp) standings.push({ participant: runnerUp, place: 2 });

      // Remaining players by reverse elimination order
      const placed = new Set(standings.map((s) => s.participant.id));
      const eliminatedPlayers: { id: string; matchNum: number }[] = [];

      completedMatches.forEach((m) => {
        if (!m.winner_id) return;
        const loserId = m.player1_id === m.winner_id ? m.player2_id : m.player1_id;
        if (loserId && !placed.has(loserId)) {
          eliminatedPlayers.push({ id: loserId, matchNum: m.match_number });
          placed.add(loserId);
        }
      });

      // Later elimination = higher placing
      eliminatedPlayers.sort((a, b) => b.matchNum - a.matchNum);
      eliminatedPlayers.forEach((ep) => {
        const p = participants.find((pp) => pp.id === ep.id);
        if (p) standings.push({ participant: p, place: standings.length + 1 });
      });

      // Anyone not in a match
      participants.forEach((p) => {
        if (!placed.has(p.id)) {
          standings.push({ participant: p, place: standings.length + 1 });
        }
      });
    }
  }

  const podium = standings.slice(0, 3);
  const remainingStandings = standings.slice(3);
  const podiumConfig = {
    1: {
      label: '1st',
      title: 'Champion',
      accent: '#D4AF37',
      gradient: 'linear-gradient(180deg, rgba(255,224,130,0.95) 0%, rgba(212,175,55,0.95) 100%)',
      shadow: '0 18px 40px rgba(212,175,55,0.18)',
    },
    2: {
      label: '2nd',
      title: 'Runner-Up',
      accent: '#c7cad6',
      gradient: 'linear-gradient(180deg, rgba(238,240,247,0.95) 0%, rgba(170,176,198,0.95) 100%)',
      shadow: '0 16px 34px rgba(199,202,214,0.14)',
    },
    3: {
      label: '3rd',
      title: 'Third Place',
      accent: '#d18a62',
      gradient: 'linear-gradient(180deg, rgba(246,195,164,0.95) 0%, rgba(186,110,70,0.95) 100%)',
      shadow: '0 16px 34px rgba(209,138,98,0.14)',
    },
  } as const;

  if (standings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', color: '#a0a0a0' }}>
          Final standings are not available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: `repeat(${podium.length >= 3 ? 3 : podium.length}, minmax(0, 1fr))` },
          gap: 2,
        }}
      >
        {podium.map((entry) => {
          const medal = podiumConfig[entry.place as 1 | 2 | 3];
          const resultLabel = recentResultMap.get(entry.participant.id);

          return (
            <Paper
              key={entry.participant.id}
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#111111',
                border: `1px solid ${medal.accent}35`,
                borderRadius: 2.5,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: medal.shadow,
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(17,17,17,0) 100%)`,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${medal.accent}12 0%, transparent 42%)`,
                  pointerEvents: 'none',
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
                <Box
                  sx={{
                    width: 82,
                    height: 82,
                    borderRadius: 2.5,
                    background: medal.gradient,
                    color: entry.place === 1 ? '#111' : '#161616',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                >
                  <EmojiEventsIcon sx={{ fontSize: 24, mb: 0.25 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {medal.label}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '0.72rem',
                      color: `${medal.accent}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      fontWeight: 700,
                      mb: 0.5,
                    }}
                  >
                    {medal.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: { xs: '1.15rem', md: '1.3rem' },
                      color: '#f5f5f0',
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {entry.participant.name}
                  </Typography>
                  {resultLabel && (
                    <Typography
                      sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '0.9rem',
                        color: '#d7d7d2',
                        fontWeight: 600,
                        mt: 1,
                      }}
                    >
                      Last result: {resultLabel}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>

      {remainingStandings.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#111111',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontSize: '1rem',
                color: '#f5f5f0',
                fontWeight: 600,
              }}
            >
              Other Finishers
            </Typography>
          </Box>

          {remainingStandings.map((entry, index) => (
            <Box
              key={entry.participant.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2.5,
                py: 1.4,
                borderBottom:
                  index < remainingStandings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'rgba(160,160,160,0.7)',
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {formatOrdinal(entry.place)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.92rem',
                  color: '#f5f5f0',
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                {entry.participant.name}
              </Typography>
              {recentResultMap.get(entry.participant.id) && (
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.8rem',
                    color: '#a0a0a0',
                    fontWeight: 600,
                  }}
                >
                  {recentResultMap.get(entry.participant.id)}
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ── Main Tabs Component ──

export default function TournamentDetailTabs({ tournament }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  const availableTabs: { label: string; value: TabValue }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Bracket', value: 'bracket' },
    { label: 'Players', value: 'players' },
  ];

  if (tournament.status === 'completed') {
    availableTabs.push({ label: 'Results', value: 'results' });
  }

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 4,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          '& .MuiTabs-indicator': {
            backgroundColor: '#D4AF37',
            height: 2,
          },
          '& .MuiTab-root': {
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#a0a0a0',
            textTransform: 'none',
            letterSpacing: '0.02em',
            minWidth: 80,
            '&.Mui-selected': {
              color: '#D4AF37',
            },
          },
        }}
      >
        {availableTabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'overview' && <OverviewPanel tournament={tournament} />}
          {activeTab === 'bracket' && <BracketPanel tournament={tournament} />}
          {activeTab === 'players' && <PlayersPanel tournament={tournament} />}
          {activeTab === 'results' && <ResultsPanel tournament={tournament} />}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
