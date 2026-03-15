import 'server-only';

import { auth } from '@insforge/nextjs/server';
import { createClient } from '@insforge/sdk';

export type AdminRole = 'owner' | 'staff';

export interface AdminSession {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
}

function isAdminRole(value: unknown): value is AdminRole {
  return value === 'owner' || value === 'staff';
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const { userId, token, user } = await auth();
  if (!userId || !user?.email) {
    return null;
  }

  const profile = user.profile ?? {};
  const profileRole = profile.role;

  if (isAdminRole(profileRole)) {
    return {
      userId,
      email: user.email,
      displayName:
        typeof profile.name === 'string' && profile.name.trim().length > 0
          ? profile.name
          : user.email,
      role: profileRole,
    };
  }

  if (!token) {
    return null;
  }

  try {
    const serverClient = createClient({
      baseUrl:
        process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
        'https://d5tkh9er.us-east.insforge.app',
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
      edgeFunctionToken: token,
    });

    const { data, error } = await serverClient.database
      .from('user_profiles')
      .select('display_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || !isAdminRole(data.role)) {
      return null;
    }

    return {
      userId,
      email: user.email,
      displayName:
        typeof data.display_name === 'string' && data.display_name.trim().length > 0
          ? data.display_name
          : typeof profile.name === 'string' && profile.name.trim().length > 0
            ? profile.name
            : user.email,
      role: data.role,
    };
  } catch {
    return null;
  }
}
