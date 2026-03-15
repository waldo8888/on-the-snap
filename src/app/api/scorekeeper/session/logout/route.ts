import { NextResponse } from 'next/server';
import {
  getScorekeeperSessionCookieOptions,
  SCOREKEEPER_SESSION_COOKIE,
} from '@/lib/scorekeeper-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SCOREKEEPER_SESSION_COOKIE,
    '',
    getScorekeeperSessionCookieOptions(new Date(0))
  );
  return response;
}

export const DELETE = POST;
