import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!baseUrl) {
  throw new Error('NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required');
}

export const insforge = createClient({
  baseUrl,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});
