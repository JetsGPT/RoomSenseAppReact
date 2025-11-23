import { useState, useEffect, useMemo, useCallback } from 'react';

const isBrowser = typeof window !== 'undefined';

const readStoredSelection = (storageKey) => {
    if (!isBrowser || !storageKey) {
        return null;
    }

    try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.warn('Failed to read sensor selection from storage', error);
        return null;
    }
};

const arraysEqual = (a = [], b = []) => {
    if (a.length !== b.length) {
        return false;
    }

    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }

    return true;
};

export function useSensorSelection({ storageKey, availableSensors, defaultToAll = true, defaultSelection }) {
    const normalizedSensors = useMemo(() => {
        if (!Array.isArray(availableSensors)) {
            return [];
        }
        return Array.from(new Set(availableSensors.filter(Boolean)));
    }, [availableSensors]);

    const [selection, setSelection] = useState(() => readStoredSelection(storageKey));

    const sanitizeSelection = useCallback((input, { allowEmpty = true } = {}) => {
        if (!Array.isArray(input)) {
            input = [];
        }

        const unique = [];
        input.forEach((sensorType) => {
            if (normalizedSensors.includes(sensorType) && !unique.includes(sensorType)) {
                unique.push(sensorType);
            }
        });

        if (!allowEmpty && unique.length === 0 && defaultToAll && normalizedSensors.length > 0) {
            return normalizedSensors;
        }

        return unique;
    }, [normalizedSensors, defaultToAll]);

    // Hydrate selection whenever available sensors change
    useEffect(() => {
        if (normalizedSensors.length === 0) {
            return;
        }

        setSelection((previous) => {
            if (previous === null) {
                if (Array.isArray(defaultSelection) && defaultSelection.length > 0) {
                    const sanitizedDefault = sanitizeSelection(defaultSelection, { allowEmpty: false });
                    if (sanitizedDefault.length > 0) {
                        return sanitizedDefault;
                    }
                }

                if (defaultToAll) {
                    return normalizedSensors.slice();
                }

                return previous;
            }

            const sanitized = sanitizeSelection(previous, { allowEmpty: true });
            return arraysEqual(previous, sanitized) ? previous : sanitized;
        });
    }, [normalizedSensors, defaultToAll, defaultSelection, sanitizeSelection]);

    // Persist selection to localStorage (only when defined)
    useEffect(() => {
        if (!isBrowser || !storageKey) {
            return;
        }

        if (selection === null) {
            return;
        }

        try {
            window.localStorage.setItem(storageKey, JSON.stringify(selection));
        } catch (error) {
            console.warn('Failed to persist sensor selection', error);
        }
    }, [selection, storageKey]);

    const setSelectedSensors = useCallback((nextSelection) => {
        setSelection((previous) => {
            const sanitized = sanitizeSelection(nextSelection, { allowEmpty: true });
            return arraysEqual(previous ?? [], sanitized) ? previous : sanitized;
        });
    }, [sanitizeSelection]);

    const toggleSensor = useCallback((sensorType) => {
        if (!normalizedSensors.includes(sensorType)) {
            return;
        }

        setSelection((previous) => {
            const base = Array.isArray(previous) ? previous : (defaultToAll ? normalizedSensors : []);
            const exists = base.includes(sensorType);
            const next = exists ? base.filter((item) => item !== sensorType) : [...base, sensorType];
            return sanitizeSelection(next, { allowEmpty: true });
        });
    }, [normalizedSensors, defaultToAll, sanitizeSelection]);

    const selectAll = useCallback(() => {
        setSelection((previous) => {
            return arraysEqual(previous ?? [], normalizedSensors) ? previous : normalizedSensors.slice();
        });
    }, [normalizedSensors]);

    const clearSelection = useCallback(() => {
        setSelection([]);
    }, []);

    const effectiveSelection = useMemo(() => {
        if (Array.isArray(selection)) {
            return sanitizeSelection(selection, { allowEmpty: true });
        }

        if (Array.isArray(defaultSelection) && defaultSelection.length > 0) {
            const sanitizedDefault = sanitizeSelection(defaultSelection, { allowEmpty: false });
            if (sanitizedDefault.length > 0) {
                return sanitizedDefault;
            }
        }

        if (defaultToAll) {
            return normalizedSensors.slice();
        }

        return [];
    }, [selection, sanitizeSelection, normalizedSensors, defaultToAll, defaultSelection]);

    return {
        availableSensors: normalizedSensors,
        selectedSensors: effectiveSelection,
        setSelectedSensors,
        toggleSensor,
        selectAll,
        clearSelection,
        isAllSelected: effectiveSelection.length > 0 && effectiveSelection.length === normalizedSensors.length,
        isEmpty: effectiveSelection.length === 0,
        hasCustomSelection: Array.isArray(selection)
    };
}

export default useSensorSelection;
