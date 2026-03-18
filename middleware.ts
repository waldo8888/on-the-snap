import { InsforgeMiddleware } from '@insforge/nextjs/middleware';

if (!process.env.NEXT_PUBLIC_INSFORGE_BASE_URL) {
  throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required');
}

export default InsforgeMiddleware({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
  publicRoutes: [
    '/',
    '/menu',
    '/tournaments',
    '/tournaments/(.*)',
    '/leaderboard',
    '/players/(.*)',
    '/leagues',
    '/leagues/(.*)',
    '/scorekeeper/(.*)',
    '/admin/login',
    '/admin/verify-email',
    '/admin/forgot-password',
  ],
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
