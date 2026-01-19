import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { HelpCircle, Activity } from 'lucide-react';
import { useComfortZones } from '../../hooks/useComfortZones';
import { getSensorUnit, getSensorName, getSensorIcon } from '../../config/sensorConfig';

/**
 * ComfortCard Component
 * 
 * User-friendly sensor display that shows comfort status with
 * Lucide icons and plain English messages.
 */
export const ComfortCard = memo(function ComfortCard({
    sensorType,
    value,
    timestamp,
    className = '',
    compact = false
}) {
    const { getComfortZone, getComfortStatus } = useComfortZones();

    const zone = useMemo(() => getComfortZone(sensorType, value), [getComfortZone, sensorType, value]);
    const status = useMemo(() => getComfortStatus(sensorType, value), [getComfortStatus, sensorType, value]);
    const unit = getSensorUnit(sensorType);
    const name = getSensorName(sensorType);
    const SensorIcon = getSensorIcon(sensorType);

    // Get zone icon or fallback
    const ZoneIcon = zone?.Icon || Activity;

    const statusColors = {
        good: 'from-green-500/20 to-green-600/10 border-green-500/30',
        warning: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
        attention: 'from-red-500/20 to-red-600/10 border-red-500/30',
        unknown: 'from-gray-500/20 to-gray-600/10 border-gray-500/30'
    };

    const iconColors = {
        good: 'text-green-500',
        warning: 'text-amber-500',
        attention: 'text-red-500',
        unknown: 'text-gray-500'
    };

    if (value === null || value === undefined) {
        return (
            <motion.div
                className={`comfort-card comfort-card-unknown ${className}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="comfort-card-header">
                    <SensorIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="comfort-card-name">{name}</span>
                </div>
                <div className="comfort-card-body">
                    <HelpCircle className="w-10 h-10 text-muted-foreground" />
                    <span className="text-muted-foreground">No data</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`comfort-card comfort-card-${status} bg-gradient-to-br ${statusColors[status]} ${className}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {/* Header with sensor name */}
            <div className="comfort-card-header">
                <SensorIcon className={`w-5 h-5 ${iconColors[status]}`} />
                <span className="comfort-card-name">{name}</span>
                <span className={`comfort-card-status ${iconColors[status]}`}>
                    {status === 'good' && '✓'}
                    {status === 'warning' && '⚠'}
                    {status === 'attention' && '!'}
                </span>
            </div>

            {/* Main content */}
            <div className="comfort-card-body">
                <div className="comfort-card-icon" style={{ color: zone?.color }}>
                    <ZoneIcon className="w-10 h-10" />
                </div>
                <div className="comfort-card-info">
                    <div className="comfort-card-label" style={{ color: zone?.color }}>
                        {zone?.label || 'Unknown'}
                    </div>
                    <div className="comfort-card-value">
                        <NumberFlow value={parseFloat(value).toFixed(1)} />
                        <span className="comfort-card-unit">{unit}</span>
                    </div>
                </div>
            </div>

            {/* Message */}
            {!compact && zone?.message && (
                <div className="comfort-card-message">
                    {zone.message}
                </div>
            )}
        </motion.div>
    );
});

/**
 * StatusTile Component
 * 
 * Compact visual tile showing sensor status with traffic light colors.
 */
export const StatusTile = memo(function StatusTile({
    sensorType,
    value,
    timestamp,
    onClick,
    className = ''
}) {
    const { getComfortZone, getComfortStatus } = useComfortZones();

    const zone = useMemo(() => getComfortZone(sensorType, value), [getComfortZone, sensorType, value]);
    const status = useMemo(() => getComfortStatus(sensorType, value), [getComfortStatus, sensorType, value]);
    const unit = getSensorUnit(sensorType);
    const name = getSensorName(sensorType);

    const ZoneIcon = zone?.Icon || Activity;

    const statusBg = {
        good: 'bg-green-500/15 hover:bg-green-500/25 border-green-500/40',
        warning: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40',
        attention: 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40',
        unknown: 'bg-gray-500/15 hover:bg-gray-500/25 border-gray-500/40'
    };

    const statusDot = {
        good: 'bg-green-500',
        warning: 'bg-amber-500',
        attention: 'bg-red-500',
        unknown: 'bg-gray-500'
    };

    return (
        <motion.button
            onClick={onClick}
            className={`status-tile ${statusBg[status]} ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Status indicator dot */}
            <div className={`status-tile-dot ${statusDot[status]}`} />

            {/* Icon */}
            <div className="status-tile-icon" style={{ color: zone?.color }}>
                <ZoneIcon className="w-8 h-8" />
            </div>

            {/* Label */}
            <div className="status-tile-label">
                {zone?.label || name}
            </div>

            {/* Value */}
            <div className="status-tile-value">
                <NumberFlow value={value !== null ? parseFloat(value).toFixed(1) : '—'} />
                <span>{unit}</span>
            </div>
        </motion.button>
    );
});

/**
 * SimpleCard Component
 * 
 * Minimal number display with icon and value.
 */
export const SimpleCard = memo(function SimpleCard({
    sensorType,
    value,
    timestamp,
    className = ''
}) {
    const { getComfortStatus } = useComfortZones();

    const unit = getSensorUnit(sensorType);
    const name = getSensorName(sensorType);
    const Icon = getSensorIcon(sensorType);
    const status = useMemo(() => getComfortStatus(sensorType, value), [getComfortStatus, sensorType, value]);

    const statusColors = {
        good: 'border-green-500/30',
        warning: 'border-amber-500/30',
        attention: 'border-red-500/30',
        unknown: 'border-gray-500/30'
    };

    return (
        <motion.div
            className={`simple-card ${statusColors[status]} ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="simple-card-header">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="simple-card-name">{name}</span>
            </div>
            <div className="simple-card-value">
                <NumberFlow
                    value={value !== null ? parseFloat(value).toFixed(1) : '—'}
                    className="text-2xl font-bold"
                />
                <span className="simple-card-unit">{unit}</span>
            </div>
        </motion.div>
    );
});

export default ComfortCard;
