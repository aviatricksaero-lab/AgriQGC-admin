import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Typography, Chip,
    Box, IconButton, Tooltip, TextField, InputAdornment,
    Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Alert, Skeleton, alpha, Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Person as PersonIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

// White theme cell styles
const cellSx = {
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    color: 'text.primary',
    py: 1.5,
};

const headCellSx = {
    ...cellSx,
    color: 'text.secondary',
    fontWeight: 700,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: '#f8f9fa',
};

const UsersTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [detailUser, setDetailUser] = useState(null);
    const [userMissions, setUserMissions] = useState([]);
    const [loadingMissions, setLoadingMissions] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    useEffect(() => {
        if (detailUser) {
            fetchUserMissions(detailUser.username);
        } else {
            setUserMissions([]);
        }
    }, [detailUser]);

    const fetchUserMissions = async (username) => {
        try {
            setLoadingMissions(true);
            const res = await axios.get(`${API_URL}/missions?username=${username}`);
            setUserMissions(res.data);
        } catch (err) {
            toast.error('Failed to fetch user log files.');
            console.error(err);
        } finally {
            setLoadingMissions(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (err) {
            setError('Failed to fetch users.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        try {
            setDeleting(true);
            await axios.delete(`${API_URL}/users/${userToDelete._id}`);
            setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
            toast.success(`User "${userToDelete.username}" deleted.`);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (err) {
            toast.error('Failed to delete user.');
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Username', 'Display Name', 'Email', 'Mobile', 'RPC Score', 'Joined'];
        const rows = filtered.map(u => [
            u.username, u.displayname, u.email,
            u.mobile_number || '', u.rpc_completed,
            new Date(u.created_at).toLocaleDateString()
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported!');
    };

    const filtered = useMemo(() =>
        users.filter(u =>
            !search || [u.username, u.displayname, u.email, u.mobile_number].some(
                v => v && v.toLowerCase().includes(search.toLowerCase())
            )
        ), [users, search]);

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const getAvatarColor = (str = '') => {
        const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#EF4444', '#3B82F6'];
        return colors[str.charCodeAt(0) % colors.length];
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}

            <Paper sx={{
                p: 0,
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
                            Registered Users
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {filtered.length} total  {search && `· filtered from ${users.length}`}
                        </Typography>
                    </Box>

                    <TextField
                        size="small"
                        placeholder="Search users..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                        }}
                        sx={{
                            width: 240,
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
                        <IconButton onClick={fetchUsers} size="small" sx={{
                            bgcolor: 'rgba(99,102,241,0.08)',
                            color: '#6366F1',
                            '&:hover': { bgcolor: 'rgba(99,102,241,0.15)' },
                            borderRadius: 2
                        }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {['User', 'Email', 'Mobile', 'RPC Score', 'Joined', 'Actions'].map(h => (
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
                                : paginated.map((user) => (
                                    <TableRow
                                        key={user._id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(16,185,129,0.04) !important' },
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        <TableCell sx={cellSx}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{
                                                    width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700,
                                                    bgcolor: getAvatarColor(user.username),
                                                    color: '#ffffff',
                                                    borderRadius: '8px',
                                                }}>
                                                    {(user.displayname || user.username || '?')[0].toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>
                                                        {user.displayname}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        @{user.username}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={cellSx}>
                                            <Typography variant="body2" sx={{ color: '#0D9488' }}>{user.email}</Typography>
                                        </TableCell>
                                        <TableCell sx={cellSx}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{user.mobile_number || '—'}</Typography>
                                        </TableCell>
                                        <TableCell sx={cellSx}>
                                            <Chip
                                                label={user.rpc_completed ?? 0}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha('#6366F1', 0.08),
                                                    color: '#6366F1',
                                                    border: `1px solid ${alpha('#6366F1', 0.2)}`,
                                                    fontWeight: 800,
                                                    fontSize: '0.72rem',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={cellSx}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={cellSx}>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setDetailUser(user)}
                                                        sx={{
                                                            color: '#10B981',
                                                            '&:hover': { bgcolor: alpha('#10B981', 0.08) }
                                                        }}
                                                    >
                                                        <PersonIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete User">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }}
                                                        sx={{
                                                            color: '#EF4444',
                                                            '&:hover': { bgcolor: alpha('#EF4444', 0.08) }
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {!loading && paginated.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', py: 6 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No users found</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
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

            {/* Delete Confirm Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 4,
                        minWidth: 360,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#1a1a1a', fontWeight: 700, pb: 1 }}>
                    Delete User?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Are you sure you want to delete{' '}
                        <strong style={{ color: '#1a1a1a' }}>{userToDelete?.displayname || userToDelete?.username}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{ color: 'text.secondary', borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={deleting}
                        variant="contained"
                        sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: 2 }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* User Detail Dialog */}
            <Dialog
                open={!!detailUser}
                onClose={() => setDetailUser(null)}
                PaperProps={{
                    sx: {
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 4,
                        minWidth: 420,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }
                }}
            >
                {detailUser && (
                    <>
                        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                            <Avatar sx={{
                                width: 44, height: 44, fontWeight: 700, fontSize: '1.1rem',
                                bgcolor: getAvatarColor(detailUser.username),
                                color: '#ffffff',
                                borderRadius: '12px',
                            }}>
                                {(detailUser.displayname || detailUser.username || '?')[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 700, lineHeight: 1.2 }}>
                                    {detailUser.displayname}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    @{detailUser.username}
                                </Typography>
                            </Box>
                            <IconButton onClick={() => setDetailUser(null)} size="small" sx={{ color: 'text.secondary' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </DialogTitle>
                        <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                        <DialogContent sx={{ pt: 2 }}>
                            {[
                                { label: 'Email', value: detailUser.email },
                                { label: 'Mobile', value: detailUser.mobile_number || '—' },
                                { label: 'RPC Score', value: detailUser.rpc_completed ?? 0 },
                                { label: 'Joined', value: new Date(detailUser.created_at).toLocaleString() },
                                { label: 'User ID', value: detailUser._id },
                            ].map(({ label, value }) => (
                                <Box key={label} sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    py: 1.2,
                                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
                                    <Typography variant="body2" sx={{
                                        color: '#1a1a1a',
                                        fontWeight: 600,
                                        maxWidth: '60%',
                                        textAlign: 'right',
                                        wordBreak: 'break-all'
                                    }}>
                                        {value}
                                    </Typography>
                                </Box>
                            ))}

                            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: '#1a1a1a', fontWeight: 600 }}>
                                Log Files / Missions
                            </Typography>
                            {loadingMissions ? (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading...</Typography>
                            ) : userMissions.length === 0 ? (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No log files found.</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {userMissions.map(m => (
                                        <Box
                                            key={m._id}
                                            onClick={() => setSelectedPlan(m)}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: 'rgba(0,0,0,0.02)',
                                                borderRadius: 2,
                                                border: '1px solid rgba(0,0,0,0.06)',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'rgba(16,185,129,0.04)',
                                                    borderColor: 'rgba(16,185,129,0.3)'
                                                }
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 600 }}>{m.mission_name}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{new Date(m.date).toLocaleString()}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* Plan Data Dialog */}
            <Dialog
                open={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }
                }}
            >
                {selectedPlan && (
                    <>
                        <DialogTitle sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#1a1a1a',
                            fontWeight: 700,
                            pb: 1
                        }}>
                            Log File: {selectedPlan.mission_name}
                            <IconButton onClick={() => setSelectedPlan(null)} size="small" sx={{ color: 'text.secondary' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </DialogTitle>
                        <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                        <DialogContent sx={{ pt: 2 }}>
                            <Box sx={{
                                bgcolor: '#f8f9fa',
                                p: 2,
                                borderRadius: 2,
                                overflowX: 'auto',
                                maxHeight: '500px',
                                border: '1px solid rgba(0,0,0,0.06)'
                            }}>
                                <pre style={{
                                    margin: 0,
                                    color: '#1a1a1a',
                                    fontSize: '0.85rem',
                                    fontFamily: 'monospace'
                                }}>
                                    {JSON.stringify(selectedPlan.plan_data, null, 2)}
                                </pre>
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default UsersTable;