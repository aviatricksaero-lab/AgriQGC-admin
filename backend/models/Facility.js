const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    zoneType: {
        type: String,
        enum: ['red', 'yellow', 'green', 'blue'],
        default: 'yellow'
    },
    description: {
        type: String,
        default: ''
    },
    minAltitude: {
        type: Number,
        default: 0
    },
    maxAltitude: {
        type: Number,
        default: 500
    },
    geometry: {
        type: {
            type: String,
            enum: ['Polygon', 'MultiPolygon'],
            required: true
        },
        coordinates: {
            type: Array,   // [[[lon, lat], ...]] for Polygon
            required: true
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Index for geospatial queries
FacilitySchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Facility', FacilitySchema);
