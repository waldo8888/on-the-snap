import type { MetadataRoute } from 'next';
import { getTournaments, getLeagues, getPlayerLeaderboard } from '@/lib/tournaments';
import type { LeagueWithDetails } from '@/lib/tournament-engine/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://onthesnap.ca';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/tournaments`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leagues`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/menu`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  let tournamentRoutes: MetadataRoute.Sitemap = [];
  try {
    const tournaments = await getTournaments({ published: true });
    tournamentRoutes = tournaments.map((t) => ({
      url: `${baseUrl}/tournaments/${t.slug}`,
      lastModified: new Date(t.updated_at || t.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch { /* fail gracefully */ }

  let leagueRoutes: MetadataRoute.Sitemap = [];
  try {
    const leagues = await getLeagues({ published: true }) as LeagueWithDetails[];
    for (const league of leagues) {
      leagueRoutes.push({
        url: `${baseUrl}/leagues/${league.slug}`,
        lastModified: new Date(league.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });

      if (league.seasons) {
        for (const season of league.seasons) {
          if (season.published) {
            leagueRoutes.push({
              url: `${baseUrl}/leagues/${league.slug}/seasons/${season.slug}`,
              lastModified: new Date(season.updated_at),
              changeFrequency: 'weekly',
              priority: 0.6,
            });
          }
        }
      }
    }
  } catch { /* fail gracefully */ }

  let playerRoutes: MetadataRoute.Sitemap = [];
  try {
    const leaderboard = await getPlayerLeaderboard();
    playerRoutes = leaderboard.map((p) => ({
      url: `${baseUrl}/players/${p.player_id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch { /* fail gracefully */ }

  return [...staticRoutes, ...tournamentRoutes, ...leagueRoutes, ...playerRoutes];
}
