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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
