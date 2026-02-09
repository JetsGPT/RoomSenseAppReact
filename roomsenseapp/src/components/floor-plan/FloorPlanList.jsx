/**
 * Floor Plan List Component
 * 
 * Modal displaying saved floor plans with options to open, edit, or delete.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { floorPlanHelpers as floorPlanAPI } from '../../services/floorPlanAPI';
import { useToast } from '../../hooks/use-toast';
import {
    X,
    FileText,
    Trash2,
    Clock,
    Plus,
    FolderOpen,
    FolderOpen,
    AlertTriangle,
    Star,
    Cloud,
    HardDrive,
} from 'lucide-react';

export function FloorPlanList({ onSelect, onClose }) {
    const { toast } = useToast();
    const [floorPlans, setFloorPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Load floor plans
    useEffect(() => {
        const loadPlans = async () => {
            setLoading(true);
            const plans = await floorPlanAPI.getAll();
            setFloorPlans(plans);
            setLoading(false);
        };
        loadPlans();
    }, []);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Handle delete
    const handleDelete = (id, e) => {
        e.stopPropagation();
        setDeleteConfirm(id);
    };

    const confirmDelete = async (id) => {
        await floorPlanAPI.delete(id);
        setFloorPlans(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
        toast({
            title: 'Deleted',
            description: 'Floor plan has been deleted.',
        });
    };

    return (
        <motion.div
            className="floor-plan-list-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="floor-plan-list-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <FolderOpen className="w-5 h-5" />
                        <h2>Open Floor Plan</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {loading ? (
                        <div className="modal-loading">
                            <div className="loading-spinner" />
                            <span>Loading floor plans...</span>
                        </div>
                    ) : floorPlans.length === 0 ? (
                        <div className="modal-empty">
                            <FileText className="w-12 h-12" />
                            <h3>No Floor Plans Yet</h3>
                            <p>Create your first floor plan to get started.</p>
                            <button
                                className="modal-create-btn"
                                onClick={onClose}
                            >
                                <Plus className="w-4 h-4" />
                                Create New
                            </button>
                        </div>
                    ) : (
                        <div className="floor-plan-grid">
                            {floorPlans.map((plan) => (
                                <motion.div
                                    key={plan.id}
                                    className="floor-plan-card"
                                    onClick={() => onSelect(plan.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Preview */}
                                    <div className="card-preview">
                                        <FloorPlanPreview elements={plan.elements} />
                                    </div>

                                    {/* Info */}
                                    <div className="card-info">
                                        <div className="flex items-center gap-2">
                                            <h4 className="card-name">{plan.name}</h4>
                                            {plan.isActive && (
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            )}
                                        </div>
                                        <div className="card-meta">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatDate(plan.updatedAt)}</span>
                                            {plan.source === 'cloud' ? (
                                                <Cloud className="w-3 h-3 text-blue-500" title="Saved to Cloud" />
                                            ) : (
                                                <HardDrive className="w-3 h-3 text-orange-500" title="Saved Locally" />
                                            )}
                                        </div>
                                        <div className="card-stats">
                                            <span>{plan.elements?.length || 0} elements</span>
                                            <span>{plan.sensors?.length || 0} sensors</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="card-actions">
                                        <button
                                            className="card-delete-btn"
                                            onClick={(e) => handleDelete(plan.id, e)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Delete Confirmation */}
                                    <AnimatePresence>
                                        {deleteConfirm === plan.id && (
                                            <motion.div
                                                className="delete-confirm-overlay"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="delete-confirm-content">
                                                    <AlertTriangle className="w-6 h-6" />
                                                    <p>Delete this floor plan?</p>
                                                    <div className="delete-confirm-actions">
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            className="confirm-delete"
                                                            onClick={() => confirmDelete(plan.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

/**
 * Mini preview of floor plan elements
 */
function FloorPlanPreview({ elements = [] }) {
    const canvasRef = React.useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'var(--primary, #3b82f6)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        elements.forEach((element) => {
            const { type, points } = element;
            if (!points || points.length === 0) return;

            ctx.beginPath();

            switch (type) {
                case 'freehand':
                    ctx.moveTo(points[0][0] * width, points[0][1] * height);
                    points.slice(1).forEach(([x, y]) => {
                        ctx.lineTo(x * width, y * height);
                    });
                    ctx.stroke();
                    break;

                case 'rectangle':
                    if (points.length >= 2) {
                        const x1 = points[0][0] * width;
                        const y1 = points[0][1] * height;
                        const x2 = points[1][0] * width;
                        const y2 = points[1][1] * height;
                        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    }
                    break;

                case 'line':
                    if (points.length >= 2) {
                        ctx.moveTo(points[0][0] * width, points[0][1] * height);
                        ctx.lineTo(points[1][0] * width, points[1][1] * height);
                        ctx.stroke();
                    }
                    break;

                default:
                    break;
            }
        });
    }, [elements]);

    return (
        <canvas
            ref={canvasRef}
            width={150}
            height={100}
            className="preview-canvas"
        />
    );
}

export default FloorPlanList;
