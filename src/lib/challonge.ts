export interface Tournament {
    id: string;
    name: string;
    url: string;
    tournament_type: string;
    state: 'pending' | 'underway' | 'complete';
    starts_at: string | null;
    game_name: string;
    participants_count: number;
}

interface ChallongeApiTournament {
    tournament: {
        id: number;
        name: string;
        url: string;
        full_challonge_url: string;
        tournament_type: string;
        state: string;
        started_at: string | null;
        start_at: string | null;
        created_at: string;
        game_name: string | null;
        participants_count: number;
        subdomain: string | null;
    };
}

function normalizeState(state: string): Tournament['state'] {
    if (state === 'underway' || state === 'group_stages_underway') return 'underway';
    if (state === 'complete' || state === 'awaiting_review') return 'complete';
    return 'pending';
}

/**
 * Fetches the latest tournaments from Challonge API v1.
 * Returns up to `limit` tournaments, sorted by most recent first.
 * Returns null if no API key is configured.
 */
export async function fetchTournaments(limit = 4): Promise<Tournament[] | null> {
    const apiKey = process.env.CHALLONGE_API_KEY;
    if (!apiKey) return null;

    const subdomain = process.env.CHALLONGE_SUBDOMAIN || '';
    const params = new URLSearchParams({ api_key: apiKey });
    if (subdomain) params.set('subdomain', subdomain);

    try {
        const res = await fetch(
            `https://api.challonge.com/v1/tournaments.json?${params.toString()}`,
            { next: { revalidate: 300 } } // refresh every 5 minutes
        );

        if (!res.ok) {
            console.error(`Challonge API error: ${res.status} ${res.statusText}`);
            return null;
        }

        const data: ChallongeApiTournament[] = await res.json();

        // Sort by most recent (started_at or created_at) descending
        const sorted = data.sort((a, b) => {
            const dateA = a.tournament.started_at || a.tournament.start_at || a.tournament.created_at;
            const dateB = b.tournament.started_at || b.tournament.start_at || b.tournament.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return sorted.slice(0, limit).map((item) => {
            const t = item.tournament;
            return {
                id: String(t.id),
                name: t.name,
                url: t.url,
                tournament_type: t.tournament_type.replace(/_/g, ' '),
                state: normalizeState(t.state),
                starts_at: t.started_at || t.start_at || t.created_at,
                game_name: t.game_name || 'Pool',
                participants_count: t.participants_count,
            };
        });
    } catch (err) {
        console.error('Failed to fetch Challonge tournaments:', err);
        return null;
    }
}
