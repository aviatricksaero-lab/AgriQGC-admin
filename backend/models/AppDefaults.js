const mongoose = require('mongoose');

/**
 * AppDefaults — singleton document that stores admin-configurable
 * default values for the QGC (Agri) app's General Settings page.
 *
 * The document is keyed by { key: "global" } so there is always
 * exactly one record. Use AppDefaults.getOrCreate() to retrieve it.
 */
const AppDefaultsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true },

    // ── Follow Me / Streaming ─────────────────────────────────────
    // 0 = Never, 1 = Always, 2 = When in Follow Me Flight Mode
    followTarget: { type: Number, default: 2 },

    // ── Android ───────────────────────────────────────────────────
    // 1 = save to SD card, 0 = internal
    androidSaveToSDCard: { type: Number, default: 1 },

    // ── Vehicle Parameters ────────────────────────────────────────
    // WPNAV_SPEED_UP in cm/s
    takeoffAltSpeed: { type: Number, default: 30.0 },
    // WP_YAW_BEHAVIOR: 0 = Continuous Moment, 1 = Face next WP, etc.
    yawBehavior: { type: Number, default: 0 },

    // ── Virtual Joystick ─────────────────────────────────────────
    virtualJoystick: { type: Number, default: 0 },
    virtualJoystickAutoCenterThrottle: { type: Number, default: 1 },

    // ── Units (matches UnitsSettings C++ enum values) ─────────────────────────
    // HorizontalDistanceUnits: 0 = Feet, 1 = Meters
    distanceUnits: { type: Number, default: 1 },
    // AreaUnits: 0 = SquareFeet, 1 = SquareMeters, 2 = SquareKilometers, 3 = Hectares, 4 = Acres, 5 = SquareMiles
    areaUnits: { type: Number, default: 1 },
    // SpeedUnits: 0 = FeetPerSecond, 1 = MetersPerSecond, 2 = MilesPerHour, 3 = KilometersPerHour, 4 = Knots
    speedUnits: { type: Number, default: 1 },
    // TemperatureUnits: 0 = Celsius, 1 = Fahrenheit
    temperatureUnits: { type: Number, default: 0 },

    // ── Telemetry ─────────────────────────────────────────────────
    telemetrySave: { type: Number, default: 1 },
    telemetrySaveNotArmed: { type: Number, default: 0 },

    updatedAt: { type: Date, default: Date.now }
});

/**
 * Returns the singleton defaults document.
 * Creates it with seed values if it does not exist yet.
 */
AppDefaultsSchema.statics.getOrCreate = async function () {
    let doc = await this.findOne({ key: 'global' });
    if (!doc) {
        doc = await this.create({ key: 'global' });
    }
    return doc;
};

module.exports = mongoose.model('AppDefaults', AppDefaultsSchema);
