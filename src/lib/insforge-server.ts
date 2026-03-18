import 'server-only';

import { auth } from '@insforge/nextjs/server';
import { createClient } from '@insforge/sdk';

export function createServerInsforgeClient(edgeFunctionToken?: string) {
  const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? '';
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required');
  }
  return createClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,
    ...(edgeFunctionToken ? { edgeFunctionToken } : {}),
  });
}

export async function getAuthenticatedServerInsforgeClient() {
  const { userId, token } = await auth();

  if (!userId || !token) {
    return null;
  }

  return {
    userId,
    client: createServerInsforgeClient(token),
  };
}
