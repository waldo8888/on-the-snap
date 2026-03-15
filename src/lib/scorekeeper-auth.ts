import 'server-only';

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const SCOREKEEPER_SESSION_COOKIE = 'ots_scorekeeper_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SCOREKEEPER_SESSION_SECRET_ERROR =
  'SCOREKEEPER_SESSION_SECRET is required for scorekeeper PINs and sessions.';

export interface ScorekeeperSessionPayload {
  stationId: string;
  tournamentId: string;
  tableNumber: number;
  exp: number;
}

export class ScorekeeperConfigError extends Error {
  constructor(message = SCOREKEEPER_SESSION_SECRET_ERROR) {
    super(message);
    this.name = 'ScorekeeperConfigError';
  }
}

export function isScorekeeperConfigError(error: unknown): error is ScorekeeperConfigError {
  return error instanceof ScorekeeperConfigError;
}

function getOptionalSessionSecret() {
  return process.env.SCOREKEEPER_SESSION_SECRET?.trim() || null;
}

function getSessionSecret() {
  const secret = getOptionalSessionSecret();

  if (!secret) {
    throw new ScorekeeperConfigError();
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string, secret = getSessionSecret()) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function generateScorekeeperPin() {
  return String(randomInt(100000, 1000000));
}

export function hashScorekeeperPin(stationId: string, pin: string) {
  return createHmac('sha256', getSessionSecret())
    .update(`${stationId}:${pin}`)
    .digest('hex');
}

export function verifyScorekeeperPin(
  stationId: string,
  pin: string,
  expectedHash: string
) {
  const actualHash = hashScorekeeperPin(stationId, pin);

  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function createScorekeeperSessionValue(
  payload: Omit<ScorekeeperSessionPayload, 'exp'>
) {
  const body = JSON.stringify({
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  } satisfies ScorekeeperSessionPayload);
  const encoded = toBase64Url(body);
  return `${encoded}.${signValue(encoded)}`;
}

export function parseScorekeeperSessionValue(
  value?: string | null
): ScorekeeperSessionPayload | null {
  if (!value) {
    return null;
  }

  const secret = getOptionalSessionSecret();
  if (!secret) {
    return null;
  }

  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expected = signValue(encoded, secret);
  const provided = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as ScorekeeperSessionPayload;
    if (
      typeof parsed.stationId !== 'string' ||
      typeof parsed.tournamentId !== 'string' ||
      typeof parsed.tableNumber !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getScorekeeperSessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt ?? new Date(Date.now() + SESSION_TTL_MS),
  };
}
