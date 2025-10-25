import React, { useMemo } from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from './ui/SensorCharts';
import { Activity } from 'lucide-react';
import NumberFlow from "@number-flow/react";
import { 
    getSensorConfig, 
    getSensorIcon, 
    getSensorUnit, 
    getSensorColor, 
    getSensorName, 
    formatSensorValue,
    CHART_CONFIG 
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

    // Get latest reading for each sensor type
    const latestReadings = useMemo(() => {
        const latestByType = {};
        boxData.forEach(reading => {
            if (!latestByType[reading.sensor_type] || 
                new Date(reading.timestamp) > new Date(latestByType[reading.sensor_type].timestamp)) {
                latestByType[reading.sensor_type] = reading;
            }
        });
        return Object.values(latestByType);
    }, [boxData]);

    const sensorTypes = useMemo(() => 
        [...new Set(boxData.map(r => r.sensor_type))],
        [boxData]
    );

    // Get chart colors from centralized config
    const chartColors = useMemo(() => 
        sensorTypes.reduce((colors, sensorType) => {
            colors[sensorType] = getSensorColor(sensorType);
            return colors;
        }, {}),
        [sensorTypes]
    );

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Sensor Box {boxId}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        <NumberFlow value={boxData.length} /> total readings • <NumberFlow value={sensorTypes.length} /> sensor types
                    </p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground">Last updated</p>
                    <p className="text-sm sm:text-base font-medium">
                        {new Date(Math.max(...boxData.map(r => new Date(r.timestamp)))).toLocaleString()}
                    </p>
                </div>
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
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    {sensorTypes.map(sensorType => {
                        const chartData = getChartDataForSensorType(sensorType);
                        if (chartData.length === 0) return null;
                        
                        return (
                            <SensorLineChart
                                key={sensorType}
                                data={chartData}
                                sensorType={sensorType}
                                color={chartColors[sensorType]}
                                unit={getUnit(sensorType)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Combined View */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">All Sensors Combined</h3>
                <MultiSensorChart
                    data={getMultiSensorChartData()}
                    title={`Box ${boxId} - All Sensors`}
                    colors={chartColors}
                />
            </div>

            {/* Area Charts for Trends */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Trend Analysis</h3>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    {sensorTypes.slice(0, 2).map(sensorType => {
                        const chartData = getChartDataForSensorType(sensorType);
                        if (chartData.length === 0) return null;
                        
                        return (
                            <SensorAreaChart
                                key={sensorType}
                                data={chartData}
                                sensorType={sensorType}
                                color={chartColors[sensorType]}
                                unit={getUnit(sensorType)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
