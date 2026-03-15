import { insforge } from './insforge';

export type UserRole = 'user' | 'staff' | 'owner';

export interface AdminUserRecord {
  id: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface AdminAccessState {
  role: UserRole;
  owner_count: number;
  email: string;
  email_verified: boolean;
  bootstrap_configured: boolean;
  needs_owner_bootstrap: boolean;
  can_claim_owner: boolean;
}

function normalizeAdminUserRecord(input: unknown): AdminUserRecord {
  const row = input as Record<string, unknown>;

  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    email_verified: Boolean(row.email_verified),
    display_name: String(row.display_name ?? ''),
    role: (row.role as UserRole) ?? 'user',
    created_at: String(row.created_at ?? ''),
  };
}

function normalizeAdminAccessState(input: unknown): AdminAccessState {
  const row = input as Record<string, unknown>;

  return {
    role: (row.role as UserRole) ?? 'user',
    owner_count: Number(row.owner_count ?? 0),
    email: String(row.email ?? ''),
    email_verified: Boolean(row.email_verified),
    bootstrap_configured: Boolean(row.bootstrap_configured),
    needs_owner_bootstrap: Boolean(row.needs_owner_bootstrap),
    can_claim_owner: Boolean(row.can_claim_owner),
  };
}

export async function ensureCurrentUserProfile() {
  const { data, error } = await insforge.database.rpc('ensure_current_user_profile');

  if (error) {
    throw error;
  }

  return data;
}

export async function listRoleAssignableUsers(): Promise<AdminUserRecord[]> {
  const { data, error } = await insforge.database.rpc('list_role_assignable_users');

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(normalizeAdminUserRecord) : [];
}

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const { data, error } = await insforge.database.rpc('get_admin_access_state');

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeAdminAccessState(row);
}

export async function claimInitialOwner(): Promise<AdminUserRecord> {
  const { data, error } = await insforge.database.rpc('claim_initial_owner');

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeAdminUserRecord(row);
}

export async function assignUserRole(
  userId: string,
  role: UserRole
): Promise<AdminUserRecord> {
  const { data, error } = await insforge.database.rpc('assign_user_role', {
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeAdminUserRecord(row);
}
