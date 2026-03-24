import React, { useMemo, useState, useCallback, memo } from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { MultiBoxChart } from './ui/SensorCharts';
import { GaugeCustomizer } from './ui/SensorGauge';
import { SensorDisplayGrid } from './ui/SensorDisplayGrid';
import { RoomScore, TipsCard, RoomScoreCompact } from './ui/RoomScore';
import { DisplayModeSelector } from './ui/DisplayModeSelector';
import { PageBanner } from './ui/PageBanner';
import { FloorPlanViewer } from './floor-plan/FloorPlanViewer';
import { SystemHealthWidget } from './ui/SystemHealthWidget';
import { Radio, Clock, Settings2, X, ChevronRight, PencilLine, Map as MapIcon } from 'lucide-react';
import { Button } from './ui/button';
import { SensorChartManager } from './SensorChartManager';
import { useSensorSelection } from '../hooks/useSensorSelection';
import { useComfortZones } from '../hooks/useComfortZones';
import { useSettings } from '../contexts/SettingsContext';
import { useConnections } from '../contexts/ConnectionsContext';
import { useSidebar } from '../shared/contexts/SidebarContext';
import { getSensorIcon, getSensorUnit, getSensorName } from '../config/sensorConfig';
import { sensorHelpers } from '../services/sensorsAPI';
import { AnimatePresence, motion } from 'framer-motion';
import { AiInsights } from './AiInsights';
import { buildConnectionBoxMap } from '../lib/connectionIdentity';

/**
 * RoomCard Component
 * Shows a room/box summary with comfort score.
 */
const RoomCard = memo(function RoomCard({ boxId, displayName, readings, displayMode, onClick }) {
    const { getComfortZone } = useComfortZones();

    const latestReadings = useMemo(() => {
        return sensorHelpers.getLatestReadings(readings);
    }, [readings]);

    return (
        <motion.div
            className="room-card bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{displayName}</h4>
                    {displayName !== boxId && (
                        <p className="text-xs text-muted-foreground truncate">{boxId}</p>
                    )}
                </div>
                <RoomScoreCompact readings={latestReadings} />
            </div>

            {/* Quick status icons */}
            <div className="flex flex-wrap gap-2 mb-3">
                {latestReadings.slice(0, 4).map(reading => {
                    const zone = getComfortZone(reading.sensor_type, reading.value);
                    const ZoneIcon = zone?.Icon;
                    if (!ZoneIcon) return null;
                    return (
                        <ZoneIcon
                            key={reading.sensor_type}
                            className="w-5 h-5"
                            style={{ color: zone?.color }}
                            title={reading.sensor_type}
                        />
                    );
                })}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{readings.length} readings</span>
                <div className="flex items-center gap-1">
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                </div>
            </div>
        </motion.div>
    );
});

/**
 * SensorStatusStrip Component
 * Horizontal strip showing room-by-room comfort status
 */
const SensorStatusStrip = memo(function SensorStatusStrip({ groupedData, getBoxLabel, onRoomClick }) {
    const { getComfortZone, calculateRoomScore, getScoreInfo } = useComfortZones();

    const roomStatuses = useMemo(() => {
        return Object.entries(groupedData).map(([boxId, readings]) => {
            const latestReadings = sensorHelpers.getLatestReadings(readings);
            const score = calculateRoomScore(latestReadings);
            const scoreInfo = getScoreInfo(score);

            // Get the "dominant" status from sensor readings
            let statusLabel = scoreInfo.label;
            const tempReading = latestReadings.find(r => r.sensor_type === 'temperature');
            const humReading = latestReadings.find(r => r.sensor_type === 'humidity');

            if (tempReading) {
                const tempZone = getComfortZone('temperature', tempReading.value);
                if (tempZone && tempZone.label !== 'Good') {
                    statusLabel = tempZone.label;
                }
            }
            if (humReading && statusLabel === scoreInfo.label) {
                const humZone = getComfortZone('humidity', humReading.value);
                if (humZone && humZone.label !== 'Good') {
                    statusLabel = humZone.label;
                }
            }

            return { boxId, displayName: getBoxLabel(boxId), score, scoreInfo, statusLabel };
        });
    }, [groupedData, calculateRoomScore, getScoreInfo, getComfortZone, getBoxLabel]);

    if (roomStatuses.length === 0) return null;

    return (
        <motion.div
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {roomStatuses.map(({ boxId, displayName, score, scoreInfo, statusLabel }) => (
                <button
                    key={boxId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm cursor-pointer"
                    style={{
                        borderColor: scoreInfo.color + '40',
                        backgroundColor: scoreInfo.color + '10',
                        color: scoreInfo.color
                    }}
                    onClick={() => onRoomClick(boxId)}
                >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scoreInfo.color }} />
                    <span className="text-foreground font-medium">{displayName}</span>
                    <span>{statusLabel}</span>
                </button>
            ))}
        </motion.div>
    );
});

export function Overview({ sensorData, groupedData }) {
    const { activeConnections } = useConnections();
    const {
        settings,
        updateSettings,
        getGaugeTypeForSensor,
        setGaugeTypeForSensor
    } = useSettings();

    const { setActiveView } = useSidebar();
    const boxMap = useMemo(() => buildConnectionBoxMap(activeConnections), [activeConnections]);

    const displayMode = settings.displayMode || 'comfort';
    const showTips = settings.showTips !== false;
    const showRoomScore = settings.showRoomScore !== false;

    const [showSettings, setShowSettings] = useState(false);
    const [showQuickTrendManager, setShowQuickTrendManager] = useState(false);

    // Get latest reading for each sensor type across ALL boxes (for Live Now section)
    const latestByType = useMemo(() => {
        if (!Array.isArray(sensorData) || sensorData.length === 0) return [];

        const latest = {};
        sensorData.forEach(reading => {
            if (!reading || !reading.sensor_type) return;
            if (!latest[reading.sensor_type] ||
                new Date(reading.timestamp) > new Date(latest[reading.sensor_type].timestamp)) {
                latest[reading.sensor_type] = reading;
            }
        });
        return Object.values(latest);
    }, [sensorData]);

    // Get most recent timestamp for "Last updated" display
    const lastUpdate = useMemo(() => {
        if (!Array.isArray(sensorData) || sensorData.length === 0) return 'No data';
        const maxTime = Math.max(...sensorData.map(r => new Date(r.timestamp).getTime()));
        return new Date(maxTime).toLocaleTimeString();
    }, [sensorData]);

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

    const getBoxLabel = useCallback((boxId) => {
        return boxMap.get(boxId)?.displayName || boxId;
    }, [boxMap]);

    // Handle display mode change
    const handleDisplayModeChange = useCallback((mode) => {
        updateSettings({ displayMode: mode });
    }, [updateSettings]);

    // Handle gauge type change for a specific sensor
    const handleGaugeTypeChange = useCallback((sensorType, newType) => {
        setGaugeTypeForSensor(sensorType, newType);
    }, [setGaugeTypeForSensor]);

    const handleCustomize = useCallback(() => {
        setShowSettings(true);
    }, []);

    const quickTrendCharts = useMemo(() => {
        return quickTrendSensorTypes.map((sensorType) => {
            const typeData = Array.isArray(sensorData) ? sensorData
                .filter(reading => reading.sensor_type === sensorType)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

            if (typeData.length === 0) return null;

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
    }, [quickTrendSensorTypes, sensorData]);

    return (
        <div className="space-y-5">
            <PageBanner>
                <div className="max-w-3xl space-y-3">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground backdrop-blur-sm">
                        RoomSense Dashboard
                    </span>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            Overview
                        </h2>
                        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                            {Object.keys(groupedData).length > 0
                                ? `Monitor ${Object.keys(groupedData).length} active rooms, ${latestByType.length} live sensor groups, and the overall comfort of your space at a glance.`
                                : 'Monitor live room comfort, sensor activity, and system status at a glance.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                            {Object.keys(groupedData).length} rooms active
                        </span>
                        <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                            {latestByType.length} sensor groups live
                        </span>
                        <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                            Updated {lastUpdate}
                        </span>
                    </div>
                </div>
            </PageBanner>

            {/* ===== SENSOR STATUS STRIP ===== */}
            {Object.keys(groupedData).length > 0 && (
                <SensorStatusStrip
                    groupedData={groupedData}
                    getBoxLabel={getBoxLabel}
                    onRoomClick={(boxId) => setActiveView(`box-${boxId}`)}
                />
            )}

            {/* ===== COMPACT ROOM SCORE + LIVE HEADER ===== */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-primary animate-pulse" />
                            <h3 className="text-lg font-semibold">Live Now</h3>
                        </div>
                        {/* Compact Room Score Badge */}
                        {showRoomScore && latestByType.length > 0 && (
                            <RoomScoreCompact readings={latestByType} className="ml-1" />
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>{lastUpdate}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DisplayModeSelector
                            value={displayMode}
                            onChange={handleDisplayModeChange}
                            variant="buttons"
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant={showSettings ? 'secondary' : 'ghost'}
                            onClick={() => setShowSettings(prev => !prev)}
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Display Settings</h4>
                                    <Button size="icon-sm" variant="ghost" onClick={() => setShowSettings(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Display Mode Grid */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Display Style</label>
                                    <DisplayModeSelector
                                        value={displayMode}
                                        onChange={handleDisplayModeChange}
                                        variant="pills"
                                    />
                                </div>

                                {/* Gauge Customizer (only for gauges mode) */}
                                {displayMode === 'gauges' && (
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-2 block">Gauge Styles</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {availableSensorTypes.map(sensorType => (
                                                <GaugeCustomizer
                                                    key={sensorType}
                                                    sensorType={sensorType}
                                                    currentType={getGaugeTypeForSensor(sensorType)}
                                                    onChange={handleGaugeTypeChange}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Toggle Options */}
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={showRoomScore}
                                            onChange={(e) => updateSettings({ showRoomScore: e.target.checked })}
                                            className="rounded"
                                        />
                                        Show Room Score
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={showTips}
                                            onChange={(e) => updateSettings({ showTips: e.target.checked })}
                                            className="rounded"
                                        />
                                        Show Tips
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sensor Display */}
                <SensorDisplayGrid
                    readings={latestByType}
                    displayMode={displayMode}
                    getGaugeTypeForSensor={getGaugeTypeForSensor}
                />
            </div>

            {/* ===== TIPS + SYSTEM HEALTH (Two-column) ===== */}
            {(showTips && latestByType.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TipsCard readings={latestByType} maxTips={3} />
                    <div className="bg-card border border-border rounded-2xl p-4">
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">System Overview</h4>
                        <div className="text-xs text-muted-foreground">
                            <p>{Object.keys(groupedData).length} rooms active</p>
                            <p>{latestByType.length} sensor types reporting</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== FLOOR PLAN SECTION ===== */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-lg font-semibold">Floor Plan</h3>
                </div>
                <FloorPlanViewer height={450} />
            </div>

            {/* ===== AI INSIGHTS ===== */}
            <div className="pt-2">
                <AiInsights activeBoxes={Object.keys(groupedData)} />
            </div>

            {/* ===== ROOMS OVERVIEW ===== */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Your Rooms</h3>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(groupedData).map(([boxId, readings]) => (
                        <RoomCard
                            key={boxId}
                            boxId={boxId}
                            displayName={getBoxLabel(boxId)}
                            readings={readings}
                            displayMode={displayMode}
                            onClick={() => setActiveView(`box-${boxId}`)}
                        />
                    ))}
                </div>
            </div>

            {/* ===== QUICK TRENDS ===== */}
            <div className="space-y-3 sm:space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Trends</h3>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant={showQuickTrendManager ? 'secondary' : 'ghost'}
                        onClick={() => setShowQuickTrendManager((prev) => !prev)}
                        className="shrink-0"
                    >
                        <PencilLine className="h-4 w-4" />
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
                        Select sensors to display trend charts.
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
