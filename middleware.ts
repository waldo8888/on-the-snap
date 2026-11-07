import { NextResponse, type NextRequest } from 'next/server';
import { InsforgeMiddleware } from '@insforge/nextjs/middleware';

const authMiddleware = InsforgeMiddleware({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ?? '',
  useBuiltInAuth: false,
  signInUrl: '/admin/login',
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

// Only /admin needs the auth gate. Anything else that is not a real page should
// reach Next's 404 instead of bouncing visitors to the staff sign-in.
export default function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  return authMiddleware(request);
}

export const config = {
  // Only the staff admin area needs the auth gate. Running middleware on every
  // public page, asset and bot hit cost server CPU for nothing.
  matcher: ['/admin/:path*'],
};
