const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    zoneType: {
        type: String,
        default: 'yellow' // red, yellow, green
    },
    geometry: {
        type: {
            type: String,
            enum: ['Polygon', 'MultiPolygon'],
            required: true
        },
        coordinates: {
            type: Array, // Supports [[[lon, lat], ...]] for Polygon and [[[[lon, lat], ...]]] for MultiPolygon
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
