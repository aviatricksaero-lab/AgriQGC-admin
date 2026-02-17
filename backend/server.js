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
    if (req.method === 'POST') {
        fs.appendFileSync('requests.log', `Body: ${JSON.stringify(req.body)}\n`);
    }
    console.log(logMsg.trim());
    if (req.method === 'POST') console.log('Body:', JSON.stringify(req.body));
    next();
});

// MongoDB Connection
// Using the connection string provided by the user
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Routes ---

// Register User
app.post('/api/register', async (req, res) => {
    try {
        const { username, displayname, email, password, mobile_number } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = new User({
            username,
            displayname,
            email,
            password, // Note: In production passwords should be hashed!
            mobile_number
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Update User
app.post('/api/update-user', async (req, res) => {
    try {
        const { old_username, username, displayname, email, mobile_number, rpc_completed } = req.body;

        const updatedUser = await User.findOneAndUpdate(
            { username: old_username },
            {
                username,
                displayname,
                email,
                mobile_number,
                rpc_completed
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during update' });
    }
});

// GET All Users (for Admin Panel)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().sort({ created_at: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    try {
        const { userInput, password } = req.body; // userInput can be username or email

        // Find user by email OR username
        const user = await User.findOne({
            $or: [{ email: userInput }, { username: userInput }]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check password (plain text check as per requirement/current implementation)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json({ success: true, message: 'Login successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

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

// GET All Sessions (for Admin Panel)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ created_at: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching sessions' });
    }
});

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

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOneAndUpdate(
            { username },
            { password },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during password reset' });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ created_at: -1 });
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

// GET Airspace Facilities (valid GeoJSON)
app.get('/api/facilities', async (req, res) => {
    try {
        const { bbox, all } = req.query;
        let query = { active: true };

        if (bbox && all !== 'true') {
            const coords = bbox.split(',').map(Number);
            if (coords.length === 4 && coords.every(c => !isNaN(c))) {
                const [minLon, minLat, maxLon, maxLat] = coords;
                query.geometry = {
                    $geoWithin: {
                        $box: [
                            [minLon, minLat],
                            [maxLon, maxLat]
                        ]
                    }
                };
            }
        }

        const facilities = await Facility.find(query);
        console.log(`Facilities requested. BBOX: ${bbox || 'none'}, All: ${all || 'false'}, Found: ${facilities.length}`);

        // Convert to GeoJSON FeatureCollection
        const geojson = {
            type: "FeatureCollection",
            features: facilities.map(doc => {
                // Ensure valid geometry
                if (!doc.geometry || !doc.geometry.type || !doc.geometry.coordinates) {
                    return null;
                }

                return {
                    type: "Feature",
                    id: doc._id,
                    properties: {
                        name: doc.name || "Unnamed Area",
                        zoneType: doc.zoneType || "yellow",
                        description: doc.description || "",
                        minAltitude: doc.minAltitude || 0,
                        maxAltitude: doc.maxAltitude || 500,
                        isActive: doc.active
                    },
                    geometry: doc.geometry
                };
            }).filter(f => f !== null)
        };

        res.setHeader('Content-Type', 'application/json');
        res.json(geojson);
    } catch (err) {
        console.error('Error fetching facilities:', err);
        res.status(500).json({
            type: "FeatureCollection",
            features: [],
            error: 'Error fetching facilities',
            details: err.message
        });
    }
});

// Seed Airspace Data (for testing)
app.post('/api/facilities/seed', async (req, res) => {
    try {
        const count = await Facility.countDocuments();
        if (count > 0 && !req.body.force) {
            return res.json({ message: 'Database already has data. Use {force: true} to add more.' });
        }

        const seedData = [
            {
                name: "Delhi Restricted Zone A",
                zoneType: "red",
                geometry: {
                    type: "Polygon",
                    coordinates: [[[77.10, 28.60], [77.15, 28.60], [77.15, 28.65], [77.10, 28.65], [77.10, 28.60]]]
                }
            },
            {
                name: "Delhi Warning Area B",
                zoneType: "yellow",
                geometry: {
                    type: "Polygon",
                    coordinates: [[[77.20, 28.70], [77.25, 28.70], [77.25, 28.75], [77.20, 28.75], [77.20, 28.70]]]
                }
            },
            {
                name: "Mumbai Airport Vicinity",
                zoneType: "red",
                geometry: {
                    type: "Polygon",
                    coordinates: [[[72.80, 19.05], [72.90, 19.05], [72.90, 19.15], [72.80, 19.15], [72.80, 19.05]]]
                }
            }
        ];

        await Facility.insertMany(seedData);
        res.status(201).json({ success: true, message: 'Seed data created', data: seedData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error seeding data' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
