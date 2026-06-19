import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Typography,
    Box, IconButton, Tooltip, TextField, InputAdornment,
    Alert, Skeleton, alpha, Chip, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, Divider,
    FormControl, InputLabel, Select, MenuItem, Grid,
    Switch, FormControlLabel, CircularProgress
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Map as MapIcon,
    Close as CloseIcon,
    CheckCircle as ActiveIcon,
    Cancel as InactiveIcon,
    Science as SeedIcon
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

const ZONE_TYPES = [
    { value: 'red', label: 'Red (Restricted)', color: '#EF4444' },
    { value: 'yellow', label: 'Yellow (Caution)', color: '#F59E0B' },
    { value: 'green', label: 'Green (Open)', color: '#10B981' },
    { value: 'blue', label: 'Blue (Information)', color: '#3B82F6' },
];

const getZoneChip = (type) => {
    const z = ZONE_TYPES.find(t => t.value === type) || { color: '#94A3B8', label: type };
    return (
        <Chip
            label={z.label || type}
            size="small"
            sx={{
                bgcolor: alpha(z.color, 0.08),
                color: z.color,
                border: `1px solid ${alpha(z.color, 0.2)}`,
                fontWeight: 700,
                fontSize: '0.7rem',
                textTransform: 'capitalize',
            }}
        />
    );
};

const EMPTY_FORM = {
    name: '',
    zoneType: 'yellow',
    active: true,
    description: '',
    minAltitude: 0,
    maxAltitude: 500,
    lat: '',
    lon: '',
    radiusKm: 1,
};

const AirspaceManager = () => {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterZone, setFilterZone] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [facilityToDelete, setFacilityToDelete] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { fetchFacilities(); }, []);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/facilities?all=true`);
            const features = res.data?.features || [];
            setFacilities(features.map(f => ({
                _id: f.id,
                ...f.properties,
                geometry: f.geometry,
            })));
        } catch (err) {
            setError('Failed to fetch airspace data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedData = async () => {
        try {
            setSeeding(true);
            await axios.post(`${API_URL}/facilities/seed`, { force: false });
            toast.success('Seed data added!');
            fetchFacilities();
        } catch (err) {
            toast.error('Seeding failed.');
        } finally {
            setSeeding(false);
        }
    };

    const handleAdd = async () => {
        const { name, zoneType, active, description, minAltitude, maxAltitude, lat, lon, radiusKm } = form;
        if (!name.trim()) { toast.error('Name is required.'); return; }
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const rKm = parseFloat(radiusKm);
        if (isNaN(latNum) || isNaN(lonNum)) { toast.error('Enter valid lat/lon coordinates.'); return; }
        if (isNaN(rKm) || rKm <= 0) { toast.error('Radius must be positive.'); return; }

        // Generate a circular polygon approximation (16 points)
        const points = 16;
        const earthRadius = 6371;
        const coords = [];
        for (let i = 0; i <= points; i++) {
            const angle = (i * 2 * Math.PI) / points;
            const dx = (rKm / earthRadius) * (180 / Math.PI) / Math.cos(latNum * Math.PI / 180);
            const dy = (rKm / earthRadius) * (180 / Math.PI);
            coords.push([lonNum + dx * Math.cos(angle), latNum + dy * Math.sin(angle)]);
        }

        try {
            setSaving(true);
            await axios.post(`${API_URL}/facilities`, {
                name: name.trim(),
                zoneType,
                active,
                description,
                minAltitude: Number(minAltitude),
                maxAltitude: Number(maxAltitude),
                geometry: { type: 'Polygon', coordinates: [coords] },
            });
            toast.success('Zone created!');
            setAddDialogOpen(false);
            setForm(EMPTY_FORM);
            fetchFacilities();
        } catch (err) {
            toast.error('Failed to create zone.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!facilityToDelete) return;
        try {
            setDeleting(true);
            await axios.delete(`${API_URL}/facilities/${facilityToDelete._id}`);
            setFacilities(prev => prev.filter(f => f._id !== facilityToDelete._id));
            toast.success('Zone deleted.');
            setDeleteDialogOpen(false);
            setFacilityToDelete(null);
        } catch (err) {
            toast.error('Failed to delete zone.');
        } finally {
            setDeleting(false);
        }
    };

    const handleToggleActive = async (facility) => {
        try {
            await axios.put(`${API_URL}/facilities/${facility._id}`, { active: !facility.isActive });
            toast.success(`Zone ${facility.isActive ? 'deactivated' : 'activated'}.`);
            fetchFacilities();
        } catch (err) {
            toast.error('Failed to update zone.');
        }
    };

    const exportGeoJSON = () => {
        const geojson = {
            type: 'FeatureCollection',
            features: filtered.map(f => ({
                type: 'Feature',
                id: f._id,
                properties: { name: f.name, zoneType: f.zoneType, description: f.description, isActive: f.isActive, minAltitude: f.minAltitude, maxAltitude: f.maxAltitude },
                geometry: f.geometry,
            })),
        };
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'airspace_zones.geojson';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('GeoJSON exported!');
    };

    const filtered = useMemo(() =>
        facilities.filter(f => {
            const matchSearch = !search || [f.name, f.description, f.zoneType].some(
                v => v && v.toLowerCase().includes(search.toLowerCase())
            );
            const matchZone = filterZone === 'all' || f.zoneType === filterZone;
            return matchSearch && matchZone;
        }), [facilities, search, filterZone]);

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                            Airspace Zones
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {filtered.length} zones · Manage no-fly and restricted areas
                        </Typography>
                    </Box>

                    <TextField
                        size="small"
                        placeholder="Search zones..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                        sx={{
                            width: 220,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, 
                                bgcolor: '#ffffff',
                                '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
                                '&:hover fieldset': { borderColor: '#EF4444' },
                                '&.Mui-focused fieldset': { borderColor: '#EF4444' },
                            },
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={filterZone}
                            onChange={e => { setFilterZone(e.target.value); setPage(0); }}
                            sx={{
                                borderRadius: 2, 
                                bgcolor: '#ffffff',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#EF4444' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF4444' },
                                color: 'text.primary',
                            }}
                        >
                            <MenuItem value="all">All Zones</MenuItem>
                            {ZONE_TYPES.map(z => <MenuItem key={z.value} value={z.value}>{z.label}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <Tooltip title="Seed Test Data">
                        <IconButton onClick={handleSeedData} disabled={seeding} size="small" sx={{ 
                            bgcolor: 'rgba(99,102,241,0.08)', 
                            color: '#6366F1', 
                            '&:hover': { bgcolor: 'rgba(99,102,241,0.15)' }, 
                            borderRadius: 2 
                        }}>
                            {seeding ? <CircularProgress size={16} color="inherit" /> : <SeedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Export GeoJSON">
                        <IconButton onClick={exportGeoJSON} size="small" sx={{ 
                            bgcolor: 'rgba(239,68,68,0.08)', 
                            color: '#EF4444', 
                            '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' }, 
                            borderRadius: 2 
                        }}>
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchFacilities} size="small" sx={{ 
                            bgcolor: 'rgba(239,68,68,0.08)', 
                            color: '#EF4444', 
                            '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' }, 
                            borderRadius: 2 
                        }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                        size="small"
                        sx={{ borderRadius: 2, bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, fontWeight: 700 }}
                    >
                        Add Zone
                    </Button>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {['Name', 'Zone Type', 'Altitude Range', 'Status', 'Created', 'Actions'].map(h => (
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
                                : paginated.map((f) => {
                                    const zoneColor = ZONE_TYPES.find(z => z.value === f.zoneType)?.color || '#94A3B8';
                                    return (
                                        <TableRow key={f._id} hover sx={{ 
                                            '&:hover': { bgcolor: `${alpha(zoneColor, 0.04)} !important` } 
                                        }}>
                                            <TableCell sx={cellSx}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{
                                                        width: 10, height: 10, borderRadius: '50%',
                                                        bgcolor: zoneColor,
                                                        boxShadow: `0 0 8px ${zoneColor}40`,
                                                        flexShrink: 0,
                                                    }} />
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                                                            {f.name}
                                                        </Typography>
                                                        {f.description && (
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                {f.description}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={cellSx}>{getZoneChip(f.zoneType)}</TableCell>
                                            <TableCell sx={cellSx}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                                    {f.minAltitude ?? 0}m – {f.maxAltitude ?? 500}m AGL
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Chip
                                                    label={f.isActive ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    onClick={() => handleToggleActive(f)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        bgcolor: f.isActive ? alpha('#10B981', 0.08) : alpha('#94A3B8', 0.08),
                                                        color: f.isActive ? '#10B981' : '#94A3B8',
                                                        border: `1px solid ${f.isActive ? alpha('#10B981', 0.2) : alpha('#94A3B8', 0.15)}`,
                                                        fontWeight: 600, fontSize: '0.68rem',
                                                        '&:hover': { opacity: 0.8 },
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={cellSx}>
                                                <Tooltip title="Delete Zone">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => { setFacilityToDelete(f); setDeleteDialogOpen(true); }}
                                                        sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            {!loading && paginated.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', py: 8 }}>
                                        <MapIcon sx={{ color: 'text.secondary', fontSize: 48, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No airspace zones. Click "Add Zone" or "Seed Test Data".
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

            {/* Add Zone Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                maxWidth="sm"
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
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <MapIcon sx={{ color: '#EF4444' }} />
                    <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 700 }}>Add Airspace Zone</Typography>
                    <IconButton onClick={() => setAddDialogOpen(false)} size="small" sx={{ ml: 'auto', color: 'text.secondary' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                <DialogContent sx={{ pt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Zone Name"
                                fullWidth
                                size="small"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ color: 'text.secondary' }}>Zone Type</InputLabel>
                                <Select
                                    label="Zone Type"
                                    value={form.zoneType}
                                    onChange={e => setForm(p => ({ ...p, zoneType: e.target.value }))}
                                    sx={selectSx}
                                >
                                    {ZONE_TYPES.map(z => (
                                        <MenuItem key={z.value} value={z.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: z.color }} />
                                                {z.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Description (optional)"
                                fullWidth
                                size="small"
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                                CENTER COORDINATES
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                label="Latitude" 
                                fullWidth 
                                size="small" 
                                value={form.lat} 
                                onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} 
                                placeholder="e.g. 28.6139" 
                                sx={inputSx} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                label="Longitude" 
                                fullWidth 
                                size="small" 
                                value={form.lon} 
                                onChange={e => setForm(p => ({ ...p, lon: e.target.value }))} 
                                placeholder="e.g. 77.2090" 
                                sx={inputSx} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                label="Radius (km)" 
                                fullWidth 
                                size="small" 
                                type="number" 
                                value={form.radiusKm} 
                                onChange={e => setForm(p => ({ ...p, radiusKm: e.target.value }))} 
                                sx={inputSx} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                label="Min Altitude (m AGL)" 
                                fullWidth 
                                size="small" 
                                type="number" 
                                value={form.minAltitude} 
                                onChange={e => setForm(p => ({ ...p, minAltitude: e.target.value }))} 
                                sx={inputSx} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                label="Max Altitude (m AGL)" 
                                fullWidth 
                                size="small" 
                                type="number" 
                                value={form.maxAltitude} 
                                onChange={e => setForm(p => ({ ...p, maxAltitude: e.target.value }))} 
                                sx={inputSx} 
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.active}
                                        onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                                        sx={{ 
                                            '& .MuiSwitch-thumb': { 
                                                bgcolor: form.active ? '#10B981' : '#94A3B8' 
                                            } 
                                        }}
                                    />
                                }
                                label={<Typography variant="body2" sx={{ color: 'text.secondary' }}>Active Zone</Typography>}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button onClick={() => setAddDialogOpen(false)} sx={{ color: 'text.secondary', borderRadius: 2 }}>Cancel</Button>
                    <Button
                        onClick={handleAdd}
                        disabled={saving}
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                        sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: 2 }}
                    >
                        {saving ? 'Creating...' : 'Create Zone'}
                    </Button>
                </DialogActions>
            </Dialog>

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
                <DialogTitle sx={{ color: '#1a1a1a', fontWeight: 700 }}>Delete Zone?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Are you sure you want to delete zone <strong style={{ color: '#1a1a1a' }}>{facilityToDelete?.name}</strong>?
                        This will remove it from QGC's airspace overlay.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary', borderRadius: 2 }}>Cancel</Button>
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
        </Box>
    );
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, 
        bgcolor: 'rgba(0,0,0,0.02)',
        '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
        '&:hover fieldset': { borderColor: 'rgba(239,68,68,0.4)' },
        '&.Mui-focused fieldset': { borderColor: '#EF4444' },
        color: '#1a1a1a',
    },
    '& .MuiInputLabel-root': { color: '#64748B' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#EF4444' },
};

const selectSx = {
    borderRadius: 2, 
    bgcolor: 'rgba(0,0,0,0.02)', 
    color: '#1a1a1a',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(239,68,68,0.4)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF4444' },
    '& .MuiSvgIcon-root': { color: '#64748B' },
};

export default AirspaceManager;