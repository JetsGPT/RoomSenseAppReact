/**
 * Floor Plan Context
 * 
 * Global state management for the floor plan editor.
 * Manages drawing elements, sensor placements, multi-floor support, and auto-save.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { floorPlanStorage } from '../services/floorPlanAPI';

// ============================================================================
// Types & Constants
// ============================================================================

export const TOOLS = {
    SELECT: 'select',
    PEN: 'pen',
    RECTANGLE: 'rectangle',
    LINE: 'line',
    ERASER: 'eraser',
};

export const ELEMENT_TYPES = {
    FREEHAND: 'freehand',
    RECTANGLE: 'rectangle',
    LINE: 'line',
    POLYGON: 'polygon',
};

export const AUTO_SAVE_STATUS = {
    IDLE: 'idle',
    PENDING: 'pending',
    SAVING: 'saving',
    SAVED: 'saved',
    ERROR: 'error',
};

const DEFAULT_STYLE = {
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    fillColor: 'transparent',
};

const DEFAULT_FLOOR = {
    id: crypto.randomUUID(),
    name: 'Ground Floor',
    elements: [],
    sensors: [],
};

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
    // Floor plan metadata
    id: null,
    name: 'Untitled Floor Plan',

    // Multi-floor support
    floors: [{ ...DEFAULT_FLOOR, id: crypto.randomUUID() }],
    activeFloorId: null, // Will be set on init

    // Editor state
    selectedTool: TOOLS.SELECT,
    selectedElementId: null,
    selectedSensorId: null,

    // View settings
    zoom: 1,
    panX: 0,
    panY: 0,

    // Drawing state
    isDrawing: false,
    currentElement: null,

    // Style settings
    currentStyle: DEFAULT_STYLE,

    // History for undo/redo
    history: [],
    historyIndex: -1,

    // Status
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    autoSaveStatus: AUTO_SAVE_STATUS.IDLE,
    autoSaveEnabled: true,
};

// Initialize activeFloorId
initialState.activeFloorId = initialState.floors[0]?.id;

// ============================================================================
// Reducer Actions
// ============================================================================

const ACTION_TYPES = {
    SET_FLOOR_PLAN: 'SET_FLOOR_PLAN',
    SET_NAME: 'SET_NAME',
    SET_TOOL: 'SET_TOOL',
    SET_STYLE: 'SET_STYLE',

    // Floor actions
    ADD_FLOOR: 'ADD_FLOOR',
    REMOVE_FLOOR: 'REMOVE_FLOOR',
    RENAME_FLOOR: 'RENAME_FLOOR',
    SET_ACTIVE_FLOOR: 'SET_ACTIVE_FLOOR',

    // Element actions
    ADD_ELEMENT: 'ADD_ELEMENT',
    UPDATE_ELEMENT: 'UPDATE_ELEMENT',
    REMOVE_ELEMENT: 'REMOVE_ELEMENT',
    SELECT_ELEMENT: 'SELECT_ELEMENT',
    CLEAR_SELECTION: 'CLEAR_SELECTION',

    // Sensor actions
    PLACE_SENSOR: 'PLACE_SENSOR',
    MOVE_SENSOR: 'MOVE_SENSOR',
    REMOVE_SENSOR: 'REMOVE_SENSOR',
    SELECT_SENSOR: 'SELECT_SENSOR',

    // Drawing state
    START_DRAWING: 'START_DRAWING',
    UPDATE_DRAWING: 'UPDATE_DRAWING',
    END_DRAWING: 'END_DRAWING',

    // View actions
    SET_ZOOM: 'SET_ZOOM',
    SET_PAN: 'SET_PAN',

    // History actions
    UNDO: 'UNDO',
    REDO: 'REDO',
    SAVE_HISTORY: 'SAVE_HISTORY',

    // Status actions
    SET_SAVING: 'SET_SAVING',
    SET_SAVED: 'SET_SAVED',
    SET_AUTO_SAVE_STATUS: 'SET_AUTO_SAVE_STATUS',
    SET_AUTO_SAVE_ENABLED: 'SET_AUTO_SAVE_ENABLED',
    RESET: 'RESET',
};

// Helper to get current floor
const getActiveFloor = (state) => {
    return state.floors.find(f => f.id === state.activeFloorId) || state.floors[0];
};

// Helper to update active floor
const updateActiveFloor = (state, updates) => {
    return {
        ...state,
        floors: state.floors.map(f =>
            f.id === state.activeFloorId ? { ...f, ...updates } : f
        ),
        isDirty: true,
    };
};

function floorPlanReducer(state, action) {
    switch (action.type) {
        case ACTION_TYPES.SET_FLOOR_PLAN:
            return {
                ...state,
                ...action.payload,
                activeFloorId: action.payload.activeFloorId || action.payload.floors?.[0]?.id || state.activeFloorId,
                isDirty: false,
                autoSaveStatus: AUTO_SAVE_STATUS.IDLE,
            };

        case ACTION_TYPES.SET_NAME:
            return {
                ...state,
                name: action.payload,
                isDirty: true,
            };

        case ACTION_TYPES.SET_TOOL:
            return {
                ...state,
                selectedTool: action.payload,
                selectedElementId: null,
                selectedSensorId: null,
            };

        case ACTION_TYPES.SET_STYLE:
            return {
                ...state,
                currentStyle: { ...state.currentStyle, ...action.payload },
            };

        // Floor actions
        case ACTION_TYPES.ADD_FLOOR: {
            const newFloor = {
                id: crypto.randomUUID(),
                name: action.payload || `Floor ${state.floors.length + 1}`,
                elements: [],
                sensors: [],
            };
            return {
                ...state,
                floors: [...state.floors, newFloor],
                activeFloorId: newFloor.id,
                isDirty: true,
            };
        }

        case ACTION_TYPES.REMOVE_FLOOR: {
            if (state.floors.length <= 1) return state; // Keep at least one floor
            const newFloors = state.floors.filter(f => f.id !== action.payload);
            const newActiveId = state.activeFloorId === action.payload
                ? newFloors[0].id
                : state.activeFloorId;
            return {
                ...state,
                floors: newFloors,
                activeFloorId: newActiveId,
                isDirty: true,
            };
        }

        case ACTION_TYPES.RENAME_FLOOR:
            return {
                ...state,
                floors: state.floors.map(f =>
                    f.id === action.payload.id ? { ...f, name: action.payload.name } : f
                ),
                isDirty: true,
            };

        case ACTION_TYPES.SET_ACTIVE_FLOOR:
            return {
                ...state,
                activeFloorId: action.payload,
                selectedElementId: null,
                selectedSensorId: null,
            };

        // Element actions (operate on active floor)
        case ACTION_TYPES.ADD_ELEMENT: {
            const activeFloor = getActiveFloor(state);
            return updateActiveFloor(state, {
                elements: [...activeFloor.elements, action.payload],
            });
        }

        case ACTION_TYPES.UPDATE_ELEMENT: {
            const activeFloor = getActiveFloor(state);
            return updateActiveFloor(state, {
                elements: activeFloor.elements.map(el =>
                    el.id === action.payload.id ? { ...el, ...action.payload } : el
                ),
            });
        }

        case ACTION_TYPES.REMOVE_ELEMENT: {
            const activeFloor = getActiveFloor(state);
            return {
                ...updateActiveFloor(state, {
                    elements: activeFloor.elements.filter(el => el.id !== action.payload),
                }),
                selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId,
            };
        }

        case ACTION_TYPES.SELECT_ELEMENT:
            return {
                ...state,
                selectedElementId: action.payload,
                selectedSensorId: null,
            };

        case ACTION_TYPES.CLEAR_SELECTION:
            return {
                ...state,
                selectedElementId: null,
                selectedSensorId: null,
            };

        // Sensor actions (operate on active floor)
        case ACTION_TYPES.PLACE_SENSOR: {
            const activeFloor = getActiveFloor(state);
            return updateActiveFloor(state, {
                sensors: [...activeFloor.sensors, action.payload],
            });
        }

        case ACTION_TYPES.MOVE_SENSOR: {
            const activeFloor = getActiveFloor(state);
            return updateActiveFloor(state, {
                sensors: activeFloor.sensors.map(s =>
                    s.id === action.payload.id ? { ...s, position: action.payload.position } : s
                ),
            });
        }

        case ACTION_TYPES.REMOVE_SENSOR: {
            const activeFloor = getActiveFloor(state);
            return {
                ...updateActiveFloor(state, {
                    sensors: activeFloor.sensors.filter(s => s.id !== action.payload),
                }),
                selectedSensorId: state.selectedSensorId === action.payload ? null : state.selectedSensorId,
            };
        }

        case ACTION_TYPES.SELECT_SENSOR:
            return {
                ...state,
                selectedSensorId: action.payload,
                selectedElementId: null,
            };

        // Drawing state
        case ACTION_TYPES.START_DRAWING:
            return {
                ...state,
                isDrawing: true,
                currentElement: action.payload,
            };

        case ACTION_TYPES.UPDATE_DRAWING:
            return {
                ...state,
                currentElement: action.payload,
            };

        case ACTION_TYPES.END_DRAWING:
            return {
                ...state,
                isDrawing: false,
                currentElement: null,
            };

        // View actions
        case ACTION_TYPES.SET_ZOOM:
            return {
                ...state,
                zoom: Math.max(0.1, Math.min(5, action.payload)),
            };

        case ACTION_TYPES.SET_PAN:
            return {
                ...state,
                panX: action.payload.x,
                panY: action.payload.y,
            };

        // History actions
        case ACTION_TYPES.SAVE_HISTORY: {
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push({
                floors: JSON.parse(JSON.stringify(state.floors)),
            });
            return {
                ...state,
                history: newHistory.slice(-50),
                historyIndex: Math.min(newHistory.length - 1, 49),
            };
        }

        case ACTION_TYPES.UNDO: {
            if (state.historyIndex <= 0) return state;
            const prevState = state.history[state.historyIndex - 1];
            return {
                ...state,
                floors: prevState.floors,
                historyIndex: state.historyIndex - 1,
                isDirty: true,
            };
        }

        case ACTION_TYPES.REDO: {
            if (state.historyIndex >= state.history.length - 1) return state;
            const nextState = state.history[state.historyIndex + 1];
            return {
                ...state,
                floors: nextState.floors,
                historyIndex: state.historyIndex + 1,
                isDirty: true,
            };
        }

        // Status actions
        case ACTION_TYPES.SET_SAVING:
            return {
                ...state,
                isSaving: action.payload,
                autoSaveStatus: action.payload ? AUTO_SAVE_STATUS.SAVING : state.autoSaveStatus,
            };

        case ACTION_TYPES.SET_SAVED:
            return {
                ...state,
                isSaving: false,
                isDirty: false,
                lastSaved: new Date().toISOString(),
                autoSaveStatus: AUTO_SAVE_STATUS.SAVED,
            };

        case ACTION_TYPES.SET_AUTO_SAVE_STATUS:
            return {
                ...state,
                autoSaveStatus: action.payload,
            };

        case ACTION_TYPES.SET_AUTO_SAVE_ENABLED:
            return {
                ...state,
                autoSaveEnabled: action.payload,
            };

        case ACTION_TYPES.RESET: {
            const newFloorId = crypto.randomUUID();
            return {
                ...initialState,
                floors: [{ ...DEFAULT_FLOOR, id: newFloorId }],
                activeFloorId: newFloorId,
            };
        }

        default:
            return state;
    }
}

// ============================================================================
// Context
// ============================================================================

const FloorPlanContext = createContext(null);

export function FloorPlanProvider({ children }) {
    const [state, dispatch] = useReducer(floorPlanReducer, initialState);
    const autoSaveTimeoutRef = useRef(null);
    const lastSaveDataRef = useRef(null);

    // ========================================================================
    // Auto-Save Effect
    // ========================================================================

    useEffect(() => {
        // Skip if auto-save is disabled, not dirty, or no ID yet
        if (!state.autoSaveEnabled || !state.isDirty || !state.id) {
            return;
        }

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set pending status
        dispatch({ type: ACTION_TYPES.SET_AUTO_SAVE_STATUS, payload: AUTO_SAVE_STATUS.PENDING });

        // Debounce save for 2 seconds
        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                dispatch({ type: ACTION_TYPES.SET_SAVING, payload: true });

                const floorPlanData = {
                    id: state.id,
                    name: state.name,
                    floors: state.floors,
                    viewSettings: {
                        zoom: state.zoom,
                        panX: state.panX,
                        panY: state.panY,
                    },
                };

                // Only save if data actually changed
                const dataString = JSON.stringify(floorPlanData);
                if (dataString !== lastSaveDataRef.current) {
                    floorPlanStorage.save(floorPlanData);
                    lastSaveDataRef.current = dataString;
                }

                dispatch({ type: ACTION_TYPES.SET_SAVED });
            } catch (error) {
                console.error('Auto-save failed:', error);
                dispatch({ type: ACTION_TYPES.SET_AUTO_SAVE_STATUS, payload: AUTO_SAVE_STATUS.ERROR });
                dispatch({ type: ACTION_TYPES.SET_SAVING, payload: false });
            }
        }, 2000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [state.isDirty, state.id, state.name, state.floors, state.zoom, state.panX, state.panY, state.autoSaveEnabled]);

    // ========================================================================
    // Actions
    // ========================================================================

    const setTool = useCallback((tool) => {
        dispatch({ type: ACTION_TYPES.SET_TOOL, payload: tool });
    }, []);

    const setStyle = useCallback((style) => {
        dispatch({ type: ACTION_TYPES.SET_STYLE, payload: style });
    }, []);

    const setName = useCallback((name) => {
        dispatch({ type: ACTION_TYPES.SET_NAME, payload: name });
    }, []);

    // Floor actions
    const addFloor = useCallback((name) => {
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.ADD_FLOOR, payload: name });
    }, []);

    const removeFloor = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.REMOVE_FLOOR, payload: id });
    }, []);

    const renameFloor = useCallback((id, name) => {
        dispatch({ type: ACTION_TYPES.RENAME_FLOOR, payload: { id, name } });
    }, []);

    const setActiveFloor = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SET_ACTIVE_FLOOR, payload: id });
    }, []);

    // Element actions
    const addElement = useCallback((element) => {
        const newElement = {
            ...element,
            id: element.id || crypto.randomUUID(),
        };
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.ADD_ELEMENT, payload: newElement });
        return newElement;
    }, []);

    const updateElement = useCallback((id, updates) => {
        dispatch({ type: ACTION_TYPES.UPDATE_ELEMENT, payload: { id, ...updates } });
    }, []);

    const removeElement = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.REMOVE_ELEMENT, payload: id });
    }, []);

    const selectElement = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SELECT_ELEMENT, payload: id });
    }, []);

    const clearSelection = useCallback(() => {
        dispatch({ type: ACTION_TYPES.CLEAR_SELECTION });
    }, []);

    // Sensor actions
    const placeSensor = useCallback((sensorBoxId, position, label = '') => {
        const sensor = {
            id: crypto.randomUUID(),
            sensorBoxId,
            position,
            label,
        };
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.PLACE_SENSOR, payload: sensor });
        return sensor;
    }, []);

    const moveSensor = useCallback((id, position) => {
        dispatch({ type: ACTION_TYPES.MOVE_SENSOR, payload: { id, position } });
    }, []);

    const removeSensor = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SAVE_HISTORY });
        dispatch({ type: ACTION_TYPES.REMOVE_SENSOR, payload: id });
    }, []);

    const selectSensor = useCallback((id) => {
        dispatch({ type: ACTION_TYPES.SELECT_SENSOR, payload: id });
    }, []);

    // Drawing actions
    const startDrawing = useCallback((element) => {
        dispatch({ type: ACTION_TYPES.START_DRAWING, payload: element });
    }, []);

    const updateDrawing = useCallback((element) => {
        dispatch({ type: ACTION_TYPES.UPDATE_DRAWING, payload: element });
    }, []);

    const endDrawing = useCallback(() => {
        if (state.currentElement) {
            addElement(state.currentElement);
        }
        dispatch({ type: ACTION_TYPES.END_DRAWING });
    }, [state.currentElement, addElement]);

    // View actions
    const setZoom = useCallback((zoom) => {
        dispatch({ type: ACTION_TYPES.SET_ZOOM, payload: zoom });
    }, []);

    const setPan = useCallback((x, y) => {
        dispatch({ type: ACTION_TYPES.SET_PAN, payload: { x, y } });
    }, []);

    // History actions
    const undo = useCallback(() => {
        dispatch({ type: ACTION_TYPES.UNDO });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: ACTION_TYPES.REDO });
    }, []);

    // Auto-save control
    const setAutoSaveEnabled = useCallback((enabled) => {
        dispatch({ type: ACTION_TYPES.SET_AUTO_SAVE_ENABLED, payload: enabled });
    }, []);

    // Persistence actions
    const saveFloorPlan = useCallback(async () => {
        dispatch({ type: ACTION_TYPES.SET_SAVING, payload: true });

        try {
            const floorPlanData = {
                id: state.id,
                name: state.name,
                floors: state.floors,
                viewSettings: {
                    zoom: state.zoom,
                    panX: state.panX,
                    panY: state.panY,
                },
            };

            const saved = floorPlanStorage.save(floorPlanData);
            lastSaveDataRef.current = JSON.stringify(floorPlanData);

            dispatch({ type: ACTION_TYPES.SET_FLOOR_PLAN, payload: { id: saved.id } });
            dispatch({ type: ACTION_TYPES.SET_SAVED });

            return saved;
        } catch (error) {
            console.error('Failed to save floor plan:', error);
            dispatch({ type: ACTION_TYPES.SET_SAVING, payload: false });
            throw error;
        }
    }, [state.id, state.name, state.floors, state.zoom, state.panX, state.panY]);

    const loadFloorPlan = useCallback((id) => {
        const floorPlan = floorPlanStorage.getById(id);
        if (floorPlan) {
            // Migrate old format (elements/sensors at root) to new format (floors array)
            let floors = floorPlan.floors;
            if (!floors || floors.length === 0) {
                floors = [{
                    id: crypto.randomUUID(),
                    name: 'Ground Floor',
                    elements: floorPlan.elements || [],
                    sensors: floorPlan.sensors || [],
                }];
            }

            dispatch({
                type: ACTION_TYPES.SET_FLOOR_PLAN,
                payload: {
                    id: floorPlan.id,
                    name: floorPlan.name,
                    floors,
                    zoom: floorPlan.viewSettings?.zoom || 1,
                    panX: floorPlan.viewSettings?.panX || 0,
                    panY: floorPlan.viewSettings?.panY || 0,
                },
            });
            lastSaveDataRef.current = JSON.stringify(floorPlan);
            return floorPlan;
        }
        return null;
    }, []);

    const newFloorPlan = useCallback(() => {
        lastSaveDataRef.current = null;
        dispatch({ type: ACTION_TYPES.RESET });
    }, []);

    // ========================================================================
    // Computed Values
    // ========================================================================

    // Get current floor's elements and sensors
    const activeFloor = useMemo(() => getActiveFloor(state), [state.floors, state.activeFloorId]);
    const elements = activeFloor?.elements || [];
    const sensors = activeFloor?.sensors || [];

    // Get all sensors across all floors (for overview)
    const allSensors = useMemo(() => {
        return state.floors.flatMap(f => f.sensors.map(s => ({ ...s, floorId: f.id, floorName: f.name })));
    }, [state.floors]);

    // ========================================================================
    // Context Value
    // ========================================================================

    const value = useMemo(() => ({
        // State
        id: state.id,
        name: state.name,
        floors: state.floors,
        activeFloorId: state.activeFloorId,
        activeFloor,
        elements,
        sensors,
        allSensors,
        selectedTool: state.selectedTool,
        selectedElementId: state.selectedElementId,
        selectedSensorId: state.selectedSensorId,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        isDrawing: state.isDrawing,
        currentElement: state.currentElement,
        currentStyle: state.currentStyle,
        isDirty: state.isDirty,
        isSaving: state.isSaving,
        lastSaved: state.lastSaved,
        autoSaveStatus: state.autoSaveStatus,
        autoSaveEnabled: state.autoSaveEnabled,

        // Tool actions
        setTool,
        setStyle,
        setName,

        // Floor actions
        addFloor,
        removeFloor,
        renameFloor,
        setActiveFloor,

        // Element actions
        addElement,
        updateElement,
        removeElement,
        selectElement,
        clearSelection,

        // Sensor actions
        placeSensor,
        moveSensor,
        removeSensor,
        selectSensor,

        // Drawing actions
        startDrawing,
        updateDrawing,
        endDrawing,

        // View actions
        setZoom,
        setPan,

        // History actions
        undo,
        redo,
        canUndo: state.historyIndex > 0,
        canRedo: state.historyIndex < state.history.length - 1,

        // Auto-save
        setAutoSaveEnabled,

        // Persistence actions
        saveFloorPlan,
        loadFloorPlan,
        newFloorPlan,
    }), [
        state, activeFloor, elements, sensors, allSensors,
        setTool, setStyle, setName,
        addFloor, removeFloor, renameFloor, setActiveFloor,
        addElement, updateElement, removeElement, selectElement, clearSelection,
        placeSensor, moveSensor, removeSensor, selectSensor,
        startDrawing, updateDrawing, endDrawing,
        setZoom, setPan,
        undo, redo,
        setAutoSaveEnabled,
        saveFloorPlan, loadFloorPlan, newFloorPlan,
    ]);

    return (
        <FloorPlanContext.Provider value={value}>
            {children}
        </FloorPlanContext.Provider>
    );
}

export function useFloorPlan() {
    const context = useContext(FloorPlanContext);
    if (!context) {
        throw new Error('useFloorPlan must be used within a FloorPlanProvider');
    }
    return context;
}

export default FloorPlanContext;
