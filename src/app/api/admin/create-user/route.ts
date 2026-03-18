import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { createClient } from '@insforge/sdk';
import { checkRateLimit } from '@/lib/rate-limit';

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, {
    prefix: 'create-user',
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour
  });
  if (rateLimited) return rateLimited;

  try {
    if (!BASE_URL) {
      console.error('[create-user] NEXT_PUBLIC_INSFORGE_BASE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    /* ── 1. Verify the caller is an authenticated owner ────────────── */
    const { userId, token } = await auth();
    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const adminClient = createClient({
      baseUrl: BASE_URL,
      anonKey: ANON_KEY,
      edgeFunctionToken: token,
    });

    const { data: roleData, error: roleError } = await adminClient.database.rpc(
      'get_current_app_role'
    );

    if (roleError || roleData !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can create accounts' },
        { status: 403 }
      );
    }

    /* ── 2. Parse & validate the request body ──────────────────────── */
    const body = await request.json();
    const { name, email, password, role } = body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (role && !['user', 'staff', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    /* ── 3. Create the user via a separate server-side client ──────── */
    const signupClient = createClient({
      baseUrl: BASE_URL,
      anonKey: ANON_KEY,
    });

    const { data: signupData, error: signupError } =
      await signupClient.auth.signUp({
        email: email.trim(),
        password,
        name: name?.trim() || undefined,
      });

    if (signupError) {
      console.error('[create-user] signup failed:', signupError.message);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 400 }
      );
    }

    const newUserId = signupData?.user?.id;

    if (!newUserId) {
      return NextResponse.json(
        { error: 'Account created but user ID was not returned' },
        { status: 500 }
      );
    }

    /* ── 4. Assign the requested role via the admin's session ─────── */
    const targetRole = role || 'staff';

    const { data: assignData, error: assignError } =
      await adminClient.database.rpc('assign_user_role', {
        p_user_id: newUserId,
        p_role: targetRole,
      });

    if (assignError) {
      console.error('[create-user] role assignment failed:', assignError.message);
      return NextResponse.json(
        { error: 'Account created but role assignment failed. Try assigning the role manually.' },
        { status: 207 }
      );
    }

    const assignedUser = Array.isArray(assignData)
      ? assignData[0]
      : assignData;

    return NextResponse.json({
      success: true,
      user: assignedUser,
      requireEmailVerification:
        signupData?.requireEmailVerification ?? false,
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
