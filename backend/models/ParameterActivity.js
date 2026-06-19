const mongoose = require('mongoose');

const ParameterActivitySchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    activity: {
        type: String,
        default: 'Accessed Parameters'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ParameterActivity', ParameterActivitySchema);