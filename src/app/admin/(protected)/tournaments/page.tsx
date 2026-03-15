import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import TournamentListClient from '@/components/admin/TournamentListClient';

export default async function TournamentsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return <TournamentListClient role={session.role} />;
}
