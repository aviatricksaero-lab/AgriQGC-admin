import React, { useState, useEffect, useMemo } from 'react';
import {
    Typography, Box, Paper, Alert, Skeleton, TextField,
    InputAdornment, IconButton, Tooltip, Avatar, Divider,
    Chip, alpha, Pagination, Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Comment as CommentIcon,
    Email as EmailIcon,
    Phone as PhoneIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const ITEMS_PER_PAGE = 8;

const FeedbackList = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => { fetchFeedback(); }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/feedback`);
            setFeedbacks(res.data);
        } catch (err) {
            setError('Failed to fetch feedback.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Username', 'Email', 'Mobile', 'Comments', 'Date'];
        const rows = filtered.map(f => [
            f.username || 'Anonymous', f.email, f.mobile_number || '',
            `"${(f.comments || '').replace(/"/g, '""')}"`,
            new Date(f.created_at).toLocaleString()
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feedback_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Feedback exported!');
    };

    const filtered = useMemo(() =>
        feedbacks.filter(f =>
            !search || [f.username, f.email, f.comments, f.mobile_number].some(
                v => v && v.toLowerCase().includes(search.toLowerCase())
            )
        ), [feedbacks, search]);

    const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const getAvatarColor = (str = '') => {
        const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#EF4444', '#3B82F6'];
        return colors[(str.charCodeAt(0) || 0) % colors.length];
    };

    const getTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}

            <Paper className="glass-card" sx={{ overflow: 'hidden', borderRadius: 4 }}>
                {/* Header */}
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>User Feedback</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {filtered.length} submissions
                        </Typography>
                    </Box>
                    <TextField
                        size="small"
                        placeholder="Search feedback..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                        }}
                        sx={{
                            width: 240,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.5)' },
                                '&.Mui-focused fieldset': { borderColor: '#10B981' },
                            },
                        }}
                    />
                    <Tooltip title="Export CSV">
                        <IconButton onClick={exportCSV} size="small" sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', '&:hover': { bgcolor: 'rgba(245,158,11,0.2)' }, borderRadius: 2 }}>
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchFeedback} size="small" sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10B981', '&:hover': { bgcolor: 'rgba(16,185,129,0.2)' }, borderRadius: 2 }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Feedback Cards */}
                <Box sx={{ p: 3 }}>
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <Skeleton key={i} variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }} />
                        ))
                    ) : paged.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <CommentIcon sx={{ color: 'text.secondary', fontSize: 48, mb: 1, opacity: 0.4 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No feedback found</Typography>
                        </Box>
                    ) : (
                        paged.map((fb, index) => {
                            const name = fb.username || 'Anonymous';
                            const color = getAvatarColor(name);
                            return (
                                <Box
                                    key={fb._id}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        p: 2.5,
                                        borderRadius: 2,
                                        mb: 1.5,
                                        background: `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha(color, 0.02)})`,
                                        border: `1px solid ${alpha(color, 0.12)}`,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            background: `linear-gradient(135deg, ${alpha(color, 0.1)}, ${alpha(color, 0.04)})`,
                                            border: `1px solid ${alpha(color, 0.2)}`,
                                        },
                                    }}
                                >
                                    <Avatar sx={{
                                        width: 42, height: 42, fontWeight: 700, fontSize: '1rem',
                                        bgcolor: color, borderRadius: '12px', flexShrink: 0,
                                    }}>
                                        {name[0].toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>
                                                {name}
                                            </Typography>
                                            {fb.email && (
                                                <Chip
                                                    icon={<EmailIcon sx={{ fontSize: '12px !important' }} />}
                                                    label={fb.email}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(255,255,255,0.05)',
                                                        color: 'text.secondary',
                                                        fontSize: '0.68rem',
                                                        height: 20,
                                                        '& .MuiChip-icon': { color: 'text.secondary' },
                                                    }}
                                                />
                                            )}
                                            {fb.mobile_number && (
                                                <Chip
                                                    icon={<PhoneIcon sx={{ fontSize: '12px !important' }} />}
                                                    label={fb.mobile_number}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(255,255,255,0.05)',
                                                        color: 'text.secondary',
                                                        fontSize: '0.68rem',
                                                        height: 20,
                                                        '& .MuiChip-icon': { color: 'text.secondary' },
                                                    }}
                                                />
                                            )}
                                            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                                {getTimeAgo(fb.created_at)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                                            {fb.comments || <em>No comment provided</em>}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })
                    )}

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, p) => setPage(p)}
                                sx={{
                                    '& .MuiPaginationItem-root': { color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' },
                                    '& .Mui-selected': { bgcolor: alpha('#10B981', 0.2), color: '#10B981', borderColor: alpha('#10B981', 0.4) },
                                }}
                                variant="outlined"
                                shape="rounded"
                            />
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default FeedbackList;
