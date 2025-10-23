import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {sensorsAPI} from '../services/api';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from '../components/ui/SensorChart';
import { Sidebar } from '../components/ui/Sidebar';
import { Overview } from '../components/Overview';
import { BoxDetail } from '../components/BoxDetail';
import { Options } from '../components/Options';
import { Thermometer, Droplets, Gauge, Sun } from 'lucide-react';



const Dashboard = () => {
    const [sensorData, setSensorData] = useState([]);
    const [activeView, setActiveView] = useState('overview');
    const [fetchDelay, setFetchDelay] = useState(() => {
        // Get from localStorage or default to 30 seconds
        const saved = localStorage.getItem('sensorFetchDelay');
        return saved ? parseInt(saved) : 30;
    });

    const fetchSensorData = async () => {
        try {
            const data = await sensorsAPI.getSensorData();
            setSensorData(data);
        } catch (error) {
            console.error('Failed to fetch sensor data:', error);
        }
    };

    useEffect(() => {
        fetchSensorData();
    }, []);

    // Auto-refresh functionality
    useEffect(() => {
        if (fetchDelay > 0) {
            const interval = setInterval(() => {
                fetchSensorData();
            }, fetchDelay * 1000);

            return () => clearInterval(interval);
        }
    }, [fetchDelay]);

    // Save fetch delay to localStorage
    useEffect(() => {
        localStorage.setItem('sensorFetchDelay', fetchDelay.toString());
    }, [fetchDelay]);

    const handleFetchDelayChange = async (newDelay) => {
        setFetchDelay(newDelay);
    };

    const handleRefreshData = () => {
        fetchSensorData();
    };

    // Group sensor data by sensor_box
    const groupedData = sensorData.reduce((acc, reading) => {
        const boxId = reading.sensor_box;
        if (!acc[boxId]) {
            acc[boxId] = [];
        }
        acc[boxId].push(reading);
        return acc;
    }, {});

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

    // Prepare multi-sensor chart data for a specific box
    const getMultiSensorChartData = (boxId) => {
        const boxReadings = sensorData.filter(reading => reading.sensor_box === boxId);
        const timePoints = [...new Set(boxReadings.map(r => r.timestamp))].sort();
        
        return timePoints.map(timestamp => {
            const readingsAtTime = boxReadings.filter(r => r.timestamp === timestamp);
            const dataPoint = { timestamp };
            
            readingsAtTime.forEach(reading => {
                dataPoint[reading.sensor_type] = reading.value;
            });
            
            return dataPoint;
        });
    };

    // Chart colors
    const chartColors = {
        temperature: '#ef4444', // red
        humidity: '#3b82f6',     // blue
        pressure: '#10b981',     // emerald
        light: '#f59e0b'         // amber
    };

    // Get sensor boxes for sidebar
    const sensorBoxes = Object.keys(groupedData);

    // Render content based on active view
    const renderContent = () => {
        if (activeView === 'overview') {
            return (
                <Overview 
                    sensorData={sensorData}
                    groupedData={groupedData}
                />
            );
        } else if (activeView.startsWith('box-')) {
            const boxId = activeView.replace('box-', '');
            return (
                <BoxDetail 
                    boxId={boxId}
                    sensorData={sensorData}
                />
            );
        } else if (activeView === 'analytics') {
            return (
                <div className="space-y-8">
                    <h2 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {['temperature', 'humidity', 'pressure', 'light'].map(sensorType => {
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
            );
        } else if (activeView === 'options') {
            return (
                <Options 
                    fetchDelay={fetchDelay}
                    onFetchDelayChange={handleFetchDelayChange}
                    onRefreshData={handleRefreshData}
                />
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col sm:flex-row">
            {/* Sidebar */}
            <div className="flex justify-center sm:justify-start">
                <Sidebar 
                    activeView={activeView}
                    onViewChange={setActiveView}
                    sensorBoxes={sensorBoxes}
                />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

