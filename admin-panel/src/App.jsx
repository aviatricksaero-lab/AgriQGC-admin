import React, { useState } from 'react';
import DescriptionIcon from '@mui/icons-material/Description';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    CssBaseline,
    ThemeProvider,
    createTheme,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    alpha
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    FlightTakeoff as FlightIcon,
    Feedback as FeedbackIcon,
    Map as MapIcon,
    AdminPanelSettings as AdminIcon,
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    Notifications as NotificationsIcon,
    Brightness4 as DarkIcon,
    Shield as ShieldIcon,
    Tune as TuneIcon
} from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import UsersTable from './components/UsersTable';
import SessionsTable from './components/SessionsTable';
import FeedbackList from './components/FeedbackList';
import DashboardStats from './components/DashboardStats';
import AirspaceManager from './components/AirspaceManager';
import Document from './components/Document';
import MissionViewer from './components/MissionViewer';
import GlobalMapViewer from './components/GlobalMapViewer';
import AppDefaultsSettings from './components/AppDefaultsSettings';
import FailsafeDefaultsSettings from './components/FailsafeDefaultsSettings';

const drawerWidth = 260;
const collapsedWidth = 72;
 
const lightTheme = createTheme({
// ... (abbreviated theme section)
    palette: {
        mode: 'light',
        primary: {
            main: '#10B981', // Emerald - Agri vibe
            light: '#34D399',
            dark: '#059669',
        },
        secondary: {
            main: '#6366F1', // Indigo
            light: '#818CF8',
        },
        background: {
            default: '#F1F5F9',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#0F172A',
            secondary: '#64748B',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Inter", sans-serif',
        h4: { fontWeight: 800, letterSpacing: '-0.02em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600 },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '8px 20px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 700,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                },
            },
        },
    },
});

import SvgIcon from '@mui/material/SvgIcon';

function DroneIcon(props) {
    return (
        <SvgIcon {...props}>
            <path d="M19.5,9.5L14.25,12.25L17,17.5L12.25,14.75L7.5,17.5L10.25,12.25L5,9.5L7.5,8L12.25,10.75L17,8L19.5,9.5M12.25,5.5C13.17,5.5 13.92,6.27 13.92,7.19C13.92,8.12 13.17,8.86 12.25,8.86C11.33,8.86 10.58,8.12 10.58,7.19C10.58,6.27 11.33,5.5 12.25,5.5Z" />
        </SvgIcon>
    );
}

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', color: '#10B981' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users', color: '#6366F1' },
    { text: 'Sessions', icon: <DroneIcon />, path: '/sessions', color: '#F59E0B' },
    { text: 'Feedback', icon: <FeedbackIcon />, path: '/feedback', color: '#EC4899' },
    { text: 'Airspace', icon: <MapIcon />, path: '/airspace', color: '#EF4444' },
    { text: 'Map', icon: <MapIcon />, path: '/map', color: '#3B82F6' },
    { text: 'Missions', icon: <DroneIcon />, path: '/missions', color: '#10B981' },
    { text: 'Documents', icon: <DescriptionIcon />, path: '/documents', color: '#8B5CF6' },
    { text: 'App Defaults', icon: <TuneIcon />, path: '/app-defaults', color: '#059669' },
    { text: 'Failsafe Defaults', icon: <ShieldIcon />, path: '/failsafe-defaults', color: '#EF4444' },
];

function Navigation({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const currentMenuItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9' }}>
            <CssBaseline />

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: collapsed ? collapsedWidth : drawerWidth,
                    flexShrink: 0,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '& .MuiDrawer-paper': {
                        width: collapsed ? collapsedWidth : drawerWidth,
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                        backdropFilter: 'blur(16px)',
                        border: 'none',
                        borderRight: '1px solid #E2E8F0',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    },
                }}
            >
                {/* Logo */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 2.5,
                    gap: 1.5,
                    borderBottom: '1px solid #E2E8F0',
                    minHeight: 70,
                }}>
                    <Box sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10B981, #6366F1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                    }}>
                        <ShieldIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    {!collapsed && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ color: '#0F172A', fontWeight: 800, lineHeight: 1.2, fontSize: '0.95rem' }}>
                                QGC (Agri)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                                ADMIN PANEL
                            </Typography>
                        </Box>
                    )}
                    {!collapsed && (
                        <IconButton
                            onClick={() => setCollapsed(true)}
                            size="small"
                            sx={{ ml: 'auto', color: 'text.secondary', '&:hover': { color: '#0F172A' } }}
                        >
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>

                {collapsed && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <IconButton
                            onClick={() => setCollapsed(false)}
                            size="small"
                            sx={{ color: 'text.secondary', '&:hover': { color: '#0F172A' } }}
                        >
                            <MenuIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}

                {/* Nav Items */}
                <Box sx={{ overflow: 'auto', flex: 1, py: 2, px: 1.5 }}>
                    {!collapsed && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', px: 1, pb: 1, display: 'block', letterSpacing: '0.1em', fontWeight: 600 }}>
                            MAIN MENU
                        </Typography>
                    )}
                    <List disablePadding>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                    <Tooltip title={collapsed ? item.text : ''} placement="right">
                                        <ListItemButton
                                            selected={isActive}
                                            onClick={() => navigate(item.path)}
                                            sx={{
                                                borderRadius: '10px',
                                                py: 1.2,
                                                px: collapsed ? 1 : 1.5,
                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                                background: isActive
                                                    ? `linear-gradient(135deg, ${alpha(item.color, 0.12)}, ${alpha(item.color, 0.04)})`
                                                    : 'transparent',
                                                border: isActive ? `1px solid ${alpha(item.color, 0.3)}` : '1px solid transparent',
                                                '&:hover': {
                                                    background: `linear-gradient(135deg, ${alpha(item.color, 0.08)}, ${alpha(item.color, 0.02)})`,
                                                    border: `1px solid ${alpha(item.color, 0.2)}`,
                                                },
                                                '&.Mui-selected': {
                                                    background: `linear-gradient(135deg, ${alpha(item.color, 0.12)}, ${alpha(item.color, 0.04)})`,
                                                },
                                                '&.Mui-selected:hover': {
                                                    background: `linear-gradient(135deg, ${alpha(item.color, 0.16)}, ${alpha(item.color, 0.06)})`,
                                                },
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <ListItemIcon sx={{
                                                minWidth: collapsed ? 0 : 36,
                                                color: isActive ? item.color : 'text.secondary',
                                                transition: 'color 0.2s',
                                            }}>
                                                {item.icon}
                                            </ListItemIcon>
                                            {!collapsed && (
                                                <ListItemText
                                                    primary={item.text}
                                                    primaryTypographyProps={{
                                                        fontWeight: isActive ? 700 : 500,
                                                        fontSize: '0.88rem',
                                                        color: isActive ? '#0F172A' : 'text.secondary',
                                                    }}
                                                />
                                            )}
                                            {!collapsed && isActive && (
                                                <Box sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: item.color,
                                                    boxShadow: `0 0 8px ${item.color}`,
                                                 }} />
                                            )}
                                        </ListItemButton>
                                    </Tooltip>
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>

                {/* Footer */}
                <Box sx={{
                    p: 2,
                    borderTop: '1px solid #E2E8F0',
                }}>
                    {!collapsed ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                            <Avatar sx={{
                                width: 32,
                                height: 32,
                                background: 'linear-gradient(135deg, #10B981, #6366F1)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: 'white',
                                border: '2px solid rgba(16, 185, 129, 0.2)',
                            }}>
                                A
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#0F172A', fontWeight: 700, display: 'block' }}>
                                    Admin
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    Super Admin
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Avatar sx={{
                                width: 32,
                                height: 32,
                                background: 'linear-gradient(135deg, #10B981, #6366F1)',
                                fontSize: '0.8rem',
                                color: 'white',
                                border: '2px solid rgba(16, 185, 129, 0.2)',
                            }}>
                                A
                            </Avatar>
                        </Box>
                    )}
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top Bar */}
                <AppBar
                    position="static"
                    elevation={0}
                    sx={{
                        background: '#FFFFFF',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                >
                    <Toolbar sx={{ gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                                {currentMenuItem.text}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                QGC (Agri) Admin Dashboard
                            </Typography>
                        </Box>
                        <Chip
                            label="Live"
                            size="small"
                            sx={{
                                bgcolor: alpha('#10B981', 0.08),
                                color: '#10B981',
                                border: `1px solid ${alpha('#10B981', 0.2)}`,
                                '& .MuiChip-label': { fontWeight: 600, fontSize: '0.7rem' },
                                '&::before': {
                                    content: '""',
                                    display: 'inline-block',
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: '#10B981',
                                    mr: 0.5,
                                    animation: 'pulse 2s infinite',
                                }
                            }}
                        />
                    </Toolbar>
                </AppBar>

                {/* Page Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

function App() {
    return (
        <ThemeProvider theme={lightTheme}>
            <Router>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        },
                    }}
                />
                <Navigation>
                    <Routes>
                        <Route path="/" element={<DashboardStats />} />
                        <Route path="/users" element={<UsersTable />} />
                        <Route path="/sessions" element={<SessionsTable />} />
                        <Route path="/feedback" element={<FeedbackList />} />
                        <Route path="/airspace" element={<AirspaceManager />} />
                        <Route path="/map" element={<GlobalMapViewer />} />
                        <Route path="/missions" element={<MissionViewer />} />
                        <Route path="/documents" element={<Document />} />
                        <Route path="/app-defaults" element={<AppDefaultsSettings />} />
                        <Route path="/failsafe-defaults" element={<FailsafeDefaultsSettings />} />
                    </Routes>
                </Navigation>
            </Router>
        </ThemeProvider>
    );
}

export default App;
