/**
 * Floor Plan Viewer Component
 * 
 * Read-only floor plan display with interactive sensor data.
 * Used in Overview page and can be embedded in Kiosk mode.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { floorPlanHelpers as floorPlanAPI } from '../../services/floorPlanAPI';
import { useConnections } from '../../contexts/ConnectionsContext';
import { useDashboardSensorData } from '../../hooks/useSensorData';
import { useComfortZones } from '../../hooks/useComfortZones';
import { useSidebar } from '../../shared/contexts/SidebarContext';
import { sensorHelpers } from '../../services/sensorsAPI';
import { calculateBoundingBox } from '../../utils/floorPlanUtils';
import { getSensorUnit } from '../../config/sensorConfig';
import {
    Map as MapIcon,
    Pencil,
    Thermometer,
    Droplets,
    Wind,
    Plus,
    Plus,
    RotateCw,
    Star,
} from 'lucide-react';
import '../../styles/floorplan.css';

const CANVAS_ASPECT = 800 / 600; // 4:3 Aspect Ratio Correction

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
 * Individual sensor on the viewer
 */
function ViewerSensor({ sensor, sensorData, onSensorClick, activeConnections, viewTransform, containerSize, rotation }) {
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
    // Apply transform for auto-scaling
    // x_screen = x_norm * scale + offsetX
    // Rotation logic
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
    // Guard against 0 width/height
    const leftPercent = containerSize.width ? `${(screenX / containerSize.width) * 100}%` : '0%';
    const topPercent = containerSize.height ? `${(screenY / containerSize.height) * 100}%` : '0%';

    return (
        <motion.div
            className="viewer-sensor"
            style={{ left: leftPercent, top: topPercent }}
            initial={{ scale: 0, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
            whileHover={{ scale: 1.08 }}
            onClick={() => onSensorClick(boxName)} // Use box name, not MAC
        >
            <div className={`viewer-sensor-status ${comfortStatus}`} />

            <span className="viewer-sensor-name">{sensorName}</span>

            {primaryReading ? (
                <div className="viewer-sensor-value">
                    {(() => {
                        const Icon = getSensorIcon(primaryReading.sensor_type);
                        return <Icon className="w-4 h-4" style={{ opacity: 0.5 }} />;
                    })()}
                    {primaryReading.value?.toFixed(1)}
                    <span className="unit">{getSensorUnit(primaryReading.sensor_type)}</span>
                </div>
            ) : (
                <span className="viewer-sensor-value">--</span>
            )}
        </motion.div>
    );
}

export function FloorPlanViewer({ height = 300 }) {
    const navigate = useNavigate();
    const { setActiveView } = useSidebar();
    const { activeConnections } = useConnections();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const resizeObserverRef = useRef(null);

    const [floorPlans, setFloorPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [rotation, setRotation] = useState(0); // 0 or 90
    const [isAutoRotated, setIsAutoRotated] = useState(false);

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
        refreshInterval: 10000,
    });

    // Load floor plans
    useEffect(() => {
        const loadPlans = async () => {
            const plans = await floorPlanAPI.getAll();
            setFloorPlans(plans);

            // Select plan:
            // 1. Plan marked as active
            // 2. Plan with sensors (legacy behavior)
            // 3. First plan available
            const activePlan = plans.find(p => p.isActive);
            const planWithSensors = plans.find(p =>
                (p.floors && p.floors.some(f => f.sensors?.length > 0)) ||
                (p.sensors && p.sensors.length > 0)
            );

            const selected = activePlan || planWithSensors || plans[0];

            if (selected) {
                setSelectedPlanId(selected.id);
                // Set first floor with sensors, or first floor
                if (selected.floors) {
                    const floorWithSensors = selected.floors.find(f => f.sensors?.length > 0);
                    setSelectedFloorId(floorWithSensors?.id || selected.floors[0]?.id);
                }
            }
        };

        loadPlans();
    }, []);





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

    // Calculate view transform (auto-zoom) and auto-rotation
    useEffect(() => {
        if (!selectedFloor || containerSize.width === 0 || containerSize.height === 0) return;

        const bounds = calculateBoundingBox(selectedFloor.elements || [], selectedFloor.sensors || []);

        const correctedWidth = bounds.width * CANVAS_ASPECT;
        const correctedHeight = bounds.height;

        // Check normal fit
        // bounds width/height are normalized (0-1 approx)
        const scaleX = containerSize.width / correctedWidth;
        const scaleY = containerSize.height / correctedHeight;
        const scaleNormal = Math.min(scaleX, scaleY);

        // Check rotated fit (90 deg)
        // New Width = Old Height
        // New Height = Old Width
        const scaleRotX = containerSize.width / correctedHeight;
        const scaleRotY = containerSize.height / correctedWidth;
        const scaleRotated = Math.min(scaleRotX, scaleRotY);

        let activeRotation = 0;

        // Auto-rotate if it gives significantly better scale (> 20% bigger)
        if (scaleRotated > scaleNormal * 1.2) {
            activeRotation = 90;
            setIsAutoRotated(true);
        } else {
            activeRotation = 0;
            setIsAutoRotated(false);
        }

        setRotation(activeRotation);

        // Re-calculate transform with chosen rotation
        let effectiveBoundsWidth, effectiveBoundsHeight, effectiveMinX, effectiveMinY;

        if (activeRotation === 90) {
            // (x, y) -> (1-y, x)
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
        );

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
        // rotation: 0 or 90
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

        const tx = (val) => val; // unused, kept for diff matching if needed
        const ty = (val) => val; // unused

        selectedFloor.elements?.forEach((element) => {
            const { type, points, style } = element;
            if (!points || points.length === 0) return;

            ctx.strokeStyle = style?.strokeColor || '#3b82f6';
            ctx.lineWidth = (style?.strokeWidth || 2) * (scale / 500); // Scale line width

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
                        // strokeRect needs top-left + w, h. 
                        // With rotation, x1/y1 might not be top-left.
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

    // Handle sensor click - navigate to box detail using NAME
    const handleSensorClick = useCallback((boxName) => {
        setActiveView(`box-${boxName}`);
    }, [setActiveView]);

    // No floor plans
    if (floorPlans.length === 0) {
        return (
            <div className="floor-plan-viewer">
                <div className="floor-plan-viewer-empty">
                    <MapIcon className="w-12 h-12" />
                    <h3>No Floor Plan Yet</h3>
                    <p>Create a floor plan to visualize your sensors in context.</p>
                    <Link to="/floor-plan">
                        <Plus className="w-4 h-4" />
                        Create Floor Plan
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="floor-plan-viewer">
            {/* Header */}
            <div className="floor-plan-viewer-header">
                <div className="floor-plan-viewer-title">
                    <MapIcon className="w-4 h-4" />
                    <span>{selectedPlan?.name || 'Floor Plan'}</span>
                </div>

                <div className="floor-plan-viewer-actions">
                    {/* Floor tabs */}
                    {selectedPlan?.floors?.length > 1 && (
                        <div className="viewer-floor-tabs">
                            {selectedPlan.floors.map((floor) => (
                                <button
                                    key={floor.id}
                                    className={`viewer-floor-tab ${selectedFloorId === floor.id ? 'active' : ''}`}
                                    onClick={() => setSelectedFloorId(floor.id)}
                                >
                                    {floor.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Edit button */}
                    <button
                        onClick={() => setRotation(r => r === 0 ? 90 : 0)}
                        className="floor-plan-action-btn"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                        title="Rotate View"
                    >
                        <RotateCw className="w-3 h-3" />
                    </button>
                    <Link
                        to={`/floor-plan/${selectedPlanId}`}
                        className="floor-plan-action-btn"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                    >
                        <Pencil className="w-3 h-3" />
                        Edit
                    </Link>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={setContainerRef}
                className="floor-plan-viewer-canvas"
                style={{ height }}
            >
                <canvas
                    ref={canvasRef}
                />

                {/* Sensors */}
                <div className="floor-plan-viewer-sensors">
                    <AnimatePresence>
                        {selectedFloor?.sensors?.map((sensor) => (
                            <ViewerSensor
                                key={sensor.id}
                                sensor={sensor}
                                sensorData={sensorData}
                                onSensorClick={handleSensorClick}
                                activeConnections={activeConnections}
                                viewTransform={viewTransform}
                                containerSize={containerSize}
                                rotation={rotation}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default FloorPlanViewer;
