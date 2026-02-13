const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    username: { type: String },
    mobile_number: { type: String },
    email: { type: String },
    comments: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
