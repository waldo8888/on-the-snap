'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import type { Match, Round, Participant, BracketSide } from '@/lib/tournament-engine/types';

// ============================================================
// Constants
// ============================================================

const MATCH_W = 220;
const MATCH_H = 64;
const MATCH_GAP_Y = 16;
const ROUND_GAP_X = 60;
const ROUND_HEADER_H = 40;
const PADDING = 24;

const COLORS = {
  bg: '#0a0a0a',
  cardBg: '#111111',
  cardBorder: 'rgba(212,175,55,0.15)',
  cardActiveBorder: '#D4AF37',
  winnerBg: 'rgba(212,175,55,0.08)',
  text: '#f5f5f0',
  textMuted: '#888',
  gold: '#D4AF37',
  green: '#39a87a',
  line: 'rgba(212,175,55,0.25)',
  byeBg: 'rgba(255,255,255,0.03)',
  livePulse: '#D4AF37',
};

// ============================================================
// Types
// ============================================================

interface MatchNode {
  match: Match;
  x: number;
  y: number;
  player1Name: string;
  player2Name: string;
  winnerName: string | null;
}

interface RoundColumn {
  round: Round;
  matches: MatchNode[];
  x: number;
}

interface BracketViewerProps {
  rounds: (Round & { matches?: Match[] })[];
  participants: Participant[];
  bracketSide?: BracketSide;
  displayMode?: boolean;
  onMatchClick?: (match: Match) => void;
}

// ============================================================
// Component
// ============================================================

export default function BracketViewer({
  rounds,
  participants,
  bracketSide,
  displayMode = false,
  onMatchClick,
}: BracketViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  // Filter rounds by bracket side if specified
  const filteredRounds = useMemo(() => {
    if (!bracketSide) return rounds;
    return rounds.filter((r) => r.bracket_side === bracketSide);
  }, [rounds, bracketSide]);

  // Build layout
  const { columns, totalWidth, totalHeight, connectorLines } = useMemo(() => {
    const cols: RoundColumn[] = [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const resolveName = (id: string | null) => {
      if (!id) return 'TBD';
      return participantMap.get(id)?.name || 'TBD';
    };

    const sortedRounds = [...filteredRounds].sort((a, b) => a.round_number - b.round_number);

    sortedRounds.forEach((round, roundIdx) => {
      const matches = round.matches || [];
      const x = PADDING + roundIdx * (MATCH_W + ROUND_GAP_X);

      // Calculate vertical positions
      // Each subsequent round should center between the matches that feed into it
      const matchNodes: MatchNode[] = [];

      if (roundIdx === 0) {
        // First round: evenly spaced
        matches.forEach((match, matchIdx) => {
          const y = PADDING + ROUND_HEADER_H + matchIdx * (MATCH_H + MATCH_GAP_Y);
            matchNodes.push({
              match,
              x,
              y,
              player1Name: resolveName(match.player1_id),
              player2Name: resolveName(match.player2_id),
              winnerName: match.winner_id ? resolveName(match.winner_id) : null,
            });
        });
      } else {
        // Subsequent rounds: center between feeding matches
        const prevCol = cols[roundIdx - 1];
        matches.forEach((match, matchIdx) => {
          // Find the two matches from previous round that feed into this one
          const feedIdx1 = matchIdx * 2;
          const feedIdx2 = matchIdx * 2 + 1;

          let y: number;
          if (prevCol && prevCol.matches[feedIdx1] && prevCol.matches[feedIdx2]) {
            y = (prevCol.matches[feedIdx1].y + prevCol.matches[feedIdx2].y) / 2;
          } else if (prevCol && prevCol.matches[feedIdx1]) {
            y = prevCol.matches[feedIdx1].y;
          } else {
            y = PADDING + ROUND_HEADER_H + matchIdx * (MATCH_H + MATCH_GAP_Y) * Math.pow(2, roundIdx);
          }

          matchNodes.push({
            match,
            x,
            y,
            player1Name: resolveName(match.player1_id),
            player2Name: resolveName(match.player2_id),
            winnerName: match.winner_id ? resolveName(match.winner_id) : null,
          });
        });
      }

      cols.push({ round, matches: matchNodes, x });
    });

    // Generate connector lines
    for (let colIdx = 0; colIdx < cols.length - 1; colIdx++) {
      const currentCol = cols[colIdx];
      const nextCol = cols[colIdx + 1];

      currentCol.matches.forEach((matchNode, matchIdx) => {
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const nextMatchNode = nextCol.matches[nextMatchIdx];
        if (!nextMatchNode) return;

        const startX = matchNode.x + MATCH_W;
        const startY = matchNode.y + MATCH_H / 2;
        const endX = nextMatchNode.x;
        const endY = nextMatchNode.y + MATCH_H / 2;
        const midX = startX + (endX - startX) / 2;

        // Horizontal from match to mid
        lines.push({ x1: startX, y1: startY, x2: midX, y2: startY });
        // Vertical from match to next match level
        lines.push({ x1: midX, y1: startY, x2: midX, y2: endY });
        // Horizontal from mid to next match
        lines.push({ x1: midX, y1: endY, x2: endX, y2: endY });
      });
    }

    const tw = cols.length > 0
      ? cols[cols.length - 1].x + MATCH_W + PADDING
      : PADDING * 2;

    let maxY = 0;
    cols.forEach((col) => {
      col.matches.forEach((m) => {
        if (m.y + MATCH_H > maxY) maxY = m.y + MATCH_H;
      });
    });
    const th = maxY + PADDING;

    return { columns: cols, totalWidth: tw, totalHeight: th, connectorLines: lines };
  }, [filteredRounds, participantMap]);

  // Auto-scale for display mode
  useEffect(() => {
    if (!displayMode || !containerRef.current) return;
    const container = containerRef.current;
    const scaleX = container.clientWidth / totalWidth;
    const scaleY = container.clientHeight / totalHeight;
    setScale(Math.min(scaleX, scaleY, 1));
  }, [displayMode, totalWidth, totalHeight]);

  const scaleFactor = displayMode ? scale : isMobile ? 0.65 : 1;
  const fontSize = displayMode ? 15 : 12;

  if (filteredRounds.length === 0 || columns.every((c) => c.matches.length === 0)) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No bracket data available. Generate the bracket first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        overflow: 'auto',
        bgcolor: displayMode ? '#000' : 'transparent',
        borderRadius: displayMode ? 0 : 1,
        position: 'relative',
        minHeight: displayMode ? '100vh' : 200,
      }}
    >
      <svg
        width={totalWidth * scaleFactor}
        height={totalHeight * scaleFactor}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ display: 'block' }}
      >
        {/* Connector lines */}
        {connectorLines.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={COLORS.line}
            strokeWidth={1.5}
          />
        ))}

        {/* Round headers */}
        {columns.map((col, i) => (
          <text
            key={`header-${i}`}
            x={col.x + MATCH_W / 2}
            y={PADDING + 12}
            textAnchor="middle"
            fill={COLORS.gold}
            fontSize={fontSize}
            fontWeight={600}
            fontFamily="var(--font-playfair), serif"
            letterSpacing="0.05em"
          >
            {col.round.name || `Round ${col.round.round_number}`}
          </text>
        ))}

        {/* Match cards */}
        {columns.map((col) =>
          col.matches.map((node) => {
            const { match, x, y, player1Name, player2Name } = node;
            const isActive = match.status === 'in_progress';
            const isCompleted = match.status === 'completed';
            const isBye = match.status === 'bye';
            const borderColor = isActive
              ? COLORS.cardActiveBorder
              : isCompleted
              ? COLORS.green
              : COLORS.cardBorder;

            return (
              <g
                key={match.id}
                onClick={() => onMatchClick?.(match)}
                style={{ cursor: onMatchClick ? 'pointer' : 'default' }}
              >
                {/* Card background */}
                <rect
                  x={x}
                  y={y}
                  width={MATCH_W}
                  height={MATCH_H}
                  rx={4}
                  fill={isBye ? COLORS.byeBg : COLORS.cardBg}
                  stroke={borderColor}
                  strokeWidth={isActive ? 2 : 1}
                />

                {/* Active match glow */}
                {isActive && (
                  <rect
                    x={x}
                    y={y}
                    width={MATCH_W}
                    height={MATCH_H}
                    rx={4}
                    fill="none"
                    stroke={COLORS.livePulse}
                    strokeWidth={2}
                    opacity={0.5}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.5;0.15;0.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* Divider line */}
                <line
                  x1={x}
                  y1={y + MATCH_H / 2}
                  x2={x + MATCH_W}
                  y2={y + MATCH_H / 2}
                  stroke={COLORS.cardBorder}
                  strokeWidth={0.5}
                />

                {/* Player 1 */}
                <text
                  x={x + 10}
                  y={y + MATCH_H / 2 - 8}
                  fill={match.winner_id === match.player1_id ? COLORS.gold : COLORS.text}
                  fontSize={fontSize}
                  fontWeight={match.winner_id === match.player1_id ? 700 : 400}
                  fontFamily="var(--font-inter), sans-serif"
                >
                  {player1Name}
                </text>

                {/* Player 1 score */}
                {match.player1_score !== null && (
                  <text
                    x={x + MATCH_W - 10}
                    y={y + MATCH_H / 2 - 8}
                    textAnchor="end"
                    fill={match.winner_id === match.player1_id ? COLORS.gold : COLORS.textMuted}
                    fontSize={fontSize}
                    fontWeight={700}
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    {match.player1_score}
                  </text>
                )}

                {/* Player 2 */}
                <text
                  x={x + 10}
                  y={y + MATCH_H / 2 + 18}
                  fill={match.winner_id === match.player2_id ? COLORS.gold : COLORS.text}
                  fontSize={fontSize}
                  fontWeight={match.winner_id === match.player2_id ? 700 : 400}
                  fontFamily="var(--font-inter), sans-serif"
                >
                  {player2Name}
                </text>

                {/* Player 2 score */}
                {match.player2_score !== null && (
                  <text
                    x={x + MATCH_W - 10}
                    y={y + MATCH_H / 2 + 18}
                    textAnchor="end"
                    fill={match.winner_id === match.player2_id ? COLORS.gold : COLORS.textMuted}
                    fontSize={fontSize}
                    fontWeight={700}
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    {match.player2_score}
                  </text>
                )}

                {/* Table number badge */}
                {match.table_number && (
                  <>
                    <rect
                      x={x + MATCH_W - 32}
                      y={y + 2}
                      width={30}
                      height={16}
                      rx={3}
                      fill="rgba(212,175,55,0.15)"
                    />
                    <text
                      x={x + MATCH_W - 17}
                      y={y + 14}
                      textAnchor="middle"
                      fill={COLORS.gold}
                      fontSize={9}
                      fontWeight={600}
                      fontFamily="var(--font-inter), sans-serif"
                    >
                      T{match.table_number}
                    </text>
                  </>
                )}

                {/* Match number */}
                <text
                  x={x + MATCH_W - 10}
                  y={y + MATCH_H - 4}
                  textAnchor="end"
                  fill={COLORS.textMuted}
                  fontSize={8}
                  fontFamily="var(--font-inter), sans-serif"
                  opacity={0.5}
                >
                  #{match.match_number}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </Box>
  );
}
