import 'server-only';

import { auth } from '@insforge/nextjs/server';
import { createClient } from '@insforge/sdk';

const BASE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  'https://d5tkh9er.us-east.insforge.app';
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export function createServerInsforgeClient(edgeFunctionToken?: string) {
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
