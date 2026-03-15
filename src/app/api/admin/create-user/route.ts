import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { createClient } from '@insforge/sdk';

const BASE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  'https://d5tkh9er.us-east.insforge.app';
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: signupError.message || 'Failed to create account' },
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
      return NextResponse.json(
        {
          error: `Account created but role assignment failed: ${assignError.message}`,
          userId: newUserId,
        },
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
