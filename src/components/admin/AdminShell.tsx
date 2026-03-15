'use client';

import { useState } from 'react';
import { useAuth } from '@insforge/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { AdminRole } from '@/lib/admin-auth';

const DRAWER_WIDTH = 260;

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    displayName: string;
    role: AdminRole;
  };
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
    { label: 'Tournaments', path: '/admin/tournaments', icon: <EmojiEventsIcon /> },
    { label: 'New Tournament', path: '/admin/tournaments/new', icon: <AddIcon /> },
    ...(user.role === 'owner'
      ? [
          {
            label: 'User Access',
            path: '/admin/users',
            icon: <AdminPanelSettingsIcon />,
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SportsBarIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'var(--font-playfair), serif',
            fontWeight: 700,
            color: 'primary.main',
            fontSize: '1.1rem',
          }}
        >
          On The Snap
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{
          px: 2.5,
          pb: 1,
          color: 'text.secondary',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontSize: '0.65rem',
        }}
      >
        Tournament Admin
      </Typography>

      <Divider sx={{ borderColor: 'rgba(212,175,55,0.15)' }} />

      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => {
                router.push(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.5,
                bgcolor: isActive ? 'rgba(212,175,55,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid' : '3px solid transparent',
                borderColor: isActive ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: 'rgba(212,175,55,0.08)' },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'text.primary',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(212,175,55,0.15)' }} />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            color: '#050505',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {user.displayName[0]?.toUpperCase() || user.email[0]?.toUpperCase() || 'A'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
            {user.displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }} noWrap>
            {user.email}
          </Typography>
        </Box>
        <Chip
          label={user.role}
          size="small"
          sx={{
            bgcolor: 'rgba(212,175,55,0.12)',
            color: 'primary.main',
            border: '1px solid rgba(212,175,55,0.2)',
            textTransform: 'capitalize',
            fontSize: '0.65rem',
          }}
        />
        <IconButton size="small" onClick={handleSignOut} sx={{ color: 'text.secondary' }}>
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#050505' }}>
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: '#0a0a0a',
              borderRight: '1px solid rgba(212,175,55,0.1)',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: '#0a0a0a',
              borderRight: '1px solid rgba(212,175,55,0.1)',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isMobile && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid rgba(212,175,55,0.1)' }}
          >
            <Toolbar>
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: 'primary.main' }}>
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'var(--font-playfair)',
                  fontWeight: 700,
                  color: 'primary.main',
                  fontSize: '1rem',
                }}
              >
                Tournament Admin
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, width: '100%', mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
