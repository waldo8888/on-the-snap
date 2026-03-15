import type { Participant } from './tournament-engine/types';

export const PARTICIPANT_IMPORT_HEADERS = [
  'name',
  'email',
  'phone',
  'handicap',
  'seed',
  'notes',
  'checked_in',
] as const;

type SupportedParticipantImportHeader = (typeof PARTICIPANT_IMPORT_HEADERS)[number];

export interface ParticipantImportRowInput {
  [key: string]: string | undefined;
}

export interface ParticipantImportNormalizedRow {
  name: string;
  email: string | null;
  phone: string | null;
  handicap: number;
  seed: number | null;
  notes: string | null;
  checked_in: boolean;
}

export interface ParticipantImportPreviewRow {
  rowNumber: number;
  raw: ParticipantImportRowInput;
  normalized: ParticipantImportNormalizedRow;
  errors: string[];
  warnings: string[];
}

export interface ParticipantImportValidationResult {
  headers: string[];
  unsupportedHeaders: string[];
  rows: ParticipantImportPreviewRow[];
  canImport: boolean;
}

function normalizeName(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function normalizeEmail(value?: string) {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

function normalizePhone(value?: string) {
  const digits = value?.replace(/\D/g, '');
  return digits ? digits : null;
}

function parseCheckedIn(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return ['true', 'yes', 'y', '1', 'checked', 'checked_in'].includes(normalized);
}

function parseInteger(value?: string) {
  if (!value || value.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getImportableParticipantRows(
  rows: ParticipantImportPreviewRow[],
  includeWarnings: boolean
) {
  return rows.filter((row) => {
    if (row.errors.length > 0) {
      return false;
    }

    if (!includeWarnings && row.warnings.length > 0) {
      return false;
    }

    return true;
  });
}

export function validateParticipantImportRows(
  parsedRows: ParticipantImportRowInput[],
  existingParticipants: Participant[],
  headers: string[]
): ParticipantImportValidationResult {
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const unsupportedHeaders = normalizedHeaders.filter(
    (header): header is string =>
      !PARTICIPANT_IMPORT_HEADERS.includes(header as SupportedParticipantImportHeader)
  );

  const existingEmailSet = new Set(
    existingParticipants.map((participant) => normalizeEmail(participant.email ?? undefined)).filter(Boolean)
  );
  const existingPhoneSet = new Set(
    existingParticipants.map((participant) => normalizePhone(participant.phone ?? undefined)).filter(Boolean)
  );
  const existingNameSet = new Set(
    existingParticipants.map((participant) => normalizeName(participant.name).toLowerCase()).filter(Boolean)
  );

  const fileEmailSet = new Set<string>();
  const filePhoneSet = new Set<string>();
  const fileNameSet = new Set<string>();

  const rows = parsedRows.map((rawRow, index) => {
    const normalized: ParticipantImportNormalizedRow = {
      name: normalizeName(rawRow.name),
      email: normalizeEmail(rawRow.email),
      phone: normalizePhone(rawRow.phone),
      handicap: parseInteger(rawRow.handicap) ?? 0,
      seed: parseInteger(rawRow.seed),
      notes: rawRow.notes?.trim() ? rawRow.notes.trim() : null,
      checked_in: parseCheckedIn(rawRow.checked_in),
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!normalized.name) {
      errors.push('Name is required');
    }

    if (rawRow.handicap && rawRow.handicap.trim() !== '' && parseInteger(rawRow.handicap) === null) {
      errors.push('Handicap must be a whole number');
    }

    if (normalized.handicap < 0) {
      errors.push('Handicap cannot be negative');
    }

    if (rawRow.seed && rawRow.seed.trim() !== '' && parseInteger(rawRow.seed) === null) {
      errors.push('Seed must be a whole number');
    }

    if (normalized.seed !== null && normalized.seed < 1) {
      errors.push('Seed must be 1 or greater');
    }

    if (normalized.email && existingEmailSet.has(normalized.email)) {
      errors.push('Email already exists in this tournament');
    }

    if (normalized.phone && existingPhoneSet.has(normalized.phone)) {
      errors.push('Phone already exists in this tournament');
    }

    if (normalized.email) {
      if (fileEmailSet.has(normalized.email)) {
        errors.push('Email is duplicated in this CSV');
      }
      fileEmailSet.add(normalized.email);
    }

    if (normalized.phone) {
      if (filePhoneSet.has(normalized.phone)) {
        errors.push('Phone is duplicated in this CSV');
      }
      filePhoneSet.add(normalized.phone);
    }

    const normalizedName = normalized.name.toLowerCase();
    if (normalizedName) {
      if (existingNameSet.has(normalizedName) && !normalized.email && !normalized.phone) {
        warnings.push('Name matches an existing participant and will be skipped by default');
      }

      if (fileNameSet.has(normalizedName) && !normalized.email && !normalized.phone) {
        warnings.push('Name is duplicated in this CSV and will be skipped by default');
      }

      fileNameSet.add(normalizedName);
    }

    return {
      rowNumber: index + 2,
      raw: rawRow,
      normalized,
      errors,
      warnings,
    } satisfies ParticipantImportPreviewRow;
  });

  return {
    headers: normalizedHeaders,
    unsupportedHeaders,
    rows,
    canImport:
      unsupportedHeaders.length === 0 &&
      rows.some((row) => row.errors.length === 0 && row.warnings.length === 0),
  };
}
