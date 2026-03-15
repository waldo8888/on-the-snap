// ============================================================
// Core Tournament Types
// ============================================================

export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type GameType = '8-ball' | '9-ball' | '10-ball' | 'straight_pool' | 'scotch_doubles';
export type TournamentStatus = 'draft' | 'open' | 'check_in' | 'live' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
export type BracketSide = 'winners' | 'losers' | 'finals' | 'round_robin';

// ============================================================
// Database Row Types (match InsForge schema)
// ============================================================

export interface Tournament {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: TournamentFormat;
  game_type: GameType;
  race_to: number;
  alternate_break: boolean;
  max_participants: number | null;
  entry_fee: number;
  venue_name: string;
  venue_address: string | null;
  registration_open_at: string | null;
  registration_close_at: string | null;
  tournament_start_at: string;
  late_entry_cutoff_at: string | null;
  check_in_required: boolean;
  status: TournamentStatus;
  published: boolean;
  rules: string | null;
  prize_notes: string | null;
  bracket_generated_at: string | null;
  total_rounds: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  tournament_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  seed: number | null;
  checked_in: boolean;
  checked_in_at: string | null;
  handicap: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  bracket_side: BracketSide;
  round_number: number;
  name: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round_id: string;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  table_number: number | null;
  status: MatchStatus;
  bracket_position: number | null;
  next_match_id: string | null;
  next_match_slot: number | null;
  loser_next_match_id: string | null;
  loser_next_match_slot: number | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  tournament_id: string;
  message: string;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  role: 'owner' | 'staff';
  created_at: string;
  updated_at: string;
}

// ============================================================
// Engine Types (used by bracket generation, not stored directly)
// ============================================================

export interface SeedEntry {
  participantId: string;
  seed: number;
  name: string;
}

export interface GeneratedMatch {
  match_number: number;
  player1_seed: number | null; // seed number or null for TBD
  player2_seed: number | null;
  bracket_position: number;
  next_match_number: number | null;
  next_match_slot: number | null; // 1 or 2
  loser_next_match_number: number | null; // DE only
  loser_next_match_slot: number | null;
  is_bye: boolean;
}

export interface GeneratedRound {
  round_number: number;
  bracket_side: BracketSide;
  name: string;
  matches: GeneratedMatch[];
}

export interface GeneratedBracket {
  rounds: GeneratedRound[];
  total_rounds: number;
}

// ============================================================
// Match Update (returned by advancement logic)
// ============================================================

export interface MatchUpdate {
  matchId?: string;
  match_number?: number; // used before DB IDs exist
  player1_id?: string | null;
  player2_id?: string | null;
  winner_id?: string | null;
  player1_score?: number | null;
  player2_score?: number | null;
  status?: MatchStatus;
  completed_at?: string | null;
  started_at?: string | null;
}

// ============================================================
// Tournament with relations (for queries with joins)
// ============================================================

export interface TournamentWithDetails extends Tournament {
  participants?: Participant[];
  rounds?: (Round & { matches?: Match[] })[];
}

export interface MatchWithPlayers extends Match {
  player1?: Participant | null;
  player2?: Participant | null;
  winner?: Participant | null;
  round?: Round | null;
}
