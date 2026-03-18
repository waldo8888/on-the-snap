import type { Metadata } from 'next';
import { getTournamentBySlug } from '@/lib/tournaments';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    return { title: 'Bracket | On The Snap' };
  }

  return {
    title: `${tournament.title} Bracket | On The Snap`,
    description: `Live tournament bracket for ${tournament.title}. Follow matches in real-time at On The Snap.`,
    openGraph: {
      title: `${tournament.title} — Live Bracket`,
      description: `Live tournament bracket for ${tournament.title} at On The Snap.`,
      url: `https://onthesnap.ca/tournaments/${slug}/bracket`,
    },
  };
}

export default function BracketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
