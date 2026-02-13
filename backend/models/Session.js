const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    username: { type: String, required: true }, // Linking by username for now, could use ObjectID reference later
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    duration: { type: Number },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);
