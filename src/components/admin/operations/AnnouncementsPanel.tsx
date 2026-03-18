'use client';

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Announcement } from '@/lib/tournament-engine/types';

// ============================================================
// Props
// ============================================================

export interface AnnouncementsPanelProps {
  announcements: Announcement[];
  announcementText: string;
  onAnnouncementTextChange: (value: string) => void;
  announcementsExpanded: boolean;
  onToggleExpanded: () => void;
  postingAnnouncement: boolean;
  onPostAnnouncement: () => void;
  onDeleteAnnouncement: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}

// ============================================================
// Component
// ============================================================

export default function AnnouncementsPanel({
  announcements,
  announcementText,
  onAnnouncementTextChange,
  announcementsExpanded,
  onToggleExpanded,
  postingAnnouncement,
  onPostAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
}: AnnouncementsPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        bgcolor: '#0a0a0a',
        border: '1px solid rgba(212,175,55,0.12)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onToggleExpanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f5f5f0', fontSize: '0.9rem' }}>
            Announcements
          </Typography>
          {announcements.length > 0 && (
            <Chip
              label={announcements.length}
              size="small"
              sx={{
                height: 20,
                minWidth: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: 'rgba(212,175,55,0.15)',
                color: '#D4AF37',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Box>
        {announcementsExpanded ? (
          <ExpandLessIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        ) : (
          <ExpandMoreIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        )}
      </Box>

      {announcementsExpanded && (
        <Box sx={{ px: 2.5, pb: 2 }}>
          {/* Post new */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Post an announcement to players..."
              value={announcementText}
              onChange={(e) => onAnnouncementTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void onPostAnnouncement();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#050505',
                  '& fieldset': { borderColor: 'rgba(212,175,55,0.15)' },
                  '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
                '& input': { color: '#f5f5f0', fontSize: '0.85rem' },
              }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={postingAnnouncement || !announcementText.trim()}
              onClick={onPostAnnouncement}
              sx={{
                bgcolor: '#D4AF37',
                color: '#050505',
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#c5a030' },
                '&:disabled': { bgcolor: 'rgba(212,175,55,0.2)', color: 'rgba(5,5,5,0.5)' },
              }}
            >
              Post
            </Button>
          </Box>

          {/* Announcements list */}
          {announcements.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', textAlign: 'center', py: 2 }}>
              No announcements yet. Post one to notify players.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {announcements.map((ann) => (
                <Box
                  key={ann.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: ann.pinned ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${ann.pinned ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  {ann.pinned && (
                    <PushPinIcon sx={{ color: '#D4AF37', fontSize: 16, mt: 0.25, flexShrink: 0 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#f5f5f0', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                      {ann.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                      {new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                    <IconButton
                      size="small"
                      onClick={() => onTogglePin(ann.id, !ann.pinned)}
                      sx={{
                        color: ann.pinned ? '#D4AF37' : 'text.secondary',
                        '&:hover': { color: '#D4AF37' },
                      }}
                    >
                      <PushPinIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: '#ef5350' },
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
