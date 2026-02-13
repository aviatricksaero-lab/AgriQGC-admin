const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    displayname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobile_number: { type: String },
    rpc_completed: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
