import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../shared/contexts/SidebarContext';
import { useSensorData } from '../hooks/useSensorData';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from '../components/ui/SensorCharts';
import { Overview } from '../components/Overview';
import { BoxDetail } from '../components/BoxDetail';
import { Options } from '../components/Options';
import { StaggeredContainer, StaggeredItem, FadeIn, SlideIn } from '../components/ui/PageTransition';
import { 
    getSensorConfig, 
    getSensorIcon, 
    getSensorUnit, 
    getSensorColor, 
    getSensorName,
    CHART_CONFIG,
    DEFAULT_TIME_RANGE_VALUE,
    DEFAULT_DATA_LIMIT,
    DEFAULT_REFRESH_INTERVAL
} from '../config/sensorConfig';



const Dashboard = () => {
    const { activeView, setActiveView } = useSidebar();
    const [fetchDelay, setFetchDelay] = useState(() => {
        // Get from localStorage or default to DEFAULT_REFRESH_INTERVAL / 1000 seconds
        const saved = localStorage.getItem('sensorFetchDelay');
        return saved ? parseInt(saved) : DEFAULT_REFRESH_INTERVAL / 1000;
    });

    // Use the custom hook for data fetching
    const {
        data: sensorData,
        groupedData,
        sensorBoxes,
        sensorTypes,
        loading,
        error,
        refresh: refreshData
    } = useSensorData({
        timeRange: DEFAULT_TIME_RANGE_VALUE,
        limit: DEFAULT_DATA_LIMIT,
        autoRefresh: fetchDelay > 0,
        refreshInterval: fetchDelay * 1000
    });

    // Save fetch delay to localStorage
    useEffect(() => {
        localStorage.setItem('sensorFetchDelay', fetchDelay.toString());
    }, [fetchDelay]);

    const handleFetchDelayChange = async (newDelay) => {
        setFetchDelay(newDelay);
    };

    const handleRefreshData = () => {
        refreshData();
    };

    // Get chart colors from centralized config
    // Note: This duplicates CHART_CONFIG.colors logic but allows for dynamic sensor types
    const chartColors = useMemo(() => {
        return sensorTypes.reduce((colors, sensorType) => {
            colors[sensorType] = getSensorColor(sensorType);
            return colors;
        }, {});
    }, [sensorTypes]);

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
                        {sensorTypes.map(sensorType => {
                            const chartData = sensorData
                                .filter(reading => reading.sensor_type === sensorType)
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                .map(reading => ({
                                    timestamp: reading.timestamp,
                                    value: reading.value,
                                    sensor_box: reading.sensor_box
                                }));
                            
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

    // Show loading state
    if (loading && sensorData.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading sensor data...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Data</h2>
                    <p className="text-muted-foreground mb-4">{errorMessage}</p>
                    <button 
                        onClick={refreshData}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="min-h-screen bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
                {loading && (
                    <motion.div 
                        className="fixed top-4 right-4 z-50"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-background/80 backdrop-blur-sm border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground font-medium">Updating...</span>
                        </div>
                    </motion.div>
                )}
                <StaggeredContainer delay={0.1}>
                    <StaggeredItem>
                        {renderContent()}
                    </StaggeredItem>
                </StaggeredContainer>
            </div>
        </motion.div>
    );
};

export default Dashboard;

