
import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Paper
} from '@mui/material';
import {
    PeopleAlt as UsersIcon,
    FlightTakeoff as FlightsIcon,
    Comment as FeedbackIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" component="div">
                        {value}
                    </Typography>
                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                </Box>
                <Box sx={{
                    backgroundColor: `${color}20`,
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {React.cloneElement(icon, { sx: { color: color, fontSize: 30 } })}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const DashboardStats = () => {
    const [stats, setStats] = useState({
        userCount: 0,
        sessionCount: 0,
        feedbackCount: 0,
        activeUsers: [] // This could be chart data
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const [usersRes, sessionsRes, feedbackRes] = await Promise.all([
                    axios.get(`${apiUrl}/users`),
                    axios.get(`${apiUrl}/sessions`),
                    axios.get(`${apiUrl}/feedback`)
                ]);

                // Process data for chart - Sessions per user
                const sessionsByUser = {};
                sessionsRes.data.forEach(session => {
                    sessionsByUser[session.username] = (sessionsByUser[session.username] || 0) + 1;
                });

                const chartData = Object.keys(sessionsByUser).map(username => ({
                    name: username,
                    sessions: sessionsByUser[username]
                })).slice(0, 10); // Top 10 users

                setStats({
                    userCount: usersRes.data.length,
                    sessionCount: sessionsRes.data.length,
                    feedbackCount: feedbackRes.data.length,
                    chartData
                });
            } catch (error) {
                console.error("Error loading stats:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
                Overview
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        title="Total Users"
                        value={stats.userCount}
                        icon={<UsersIcon />}
                        color="#90caf9" // Blue
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        title="Total Sessions"
                        value={stats.sessionCount}
                        icon={<FlightsIcon />}
                        color="#a5d6a7" // Green
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        title="Feedback Received"
                        value={stats.feedbackCount}
                        icon={<FeedbackIcon />}
                        color="#f48fb1" // Pink
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>
                            Top Active Users (Sessions)
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                width={500}
                                height={300}
                                data={stats.chartData}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }} />
                                <Legend />
                                <Bar dataKey="sessions" fill="#8884d8" name="Flight Sessions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

        </Box>
    );
};

export default DashboardStats;
