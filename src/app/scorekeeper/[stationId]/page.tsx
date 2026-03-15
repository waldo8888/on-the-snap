import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ScorekeeperClient from '@/components/scorekeeper/ScorekeeperClient';
import {
  getMatchesWithPlayers,
  getScorekeeperStationById,
  getTournamentById,
} from '@/lib/tournaments';
import {
  parseScorekeeperSessionValue,
  SCOREKEEPER_SESSION_COOKIE,
} from '@/lib/scorekeeper-auth';

export const dynamic = 'force-dynamic';

export default async function ScorekeeperPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const station = await getScorekeeperStationById(stationId);

  if (!station) {
    notFound();
  }

  const cookieStore = await cookies();
  const session = parseScorekeeperSessionValue(
    cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value
  );

  const authorized =
    Boolean(session) &&
    session?.stationId === station.id &&
    session?.tournamentId === station.tournament_id &&
    Number(session?.tableNumber) === Number(station.table_number) &&
    station.active;

  const tournament = authorized ? await getTournamentById(station.tournament_id) : null;
  const matches = authorized
    ? (await getMatchesWithPlayers(station.tournament_id)).filter(
        (match) => Number(match.table_number) === Number(station.table_number)
      )
    : [];

  return (
    <ScorekeeperClient
      stationId={station.id}
      tournament={tournament}
      initialMatches={matches}
      authorized={authorized}
      tableNumber={station.table_number}
      stationLabel={station.label}
    />
  );
}
