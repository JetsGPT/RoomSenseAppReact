import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { useSettings } from '../../contexts/SettingsContext';
import { SENSOR_TYPES, generateZones } from '../../config/comfortConfig';

/**
 * Single sensor comfort zone editor
 */
const SensorZoneEditor = memo(function SensorZoneEditor({
    sensorType,
    comfortMin,
    comfortMax,
    onChange
}) {
    const config = SENSOR_TYPES[sensorType];
    if (!config) return null;

    const {
        label, Icon, unit, rangeMin, rangeMax, step,
        defaultComfortMin, defaultComfortMax
    } = config;

    const [isExpanded, setIsExpanded] = useState(false);

    const handleMinChange = (e) => {
        const newMin = parseFloat(e.target.value);
        if (newMin < comfortMax) {
            onChange(sensorType, { comfortMin: newMin, comfortMax });
        }
    };

    const handleMaxChange = (e) => {
        const newMax = parseFloat(e.target.value);
        if (newMax > comfortMin) {
            onChange(sensorType, { comfortMin, comfortMax: newMax });
        }
    };

    const handleReset = () => {
        onChange(sensorType, { comfortMin: defaultComfortMin, comfortMax: defaultComfortMax });
    };

    const isModified = comfortMin !== defaultComfortMin || comfortMax !== defaultComfortMax;

    // Generate zones for visual preview
    const zones = generateZones(sensorType, comfortMin, comfortMax);
    const range = rangeMax - rangeMin;

    return (
        <div className="sensor-zone-editor border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="font-medium text-foreground flex items-center gap-2">
                            {label}
                            {isModified && (
                                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded-full">
                                    Modified
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Comfortable: {comfortMin}{unit} – {comfortMax}{unit}
                        </div>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                            {/* Visual zone bar */}
                            <div className="relative h-8 bg-muted rounded-lg overflow-hidden flex">
                                {zones.map((zone, i) => {
                                    const width = ((zone.max - zone.min) / range) * 100;
                                    return (
                                        <div
                                            key={i}
                                            className="h-full flex items-center justify-center text-xs font-medium"
                                            style={{
                                                width: `${width}%`,
                                                backgroundColor: zone.color + '40',
                                                color: zone.color
                                            }}
                                        >
                                            {width > 15 && zone.label}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Range inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">
                                        Comfort Min
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min={rangeMin}
                                            max={rangeMax}
                                            step={step}
                                            value={comfortMin}
                                            onChange={handleMinChange}
                                            className="flex-1 accent-primary"
                                        />
                                        <span className="text-sm font-medium w-16 text-right">
                                            {comfortMin}{unit}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">
                                        Comfort Max
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min={rangeMin}
                                            max={rangeMax}
                                            step={step}
                                            value={comfortMax}
                                            onChange={handleMaxChange}
                                            className="flex-1 accent-primary"
                                        />
                                        <span className="text-sm font-medium w-16 text-right">
                                            {comfortMax}{unit}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reset button */}
                            {isModified && (
                                <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset to Default ({defaultComfortMin}{unit} – {defaultComfortMax}{unit})
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

/**
 * ComfortZoneSettings Component
 * 
 * Settings panel for customizing comfort zones.
 * Uses SENSOR_TYPES registry from comfortConfig.
 */
export const ComfortZoneSettings = memo(function ComfortZoneSettings({ className = '' }) {
    const { settings, updateSettings } = useSettings();
    const customZones = settings?.customComfortZones || {};

    const handleZoneChange = useCallback((sensorType, values) => {
        updateSettings({
            customComfortZones: {
                ...customZones,
                [sensorType]: values
            }
        });
    }, [customZones, updateSettings]);

    const handleResetAll = useCallback(() => {
        const defaults = {};
        Object.entries(SENSOR_TYPES).forEach(([type, config]) => {
            defaults[type] = {
                comfortMin: config.defaultComfortMin,
                comfortMax: config.defaultComfortMax
            };
        });
        updateSettings({ customComfortZones: defaults });
    }, [updateSettings]);

    return (
        <div className={`space-y-4 ${className}`}>
            <p className="text-sm text-muted-foreground">
                Customize what sensor values you consider comfortable. These settings affect
                comfort status and tips on your dashboard.
            </p>

            <div className="space-y-3">
                {Object.entries(SENSOR_TYPES).map(([sensorType, config]) => {
                    const zones = customZones[sensorType] || {
                        comfortMin: config.defaultComfortMin,
                        comfortMax: config.defaultComfortMax
                    };

                    return (
                        <SensorZoneEditor
                            key={sensorType}
                            sensorType={sensorType}
                            comfortMin={zones.comfortMin}
                            comfortMax={zones.comfortMax}
                            onChange={handleZoneChange}
                        />
                    );
                })}
            </div>

            <Button variant="outline" onClick={handleResetAll} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All to Defaults
            </Button>
        </div>
    );
});

export default ComfortZoneSettings;
