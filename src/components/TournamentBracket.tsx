'use client';

import { useMemo, useState } from 'react';
import { Box, Chip, Paper, Tab, Tabs, Typography } from '@mui/material';
import BracketViewer from '@/components/tournament/BracketViewer';
import RoundRobinTable from '@/components/tournament/RoundRobinTable';
import { MatchStatusBadge } from '@/components/tournament/StatusBadge';
import type {
  Match,
  Participant,
  TournamentWithDetails,
} from '@/lib/tournament-engine/types';

type PreviewTab = 'bracket' | 'standings';

interface TournamentBracketProps {
  tournament: TournamentWithDetails;
}

interface StandingRow {
  participant: Participant;
  matchesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  liveMatches: number;
}

function getPlayerName(id: string | null, participants: Participant[]) {
  if (!id) return 'TBD';
  return participants.find((participant) => participant.id === id)?.name || 'TBD';
}

function MatchSnapshotCard({
  match,
  participants,
}: {
  match: Match;
  participants: Participant[];
}) {
  const playerOne = getPlayerName(match.player1_id, participants);
  const playerTwo = getPlayerName(match.player2_id, participants);
  const isCompleted = match.status === 'completed';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        bgcolor: '#111111',
        border: `1px solid ${
          match.status === 'in_progress'
            ? 'rgba(212,175,55,0.35)'
            : 'rgba(255,255,255,0.06)'
        }`,
        borderRadius: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.25,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.72rem',
            color: 'rgba(160,160,160,0.55)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Match {match.match_number}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {match.table_number && (
            <Chip
              label={`Table ${match.table_number}`}
              size="small"
              sx={{
                bgcolor: 'rgba(57,168,122,0.1)',
                color: '#39a87a',
                fontSize: '0.65rem',
                fontWeight: 700,
                height: 22,
              }}
            />
          )}
          <MatchStatusBadge status={match.status} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.86rem',
              color:
                isCompleted && match.winner_id === match.player1_id ? '#D4AF37' : '#f5f5f0',
              fontWeight:
                isCompleted && match.winner_id === match.player1_id ? 700 : 400,
            }}
          >
            {playerOne}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.82rem',
              color:
                isCompleted && match.winner_id === match.player1_id ? '#D4AF37' : '#a0a0a0',
              fontWeight: 700,
            }}
          >
            {match.player1_score ?? '-'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.86rem',
              color:
                isCompleted && match.winner_id === match.player2_id ? '#D4AF37' : '#f5f5f0',
              fontWeight:
                isCompleted && match.winner_id === match.player2_id ? 700 : 400,
            }}
          >
            {playerTwo}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.82rem',
              color:
                isCompleted && match.winner_id === match.player2_id ? '#D4AF37' : '#a0a0a0',
              fontWeight: 700,
            }}
          >
            {match.player2_score ?? '-'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

function EliminationStandingsTable({
  standings,
}: {
  standings: StandingRow[];
}) {
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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(160px, 1.4fr) repeat(5, minmax(40px, 70px))',
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {['Player', 'MP', 'W', 'L', 'PF', 'PA'].map((label) => (
          <Typography
            key={label}
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.68rem',
              color: 'rgba(160,160,160,0.6)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textAlign: label === 'Player' ? 'left' : 'center',
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      {standings.map((standing, index) => (
        <Box
          key={standing.participant.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 1.4fr) repeat(5, minmax(40px, 70px))',
            gap: 1,
            px: 2.5,
            py: 1.5,
            alignItems: 'center',
            borderBottom:
              index < standings.length - 1
                ? '1px solid rgba(255,255,255,0.04)'
                : 'none',
            bgcolor: index === 0 ? 'rgba(212,175,55,0.05)' : 'transparent',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.85rem',
                color: index === 0 ? '#D4AF37' : '#f5f5f0',
                fontWeight: index === 0 ? 700 : 500,
              }}
            >
              {standing.participant.name}
            </Typography>
            {standing.liveMatches > 0 && (
              <Chip
                label="LIVE"
                size="small"
                sx={{
                  bgcolor: 'rgba(212,175,55,0.12)',
                  color: '#D4AF37',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  height: 18,
                }}
              />
            )}
          </Box>

          {[
            standing.matchesPlayed,
            standing.wins,
            standing.losses,
            standing.pointsFor,
            standing.pointsAgainst,
          ].map((value, valueIndex) => (
            <Typography
              key={`${standing.participant.id}-${valueIndex}`}
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.82rem',
                color: valueIndex === 1 ? '#39a87a' : valueIndex === 2 ? '#ef5350' : '#a0a0a0',
                textAlign: 'center',
                fontWeight: valueIndex === 1 || valueIndex === 2 ? 700 : 500,
              }}
            >
              {value}
            </Typography>
          ))}
        </Box>
      ))}
    </Paper>
  );
}

function NoBracketState() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        border: '1px dashed rgba(212,175,55,0.2)',
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.01)',
      }}
    >
      <Typography
        sx={{
          color: '#f5f5f0',
          fontFamily: '"Playfair Display", serif',
          fontSize: '1.1rem',
          mb: 1,
        }}
      >
        Bracket pending
      </Typography>
      <Typography
        sx={{
          color: '#a0a0a0',
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.92rem',
          lineHeight: 1.7,
          maxWidth: 560,
          mx: 'auto',
        }}
      >
        Registration, check-in, and seeding are native already. Once the tournament
        desk generates the bracket, this panel updates automatically with the live
        tree and standings.
      </Typography>
    </Box>
  );
}

export default function TournamentBracket({ tournament }: TournamentBracketProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('bracket');

  const participants = useMemo(
    () => tournament.participants ?? [],
    [tournament.participants]
  );
  const rounds = useMemo(() => tournament.rounds ?? [], [tournament.rounds]);

  const allMatches = useMemo(
    () => rounds.flatMap((round) => round.matches || []),
    [rounds]
  );

  const activeMatches = useMemo(
    () =>
      allMatches.filter(
        (match) => match.status === 'ready' || match.status === 'in_progress'
      ),
    [allMatches]
  );

  const eliminationStandings = useMemo<StandingRow[]>(() => {
    const stats = new Map<string, StandingRow>();

    participants.forEach((participant) => {
      stats.set(participant.id, {
        participant,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        liveMatches: 0,
      });
    });

    allMatches.forEach((match) => {
      if (!match.player1_id && !match.player2_id) {
        return;
      }

      const playerOne = match.player1_id ? stats.get(match.player1_id) : undefined;
      const playerTwo = match.player2_id ? stats.get(match.player2_id) : undefined;

      if (match.status === 'completed') {
        if (playerOne) {
          playerOne.matchesPlayed += 1;
          playerOne.pointsFor += match.player1_score || 0;
          playerOne.pointsAgainst += match.player2_score || 0;
          if (match.winner_id === match.player1_id) {
            playerOne.wins += 1;
          } else {
            playerOne.losses += 1;
          }
        }

        if (playerTwo) {
          playerTwo.matchesPlayed += 1;
          playerTwo.pointsFor += match.player2_score || 0;
          playerTwo.pointsAgainst += match.player1_score || 0;
          if (match.winner_id === match.player2_id) {
            playerTwo.wins += 1;
          } else {
            playerTwo.losses += 1;
          }
        }
      }

      if (match.status === 'ready' || match.status === 'in_progress') {
        if (playerOne) {
          playerOne.liveMatches += 1;
        }
        if (playerTwo) {
          playerTwo.liveMatches += 1;
        }
      }
    });

    return Array.from(stats.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;

      const pointDiffA = a.pointsFor - a.pointsAgainst;
      const pointDiffB = b.pointsFor - b.pointsAgainst;
      if (pointDiffB !== pointDiffA) return pointDiffB - pointDiffA;

      const seedA = a.participant.seed ?? Number.MAX_SAFE_INTEGER;
      const seedB = b.participant.seed ?? Number.MAX_SAFE_INTEGER;
      return seedA - seedB;
    });
  }, [allMatches, participants]);

  const winnersRounds = rounds.filter((round) => round.bracket_side === 'winners');
  const losersRounds = rounds.filter((round) => round.bracket_side === 'losers');
  const finalsRounds = rounds.filter((round) => round.bracket_side === 'finals');

  const bracketView =
    rounds.length === 0 ? (
      <NoBracketState />
    ) : tournament.format === 'round_robin' ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography
          sx={{
            color: '#a0a0a0',
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.92rem',
            lineHeight: 1.7,
          }}
        >
          Round robin events use a fixtures board instead of a knockout tree. Each
          round below updates with results and live tables from your own tournament
          system.
        </Typography>

        {rounds.map((round) => (
          <Box key={round.id}>
            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                color: '#D4AF37',
                mb: 1.5,
                fontSize: '1rem',
              }}
            >
              {round.name || `Round ${round.round_number}`}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {(round.matches || []).map((match) => (
                <MatchSnapshotCard
                  key={match.id}
                  match={match}
                  participants={participants}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          {tournament.format === 'double_elimination' && (
            <Typography
              sx={{
                color: '#D4AF37',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: '1rem',
                mb: 1.5,
              }}
            >
              Winners Bracket
            </Typography>
          )}
          <BracketViewer rounds={winnersRounds} participants={participants} />
        </Box>

        {losersRounds.length > 0 && (
          <Box>
            <Typography
              sx={{
                color: '#a0a0a0',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: '1rem',
                mb: 1.5,
              }}
            >
              Losers Bracket
            </Typography>
            <BracketViewer
              rounds={losersRounds}
              participants={participants}
              bracketSide="losers"
            />
          </Box>
        )}

        {finalsRounds.length > 0 && (
          <Box>
            <Typography
              sx={{
                color: '#D4AF37',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: '1rem',
                mb: 1.5,
              }}
            >
              Finals
            </Typography>
            <BracketViewer
              rounds={finalsRounds}
              participants={participants}
              bracketSide="finals"
            />
          </Box>
        )}

        {activeMatches.length > 0 && (
          <Box>
            <Typography
              sx={{
                color: '#f5f5f0',
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: '1rem',
                mb: 1.5,
              }}
            >
              Active Tables
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {activeMatches.slice(0, 4).map((match) => (
                <MatchSnapshotCard
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

  return (
    <Box
      sx={{
        width: '100%',
        mt: 3,
        bgcolor: 'rgba(0,0,0,0.5)',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value: PreviewTab) => setActiveTab(value)}
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              backgroundColor: '#D4AF37',
              height: 2,
            },
            '& .MuiTab-root': {
              color: '#a0a0a0',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'none',
              minHeight: 44,
              px: 1.5,
              '&.Mui-selected': {
                color: '#f5f5f0',
              },
            },
          }}
        >
          <Tab label="Bracket" value="bracket" />
          <Tab label="Standings" value="standings" />
        </Tabs>

        {activeMatches.length > 0 && (
          <Chip
            label={`${activeMatches.length} Active ${activeMatches.length === 1 ? 'Table' : 'Tables'}`}
            size="small"
            sx={{
              bgcolor: 'rgba(212,175,55,0.12)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.25)',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          />
        )}
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {activeTab === 'bracket' ? (
          bracketView
        ) : tournament.format === 'round_robin' ? (
          <RoundRobinTable matches={allMatches} participants={participants} />
        ) : (
          <EliminationStandingsTable standings={eliminationStandings} />
        )}
      </Box>
    </Box>
  );
}
