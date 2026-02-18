/**
 * Floor Plan Editor Page
 * 
 * Main page component for creating and editing floor plans.
 * Layout: Toolbar (left) | Canvas (center) | Sensor Palette (right)
 * Features: Multi-floor support, auto-save indicator
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FloorPlanProvider, useFloorPlan, AUTO_SAVE_STATUS } from '../contexts/FloorPlanContext';
import { FloorPlanCanvas } from '../components/floor-plan/FloorPlanCanvas';
import { DrawingToolbar } from '../components/floor-plan/DrawingToolbar';
import { SensorPalette } from '../components/floor-plan/SensorPalette';
import { FloorPlanList } from '../components/floor-plan/FloorPlanList';
import { FloorSelector } from '../components/floor-plan/FloorSelector';
import { useToast } from '../hooks/use-toast';
import {
    Save,
    FolderOpen,
    Plus,
    ChevronLeft,
    PanelRightOpen,
    PanelRightClose,
    Cloud,
    CloudOff,
    Check,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import '../styles/floorplan.css';

/**
 * Auto-save status indicator component
 */
function AutoSaveIndicator({ status, lastSaved }) {
    const getStatusInfo = () => {
        switch (status) {
            case AUTO_SAVE_STATUS.PENDING:
                return { icon: Cloud, text: 'Unsaved changes', className: 'pending' };
            case AUTO_SAVE_STATUS.SAVING:
                return { icon: Loader2, text: 'Saving...', className: 'saving' };
            case AUTO_SAVE_STATUS.SAVED:
                return { icon: Check, text: 'Saved', className: 'saved' };
            case AUTO_SAVE_STATUS.ERROR:
                return { icon: AlertCircle, text: 'Save failed', className: 'error' };
            default:
                return { icon: Cloud, text: '', className: 'idle' };
        }
    };

    const { icon: Icon, text, className } = getStatusInfo();

    // Format last saved time
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (status === AUTO_SAVE_STATUS.IDLE && !lastSaved) return null;

    return (
        <div className={`auto-save-indicator ${className}`}>
            <Icon className={`w-4 h-4 ${className === 'saving' ? 'animate-spin' : ''}`} />
            <span>{text}</span>
            {status === AUTO_SAVE_STATUS.SAVED && lastSaved && (
                <span className="auto-save-time">{formatTime(lastSaved)}</span>
            )}
        </div>
    );
}

/**
 * Inner component that uses the floor plan context
 */
function FloorPlanEditorContent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        name,
        setName,
        isDirty,
        isSaving,
        saveFloorPlan,
        loadFloorPlan,
        newFloorPlan,
        autoSaveStatus,
        lastSaved,
        isActive,
        setIsActive,
    } = useFloorPlan();

    const [showSensorPalette, setShowSensorPalette] = useState(true);
    const [showFloorPlanList, setShowFloorPlanList] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);

    // Load floor plan if ID is provided
    useEffect(() => {
        if (id) {
            loadFloorPlan(id).then(loaded => {
                if (!loaded) {
                    toast({
                        title: 'Floor Plan Not Found',
                        description: 'The requested floor plan could not be found.',
                        variant: 'destructive',
                    });
                    navigate('/floor-plan');
                }
            });
        }
    }, [id, loadFloorPlan, toast, navigate]);

    // Handle save
    const handleSave = useCallback(async () => {
        try {
            const saved = await saveFloorPlan();
            toast({
                title: 'Saved',
                description: 'Floor plan saved successfully.',
            });
            // Navigate to the saved plan's URL if it's a new plan
            if (!id && saved.id) {
                navigate(`/floor-plan/${saved.id}`, { replace: true });
            }
        } catch (error) {
            toast({
                title: 'Save Failed',
                description: 'Could not save the floor plan.',
                variant: 'destructive',
            });
        }
    }, [saveFloorPlan, toast, id, navigate]);

    // Handle new floor plan
    const handleNew = useCallback(() => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Create a new floor plan anyway?')) {
                return;
            }
        }
        newFloorPlan();
        navigate('/floor-plan');
    }, [isDirty, newFloorPlan, navigate]);

    // Handle open floor plan
    const handleOpen = useCallback((planId) => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Open another floor plan anyway?')) {
                return;
            }
        }
        setShowFloorPlanList(false);
        navigate(`/floor-plan/${planId}`);
    }, [isDirty, navigate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                setShowFloorPlanList(false);
                setIsEditingName(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    return (
        <div className="floor-plan-editor">
            {/* Header */}
            <header className="floor-plan-header">
                <div className="floor-plan-header-left">
                    <button
                        className="floor-plan-back-btn"
                        onClick={() => navigate('/dashboard')}
                        title="Back to Dashboard"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="floor-plan-title-container">
                        {isEditingName ? (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingName(false);
                                }}
                                className="floor-plan-title-input"
                                autoFocus
                            />
                        ) : (
                            <h1
                                className="floor-plan-title"
                                onClick={() => setIsEditingName(true)}
                                title="Click to rename"
                            >
                                {name}
                            </h1>
                        )}
                    </div>

                    {/* Auto-save indicator */}
                    <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                </div>

                <div className="floor-plan-header-actions">
                    <label className="flex items-center gap-2 mr-4 cursor-pointer" title="Set as active floor plan">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">Active Plan</span>
                    </label>

                    <button
                        className="floor-plan-action-btn"
                        onClick={handleNew}
                        title="New Floor Plan"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New</span>
                    </button>

                    <button
                        className="floor-plan-action-btn"
                        onClick={() => setShowFloorPlanList(true)}
                        title="Open Floor Plan"
                    >
                        <FolderOpen className="w-4 h-4" />
                        <span>Open</span>
                    </button>

                    <button
                        className={`floor-plan-action-btn primary ${isSaving ? 'saving' : ''}`}
                        onClick={handleSave}
                        disabled={isSaving}
                        title="Save (Ctrl+S)"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>

                    <button
                        className="floor-plan-toggle-btn"
                        onClick={() => setShowSensorPalette(!showSensorPalette)}
                        title={showSensorPalette ? 'Hide Sensor Palette' : 'Show Sensor Palette'}
                    >
                        {showSensorPalette ? (
                            <PanelRightClose className="w-5 h-5" />
                        ) : (
                            <PanelRightOpen className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </header>

            {/* Floor Selector Bar */}
            <FloorSelector />

            {/* Main Content */}
            <div className="floor-plan-content">
                {/* Drawing Toolbar */}
                <DrawingToolbar />

                {/* Canvas Area */}
                <div className="floor-plan-canvas-container">
                    <FloorPlanCanvas />
                </div>

                {/* Sensor Palette */}
                <AnimatePresence>
                    {showSensorPalette && (
                        <motion.div
                            className="floor-plan-sidebar"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SensorPalette />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floor Plan List Modal */}
            <AnimatePresence>
                {showFloorPlanList && (
                    <FloorPlanList
                        onSelect={handleOpen}
                        onClose={() => setShowFloorPlanList(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Floor Plan Editor with Context Provider
 */
export default function FloorPlanEditor() {
    return (
        <FloorPlanProvider>
            <FloorPlanEditorContent />
        </FloorPlanProvider>
    );
}
