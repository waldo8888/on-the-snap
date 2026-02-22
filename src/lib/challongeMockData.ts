export interface MockTournament {
    id: string;
    name: string;
    url: string; // The Challonge URL slug (e.g., 'otssummer2026')
    tournament_type: string;
    state: 'pending' | 'underway' | 'complete';
    starts_at: string | null;
    game_name: string;
    participants_count: number;
}

export const mockTournaments: MockTournament[] = [
    {
        id: '1001',
        name: 'Weekly 9 Ball Tournament',
        url: 'm53yi18d', // The real tournament URL provided by the user
        tournament_type: 'double elimination',
        state: 'complete', // Since it was on Feb 18
        starts_at: '2026-02-18T18:23:00-05:00',
        game_name: '9-Ball',
        participants_count: 8,
    },
    {
        id: '1002',
        name: 'Friday Night 8-Ball Frenzy',
        url: 'test_tournament_123',
        tournament_type: 'single elimination',
        state: 'pending',
        starts_at: new Date(Date.now() + 172800000).toISOString(), // In 2 days
        game_name: '8-Ball',
        participants_count: 16,
    },
    {
        id: '1003',
        name: 'OPPL Regional Qualifiers',
        url: 'test_tournament_456',
        tournament_type: 'round robin',
        state: 'complete',
        starts_at: new Date(Date.now() - 1000000000).toISOString(), // In the past
        game_name: '10-Ball',
        participants_count: 64,
    }
];
