import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Button,
    Switch, FormControlLabel, Select, MenuItem, FormControl,
    InputLabel, TextField, CircularProgress, Alert, Divider,
    Chip, Skeleton, alpha, Paper
} from '@mui/material';
import {
    Tune as TuneIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Settings as SettingsIcon,
    Speed as SpeedIcon,
    Straighten as RulerIcon,
    FlightTakeoff as FlightIcon,
    Storage as StorageIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// ─── Option maps ──────────────────────────────────────────────────────────────
// IMPORTANT: values here must match the C++ UnitsSettings enums exactly.
// See: src/Settings/UnitsSettings.h

const FOLLOW_TARGET_OPTIONS = [
    { value: 0, label: 'Never stream position' },
    { value: 1, label: 'Always stream position' },
    { value: 2, label: 'When in Follow Me mode (recommended)' },
];

// WP_YAW_BEHAVIOR — must match the 2 radio buttons shown in the QML app
const YAW_BEHAVIOR_OPTIONS = [
    { value: 0, label: 'Continuous Moment' },
    { value: 1, label: 'Turn Around' },
];

// HorizontalDistanceUnits: 0 = Feet, 1 = Meters
const DISTANCE_UNITS_OPTIONS = [
    { value: 0, label: 'Feet (ft)' },
    { value: 1, label: 'Meters (m)' },
];

// AreaUnits: 0 = SquareFeet, 1 = SquareMeters, 2 = SquareKilometers,
//            3 = Hectares, 4 = Acres, 5 = SquareMiles
const AREA_UNITS_OPTIONS = [
    { value: 0, label: 'Square Feet (ft²)' },
    { value: 1, label: 'Square Meters (m²)' },
    { value: 2, label: 'Square Kilometers (km²)' },
    { value: 3, label: 'Hectares (ha)' },
    { value: 4, label: 'Acres (ac)' },
    { value: 5, label: 'Square Miles (mi²)' },
];

// SpeedUnits: 0 = FeetPerSecond, 1 = MetersPerSecond, 2 = MilesPerHour,
//             3 = KilometersPerHour, 4 = Knots
const SPEED_UNITS_OPTIONS = [
    { value: 0, label: 'Feet per Second (ft/s)' },
    { value: 1, label: 'Meters per Second (m/s)' },
    { value: 2, label: 'Miles per Hour (mph)' },
    { value: 3, label: 'Kilometers per Hour (km/h)' },
    { value: 4, label: 'Knots (kt)' },
];

// TemperatureUnits: 0 = Celsius, 1 = Fahrenheit
const TEMPERATURE_UNITS_OPTIONS = [
    { value: 0, label: 'Celsius (°C)' },
    { value: 1, label: 'Fahrenheit (°F)' },
];

// ─── Reusable styled components ───────────────────────────────────────────────

const SectionHeader = ({ icon, title, color = '#10B981' }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: alpha(color, 0.12),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 18 } })}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
            {title}
        </Typography>
    </Box>
);

const FieldRow = ({ label, hint, children }) => (
    <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        py: 1.5, borderBottom: '1px solid #F1F5F9',
        flexWrap: 'wrap', gap: 1,
    }}>
        <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.2 }}>
                {label}
            </Typography>
            {hint && (
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                    {hint}
                </Typography>
            )}
        </Box>
        <Box sx={{ minWidth: 220 }}>
            {children}
        </Box>
    </Box>
);

const StyledSelect = ({ value, onChange, options, disabled }) => (
    <FormControl size="small" fullWidth>
        <Select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            sx={{
                borderRadius: '10px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#10B981' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10B981' },
                fontSize: '0.85rem',
            }}
        >
            {options.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
        </Select>
    </FormControl>
);

const StyledSwitch = ({ value, onChange, disabled }) => (
    <Switch
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        disabled={disabled}
        sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10B981' },
        }}
    />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppDefaultsSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        followTarget: 2,
        androidSaveToSDCard: 1,
        takeoffAltSpeed: 30.0,
        yawBehavior: 0,
        virtualJoystick: 0,
        virtualJoystickAutoCenterThrottle: 1,
        distanceUnits: 1,   // 1 = Meters (0 = Feet)
        areaUnits: 1,       // 1 = SquareMeters (0 = SquareFeet)
        speedUnits: 1,      // 1 = MetersPerSecond (0 = FeetPerSecond)
        temperatureUnits: 0, // 0 = Celsius
        telemetrySave: 1,
        telemetrySaveNotArmed: 0,
    });

    // ── Fetch current defaults on mount ───────────────────────────────────────
    useEffect(() => {
        fetchDefaults();
    }, []);

    const fetchDefaults = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/app-defaults`);
            if (res.data.success) {
                const d = res.data.defaults;
                setForm({
                    followTarget: d.followTarget ?? 2,
                    androidSaveToSDCard: d.androidSaveToSDCard ?? 1,
                    takeoffAltSpeed: d.takeoffAltSpeed ?? 30.0,
                    yawBehavior: d.yawBehavior ?? 0,
                    virtualJoystick: d.virtualJoystick ?? 0,
                    virtualJoystickAutoCenterThrottle: d.virtualJoystickAutoCenterThrottle ?? 1,
                    distanceUnits: d.distanceUnits ?? 0,
                    areaUnits: d.areaUnits ?? 0,
                    speedUnits: d.speedUnits ?? 0,
                    temperatureUnits: d.temperatureUnits ?? 0,
                    telemetrySave: d.telemetrySave ?? 1,
                    telemetrySaveNotArmed: d.telemetrySaveNotArmed ?? 0,
                });
                if (d.updatedAt) setLastSaved(new Date(d.updatedAt));
            }
        } catch (err) {
            setError('Failed to load app defaults from server.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const set = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }));

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.put(`${API_URL}/app-defaults`, form);
            if (res.data.success) {
                setLastSaved(new Date(res.data.defaults.updatedAt));
                toast.success('App defaults saved! The QGC app will use these values on next "Reset to Defaults".');
            } else {
                toast.error('Failed to save defaults.');
            }
        } catch (err) {
            toast.error('Network error — could not reach server.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                        }}>
                            <TuneIcon sx={{ color: 'white', fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                                App Default Settings
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                                These values are applied when the user clicks "Reset to Defaults" in the QGC app
                            </Typography>
                        </Box>
                    </Box>

                    {lastSaved && (
                        <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                            label={`Last saved: ${lastSaved.toLocaleString()}`}
                            size="small"
                            sx={{
                                mt: 1,
                                bgcolor: alpha('#10B981', 0.08),
                                color: '#059669',
                                border: `1px solid ${alpha('#10B981', 0.2)}`,
                                '& .MuiChip-label': { fontWeight: 600, fontSize: '0.7rem' },
                            }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={fetchDefaults}
                        disabled={loading || saving}
                        sx={{
                            borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                            borderColor: '#E2E8F0', color: '#64748B',
                            '&:hover': { borderColor: '#10B981', color: '#10B981', bgcolor: alpha('#10B981', 0.04) },
                        }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={loading || saving}
                        sx={{
                            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                            '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 6px 20px rgba(16,185,129,0.45)' },
                            '&.Mui-disabled': { background: '#E2E8F0' },
                        }}
                    >
                        {saving ? 'Saving…' : 'Save Defaults'}
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* ── Flight Behavior ──────────────────────────────────────── */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ borderRadius: '20px', border: '1.5px solid #E2E8F0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<FlightIcon />} title="Flight Behavior" color="#10B981" />

                            {loading ? (
                                [1, 2, 3].map(i => <Skeleton key={i} height={56} sx={{ borderRadius: '8px', mb: 1 }} />)
                            ) : (
                                <>
                                    <FieldRow
                                        label="Stream GCS Position"
                                        hint="followTarget — when to stream position for Follow Me"
                                    >
                                        <StyledSelect
                                            value={form.followTarget}
                                            onChange={set('followTarget')}
                                            options={FOLLOW_TARGET_OPTIONS}
                                        />
                                    </FieldRow>

                                    <FieldRow
                                        label="Drone Yaw Behavior"
                                        hint="WP_YAW_BEHAVIOR — drone heading during waypoint flight"
                                    >
                                        <StyledSelect
                                            value={form.yawBehavior}
                                            onChange={set('yawBehavior')}
                                            options={YAW_BEHAVIOR_OPTIONS}
                                        />
                                    </FieldRow>

                                    <FieldRow
                                        label="Takeoff Climb Speed (cm/s)"
                                        hint="WPNAV_SPEED_UP — vertical climb rate during takeoff"
                                    >
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={form.takeoffAltSpeed}
                                            onChange={(e) => set('takeoffAltSpeed')(parseFloat(e.target.value) || 0)}
                                            inputProps={{ min: 0, max: 500, step: 5 }}
                                            fullWidth
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    '& fieldset': { borderColor: '#E2E8F0' },
                                                    '&:hover fieldset': { borderColor: '#10B981' },
                                                    '&.Mui-focused fieldset': { borderColor: '#10B981' },
                                                },
                                                '& input': { fontSize: '0.85rem' },
                                            }}
                                        />
                                    </FieldRow>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* ── Units ─────────────────────────────────────────────────── */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ borderRadius: '20px', border: '1.5px solid #E2E8F0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<RulerIcon />} title="Units" color="#6366F1" />

                            {loading ? (
                                [1, 2, 3, 4].map(i => <Skeleton key={i} height={56} sx={{ borderRadius: '8px', mb: 1 }} />)
                            ) : (
                                <>
                                    <FieldRow label="Distance Units" hint="Horizontal and vertical distance display">
                                        <StyledSelect
                                            value={form.distanceUnits}
                                            onChange={set('distanceUnits')}
                                            options={DISTANCE_UNITS_OPTIONS}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Area Units" hint="Spray / survey area display">
                                        <StyledSelect
                                            value={form.areaUnits}
                                            onChange={set('areaUnits')}
                                            options={AREA_UNITS_OPTIONS}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Speed Units" hint="Vehicle speed display">
                                        <StyledSelect
                                            value={form.speedUnits}
                                            onChange={set('speedUnits')}
                                            options={SPEED_UNITS_OPTIONS}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Temperature Units" hint="Ambient temperature display">
                                        <StyledSelect
                                            value={form.temperatureUnits}
                                            onChange={set('temperatureUnits')}
                                            options={TEMPERATURE_UNITS_OPTIONS}
                                        />
                                    </FieldRow>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* ── Virtual Joystick ──────────────────────────────────────── */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ borderRadius: '20px', border: '1.5px solid #E2E8F0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<SpeedIcon />} title="Virtual Joystick" color="#F59E0B" />

                            {loading ? (
                                [1, 2].map(i => <Skeleton key={i} height={56} sx={{ borderRadius: '8px', mb: 1 }} />)
                            ) : (
                                <>
                                    <FieldRow label="Enable Virtual Joystick" hint="Show on-screen joystick controls">
                                        <StyledSwitch value={form.virtualJoystick} onChange={set('virtualJoystick')} />
                                    </FieldRow>

                                    <FieldRow label="Auto-Center Throttle" hint="Throttle returns to center when released">
                                        <StyledSwitch value={form.virtualJoystickAutoCenterThrottle} onChange={set('virtualJoystickAutoCenterThrottle')} />
                                    </FieldRow>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* ── Storage / Telemetry ───────────────────────────────────── */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ borderRadius: '20px', border: '1.5px solid #E2E8F0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<StorageIcon />} title="Storage & Telemetry" color="#EC4899" />

                            {loading ? (
                                [1, 2, 3].map(i => <Skeleton key={i} height={56} sx={{ borderRadius: '8px', mb: 1 }} />)
                            ) : (
                                <>
                                    <FieldRow label="Save to SD Card (Android)" hint="Use external SD card for log storage">
                                        <StyledSwitch value={form.androidSaveToSDCard} onChange={set('androidSaveToSDCard')} />
                                    </FieldRow>

                                    <FieldRow label="Save Telemetry Logs" hint="Record flight telemetry automatically">
                                        <StyledSwitch value={form.telemetrySave} onChange={set('telemetrySave')} />
                                    </FieldRow>

                                    <FieldRow label="Save Logs When Not Armed" hint="Record telemetry even before arming">
                                        <StyledSwitch value={form.telemetrySaveNotArmed} onChange={set('telemetrySaveNotArmed')} />
                                    </FieldRow>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Info footer */}
            <Paper elevation={0} sx={{
                mt: 3, p: 2.5, borderRadius: '16px',
                background: alpha('#6366F1', 0.05),
                border: `1.5px solid ${alpha('#6366F1', 0.15)}`,
            }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <SettingsIcon sx={{ color: '#6366F1', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#3730A3', mb: 0.5 }}>
                            How it works
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4F46E5', lineHeight: 1.7 }}>
                            The QGC app fetches these defaults from the server when it starts up. When a user taps
                            <strong> "Reset to Defaults"</strong> in General Settings, the app applies the values you've set here — instead of using old hardcoded values. If the device cannot reach the server (offline mode), the app falls back to its built-in hardcoded defaults gracefully.
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
