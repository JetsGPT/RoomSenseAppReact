import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSidebar } from '../shared/contexts/SidebarContext';
import { useSensorData } from '../hooks/useSensorData';
import { useSensorSelection } from '../hooks/useSensorSelection';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from '../components/ui/SensorCharts';
import { Overview } from '../components/Overview';
import { BoxDetail } from '../components/BoxDetail';
import { Options } from '../components/Options';
import { SensorChartManager } from '../components/SensorChartManager';
import { StaggeredContainer, StaggeredItem, FadeIn, SlideIn } from '../components/ui/PageTransition';
import { 
    getSensorUnit, 
    getSensorColor 
} from '../config/sensorConfig';


const Dashboard = () => {
    const { activeView } = useSidebar();
    const [fetchDelay, setFetchDelay] = useState(() => {
        // Get from localStorage or default to 30 seconds
        const saved = localStorage.getItem('sensorFetchDelay');
        return saved ? parseInt(saved) : 30;
    });

    // Use the custom hook for data fetching
    const {
        data: sensorData,
        groupedData,
        sensorTypes,
        loading,
        error,
        refresh: refreshData
    } = useSensorData({
        timeRange: '-30d',
        limit: 2000,
        autoRefresh: fetchDelay > 0,
        refreshInterval: fetchDelay * 1000
    });

    const {
        selectedSensors: analyticsSensorTypes,
        setSelectedSensors: setAnalyticsSensorTypes
    } = useSensorSelection({
        storageKey: 'roomsense.dashboard.selectedSensors',
        availableSensors: sensorTypes,
        defaultToAll: true
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

    // Get unit for sensor type (using centralized config)
    const getUnit = (sensorType) => {
        return getSensorUnit(sensorType);
    };

    // Get chart colors from centralized config
    const chartColors = useMemo(() => {
        return sensorTypes.reduce((colors, sensorType) => {
            colors[sensorType] = getSensorColor(sensorType);
            return colors;
        }, {});
    }, [sensorTypes]);

    const activeSensorTypes = useMemo(() => {
        return analyticsSensorTypes.filter((sensor) => sensorTypes.includes(sensor));
    }, [analyticsSensorTypes, sensorTypes]);

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
            const analyticsCharts = activeSensorTypes.map(sensorType => {
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
            }).filter(Boolean);

            return (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h2>
                        <SensorChartManager
                            availableSensors={sensorTypes}
                            selectedSensors={activeSensorTypes}
                            onChange={setAnalyticsSensorTypes}
                        />
                    </div>
                    {activeSensorTypes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                            Select at least one sensor type to display its chart.
                        </div>
                    ) : analyticsCharts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                            No readings available for the selected sensors.
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {analyticsCharts}
                        </div>
                    )}
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
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Data</h2>
                    <p className="text-muted-foreground mb-4">{error.message}</p>
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

