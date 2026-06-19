const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    mission_name: { type: String, required: true },
    plan_data: { type: Object, required: true }, // Full QGC .plan JSON
    geometry: {
        type: {
            type: String,
            enum: ['LineString', 'Point', 'Polygon', 'MultiPoint'],
            default: 'Polygon'
        },
        coordinates: {
            type: Array, // [ [lon, lat], ... ]
            required: true
        }
    },
    date: { type: String },
    created_at: { type: Date, default: Date.now }
});

MissionSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Mission', MissionSchema);