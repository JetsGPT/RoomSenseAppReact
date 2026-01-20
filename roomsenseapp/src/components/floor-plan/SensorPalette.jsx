/**
 * Sensor Palette Component
 * 
 * Displays available sensors from ConnectionsContext that can be
 * dragged and dropped onto the floor plan canvas.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useConnections } from '../../contexts/ConnectionsContext';
import { useFloorPlan } from '../../contexts/FloorPlanContext';
import { useDashboardSensorData } from '../../hooks/useSensorData';
import {
    Thermometer,
    Droplets,
    Wind,
    Eye,
    GripVertical,
    Wifi,
    WifiOff,
    Gauge
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
        case 'light':
        case 'illuminance':
            return Eye;
        default:
            return Gauge;
    }
};

/**
 * Individual sensor item that can be dragged
 */
function SensorItem({ connection, latestData, isPlaced }) {
    const handleDragStart = (e) => {
        e.dataTransfer.setData('sensorBoxId', connection.address);
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Get the latest readings for this sensor box
    const readings = latestData?.filter(r => r.sensor_box === connection.address) || [];

    return (
        <motion.div
            className={`sensor-palette-item ${isPlaced ? 'placed' : ''}`}
            draggable={!isPlaced}
            onDragStart={handleDragStart}
            whileHover={{ scale: isPlaced ? 1 : 1.02 }}
            whileTap={{ scale: isPlaced ? 1 : 0.98 }}
        >
            <div className="sensor-palette-item-header">
                <GripVertical className="drag-handle w-4 h-4" />
                <span className="sensor-name">{connection.name || connection.address}</span>
                {connection.connected !== false ? (
                    <Wifi className="status-icon connected w-4 h-4" />
                ) : (
                    <WifiOff className="status-icon disconnected w-4 h-4" />
                )}
            </div>

            {readings.length > 0 && (
                <div className="sensor-readings-preview">
                    {readings.slice(0, 3).map((reading, idx) => {
                        const Icon = getSensorIcon(reading.sensor_type);
                        return (
                            <div key={idx} className="reading-chip">
                                <Icon className="w-3 h-3" />
                                <span>{reading.value?.toFixed(1)}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {isPlaced && (
                <div className="placed-badge">Already placed</div>
            )}
        </motion.div>
    );
}

export function SensorPalette() {
    const { activeConnections, loading: connectionsLoading } = useConnections();
    const { sensors } = useFloorPlan();
    const { data: sensorData, loading: dataLoading } = useDashboardSensorData({
        enabled: true,
        refreshInterval: 30000,
    });

    // Get set of already placed sensor box IDs
    const placedSensorIds = new Set(sensors.map(s => s.sensorBoxId));

    // Separate placed and available sensors
    const availableSensors = activeConnections.filter(
        c => !placedSensorIds.has(c.address)
    );
    const placedSensors = activeConnections.filter(
        c => placedSensorIds.has(c.address)
    );

    if (connectionsLoading) {
        return (
            <div className="sensor-palette">
                <div className="sensor-palette-header">
                    <h3>Sensors</h3>
                </div>
                <div className="sensor-palette-loading">
                    <div className="loading-spinner" />
                    <span>Loading sensors...</span>
                </div>
            </div>
        );
    }

    if (activeConnections.length === 0) {
        return (
            <div className="sensor-palette">
                <div className="sensor-palette-header">
                    <h3>Sensors</h3>
                </div>
                <div className="sensor-palette-empty">
                    <WifiOff className="w-8 h-8" />
                    <p>No sensors connected</p>
                    <span>Connect sensor boxes to place them on your floor plan</span>
                </div>
            </div>
        );
    }

    return (
        <div className="sensor-palette">
            <div className="sensor-palette-header">
                <h3>Sensors</h3>
                <span className="sensor-count">{activeConnections.length}</span>
            </div>

            <div className="sensor-palette-hint">
                Drag sensors onto the floor plan
            </div>

            {/* Available Sensors */}
            {availableSensors.length > 0 && (
                <div className="sensor-palette-section">
                    <h4>Available</h4>
                    <div className="sensor-palette-list">
                        {availableSensors.map((connection) => (
                            <SensorItem
                                key={connection.address}
                                connection={connection}
                                latestData={sensorData}
                                isPlaced={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Placed Sensors */}
            {placedSensors.length > 0 && (
                <div className="sensor-palette-section">
                    <h4>Placed</h4>
                    <div className="sensor-palette-list">
                        {placedSensors.map((connection) => (
                            <SensorItem
                                key={connection.address}
                                connection={connection}
                                latestData={sensorData}
                                isPlaced={true}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SensorPalette;
