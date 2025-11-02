/**
 * Centralized sensor configuration
 * 
 * This module defines all sensor types, their properties, and provides helper functions
 * for accessing sensor configurations. To add a new sensor type, simply add it to the
 * SENSOR_TYPES object below with the required properties.
 */

import { Thermometer, Droplets, Gauge, Sun, Activity, Zap, Wind, Eye } from 'lucide-react';

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
// Sensor Type Definitions
// ============================================================================

/**
 * Sensor type definitions with all their properties.
 * 
 * @typedef {Object} SensorConfig
 * @property {string} name - Display name of the sensor
 * @property {string} unit - Unit of measurement (e.g., '°C', '%', 'V')
 * @property {Component} icon - Lucide React icon component
 * @property {string} color - Hex color code for charts/UI
 * @property {string} description - Human-readable description
 * @property {number} min - Minimum expected value
 * @property {number} max - Maximum expected value
 * @property {number} precision - Decimal places for formatting
 * 
 * To add a new sensor type:
 * 1. Import the icon from 'lucide-react'
 * 2. Add a new entry to SENSOR_TYPES with all required properties
 */
export const SENSOR_TYPES = {
    temperature: {
        name: 'Temperature',
        unit: '°C',
        icon: Thermometer,
        color: '#ef4444', // red
        description: 'Temperature readings in Celsius',
        min: -50,
        max: 100,
        precision: 1
    },
    humidity: {
        name: 'Humidity',
        unit: '%',
        icon: Droplets,
        color: '#3b82f6', // blue
        description: 'Relative humidity percentage',
        min: 0,
        max: 100,
        precision: 1
    },
    pressure: {
        name: 'Pressure',
        unit: ' hPa',
        icon: Gauge,
        color: '#10b981', // emerald
        description: 'Atmospheric pressure in hectopascals',
        min: 800,
        max: 1200,
        precision: 1
    },
    light: {
        name: 'Light',
        unit: ' lux',
        icon: Sun,
        color: '#f59e0b', // amber
        description: 'Light intensity in lux',
        min: 0,
        max: 100000,
        precision: 0
    },
    motion: {
        name: 'Motion',
        unit: '',
        icon: Activity,
        color: '#8b5cf6', // violet
        description: 'Motion detection sensor',
        min: 0,
        max: 1,
        precision: 0
    },
    voltage: {
        name: 'Voltage',
        unit: 'V',
        icon: Zap,
        color: '#f97316', // orange
        description: 'Electrical voltage readings',
        min: 0,
        max: 24,
        precision: 2
    },
    wind_speed: {
        name: 'Wind Speed',
        unit: ' m/s',
        icon: Wind,
        color: '#06b6d4', // cyan
        description: 'Wind speed measurements',
        min: 0,
        max: 50,
        precision: 1
    },
    visibility: {
        name: 'Visibility',
        unit: ' km',
        icon: Eye,
        color: '#84cc16', // lime
        description: 'Visibility distance',
        min: 0,
        max: 50,
        precision: 1
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the configuration object for a sensor type.
 * Returns a default configuration for unknown sensor types.
 * 
 * @param {string} sensorType - The sensor type identifier (e.g., 'temperature', 'humidity')
 * @returns {SensorConfig} The sensor configuration object
 * 
 * @example
 * const config = getSensorConfig('temperature');
 * // Returns: { name: 'Temperature', unit: '°C', icon: Thermometer, ... }
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

/**
 * Get the icon component for a sensor type.
 * @param {string} sensorType - The sensor type identifier
 * @returns {Component} Lucide React icon component
 */
export const getSensorIcon = (sensorType) => {
    return getSensorConfig(sensorType).icon;
};

/**
 * Get the unit of measurement for a sensor type.
 * @param {string} sensorType - The sensor type identifier
 * @returns {string} Unit string (e.g., '°C', '%', 'V')
 */
export const getSensorUnit = (sensorType) => {
    return getSensorConfig(sensorType).unit;
};

/**
 * Get the color code for a sensor type (used in charts/UI).
 * @param {string} sensorType - The sensor type identifier
 * @returns {string} Hex color code
 */
export const getSensorColor = (sensorType) => {
    return getSensorConfig(sensorType).color;
};

/**
 * Get the display name for a sensor type.
 * @param {string} sensorType - The sensor type identifier
 * @returns {string} Display name (e.g., 'Temperature', 'Humidity')
 */
export const getSensorName = (sensorType) => {
    return getSensorConfig(sensorType).name;
};

/**
 * Format a sensor value according to its type's precision settings.
 * Handles null, undefined, and invalid values gracefully.
 * 
 * @param {number|string|null|undefined} value - The sensor value to format
 * @param {string} sensorType - The sensor type identifier
 * @returns {string} Formatted value string (e.g., '23.5', 'N/A')
 * 
 * @example
 * formatSensorValue(23.456, 'temperature') // Returns '23.5'
 * formatSensorValue(null, 'humidity') // Returns 'N/A'
 */
export const formatSensorValue = (value, sensorType) => {
    // Handle null or undefined values
    if (value == null) {
        return 'N/A';
    }
    
    const config = getSensorConfig(sensorType);
    const numValue = Number(value);
    
    // Check if conversion was successful (NaN indicates invalid number)
    if (isNaN(numValue)) {
        return 'N/A';
    }
    
    return numValue.toFixed(config.precision);
};

// ============================================================================
// Chart Configuration
// ============================================================================

/**
 * Chart configuration constants.
 * Colors are automatically derived from SENSOR_TYPES for consistency.
 */
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

/**
 * Time range presets for data fetching.
 * Available for UI components (time range selectors, etc.).
 * 
 * @example
 * // Get the value for '24h' range
 * const range = TIME_RANGES['24h'].value; // Returns '-24h'
 */
export const TIME_RANGES = {
    '5m': { label: 'Last 5 minutes', value: '-5m' },
    '15m': { label: 'Last 15 minutes', value: '-15m' },
    '1h': { label: 'Last hour', value: '-1h' },
    '6h': { label: 'Last 6 hours', value: '-6h' },
    '24h': { label: 'Last 24 hours', value: '-24h' },
    '7d': { label: 'Last 7 days', value: '-7d' },
    '30d': { label: 'Last 30 days', value: '-30d' }
};

/**
 * Default time range key.
 * Use TIME_RANGES[DEFAULT_TIME_RANGE].value to get the actual value ('-24h').
 * Available for potential future UI components.
 */
export const DEFAULT_TIME_RANGE = '24h';

// ============================================================================
// Data Limits
// ============================================================================

/**
 * Data limits for different use cases.
 * Available for consistent data fetching limits across the application.
 * 
 * @example
 * const limit = DATA_LIMITS.realtime; // Returns 100
 */
export const DATA_LIMITS = {
    realtime: 100,      // For real-time monitoring
    overview: 500,      // For overview charts
    analytics: 1000,    // For detailed analytics
    export: 10000      // For data export
};
