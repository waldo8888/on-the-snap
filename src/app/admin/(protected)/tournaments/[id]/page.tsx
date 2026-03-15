import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import TournamentEditClient from '@/components/admin/TournamentEditClient';

export default async function TournamentDetailPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return <TournamentEditClient role={session.role} />;
}
