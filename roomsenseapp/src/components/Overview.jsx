import React from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { SensorLineChart } from './ui/SensorChart';
import { Thermometer, Droplets, Gauge, Sun, Activity } from 'lucide-react';

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

    // Chart colors
    const chartColors = {
        temperature: '#ef4444', // red
        humidity: '#3b82f6',     // blue
        pressure: '#10b981',     // emerald
        light: '#f59e0b'         // amber
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <InfoBlock title="Total Boxes" className="text-center">
                    <div className="flex items-center justify-center">
                        <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <span className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold">{Object.keys(groupedData).length}</span>
                    </div>
                </InfoBlock>
                
                <InfoBlock title="Sensor Types" className="text-center">
                    <div className="flex items-center justify-center">
                        <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <span className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold">
                            {[...new Set(sensorData.map(r => r.sensor_type))].length}
                        </span>
                    </div>
                </InfoBlock>
                
                <InfoBlock title="Total Readings" className="text-center">
                    <div className="flex items-center justify-center">
                        <Gauge className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <span className="ml-1 sm:ml-2 text-lg sm:text-2xl font-bold">{sensorData.length}</span>
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
                                    const Icon = getSensorIcon(reading.sensor_type);
                                    return (
                                        <InfoItem
                                            key={`${reading.sensor_type}-${index}`}
                                            label={reading.sensor_type.charAt(0).toUpperCase() + reading.sensor_type.slice(1)}
                                            value={`${reading.value.toFixed(1)}${getUnit(reading.sensor_type)}`}
                                            icon={Icon}
                                        />
                                    );
                                })}
                                <div className="pt-2 border-t border-border">
                                    <p className="text-xs text-muted-foreground">
                                        {readings.length} readings
                                    </p>
                                </div>
                            </div>
                        </InfoBlock>
                    );
                })}
            </div>

            {/* Quick Trends */}
            <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Trends</h3>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {['temperature', 'humidity'].map(sensorType => {
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
        </div>
    );
}
