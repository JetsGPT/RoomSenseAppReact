import React, { useMemo, memo, useCallback } from 'react';
import GaugeComponent from 'react-gauge-component';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { WifiOff, AlertTriangle, Thermometer, Droplets, Gauge, Sun, Wind, Zap, Activity, Eye, Settings2 } from 'lucide-react';
import { getGaugeConfig, getReadingState, GAUGE_TYPES } from '../../config/gaugeConfig';
import { getSensorIcon, getSensorName, getSensorUnit } from '../../config/sensorConfig';

/**
 * Sensor-specific recommended gauge types for visual appropriateness
 */
const SENSOR_RECOMMENDED_GAUGES = {
    temperature: 'grafana',      // Arc gauge with warm/cool colors
    humidity: 'semicircle',      // Water-like semicircle
    pressure: 'speedometer',     // Technical speedometer look
    light: 'radial',             // Radial like sun rays
    motion: 'simple',            // Simple on/off indicator
    voltage: 'modern',           // Modern tech look
    wind_speed: 'semicircle',    // Flowing semicircle
    visibility: 'minimal'        // Clean minimal gauge
};

/**
 * Sensor-specific color themes
 */
const SENSOR_COLOR_THEMES = {
    temperature: {
        cold: ['#4dabf7', '#74c0fc', '#a5d8ff'],
        warm: ['#ffd43b', '#ff922b', '#ff6b6b'],
        gradient: ['#4dabf7', '#69db7c', '#ffd43b', '#ff6b6b']
    },
    humidity: {
        dry: ['#ff6b6b', '#ffd43b'],
        comfortable: ['#69db7c', '#40c057'],
        humid: ['#4dabf7', '#5c7cfa', '#7950f2']
    },
    pressure: {
        low: ['#ff6b6b'],
        normal: ['#40c057', '#69db7c'],
        high: ['#4dabf7']
    },
    light: {
        dark: ['#495057', '#868e96'],
        bright: ['#ffd43b', '#ff922b', '#fcc419']
    }
};

/**
 * Get gauge preset configuration based on type and sensor
 */
const getGaugePreset = (gaugeType, config, sensorType) => {
    const baseProps = {
        minValue: config.min,
        maxValue: config.max,
        arc: {
            subArcs: config.subArcs,
            padding: 0.02,
            width: 0.25
        },
        pointer: {
            elastic: true,
            animationDelay: 0,
            animationDuration: 400 // Reduced for better performance
        },
        labels: {
            valueLabel: { hide: true },
            tickLabels: {
                hideMinMax: false,
                ticks: [],
                defaultTickValueConfig: {
                    style: { fontSize: '9px', fill: 'var(--muted-foreground)' }
                },
                defaultTickLineConfig: { hide: true }
            }
        }
    };

    // Sensor-specific styling overrides
    const sensorStyles = {
        temperature: {
            arc: { ...baseProps.arc, cornerRadius: 5, width: 0.3 },
            pointer: { ...baseProps.pointer, type: 'needle', color: '#ff6b6b', length: 0.7, width: 12 }
        },
        humidity: {
            arc: { ...baseProps.arc, cornerRadius: 15, width: 0.35 },
            pointer: { ...baseProps.pointer, type: 'blob', color: '#4dabf7', length: 0.6, width: 25 }
        },
        pressure: {
            arc: { ...baseProps.arc, cornerRadius: 0, width: 0.2 },
            pointer: { ...baseProps.pointer, type: 'needle', color: '#495057', baseColor: '#868e96', length: 0.75, width: 8 }
        },
        light: {
            arc: { ...baseProps.arc, cornerRadius: 10, width: 0.25 },
            pointer: { ...baseProps.pointer, type: 'arrow', color: '#ffd43b', length: 0.65, width: 18 }
        }
    };

    const sensorOverrides = sensorStyles[sensorType] || {};

    switch (gaugeType) {
        case 'grafana':
            return {
                ...baseProps,
                type: 'grafana',
                arc: { ...baseProps.arc, cornerRadius: 7, width: 0.3, ...sensorOverrides.arc },
                pointer: { ...baseProps.pointer, type: 'arrow', color: 'var(--foreground)', baseColor: 'var(--muted)', length: 0.8, width: 15, ...sensorOverrides.pointer }
            };

        case 'semicircle':
            return {
                ...baseProps,
                type: 'semicircle',
                arc: { ...baseProps.arc, cornerRadius: 12, width: 0.28, ...sensorOverrides.arc },
                pointer: { ...baseProps.pointer, type: 'blob', color: 'var(--primary)', length: 0.6, width: 22, ...sensorOverrides.pointer }
            };

        case 'radial':
            return {
                ...baseProps,
                type: 'radial',
                arc: { ...baseProps.arc, cornerRadius: 0, width: 0.15 },
                pointer: { ...baseProps.pointer, type: 'needle', color: 'var(--foreground)', baseColor: 'var(--primary)', length: 0.65, width: 10 }
            };

        case 'speedometer':
            return {
                ...baseProps,
                type: 'semicircle',
                arc: { ...baseProps.arc, cornerRadius: 0, width: 0.18 },
                pointer: { ...baseProps.pointer, type: 'needle', color: '#ff4444', baseColor: 'var(--muted)', length: 0.75, width: 6 },
                labels: { ...baseProps.labels, tickLabels: { ...baseProps.labels.tickLabels, type: 'outer' } }
            };

        case 'simple':
            return {
                ...baseProps,
                type: 'semicircle',
                arc: { ...baseProps.arc, cornerRadius: 8, width: 0.12, padding: 0 },
                pointer: { ...baseProps.pointer, type: 'blob', color: 'var(--primary)', length: 0.45, width: 28 },
                labels: { valueLabel: { hide: true }, tickLabels: { hide: true } }
            };

        case 'modern':
            return {
                ...baseProps,
                type: 'grafana',
                arc: { ...baseProps.arc, cornerRadius: 15, width: 0.32, padding: 0.03 },
                pointer: { ...baseProps.pointer, type: 'arrow', color: 'var(--foreground)', baseColor: 'transparent', length: 0.55, width: 18 }
            };

        case 'blob':
            return {
                ...baseProps,
                type: 'semicircle',
                arc: { ...baseProps.arc, cornerRadius: 20, width: 0.38 },
                pointer: { ...baseProps.pointer, type: 'blob', color: 'var(--foreground)', length: 0.5, width: 32 }
            };

        case 'minimal':
            return {
                ...baseProps,
                type: 'semicircle',
                arc: { ...baseProps.arc, cornerRadius: 4, width: 0.06 },
                pointer: { ...baseProps.pointer, type: 'blob', color: 'var(--primary)', length: 0.35, width: 12 },
                labels: { valueLabel: { hide: true }, tickLabels: { hide: true } }
            };

        default:
            return baseProps;
    }
};

/**
 * Get sensor-appropriate icon with styling
 */
const SensorIconDisplay = memo(({ sensorType, size = 18, className = "" }) => {
    const iconMap = {
        temperature: Thermometer,
        humidity: Droplets,
        pressure: Gauge,
        light: Sun,
        wind_speed: Wind,
        voltage: Zap,
        motion: Activity,
        visibility: Eye
    };

    const Icon = iconMap[sensorType] || Gauge;

    // Sensor-specific icon colors
    const colorMap = {
        temperature: 'text-red-400',
        humidity: 'text-blue-400',
        pressure: 'text-emerald-500',
        light: 'text-amber-400',
        wind_speed: 'text-cyan-400',
        voltage: 'text-orange-400',
        motion: 'text-violet-400',
        visibility: 'text-lime-400'
    };

    return <Icon size={size} className={`${colorMap[sensorType] || 'text-primary'} ${className}`} />;
});

SensorIconDisplay.displayName = 'SensorIconDisplay';

/**
 * SensorGauge Component
 * 
 * Displays a sensor reading as an animated gauge with customizable style.
 * Optimized with memo and useMemo for performance.
 */
export const SensorGauge = memo(function SensorGauge({
    value,
    sensorType,
    gaugeType: propGaugeType,
    timestamp,
    boxName,
    className = '',
    showCustomizeButton = false,
    onCustomize,
    compact = false
}) {
    // Get sensor configuration (combines base sensor config with gauge settings)
    const config = useMemo(() => getGaugeConfig(sensorType), [sensorType]);

    // Use recommended gauge type for sensor if not explicitly set
    const gaugeType = propGaugeType || SENSOR_RECOMMENDED_GAUGES[sensorType] || 'grafana';

    // Get sensor display properties from central config
    const sensorName = useMemo(() => getSensorName(sensorType), [sensorType]);
    const unit = useMemo(() => getSensorUnit(sensorType), [sensorType]);

    // Calculate state based on timestamp
    const state = useMemo(() => getReadingState(timestamp), [timestamp]);

    // Get gauge preset props - memoized with all dependencies
    const gaugeProps = useMemo(
        () => getGaugePreset(gaugeType, config, sensorType),
        [gaugeType, config, sensorType]
    );

    // Clamp value to min/max range
    const clampedValue = useMemo(() => {
        if (value === null || value === undefined || isNaN(value)) return config.min;
        return Math.min(Math.max(parseFloat(value), config.min), config.max);
    }, [value, config.min, config.max]);

    // Check if value is out of range
    const isOutOfRange = value !== null && value !== undefined &&
        (value < config.min || value > config.max);

    // Memoized gauge style
    const gaugeStyle = useMemo(() => ({
        width: '100%',
        maxWidth: compact ? 160 : 200
    }), [compact]);

    // Handle customize click
    const handleCustomize = useCallback(() => {
        if (onCustomize) {
            onCustomize(sensorType);
        }
    }, [onCustomize, sensorType]);

    return (
        <motion.div
            className={`gauge-container gauge-state-${state} ${compact ? 'gauge-compact' : ''} ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            layout
        >
            {/* State Badge */}
            <div className={`gauge-badge gauge-badge-${state}`}>
                {state === 'live' && <span>Live</span>}
                {state === 'stale' && (
                    <>
                        <AlertTriangle size={10} />
                        <span>Stale</span>
                    </>
                )}
                {state === 'offline' && (
                    <>
                        <WifiOff size={10} />
                        <span>Offline</span>
                    </>
                )}
            </div>

            {/* Customize Button */}
            {showCustomizeButton && (
                <button
                    onClick={handleCustomize}
                    className="gauge-customize-btn"
                    title="Customize gauge"
                >
                    <Settings2 size={14} />
                </button>
            )}

            {/* Header with sensor-specific icon */}
            <div className="gauge-header">
                <div className="flex items-center gap-2">
                    <SensorIconDisplay sensorType={sensorType} size={compact ? 14 : 18} />
                    <span className="gauge-label">{sensorName}</span>
                </div>
                {boxName && (
                    <span className="gauge-unit text-xs opacity-70">{boxName}</span>
                )}
            </div>

            {/* Gauge */}
            <div className="gauge-wrapper">
                {state === 'offline' && value === null ? (
                    <div className="gauge-no-data">
                        <WifiOff className="gauge-no-data-icon" />
                        <span className="gauge-no-data-text">No data</span>
                    </div>
                ) : (
                    <GaugeComponent
                        {...gaugeProps}
                        value={clampedValue}
                        style={gaugeStyle}
                    />
                )}
            </div>

            {/* Value Display */}
            <div className="gauge-value-display">
                <span className={`gauge-value ${compact ? 'text-lg' : ''}`}>
                    <NumberFlow
                        value={parseFloat(clampedValue).toFixed(config.precision || 1)}
                        transformTiming={{ duration: 250 }}
                    />
                </span>
                <span className="gauge-value-unit">{unit}</span>
                {isOutOfRange && (
                    <span className="text-xs text-destructive ml-1">(clamped)</span>
                )}
            </div>
        </motion.div>
    );
});

/**
 * GaugeCustomizer Component
 * 
 * Allows per-sensor gauge type customization
 */
export const GaugeCustomizer = memo(function GaugeCustomizer({
    sensorType,
    currentType,
    onChange,
    className = ''
}) {
    const sensorName = getSensorName(sensorType);

    return (
        <div className={`gauge-customizer ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <SensorIconDisplay sensorType={sensorType} size={16} />
                <span className="text-sm font-medium">{sensorName}</span>
            </div>
            <div className="flex flex-wrap gap-1">
                {GAUGE_TYPES.map(type => (
                    <button
                        key={type.id}
                        onClick={() => onChange(sensorType, type.id)}
                        className={`
                            px-2 py-1 text-xs rounded-md transition-all
                            ${currentType === type.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 hover:bg-muted text-muted-foreground'}
                        `}
                        title={type.description}
                    >
                        {type.label}
                    </button>
                ))}
            </div>
        </div>
    );
});

export default SensorGauge;
