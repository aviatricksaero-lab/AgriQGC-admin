import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Stack,
    Alert,
    InputAdornment,
    Tabs,
    Tab,
    Paper,
    FormControlLabel,
    Checkbox,
    Radio,
    RadioGroup
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import SettingsInputHdmiIcon from '@mui/icons-material/SettingsInputHdmi';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const BATT_ACTIONS = [
    { value: 0, label: '0 — None' },
    { value: 1, label: '1 — Land' },
    { value: 2, label: '2 — RTL (Return to Launch)' },
    { value: 3, label: '3 — SmartRTL' },
    { value: 4, label: '4 — SmartRTL or Land' },
    { value: 5, label: '5 — Terminate' }
];

const GCS_ACTIONS = [
    { value: 0, label: '0 — Disabled/NoAction' },
    { value: 1, label: '1 — RTL' },
    { value: 2, label: '2 — RTL or Continue with Mission in Auto Mode (Removed in 4.0+-see FS_OPTIONS)' },
    { value: 3, label: '3 — SmartRTL or RTL' },
    { value: 4, label: '4 — SmartRTL or Land' },
    { value: 5, label: '5 — Land' },
    { value: 6, label: '6 — Auto DO_LAND_START or RTL' },
    { value: 7, label: '7 — Brake or Land' }
];

const THR_ACTIONS = [
    { value: 0, label: '0 — Disabled' },
    { value: 1, label: '1 — Always RTL' },
    { value: 2, label: '2 — Continue with Mission in Auto Mode' },
    { value: 3, label: '3 — Always Land' }
];

const FENCE_BREACH_ACTIONS = [
    { value: 0, label: '0 — Report Only' },
    { value: 1, label: '1 — RTL or Land' },
    { value: 2, label: '2 — Always Land' },
    { value: 3, label: '3 — SmartRTL or RTL' },
    { value: 4, label: '4 — Brake or Land' },
    { value: 5, label: '5 — SmartRTL or Land' }
];

export default function FailsafeDefaultsSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);
    const [form, setForm] = useState({
        battLowAction: 2,
        battCritAction: 1,
        battLowMah: 500,
        battCritMah: 250,
        battVolt_3S: 10.0,
        battVolt_6S: 20.0,
        battVolt_12S: 40.0,
        battVolt_14S: 46.0,
        battVolt_18S: 60.0,
        battCritVolt_3S: 9.5,
        battCritVolt_6S: 19.0,
        battCritVolt_12S: 38.0,
        battCritVolt_14S: 44.0,
        battCritVolt_18S: 57.0,
        batt2LowAction: 2,
        batt2CritAction: 1,
        batt2LowMah: 500,
        batt2CritMah: 250,
        batt2Volt_3S: 10.0,
        batt2Volt_6S: 20.0,
        batt2Volt_12S: 40.0,
        batt2Volt_14S: 46.0,
        batt2Volt_18S: 60.0,
        batt2CritVolt_3S: 9.5,
        batt2CritVolt_6S: 19.0,
        batt2CritVolt_12S: 38.0,
        batt2CritVolt_14S: 44.0,
        batt2CritVolt_18S: 57.0,
        gcsFailsafe: 0,
        thrFailsafe: 0,
        thrPwmThreshold: 975,
        fenceEnabled: false,
        fenceAltMax: 394,
        fenceRadius: 0,
        fenceType: 3,
        fenceAction: 1,
        fenceMargin: 6.562,
        rtlAltMode: 1,
        rtlAltSpecified: 8000,
        rtlLoitTime: 0,
        rtlAltFinal: 0,
        landDescentSpeed: 50
    });

    useEffect(() => {
        fetchFailsafeDefaults();
    }, []);

    const fetchFailsafeDefaults = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/failsafe-defaults`);
            if (res.data.success && res.data.defaults) {
                setForm(res.data.defaults);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load failsafe defaults');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.put(`${API_URL}/failsafe-defaults`, form);
            if (res.data.success) {
                toast.success('Failsafe defaults saved successfully!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to save failsafe defaults');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, val) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Failsafe Default Configurations</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ boxShadow: 'none' }}
                >
                    {saving ? 'Saving...' : 'Save Defaults'}
                </Button>
            </Box>

            <Paper sx={{ mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <Tabs
                    value={tabIndex}
                    onChange={(e, newIdx) => setTabIndex(newIdx)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Battery 1 Failsafe" icon={<BatteryChargingFullIcon />} iconPosition="start" />
                    <Tab label="Battery 2 Failsafe" icon={<BatteryChargingFullIcon />} iconPosition="start" />
                    <Tab label="GeoFence Settings" icon={<GpsFixedIcon />} iconPosition="start" />
                    <Tab label="Return to Launch" icon={<FlightTakeoffIcon />} iconPosition="start" />
                    <Tab label="General Failsafe" icon={<SettingsInputHdmiIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {tabIndex === 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={5}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TuneIcon color="primary" /> Battery 1 Failsafe Triggers
                                </Typography>
                                <Stack spacing={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Low action:</InputLabel>
                                        <Select
                                            value={form.battLowAction}
                                            onChange={e => handleChange('battLowAction', Number(e.target.value))}
                                            label="Low action:"
                                        >
                                            {BATT_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel>Critical action:</InputLabel>
                                        <Select
                                            value={form.battCritAction}
                                            onChange={e => handleChange('battCritAction', Number(e.target.value))}
                                            label="Critical action:"
                                        >
                                            {BATT_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        label="Low mAH threshold:"
                                        type="number"
                                        value={form.battLowMah}
                                        onChange={e => handleChange('battLowMah', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">mAh</InputAdornment> }}
                                    />

                                    <TextField
                                        label="Critical mAH threshold:"
                                        type="number"
                                        value={form.battCritMah}
                                        onChange={e => handleChange('battCritMah', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">mAh</InputAdornment> }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BatteryChargingFullIcon color="primary" /> Battery 1 Voltage Thresholds by Cell Count
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Low Voltage Threshold</Typography>
                                        <Stack spacing={2}>
                                            {['3S', '6S', '12S', '14S', '18S'].map((cell) => (
                                                <TextField
                                                    key={cell}
                                                    label={`${cell} Voltage`}
                                                    type="number"
                                                    inputProps={{ step: 0.1 }}
                                                    value={form[`battVolt_${cell}`]}
                                                    onChange={e => handleChange(`battVolt_${cell}`, Number(e.target.value))}
                                                    InputProps={{ endAdornment: <InputAdornment position="end">V</InputAdornment> }}
                                                    size="small"
                                                />
                                            ))}
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Critical Voltage Threshold</Typography>
                                        <Stack spacing={2}>
                                            {['3S', '6S', '12S', '14S', '18S'].map((cell) => (
                                                <TextField
                                                    key={cell}
                                                    label={`${cell} Critical`}
                                                    type="number"
                                                    inputProps={{ step: 0.1 }}
                                                    value={form[`battCritVolt_${cell}`]}
                                                    onChange={e => handleChange(`battCritVolt_${cell}`, Number(e.target.value))}
                                                    InputProps={{ endAdornment: <InputAdornment position="end">V</InputAdornment> }}
                                                    size="small"
                                                />
                                            ))}
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {tabIndex === 1 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={5}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TuneIcon color="primary" /> Battery 2 Failsafe Triggers
                                </Typography>
                                <Stack spacing={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Low action:</InputLabel>
                                        <Select
                                            value={form.batt2LowAction}
                                            onChange={e => handleChange('batt2LowAction', Number(e.target.value))}
                                            label="Low action:"
                                        >
                                            {BATT_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel>Critical action:</InputLabel>
                                        <Select
                                            value={form.batt2CritAction}
                                            onChange={e => handleChange('batt2CritAction', Number(e.target.value))}
                                            label="Critical action:"
                                        >
                                            {BATT_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        label="Low mAH threshold:"
                                        type="number"
                                        value={form.batt2LowMah}
                                        onChange={e => handleChange('batt2LowMah', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">mAh</InputAdornment> }}
                                    />

                                    <TextField
                                        label="Critical mAH threshold:"
                                        type="number"
                                        value={form.batt2CritMah}
                                        onChange={e => handleChange('batt2CritMah', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">mAh</InputAdornment> }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BatteryChargingFullIcon color="primary" /> Battery 2 Voltage Thresholds by Cell Count
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Low Voltage Threshold</Typography>
                                        <Stack spacing={2}>
                                            {['3S', '6S', '12S', '14S', '18S'].map((cell) => (
                                                <TextField
                                                    key={cell}
                                                    label={`${cell} Voltage`}
                                                    type="number"
                                                    inputProps={{ step: 0.1 }}
                                                    value={form[`batt2Volt_${cell}`]}
                                                    onChange={e => handleChange(`batt2Volt_${cell}`, Number(e.target.value))}
                                                    InputProps={{ endAdornment: <InputAdornment position="end">V</InputAdornment> }}
                                                    size="small"
                                                />
                                            ))}
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Critical Voltage Threshold</Typography>
                                        <Stack spacing={2}>
                                            {['3S', '6S', '12S', '14S', '18S'].map((cell) => (
                                                <TextField
                                                    key={cell}
                                                    label={`${cell} Critical`}
                                                    type="number"
                                                    inputProps={{ step: 0.1 }}
                                                    value={form[`batt2CritVolt_${cell}`]}
                                                    onChange={e => handleChange(`batt2CritVolt_${cell}`, Number(e.target.value))}
                                                    InputProps={{ endAdornment: <InputAdornment position="end">V</InputAdornment> }}
                                                    size="small"
                                                />
                                            ))}
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {tabIndex === 2 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <GpsFixedIcon color="primary" /> GeoFence Configurations
                                </Typography>
                                <Stack spacing={3}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={form.fenceEnabled}
                                                onChange={e => handleChange('fenceEnabled', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Enabled"
                                    />

                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={Boolean(form.fenceType & 1)} onChange={e => handleChange('fenceType', e.target.checked ? (form.fenceType | 1) : (form.fenceType & ~1))} />}
                                            label="Maximum Altitude"
                                            sx={{ minWidth: 200 }}
                                        />
                                        <TextField
                                            type="number"
                                            value={form.fenceAltMax}
                                            onChange={e => handleChange('fenceAltMax', Number(e.target.value))}
                                            disabled={!Boolean(form.fenceType & 1)}
                                            size="small"
                                            fullWidth
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={Boolean(form.fenceType & 2)} onChange={e => handleChange('fenceType', e.target.checked ? (form.fenceType | 2) : (form.fenceType & ~2))} />}
                                            label="Circle centered on Home"
                                            sx={{ minWidth: 200 }}
                                        />
                                        <TextField
                                            type="number"
                                            value={form.fenceRadius}
                                            onChange={e => handleChange('fenceRadius', Number(e.target.value))}
                                            disabled={!Boolean(form.fenceType & 2)}
                                            size="small"
                                            fullWidth
                                        />
                                    </Box>

                                    <FormControlLabel
                                        control={<Checkbox checked={Boolean(form.fenceType & 4)} onChange={e => handleChange('fenceType', e.target.checked ? (form.fenceType | 4) : (form.fenceType & ~4))} />}
                                        label="Inclusion/Exclusion Circles+Polygons"
                                    />

                                    <FormControl fullWidth>
                                        <InputLabel>Breach action:</InputLabel>
                                        <Select
                                            value={form.fenceAction}
                                            onChange={e => handleChange('fenceAction', Number(e.target.value))}
                                            label="Breach action:"
                                        >
                                            {FENCE_BREACH_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        label="Fence margin:"
                                        type="number"
                                        inputProps={{ step: 0.001 }}
                                        value={form.fenceMargin}
                                        onChange={e => handleChange('fenceMargin', Number(e.target.value))}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {tabIndex === 3 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FlightTakeoffIcon color="primary" /> Return to Launch (RTL) Configurations
                                </Typography>
                                <Stack spacing={3}>
                                    <FormControl component="fieldset">
                                        <RadioGroup
                                            value={form.rtlAltMode}
                                            onChange={e => handleChange('rtlAltMode', Number(e.target.value))}
                                        >
                                            <FormControlLabel value={0} control={<Radio />} label="Return at current altitude" />
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                                                <FormControlLabel value={1} control={<Radio />} label="Return at specified altitude:" />
                                                <TextField
                                                    type="number"
                                                    value={form.rtlAltSpecified}
                                                    onChange={e => handleChange('rtlAltSpecified', Number(e.target.value))}
                                                    disabled={form.rtlAltMode !== 1}
                                                    size="small"
                                                />
                                            </Box>
                                        </RadioGroup>
                                    </FormControl>

                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={form.rtlLoitTime > 0} onChange={e => handleChange('rtlLoitTime', e.target.checked ? 60 : 0)} />}
                                            label="Loiter above Home for:"
                                            sx={{ minWidth: 200 }}
                                        />
                                        <TextField
                                            type="number"
                                            value={form.rtlLoitTime}
                                            onChange={e => handleChange('rtlLoitTime', Number(e.target.value))}
                                            disabled={form.rtlLoitTime === 0}
                                            size="small"
                                            InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
                                        />
                                    </Box>

                                    <TextField
                                        label="Final land stage altitude:"
                                        type="number"
                                        value={form.rtlAltFinal}
                                        onChange={e => handleChange('rtlAltFinal', Number(e.target.value))}
                                    />

                                    <TextField
                                        label="Final land stage descent speed:"
                                        type="number"
                                        value={form.landDescentSpeed}
                                        onChange={e => handleChange('landDescentSpeed', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">cm/s</InputAdornment> }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {tabIndex === 4 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SettingsInputHdmiIcon color="primary" /> Ground Station Failsafe
                                </Typography>
                                <FormControl fullWidth sx={{ mt: 1 }}>
                                    <InputLabel>GCS Failsafe Mode (FS_GCS_ENABLE)</InputLabel>
                                    <Select
                                        value={form.gcsFailsafe}
                                        onChange={e => handleChange('gcsFailsafe', Number(e.target.value))}
                                        label="GCS Failsafe Mode (FS_GCS_ENABLE)"
                                    >
                                        {GCS_ACTIONS.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TuneIcon color="primary" /> Throttle Failsafe
                                </Typography>
                                <Stack spacing={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Throttle Failsafe Action (FS_THR_ENABLE)</InputLabel>
                                        <Select
                                            value={form.thrFailsafe}
                                            onChange={e => handleChange('thrFailsafe', Number(e.target.value))}
                                            label="Throttle Failsafe Action (FS_THR_ENABLE)"
                                        >
                                            {THR_ACTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        label="Throttle PWM Threshold (FS_THR_VALUE)"
                                        type="number"
                                        value={form.thrPwmThreshold}
                                        onChange={e => handleChange('thrPwmThreshold', Number(e.target.value))}
                                        InputProps={{ endAdornment: <InputAdornment position="end">μs</InputAdornment> }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
