import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Paper,
    Skeleton,
    Alert,
    Divider,
    Chip,
    CircularProgress
} from '@mui/material';
import {
    PeopleAlt as UsersIcon,
    FlightTakeoff as FlightsIcon,
    Comment as FeedbackIcon,
    Map as MapIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Palette ────────────────────────────────────────────────────────────────
const PALETTE = {
    emerald: { main: '#059669', light: '#D1FAE5', text: '#065F46' },
    indigo: { main: '#4F46E5', light: '#EEF2FF', text: '#3730A3' },
    amber: { main: '#D97706', light: '#FEF3C7', text: '#92400E' },
    rose: { main: '#E11D48', light: '#FFE4E6', text: '#9F1239' },
};

const PIE_COLORS = ['#059669', '#4F46E5', '#D97706', '#E11D48', '#7C3AED'];
const ZONE_COLORS = { red: '#E11D48', yellow: '#D97706', green: '#059669', blue: '#4F46E5' };

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, palette, subtitle, loading }) => (
    <Card elevation={0} sx={{
        height: '100%',
        borderRadius: '20px',
        border: `1.5px solid ${palette.light}`,
        background: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 16px 40px ${palette.main}22`,
        },
    }}>
        {/* Decorative corner blot */}
        <Box sx={{
            position: 'absolute',
            top: -24, right: -24,
            width: 88, height: 88,
            borderRadius: '50%',
            background: palette.light,
            pointerEvents: 'none',
        }} />

        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{
                        color: '#94A3B8',
                        fontWeight: 700,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase',
                        fontSize: '0.68rem',
                    }}>
                        {title}
                    </Typography>

                    {loading ? (
                        <Skeleton variant="text" width={72} height={52} />
                    ) : (
                        <Typography variant="h3" sx={{
                            fontWeight: 800,
                            color: '#0F172A',
                            lineHeight: 1.1,
                            mt: 0.5,
                            fontSize: { xs: '2rem', sm: '2.4rem' },
                        }}>
                            {value}
                        </Typography>
                    )}

                    {subtitle && (
                        <Typography variant="caption" sx={{
                            color: palette.text,
                            fontWeight: 600,
                            mt: 0.5,
                            display: 'block',
                            fontSize: '0.72rem',
                        }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                <Box sx={{
                    width: 50, height: 50,
                    borderRadius: '14px',
                    background: palette.light,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {React.cloneElement(icon, { sx: { color: palette.main, fontSize: 24 } })}
                </Box>
            </Box>

            {/* Bottom accent bar */}
            <Box sx={{
                mt: 2.5,
                height: 4,
                borderRadius: 99,
                background: palette.light,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: '60%',
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${palette.main}, ${palette.main}88)`,
                }} />
            </Box>
        </CardContent>
    </Card>
);

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Paper elevation={4} sx={{
            p: 1.5,
            borderRadius: 3,
            border: '1px solid #F1F5F9',
            background: '#FFFFFF',
            minWidth: 120,
        }}>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5, fontWeight: 600 }}>
                {label}
            </Typography>
            {payload.map(p => (
                <Typography key={p.dataKey} variant="caption" sx={{ color: p.color, display: 'block', fontWeight: 800 }}>
                    {p.name}: {p.value}
                </Typography>
            ))}
        </Paper>
    );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, color }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{
            width: 32, height: 32,
            borderRadius: '10px',
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 17 } })}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
            {title}
        </Typography>
    </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DashboardStats = () => {
    const [stats, setStats] = useState({ userCount: 0, sessionCount: 0, feedbackCount: 0, facilityCount: 0 });
    const [chartData, setChartData] = useState([]);
    const [zoneData, setZoneData] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentSessions, setRecentSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [usersRes, sessionsRes, feedbackRes, facilitiesRes] = await Promise.all([
                axios.get(`${API_URL}/users`),
                axios.get(`${API_URL}/sessions`),
                axios.get(`${API_URL}/feedback`),
                axios.get(`${API_URL}/facilities?all=true`),
            ]);

            const users = usersRes.data;
            const sessions = sessionsRes.data;
            const feedback = feedbackRes.data;
            const facilities = facilitiesRes.data?.features || [];

            // Monthly chart data
            const monthMap = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('default', { month: 'short' });
                monthMap[key] = { month: key, users: 0, sessions: 0 };
            }
            users.forEach(u => {
                const m = new Date(u.created_at).toLocaleString('default', { month: 'short' });
                if (monthMap[m]) monthMap[m].users++;
            });
            sessions.forEach(s => {
                const m = new Date(s.created_at || Date.now()).toLocaleString('default', { month: 'short' });
                if (monthMap[m]) monthMap[m].sessions++;
            });
            setChartData(Object.values(monthMap));

            // Zone pie data
            const zoneCount = {};
            facilities.forEach(f => {
                const z = f.properties?.zoneType || 'unknown';
                zoneCount[z] = (zoneCount[z] || 0) + 1;
            });
            setZoneData(Object.entries(zoneCount).map(([name, value]) => ({ name, value })));

            setStats({
                userCount: users.length,
                sessionCount: sessions.length,
                feedbackCount: feedback.length,
                facilityCount: facilities.length,
            });
            setRecentUsers(users.slice(0, 5));
            setRecentSessions(sessions.slice(0, 5));
        } catch (err) {
            setError('Failed to load dashboard data. Please check your API connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        { title: 'Total Users', value: stats.userCount, icon: <UsersIcon />, palette: PALETTE.emerald, subtitle: 'Registered pilots' },
        { title: 'Flight Sessions', value: stats.sessionCount, icon: <FlightsIcon />, palette: PALETTE.indigo, subtitle: 'Total logged flights' },
        { title: 'Feedback', value: stats.feedbackCount, icon: <FeedbackIcon />, palette: PALETTE.amber, subtitle: 'User submissions' },
        { title: 'Airspace Zones', value: stats.facilityCount, icon: <MapIcon />, palette: PALETTE.rose, subtitle: 'Active zones' },
    ];

    return (
        <Box sx={{ 
            background: '#F8FAFC', 
            minHeight: '100vh', 
            p: { xs: 2, md: 3 },
            borderRadius: '24px 24px 0 0',
        }}>
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 3, border: '1px solid #FEE2E2', background: '#FFF5F5' }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* ── Stat Cards ── */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {cards.map(card => (
                    <Grid item xs={12} sm={6} lg={3} key={card.title}>
                        <StatCard {...card} loading={loading} />
                    </Grid>
                ))}
            </Grid>

            {/* ── Charts ── */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Growth Area Chart */}
                <Grid item xs={12} lg={8}>
                    <Paper elevation={0} sx={{
                        p: 3,
                        height: 340,
                        borderRadius: '20px',
                        border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF',
                    }}>
                        <SectionHeader
                            icon={<TrendingUpIcon />}
                            title="Growth Overview"
                            color={PALETTE.emerald.main}
                        />
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500, display: 'block', mb: 2, mt: -1 }}>
                            Last 6 months
                        </Typography>

                        {loading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                                <CircularProgress size={36} sx={{ color: PALETTE.emerald.main }} />
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={230}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                        axisLine={false} tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 600 }} />
                                    <Area
                                        type="monotone" dataKey="users" name="New Users"
                                        stroke="#059669" strokeWidth={2.5} fill="url(#gradUsers)"
                                        dot={{ fill: '#059669', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
                                    />
                                    <Area
                                        type="monotone" dataKey="sessions" name="Sessions"
                                        stroke="#4F46E5" strokeWidth={2.5} fill="url(#gradSessions)"
                                        dot={{ fill: '#4F46E5', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>

                {/* Zone Pie */}
                <Grid item xs={12} lg={4}>
                    <Paper elevation={0} sx={{
                        p: 3,
                        height: 340,
                        borderRadius: '20px',
                        border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF',
                    }}>
                        <SectionHeader icon={<MapIcon />} title="Zone Distribution" color={PALETTE.rose.main} />

                        {loading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                                <CircularProgress size={36} sx={{ color: PALETTE.rose.main }} />
                            </Box>
                        ) : zoneData.length === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                                <Typography variant="body2" sx={{ color: '#94A3B8' }}>No airspace data</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={zoneData}
                                        cx="50%" cy="46%"
                                        innerRadius={62} outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {zoneData.map((entry, i) => (
                                            <Cell key={i} fill={ZONE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        formatter={v => (
                                            <span style={{ color: '#475569', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                                                {v}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* ── Recent Activity ── */}
            <Grid container spacing={3}>
                {/* Recent Users */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{
                        p: 3,
                        borderRadius: '20px',
                        border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF',
                    }}>
                        <SectionHeader icon={<UsersIcon />} title="Recent Registrations" color={PALETTE.emerald.main} />
                        <Divider sx={{ mb: 2, borderColor: '#F1F5F9' }} />

                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 2 }} />
                            ))
                        ) : recentUsers.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>
                                No users yet
                            </Typography>
                        ) : (
                            recentUsers.map(user => (
                                <Box key={user._id} sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.2,
                                    borderRadius: '12px',
                                    mb: 0.5,
                                    cursor: 'default',
                                    transition: 'background 0.15s',
                                    '&:hover': { background: '#F0FDF4' },
                                }}>
                                    {/* Avatar */}
                                    <Box sx={{
                                        width: 38, height: 38,
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #059669, #4F46E5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, color: '#FFFFFF',
                                        fontSize: '0.85rem', flexShrink: 0,
                                        boxShadow: '0 2px 8px #05966933',
                                    }}>
                                        {(user.displayname || user.username || 'U')[0].toUpperCase()}
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }} noWrap>
                                            {user.displayname || user.username}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }} noWrap>
                                            {user.email}
                                        </Typography>
                                    </Box>

                                    <Typography variant="caption" sx={{ color: '#94A3B8', flexShrink: 0, fontWeight: 600 }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            ))
                        )}
                    </Paper>
                </Grid>

                {/* Recent Sessions */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{
                        p: 3,
                        borderRadius: '20px',
                        border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF',
                    }}>
                        <SectionHeader icon={<FlightsIcon />} title="Recent Sessions" color={PALETTE.indigo.main} />
                        <Divider sx={{ mb: 2, borderColor: '#F1F5F9' }} />

                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 2 }} />
                            ))
                        ) : recentSessions.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>
                                No sessions recorded
                            </Typography>
                        ) : (
                            recentSessions.map(s => (
                                <Box key={s._id} sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.2,
                                    borderRadius: '12px',
                                    mb: 0.5,
                                    transition: 'background 0.15s',
                                    '&:hover': { background: '#EEF2FF' },
                                }}>
                                    <Box sx={{
                                        width: 38, height: 38,
                                        borderRadius: '12px',
                                        background: '#EEF2FF',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <FlightsIcon sx={{ color: '#4F46E5', fontSize: 18 }} />
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                                            {s.username}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                                            {s.date} · {s.start_time} → {s.end_time}
                                        </Typography>
                                    </Box>

                                    <Chip
                                        label={`${Math.round(s.duration || 0)}m`}
                                        size="small"
                                        sx={{
                                            background: '#EEF2FF',
                                            color: '#4F46E5',
                                            border: '1px solid #C7D2FE',
                                            fontWeight: 800,
                                            fontSize: '0.7rem',
                                            height: 24,
                                        }}
                                    />
                                </Box>
                            ))
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardStats;