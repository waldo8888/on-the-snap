import LeagueAdminDetailClient from '@/components/admin/LeagueAdminDetailClient';

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeagueAdminDetailClient leagueId={id} />;
}
