// ============================================================
// Core Tournament Types
// ============================================================

export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type GameType = '8-ball' | '9-ball' | '10-ball' | 'straight_pool' | 'scotch_doubles';
export type TournamentStatus = 'draft' | 'open' | 'check_in' | 'live' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
export type BracketSide = 'winners' | 'losers' | 'finals' | 'round_robin';
export type SeasonStatus = 'draft' | 'active' | 'completed';

// ============================================================
// Database Row Types (match InsForge schema)
// ============================================================

export interface Tournament {
  id: string;
  slug: string;
  season_id: string | null;
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
  player_id: string | null;
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

export interface Player {
  id: string;
  display_name: string;
  normalized_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface League {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  game_type: GameType | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  league_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: SeasonStatus;
  published: boolean;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeasonLeaderboardEntry extends PlayerCareerStats {
  season_id: string;
  league_id: string;
  points: number;
}

export interface ScorekeeperStation {
  id: string;
  tournament_id: string;
  table_number: number;
  label: string | null;
  pin_hash: string;
  active: boolean;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ScorekeeperStationSummary = Omit<ScorekeeperStation, 'pin_hash'>;

export interface PlayerCareerStats {
  player_id: string;
  display_name: string;
  tournaments_played: number;
  matches_played: number;
  match_wins: number;
  match_losses: number;
  win_rate: number;
  titles: number;
  runner_ups: number;
  last_played_at: string | null;
}

export interface PlayerLeaderboardEntry extends PlayerCareerStats {
  points: number;
}

export interface PlayerProfileSummary {
  favorite_game_type: GameType | null;
  best_finish: number | null;
  last_five_form: Array<'W' | 'L'>;
}

export interface PlayerTournamentHistoryEntry {
  tournament_id: string;
  tournament_slug: string;
  tournament_title: string;
  tournament_format: TournamentFormat;
  tournament_game_type: GameType;
  tournament_status: TournamentStatus;
  tournament_start_at: string;
  participant_id: string;
  participant_name: string;
  participant_seed: number | null;
  final_place: number | null;
  recent_result: string | null;
}

export interface PlayerMatchHistoryEntry extends Match {
  tournament_slug: string;
  tournament_title: string;
  opponent_name: string;
  opponent_player_id: string | null;
  result: 'win' | 'loss';
  scoreline: string | null;
}

export interface PlayerProfileData {
  player: Player;
  stats: PlayerCareerStats;
  tournaments: PlayerTournamentHistoryEntry[];
  matches: PlayerMatchHistoryEntry[];
  summary: PlayerProfileSummary;
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
  season?: Season | null;
  league?: League | null;
  participants?: Participant[];
  rounds?: (Round & { matches?: Match[] })[];
}

export interface LeagueWithDetails extends League {
  seasons?: Season[];
  activeSeason?: Season | null;
  recentTournaments?: Tournament[];
  standingsPreview?: SeasonLeaderboardEntry[];
}

export interface SeasonWithDetails extends Season {
  league?: League | null;
  tournaments?: Tournament[];
  standings?: SeasonLeaderboardEntry[];
}

export interface MatchWithPlayers extends Match {
  player1?: Participant | null;
  player2?: Participant | null;
  winner?: Participant | null;
  round?: Round | null;
}
