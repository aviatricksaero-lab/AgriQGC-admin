// models/Document.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["privacy", "terms"],
        required: true,
        unique: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Document", DocumentSchema);