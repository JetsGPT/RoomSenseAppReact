import React, { useMemo, memo, useId } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import {
    WifiOff, AlertTriangle, Thermometer, Droplets,
    Gauge, Sun, Wind, Zap, Activity, Eye
} from 'lucide-react';
import { getReadingState } from '../../config/gaugeConfig';
import { getSensorName, getSensorUnit, getSensorConfig } from '../../config/sensorConfig';
import { getComfortZone } from '../../config/comfortConfig';

// ============================================================================
// Constants
// ============================================================================

const ARC_DEGREES = 270;
const SVG_SIZE = 200;
const STROKE_WIDTH = 16;
const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * (ARC_DEGREES / 360);
// Rotate so the gap is at the bottom-center
const ROTATION_OFFSET = 135; // (360 - 270) / 2 + 90

// ============================================================================
// Icon Map
// ============================================================================

const SENSOR_ICON_MAP = {
    temperature: Thermometer,
    humidity: Droplets,
    pressure: Gauge,
    light: Sun,
    wind_speed: Wind,
    voltage: Zap,
    motion: Activity,
    visibility: Eye,
};

const SENSOR_ICON_CLASS = {
    temperature: 'text-red-400',
    humidity: 'text-blue-400',
    pressure: 'text-emerald-500',
    light: 'text-amber-400',
    wind_speed: 'text-cyan-400',
    voltage: 'text-orange-400',
    motion: 'text-violet-400',
    visibility: 'text-lime-400',
};

// ============================================================================
// LiveGauge Component
// ============================================================================

/**
 * LiveGauge — SVG radial bar gauge with animated arc and comfort-zone colors.
 *
 * Reads zone colors from comfortConfig so thresholds are always in sync.
 */
export const LiveGauge = memo(function LiveGauge({
    value,
    sensorType,
    timestamp,
    compact = false,
    className = '',
}) {
    const filterId = useId();

    // ---------- derived data ----------
    const config = useMemo(() => getSensorConfig(sensorType), [sensorType]);
    const sensorName = useMemo(() => getSensorName(sensorType), [sensorType]);
    const unit = useMemo(() => getSensorUnit(sensorType), [sensorType]);
    const state = useMemo(() => getReadingState(timestamp), [timestamp]);

    const Icon = SENSOR_ICON_MAP[sensorType] || Gauge;
    const iconClass = SENSOR_ICON_CLASS[sensorType] || 'text-primary';

    // Comfort zone → arc color + status label
    const zone = useMemo(
        () => getComfortZone(sensorType, value),
        [sensorType, value],
    );
    const arcColor = zone?.color ?? 'var(--primary)';
    const statusLabel = zone?.label ?? '';

    // Clamp value
    const clamped = useMemo(() => {
        if (value == null || isNaN(value)) return config.min;
        return Math.max(config.min, Math.min(config.max, Number(value)));
    }, [value, config.min, config.max]);

    // Arc offset (full = hidden, 0 = full)
    const ratio = (clamped - config.min) / (config.max - config.min || 1);
    const arcOffset = ARC_LENGTH * (1 - ratio);

    // Gauge legend — collect unique zones for this sensor type
    const legend = useMemo(() => {
        const { zoneConfig } = (() => {
            // Access the raw SENSOR_TYPES from comfortConfig via config structure
            try {
                const { SENSOR_TYPES } = require('../../config/comfortConfig');
                return SENSOR_TYPES[sensorType] || {};
            } catch {
                return {};
            }
        })();
        if (!zoneConfig) return [];

        const items = [];
        zoneConfig.belowComfort?.forEach(z => items.push({ color: z.color, label: z.label }));
        if (zoneConfig.comfort) items.push({ color: zoneConfig.comfort.color, label: zoneConfig.comfort.label });
        zoneConfig.aboveComfort?.forEach(z => items.push({ color: z.color, label: z.label }));
        return items;
    }, [sensorType]);

    // ---------- render ----------
    const svgViewBox = `0 0 ${SVG_SIZE} ${SVG_SIZE}`;
    const center = SVG_SIZE / 2;
    const gaugeSize = compact ? 150 : 180;

    return (
        <motion.div
            className={`live-gauge live-gauge--${state} ${compact ? 'live-gauge--compact' : ''} ${className}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            layout
        >
            {/* State badge */}
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

            {/* SVG Gauge */}
            <div className="live-gauge__chart" style={{ width: gaugeSize, height: gaugeSize }}>
                <svg viewBox={svgViewBox} className="live-gauge__svg">
                    <defs>
                        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={RADIUS}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform={`rotate(${ROTATION_OFFSET} ${center} ${center})`}
                        className="live-gauge__track"
                    />

                    {/* Animated value arc */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                        strokeLinecap="round"
                        transform={`rotate(${ROTATION_OFFSET} ${center} ${center})`}
                        filter={`url(#${CSS.escape(filterId)})`}
                        className="live-gauge__arc"
                        initial={{ strokeDashoffset: ARC_LENGTH, stroke: arcColor }}
                        animate={{ strokeDashoffset: arcOffset, stroke: arcColor }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                </svg>

                {/* Center overlay */}
                <div className="live-gauge__center">
                    <div className="live-gauge__value-wrap">
                        <span className="live-gauge__value">
                            <NumberFlow
                                value={parseFloat(clamped.toFixed(config.precision ?? 1))}
                                transformTiming={{ duration: 600 }}
                            />
                        </span>
                        <span className="live-gauge__unit">{unit}</span>
                    </div>
                    {statusLabel && (
                        <motion.span
                            className="live-gauge__status"
                            animate={{ color: arcColor }}
                            transition={{ duration: 0.5 }}
                        >
                            {statusLabel}
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Footer label */}
            <div className="live-gauge__footer">
                <Icon size={compact ? 14 : 16} className={iconClass} />
                <span className="live-gauge__label">{sensorName}</span>
            </div>

            {/* Legend */}
            {legend.length > 0 && (
                <div className="live-gauge__legend">
                    {legend.map((item, i) => (
                        <span key={i} className="live-gauge__legend-item">
                            <span
                                className="live-gauge__legend-dot"
                                style={{ background: item.color }}
                            />
                            {item.label}
                        </span>
                    ))}
                </div>
            )}
        </motion.div>
    );
});

LiveGauge.displayName = 'LiveGauge';
export default LiveGauge;
