import type { Metadata } from 'next';
import { LocalBusinessJsonLd, BreadcrumbJsonLd } from '@/lib/json-ld';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Amenities from '@/components/Amenities';
import Gallery from '@/components/Gallery';
import Leagues from '@/components/Leagues';
import LiveStreaming from '@/components/LiveStreaming';
import FindUs from '@/components/FindUs';
import { Box } from '@mui/material';
import {
  getLeagues,
  getPlayerLeaderboard,
  getTournamentById,
  getTournaments,
} from '@/lib/tournaments';
import type {
  LeagueWithDetails,
  PlayerLeaderboardEntry,
  Tournament,
  TournamentWithDetails,
  TournamentStatus,
} from '@/lib/tournament-engine/types';

export const metadata: Metadata = {
  title: 'On The Snap | Premium Billiards & Lounge in Hamilton',
  description:
    "Hamilton's premier pool hall and lounge in Stoney Creek. 15 tournament-grade tables, darts, craft cocktails, live streaming, and competitive leagues. Reserve a table today.",
  alternates: {
    canonical: 'https://onthesnap.ca',
  },
};

export const revalidate = 300; // re-fetch every 5 minutes

const TOURNAMENT_STATUS_PRIORITY: Record<TournamentStatus, number> = {
  live: 0,
  check_in: 1,
  open: 2,
  draft: 3,
  completed: 4,
  cancelled: 5,
};

function compareFeaturedTournaments(a: Tournament, b: Tournament) {
  const bracketDiff =
    Number(Boolean(b.bracket_generated_at)) - Number(Boolean(a.bracket_generated_at));

  if (bracketDiff !== 0) {
    return bracketDiff;
  }

  const priorityDiff =
    TOURNAMENT_STATUS_PRIORITY[a.status] - TOURNAMENT_STATUS_PRIORITY[b.status];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const aStart = new Date(a.tournament_start_at).getTime();
  const bStart = new Date(b.tournament_start_at).getTime();

  if (['completed', 'cancelled'].includes(a.status) || ['completed', 'cancelled'].includes(b.status)) {
    return bStart - aStart;
  }

  return aStart - bStart;
}

async function getFeaturedTournaments(): Promise<TournamentWithDetails[]> {
  const tournaments = await getTournaments({ published: true, limit: 12 });

  const featured = tournaments
    .slice()
    .sort(compareFeaturedTournaments)
    .slice(0, 4);

  const detailed = await Promise.all(
    featured.map(async (tournament) => getTournamentById(tournament.id))
  );

  return detailed.filter(
    (tournament): tournament is TournamentWithDetails => tournament !== null
  );
}

export default async function Home() {
  const [tournaments, leagues, leaderboard] = await Promise.all([
    getFeaturedTournaments(),
    getLeagues({ published: true }),
    getPlayerLeaderboard(),
  ]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LocalBusinessJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            BreadcrumbJsonLd([{ name: 'Home', url: 'https://onthesnap.ca' }])
          ),
        }}
      />
      <Navbar />
      <Hero />
      <Stats />
      <Amenities />
      <Gallery />
      <Leagues
        tournaments={tournaments}
        leagues={leagues as LeagueWithDetails[]}
        topPlayers={leaderboard.slice(0, 5) as PlayerLeaderboardEntry[]}
      />
      <LiveStreaming />
      <FindUs />
    </Box>
  );
}
