const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require('./models/User');
const Session = require('./models/Session');
const Feedback = require('./models/Feedback');
const Facility = require('./models/Facility');
const ParameterActivity = require('./models/ParameterActivity');
const Mission = require('./models/Mission');
const Document = require('./models/Document');

const app = express();
const PORT = process.env.PORT || 5000;
// Update this line in your server.js
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));

// Also add this for API uploads
app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// OTP Storage (In-memory for simplicity, use Redis or DB for production)
const otpStore = {};

// Middleware
app.use(cors({
    origin: [
        'https://qgc-backend.vercel.app',
        'https://agri-qgc-admin.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Request Logging
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logMsg = `${new Date().toISOString()} - ${req.method} ${req.url} [IP: ${ip}]`;
    console.log(logMsg);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`Body: ${JSON.stringify(req.body)}`);
    }
    next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files allowed"));
        }
    }
});


app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// In your server.js - Update the upload endpoint
app.post("/api/document/upload", upload.single("pdf"), async (req, res) => {
    const { type } = req.body;

    try {
        const existing = await Document.findOne({ type });

        // delete old file
        if (existing && fs.existsSync(existing.filePath)) {
            fs.unlinkSync(existing.filePath);
        }

        // remove old DB entry
        if (existing) {
            await Document.deleteOne({ _id: existing._id });
        }

        // Store ONLY the filename, not the full path
        const document = new Document({
            type,
            fileName: req.file.originalname,
            filePath: req.file.filename // Just the filename, not the full path
        });

        await document.save();

        res.json({
            success: true,
            message: `${type} document uploaded successfully`,
            document: document
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
});
app.get("/api/document/:type", async (req, res) => {
    try {

        const document = await Document.findOne({
            type: req.params.type
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        res.json({
            success: true,
            document
        });

    } catch (error) {
        res.status(500).json({
            success: false
        });
    }
});
app.delete("/api/document/:type", async (req, res) => {
    console.log("⚠️ DELETE TRIGGERED:", req.params.type);
    try {

        const document = await Document.findOne({
            type: req.params.type
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        await Document.deleteOne({
            _id: document._id
        });

        res.json({
            success: true,
            message: "Document deleted"
        });

    } catch (error) {
        res.status(500).json({
            success: false
        });
    }
});
// =============================================================================
//  USER ROUTES
// =============================================================================

//Send OTP for Registration or Forgot Password
app.post('/api/send-otp', async (req, res) => {
    const { email, type } = req.body; // type = "registration" or "forgotPassword"

    if (!email || !type) {
        return res.status(400).json({ success: false, message: 'Email and OTP type required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!otpStore[email]) otpStore[email] = {};

    otpStore[email][type] = {
        otp,
        expires: Date.now() + 5 * 60 * 1000
    };


    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: type === "registration"
            ? "Registration OTP"
            : "Forgot Password OTP",

        text: `Your OTP for ${type === "registration" ? "registration" : "forgot password"} is: ${otp}. 
This OTP will expire in 5 minutes.`,

        html: `
        <p>Hi,</p>
        <p>Your OTP for <strong>${type === "registration" ? "registration" : "password reset"}</strong> is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 5 minutes.</p>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: `OTP sent for ${type}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp, type } = req.body;

    if (!otpStore[email] || !otpStore[email][type]) {
        return res.status(400).json({ success: false, message: 'OTP not found' });
    }

    const record = otpStore[email][type];

    if (record.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > record.expires) {
        delete otpStore[email][type];
        return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
});


// Forgot Password - Set New Password
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const record = otpStore[email]?.forgotPassword;
        if (!record || record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        if (Date.now() > record.expires) {
            delete otpStore[email].forgotPassword;
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        // Update password
        const user = await User.findOneAndUpdate(
            { email },
            { password: newPassword },
            { new: true }
        );

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        delete otpStore[email];

        res.json({ success: true, message: 'Password reset successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error resetting password' });
    }
});
// Register User
app.post('/api/register', async (req, res) => {
    console.log("Registration request received with data:", req.body);
    try {
        const { username, displayname, email, password, mobile_number, otp } = req.body;
        console.log(`Attempting to register user: ${username}, email: ${email}`);
        // Verify OTP
        const record = otpStore[email]?.registration;
        if (!record || record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        if (Date.now() > record.expires) {
            delete otpStore[email].registration;
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const newUser = new User({ username, displayname, email, password, mobile_number });
        await newUser.save();

        // Clean up OTP
        delete otpStore[email];

        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
        console.log(`User registered successfully: ${username} (${email})`);
    } catch (err) {
        console.log("Error during registration:", err);
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
        console.log(`User logged in successfully: ${user.username} (${user.email})`);
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

// Change Password API
app.post('/api/change-password', async (req, res) => {
    console.log("Hit change password");
    try {
        console.log("Change Password Request:", req.body); // ✅ DEBUG

        const { username, oldPassword, newPassword } = req.body;

        if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 4 characters'
            });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.password !== oldPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully!'
        });
        console.log(`Password changed successfully for user: ${username}`);

    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
});
// =============================================================================
//  SESSION ROUTES
// =============================================================================

// Save Session
app.post('/api/sessions', async (req, res) => {
    try {
        const { username, date, start_time, end_time, duration, session_type } = req.body;
        const newSession = new Session({ username, date, start_time, end_time, duration, session_type });
        await newSession.save();
        res.status(201).json({ success: true, message: 'Session saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving session' });
    }
});

// GET All Sessions (Admin Panel)
app.get('/api/sessions/all', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ created_at: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching sessions' });
    }
});

// Get the Sessions by username (filter)
app.get('/api/sessions', async (req, res) => {
    try {
        const { username } = req.query;  // grab ?username= from URL
        const filter = username ? { username } : {};  // if no username, return all (admin use)
        const sessions = await Session.find(filter).sort({ created_at: -1 });
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
//  PARAMETER ACTIVITY ROUTES
// =============================================================================

// Log Parameter Activity
app.post('/api/parameter-activity', async (req, res) => {
    try {
        const { username, email, activity } = req.body;
        if (!username || !email) {
            return res.status(400).json({ success: false, message: 'Username and email are required' });
        }
        const newActivity = new ParameterActivity({ username, email, activity });
        await newActivity.save();
        res.status(201).json({ success: true, message: 'Activity logged' });
    } catch (err) {
        console.error('Error logging activity:', err);
        res.status(500).json({ success: false, message: 'Error logging activity' });
    }
});

// GET All Parameter Activity (Admin Panel)
app.get('/api/parameter-activity', async (req, res) => {
    try {
        const activities = await ParameterActivity.find().sort({ timestamp: -1 }).limit(100);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching activities' });
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
//  MISSION ROUTES
// =============================================================================

// Save Mission
app.post('/api/missions', async (req, res) => {
    console.log("Mission log request received with data:", req.body);
    try {
        const { username, mission_name, plan_data, geometry, date } = req.body;
        if (!username || !mission_name || !geometry) {
            return res.status(400).json({ success: false, message: 'Missing required mission fields' });
        }
        const newMission = new Mission({ username, mission_name, plan_data, geometry, date });
        await newMission.save();
        console.log("Mission log saved successfully", newMission);
        res.status(201).json({ success: true, message: 'Mission log saved successfully' });
    } catch (err) {
        console.error('Error saving mission:', err);
        res.status(500).json({ success: false, message: 'Error saving mission log' });
    }
});

// GET Missions (with optional username filter)
app.get('/api/missions', async (req, res) => {
    console.log("Get mission request received with data:", req.query);
    try {
        const username = req.query.username;
        const query = username ? { username: username } : {};
        const missions = await Mission.find(query).sort({ date: -1 });
        res.json(missions);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching missions' });
    }
});

// DEBUG: Inspect fenceData/geoFence of a specific mission by name
app.get('/api/missions/debug-fence/:name', async (req, res) => {
    try {
        const m = await Mission.findOne({ mission_name: req.params.name });
        if (!m) return res.status(404).json({ found: false });
        res.json({
            mission_name: m.mission_name,
            username: m.username,
            fenceData: m.plan_data?.fenceData ?? null,
            geoFenceCircles: m.plan_data?.geoFence?.circles ?? [],
            geoFencePolygons: (m.plan_data?.geoFence?.polygons ?? []).length + ' polygons',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Mission by ID
app.delete('/api/missions/:id', async (req, res) => {
    try {
        await Mission.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Mission deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting mission' });
    }
});

// DELETE Mission by Name
app.delete('/api/missions/by-name/:name', async (req, res) => {
    try {
        const username = req.query.username; // Optionally filter by user if provided
        const query = { mission_name: req.params.name };
        if (username) query.username = username;

        await Mission.deleteMany(query);
        res.json({ success: true, message: 'Mission logs deleted' });
    } catch (err) {
        console.error('Error deleting mission by name:', err);
        res.status(500).json({ success: false, message: 'Error deleting mission' });
    }
});


//Drone Connect

// =============================================================================
//  CONNECTED DRONES ROUTE
//  Add this block to server.js just before the "START SERVER" section
//  Uses existing: Mission model, User model — no new files needed
// =============================================================================

// In-memory store for live drone connections
// Shape: { username: { lat, lng, drone_id, plan_name, date, connected_at, battery, altitude } }
const connectedDronesStore = {};

// ── POST /api/drone/connect  (call this from your drone app on connect) ────────
// Body: { username, email?, drone_id?, drone_name?, lat, lng, plan_name?, date?, battery?, altitude? }
app.post('/api/drone/connect', async (req, res) => {
    try {
        const { username, drone_id, drone_name, lat, lng, plan_name, date, battery, altitude } = req.body;
        let { email } = req.body;

        if (!username || lat == null || lng == null) {
            return res.status(400).json({ success: false, message: 'username, lat, lng are required' });
        }

        // Try to look up user email from DB — but don't block if not found.
        // The Qt app may connect before the user record is synced, or use a
        // slightly different username casing. We still register the drone.
        if (!email) {
            try {
                const user = await User.findOne({ username });
                if (user) email = user.email;
            } catch (_) {}
        }

        connectedDronesStore[username] = {
            username,
            email: email ?? '',
            drone_id: drone_id ?? `DRONE-${username.toUpperCase()}`,
            drone_name: drone_name ?? `${username}'s Drone`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            plan_name: plan_name ?? null,
            date: date ?? new Date().toISOString(),
            connected_at: new Date().toISOString(),
            battery: battery ?? null,
            altitude: altitude ?? null,
            updated_at: Date.now(), // Track for timeout cleanup
        };

        console.log(`🚁 Drone connected: ${username} at [${lat}, ${lng}]`);
        res.json({ success: true, message: 'Drone registered as connected' });
    } catch (err) {
        console.error('Error connecting drone:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── POST /api/drone/test-inject  (DEV ONLY — injects a fake live drone) ────────
// Lets you verify the admin-panel map renders a live drone WITHOUT needing the
// Qt app to be rebuilt. Call from PowerShell or Postman.
// Body: { username, lat, lng, email?, plan_name? }
app.post('/api/drone/test-inject', (req, res) => {
    const { username, lat, lng, email, plan_name } = req.body;
    if (!username || lat == null || lng == null) {
        return res.status(400).json({ success: false, message: 'username, lat, lng required' });
    }
    connectedDronesStore[username] = {
        username,
        email: email ?? 'test@example.com',
        drone_id: `TEST-${username.toUpperCase()}`,
        drone_name: `${username}'s Drone (TEST)`,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        plan_name: plan_name ?? 'Test Plan',
        date: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        battery: 87,
        altitude: 25,
        updated_at: Date.now(), // Fixed so test drones also time out correctly
    };
    console.log(`🧪 Test drone injected: ${username} at [${lat}, ${lng}]`);
    res.json({ success: true, store: connectedDronesStore });
});

// ── POST /api/drone/location  (call this to update live GPS position) ──────────
// Body: { username, lat, lng, battery?, altitude? }
app.post('/api/drone/location', (req, res) => {
    const { username, lat, lng, battery, altitude } = req.body;

    if (!username || lat == null || lng == null) {
        return res.status(400).json({ success: false, message: 'username, lat, lng are required' });
    }

    if (!connectedDronesStore[username]) {
        console.log(`⚠️ Drone location update received for timed-out drone (${username}). Re-registering automatically.`);
        connectedDronesStore[username] = {
            username,
            email: '',
            drone_id: `DRONE-${username.toUpperCase()}`,
            drone_name: `${username}'s Drone`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            plan_name: null,
            date: new Date().toISOString(),
            connected_at: new Date().toISOString(),
            battery: battery ?? null,
            altitude: altitude ?? null,
            updated_at: Date.now(),
        };
        return res.json({ success: true, message: 'Drone re-registered from location update' });
    }

    connectedDronesStore[username].lat = parseFloat(lat);
    connectedDronesStore[username].lng = parseFloat(lng);
    if (battery != null) connectedDronesStore[username].battery = battery;
    if (altitude != null) connectedDronesStore[username].altitude = altitude;
    connectedDronesStore[username].updated_at = Date.now(); // Reset timeout

    res.json({ success: true, message: 'Location updated' });
});

// ── POST /api/drone/disconnect  (call this when drone disconnects) ─────────────
// Body: { username }
app.post('/api/drone/disconnect', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'username required' });

    if (connectedDronesStore[username]) {
        delete connectedDronesStore[username];
        console.log(`🔴 Drone disconnected: ${username}`);
    }

    res.json({ success: true, message: 'Drone disconnected' });
});

// ── GET /api/connected-drones  (used by GlobalMapViewer to show live dots) ─────
app.get('/api/connected-drones', (req, res) => {
    res.json(Object.values(connectedDronesStore));
});


// ── Cleanup dead drones (timeout after 35s of inactivity) ───────────────────
setInterval(() => {
    const now = Date.now();
    for (const [username, drone] of Object.entries(connectedDronesStore)) {
        if (now - drone.updated_at > 35000) { // 35 seconds timeout
            console.log(`⏱️ Drone timed out (no updates for 35s): ${username}`);
            delete connectedDronesStore[username];
        }
    }
}, 10000); // Check every 10 seconds

// =============================================================================
//  START SERVER
// =============================================================================

app.listen(PORT, () => {
    console.log(`QGC Admin Backend running on port ${PORT}`);
});