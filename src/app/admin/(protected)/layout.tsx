import { redirect } from 'next/navigation';
import { auth } from '@insforge/nextjs/server';
import AdminShell from '@/components/admin/AdminShell';
import { getAdminSession } from '@/lib/admin-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminSession = await getAdminSession();
  const { userId } = await auth();

  if (!adminSession) {
    redirect(userId ? '/admin/access' : '/admin/login');
  }

  return (
    <AdminShell
      user={{
        email: adminSession.email,
        displayName: adminSession.displayName,
        role: adminSession.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
