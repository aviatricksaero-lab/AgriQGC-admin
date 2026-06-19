import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Typography,
    Box, IconButton, Tooltip, TextField, InputAdornment,
    Alert, Skeleton, alpha, Chip, LinearProgress
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    FlightTakeoff as FlightIcon,
    AccessTime as TimeIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

// White theme cell styles
const cellSx = { 
    borderBottom: '1px solid rgba(0,0,0,0.08)', 
    color: 'text.primary', 
    py: 1.5 
};

const headCellSx = { 
    ...cellSx, 
    color: 'text.secondary', 
    fontWeight: 800, 
    fontSize: '0.72rem', 
    textTransform: 'uppercase', 
    letterSpacing: '0.1em', 
    background: '#f8f9fa' 
};

const MAX_DURATION_BAR = 120; // minutes

const SessionsTable = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => { fetchSessions(); }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/sessions`);
            setSessions(res.data);
        } catch (err) {
            setError('Failed to fetch sessions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Username', 'Date', 'Start Time', 'End Time', 'Duration (min)'];
        const rows = filtered.map(s => [s.username, s.date, s.start_time, s.end_time, Math.round(s.duration || 0)]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sessions_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported!');
    };

    const filtered = useMemo(() =>
        sessions.filter(s =>
            !search || [s.username, s.date].some(v => v && v.toLowerCase().includes(search.toLowerCase()))
        ), [sessions, search]);

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const getDurationColor = (duration) => {
        if (duration < 10) return '#6366F1';
        if (duration < 30) return '#10B981';
        if (duration < 60) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}

            <Paper sx={{ 
                overflow: 'hidden', 
                borderRadius: 4,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)',
                bgcolor: '#ffffff'
            }}>
                {/* Header */}
                <Box sx={{ 
                    p: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    flexWrap: 'wrap', 
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    bgcolor: '#fafafa'
                }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                            Flight Sessions
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {filtered.length} total sessions
                        </Typography>
                    </Box>
                    <TextField
                        size="small"
                        placeholder="Search by user or date..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                        }}
                        sx={{
                            width: 260,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, 
                                bgcolor: '#ffffff',
                                '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
                                '&:hover fieldset': { borderColor: '#10B981' },
                                '&.Mui-focused fieldset': { borderColor: '#10B981' },
                            },
                        }}
                    />
                    <Tooltip title="Export CSV">
                        <IconButton onClick={exportCSV} size="small" sx={{ 
                            bgcolor: 'rgba(16,185,129,0.08)', 
                            color: '#10B981', 
                            '&:hover': { bgcolor: 'rgba(16,185,129,0.15)' }, 
                            borderRadius: 2 
                        }}>
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchSessions} size="small" sx={{ 
                            bgcolor: 'rgba(99,102,241,0.08)', 
                            color: '#6366F1', 
                            '&:hover': { bgcolor: 'rgba(99,102,241,0.15)' }, 
                            borderRadius: 2 
                        }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <TableContainer>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {['Pilot', 'Date', 'Start', 'End', 'Duration', 'Status'].map(h => (
                                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading
                                ? [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <TableCell key={j} sx={cellSx}>
                                                <Skeleton variant="text" sx={{ bgcolor: 'rgba(0,0,0,0.04)' }} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : paginated.map((s) => {
                                    const dur = Math.round(s.duration || 0);
                                    const color = getDurationColor(dur);
                                    return (
                                        <TableRow 
                                            key={s._id} 
                                            hover 
                                            sx={{ 
                                                '&:hover': { bgcolor: 'rgba(16,185,129,0.04) !important' } 
                                            }}
                                        >
                                            <TableCell sx={cellSx}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{
                                                        width: 32, 
                                                        height: 32, 
                                                        borderRadius: '10px',
                                                        background: 'linear-gradient(135deg, #10B981, #6366F1)',
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        flexShrink: 0,
                                                        boxShadow: '0 4px 10px rgba(16,185,129,0.2)',
                                                    }}>
                                                        <FlightIcon sx={{ color: 'white', fontSize: 16 }} />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ 
                                                        fontWeight: 700, 
                                                        color: '#1a1a1a' 
                                                    }}>
                                                        {s.username}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {s.date}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Typography variant="body2" sx={{ 
                                                    color: '#0D9488', 
                                                    fontWeight: 500, 
                                                    fontFamily: 'monospace' 
                                                }}>
                                                    {s.start_time}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Typography variant="body2" sx={{ 
                                                    color: '#DC2626', 
                                                    fontWeight: 500, 
                                                    fontFamily: 'monospace' 
                                                }}>
                                                    {s.end_time}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ ...cellSx, minWidth: 160 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={Math.min((dur / MAX_DURATION_BAR) * 100, 100)}
                                                            sx={{
                                                                height: 5, 
                                                                borderRadius: 3,
                                                                bgcolor: alpha(color, 0.15),
                                                                '& .MuiLinearProgress-bar': { 
                                                                    bgcolor: color, 
                                                                    borderRadius: 3 
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" sx={{ 
                                                        color, 
                                                        fontWeight: 700, 
                                                        minWidth: 35 
                                                    }}>
                                                        {dur}m
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Chip
                                                    label={s.end_time ? 'Completed' : 'In Progress'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: s.end_time ? alpha('#10B981', 0.08) : alpha('#F59E0B', 0.08),
                                                        color: s.end_time ? '#10B981' : '#F59E0B',
                                                        border: `1px solid ${s.end_time ? alpha('#10B981', 0.2) : alpha('#F59E0B', 0.2)}`,
                                                        fontWeight: 600, 
                                                        fontSize: '0.68rem',
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            {!loading && paginated.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', py: 6 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No sessions found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filtered.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                    sx={{ 
                        borderTop: '1px solid rgba(0,0,0,0.06)', 
                        color: 'text.secondary',
                        bgcolor: '#fafafa'
                    }}
                />
            </Paper>
        </Box>
    );
};

export default SessionsTable;