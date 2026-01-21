/**
 * useComfortZones Hook
 * 
 * Provides comfort zone functions that respect user's custom settings.
 * Uses comfortConfig.js as the single source of truth for zone definitions.
 */

import { useMemo, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import {
    getComfortZone as getZone,
    getComfortStatus as getStatus,
    calculateRoomScore as calcScore,
    generateTips as genTips,
    getScoreInfo,
    getRoomStatusMessage
} from '../config/comfortConfig';

/**
 * Hook for comfort zone calculations that respects user settings
 */
export function useComfortZones() {
    const { settings } = useSettings();

    // Memoize custom zones from settings
    const customZones = useMemo(() => {
        return settings?.customComfortZones || null;
    }, [settings?.customComfortZones]);

    // Wrap functions with custom zones
    const getComfortZone = useCallback((sensorType, value) => {
        const bounds = customZones?.[sensorType];
        return getZone(sensorType, value, bounds);
    }, [customZones]);

    const getComfortStatus = useCallback((sensorType, value) => {
        const bounds = customZones?.[sensorType];
        return getStatus(sensorType, value, bounds);
    }, [customZones]);

    const calculateRoomScore = useCallback((readings) => {
        return calcScore(readings, customZones);
    }, [customZones]);

    const generateTips = useCallback((readings) => {
        return genTips(readings, customZones);
    }, [customZones]);

    return {
        getComfortZone,
        getComfortStatus,
        calculateRoomScore,
        generateTips,
        getScoreInfo,
        getRoomStatusMessage,
        customZones
    };
}

export default useComfortZones;
