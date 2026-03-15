import { redirect } from 'next/navigation';
import UserRoleManager from '@/components/admin/UserRoleManager';
import { getAdminSession } from '@/lib/admin-auth';

export default async function AdminUsersPage() {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect('/admin/login?reason=forbidden');
  }

  if (adminSession.role !== 'owner') {
    redirect('/admin');
  }

  return <UserRoleManager currentUserId={adminSession.userId} />;
}
