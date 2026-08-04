const mongoose = require('mongoose');

/**
 * FailsafeDefaults — singleton document storing admin-configurable default
 * values for the QGC app Failsafe Settings page.
 *
 * Parameter mapping (ArduCopter):
 *   battLowAction      → BATT_FS_LOW_ACT
 *   battCritAction     → BATT_FS_CRT_ACT
 *   battLowMah         → BATT_LOW_MAH   (0 = disabled)
 *   battVolt_3S…18S    → BATT_LOW_VOLT  (selected by cell count)
 *   batt2*             → same for Battery 2
 *   gcsFailsafe        → FS_GCS_ENABLE
 *   thrFailsafe        → FS_THR_ENABLE
 *   thrPwmThreshold    → FS_THR_VALUE
 */
const FailsafeDefaultsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true },

    // ── Battery 1 Actions ─────────────────────────────────────────────────────
    // 0=None, 1=Land, 2=RTL, 3=SmartRTL, 4=SmartRTL/Land, 5=Terminate
    battLowAction:       { type: Number, default: 2 },
    battCritAction:      { type: Number, default: 1 },
    battLowMah:          { type: Number, default: 500 },
    battCritMah:         { type: Number, default: 250 },
    battCritVolt_3S:     { type: Number, default: 9.5 },
    battCritVolt_6S:     { type: Number, default: 19.0 },
    battCritVolt_12S:    { type: Number, default: 38.0 },
    battCritVolt_14S:    { type: Number, default: 44.0 },
    battCritVolt_18S:    { type: Number, default: 57.0 },

    // ── Battery 1 Voltage by Cell Count (Low Threshold) ───────────────────────
    battVolt_3S:  { type: Number, default: 10.0 },
    battVolt_6S:  { type: Number, default: 20.0 },
    battVolt_12S: { type: Number, default: 40.0 },
    battVolt_14S: { type: Number, default: 46.0 },
    battVolt_18S: { type: Number, default: 60.0 },

    // ── Battery 2 Actions ─────────────────────────────────────────────────────
    batt2LowAction:      { type: Number, default: 2 },
    batt2CritAction:     { type: Number, default: 1 },
    batt2LowMah:         { type: Number, default: 500 },
    batt2CritMah:        { type: Number, default: 250 },
    batt2CritVolt_3S:    { type: Number, default: 9.5 },
    batt2CritVolt_6S:    { type: Number, default: 19.0 },
    batt2CritVolt_12S:   { type: Number, default: 38.0 },
    batt2CritVolt_14S:   { type: Number, default: 44.0 },
    batt2CritVolt_18S:   { type: Number, default: 57.0 },

    // ── Battery 2 Voltage by Cell Count (Low Threshold) ───────────────────────
    batt2Volt_3S:  { type: Number, default: 10.0 },
    batt2Volt_6S:  { type: Number, default: 20.0 },
    batt2Volt_12S: { type: Number, default: 40.0 },
    batt2Volt_14S: { type: Number, default: 46.0 },
    batt2Volt_18S: { type: Number, default: 60.0 },

    // ── General Failsafe ──────────────────────────────────────────────────────
    gcsFailsafe:     { type: Number, default: 0 },
    thrFailsafe:     { type: Number, default: 0 },
    thrPwmThreshold: { type: Number, default: 975 },

    // ── GeoFence Settings ─────────────────────────────────────────────────────
    fenceEnabled:    { type: Boolean, default: false },
    fenceAltMax:     { type: Number, default: 394 },     // Maximum Altitude value
    fenceRadius:     { type: Number, default: 0 },       // Circle centered on Home radius
    fenceType:       { type: Number, default: 3 },       // Bitmask type (1=Alt, 2=Circle, 4=Polygon)
    fenceAction:     { type: Number, default: 1 },       // Breach action (0=Report, 1=RTL or Land)
    fenceMargin:     { type: Number, default: 6.562 },   // Fence margin

    // ── Return to Launch (RTL) Settings ───────────────────────────────────────
    rtlAltMode:      { type: Number, default: 1 },       // 0 = current altitude, 1 = specified altitude
    rtlAltSpecified: { type: Number, default: 8000 },    // Specified altitude value
    rtlLoitTime:     { type: Number, default: 0 },       // Loiter above Home duration
    rtlAltFinal:     { type: Number, default: 0 },       // Final land stage altitude
    landDescentSpeed:{ type: Number, default: 50 },      // Final land stage descent speed

    updatedAt: { type: Date, default: Date.now }
});

FailsafeDefaultsSchema.statics.getOrCreate = async function () {
    let doc = await this.findOne({ key: 'global' });
    if (!doc) doc = await this.create({ key: 'global' });
    return doc;
};

module.exports = mongoose.model('FailsafeDefaults', FailsafeDefaultsSchema);
