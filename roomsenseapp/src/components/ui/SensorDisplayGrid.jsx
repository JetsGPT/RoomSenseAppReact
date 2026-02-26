/**
 * SensorDisplayGrid Component
 * 
 * Shared component for rendering sensor readings in multiple display modes.
 * Eliminates duplicate rendering logic between Overview and BoxDetail.
 */

import React, { memo } from 'react';
import { ComfortCard, StatusTile, SimpleCard } from './ComfortCard';
import { SensorGauge } from './SensorGauge';
import { LiveGauge } from './LiveGauge';

/**
 * Renders a grid of sensor readings based on the selected display mode.
 * 
 * @param {Array} readings - Array of sensor reading objects
 * @param {string} displayMode - 'comfort' | 'tiles' | 'gauges' | 'simple'
 * @param {Function} getGaugeTypeForSensor - Function to get gauge type per sensor
 * @param {boolean} compactGauges - Whether to use compact gauge mode
 * @param {string} emptyMessage - Message to show when no readings
 * @param {string} className - Additional CSS classes
 */
export const SensorDisplayGrid = memo(function SensorDisplayGrid({
    readings,
    displayMode = 'comfort',
    getGaugeTypeForSensor,
    compactGauges = false,
    emptyMessage = 'No sensor data available.',
    className = ''
}) {
    if (!readings || readings.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        );
    }

    const gridClass = `grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${className}`;

    return (
        <div className={gridClass}>
            {readings.map((reading, index) => {
                const key = `${reading.sensor_type}-${reading.sensor_box || index}`;

                return (
                    <SensorDisplayItem
                        key={key}
                        reading={reading}
                        displayMode={displayMode}
                        getGaugeTypeForSensor={getGaugeTypeForSensor}
                        compactGauges={compactGauges}
                    />
                );
            })}
        </div>
    );
});

/**
 * Single sensor display item - renders based on display mode
 */
const SensorDisplayItem = memo(function SensorDisplayItem({
    reading,
    displayMode,
    getGaugeTypeForSensor,
    compactGauges
}) {
    const { sensor_type, value, timestamp } = reading;

    switch (displayMode) {
        case 'comfort':
            return (
                <ComfortCard
                    sensorType={sensor_type}
                    value={value}
                    timestamp={timestamp}
                />
            );

        case 'tiles':
            return (
                <StatusTile
                    sensorType={sensor_type}
                    value={value}
                    timestamp={timestamp}
                />
            );

        case 'gauges':
            return (
                <SensorGauge
                    value={value}
                    sensorType={sensor_type}
                    gaugeType={getGaugeTypeForSensor?.(sensor_type) || 'grafana'}
                    timestamp={timestamp}
                    compact={compactGauges}
                />
            );

        case 'live':
            return (
                <LiveGauge
                    value={value}
                    sensorType={sensor_type}
                    timestamp={timestamp}
                    compact={compactGauges}
                />
            );

        case 'simple':
        default:
            return (
                <SimpleCard
                    sensorType={sensor_type}
                    value={value}
                    timestamp={timestamp}
                />
            );
    }
});

export default SensorDisplayGrid;
