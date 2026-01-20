/**
 * Drawing Toolbar Component
 * 
 * Tool selection and drawing controls for the floor plan editor.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useFloorPlan, TOOLS } from '../../contexts/FloorPlanContext';
import {
    MousePointer2,
    Pencil,
    Square,
    Minus,
    Eraser,
    Undo2,
    Redo2,
    Trash2,
    Palette,
} from 'lucide-react';

const TOOL_CONFIG = [
    { id: TOOLS.SELECT, icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: TOOLS.PEN, icon: Pencil, label: 'Pen', shortcut: 'P' },
    { id: TOOLS.RECTANGLE, icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: TOOLS.LINE, icon: Minus, label: 'Line', shortcut: 'L' },
    { id: TOOLS.ERASER, icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

const COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
    '#000000', // Black
];

export function DrawingToolbar() {
    const {
        selectedTool,
        setTool,
        currentStyle,
        setStyle,
        selectedElementId,
        removeElement,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useFloorPlan();

    const [showColorPicker, setShowColorPicker] = React.useState(false);

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'v':
                    setTool(TOOLS.SELECT);
                    break;
                case 'p':
                    setTool(TOOLS.PEN);
                    break;
                case 'r':
                    setTool(TOOLS.RECTANGLE);
                    break;
                case 'l':
                    setTool(TOOLS.LINE);
                    break;
                case 'e':
                    setTool(TOOLS.ERASER);
                    break;
                case 'z':
                    if (e.ctrlKey && e.shiftKey) {
                        redo();
                    } else if (e.ctrlKey) {
                        undo();
                    }
                    break;
                case 'y':
                    if (e.ctrlKey) {
                        redo();
                    }
                    break;
                case 'delete':
                case 'backspace':
                    if (selectedElementId) {
                        removeElement(selectedElementId);
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTool, undo, redo, selectedElementId, removeElement]);

    return (
        <div className="drawing-toolbar">
            {/* Tool Buttons */}
            <div className="toolbar-group">
                {TOOL_CONFIG.map(({ id, icon: Icon, label, shortcut }) => (
                    <motion.button
                        key={id}
                        className={`toolbar-btn ${selectedTool === id ? 'active' : ''}`}
                        onClick={() => setTool(id)}
                        title={`${label} (${shortcut})`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Icon className="w-5 h-5" />
                    </motion.button>
                ))}
            </div>

            {/* Separator */}
            <div className="toolbar-separator" />

            {/* Color Picker */}
            <div className="toolbar-group color-picker-group">
                <motion.button
                    className="toolbar-btn color-btn"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Stroke Color"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        '--current-color': currentStyle.strokeColor,
                    }}
                >
                    <Palette className="w-5 h-5" />
                    <span
                        className="color-indicator"
                        style={{ backgroundColor: currentStyle.strokeColor }}
                    />
                </motion.button>

                {showColorPicker && (
                    <motion.div
                        className="color-picker-dropdown"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <div className="color-grid">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${currentStyle.strokeColor === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setStyle({ strokeColor: color });
                                        setShowColorPicker(false);
                                    }}
                                />
                            ))}
                        </div>

                        <div className="stroke-width-control">
                            <label>Stroke Width</label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={currentStyle.strokeWidth}
                                onChange={(e) => setStyle({ strokeWidth: parseInt(e.target.value) })}
                            />
                            <span>{currentStyle.strokeWidth}px</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Separator */}
            <div className="toolbar-separator" />

            {/* History Buttons */}
            <div className="toolbar-group">
                <motion.button
                    className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`}
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    whileHover={canUndo ? { scale: 1.05 } : {}}
                    whileTap={canUndo ? { scale: 0.95 } : {}}
                >
                    <Undo2 className="w-5 h-5" />
                </motion.button>

                <motion.button
                    className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`}
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                    whileHover={canRedo ? { scale: 1.05 } : {}}
                    whileTap={canRedo ? { scale: 0.95 } : {}}
                >
                    <Redo2 className="w-5 h-5" />
                </motion.button>
            </div>

            {/* Separator */}
            <div className="toolbar-separator" />

            {/* Delete Button */}
            <div className="toolbar-group">
                <motion.button
                    className={`toolbar-btn delete-btn ${!selectedElementId ? 'disabled' : ''}`}
                    onClick={() => selectedElementId && removeElement(selectedElementId)}
                    disabled={!selectedElementId}
                    title="Delete Selected (Delete)"
                    whileHover={selectedElementId ? { scale: 1.05 } : {}}
                    whileTap={selectedElementId ? { scale: 0.95 } : {}}
                >
                    <Trash2 className="w-5 h-5" />
                </motion.button>
            </div>
        </div>
    );
}

export default DrawingToolbar;
