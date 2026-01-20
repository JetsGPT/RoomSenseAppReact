/**
 * Floor Plan Canvas Component
 * 
 * Interactive HTML5 Canvas for drawing floor plans and placing sensors.
 * Uses normalized coordinates (0-1) for responsive scaling.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloorPlan, TOOLS, ELEMENT_TYPES } from '../../contexts/FloorPlanContext';
import { PlacedSensor } from './PlacedSensor';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function FloorPlanCanvas() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const {
        elements,
        currentElement,
        sensors,
        selectedTool,
        selectedElementId,
        selectedSensorId,
        zoom,
        panX,
        panY,
        currentStyle,
        isDrawing,
        startDrawing,
        updateDrawing,
        endDrawing,
        selectElement,
        selectSensor,
        clearSelection,
        updateElement,
        moveSensor,
        setZoom,
        setPan,
        placeSensor,
    } = useFloorPlan();

    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [dragState, setDragState] = useState(null);

    // Resize observer for responsive canvas
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setCanvasSize({
                    width: Math.floor(width),
                    height: Math.floor(height)
                });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // Convert screen coordinates to normalized (0-1) coordinates
    const screenToNormalized = useCallback((screenX, screenY) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (screenX - rect.left - panX) / (canvasSize.width * zoom);
        const y = (screenY - rect.top - panY) / (canvasSize.height * zoom);

        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }, [canvasSize, zoom, panX, panY]);

    // Convert normalized coordinates to screen coordinates
    const normalizedToScreen = useCallback((normX, normY) => {
        return {
            x: normX * canvasSize.width * zoom + panX,
            y: normY * canvasSize.height * zoom + panY,
        };
    }, [canvasSize, zoom, panX, panY]);

    // Draw all elements on canvas
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        drawGrid(ctx);

        // Apply transformations
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // Draw all elements
        [...elements, currentElement].filter(Boolean).forEach((element) => {
            drawElement(ctx, element, element.id === selectedElementId);
        });

        ctx.restore();
    }, [elements, currentElement, selectedElementId, zoom, panX, panY, canvasSize]);

    // Draw grid pattern
    const drawGrid = (ctx) => {
        const gridSize = 20 * zoom;
        const offsetX = panX % gridSize;
        const offsetY = panY % gridSize;

        ctx.strokeStyle = 'var(--border, #e5e7eb)';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;

        // Vertical lines
        for (let x = offsetX; x < canvasSize.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasSize.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = offsetY; y < canvasSize.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasSize.width, y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    };

    // Draw individual element
    const drawElement = (ctx, element, isSelected) => {
        const { type, points, style } = element;
        if (!points || points.length === 0) return;

        ctx.strokeStyle = style?.strokeColor || currentStyle.strokeColor;
        ctx.lineWidth = (style?.strokeWidth || currentStyle.strokeWidth) / zoom;
        ctx.fillStyle = style?.fillColor || 'transparent';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Highlight selected element
        if (isSelected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = (ctx.lineWidth + 1);
        }

        ctx.beginPath();

        switch (type) {
            case ELEMENT_TYPES.FREEHAND:
                if (points.length > 0) {
                    ctx.moveTo(
                        points[0][0] * canvasSize.width,
                        points[0][1] * canvasSize.height
                    );
                    points.slice(1).forEach(([x, y]) => {
                        ctx.lineTo(x * canvasSize.width, y * canvasSize.height);
                    });
                }
                ctx.stroke();
                break;

            case ELEMENT_TYPES.RECTANGLE:
                if (points.length >= 2) {
                    const x1 = points[0][0] * canvasSize.width;
                    const y1 = points[0][1] * canvasSize.height;
                    const x2 = points[1][0] * canvasSize.width;
                    const y2 = points[1][1] * canvasSize.height;
                    ctx.rect(x1, y1, x2 - x1, y2 - y1);
                    if (style?.fillColor && style.fillColor !== 'transparent') {
                        ctx.fill();
                    }
                    ctx.stroke();
                }
                break;

            case ELEMENT_TYPES.LINE:
                if (points.length >= 2) {
                    ctx.moveTo(
                        points[0][0] * canvasSize.width,
                        points[0][1] * canvasSize.height
                    );
                    ctx.lineTo(
                        points[1][0] * canvasSize.width,
                        points[1][1] * canvasSize.height
                    );
                    ctx.stroke();
                }
                break;

            default:
                break;
        }
    };

    // Redraw on state changes
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Mouse event handlers
    const handleMouseDown = (e) => {
        const { x, y } = screenToNormalized(e.clientX, e.clientY);

        // Middle mouse button for panning
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
            return;
        }

        // Right click - do nothing for now
        if (e.button === 2) return;

        switch (selectedTool) {
            case TOOLS.SELECT:
                // Check if clicking on an element (simple hit detection)
                const clickedElement = findElementAt(x, y);
                if (clickedElement) {
                    selectElement(clickedElement.id);
                    setDragState({ type: 'element', id: clickedElement.id, startX: x, startY: y });
                } else {
                    clearSelection();
                    // Start panning with left mouse + select tool
                    setIsPanning(true);
                    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
                }
                break;

            case TOOLS.PEN:
                startDrawing({
                    type: ELEMENT_TYPES.FREEHAND,
                    points: [[x, y]],
                    style: { ...currentStyle },
                });
                break;

            case TOOLS.RECTANGLE:
                startDrawing({
                    type: ELEMENT_TYPES.RECTANGLE,
                    points: [[x, y], [x, y]],
                    style: { ...currentStyle },
                });
                break;

            case TOOLS.LINE:
                startDrawing({
                    type: ELEMENT_TYPES.LINE,
                    points: [[x, y], [x, y]],
                    style: { ...currentStyle },
                });
                break;

            default:
                break;
        }
    };

    const handleMouseMove = (e) => {
        // Handle panning
        if (isPanning) {
            setPan(e.clientX - panStart.x, e.clientY - panStart.y);
            return;
        }

        const { x, y } = screenToNormalized(e.clientX, e.clientY);

        // Handle element dragging
        if (dragState?.type === 'element') {
            // Move element (simplified - would need proper offset handling)
            return;
        }

        // Handle drawing
        if (isDrawing && currentElement) {
            switch (selectedTool) {
                case TOOLS.PEN:
                    updateDrawing({
                        ...currentElement,
                        points: [...currentElement.points, [x, y]],
                    });
                    break;

                case TOOLS.RECTANGLE:
                case TOOLS.LINE:
                    updateDrawing({
                        ...currentElement,
                        points: [currentElement.points[0], [x, y]],
                    });
                    break;

                default:
                    break;
            }
        }
    };

    const handleMouseUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (dragState) {
            setDragState(null);
        }

        if (isDrawing) {
            endDrawing();
        }
    };

    // Find element at coordinates (simple bounding box check)
    const findElementAt = (x, y) => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];
            if (isPointInElement(x, y, element)) {
                return element;
            }
        }
        return null;
    };

    // Simple hit detection
    const isPointInElement = (x, y, element) => {
        const { type, points } = element;
        if (!points || points.length === 0) return false;

        const threshold = 0.02; // 2% of canvas size

        switch (type) {
            case ELEMENT_TYPES.RECTANGLE:
                if (points.length >= 2) {
                    const minX = Math.min(points[0][0], points[1][0]);
                    const maxX = Math.max(points[0][0], points[1][0]);
                    const minY = Math.min(points[0][1], points[1][1]);
                    const maxY = Math.max(points[0][1], points[1][1]);
                    return x >= minX && x <= maxX && y >= minY && y <= maxY;
                }
                break;

            case ELEMENT_TYPES.FREEHAND:
            case ELEMENT_TYPES.LINE:
                // Check if point is near any line segment
                for (let i = 0; i < points.length - 1; i++) {
                    const dist = pointToLineDistance(
                        x, y,
                        points[i][0], points[i][1],
                        points[i + 1][0], points[i + 1][1]
                    );
                    if (dist < threshold) return true;
                }
                break;
        }

        return false;
    };

    // Calculate distance from point to line segment
    const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    };

    // Wheel zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
    };

    // Handle sensor drop
    const handleDrop = (e) => {
        e.preventDefault();
        const sensorBoxId = e.dataTransfer.getData('sensorBoxId');
        if (!sensorBoxId) return;

        const { x, y } = screenToNormalized(e.clientX, e.clientY);
        placeSensor(sensorBoxId, { x, y });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Zoom controls
    const handleZoomIn = () => setZoom(zoom + 0.25);
    const handleZoomOut = () => setZoom(zoom - 0.25);
    const handleResetView = () => {
        setZoom(1);
        setPan(0, 0);
    };

    return (
        <div
            ref={containerRef}
            className="floor-plan-canvas-wrapper"
            onWheel={handleWheel}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="floor-plan-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
            />

            {/* Placed Sensors Overlay */}
            <div className="floor-plan-sensors-layer">
                {sensors.map((sensor) => (
                    <PlacedSensor
                        key={sensor.id}
                        sensor={sensor}
                        position={normalizedToScreen(sensor.position.x, sensor.position.y)}
                        isSelected={selectedSensorId === sensor.id}
                        onSelect={() => selectSensor(sensor.id)}
                        onMove={(newPos) => {
                            const normalized = screenToNormalized(newPos.x, newPos.y);
                            moveSensor(sensor.id, normalized);
                        }}
                    />
                ))}
            </div>

            {/* Zoom Controls */}
            <div className="floor-plan-zoom-controls">
                <button onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={handleResetView} title="Reset View">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default FloorPlanCanvas;
