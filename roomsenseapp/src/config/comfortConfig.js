/**
 * Comfort Configuration
 * 
 * SINGLE SOURCE OF TRUTH for:
 * - Sensor comfort zone definitions
 * - Score calculation
 * - Tips generation
 * - Display mode configuration
 * - Sensor metadata (color, units, icons)
 * 
 * Uses Lucide React icons for professional look.
 */

import {
    Thermometer, Snowflake, Sun, Flame, ThermometerSnowflake,
    Droplets, CloudRain, Wind, CloudDrizzle, Waves,
    Moon, Lightbulb, SunDim, Sunrise, Sparkles,
    Gauge, TrendingDown, TrendingUp, Activity,
    Star, ThumbsUp, AlertTriangle, AlertCircle, HelpCircle,
    HeartPulse, Heater, AirVent, Blinds, Shirt,
    Zap, Eye, Move
} from 'lucide-react';

// ============================================================================
// SENSOR TYPE REGISTRY - Single source of truth
// ============================================================================

/**
 * Complete sensor type configuration including:
 * - Default comfort boundaries
 * - Zone definitions (generated dynamically)
 * - Tips for each condition
 * - Display metadata
 */
export const SENSOR_TYPES = {
    temperature: {
        id: 'temperature',
        label: 'Temperature',
        unit: '°C',
        Icon: Thermometer,
        color: '#ef4444', // Main color for charts
        description: 'Temperature readings in Celsius',
        precision: 1,
        // Default comfort boundaries
        defaultComfortMin: 19,
        defaultComfortMax: 24,
        // Range limits for settings UI
        rangeMin: -10,
        rangeMax: 50,
        step: 1,
        // Zone generation config
        zoneConfig: {
            belowComfort: [
                { offset: -50, level: 'cold', Icon: Snowflake, label: 'Too Cold', color: '#60a5fa', message: 'Consider turning up the heating' },
                { offset: 0, level: 'cool', Icon: ThermometerSnowflake, label: 'A Bit Chilly', color: '#93c5fd', message: 'Might want a light layer' }
            ],
            comfort: { level: 'comfortable', Icon: Thermometer, label: 'Comfortable', color: '#4ade80', message: 'Perfect temperature' },
            aboveComfort: [
                { offset: 0, level: 'warm', Icon: Sun, label: 'Getting Warm', color: '#fbbf24', message: 'Getting a bit warm' },
                { offset: 3, level: 'hot', Icon: Flame, label: 'Too Hot', color: '#f87171', message: 'Consider cooling down or ventilating' }
            ]
        },
        tips: {
            cold: { Icon: Heater, text: 'Turn up the heating or add a warm layer', priority: 'high' },
            cool: { Icon: Shirt, text: 'A light sweater might help', priority: 'low' },
            warm: { Icon: AirVent, text: 'Open a window for fresh air', priority: 'low' },
            hot: { Icon: AirVent, text: 'Cool down the room - open windows or use AC', priority: 'high' }
        }
    },

    humidity: {
        id: 'humidity',
        label: 'Humidity',
        unit: '%',
        Icon: Droplets,
        color: '#3b82f6', // Main color for charts
        description: 'Relative humidity percentage',
        precision: 1,
        defaultComfortMin: 40,
        defaultComfortMax: 60,
        rangeMin: 0,
        rangeMax: 100,
        step: 5,
        zoneConfig: {
            belowComfort: [
                { offset: -30, level: 'dry', Icon: Wind, label: 'Very Dry', color: '#fbbf24', message: 'Air is very dry - consider a humidifier' },
                { offset: 0, level: 'slightly_dry', Icon: CloudDrizzle, label: 'Slightly Dry', color: '#a3e635', message: 'Could use a bit more moisture' }
            ],
            comfort: { level: 'comfortable', Icon: Droplets, label: 'Perfect', color: '#4ade80', message: 'Humidity is just right' },
            aboveComfort: [
                { offset: 0, level: 'humid', Icon: Waves, label: 'Humid', color: '#60a5fa', message: 'Getting a bit humid' },
                { offset: 10, level: 'very_humid', Icon: CloudRain, label: 'Too Humid', color: '#f87171', message: 'Too humid - open a window' }
            ]
        },
        tips: {
            dry: { Icon: Droplets, text: 'Use a humidifier or place water bowls', priority: 'medium' },
            slightly_dry: { Icon: Droplets, text: 'Indoor plants can help add moisture', priority: 'low' },
            humid: { Icon: Wind, text: 'Open windows to reduce humidity', priority: 'low' },
            very_humid: { Icon: Wind, text: 'Ventilate well - use exhaust fans if available', priority: 'high' }
        }
    },

    light: {
        id: 'light',
        label: 'Light Level',
        unit: 'lux',
        Icon: Lightbulb,
        color: '#f59e0b', // Main color for charts
        description: 'Light intensity in lux',
        precision: 0,
        defaultComfortMin: 300,
        defaultComfortMax: 500,
        rangeMin: 0,
        rangeMax: 2000,
        step: 50,
        zoneConfig: {
            belowComfort: [
                { offset: -250, level: 'dark', Icon: Moon, label: 'Dark', color: '#6b7280', message: 'Very dark - turn on some lights' },
                { offset: 0, level: 'dim', Icon: SunDim, label: 'Dim', color: '#a3a3a3', message: 'A bit dim for activities' }
            ],
            comfort: { level: 'normal', Icon: Lightbulb, label: 'Good', color: '#4ade80', message: 'Good lighting' },
            aboveComfort: [
                { offset: 0, level: 'bright', Icon: Sunrise, label: 'Bright', color: '#fbbf24', message: 'Well lit' },
                { offset: 500, level: 'very_bright', Icon: Sparkles, label: 'Very Bright', color: '#f59e0b', message: 'Lots of light!' }
            ]
        },
        tips: {
            dark: { Icon: Lightbulb, text: 'Turn on lights for better visibility', priority: 'medium' },
            dim: { Icon: Lightbulb, text: 'Increase lighting for reading or working', priority: 'low' },
            very_bright: { Icon: Blinds, text: 'Close blinds to reduce glare', priority: 'low' }
        }
    },

    pressure: {
        id: 'pressure',
        label: 'Pressure',
        unit: 'hPa',
        Icon: Gauge,
        color: '#10b981', // Main color for charts
        description: 'Atmospheric pressure in hectopascals',
        precision: 1,
        defaultComfortMin: 1000,
        defaultComfortMax: 1020,
        rangeMin: 900,
        rangeMax: 1100,
        step: 5,
        zoneConfig: {
            belowComfort: [
                { offset: -100, level: 'low', Icon: TrendingDown, label: 'Low Pressure', color: '#60a5fa', message: 'Storm might be coming' }
            ],
            comfort: { level: 'normal', Icon: Gauge, label: 'Normal', color: '#4ade80', message: 'Normal atmospheric pressure' },
            aboveComfort: [
                { offset: 80, level: 'high', Icon: TrendingUp, label: 'High Pressure', color: '#a78bfa', message: 'Clear skies likely' }
            ]
        },
        tips: {
            low: { Icon: CloudRain, text: 'Weather change expected - storm possible', priority: 'info' },
            high: { Icon: Sun, text: 'Clear weather expected', priority: 'info' }
        }
    },

    motion: {
        id: 'motion',
        label: 'Motion',
        unit: '',
        Icon: Activity,
        color: '#8b5cf6',
        description: 'Motion detection sensor',
        precision: 0,
        defaultComfortMin: 0,
        defaultComfortMax: 1,
        rangeMin: 0,
        rangeMax: 1,
        step: 1,
        zoneConfig: {
            belowComfort: [],
            comfort: { level: 'normal', Icon: Activity, label: 'Detected', color: '#4ade80' },
            aboveComfort: []
        },
        tips: {}
    },

    voltage: {
        id: 'voltage',
        label: 'Voltage',
        unit: 'V',
        Icon: Zap,
        color: '#f97316',
        description: 'Electrical voltage readings',
        precision: 2,
        defaultComfortMin: 3.3,
        defaultComfortMax: 4.2,
        rangeMin: 0,
        rangeMax: 24,
        step: 0.1,
        zoneConfig: {
            belowComfort: [{ offset: -3.3, level: 'low', Icon: Zap, label: 'Low', color: '#ef4444' }],
            comfort: { level: 'normal', Icon: Zap, label: 'Normal', color: '#4ade80' },
            aboveComfort: [{ offset: 20, level: 'high', Icon: Zap, label: 'High', color: '#f59e0b' }]
        },
        tips: {}
    },

    wind_speed: {
        id: 'wind_speed',
        label: 'Wind Speed',
        unit: 'm/s',
        Icon: Wind,
        color: '#06b6d4',
        description: 'Wind speed measurements',
        precision: 1,
        defaultComfortMin: 0,
        defaultComfortMax: 10,
        rangeMin: 0,
        rangeMax: 50,
        step: 1,
        zoneConfig: {
            belowComfort: [],
            comfort: { level: 'normal', Icon: Wind, label: 'Calm', color: '#4ade80' },
            aboveComfort: [{ offset: 40, level: 'high', Icon: Wind, label: 'Windy', color: '#f59e0b' }]
        },
        tips: {}
    },

    visibility: {
        id: 'visibility',
        label: 'Visibility',
        unit: 'km',
        Icon: Eye,
        color: '#84cc16',
        description: 'Visibility distance',
        precision: 1,
        defaultComfortMin: 1,
        defaultComfortMax: 50,
        rangeMin: 0,
        rangeMax: 50,
        step: 1,
        zoneConfig: {
            belowComfort: [{ offset: -1, level: 'low', Icon: Eye, label: 'Foggy', color: '#fbbf24' }],
            comfort: { level: 'normal', Icon: Eye, label: 'Clear', color: '#4ade80' },
            aboveComfort: []
        },
        tips: {}
    }
};

// ============================================================================
// ZONE GENERATION - Creates zones from config + custom boundaries
// ============================================================================

/**
 * Generate comfort zones for a sensor type with custom boundaries
 * @param {string} sensorType - Sensor type ID
 * @param {number} comfortMin - Custom comfort minimum
 * @param {number} comfortMax - Custom comfort maximum
 * @returns {Array} Array of zone objects
 */
export function generateZones(sensorType, comfortMin, comfortMax) {
    const config = SENSOR_TYPES[sensorType];
    if (!config) return [];

    const { zoneConfig, rangeMin, rangeMax } = config;
    const zones = [];

    // Generate below-comfort zones
    zoneConfig.belowComfort.forEach((zone, i) => {
        const nextZone = zoneConfig.belowComfort[i + 1];
        const min = i === 0 ? rangeMin : (comfortMin + zone.offset);
        const max = nextZone ? (comfortMin + nextZone.offset) : comfortMin;

        zones.push({
            min,
            max,
            level: zone.level,
            Icon: zone.Icon,
            label: zone.label,
            color: zone.color,
            message: zone.message
        });
    });

    // Comfort zone
    zones.push({
        min: comfortMin,
        max: comfortMax,
        level: zoneConfig.comfort.level,
        Icon: zoneConfig.comfort.Icon,
        label: zoneConfig.comfort.label,
        color: zoneConfig.comfort.color,
        message: zoneConfig.comfort.message
    });

    // Generate above-comfort zones
    zoneConfig.aboveComfort.forEach((zone, i) => {
        const nextZone = zoneConfig.aboveComfort[i + 1];
        const min = i === 0 ? comfortMax : (comfortMax + zone.offset);
        const max = nextZone ? (comfortMax + nextZone.offset) : rangeMax;

        zones.push({
            min,
            max,
            level: zone.level,
            Icon: zone.Icon,
            label: zone.label,
            color: zone.color,
            message: zone.message
        });
    });

    return zones;
}

/**
 * Get comfort zone for a value using custom boundaries
 * @param {string} sensorType - Sensor type ID
 * @param {number} value - Sensor value
 * @param {Object} customBounds - Optional {comfortMin, comfortMax}
 * @returns {Object|null} Zone object or null
 */
export function getComfortZone(sensorType, value, customBounds = null) {
    if (value === null || value === undefined) return null;

    const config = SENSOR_TYPES[sensorType];
    if (!config) return null;

    const comfortMin = customBounds?.comfortMin ?? config.defaultComfortMin;
    const comfortMax = customBounds?.comfortMax ?? config.defaultComfortMax;

    const zones = generateZones(sensorType, comfortMin, comfortMax);

    for (const zone of zones) {
        if (value >= zone.min && value < zone.max) {
            return zone;
        }
    }

    return zones[zones.length - 1];
}

/**
 * Get comfort status: 'good', 'warning', or 'attention'
 */
export function getComfortStatus(sensorType, value, customBounds = null) {
    const zone = getComfortZone(sensorType, value, customBounds);
    if (!zone) return 'unknown';

    const comfortLevels = ['comfortable', 'normal'];
    const warningLevels = ['cool', 'warm', 'slightly_dry', 'humid', 'dim', 'bright', 'low', 'high'];
    const attentionLevels = ['cold', 'hot', 'dry', 'very_humid', 'dark', 'very_bright'];

    if (comfortLevels.includes(zone.level)) return 'good';
    if (warningLevels.includes(zone.level)) return 'warning';
    if (attentionLevels.includes(zone.level)) return 'attention';
    return 'warning';
}

// ============================================================================
// ROOM HEALTH SCORE
// ============================================================================

/**
 * Calculate room health score (0-100) based on sensor readings
 */
export function calculateRoomScore(readings, customZones = null) {
    if (!readings || readings.length === 0) return null;

    let score = 100;
    let factorsCount = 0;

    readings.forEach(reading => {
        if (!reading?.sensor_type || reading.value === null || reading.value === undefined) return;

        const bounds = customZones?.[reading.sensor_type];
        const status = getComfortStatus(reading.sensor_type, reading.value, bounds);
        factorsCount++;

        switch (status) {
            case 'good': break;
            case 'warning': score -= 10; break;
            case 'attention': score -= 25; break;
            default: score -= 5;
        }
    });

    if (factorsCount === 0) return null;
    return Math.max(0, Math.min(100, score));
}

/**
 * Get score label and icon based on score value
 */
export function getScoreInfo(score) {
    if (score === null || score === undefined) {
        return { label: 'No Data', Icon: HelpCircle, color: '#6b7280' };
    }
    if (score >= 90) return { label: 'Excellent', Icon: Star, color: '#4ade80' };
    if (score >= 70) return { label: 'Good', Icon: ThumbsUp, color: '#a3e635' };
    if (score >= 50) return { label: 'Needs Attention', Icon: AlertTriangle, color: '#fbbf24' };
    return { label: 'Action Required', Icon: AlertCircle, color: '#f87171' };
}

/**
 * Get overall room status message
 */
export function getRoomStatusMessage(score, roomName = 'Your Room') {
    if (score === null) return `${roomName}: No data available`;
    if (score >= 90) return `${roomName} feels great!`;
    if (score >= 70) return `${roomName} is comfortable`;
    if (score >= 50) return `${roomName} needs some attention`;
    return `${roomName} needs immediate attention`;
}

// ============================================================================
// SMART TIPS
// ============================================================================

/**
 * Generate actionable tips based on sensor readings
 */
export function generateTips(readings, customZones = null) {
    const tips = [];

    readings.forEach(reading => {
        if (!reading?.sensor_type || reading.value === null) return;

        const config = SENSOR_TYPES[reading.sensor_type];
        if (!config?.tips) return;

        const bounds = customZones?.[reading.sensor_type];
        const zone = getComfortZone(reading.sensor_type, reading.value, bounds);

        if (!zone || zone.level === 'comfortable' || zone.level === 'normal') return;

        const tip = config.tips[zone.level];
        if (tip) tips.push(tip);
    });

    return tips;
}

// ============================================================================
// DISPLAY MODES
// ============================================================================

export const DISPLAY_MODES = [
    { id: 'comfort', label: 'Comfort View', description: 'Easy to understand with tips', Icon: HeartPulse },
    { id: 'tiles', label: 'Status Tiles', description: 'Compact visual overview', Icon: Activity },
    { id: 'gauges', label: 'Gauges', description: 'Detailed dial displays', Icon: Gauge },
    { id: 'live', label: 'Live Gauges', description: 'Radial bar with color zones', Icon: Activity },
    { id: 'simple', label: 'Simple Numbers', description: 'Clean minimal display', Icon: Activity }
];

export function getDisplayMode(modeId) {
    return DISPLAY_MODES.find(m => m.id === modeId) || DISPLAY_MODES[0];
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get all registered sensor types
 */
export function getSensorTypes() {
    return Object.keys(SENSOR_TYPES);
}

/**
 * Get config for a sensor type
 */
export function getSensorTypeConfig(sensorType) {
    return SENSOR_TYPES[sensorType] || null;
}

/**
 * Get default comfort bounds for a sensor type
 */
export function getDefaultBounds(sensorType) {
    const config = SENSOR_TYPES[sensorType];
    if (!config) return null;
    return {
        comfortMin: config.defaultComfortMin,
        comfortMax: config.defaultComfortMax
    };
}
