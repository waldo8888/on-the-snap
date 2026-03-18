import { notFound } from 'next/navigation';
import { Box, Container, Typography, Chip, Button, Paper, Divider, Grid } from '@mui/material';
import Navbar from '@/components/Navbar';
import { getTournamentBySlug, getTournaments } from '@/lib/tournaments';
import { SportsEventJsonLd, BreadcrumbJsonLd } from '@/lib/json-ld';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import SportsIcon from '@mui/icons-material/Sports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Link from 'next/link';
import TournamentDetailTabs from './TournamentDetailTabs';
import TournamentRegistrationCard from './TournamentRegistrationCard';
import ShareButton from '@/components/tournament/ShareButton';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const tournaments = await getTournaments({ published: true });
    return tournaments.map((t) => ({ slug: t.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug);
  if (!tournament) return { title: 'Tournament Not Found | On The Snap' };
  return {
    title: `${tournament.title} | On The Snap`,
    description: tournament.description || `${tournament.title} - ${formatGameType(tournament.game_type)} tournament at On The Snap`,
  };
}

function formatGameType(gt: string): string {
  return gt.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatTournamentFormat(fmt: string): string {
  return fmt.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <Chip
        label="LIVE"
        size="small"
        sx={{
          bgcolor: '#D4AF37',
          color: '#111',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          animation: 'pulse-live 2s ease-in-out infinite',
          '@keyframes pulse-live': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.5)' },
            '50%': { boxShadow: '0 0 12px 4px rgba(57,168,122,0.4)' },
          },
        }}
      />
    );
  }
  if (status === 'open' || status === 'check_in') {
    return (
      <Chip
        label="UPCOMING"
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'rgba(100,160,255,0.6)',
          color: 'rgba(100,160,255,0.9)',
          fontWeight: 600,
          fontSize: '0.65rem',
        }}
      />
    );
  }
  if (status === 'completed') {
    return (
      <Chip
        label="COMPLETED"
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'rgba(160,160,160,0.4)',
          color: '#a0a0a0',
          fontWeight: 600,
          fontSize: '0.65rem',
        }}
      />
    );
  }
  return (
    <Chip
      label={status.toUpperCase()}
      size="small"
      variant="outlined"
      sx={{ borderColor: 'rgba(160,160,160,0.3)', color: '#a0a0a0', fontWeight: 600, fontSize: '0.65rem' }}
    />
  );
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rawTournament = await getTournamentBySlug(slug);

  if (!rawTournament) {
    notFound();
  }

  // Ensure all data is serializable for the client component boundary
  const tournament = JSON.parse(JSON.stringify(rawTournament));
  const participantCount = tournament.participants?.length || 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SportsEventJsonLd(rawTournament)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            BreadcrumbJsonLd([
              { name: 'Home', url: 'https://onthesnap.ca' },
              { name: 'Tournaments', url: 'https://onthesnap.ca/tournaments' },
              { name: rawTournament.title, url: `https://onthesnap.ca/tournaments/${slug}` },
            ])
          ),
        }}
      />
      <Navbar />

      <Container maxWidth="lg" sx={{ pt: { xs: 12, md: 16 }, pb: 10 }}>
        {/* Back Link */}
        <Link href="/tournaments" style={{ textDecoration: 'none' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            sx={{
              color: '#a0a0a0',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.85rem',
              textTransform: 'none',
              mb: 4,
              '&:hover': { color: '#D4AF37' },
            }}
          >
            Back to Tournaments
          </Button>
        </Link>

        {/* Tournament Header */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <StatusBadge status={tournament.status} />
            <ShareButton />
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Chip
                icon={<SportsIcon sx={{ fontSize: 14, color: '#39a87a !important' }} />}
                label={formatGameType(tournament.game_type)}
                size="small"
                sx={{
                  bgcolor: 'rgba(57,168,122,0.1)',
                  color: '#39a87a',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  height: 24,
                }}
              />
              <Chip
                label={formatTournamentFormat(tournament.format)}
                size="small"
                sx={{
                  bgcolor: 'rgba(212,175,55,0.08)',
                  color: 'rgba(212,175,55,0.8)',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  height: 24,
                }}
              />
            </Box>
          </Box>

          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '3rem' },
              color: '#f5f5f0',
              mb: 1,
              lineHeight: 1.2,
            }}
          >
            {tournament.title}
          </Typography>

          {tournament.description && (
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                color: '#a0a0a0',
                fontSize: '1rem',
                maxWidth: 700,
                lineHeight: 1.6,
              }}
            >
              {tournament.description}
            </Typography>
          )}
        </Box>

        {/* Info Section: 2 Column Layout */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Left Column: Description & Rules */}
          <Grid size={{ xs: 12, md: 7 }}>
            {tournament.rules && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#111111',
                  border: '1px solid rgba(212,175,55,0.12)',
                  borderRadius: 2,
                  mb: 3,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 600,
                    color: '#f5f5f0',
                    mb: 2,
                    fontSize: '1.1rem',
                  }}
                >
                  Rules
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    color: '#a0a0a0',
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {tournament.rules}
                </Typography>
              </Paper>
            )}

            {tournament.prize_notes && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#111111',
                  border: '1px solid rgba(212,175,55,0.12)',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmojiEventsIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: 600,
                      color: '#f5f5f0',
                      fontSize: '1.1rem',
                    }}
                  >
                    Prizes & Payouts
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    color: '#a0a0a0',
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {tournament.prize_notes}
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* Right Column: Details Card */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: '#111111',
                border: '1px solid rgba(212,175,55,0.12)',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: '#f5f5f0',
                  mb: 2.5,
                  fontSize: '1.1rem',
                }}
              >
                Tournament Details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <DetailRow
                  icon={<CalendarTodayIcon sx={{ fontSize: 16, color: '#D4AF37' }} />}
                  label="Date"
                  value={formatDate(tournament.tournament_start_at)}
                />
                <DetailRow
                  icon={<CalendarTodayIcon sx={{ fontSize: 16, color: '#D4AF37' }} />}
                  label="Time"
                  value={formatTime(tournament.tournament_start_at)}
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                <DetailRow
                  icon={<SportsIcon sx={{ fontSize: 16, color: '#39a87a' }} />}
                  label="Game"
                  value={formatGameType(tournament.game_type)}
                />
                <DetailRow
                  icon={<EmojiEventsIcon sx={{ fontSize: 16, color: '#D4AF37' }} />}
                  label="Format"
                  value={formatTournamentFormat(tournament.format)}
                />
                <DetailRow
                  label="Race To"
                  value={`${tournament.race_to}`}
                />
                {tournament.alternate_break && (
                  <DetailRow label="Breaking" value="Alternate Break" />
                )}
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                <DetailRow
                  icon={<GroupIcon sx={{ fontSize: 16, color: '#a0a0a0' }} />}
                  label="Players"
                  value={
                    tournament.max_participants
                      ? `${participantCount} / ${tournament.max_participants}`
                      : `${participantCount} Registered`
                  }
                />
                {tournament.entry_fee > 0 && (
                  <DetailRow
                    label="Entry Fee"
                    value={`$${tournament.entry_fee}`}
                    valueColor="#D4AF37"
                  />
                )}
                <DetailRow label="Venue" value={tournament.venue_name} />
                {tournament.venue_address && (
                  <DetailRow label="Address" value={tournament.venue_address} />
                )}
              </Box>

              {/* Fullscreen Bracket Link */}
              {(tournament.status === 'live' || tournament.status === 'completed') &&
                tournament.rounds &&
                tournament.rounds.length > 0 && (
                  <Link href={`/tournaments/${tournament.slug}/bracket`} style={{ textDecoration: 'none' }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        mt: 3,
                        borderColor: 'rgba(212,175,55,0.3)',
                        color: '#D4AF37',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#D4AF37',
                          bgcolor: 'rgba(212,175,55,0.06)',
                        },
                      }}
                    >
                      View Fullscreen Bracket
                    </Button>
                  </Link>
                )}
            </Paper>

            {(tournament.status === 'open' || tournament.status === 'check_in') && (
              <TournamentRegistrationCard
                tournament={tournament}
                participantCount={participantCount}
              />
            )}
          </Grid>
        </Grid>

        {/* Tabs Section */}
        <TournamentDetailTabs tournament={tournament} />
      </Container>
    </Box>
  );
}

// ── Detail Row ──

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      {icon && <Box sx={{ mt: '2px' }}>{icon}</Box>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.72rem',
            color: 'rgba(160,160,160,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
            mb: 0.25,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.9rem',
            color: valueColor || '#f5f5f0',
            fontWeight: 500,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
