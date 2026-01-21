/**
 * Centralized sensor configuration
 * 
 * AUTO-GENERATED from comfortConfig.js (Single Source of Truth)
 * 
 * This module exports derived configurations for UI components, charts, and data formatting.
 * To add a new sensor type, add it to 'comfortConfig.js'.
 */

import { Gauge } from 'lucide-react';
import { SENSOR_TYPES as REGISTRY } from './comfortConfig';

// ============================================================================
// Constants
// ============================================================================

/** Default values for unknown sensor types */
const DEFAULT_SENSOR_CONFIG = {
    icon: Gauge,
    color: '#6b7280', // gray
    unit: '',
    min: 0,
    max: 100,
    precision: 1
};

/** Default time range for data fetching */
export const DEFAULT_TIME_RANGE_VALUE = '-24h';

/** Default limit for data fetching */
export const DEFAULT_DATA_LIMIT = 500;

/** Default refresh interval in milliseconds */
export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Sensor Type Definitions (Derived)
// ============================================================================

/**
 * Auto-generated sensor type definitions from comfortConfig registry.
 * Maps the comfort config format to the structure expected by charts and UI.
 */
export const SENSOR_TYPES = Object.entries(REGISTRY).reduce((acc, [key, config]) => {
    acc[key] = {
        name: config.label,
        unit: config.unit,
        icon: config.Icon,
        color: config.color,
        description: config.description || `${config.label} readings`,
        min: config.rangeMin,
        max: config.rangeMax,
        precision: config.precision ?? 1
    };
    return acc;
}, {});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the configuration object for a sensor type.
 * Returns a default configuration for unknown sensor types.
 */
export const getSensorConfig = (sensorType) => {
    if (!sensorType || typeof sensorType !== 'string') {
        return {
            name: 'Unknown',
            ...DEFAULT_SENSOR_CONFIG,
            description: 'Invalid sensor type'
        };
    }

    const config = SENSOR_TYPES[sensorType];
    if (config) {
        return config;
    }

    // Return default config for unknown sensor types
    return {
        name: sensorType.charAt(0).toUpperCase() + sensorType.slice(1).replace(/_/g, ' '),
        ...DEFAULT_SENSOR_CONFIG,
        description: `Unknown sensor type: ${sensorType}`
    };
};

export const getSensorIcon = (sensorType) => getSensorConfig(sensorType).icon;
export const getSensorUnit = (sensorType) => getSensorConfig(sensorType).unit;
export const getSensorColor = (sensorType) => getSensorConfig(sensorType).color;
export const getSensorName = (sensorType) => getSensorConfig(sensorType).name;

/**
 * Format a sensor value according to its type's precision settings.
 */
export const formatSensorValue = (value, sensorType) => {
    if (value == null) return 'N/A';

    const config = getSensorConfig(sensorType);
    const numValue = Number(value);

    if (isNaN(numValue)) return 'N/A';

    return numValue.toFixed(config.precision);
};

// ============================================================================
// Chart Configuration
// ============================================================================

export const CHART_CONFIG = {
    defaultHeight: 250,
    multiSensorHeight: 300,
    colors: Object.fromEntries(
        Object.entries(SENSOR_TYPES).map(([key, config]) => [key, config.color])
    ),
    margins: { top: 5, right: 20, left: 10, bottom: 5 },
    strokeWidth: 2,
    dotRadius: 3,
    activeDotRadius: 5
};

// ============================================================================
// Time Range Presets
// ============================================================================

export const TIME_RANGES = {
    '5m': { label: 'Last 5 minutes', value: '-5m' },
    '15m': { label: 'Last 15 minutes', value: '-15m' },
    '1h': { label: 'Last hour', value: '-1h' },
    '6h': { label: 'Last 6 hours', value: '-6h' },
    '24h': { label: 'Last 24 hours', value: '-24h' },
    '7d': { label: 'Last 7 days', value: '-7d' },
    '30d': { label: 'Last 30 days', value: '-30d' }
};

export const DEFAULT_TIME_RANGE = '24h';

// ============================================================================
// Data Limits
// ============================================================================

export const DATA_LIMITS = {
    realtime: 100,      // For real-time monitoring
    overview: 500,      // For overview charts
    analytics: 1000,    // For detailed analytics
    export: 10000      // For data export
};
