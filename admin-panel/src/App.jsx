
import React, { useState, useEffect } from 'react';
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
    Grid,
    Paper,
    Card,
    CardContent
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Flight as FlightIcon,
    Feedback as FeedbackIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast'; // Assuming we might add this later, or use MUI Snackbar, but let's keep it simple for now

// Components
import UsersTable from './components/UsersTable';
import SessionsTable from './components/SessionsTable';
import FeedbackList from './components/FeedbackList';
import DashboardStats from './components/DashboardStats';

const drawerWidth = 240;

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#90caf9',
        },
        secondary: {
            main: '#f48fb1',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 500,
        }
    }
});

function Navigation({ children }) {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        { text: 'Users', icon: <PeopleIcon />, path: '/users' },
        { text: 'Sessions', icon: <FlightIcon />, path: '/sessions' },
        { text: 'Feedback', icon: <FeedbackIcon />, path: '/feedback' },
    ];

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar postion="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <FlightIcon sx={{ mr: 2 }} />
                        QGroundControl Admin
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        {menuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton
                                    selected={location.pathname === item.path}
                                    onClick={() => navigate(item.path)}
                                >
                                    <ListItemIcon>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}

function App() {
    return (
        <ThemeProvider theme={darkTheme}>
            <Router>
                <Navigation>
                    <Routes>
                        <Route path="/" element={<DashboardStats />} />
                        <Route path="/users" element={<UsersTable />} />
                        <Route path="/sessions" element={<SessionsTable />} />
                        <Route path="/feedback" element={<FeedbackList />} />
                    </Routes>
                </Navigation>
            </Router>
        </ThemeProvider>
    );
}

export default App;
