import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box, Paper, Typography, Chip, IconButton, Tooltip,
    TextField, InputAdornment, Alert, Skeleton, alpha,
    Stack, CircularProgress, Avatar
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    FlightTakeoff as FlightIcon,
    Person as PersonIcon,
    CalendarToday as CalIcon,
    Straighten as DistIcon,
    Height as AltIcon,
    Map as MapIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    ChevronRight as ChevronRightIcon,
    MyLocation as WPIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL;

// ── QGC MAVLink command codes ─────────────────────────────────────────────────
const CMD = { TAKEOFF: 22, WAYPOINT: 16, RTL: 20, LAND: 21 };

// ── Parse QGC plan_data into structured waypoints ────────────────────────────
function parsePlan(plan_data) {
    if (!plan_data) return { home: null, waypoints: [], polygons: [], surveyPaths: [], fenceCircles: [] };
    const home = plan_data?.mission?.plannedHomePosition ?? null;
    const items = plan_data?.mission?.items ?? plan_data?.items ?? [];

    const waypoints = [];
    const polygons = [];
    const surveyPaths = [];
    const fenceCircles = [];

    // Parse root-level boundaryPoints (marked polygon)
    const boundaryPoints = plan_data?.boundaryPoints ?? [];
    if (Array.isArray(boundaryPoints) && boundaryPoints.length > 0) {
        const polyCoords = boundaryPoints.map(pt => ({
            lat: parseFloat(pt.lat ?? pt.latitude ?? 0),
            lng: parseFloat(pt.lon ?? pt.lng ?? pt.longitude ?? 0)
        })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
        if (polyCoords.length > 0) {
            polygons.push(polyCoords);
        }
    }

    // Parse geoFence polygons (Geofence area)
    const fencePolys = plan_data?.geoFence?.polygons ?? [];
    for (const fence of fencePolys) {
        if (Array.isArray(fence.polygon)) {
            const polyCoords = fence.polygon.map(pt => ({
                lat: parseFloat(pt[0]),
                lng: parseFloat(pt[1])
            })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
            if (polyCoords.length > 0) {
                polygons.push(polyCoords);
            }
        }
    }

    // Parse geoFence circles — handle all known QGC formats
    const fenceCirclesRaw = plan_data?.geoFence?.circles ?? [];
    for (const c of fenceCirclesRaw) {
        // Format 1: { circle: { center: [lat,lng], radius: N }, inclusion: bool }
        // Format 2: { center: [lat,lng], radius: N, inclusion: bool }
        const centerArr = c?.circle?.center ?? c?.center ?? null;
        const radius = parseFloat(c?.circle?.radius ?? c?.radius ?? 0);
        if (!centerArr || radius <= 0) continue;
        const lat = parseFloat(Array.isArray(centerArr) ? centerArr[0] : (centerArr.lat ?? 0));
        const lng = parseFloat(Array.isArray(centerArr) ? centerArr[1] : (centerArr.lng ?? centerArr.lon ?? 0));
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            fenceCircles.push({ lat, lng, radius, inclusion: c?.inclusion ?? true });
        }
    }

    // ── Custom Agri fenceData (circle drawn in app, stored as fenceData field) ──
    const fd = plan_data?.fenceData;
    if (fd && fd.enabled === true && fd.radius > 0 && fd.lat && fd.lon) {
        fenceCircles.push({
            lat: parseFloat(fd.lat),
            lng: parseFloat(fd.lon),
            radius: parseFloat(fd.radius),
            inclusion: true
        });
    }

    for (const item of items) {
        if (item?.type === "ComplexItem" || item?.complexItemType || item?.TransectStyleComplexItem) {
            const type = item?.complexItemType;
            if (type === "Survey" || item?.TransectStyleComplexItem) {
                if (Array.isArray(item.polygon)) {
                    const polyCoords = item.polygon.map(pt => ({
                        lat: parseFloat(pt[0]),
                        lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (polyCoords.length > 0) {
                        polygons.push(polyCoords);
                    }
                }
                const transectPoints = item.TransectStyleComplexItem?.VisualTransectPoints;
                if (Array.isArray(transectPoints) && transectPoints.length > 0) {
                    const pathCoords = transectPoints.map(pt => ({
                        lat: parseFloat(pt[0]),
                        lng: parseFloat(pt[1]),
                        alt: parseFloat(item.TransectStyleComplexItem?.CameraCalc?.distanceToSurface ?? 0)
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (pathCoords.length > 0) {
                        surveyPaths.push(pathCoords);
                    }
                } else {
                    // Fallback: build survey path from nested Items (command 16)
                    const nestedItems = item.TransectStyleComplexItem?.Items ?? [];
                    const pathCoords = [];
                    for (const nested of nestedItems) {
                        if (nested.command === 16) {
                            const params = nested?.params ?? [];
                            const lat = parseFloat(params[4] ?? nested?.lat ?? 0);
                            const lng = parseFloat(params[5] ?? nested?.lng ?? 0);
                            const alt = parseFloat(params[6] ?? nested?.alt ?? 0);
                            if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
                                pathCoords.push({ lat, lng, alt });
                            }
                        }
                    }
                    if (pathCoords.length > 0) {
                        surveyPaths.push(pathCoords);
                    }
                }
            } else if (type === "Spot Spraying") {
                const points = item.points;
                if (Array.isArray(points)) {
                    for (const ptObj of points) {
                        const coord = ptObj.coordinate;
                        if (Array.isArray(coord) && coord.length >= 2) {
                            waypoints.push({
                                lat: parseFloat(coord[0]),
                                lng: parseFloat(coord[1]),
                                alt: parseFloat(ptObj.altitude ?? coord[2] ?? 0),
                                cmd: 16,
                                isSpotSpraying: true,
                                raw: ptObj
                            });
                        }
                    }
                }
            } else if (type === "CorridorScan") {
                if (Array.isArray(item.polyline)) {
                    const polyCoords = item.polyline.map(pt => ({
                        lat: parseFloat(pt[0]),
                        lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (polyCoords.length > 0) {
                        polygons.push(polyCoords);
                    }
                }
                const transectPoints = item.TransectStyleComplexItem?.VisualTransectPoints;
                if (Array.isArray(transectPoints) && transectPoints.length > 0) {
                    const pathCoords = transectPoints.map(pt => ({
                        lat: parseFloat(pt[0]),
                        lng: parseFloat(pt[1]),
                        alt: parseFloat(item.TransectStyleComplexItem?.CameraCalc?.distanceToSurface ?? 0)
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (pathCoords.length > 0) {
                        surveyPaths.push(pathCoords);
                    }
                } else {
                    // Fallback: build survey path from nested Items (command 16)
                    const nestedItems = item.TransectStyleComplexItem?.Items ?? [];
                    const pathCoords = [];
                    for (const nested of nestedItems) {
                        if (nested.command === 16) {
                            const params = nested?.params ?? [];
                            const lat = parseFloat(params[4] ?? nested?.lat ?? 0);
                            const lng = parseFloat(params[5] ?? nested?.lng ?? 0);
                            const alt = parseFloat(params[6] ?? nested?.alt ?? 0);
                            if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
                                pathCoords.push({ lat, lng, alt });
                            }
                        }
                    }
                    if (pathCoords.length > 0) {
                        surveyPaths.push(pathCoords);
                    }
                }
            } else if (type === "StructureScan") {
                if (Array.isArray(item.polygon)) {
                    const polyCoords = item.polygon.map(pt => ({
                        lat: parseFloat(pt[0]),
                        lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (polyCoords.length > 0) {
                        polygons.push(polyCoords);
                    }
                }
            }
        } else {
            const params = item?.params ?? [];
            const lat = parseFloat(params[4] ?? item?.lat ?? 0);
            const lng = parseFloat(params[5] ?? item?.lng ?? 0);
            const alt = parseFloat(params[6] ?? item?.alt ?? 0);
            const cmd = item?.command ?? item?.Command ?? 16;
            if (lat === 0 && lng === 0) continue;
            if (isNaN(lat) || isNaN(lng)) continue;
            waypoints.push({ lat, lng, alt, cmd, raw: item });
        }
    }
    return {
        home: home ? { lat: home[0], lng: home[1], alt: home[2] ?? 0 } : null,
        waypoints,
        polygons,
        surveyPaths,
        fenceCircles
    };
}

function calcDistance(wps) {
    if (wps.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < wps.length; i++) total += L.latLng(wps[i - 1].lat, wps[i - 1].lng).distanceTo(L.latLng(wps[i].lat, wps[i].lng));
    return total;
}
function fmtDist(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`; }

// ── Leaflet icon factories (exact QGC style) ──────────────────────────────────
// Simple orange filled dot — matches QGC app home marker style (no text)
function homeIcon() {
    return L.divIcon({
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.65);"></div>`
    });
}
function waypointIcon(num, cmd) {
    const isTO = cmd === CMD.TAKEOFF;
    const isRTL = cmd === CMD.RTL || cmd === CMD.LAND;
    const bg = isTO ? '#10B981' : isRTL ? '#EF4444' : '#ffffff';
    const fg = isTO || isRTL ? 'white' : '#222222';
    const label = isTO ? '▲' : isRTL ? 'R' : num;
    return L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2.5px solid ${isTO ? '#10B981' : isRTL ? '#EF4444' : '#555555'};box-shadow:0 2px 8px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-size:${typeof label === 'number' && label > 9 ? '10px' : '12px'};font-weight:800;color:${fg};">${label}</div>`
    });
}
function startFinishIcon(label) {
    return L.divIcon({
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;background:#D97706;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:white;">${label}</div>`
    });
}

// ── Single Mission Map Component ──────────────────────────────────────────────
function MissionMap({ mission }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const lgRef = useRef(null);

    const { home, waypoints, polygons, surveyPaths, fenceCircles } = useMemo(() => parsePlan(mission?.plan_data), [mission]);
    const effectiveWps = useMemo(() => {
        if (waypoints.length > 0) return waypoints;
        return (mission?.geometry?.coordinates ?? []).map(c => ({ lat: c[1], lng: c[0], alt: 0, cmd: 16 }));
    }, [waypoints, mission]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        
        const map = L.map(containerRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: true, attributionControl: true });
        
        // Google Hybrid (Satellite + Place Names)
        const hybrid = L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
            attribution: '© Google', maxZoom: 22, maxNativeZoom: 20
        }).addTo(map);

        // Google Streets
        const streets = L.tileLayer('http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', {
            attribution: '© Google', maxZoom: 22, maxNativeZoom: 20
        });

        L.control.layers({ 'Satellite Hybrid': hybrid, 'Streets': streets }, {}, { position: 'topright' }).addTo(map);

        lgRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        return () => { map.remove(); mapRef.current = null; lgRef.current = null; };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const lg = lgRef.current;
        if (!map || !lg) return;
        lg.clearLayers();

        const allPoints = [];

        // ── Geofence Circles ──────────────────────────────────────────────────
        fenceCircles.forEach((circle) => {
            L.circle([circle.lat, circle.lng], {
                radius: circle.radius,
                color: '#F5C518',
                weight: 3,
                opacity: 1,
                fillColor: '#F5C518',
                fillOpacity: 0.0,
            }).bindPopup(`<b>🟡 ${circle.inclusion ? 'Inclusion' : 'Exclusion'} Geofence Circle</b><br/>Center: ${circle.lat.toFixed(6)}, ${circle.lng.toFixed(6)}<br/>Radius: ${circle.radius} m`)
              .addTo(lg);
            allPoints.push([circle.lat, circle.lng]);
        });

        // Draw Polygons (Survey Areas / Geofence)
        polygons.forEach((poly) => {
            const latLngs = poly.map(pt => [pt.lat, pt.lng]);
            L.polygon(latLngs, {
                color: '#10B981',
                weight: 2.5,
                opacity: 0.9,
                fillColor: '#10B981',
                fillOpacity: 0.15,
                dashArray: '5, 8'
            }).addTo(lg);
            allPoints.push(...latLngs);
        });

        // Draw Survey/Transect Flight Paths
        surveyPaths.forEach((path) => {
            const latLngs = path.map(pt => [pt.lat, pt.lng]);
            L.polyline(latLngs, { color: '#000000', weight: 6, opacity: 0.35 }).addTo(lg);
            L.polyline(latLngs, { color: '#ffffff', weight: 3, opacity: 0.95 }).addTo(lg);

            if (latLngs.length > 0) {
                const startPt = latLngs[0];
                L.marker(startPt, { icon: startFinishIcon('S'), zIndexOffset: 1500 })
                    .bindPopup(`<b>Start of Survey</b><br/>Lat: ${startPt[0].toFixed(7)}<br/>Lng: ${startPt[1].toFixed(7)}`)
                    .addTo(lg);
                if (latLngs.length > 1) {
                    const endPt = latLngs[latLngs.length - 1];
                    L.marker(endPt, { icon: startFinishIcon('F'), zIndexOffset: 1500 })
                        .bindPopup(`<b>Finish of Survey</b><br/>Lat: ${endPt[0].toFixed(7)}<br/>Lng: ${endPt[1].toFixed(7)}`)
                        .addTo(lg);
                }
            }
            allPoints.push(...latLngs);
        });

        if (effectiveWps.length === 0) {
            if (allPoints.length > 0) map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 20 });
            return;
        }

        const latLngs = effectiveWps.map(w => [w.lat, w.lng]);
        allPoints.push(...latLngs);

        L.polyline(latLngs, { color: '#000000', weight: 6, opacity: 0.35 }).addTo(lg);
        L.polyline(latLngs, { color: '#ffffff', weight: 2, opacity: 0.9 }).addTo(lg);

        for (let i = 1; i < effectiveWps.length; i++) {
            const a = effectiveWps[i - 1], b = effectiveWps[i];
            const dist = L.latLng(a.lat, a.lng).distanceTo(L.latLng(b.lat, b.lng));
            L.marker([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2], {
                icon: L.divIcon({ className: '', iconSize: [60, 18], iconAnchor: [30, 9], html: `<div style="background:rgba(0,0,0,0.6);border-radius:4px;padding:1px 5px;font-size:11px;font-weight:600;color:white;white-space:nowrap;text-align:center;">${fmtDist(dist)}</div>` }),
                interactive: false,
            }).addTo(lg);
        }

        let wpNum = 1;
        effectiveWps.forEach((wp) => {
            const icon = waypointIcon(wpNum, wp.cmd);
            const cmdLabel = wp.cmd === CMD.TAKEOFF ? 'Takeoff' : wp.cmd === CMD.RTL ? 'RTL' : wp.cmd === CMD.LAND ? 'Land' : `Waypoint ${wpNum}`;
            L.marker([wp.lat, wp.lng], { icon, zIndexOffset: 1000 })
                .bindPopup(`<div style="font-family:sans-serif;min-width:170px"><b style="color:#10B981">${cmdLabel}</b><br/>Lat: ${wp.lat.toFixed(7)}<br/>Lng: ${wp.lng.toFixed(7)}<br/>Alt: ${wp.alt} m AGL</div>`, { maxWidth: 220 })
                .addTo(lg);
            wpNum++;
        });

        if (allPoints.length > 0) map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 20 });
    }, [effectiveWps, home, polygons, surveyPaths, fenceCircles]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Small stat pill ───────────────────────────────────────────────────────────
function Pill({ icon, label, value, color = '#10B981' }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.6, bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.25)}`, borderRadius: 2 }}>
            <Box sx={{ color, display: 'flex' }}>{icon}</Box>
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1, fontSize: '0.63rem' }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.3, fontSize: '0.78rem' }}>{value}</Typography>
            </Box>
        </Box>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
const MissionViewer = () => {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedMission, setSelectedMission] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [planSearch, setPlanSearch] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => { fetchMissions(); }, []);

    const fetchMissions = async () => {
        try { setLoading(true); setError(null);
            const res = await axios.get(`${API_URL}/missions`);
            setMissions(res.data);
        } catch { setError('Failed to fetch missions.'); }
        finally { setLoading(false); }
    };

    const userGroups = useMemo(() => {
        const map = {};
        for (const m of missions) {
            if (!map[m.username]) map[m.username] = [];
            map[m.username].push(m);
        }
        return Object.entries(map).filter(([u]) => !userSearch || u.toLowerCase().includes(userSearch.toLowerCase())).sort(([a], [b]) => a.localeCompare(b));
    }, [missions, userSearch]);

    const userPlans = useMemo(() => {
        if (!selectedUser) return [];
        return missions.filter(m => m.username === selectedUser).filter(m => !planSearch || m.mission_name.toLowerCase().includes(planSearch.toLowerCase())).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [missions, selectedUser, planSearch]);

    const deleteMission = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this mission?')) return;
        try {
            setDeletingId(id);
            await axios.delete(`${API_URL}/missions/${id}`);
            toast.success('Mission deleted');
            setMissions(prev => prev.filter(m => m._id !== id));
            if (selectedMission?._id === id) setSelectedMission(null);
        } catch { toast.error('Delete failed'); }
        finally { setDeletingId(null); }
    };

    const exportPlan = (m, e) => {
        e.stopPropagation();
        const blob = new Blob([JSON.stringify(m.plan_data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `${m.mission_name.replace(/\s+/g, '_')}.plan` }).click();
        URL.revokeObjectURL(url);
        toast.success('.plan downloaded');
    };

    const { home: selHome, waypoints: selWps, polygons: selPolys, surveyPaths: selSurveyPaths, fenceCircles: selFenceCircles } = useMemo(() => parsePlan(selectedMission?.plan_data), [selectedMission]);
    const effectiveSelWps = useMemo(() => {
        if (selWps.length > 0) return selWps;
        if (selSurveyPaths.length > 0) {
            return selSurveyPaths.flatMap((path) => path.map((pt) => ({
                lat: pt.lat,
                lng: pt.lng,
                alt: pt.alt ?? 0,
                cmd: 16
            })));
        }
        return (selectedMission?.geometry?.coordinates ?? []).map(c => ({ lat: c[1], lng: c[0], alt: 0 }));
    }, [selWps, selSurveyPaths, selectedMission]);
    const totalDist = useMemo(() => calcDistance(effectiveSelWps), [effectiveSelWps]);
    const maxAlt = useMemo(() => effectiveSelWps.length ? Math.max(...effectiveSelWps.map(w => w.alt)) : 0, [effectiveSelWps]);

    const panelBg = 'rgba(13,13,20,0.97)';
    const borderColor = 'rgba(255,255,255,0.07)';

    return (
        <Box sx={{ display: 'flex', gap: 1.5, height: 'calc(100vh - 130px)', minHeight: 520 }}>

            {/* ═══════════════════════════════ PANEL 1: USERS ═══════════════════════════════ */}
            <Paper sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', border: `1px solid ${borderColor}`, background: panelBg }}>
                
                <Box sx={{ p: 1.5, borderBottom: `1px solid ${borderColor}` }}>
                    <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 800, mb: 1 }}>
                        👤 Pilots
                    </Typography>
                    <TextField
                        size="small" fullWidth placeholder="Search pilots..."
                        value={userSearch} onChange={e => { setUserSearch(e.target.value); setSelectedUser(null); setSelectedMission(null); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.secondary' }} /></InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } } }}
                    />
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
                    {error && <Alert severity="error" sx={{ m: 0.5, fontSize: '0.75rem' }}>{error}</Alert>}
                    {loading
                        ? [...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 0.5, bgcolor: 'rgba(255,255,255,0.04)' }} />)
                        : userGroups.map(([username, plans]) => {
                            const isActive = selectedUser === username;
                            return (
                                <Box key={username} onClick={() => { setSelectedUser(username); setPlanSearch(''); setSelectedMission(null); }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1, p: 1.2, mb: 0.4,
                                        borderRadius: 2, cursor: 'pointer', transition: 'all 0.18s',
                                        background: isActive ? `linear-gradient(135deg, ${alpha('#10B981', 0.18)}, ${alpha('#6366F1', 0.1)})` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isActive ? alpha('#10B981', 0.5) : 'transparent'}`,
                                        '&:hover': { background: 'rgba(255,255,255,0.07)', border: `1px solid ${alpha('#10B981', 0.3)}` }
                                    }}>
                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', fontWeight: 800, background: isActive ? 'linear-gradient(135deg,#10B981,#6366F1)' : 'rgba(99,102,241,0.3)', border: isActive ? '2px solid #10B981' : 'none' }}>
                                        {username[0].toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: isActive ? '#10B981' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                            {username}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.67rem' }}>
                                            {plans.length} plan{plans.length !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                    {isActive && <ChevronRightIcon sx={{ color: '#10B981', fontSize: 16 }} />}
                                </Box>
                            );
                        })
                    }
                </Box>
            </Paper>

            {/* ═══════════════════════════════ PANEL 2: PLANS ═══════════════════════════════ */}
            <Paper sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', border: `1px solid ${borderColor}`, background: panelBg, transition: 'all 0.2s' }}>
                {!selectedUser ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, p: 3 }}>
                        <PersonIcon sx={{ fontSize: 44, color: alpha('#10B981', 0.3) }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            Select a pilot to see their mission plans
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ p: 2, borderBottom: `1px solid ${borderColor}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                                <Avatar sx={{ width: 26, height: 26, fontSize: '0.7rem', background: 'linear-gradient(135deg,#10B981,#6366F1)', fontWeight: 800 }}>
                                    {selectedUser[0].toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981', lineHeight: 1 }}>{selectedUser}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{userPlans.length} mission plans</Typography>
                                </Box>
                            </Box>
                            <TextField
                                size="small" fullWidth placeholder="Search plans..."
                                value={planSearch} onChange={e => setPlanSearch(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.secondary' }} /></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } } }}
                            />
                        </Box>

                        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                            {userPlans.length === 0
                                ? <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>No plans found</Typography>
                                : userPlans.map(m => {
                                    const isActive = selectedMission?._id === m._id;
                                    const { waypoints: wps } = parsePlan(m.plan_data);
                                    const wpCount = wps.length || (m.geometry?.coordinates?.length ?? 0);
                                    return (
                                        <Box key={m._id} onClick={() => setSelectedMission(m)}
                                            sx={{
                                                p: 1.3, mb: 0.5, borderRadius: 2, cursor: 'pointer',
                                                transition: 'all 0.18s',
                                                background: isActive ? `linear-gradient(135deg, ${alpha('#10B981', 0.15)}, ${alpha('#6366F1', 0.07)})` : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${isActive ? alpha('#10B981', 0.5) : 'transparent'}`,
                                                '&:hover': { background: 'rgba(255,255,255,0.07)', border: `1px solid ${alpha('#10B981', 0.3)}` }
                                            }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                <Box sx={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, background: isActive ? 'linear-gradient(135deg,#10B981,#6366F1)' : 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FlightIcon sx={{ color: isActive ? 'white' : '#818CF8', fontSize: 15 }} />
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: isActive ? '#10B981' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.83rem' }}>
                                                        {m.mission_name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                                        <CalIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem' }}>
                                                            {m.date || new Date(m.created_at).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.4 }}>
                                                        <Chip label={`${wpCount} WPs`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha('#6366F1', 0.18), color: '#818CF8', border: `1px solid ${alpha('#6366F1', 0.3)}`, '& .MuiChip-label': { px: 0.6 } }} />
                                                        <Box sx={{ display: 'flex', gap: 0.2 }}>
                                                            <Tooltip title="Export .plan">
                                                                <IconButton size="small" onClick={e => exportPlan(m, e)} sx={{ p: 0.3, color: '#10B981', '&:hover': { bgcolor: alpha('#10B981', 0.1) } }}>
                                                                    <DownloadIcon sx={{ fontSize: 13 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton size="small" onClick={e => deleteMission(m._id, e)} disabled={deletingId === m._id} sx={{ p: 0.3, color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
                                                                    {deletingId === m._id ? <CircularProgress size={10} sx={{ color: '#EF4444' }} /> : <DeleteIcon sx={{ fontSize: 13 }} />}
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })
                            }
                        </Box>
                    </>
                )}
            </Paper>

            {/* ═══════════════════════════════ PANEL 3: MAP ════════════════════════════════ */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                {selectedMission ? (
                    <>
                        <Paper sx={{ px: 2, py: 1.2, borderRadius: 2.5, border: `1px solid ${borderColor}`, background: panelBg }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        ✈️ {selectedMission.mission_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Pilot: <b style={{ color: '#10B981' }}>{selectedMission.username}</b> · {selectedMission.date || new Date(selectedMission.created_at).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                                    <Pill icon={<WPIcon sx={{ fontSize: 14 }} />} label="Waypoints" value={effectiveSelWps.length} color="#6366F1" />
                                    <Pill icon={<DistIcon sx={{ fontSize: 14 }} />} label="Total Dist" value={fmtDist(totalDist)} color="#10B981" />
                                    <Pill icon={<AltIcon sx={{ fontSize: 14 }} />} label="Max Alt" value={`${maxAlt} m`} color="#F59E0B" />
                                </Stack>
                                <Tooltip title="Close Plan">
                                    <IconButton size="small" onClick={() => setSelectedMission(null)} sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Paper>
                        <Paper sx={{ flex: 1, borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative' }}>
                            <MissionMap key={selectedMission._id} mission={selectedMission} />
                        </Paper>
                    </>
                ) : (
                    <Paper sx={{ flex: 1, borderRadius: 2.5, border: `1px solid ${borderColor}`, background: panelBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: '18px', background: `linear-gradient(135deg,${alpha('#10B981', 0.18)},${alpha('#6366F1', 0.18)})`, border: `2px solid ${alpha('#10B981', 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapIcon sx={{ fontSize: 36, color: '#10B981' }} />
                        </Box>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                            Select a Mission Plan
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 300 }}>
                            Choose a plan from {selectedUser}'s list to visualize the exact flight path on the satellite map.
                        </Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default MissionViewer;
