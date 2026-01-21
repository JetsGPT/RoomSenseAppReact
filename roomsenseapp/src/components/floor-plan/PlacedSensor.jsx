/**
 * Placed Sensor Component
 * 
 * Visual representation of a sensor placed on the floor plan canvas.
 * Displays real-time data and supports drag repositioning.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useConnections } from '../../contexts/ConnectionsContext';
import { useFloorPlan } from '../../contexts/FloorPlanContext';
import { useDashboardSensorData } from '../../hooks/useSensorData';
import { useComfortZones } from '../../hooks/useComfortZones';
import { sensorHelpers } from '../../services/sensorsAPI';
import { getSensorUnit, getSensorColor } from '../../config/sensorConfig';
import {
    Thermometer,
    Droplets,
    Wind,
    X,
    GripHorizontal,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';

// Get icon for sensor type
const getSensorIcon = (sensorType) => {
    switch (sensorType?.toLowerCase()) {
        case 'temperature':
            return Thermometer;
        case 'humidity':
            return Droplets;
        case 'co2':
        case 'air_quality':
            return Wind;
        default:
            return Thermometer;
    }
};

export function PlacedSensor({ sensor, position, isSelected, onSelect, onMove }) {
    const { activeConnections } = useConnections();
    const { removeSensor } = useFloorPlan();
    const { getComfortZone } = useComfortZones();
    const { data: sensorData } = useDashboardSensorData({
        enabled: true,
        refreshInterval: 10000,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const elementStartPos = useRef({ x: 0, y: 0 });

    // Get sensor box info
    const sensorBox = activeConnections.find(c => c.address === sensor.sensorBoxId);
    const sensorName = sensor.label || sensorBox?.name || sensor.sensorBoxId;

    // Get latest readings for this sensor
    const readings = useMemo(() => {
        if (!sensorData) return [];
        const boxData = sensorData.filter(r => r.sensor_box === sensor.sensorBoxId);
        return sensorHelpers.getLatestReadings(boxData);
    }, [sensorData, sensor.sensorBoxId]);

    // Calculate comfort status
    const comfortStatus = useMemo(() => {
        if (readings.length === 0) return 'unknown';

        let hasWarning = false;
        for (const reading of readings) {
            const zone = getComfortZone(reading.sensor_type);
            if (zone) {
                if (reading.value < zone.min || reading.value > zone.max) {
                    return 'warning';
                }
                if (reading.value < zone.min + (zone.max - zone.min) * 0.1 ||
                    reading.value > zone.max - (zone.max - zone.min) * 0.1) {
                    hasWarning = true;
                }
            }
        }
        return hasWarning ? 'caution' : 'good';
    }, [readings, getComfortZone]);

    // Get primary reading to display
    const primaryReading = readings.find(r =>
        r.sensor_type === 'temperature' || r.sensor_type === 'humidity'
    ) || readings[0];

    // Drag handlers
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        onSelect();
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        elementStartPos.current = { x: position.x, y: position.y };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [onSelect, position]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;

        onMove({
            x: elementStartPos.current.x + dx,
            y: elementStartPos.current.y + dy,
        });
    }, [isDragging, onMove]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Get status color
    const getStatusColor = () => {
        switch (comfortStatus) {
            case 'good': return 'var(--green-500, #22c55e)';
            case 'caution': return 'var(--amber-500, #f59e0b)';
            case 'warning': return 'var(--red-500, #ef4444)';
            default: return 'var(--muted, #6b7280)';
        }
    };

    return (
        <>
            <motion.div
                className={`placed-sensor ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                    left: position.x,
                    top: position.y,
                    '--status-color': getStatusColor(),
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {/* Status Ring */}
                <div className="sensor-status-ring" />

                {/* Main Content */}
                <div className="sensor-content">
                    <div className="sensor-icon">
                        {primaryReading ? (
                            (() => {
                                const Icon = getSensorIcon(primaryReading.sensor_type);
                                return <Icon className="w-4 h-4" />;
                            })()
                        ) : (
                            <Thermometer className="w-4 h-4" />
                        )}
                    </div>

                    {primaryReading && (
                        <div className="sensor-value">
                            {primaryReading.value?.toFixed(1)}
                            <span className="sensor-unit">
                                {getSensorUnit(primaryReading.sensor_type)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Delete Button (visible when selected) */}
                {isSelected && (
                    <button
                        className="sensor-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeSensor(sensor.id);
                        }}
                        title="Remove sensor"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}

                {/* Drag Handle (visible when selected) */}
                {isSelected && (
                    <div className="sensor-drag-handle">
                        <GripHorizontal className="w-3 h-3" />
                    </div>
                )}
            </motion.div>

            {/* Tooltip */}
            {showTooltip && !isDragging && (
                <motion.div
                    className="sensor-tooltip"
                    style={{
                        left: position.x + 50,
                        top: position.y - 10,
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                >
                    <div className="tooltip-header">
                        <span className="tooltip-name">{sensorName}</span>
                        <div className={`tooltip-status ${comfortStatus}`}>
                            {comfortStatus === 'good' && <CheckCircle className="w-3 h-3" />}
                            {comfortStatus === 'warning' && <AlertTriangle className="w-3 h-3" />}
                            <span>{comfortStatus === 'good' ? 'Comfortable' : 'Attention'}</span>
                        </div>
                    </div>

                    <div className="tooltip-readings">
                        {readings.map((reading, idx) => {
                            const Icon = getSensorIcon(reading.sensor_type);
                            return (
                                <div key={idx} className="tooltip-reading">
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: getSensorColor(reading.sensor_type) }}
                                    />
                                    <span className="reading-type">
                                        {reading.sensor_type}
                                    </span>
                                    <span className="reading-value">
                                        {reading.value?.toFixed(1)} {getSensorUnit(reading.sensor_type)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {readings.length === 0 && (
                        <div className="tooltip-no-data">No data available</div>
                    )}
                </motion.div>
            )}
        </>
    );
}

export default PlacedSensor;
