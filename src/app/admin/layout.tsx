import { getAuthFromCookies } from '@insforge/nextjs/server';
import { InsforgeProvider } from '../providers';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialState = await getAuthFromCookies();

  return <InsforgeProvider initialState={initialState}>{children}</InsforgeProvider>;
}
