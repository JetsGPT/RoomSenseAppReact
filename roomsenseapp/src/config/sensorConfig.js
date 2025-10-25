// Centralized sensor configuration
import { Thermometer, Droplets, Gauge, Sun, Activity, Zap, Wind, Eye } from 'lucide-react';

// Sensor type definitions with all their properties
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

// Default sensor types that are commonly used
export const DEFAULT_SENSOR_TYPES = ['temperature', 'humidity', 'pressure', 'light'];

// Helper functions
export const getSensorConfig = (sensorType) => {
    return SENSOR_TYPES[sensorType] || {
        name: sensorType.charAt(0).toUpperCase() + sensorType.slice(1),
        unit: '',
        icon: Gauge,
        color: '#6b7280', // gray
        description: `Unknown sensor type: ${sensorType}`,
        min: 0,
        max: 100,
        precision: 1
    };
};

export const getSensorIcon = (sensorType) => {
    return getSensorConfig(sensorType).icon;
};

export const getSensorUnit = (sensorType) => {
    return getSensorConfig(sensorType).unit;
};

export const getSensorColor = (sensorType) => {
    return getSensorConfig(sensorType).color;
};

export const getSensorName = (sensorType) => {
    return getSensorConfig(sensorType).name;
};

export const formatSensorValue = (value, sensorType) => {
    const config = getSensorConfig(sensorType);
    return value.toFixed(config.precision);
};

// Chart configuration
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

// Time range presets
export const TIME_RANGES = {
    '5m': { label: 'Last 5 minutes', value: '-5m' },
    '15m': { label: 'Last 15 minutes', value: '-15m' },
    '1h': { label: 'Last hour', value: '-1h' },
    '6h': { label: 'Last 6 hours', value: '-6h' },
    '24h': { label: 'Last 24 hours', value: '-24h' },
    '7d': { label: 'Last 7 days', value: '-7d' },
    '30d': { label: 'Last 30 days', value: '-30d' }
};

// Default time range
export const DEFAULT_TIME_RANGE = '24h';

// Data limits for different use cases
export const DATA_LIMITS = {
    realtime: 100,      // For real-time monitoring
    overview: 500,      // For overview charts
    analytics: 1000,    // For detailed analytics
    export: 10000      // For data export
};
