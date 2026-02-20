const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const User = require('./models/User');
const Session = require('./models/Session');
const Feedback = require('./models/Feedback');
const Facility = require('./models/Facility');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Request Logging
const fs = require('fs');
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logMsg = `${new Date().toISOString()} - ${req.method} ${req.url} [IP: ${ip}]\n`;
    fs.appendFileSync('requests.log', logMsg);
    if (req.method === 'POST' || req.method === 'PUT') {
        fs.appendFileSync('requests.log', `Body: ${JSON.stringify(req.body)}\n`);
    }
    console.log(logMsg.trim());
    next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// =============================================================================
//  USER ROUTES
// =============================================================================

// Register User
app.post('/api/register', async (req, res) => {
    try {
        const { username, displayname, email, password, mobile_number } = req.body;
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const newUser = new User({ username, displayname, email, password, mobile_number });
        await newUser.save();
        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    try {
        const { userInput, password } = req.body;
        const user = await User.findOne({ $or: [{ email: userInput }, { username: userInput }] });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        res.json({ success: true, message: 'Login successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// GET All Users (Admin Panel)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().sort({ created_at: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// GET Single User
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

// Update User
app.post('/api/update-user', async (req, res) => {
    try {
        const { old_username, username, displayname, email, mobile_number, rpc_completed } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { username: old_username },
            { username, displayname, email, mobile_number, rpc_completed },
            { new: true }
        );
        if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during update' });
    }
});

// DELETE User (Admin)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOneAndUpdate({ username }, { password }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during password reset' });
    }
});

// =============================================================================
//  SESSION ROUTES
// =============================================================================

// Save Session
app.post('/api/sessions', async (req, res) => {
    try {
        const { username, date, start_time, end_time, duration } = req.body;
        const newSession = new Session({ username, date, start_time, end_time, duration });
        await newSession.save();
        res.status(201).json({ success: true, message: 'Session saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving session' });
    }
});

// GET All Sessions (Admin Panel)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ created_at: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching sessions' });
    }
});

// DELETE Session
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const deleted = await Session.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, message: 'Session deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting session' });
    }
});

// =============================================================================
//  FEEDBACK ROUTES
// =============================================================================

// Save Feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const { username, mobile_number, email, comments } = req.body;
        const newFeedback = new Feedback({ username, mobile_number, email, comments });
        await newFeedback.save();
        res.status(201).json({ success: true, message: 'Feedback saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving feedback' });
    }
});

// GET All Feedback (Admin Panel)
app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ created_at: -1 });
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

// DELETE Feedback
app.delete('/api/feedback/:id', async (req, res) => {
    try {
        const deleted = await Feedback.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Feedback not found' });
        res.json({ success: true, message: 'Feedback deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting feedback' });
    }
});

// =============================================================================
//  AIRSPACE FACILITY ROUTES
// =============================================================================

// GET Airspace Facilities (valid GeoJSON)
app.get('/api/facilities', async (req, res) => {
    try {
        const { bbox, all } = req.query;
        let query = { active: true };

        if (all === 'true') {
            delete query.active; // return all including inactive
        } else if (bbox) {
            const coords = bbox.split(',').map(Number);
            if (coords.length === 4 && coords.every(c => !isNaN(c))) {
                const [minLon, minLat, maxLon, maxLat] = coords;
                query.geometry = {
                    $geoWithin: {
                        $box: [[minLon, minLat], [maxLon, maxLat]]
                    }
                };
            }
        }

        const facilities = await Facility.find(query).sort({ created_at: -1 });
        console.log(`Facilities requested. BBOX: ${bbox || 'none'}, All: ${all || 'false'}, Found: ${facilities.length}`);

        const geojson = {
            type: 'FeatureCollection',
            features: facilities.map(doc => {
                if (!doc.geometry || !doc.geometry.type || !doc.geometry.coordinates) return null;
                return {
                    type: 'Feature',
                    id: doc._id,
                    properties: {
                        name: doc.name || 'Unnamed Area',
                        zoneType: doc.zoneType || 'yellow',
                        description: doc.description || '',
                        minAltitude: doc.minAltitude || 0,
                        maxAltitude: doc.maxAltitude || 500,
                        isActive: doc.active,
                        created_at: doc.created_at,
                    },
                    geometry: doc.geometry,
                };
            }).filter(f => f !== null),
        };

        res.setHeader('Content-Type', 'application/json');
        res.json(geojson);
    } catch (err) {
        console.error('Error fetching facilities:', err);
        res.status(500).json({ type: 'FeatureCollection', features: [], error: 'Error fetching facilities' });
    }
});

// GET Single Facility
app.get('/api/facilities/:id', async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id);
        if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });
        res.json(facility);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching facility' });
    }
});

// CREATE Facility (Admin)
app.post('/api/facilities', async (req, res) => {
    try {
        const { name, zoneType, geometry, active, description, minAltitude, maxAltitude } = req.body;

        if (!name || !geometry) {
            return res.status(400).json({ success: false, message: 'Name and geometry are required' });
        }
        if (!geometry.type || !geometry.coordinates) {
            return res.status(400).json({ success: false, message: 'Invalid geometry' });
        }

        const newFacility = new Facility({
            name,
            zoneType: zoneType || 'yellow',
            geometry,
            active: active !== undefined ? active : true,
            description: description || '',
            minAltitude: minAltitude || 0,
            maxAltitude: maxAltitude || 500,
        });
        await newFacility.save();
        res.status(201).json({ success: true, message: 'Facility created', facility: newFacility });
    } catch (err) {
        console.error('Error creating facility:', err);
        res.status(500).json({ success: false, message: 'Error creating facility', details: err.message });
    }
});

// UPDATE Facility (Admin)
app.put('/api/facilities/:id', async (req, res) => {
    try {
        const updates = req.body;
        const updated = await Facility.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Facility not found' });
        res.json({ success: true, message: 'Facility updated', facility: updated });
    } catch (err) {
        console.error('Error updating facility:', err);
        res.status(500).json({ success: false, message: 'Error updating facility' });
    }
});

// DELETE Facility (Admin)
app.delete('/api/facilities/:id', async (req, res) => {
    try {
        const deleted = await Facility.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Facility not found' });
        res.json({ success: true, message: 'Facility deleted' });
    } catch (err) {
        console.error('Error deleting facility:', err);
        res.status(500).json({ success: false, message: 'Error deleting facility' });
    }
});

// SEED Airspace Data (for testing)
app.post('/api/facilities/seed', async (req, res) => {
    try {
        const count = await Facility.countDocuments();
        if (count > 0 && !req.body.force) {
            return res.json({ message: 'Database already has data. Use {force: true} to add more.' });
        }

        const seedData = [
            {
                name: 'Delhi Restricted Zone A',
                zoneType: 'red',
                description: 'High-security restricted airspace over central Delhi',
                minAltitude: 0,
                maxAltitude: 500,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[77.10, 28.60], [77.15, 28.60], [77.15, 28.65], [77.10, 28.65], [77.10, 28.60]]]
                }
            },
            {
                name: 'Delhi Warning Area B',
                zoneType: 'yellow',
                description: 'Caution zone near military installation',
                minAltitude: 0,
                maxAltitude: 300,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[77.20, 28.70], [77.25, 28.70], [77.25, 28.75], [77.20, 28.75], [77.20, 28.70]]]
                }
            },
            {
                name: 'Mumbai Airport Vicinity',
                zoneType: 'red',
                description: 'CSIA airport perimeter — strict no-fly',
                minAltitude: 0,
                maxAltitude: 500,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[72.80, 19.05], [72.90, 19.05], [72.90, 19.15], [72.80, 19.15], [72.80, 19.05]]]
                }
            },
            {
                name: 'Bangalore Open Zone',
                zoneType: 'green',
                description: 'Approved recreational flying area',
                minAltitude: 0,
                maxAltitude: 120,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[77.58, 12.95], [77.63, 12.95], [77.63, 13.00], [77.58, 13.00], [77.58, 12.95]]]
                }
            },
            {
                name: 'Chennai Coastal Advisory',
                zoneType: 'yellow',
                description: 'Coastal wind advisory zone',
                minAltitude: 0,
                maxAltitude: 200,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[80.25, 13.05], [80.30, 13.05], [80.30, 13.10], [80.25, 13.10], [80.25, 13.05]]]
                }
            }
        ];

        await Facility.insertMany(seedData);
        res.status(201).json({ success: true, message: `Seed data created (${seedData.length} zones)`, count: seedData.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error seeding data' });
    }
});

// =============================================================================
//  START SERVER
// =============================================================================

app.listen(PORT, () => {
    console.log(`QGC Admin Backend running on port ${PORT}`);
});
