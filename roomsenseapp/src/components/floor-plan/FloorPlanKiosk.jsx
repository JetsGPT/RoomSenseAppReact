/**
 * Floor Plan Kiosk Component
 * 
 * Full-screen floor plan display optimized for wall-mounted tablets.
 * Features large sensors with prominent readings.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { floorPlanStorage, floorPlanAPI } from '../../services/floorPlanAPI';
import { useConnections } from '../../contexts/ConnectionsContext';
import { useDashboardSensorData } from '../../hooks/useSensorData';
import { useComfortZones } from '../../hooks/useComfortZones';
import { sensorHelpers } from '../../services/sensorsAPI';
import { calculateBoundingBox } from '../../utils/floorPlanUtils';
import { getSensorUnit } from '../../config/sensorConfig';
import { useToast } from '../../hooks/use-toast';
import {
    Thermometer,
    Droplets,
    Wind,
    Layers,
} from 'lucide-react';
import '../../styles/floorplan.css';

const CANVAS_ASPECT = 800 / 600; // 4:3 Correction

// Get icon for sensor type
const getSensorIcon = (sensorType) => {
    switch (sensorType?.toLowerCase()) {
        case 'temperature':
            return Thermometer;
        case 'humidity':
            return Droplets;
        case 'co2':
        case 'air_quality':
            return Wind;
        default:
            return Thermometer;
    }
};

/**
 * Kiosk Sensor Component - Large display version
 */
function KioskSensor({ sensor, sensorData, activeConnections, viewTransform, containerSize, rotation }) {
    const { getComfortZone } = useComfortZones();

    // Get sensor box info - map MAC address to connection info
    const sensorBox = activeConnections.find(c => c.address === sensor.sensorBoxId);
    const boxName = sensorBox?.name || sensor.label || 'Sensor';
    const sensorName = sensor.label || boxName;

    // Get latest readings - use box NAME (not MAC) to match sensor data
    const readings = useMemo(() => {
        if (!sensorData) return [];
        // Sensor data uses friendly name, not MAC address
        const boxData = sensorData.filter(r => r.sensor_box === boxName);
        return sensorHelpers.getLatestReadings(boxData);
    }, [sensorData, boxName]);

    // Get primary reading
    const primaryReading = readings.find(r =>
        r.sensor_type === 'temperature' || r.sensor_type === 'humidity'
    ) || readings[0];

    // Calculate comfort status
    const comfortStatus = useMemo(() => {
        if (readings.length === 0) return 'unknown';

        for (const reading of readings) {
            const zone = getComfortZone(reading.sensor_type);
            if (zone) {
                if (reading.value < zone.min * 0.9 || reading.value > zone.max * 1.1) {
                    return 'critical';
                }
                if (reading.value < zone.min || reading.value > zone.max) {
                    return 'warning';
                }
            }
        }
        return 'good';
    }, [readings, getComfortZone]);

    // Apply transform for auto-scaling
    // x_screen = x_norm * scale + offsetX
    let rx = sensor.position.x;
    let ry = sensor.position.y;

    if (rotation === 90) {
        rx = 1 - sensor.position.y;
        ry = sensor.position.x * CANVAS_ASPECT;
    } else {
        rx = sensor.position.x * CANVAS_ASPECT;
        ry = sensor.position.y;
    }

    const screenX = rx * viewTransform.scale + viewTransform.offsetX;
    const screenY = ry * viewTransform.scale + viewTransform.offsetY;

    // Convert back to % of container for responsive positioning
    const leftPercent = containerSize.width ? `${(screenX / containerSize.width) * 100}%` : '0%';
    const topPercent = containerSize.height ? `${(screenY / containerSize.height) * 100}%` : '0%';

    const Icon = primaryReading ? getSensorIcon(primaryReading.sensor_type) : Thermometer;

    return (
        <motion.div
            className="kiosk-sensor"
            style={{ left: leftPercent, top: topPercent }}
            initial={{ scale: 0, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
            exit={{ scale: 0, opacity: 0, x: "-50%", y: "-50%" }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            <div className={`sensor-status-dot ${comfortStatus}`} />

            <span className="sensor-label">{sensorName}</span>

            {primaryReading ? (
                <div className="sensor-reading">
                    <Icon className="w-6 h-6" style={{ opacity: 0.5, marginRight: '0.5rem' }} />
                    {primaryReading.value?.toFixed(1)}
                    <span className="unit">{getSensorUnit(primaryReading.sensor_type)}</span>
                </div>
            ) : (
                <span className="sensor-reading">--</span>
            )}

            {/* Secondary readings */}
            {readings.length > 1 && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    {readings.slice(1, 3).map((reading, idx) => {
                        const SecIcon = getSensorIcon(reading.sensor_type);
                        return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem', color: 'var(--muted-foreground)' }}>
                                <SecIcon className="w-4 h-4" />
                                {reading.value?.toFixed(1)}
                                <span style={{ fontSize: '0.75rem' }}>{getSensorUnit(reading.sensor_type)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

export function FloorPlanKiosk({ autoRotateFloors = true, rotationInterval = 10000 }) {
    const { toast } = useToast();
    const { activeConnections } = useConnections();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const resizeObserverRef = useRef(null);

    const [floorPlans, setFloorPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [rotation, setRotation] = useState(0);

    // Callback ref to set up ResizeObserver when container is attached
    const setContainerRef = useCallback((node) => {
        // Clean up previous observer
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }

        containerRef.current = node;

        if (node) {
            // Set up ResizeObserver
            resizeObserverRef.current = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    if (width > 0 && height > 0) {
                        setContainerSize({ width, height });
                    }
                }
            });
            resizeObserverRef.current.observe(node);

            // Get initial size
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setContainerSize({ width: rect.width, height: rect.height });
            }
        }
    }, []);

    // Clean up ResizeObserver on unmount
    useEffect(() => {
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, []);

    const { data: sensorData } = useDashboardSensorData({
        enabled: true,
        refreshInterval: 5000, // Faster refresh for kiosk
    });

    // Load floor plans
    // Load floor plans
    useEffect(() => {
        let mounted = true;

        const loadPlans = async () => {
            try {
                // Try API first
                const apiPlans = await floorPlanAPI.getFloorPlans();
                if (mounted) {
                    setFloorPlans(apiPlans);
                    selectActivePlan(apiPlans);
                }
            } catch (error) {
                console.warn('Kiosk: Failed to load from API, falling back to local', error);

                // Fallback to local
                const localPlans = floorPlanStorage.getAll();
                if (mounted) {
                    setFloorPlans(localPlans);
                    selectActivePlan(localPlans);
                }
            }
        };

        loadPlans();

        return () => {
            mounted = false;
        };
    }, []);

    const selectActivePlan = (plans) => {
        // 1. Find explicit active plan
        let plan = plans.find(p => p.isActive);

        // 2. Fallback: Plan with sensors
        if (!plan) {
            plan = plans.find(p =>
                (p.floors && p.floors.some(f => f.sensors?.length > 0)) ||
                (p.sensors && p.sensors.length > 0)
            );
        }

        // 3. Fallback: First plan
        if (!plan && plans.length > 0) {
            plan = plans[0];
        }

        if (plan) {
            setSelectedPlanId(plan.id);
            if (plan.floors) {
                // Try to find floor with sensors, else first
                const floorWithSensors = plan.floors.find(f => f.sensors?.length > 0);
                setSelectedFloorId(floorWithSensors?.id || plan.floors[0]?.id);
            }
        }
    };

    // Get selected plan and floor
    const selectedPlan = floorPlans.find(p => p.id === selectedPlanId);
    const selectedFloor = useMemo(() => {
        if (!selectedPlan) return null;
        if (selectedPlan.floors) {
            return selectedPlan.floors.find(f => f.id === selectedFloorId) || selectedPlan.floors[0];
        }
        // Legacy format
        return {
            elements: selectedPlan.elements || [],
            sensors: selectedPlan.sensors || [],
        };
    }, [selectedPlan, selectedFloorId]);

    // Auto-rotate floors
    useEffect(() => {
        if (!autoRotateFloors || !selectedPlan?.floors || selectedPlan.floors.length <= 1) {
            return;
        }

        const interval = setInterval(() => {
            setSelectedFloorId(currentId => {
                const currentIndex = selectedPlan.floors.findIndex(f => f.id === currentId);
                const nextIndex = (currentIndex + 1) % selectedPlan.floors.length;
                return selectedPlan.floors[nextIndex].id;
            });
        }, rotationInterval);

        return () => clearInterval(interval);
    }, [autoRotateFloors, rotationInterval, selectedPlan?.floors]);

    // Calculate view transform (auto-zoom) and auto-rotation
    useEffect(() => {
        if (!selectedFloor || containerSize.width === 0 || containerSize.height === 0) return;

        const bounds = calculateBoundingBox(selectedFloor.elements || [], selectedFloor.sensors || []);
        const correctedWidth = bounds.width * CANVAS_ASPECT;
        const correctedHeight = bounds.height;

        // Check normal fit
        const scaleX = containerSize.width / correctedWidth;
        const scaleY = containerSize.height / correctedHeight;
        const scaleNormal = Math.min(scaleX, scaleY);

        // Check rotated fit (90 deg)
        // New Width = Old Height
        const scaleRotX = containerSize.width / correctedHeight;
        // New Height = Old Width
        const scaleRotY = containerSize.height / correctedWidth;
        const scaleRotated = Math.min(scaleRotX, scaleRotY);

        let activeRotation = 0;

        // Auto-rotate if it gives significantly better scale (> 20% bigger)
        if (scaleRotated > scaleNormal * 1.2) {
            activeRotation = 90;
        }

        setRotation(activeRotation);

        // Re-calculate transform with chosen rotation
        let effectiveBoundsWidth, effectiveBoundsHeight, effectiveMinX, effectiveMinY;

        if (activeRotation === 90) {
            effectiveBoundsWidth = correctedHeight;
            effectiveBoundsHeight = correctedWidth;
            effectiveMinX = 1 - bounds.maxY;
            effectiveMinY = bounds.minX * CANVAS_ASPECT;
        } else {
            effectiveBoundsWidth = correctedWidth;
            effectiveBoundsHeight = correctedHeight;
            effectiveMinX = bounds.minX * CANVAS_ASPECT;
            effectiveMinY = bounds.minY;
        }

        const fitScale = Math.min(
            containerSize.width / effectiveBoundsWidth,
            containerSize.height / effectiveBoundsHeight
        ) * 0.9; // 90% fill to prevent edge touching

        // Center
        const scaledWidth = effectiveBoundsWidth * fitScale;
        const scaledHeight = effectiveBoundsHeight * fitScale;

        const offsetX = (containerSize.width - scaledWidth) / 2 - (effectiveMinX * fitScale);
        const offsetY = (containerSize.height - scaledHeight) / 2 - (effectiveMinY * fitScale);

        setViewTransform({ scale: fitScale, offsetX, offsetY });

    }, [selectedFloor, containerSize]);

    // Draw floor plan elements - only when we have valid container size
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !selectedFloor) return;

        // Skip drawing if container size is not set yet
        if (containerSize.width === 0 || containerSize.height === 0) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = containerSize;
        const { scale, offsetX, offsetY } = viewTransform;

        // Set canvas drawing size
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Helper to transform points
        const transformPoint = (x, y) => {
            let rx = x;
            let ry = y;
            if (rotation === 90) {
                rx = 1 - y;
                ry = x * CANVAS_ASPECT;
            } else {
                rx = x * CANVAS_ASPECT;
                ry = y;
            }
            return [
                rx * scale + offsetX,
                ry * scale + offsetY
            ];
        };

        selectedFloor.elements?.forEach((element) => {
            const { type, points, style } = element;
            if (!points || points.length === 0) return;

            ctx.strokeStyle = style?.strokeColor || '#3b82f6';
            ctx.lineWidth = (style?.strokeWidth || 2) * (scale / 500) * 1.5; // Thicker lines for kiosk

            ctx.beginPath();

            switch (type) {
                case 'freehand':
                    const [startX, startY] = transformPoint(points[0][0], points[0][1]);
                    ctx.moveTo(startX, startY);
                    points.slice(1).forEach(([x, y]) => {
                        const [px, py] = transformPoint(x, y);
                        ctx.lineTo(px, py);
                    });
                    ctx.stroke();
                    break;

                case 'rectangle':
                    if (points.length >= 2) {
                        const [x1, y1] = transformPoint(points[0][0], points[0][1]);
                        const [x2, y2] = transformPoint(points[1][0], points[1][1]);
                        ctx.strokeRect(
                            Math.min(x1, x2),
                            Math.min(y1, y2),
                            Math.abs(x2 - x1),
                            Math.abs(y2 - y1)
                        );
                    }
                    break;

                case 'line':
                    if (points.length >= 2) {
                        const [lx1, ly1] = transformPoint(points[0][0], points[0][1]);
                        const [lx2, ly2] = transformPoint(points[1][0], points[1][1]);
                        ctx.moveTo(lx1, ly1);
                        ctx.lineTo(lx2, ly2);
                        ctx.stroke();
                    }
                    break;

                default:
                    break;
            }
        });
    }, [selectedFloor, containerSize, viewTransform, rotation]);

    // No floor plans
    if (floorPlans.length === 0 || !selectedFloor) {
        return (
            <div className="kiosk-floor-plan" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    <Layers className="w-16 h-16 opacity-50 mx-auto mb-4" />
                    <p style={{ fontSize: '1.5rem', fontWeight: 500 }}>No Floor Plan Available</p>
                    <p>Create a floor plan to display here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="kiosk-floor-plan" ref={setContainerRef}>
            {/* Floor indicator */}
            {selectedPlan?.floors?.length > 1 && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--card)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10,
                }}>
                    <Layers className="w-5 h-5" />
                    <span style={{ fontWeight: 600 }}>{selectedFloor?.name || 'Floor'}</span>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        ({selectedPlan.floors.findIndex(f => f.id === selectedFloorId) + 1}/{selectedPlan.floors.length})
                    </span>
                </div>
            )}

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="kiosk-floor-plan-canvas"
            />

            {/* Sensors */}
            <AnimatePresence>
                {selectedFloor?.sensors?.map((sensor) => (
                    <KioskSensor
                        key={sensor.id}
                        sensor={sensor}
                        sensorData={sensorData}
                        activeConnections={activeConnections}
                        viewTransform={viewTransform}
                        containerSize={containerSize}
                        rotation={rotation}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export default FloorPlanKiosk;
