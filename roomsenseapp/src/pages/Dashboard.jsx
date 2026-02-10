import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { useSidebar } from '../shared/contexts/SidebarContext';
import { useSensorData, useDashboardSensorData } from '../hooks/useSensorData';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { SensorLineChart, SensorAreaChart, MultiSensorChart } from '../components/ui/SensorCharts';
import { Overview } from '../components/Overview';
import { BoxDetail } from '../components/BoxDetail';
import { Options } from '../components/Options';
import { StaggeredContainer, StaggeredItem, FadeIn, SlideIn } from '../components/ui/PageTransition';
import {
    getSensorUnit,
    getSensorColor,
    CHART_CONFIG,
    DEFAULT_TIME_RANGE_VALUE,
    DEFAULT_DATA_LIMIT,
    DEFAULT_REFRESH_INTERVAL
} from '../config/sensorConfig';



const Dashboard = () => {
    const { activeView } = useSidebar();
    const [fetchDelay, setFetchDelay] = useState(() => {
        // Get from localStorage or default to DEFAULT_REFRESH_INTERVAL / 1000 seconds
        const saved = localStorage.getItem('sensorFetchDelay');
        return saved ? parseInt(saved) : DEFAULT_REFRESH_INTERVAL / 1000;
    });

    // Optimized data fetching based on active view
    const isOverview = activeView === 'overview';
    const boxId = activeView.startsWith('box-') ? activeView.replace('box-', '') : null;

    // 1. Overview: Use optimized "latest per box" fetch
    const overviewData = useDashboardSensorData({
        enabled: isOverview,
        autoRefresh: fetchDelay > 0,
        refreshInterval: fetchDelay * 1000
    });

    // 2. Box Detail: BoxDetail component handles its own data fetching
    // We disable fetching here to avoid duplicate requests (BoxDetail uses limit=1000 with custom ranges)
    const boxData = useSensorData({
        enabled: false, // Disabled - BoxDetail component fetches its own data
        sensor_box: boxId,
        timeRange: DEFAULT_TIME_RANGE_VALUE,
        limit: DEFAULT_DATA_LIMIT,
        autoRefresh: fetchDelay > 0,
        refreshInterval: fetchDelay * 1000
    });

    // Select the appropriate data source
    const {
        data: sensorData,
        groupedData,
        sensorTypes,
        loading,
        isFetching,
        error,
        refresh: refreshData
    } = isOverview ? overviewData :
            boxId ? boxData :
                { data: [], groupedData: {}, sensorTypes: [], loading: false, isFetching: false, error: null, refresh: () => { } };

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
                    onRefreshData={handleRefreshData}
                />
            );
        } else if (activeView.startsWith('box-')) {
            const boxId = activeView.replace('box-', '');
            return (
                <BoxDetail
                    boxId={boxId}
                />
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
        <Motion.div
            className="min-h-screen bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
                {isFetching && (
                    <Motion.div
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
                    </Motion.div>
                )}
                <StaggeredContainer delay={0.1}>
                    <StaggeredItem>
                        {renderContent()}
                    </StaggeredItem>
                </StaggeredContainer>
            </div>
        </Motion.div>
    );
};

export default Dashboard;

