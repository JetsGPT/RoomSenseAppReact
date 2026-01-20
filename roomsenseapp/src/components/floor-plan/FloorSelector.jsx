/**
 * Floor Selector Component
 * 
 * Tab-style floor selector with add/rename/delete options.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFloorPlan } from '../../contexts/FloorPlanContext';
import {
    Plus,
    X,
    MoreVertical,
    Pencil,
    Trash2,
    Layers,
    Check,
} from 'lucide-react';

export function FloorSelector() {
    const {
        floors,
        activeFloorId,
        setActiveFloor,
        addFloor,
        removeFloor,
        renameFloor
    } = useFloorPlan();

    const [editingFloorId, setEditingFloorId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null);

    const handleStartEdit = (floor) => {
        setEditingFloorId(floor.id);
        setEditingName(floor.name);
        setMenuOpenId(null);
    };

    const handleSaveEdit = () => {
        if (editingFloorId && editingName.trim()) {
            renameFloor(editingFloorId, editingName.trim());
        }
        setEditingFloorId(null);
        setEditingName('');
    };

    const handleCancelEdit = () => {
        setEditingFloorId(null);
        setEditingName('');
    };

    const handleAddFloor = () => {
        addFloor(`Floor ${floors.length + 1}`);
    };

    const handleDeleteFloor = (id) => {
        if (floors.length > 1) {
            removeFloor(id);
        }
        setMenuOpenId(null);
    };

    return (
        <div className="floor-selector">
            <div className="floor-selector-header">
                <Layers className="w-4 h-4" />
                <span>Floors</span>
            </div>

            <div className="floor-tabs">
                {floors.map((floor, index) => (
                    <motion.div
                        key={floor.id}
                        className={`floor-tab ${activeFloorId === floor.id ? 'active' : ''}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        {editingFloorId === floor.id ? (
                            <div className="floor-tab-edit">
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    onBlur={handleSaveEdit}
                                    autoFocus
                                    className="floor-tab-input"
                                />
                                <button onClick={handleSaveEdit} className="floor-tab-save">
                                    <Check className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    className="floor-tab-btn"
                                    onClick={() => setActiveFloor(floor.id)}
                                >
                                    <span className="floor-tab-name">{floor.name}</span>
                                    <span className="floor-tab-count">
                                        {floor.elements.length + floor.sensors.length}
                                    </span>
                                </button>

                                <div className="floor-tab-menu">
                                    <button
                                        className="floor-menu-trigger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpenId(menuOpenId === floor.id ? null : floor.id);
                                        }}
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </button>

                                    <AnimatePresence>
                                        {menuOpenId === floor.id && (
                                            <motion.div
                                                className="floor-menu-dropdown"
                                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    className="floor-menu-item"
                                                    onClick={() => handleStartEdit(floor)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    <span>Rename</span>
                                                </button>

                                                {floors.length > 1 && (
                                                    <button
                                                        className="floor-menu-item danger"
                                                        onClick={() => handleDeleteFloor(floor.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        <span>Delete</span>
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </motion.div>
                ))}

                {/* Add Floor Button */}
                <motion.button
                    className="floor-tab add-floor"
                    onClick={handleAddFloor}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Add Floor"
                >
                    <Plus className="w-4 h-4" />
                </motion.button>
            </div>
        </div>
    );
}

export default FloorSelector;
