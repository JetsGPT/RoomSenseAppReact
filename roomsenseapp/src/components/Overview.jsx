import React, { useMemo, useState } from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { SensorLineChart, MultiBoxChart } from './ui/SensorCharts';
import { Thermometer, Droplets, Gauge, Sun, Activity, PencilLine } from 'lucide-react';
import NumberFlow from "@number-flow/react"
import { Button } from './ui/button';
import { SensorChartManager } from './SensorChartManager';
import { useSensorSelection } from '../hooks/useSensorSelection';

export function Overview({ sensorData, groupedData }) {
    // Get sensor type icon
    const getSensorIcon = (sensorType) => {
        switch (sensorType) {
            case 'temperature':
                return Thermometer;
            case 'humidity':
                return Droplets;
            case 'pressure':
                return Gauge;
            case 'light':
                return Sun;
            default:
                return Gauge;
        }
    };

    // Get unit for sensor type
    const getUnit = (sensorType) => {
        switch (sensorType) {
            case 'temperature':
                return '°C';
            case 'humidity':
                return '%';
            case 'pressure':
                return ' hPa';
            case 'light':
                return ' lux';
            default:
                return '';
        }
    };

    // Get latest reading for each sensor type in a box
    const getLatestReadings = (readings) => {
        const latestByType = {};
        readings.forEach(reading => {
            if (!reading || !reading.sensor_type) return;
            if (!latestByType[reading.sensor_type] ||
                new Date(reading.timestamp) > new Date(latestByType[reading.sensor_type].timestamp)) {
                latestByType[reading.sensor_type] = reading;
            }
        });
        return Object.values(latestByType);
    };

    // Prepare chart data for a specific sensor type
    const getChartDataForSensorType = (sensorType) => {
        return sensorData
            .filter(reading => reading.sensor_type === sensorType)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(reading => ({
                timestamp: reading.timestamp,
                value: reading.value,
                sensor_box: reading.sensor_box
            }));
    };

    const [showQuickTrendManager, setShowQuickTrendManager] = useState(false);

    const availableSensorTypes = useMemo(() => {
        if (!Array.isArray(sensorData)) return [];
        return Array.from(new Set(sensorData.map((reading) => reading.sensor_type))).filter(Boolean);
    }, [sensorData]);

    const {
        selectedSensors: quickTrendSensorTypes,
        setSelectedSensors: setQuickTrendSensorTypes
    } = useSensorSelection({
        storageKey: 'roomsense.overview.selectedSensors',
        availableSensors: availableSensorTypes,
        defaultToAll: false,
        defaultSelection: ['temperature', 'humidity']
    });

    const quickTrendCharts = quickTrendSensorTypes.map((sensorType) => {
        // 1. Filter data for this sensor type
        const typeData = Array.isArray(sensorData) ? sensorData
            .filter(reading => reading.sensor_type === sensorType)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

        if (typeData.length === 0) {
            return null;
        }

        // 2. Pivot data: Group by timestamp
        const pivotedData = [];
        const timeMap = new Map();

        typeData.forEach(reading => {
            const time = reading.timestamp;
            if (!timeMap.has(time)) {
                timeMap.set(time, { timestamp: time });
                pivotedData.push(timeMap.get(time));
            }
            const entry = timeMap.get(time);
            entry[reading.sensor_box] = reading.value;
        });

        // 3. Generate colors for boxes
        const uniqueBoxes = [...new Set(typeData.map(r => r.sensor_box))];
        const boxColors = uniqueBoxes.reduce((acc, boxId, index) => {
            acc[boxId] = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
            return acc;
        }, {});

        return (
            <MultiBoxChart
                key={sensorType}
                data={pivotedData}
                sensorType={sensorType}
                boxColors={boxColors}
            />
        );
    }).filter(Boolean);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <InfoBlock title="Total Boxes" className="text-center">
                    <div className="flex items-center justify-center">
                        <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <NumberFlow className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold" value={Object.keys(groupedData).length} />

                    </div>
                </InfoBlock>

                <InfoBlock title="Sensor Types" className="text-center">
                    <div className="flex items-center justify-center">
                        <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <NumberFlow className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold" value={[...new Set(sensorData.map(r => r.sensor_type))].length} />
                    </div>
                </InfoBlock>

                <InfoBlock title="Total Readings" className="text-center">
                    <div className="flex items-center justify-center">
                        <Gauge className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <NumberFlow className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold" value={sensorData.length} />
                    </div>
                </InfoBlock>

                <InfoBlock title="Last Update" className="text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                        {sensorData.length > 0 ?
                            new Date(Math.max(...sensorData.map(r => new Date(r.timestamp)))).toLocaleString()
                            : 'No data'
                        }
                    </div>
                </InfoBlock>
            </div>

            {/* Sensor Boxes Overview */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(groupedData).map(([boxId, readings]) => {
                    const latestReadings = getLatestReadings(readings);
                    return (
                        <InfoBlock key={boxId} title={`Box ${boxId}`} className="hover:shadow-md transition-shadow">
                            <div className="space-y-2 sm:space-y-3">
                                {latestReadings.map((reading, index) => {
                                    const sensorType = reading.sensor_type || 'unknown';
                                    const Icon = getSensorIcon(sensorType);
                                    const value = typeof reading.value === 'number' ? reading.value : parseFloat(reading.value);
                                    return (
                                        <InfoItem
                                            key={`${sensorType}-${index}`}
                                            label={sensorType.charAt(0).toUpperCase() + sensorType.slice(1)}
                                            value={<><NumberFlow value={!isNaN(value) ? value.toFixed(1) : '0.0'} />{getUnit(sensorType)}</>}
                                            icon={Icon}
                                        />
                                    );
                                })}
                                <div className="pt-2 border-t border-border">
                                    <p className="text-xs text-muted-foreground">
                                        <NumberFlow value={readings.length} /> readings
                                    </p>
                                </div>
                            </div>
                        </InfoBlock>
                    );
                })}
            </div>

            {/* Quick Trends */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">Quick Trends</h3>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant={showQuickTrendManager ? 'secondary' : 'ghost'}
                        onClick={() => setShowQuickTrendManager((prev) => !prev)}
                        aria-pressed={showQuickTrendManager}
                        className="shrink-0"
                    >
                        <PencilLine className="h-4 w-4" />
                        <span className="sr-only">Configure quick trend charts</span>
                    </Button>
                </div>
                {showQuickTrendManager && (
                    <SensorChartManager
                        availableSensors={availableSensorTypes}
                        selectedSensors={quickTrendSensorTypes}
                        onChange={setQuickTrendSensorTypes}
                        className="bg-background"
                    />
                )}
                {quickTrendSensorTypes.length === 0 || quickTrendCharts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to display quick trend charts.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        {quickTrendCharts}
                    </div>
                )}
            </div>
        </div>
    );
}
