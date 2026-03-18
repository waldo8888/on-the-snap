import { createAuthRouteHandlers } from '@insforge/nextjs/api';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!baseUrl) {
  throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required');
}

const handlers = createAuthRouteHandlers({ baseUrl });

export const POST = handlers.POST;
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
