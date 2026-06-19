// import React, { useState, useEffect, useRef } from 'react';
// import { Box, Paper, Typography, CircularProgress, alpha, Stack } from '@mui/material';
// import { Map as MapIcon } from '@mui/icons-material';
// import axios from 'axios';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';

// const API_URL = import.meta.env.VITE_API_URL;

// // ── Parse QGC plan_data into all visual elements ──────────────────────────────
// function parsePlan(plan_data) {
//     if (!plan_data) return { home: null, waypoints: [], polygons: [], surveyPaths: [], fenceCircles: [] };
//     const home = plan_data?.mission?.plannedHomePosition ?? null;
//     const items = plan_data?.mission?.items ?? plan_data?.items ?? [];
//     const waypoints = [];
//     const polygons = [];
//     const surveyPaths = [];
//     const fenceCircles = [];

//     // geoFence polygons
//     const fencePolys = plan_data?.geoFence?.polygons ?? [];
//     for (const fence of fencePolys) {
//         if (Array.isArray(fence.polygon)) {
//             const coords = fence.polygon.map(pt => ({
//                 lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
//             })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
//             if (coords.length > 0) polygons.push(coords);
//         }
//     }

//     // geoFence circles (standard QGC format)
//     const fenceCirclesRaw = plan_data?.geoFence?.circles ?? [];
//     for (const c of fenceCirclesRaw) {
//         const centerArr = c?.circle?.center ?? c?.center ?? null;
//         const radius = parseFloat(c?.circle?.radius ?? c?.radius ?? 0);
//         if (!centerArr || radius <= 0) continue;
//         const lat = parseFloat(Array.isArray(centerArr) ? centerArr[0] : (centerArr.lat ?? 0));
//         const lng = parseFloat(Array.isArray(centerArr) ? centerArr[1] : (centerArr.lng ?? centerArr.lon ?? 0));
//         if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
//             fenceCircles.push({ lat, lng, radius, inclusion: c?.inclusion ?? true });
//         }
//     }

//     // Custom Agri fenceData field (circle drawn in app, stored separately)
//     const fd = plan_data?.fenceData;
//     if (fd && fd.enabled === true && fd.radius > 0 && fd.lat && fd.lon) {
//         fenceCircles.push({
//             lat: parseFloat(fd.lat),
//             lng: parseFloat(fd.lon),
//             radius: parseFloat(fd.radius),
//             inclusion: true
//         });
//     }

//     // complex items (Survey / CorridorScan / StructureScan)
//     for (const item of items) {
//         if (item?.type === 'ComplexItem' || item?.complexItemType || item?.TransectStyleComplexItem) {
//             const type = item?.complexItemType;

//             if (type === 'Survey' || item?.TransectStyleComplexItem) {
//                 if (Array.isArray(item.polygon)) {
//                     const coords = item.polygon.map(pt => ({
//                         lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
//                     })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
//                     if (coords.length > 0) polygons.push(coords);
//                 }
//                 const transectPts = item.TransectStyleComplexItem?.VisualTransectPoints;
//                 if (Array.isArray(transectPts) && transectPts.length > 0) {
//                     const path = transectPts.map(pt => ({
//                         lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
//                     })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
//                     if (path.length > 0) surveyPaths.push(path);
//                 }
//             } else if (type === 'CorridorScan') {
//                 if (Array.isArray(item.polyline)) {
//                     const coords = item.polyline.map(pt => ({
//                         lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
//                     })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
//                     if (coords.length > 0) polygons.push(coords);
//                 }
//             } else if (type === 'StructureScan') {
//                 if (Array.isArray(item.polygon)) {
//                     const coords = item.polygon.map(pt => ({
//                         lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
//                     })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
//                     if (coords.length > 0) polygons.push(coords);
//                 }
//             } else if (type === 'Spot Spraying') {
//                 const points = item.points;
//                 if (Array.isArray(points)) {
//                     for (const ptObj of points) {
//                         const coord = ptObj.coordinate;
//                         if (Array.isArray(coord) && coord.length >= 2) {
//                             waypoints.push({ lat: parseFloat(coord[0]), lng: parseFloat(coord[1]) });
//                         }
//                     }
//                 }
//             }
//         } else {
//             const params = item?.params ?? [];
//             const lat = parseFloat(params[4] ?? item?.lat ?? 0);
//             const lng = parseFloat(params[5] ?? item?.lng ?? 0);
//             if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
//                 waypoints.push({ lat, lng });
//             }
//         }
//     }

//     return {
//         home: home ? { lat: home[0], lng: home[1] } : null,
//         waypoints,
//         polygons,
//         surveyPaths,
//         fenceCircles,
//     };
// }

// // Get the representative center of a mission for the overview dot
// function getMissionCenter(m) {
//     const { home, waypoints, polygons, surveyPaths, fenceCircles } = parsePlan(m.plan_data);
//     // Prefer first polygon centroid, then first waypoint, then home
//     if (polygons.length > 0 && polygons[0].length > 0) {
//         const pts = polygons[0];
//         const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
//         const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
//         return { lat, lng };
//     }
//     if (surveyPaths.length > 0 && surveyPaths[0].length > 0) {
//         return { lat: surveyPaths[0][0].lat, lng: surveyPaths[0][0].lng };
//     }
//     if (waypoints.length > 0) return waypoints[0];
//     if (home && home.lat && home.lng) return { lat: home.lat, lng: home.lng };
//     const coords = m.geometry?.coordinates ?? [];
//     if (coords.length > 0) return { lat: coords[0][1], lng: coords[0][0] };
//     return null;
// }

// function missionDotIcon(isActive) {
//     const color = isActive ? '#10B981' : '#EF4444';
//     return L.divIcon({
//         className: '', iconSize: [28, 28], iconAnchor: [14, 14],
//         html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
//             <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
//         </div>`
//     });
// }

// const GlobalMapViewer = () => {
//     const [missions, setMissions] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const containerRef = useRef(null);
//     const mapRef = useRef(null);
//     const dotLayerRef = useRef(null);   // overview dots (always visible)
//     const detailLayerRef = useRef(null); // polygon/path overlays (zoom-dependent)

//     useEffect(() => {
//         const fetchMissions = async () => {
//             try {
//                 const res = await axios.get(`${API_URL}/missions`);
//                 setMissions(res.data);
//             } catch (err) {
//                 console.error('Failed to fetch missions for map:', err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchMissions();
//     }, []);

//     // Create map once
//     useEffect(() => {
//         if (!containerRef.current || mapRef.current) return;
//         const map = L.map(containerRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: true });

//         L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
//             attribution: '© Google', maxZoom: 22, maxNativeZoom: 20
//         }).addTo(map);

//         dotLayerRef.current = L.layerGroup().addTo(map);
//         detailLayerRef.current = L.layerGroup().addTo(map);
//         mapRef.current = map;

//         return () => { map.remove(); mapRef.current = null; dotLayerRef.current = null; detailLayerRef.current = null; };
//     }, []);

//     // Draw missions when data is ready
//     useEffect(() => {
//         const map = mapRef.current;
//         const dotLayer = dotLayerRef.current;
//         const detailLayer = detailLayerRef.current;
//         if (!map || !dotLayer || !detailLayer || missions.length === 0) return;

//         dotLayer.clearLayers();
//         detailLayer.clearLayers();

//         const bounds = [];

//         missions.forEach(m => {
//             const { polygons, surveyPaths, fenceCircles, waypoints } = parsePlan(m.plan_data);
//             const center = getMissionCenter(m);
//             if (!center) return;

//             bounds.push([center.lat, center.lng]);
//             const isActive = m.status === 'active' || m.isActive;

//             // ── Overview dot marker ────────────────────────────────────────────
//             const marker = L.marker([center.lat, center.lng], { icon: missionDotIcon(isActive) })
//                 .bindTooltip(`
//                     <div style="font-family:sans-serif;text-align:center;">
//                         <b style="color:#10B981;font-size:14px;">${m.mission_name}</b><br/>
//                         <span style="color:#555;">Pilot: ${m.username}</span>
//                     </div>
//                 `, { direction: 'top', offset: [0, -14] })
//                 .bindPopup(`
//                     <div style="font-family:sans-serif;min-width:180px;">
//                         <h4 style="margin:0 0 8px 0;color:#10B981;">✈️ ${m.mission_name}</h4>
//                         <div style="margin-bottom:4px;"><b>Pilot:</b> ${m.username}</div>
//                         <div style="margin-bottom:4px;"><b>Date:</b> ${m.date || new Date(m.created_at).toLocaleDateString()}</div>
//                         <div style="margin-top:8px;">
//                             <span style="background:${isActive ? '#10B981' : '#EF4444'};color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">
//                                 ${isActive ? 'ACTIVE' : 'INACTIVE'}
//                             </span>
//                         </div>
//                     </div>
//                 `, { maxWidth: 250 });

//             marker.addTo(dotLayer);

//             // ── Geofence Circles (always visible) ─────────────────────────────
//             fenceCircles.forEach(circle => {
//                 L.circle([circle.lat, circle.lng], {
//                     radius: circle.radius,
//                     color: circle.inclusion ? '#F59E0B' : '#EF4444',
//                     weight: 2,
//                     opacity: 0.85,
//                     fillColor: circle.inclusion ? '#F59E0B' : '#EF4444',
//                     fillOpacity: 0.07,
//                     dashArray: '6,6'
//                 }).bindPopup(`<b>${circle.inclusion ? '✅ Inclusion' : '🚫 Exclusion'} Geofence Circle</b><br/>
//                     Pilot: ${m.username}<br/>Mission: ${m.mission_name}<br/>Radius: ${circle.radius} m`)
//                   .addTo(detailLayer);
//             });

//             // ── Survey Polygons ────────────────────────────────────────────────
//             polygons.forEach(poly => {
//                 const latLngs = poly.map(pt => [pt.lat, pt.lng]);
//                 L.polygon(latLngs, {
//                     color: isActive ? '#10B981' : '#6366F1',
//                     weight: 2,
//                     opacity: 0.85,
//                     fillColor: isActive ? '#10B981' : '#6366F1',
//                     fillOpacity: 0.1,
//                     dashArray: '5,8'
//                 }).bindPopup(`<b>📍 ${m.mission_name}</b><br/>Pilot: ${m.username}`)
//                   .addTo(detailLayer);
//             });

//             // ── Survey/Transect Flight Paths ────────────────────────────────────
//             surveyPaths.forEach(path => {
//                 const latLngs = path.map(pt => [pt.lat, pt.lng]);
//                 L.polyline(latLngs, { color: '#000000', weight: 5, opacity: 0.3 }).addTo(detailLayer);
//                 L.polyline(latLngs, { color: '#ffffff', weight: 2.5, opacity: 0.9 }).addTo(detailLayer);
//             });

//             // ── Simple waypoint path (non-complex missions) ─────────────────────
//             if (waypoints.length > 1 && polygons.length === 0 && surveyPaths.length === 0) {
//                 const latLngs = waypoints.map(w => [w.lat, w.lng]);
//                 L.polyline(latLngs, { color: '#000000', weight: 5, opacity: 0.3 }).addTo(detailLayer);
//                 L.polyline(latLngs, { color: '#ffffff', weight: 2.5, opacity: 0.85 }).addTo(detailLayer);
//             }
//         });

//         if (bounds.length > 0) {
//             map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 14 });
//         }
//     }, [missions]);

//     return (
//         <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', gap: 2 }}>
//             <Paper sx={{
//                 p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                 border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(18,18,26,0.95)'
//             }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                     <Box sx={{
//                         width: 40, height: 40, borderRadius: '12px',
//                         background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
//                         display: 'flex', alignItems: 'center', justifyContent: 'center',
//                         boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
//                     }}>
//                         <MapIcon sx={{ color: 'white' }} />
//                     </Box>
//                     <Box>
//                         <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, lineHeight: 1.2 }}>Global Map</Typography>
//                         <Typography variant="caption" sx={{ color: 'text.secondary' }}>
//                             {loading ? 'Loading missions...' : `Displaying ${missions.length} mission locations — zoom in to see paths & polygons`}
//                         </Typography>
//                     </Box>
//                 </Box>
//                 <Stack direction="row" spacing={3}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                         <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10B981', border: '2px solid white', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }} />
//                         <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Active Drone</Typography>
//                     </Box>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                         <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#EF4444', border: '2px solid white', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }} />
//                         <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Inactive Mission</Typography>
//                     </Box>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                         <Box sx={{ width: 28, height: 3, background: 'linear-gradient(90deg,#10B981,#6366F1)', borderRadius: 1 }} />
//                         <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Flight Path / Polygon</Typography>
//                     </Box>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                         <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed #F59E0B', bgcolor: alpha('#F59E0B', 0.15) }} />
//                         <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Geofence Circle</Typography>
//                     </Box>
//                 </Stack>
//             </Paper>

//             <Paper sx={{
//                 flex: 1, borderRadius: 3, overflow: 'hidden', position: 'relative',
//                 border: '1px solid rgba(255,255,255,0.07)'
//             }}>
//                 {loading && (
//                     <Box sx={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18,18,26,0.7)' }}>
//                         <CircularProgress sx={{ color: '#3B82F6' }} />
//                     </Box>
//                 )}
//                 <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
//             </Paper>
//         </Box>
//     );
// };

// export default GlobalMapViewer;


import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, alpha, Stack } from '@mui/material';
import { Map as MapIcon, WifiTethering } from '@mui/icons-material';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL;

// ── Parse QGC plan_data into all visual elements ──────────────────────────────
function parsePlan(plan_data) {
    if (!plan_data) return { home: null, waypoints: [], polygons: [], surveyPaths: [], fenceCircles: [] };
    const home = plan_data?.mission?.plannedHomePosition ?? null;
    const items = plan_data?.mission?.items ?? plan_data?.items ?? [];
    const waypoints = [];
    const polygons = [];
    const surveyPaths = [];
    const fenceCircles = [];

    const fencePolys = plan_data?.geoFence?.polygons ?? [];
    for (const fence of fencePolys) {
        if (Array.isArray(fence.polygon)) {
            const coords = fence.polygon.map(pt => ({
                lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
            })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
            if (coords.length > 0) polygons.push(coords);
        }
    }

    const fenceCirclesRaw = plan_data?.geoFence?.circles ?? [];
    for (const c of fenceCirclesRaw) {
        const centerArr = c?.circle?.center ?? c?.center ?? null;
        const radius = parseFloat(c?.circle?.radius ?? c?.radius ?? 0);
        if (!centerArr || radius <= 0) continue;
        const lat = parseFloat(Array.isArray(centerArr) ? centerArr[0] : (centerArr.lat ?? 0));
        const lng = parseFloat(Array.isArray(centerArr) ? centerArr[1] : (centerArr.lng ?? centerArr.lon ?? 0));
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            fenceCircles.push({ lat, lng, radius, inclusion: c?.inclusion ?? true });
        }
    }

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
        if (item?.type === 'ComplexItem' || item?.complexItemType || item?.TransectStyleComplexItem) {
            const type = item?.complexItemType;
            if (type === 'Survey' || item?.TransectStyleComplexItem) {
                if (Array.isArray(item.polygon)) {
                    const coords = item.polygon.map(pt => ({
                        lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (coords.length > 0) polygons.push(coords);
                }
                const transectPts = item.TransectStyleComplexItem?.VisualTransectPoints;
                if (Array.isArray(transectPts) && transectPts.length > 0) {
                    const path = transectPts.map(pt => ({
                        lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (path.length > 0) surveyPaths.push(path);
                }
            } else if (type === 'CorridorScan') {
                if (Array.isArray(item.polyline)) {
                    const coords = item.polyline.map(pt => ({
                        lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (coords.length > 0) polygons.push(coords);
                }
            } else if (type === 'StructureScan') {
                if (Array.isArray(item.polygon)) {
                    const coords = item.polygon.map(pt => ({
                        lat: parseFloat(pt[0]), lng: parseFloat(pt[1])
                    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
                    if (coords.length > 0) polygons.push(coords);
                }
            } else if (type === 'Spot Spraying') {
                const points = item.points;
                if (Array.isArray(points)) {
                    for (const ptObj of points) {
                        const coord = ptObj.coordinate;
                        if (Array.isArray(coord) && coord.length >= 2) {
                            waypoints.push({ lat: parseFloat(coord[0]), lng: parseFloat(coord[1]) });
                        }
                    }
                }
            }
        } else {
            const params = item?.params ?? [];
            const lat = parseFloat(params[4] ?? item?.lat ?? 0);
            const lng = parseFloat(params[5] ?? item?.lng ?? 0);
            if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
                waypoints.push({ lat, lng });
            }
        }
    }

    return { home: home ? { lat: home[0], lng: home[1] } : null, waypoints, polygons, surveyPaths, fenceCircles };
}

function getMissionCenter(m) {
    const { home, waypoints, polygons, surveyPaths } = parsePlan(m.plan_data);
    if (polygons.length > 0 && polygons[0].length > 0) {
        const pts = polygons[0];
        const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
        const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
        return { lat, lng };
    }
    if (surveyPaths.length > 0 && surveyPaths[0].length > 0) {
        return { lat: surveyPaths[0][0].lat, lng: surveyPaths[0][0].lng };
    }
    if (waypoints.length > 0) return waypoints[0];
    if (home && home.lat && home.lng) return { lat: home.lat, lng: home.lng };
    const coords = m.geometry?.coordinates ?? [];
    if (coords.length > 0) return { lat: coords[0][1], lng: coords[0][0] };
    return null;
}

// ── Standard mission dot icon ──────────────────────────────────────────────────
function missionDotIcon(isActive) {
    const color = isActive ? '#10B981' : '#EF4444';
    return L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
            <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
        </div>`
    });
}

// ── Live connected drone icon — pulsing green glow ─────────────────────────────
function liveDroneIcon() {
    return L.divIcon({
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        html: `
        <style>
            @keyframes droneRipple {
                0%   { transform: scale(0.6); opacity: 0.8; }
                100% { transform: scale(2.4); opacity: 0; }
            }
            @keyframes dronePulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7), 0 0 16px 4px rgba(16,185,129,0.4); }
                50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0), 0 0 24px 8px rgba(16,185,129,0.2); }
            }
            .drone-ripple-1 { animation: droneRipple 1.8s ease-out infinite; }
            .drone-ripple-2 { animation: droneRipple 1.8s ease-out infinite 0.6s; }
            .drone-ripple-3 { animation: droneRipple 1.8s ease-out infinite 1.2s; }
            .drone-core    { animation: dronePulse 1.8s ease-in-out infinite; }
        </style>
        <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
            <!-- ripple rings -->
            <div class="drone-ripple-1" style="position:absolute;width:24px;height:24px;border-radius:50%;border:2px solid rgba(16,185,129,0.6);"></div>
            <div class="drone-ripple-2" style="position:absolute;width:24px;height:24px;border-radius:50%;border:2px solid rgba(16,185,129,0.5);"></div>
            <div class="drone-ripple-3" style="position:absolute;width:24px;height:24px;border-radius:50%;border:2px solid rgba(16,185,129,0.4);"></div>
            <!-- core dot -->
            <div class="drone-core" style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#10B981,#059669);border:3px solid white;display:flex;align-items:center;justify-content:center;position:relative;z-index:10;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L8 7H4l2 5-3 7h6l3-4 3 4h6l-3-7 2-5h-4z"/>
                </svg>
            </div>
            <!-- live badge -->
            <div style="position:absolute;top:-2px;right:-2px;background:#10B981;color:white;font-size:7px;font-weight:800;padding:1px 3px;border-radius:3px;letter-spacing:0.5px;font-family:sans-serif;border:1px solid white;z-index:20;">LIVE</div>
        </div>`
    });
}

const GlobalMapViewer = () => {
    const [missions, setMissions] = useState([]);
    const [connectedDrones, setConnectedDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const dotLayerRef = useRef(null);
    const detailLayerRef = useRef(null);
    const droneLayerRef = useRef(null); // live drone layer

    // ── Fetch missions ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const res = await axios.get(`${API_URL}/missions`);
                setMissions(res.data);
            } catch (err) {
                console.error('Failed to fetch missions for map:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMissions();
    }, []);

    // ── Fetch connected drones (poll every 10 s) ───────────────────────────────
    // Expected API shape: GET /connected-drones → array of:
    // { id, username, email, drone_id, drone_name, lat, lng,
    //   plan_name, date, connected_at, battery?, altitude? }
    useEffect(() => {
        const fetchDrones = async () => {
            try {
                const res = await axios.get(`${API_URL}/connected-drones`);
                setConnectedDrones(res.data ?? []);
            } catch (err) {
                // Silently ignore if endpoint not yet available
                console.warn('Connected drones endpoint not available:', err?.message);
            }
        };
        fetchDrones();
        const interval = setInterval(fetchDrones, 10000);
        return () => clearInterval(interval);
    }, []);

    // ── Create map once ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: true });

        L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
            attribution: '© Google', maxZoom: 22, maxNativeZoom: 20
        }).addTo(map);

        dotLayerRef.current = L.layerGroup().addTo(map);
        detailLayerRef.current = L.layerGroup().addTo(map);
        droneLayerRef.current = L.layerGroup().addTo(map); // on top
        mapRef.current = map;

        return () => { map.remove(); mapRef.current = null; };
    }, []);

    // ── Draw missions ──────────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        const dotLayer = dotLayerRef.current;
        const detailLayer = detailLayerRef.current;
        if (!map || !dotLayer || !detailLayer || missions.length === 0) return;

        dotLayer.clearLayers();
        detailLayer.clearLayers();
        const bounds = [];

        missions.forEach(m => {
            const { polygons, surveyPaths, fenceCircles, waypoints } = parsePlan(m.plan_data);
            const center = getMissionCenter(m);
            if (!center) return;

            bounds.push([center.lat, center.lng]);
            const isActive = m.status === 'active' || m.isActive;

            const marker = L.marker([center.lat, center.lng], { icon: missionDotIcon(isActive) })
                .bindTooltip(`
                    <div style="font-family:sans-serif;text-align:center;">
                        <b style="color:#10B981;font-size:14px;">${m.mission_name}</b><br/>
                        <span style="color:#555;">Pilot: ${m.username}</span>
                    </div>
                `, { direction: 'top', offset: [0, -14] })
                .bindPopup(`
                    <div style="font-family:sans-serif;min-width:180px;">
                        <h4 style="margin:0 0 8px 0;color:#10B981;">✈️ ${m.mission_name}</h4>
                        <div style="margin-bottom:4px;"><b>Pilot:</b> ${m.username}</div>
                        <div style="margin-bottom:4px;"><b>Date:</b> ${m.date || new Date(m.created_at).toLocaleDateString()}</div>
                        <div style="margin-top:8px;">
                            <span style="background:${isActive ? '#10B981' : '#EF4444'};color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">
                                ${isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </div>
                    </div>
                `, { maxWidth: 250 });

            marker.addTo(dotLayer);

            fenceCircles.forEach(circle => {
                L.circle([circle.lat, circle.lng], {
                    radius: circle.radius,
                    color: circle.inclusion ? '#F59E0B' : '#EF4444',
                    weight: 2, opacity: 0.85,
                    fillColor: circle.inclusion ? '#F59E0B' : '#EF4444',
                    fillOpacity: 0.07, dashArray: '6,6'
                }).bindPopup(`<b>${circle.inclusion ? '✅ Inclusion' : '🚫 Exclusion'} Geofence Circle</b><br/>
                    Pilot: ${m.username}<br/>Mission: ${m.mission_name}<br/>Radius: ${circle.radius} m`)
                    .addTo(detailLayer);
            });

            polygons.forEach(poly => {
                L.polygon(poly.map(pt => [pt.lat, pt.lng]), {
                    color: isActive ? '#10B981' : '#6366F1',
                    weight: 2, opacity: 0.85,
                    fillColor: isActive ? '#10B981' : '#6366F1',
                    fillOpacity: 0.1, dashArray: '5,8'
                }).bindPopup(`<b>📍 ${m.mission_name}</b><br/>Pilot: ${m.username}`)
                    .addTo(detailLayer);
            });

            surveyPaths.forEach(path => {
                const ll = path.map(pt => [pt.lat, pt.lng]);
                L.polyline(ll, { color: '#000000', weight: 5, opacity: 0.3 }).addTo(detailLayer);
                L.polyline(ll, { color: '#ffffff', weight: 2.5, opacity: 0.9 }).addTo(detailLayer);
            });

            if (waypoints.length > 1 && polygons.length === 0 && surveyPaths.length === 0) {
                const ll = waypoints.map(w => [w.lat, w.lng]);
                L.polyline(ll, { color: '#000000', weight: 5, opacity: 0.3 }).addTo(detailLayer);
                L.polyline(ll, { color: '#ffffff', weight: 2.5, opacity: 0.85 }).addTo(detailLayer);
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 14 });
        }
    }, [missions]);

    // ── Draw live connected drones (re-runs every poll) ────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        const droneLayer = droneLayerRef.current;
        if (!map || !droneLayer) return;

        droneLayer.clearLayers();

        connectedDrones.forEach(drone => {
            const lat = parseFloat(drone.lat);
            const lng = parseFloat(drone.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const connectedAt = drone.connected_at
                ? new Date(drone.connected_at).toLocaleString()
                : '—';
            const planDate = drone.date
                ? new Date(drone.date).toLocaleDateString()
                : '—';

            // Hover tooltip
            const tooltip = `
                <div style="font-family:sans-serif;text-align:center;padding:2px 4px;">
                    <div style="display:flex;align-items:center;gap:5px;justify-content:center;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block;"></span>
                        <b style="color:#10B981;font-size:13px;">${drone.drone_name ?? drone.drone_id ?? 'Drone'}</b>
                    </div>
                    <span style="color:#444;font-size:11px;">👤 ${drone.username}</span>
                </div>`;

            // Click popup — detailed card
            const popup = `
                <div style="font-family:sans-serif;min-width:220px;padding:4px 2px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L8 7H4l2 5-3 7h6l3-4 3 4h6l-3-7 2-5h-4z"/></svg>
                        </div>
                        <div>
                            <div style="font-size:15px;font-weight:800;color:#10B981;line-height:1.2;">${drone.drone_name ?? drone.drone_id ?? 'Drone'}</div>
                            <div style="font-size:10px;background:#10B981;color:white;padding:1px 6px;border-radius:20px;display:inline-block;font-weight:700;letter-spacing:0.5px;">● LIVE CONNECTED</div>
                        </div>
                    </div>

                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        <tr>
                            <td style="padding:4px 0;color:#777;width:36%;">👤 Pilot</td>
                            <td style="padding:4px 0;font-weight:600;color:#222;">${drone.username}</td>
                        </tr>
                        <tr style="background:#f9fafb;">
                            <td style="padding:4px 6px;color:#777;">📧 Email</td>
                            <td style="padding:4px 6px;font-weight:600;color:#222;">${drone.email ?? '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#777;">📋 Plan</td>
                            <td style="padding:4px 0;font-weight:600;color:#222;">${drone.plan_name ?? '—'}</td>
                        </tr>
                        <tr style="background:#f9fafb;">
                            <td style="padding:4px 6px;color:#777;">📅 Date</td>
                            <td style="padding:4px 6px;font-weight:600;color:#222;">${planDate}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#777;">🔗 Connected</td>
                            <td style="padding:4px 0;font-weight:600;color:#222;">${connectedAt}</td>
                        </tr>
                        ${drone.battery != null ? `
                        <tr style="background:#f9fafb;">
                            <td style="padding:4px 6px;color:#777;">🔋 Battery</td>
                            <td style="padding:4px 6px;font-weight:600;color:${drone.battery > 30 ? '#10B981' : '#EF4444'};">${drone.battery}%</td>
                        </tr>` : ''}
                        ${drone.altitude != null ? `
                        <tr>
                            <td style="padding:4px 0;color:#777;">📡 Altitude</td>
                            <td style="padding:4px 0;font-weight:600;color:#222;">${drone.altitude} m</td>
                        </tr>` : ''}
                    </table>

                    <div style="margin-top:10px;padding:6px 8px;background:#ecfdf5;border-radius:6px;border-left:3px solid #10B981;">
                        <div style="font-size:10px;color:#065f46;font-weight:600;">📍 GPS LOCATION</div>
                        <div style="font-size:11px;color:#047857;margin-top:2px;">${lat.toFixed(6)}°, ${lng.toFixed(6)}°</div>
                    </div>
                </div>`;

            L.marker([lat, lng], { icon: liveDroneIcon(), zIndexOffset: 1000 })
                .bindTooltip(tooltip, { direction: 'top', offset: [0, -24], opacity: 0.97 })
                .bindPopup(popup, { maxWidth: 280, className: 'drone-popup' })
                .addTo(droneLayer);
        });
    }, [connectedDrones]);

    const liveDroneCount = connectedDrones.length;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', gap: 2 }}>
            {/* ── Header bar ─────────────────────────────────────────────────── */}
            <Paper sx={{
                p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(18,18,26,0.95)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                    }}>
                        <MapIcon sx={{ color: 'white' }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, lineHeight: 1.2 }}>Global Map</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {loading
                                ? 'Loading missions…'
                                : `${missions.length} missions · ${liveDroneCount} drone${liveDroneCount !== 1 ? 's' : ''} live`}
                        </Typography>
                    </Box>
                </Box>

                <Stack direction="row" spacing={3} alignItems="center">
                    {/* Live drone counter badge */}
                    {liveDroneCount > 0 && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            px: 1.5, py: 0.5, borderRadius: '20px',
                            background: alpha('#10B981', 0.15),
                            border: '1px solid rgba(16,185,129,0.4)',
                        }}>
                            <WifiTethering sx={{
                                color: '#10B981', fontSize: 16,
                                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                                animation: 'blink 1.5s ease-in-out infinite'
                            }} />
                            <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 700, fontSize: 12 }}>
                                {liveDroneCount} Live
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10B981', border: '2px solid white', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }} />
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Active Drone</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#EF4444', border: '2px solid white', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }} />
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Inactive Mission</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 28, height: 3, background: 'linear-gradient(90deg,#10B981,#6366F1)', borderRadius: 1 }} />
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Flight Path / Polygon</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed #F59E0B', bgcolor: alpha('#F59E0B', 0.15) }} />
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Geofence Circle</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Mini animated live dot for legend */}
                        <Box sx={{
                            width: 14, height: 14, borderRadius: '50%',
                            bgcolor: '#10B981', border: '2px solid white',
                            boxShadow: '0 0 0 3px rgba(16,185,129,0.3)',
                            '@keyframes legendPulse': {
                                '0%,100%': { boxShadow: '0 0 0 3px rgba(16,185,129,0.4)' },
                                '50%': { boxShadow: '0 0 0 6px rgba(16,185,129,0)' },
                            },
                            animation: 'legendPulse 1.8s ease-in-out infinite'
                        }} />
                        <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 700 }}>Connected Drone (Live)</Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* ── Map container ──────────────────────────────────────────────── */}
            <Paper sx={{
                flex: 1, borderRadius: 3, overflow: 'hidden', position: 'relative',
                border: '1px solid rgba(255,255,255,0.07)'
            }}>
                {loading && (
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18,18,26,0.7)' }}>
                        <CircularProgress sx={{ color: '#3B82F6' }} />
                    </Box>
                )}
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </Paper>
        </Box>
    );
};

export default GlobalMapViewer;
