/**
 * Gauge Configuration
 * 
 * Gauge-specific settings that extend the base sensor configuration.
 * Uses SENSOR_TYPES from sensorConfig.js for sensor definitions.
 */

import { SENSOR_TYPES, getSensorConfig } from './sensorConfig';

// ============================================================================
// Gauge Display Types
// ============================================================================

/**
 * Available gauge display types/styles
 */
export const GAUGE_TYPES = [
    {
        id: 'grafana',
        label: 'Grafana',
        description: 'Arc with gradient colors',
        icon: 'Activity'
    },
    {
        id: 'semicircle',
        label: 'Semicircle',
        description: 'Half-circle gauge',
        icon: 'CircleHalf'
    },
    {
        id: 'radial',
        label: 'Radial',
        description: 'Full circle dial',
        icon: 'Circle'
    },
    {
        id: 'speedometer',
        label: 'Speedometer',
        description: 'Classic speedometer',
        icon: 'Gauge'
    },
    {
        id: 'simple',
        label: 'Simple',
        description: 'Minimal arc design',
        icon: 'Minus'
    },
    {
        id: 'modern',
        label: 'Modern',
        description: 'Clean modern style',
        icon: 'Zap'
    },
    {
        id: 'blob',
        label: 'Blob',
        description: 'Rounded blob style',
        icon: 'Cloud'
    },
    {
        id: 'minimal',
        label: 'Minimal',
        description: 'Ultra minimal',
        icon: 'MinusCircle'
    }
];

// ============================================================================
// State Thresholds
// ============================================================================

/**
 * State thresholds in milliseconds for determining reading freshness
 */
export const STATE_THRESHOLDS = {
    stale: 2 * 60 * 1000,   // 2 minutes
    offline: 5 * 60 * 1000  // 5 minutes
};

// ============================================================================
// Gauge Sub-Arc Generation
// ============================================================================

/**
 * Generate sub-arcs for gauge display based on sensor type.
 * Uses the sensor's min/max from sensorConfig and creates visually appropriate color bands.
 * 
 * @param {string} sensorType - The sensor type identifier
 * @returns {Array} Array of subArc configuration objects
 */
export function generateSubArcs(sensorType) {
    const config = getSensorConfig(sensorType);
    const { min, max, color } = config;
    const range = max - min;

    // Sensor-specific color schemes based on their nature
    const sensorColorSchemes = {
        temperature: [
            { limit: min + range * 0.1, color: '#4dabf7' },   // Cold - Blue
            { limit: min + range * 0.4, color: '#69db7c' },   // Cool - Light Green
            { limit: min + range * 0.6, color: '#40c057' },   // Comfortable - Green
            { limit: min + range * 0.8, color: '#ffd43b' },   // Warm - Yellow
            { limit: max, color: '#ff6b6b' }                   // Hot - Red
        ],
        humidity: [
            { limit: min + range * 0.2, color: '#ff6b6b' },   // Too Dry - Red
            { limit: min + range * 0.4, color: '#ffd43b' },   // Dry - Yellow
            { limit: min + range * 0.6, color: '#40c057' },   // Comfortable - Green
            { limit: min + range * 0.8, color: '#4dabf7' },   // Humid - Blue
            { limit: max, color: '#5c7cfa' }                   // Very Humid - Dark Blue
        ],
        pressure: [
            { limit: min + range * 0.3, color: '#ff6b6b' },   // Low pressure
            { limit: min + range * 0.5, color: '#ffd43b' },   // Below normal
            { limit: min + range * 0.7, color: '#40c057' },   // Normal
            { limit: max, color: '#4dabf7' }                   // High pressure
        ],
        light: [
            { limit: min + range * 0.01, color: '#495057' },  // Dark
            { limit: min + range * 0.03, color: '#868e96' },  // Dim
            { limit: min + range * 0.1, color: '#ffd43b' },   // Normal indoor
            { limit: min + range * 0.5, color: '#ff922b' },   // Bright
            { limit: max, color: '#fcc419' }                   // Very bright
        ]
    };

    // Return sensor-specific scheme if available, otherwise generate based on sensor color
    if (sensorColorSchemes[sensorType]) {
        return sensorColorSchemes[sensorType].map(arc => ({ ...arc, showTick: true }));
    }

    // Generate generic color bands based on sensor's primary color
    return [
        { limit: min + range * 0.25, color: adjustColorOpacity(color, 0.3), showTick: true },
        { limit: min + range * 0.5, color: adjustColorOpacity(color, 0.5), showTick: true },
        { limit: min + range * 0.75, color: adjustColorOpacity(color, 0.75), showTick: true },
        { limit: max, color: color, showTick: true }
    ];
}

/**
 * Adjusts a hex color's lightness (simple version)
 */
function adjustColorOpacity(hexColor, factor) {
    // Simple implementation - blend with white
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const blendWithWhite = (channel) => Math.round(channel + (255 - channel) * (1 - factor));

    const newR = blendWithWhite(r).toString(16).padStart(2, '0');
    const newG = blendWithWhite(g).toString(16).padStart(2, '0');
    const newB = blendWithWhite(b).toString(16).padStart(2, '0');

    return `#${newR}${newG}${newB}`;
}

// ============================================================================
// State Calculation
// ============================================================================

/**
 * Calculate reading state based on timestamp
 * @param {string|Date} timestamp - The reading timestamp
 * @returns {'live'|'stale'|'offline'} The current state
 */
export function getReadingState(timestamp) {
    if (!timestamp) return 'offline';

    const age = Date.now() - new Date(timestamp).getTime();

    if (age > STATE_THRESHOLDS.offline) return 'offline';
    if (age > STATE_THRESHOLDS.stale) return 'stale';
    return 'live';
}

// ============================================================================
// Gauge Configuration Helper
// ============================================================================

/**
 * Get complete gauge configuration for a sensor type.
 * Combines base sensor config with gauge-specific settings.
 * 
 * @param {string} sensorType - The sensor type identifier
 * @returns {Object} Complete gauge configuration
 */
export function getGaugeConfig(sensorType) {
    const sensorConfig = getSensorConfig(sensorType);

    return {
        ...sensorConfig,
        subArcs: generateSubArcs(sensorType)
    };
}
