import { createAuthRouteHandlers } from '@insforge/nextjs/api';
import type { NextRequest } from 'next/server';

let _handlers: ReturnType<typeof createAuthRouteHandlers> | null = null;

function getHandlers() {
  if (!_handlers) {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required');
    }
    _handlers = createAuthRouteHandlers({ baseUrl });
  }
  return _handlers;
}

export const POST = (req: NextRequest) => getHandlers().POST(req);
export const GET = (req: NextRequest) => getHandlers().GET(req);
export const DELETE = (req: NextRequest) => getHandlers().DELETE(req);
