import React, { useMemo, useState } from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from './ui/SensorCharts';
import { Activity, PencilLine } from 'lucide-react';
import NumberFlow from "@number-flow/react";
import { Button } from './ui/button';
import { SensorChartManager } from './SensorChartManager';
import { useSensorSelection } from '../hooks/useSensorSelection';
import { 
    getSensorIcon, 
    getSensorUnit, 
    getSensorColor, 
    getSensorName, 
    formatSensorValue 
} from '../config/sensorConfig';

export function BoxDetail({ boxId, sensorData }) {
    // Filter data for this specific box
    const boxData = useMemo(() => 
        sensorData.filter(reading => reading.sensor_box === boxId),
        [sensorData, boxId]
    );
    
    // Get unit for sensor type (using centralized config)
    const getUnit = (sensorType) => {
        return getSensorUnit(sensorType);
    };

    // Get latest reading for each sensor type in this box
    // Note: This is similar to sensorHelpers.getLatestReadings() but works on already-filtered boxData
    const latestReadings = useMemo(() => {
        const latestByType = {};
        boxData.forEach(reading => {
            const sensorType = reading.sensor_type;
            if (!latestByType[sensorType] || 
                new Date(reading.timestamp) > new Date(latestByType[sensorType].timestamp)) {
                latestByType[sensorType] = reading;
            }
        });
        return Object.values(latestByType);
    }, [boxData]);

    const availableSensorTypes = useMemo(() => 
        [...new Set(boxData.map(r => r.sensor_type))],
        [boxData]
    );

    const [showChartManager, setShowChartManager] = useState(false);

    const {
        selectedSensors: selectedSensorTypes,
        setSelectedSensors: setSelectedSensorTypes
    } = useSensorSelection({
        storageKey: `roomsense.box.${boxId}.selectedSensors`,
        availableSensors: availableSensorTypes,
        defaultToAll: true
    });

    // Get chart colors from centralized config
    const chartColors = useMemo(() => 
        availableSensorTypes.reduce((colors, sensorType) => {
            colors[sensorType] = getSensorColor(sensorType);
            return colors;
        }, {}),
        [availableSensorTypes]
    );

    const activeSensorTypes = useMemo(() => {
        return selectedSensorTypes.filter((sensorType) => availableSensorTypes.includes(sensorType));
    }, [selectedSensorTypes, availableSensorTypes]);

    const activeChartColors = useMemo(() => {
        return activeSensorTypes.reduce((colors, sensorType) => {
            if (chartColors[sensorType]) {
                colors[sensorType] = chartColors[sensorType];
            }
            return colors;
        }, {});
    }, [activeSensorTypes, chartColors]);

    // Prepare chart data for a specific sensor type in this box
    const getChartDataForSensorType = (sensorType) => {
        return boxData
            .filter(reading => reading.sensor_type === sensorType)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(reading => ({
                timestamp: reading.timestamp,
                value: reading.value
            }));
    };

    // Prepare multi-sensor chart data for this box
    const getMultiSensorChartData = () => {
        const timePoints = [...new Set(boxData.map(r => r.timestamp))].sort();
        
        return timePoints.map(timestamp => {
            const readingsAtTime = boxData.filter(r => r.timestamp === timestamp);
            const dataPoint = { timestamp };
            
            readingsAtTime.forEach(reading => {
                dataPoint[reading.sensor_type] = reading.value;
            });
            
            return dataPoint;
        });
    };

    if (boxData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Data Available</h3>
                    <p className="text-muted-foreground">No sensor readings found for Box {boxId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Box Header */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Sensor Box {boxId}</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            <NumberFlow value={boxData.length} /> total readings • <NumberFlow value={availableSensorTypes.length} /> sensor types
                        </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="icon-sm"
                                variant={showChartManager ? 'secondary' : 'ghost'}
                                onClick={() => setShowChartManager((prev) => !prev)}
                                aria-pressed={showChartManager}
                                className="shrink-0"
                            >
                                <PencilLine className="h-4 w-4" />
                                <span className="sr-only">Configure sensor charts</span>
                            </Button>
                            <div className="text-left sm:text-right">
                                <p className="text-xs sm:text-sm text-muted-foreground">Last updated</p>
                                <p className="text-sm sm:text-base font-medium">
                                    {new Date(Math.max(...boxData.map(r => new Date(r.timestamp)))).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {showChartManager && (
                    <SensorChartManager
                        availableSensors={availableSensorTypes}
                        selectedSensors={activeSensorTypes}
                        onChange={setSelectedSensorTypes}
                        className="bg-background"
                    />
                )}
            </div>

            {/* Current Readings */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {latestReadings.map((reading, index) => {
                    const Icon = getSensorIcon(reading.sensor_type);
                    const sensorName = getSensorName(reading.sensor_type);
                    const formattedValue = formatSensorValue(reading.value, reading.sensor_type);
                    return (
                        <InfoBlock key={`${reading.sensor_type}-${index}`} title={sensorName}>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                <div>
                                    <div className="text-lg sm:text-2xl font-bold text-foreground">
                                        <NumberFlow value={formattedValue} />{getUnit(reading.sensor_type)}
                                    </div>
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                        {new Date(reading.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        </InfoBlock>
                    );
                })}
            </div>

            {/* Individual Sensor Charts */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Individual Sensor Trends</h3>
                {activeSensorTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to display individual charts.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                        {activeSensorTypes.map(sensorType => {
                            const chartData = getChartDataForSensorType(sensorType);
                            if (chartData.length === 0) return null;
                            
                            return (
                                <SensorLineChart
                                    key={sensorType}
                                    data={chartData}
                                    sensorType={sensorType}
                                />
                            );
                        }).filter(Boolean)}
                    </div>
                )}
            </div>

            {/* Combined View */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">All Sensors Combined</h3>
                {activeSensorTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to display the combined chart.
                    </div>
                ) : (
                    <MultiSensorChart
                        data={getMultiSensorChartData()}
                        title={`Box ${boxId} - Selected Sensors`}
                        colors={activeChartColors}
                    />
                )}
            </div>

            {/* Area Charts for Trends */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Trend Analysis</h3>
                {activeSensorTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to analyse trend data.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                        {activeSensorTypes.slice(0, 2).map(sensorType => {
                            const chartData = getChartDataForSensorType(sensorType);
                            if (chartData.length === 0) return null;
                            
                            return (
                                <SensorAreaChart
                                    key={sensorType}
                                    data={chartData}
                                    sensorType={sensorType}
                                />
                            );
                        }).filter(Boolean)}
                    </div>
                )}
            </div>
        </div>
    );
}
