import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { DISPLAY_MODES } from '../../config/comfortConfig';

/**
 * DisplayModeSelector Component
 * 
 * Dropdown/button group for selecting display mode.
 */
export const DisplayModeSelector = memo(function DisplayModeSelector({
    value,
    onChange,
    variant = 'dropdown', // 'dropdown' | 'buttons' | 'pills'
    className = ''
}) {
    if (variant === 'dropdown') {
        return (
            <div className={`display-mode-selector ${className}`}>
                <label className="display-mode-label">Display:</label>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="display-mode-select"
                >
                    {DISPLAY_MODES.map(mode => (
                        <option key={mode.id} value={mode.id}>
                            {mode.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (variant === 'pills') {
        return (
            <div className={`display-mode-pills ${className}`}>
                {DISPLAY_MODES.map(mode => {
                    const ModeIcon = mode.Icon;
                    return (
                        <motion.button
                            key={mode.id}
                            onClick={() => onChange(mode.id)}
                            className={`display-mode-pill ${value === mode.id ? 'active' : ''}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            title={mode.description}
                        >
                            <ModeIcon className="display-mode-pill-icon w-4 h-4" />
                            <span className="display-mode-pill-label">{mode.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        );
    }

    // Default: buttons
    return (
        <div className={`display-mode-buttons ${className}`}>
            {DISPLAY_MODES.map(mode => {
                const ModeIcon = mode.Icon;
                return (
                    <button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={`display-mode-btn ${value === mode.id ? 'active' : ''}`}
                        title={mode.description}
                    >
                        <ModeIcon className="w-4 h-4" />
                    </button>
                );
            })}
        </div>
    );
});

/**
 * DisplayModeGrid Component
 * 
 * Full grid selector with descriptions.
 */
export const DisplayModeGrid = memo(function DisplayModeGrid({
    value,
    onChange,
    className = ''
}) {
    return (
        <div className={`display-mode-grid ${className}`}>
            {DISPLAY_MODES.map(mode => {
                const ModeIcon = mode.Icon;
                return (
                    <motion.button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={`display-mode-grid-item ${value === mode.id ? 'active' : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ModeIcon className="display-mode-grid-icon w-6 h-6" />
                        <span className="display-mode-grid-label">{mode.label}</span>
                        <span className="display-mode-grid-desc">{mode.description}</span>
                    </motion.button>
                );
            })}
        </div>
    );
});

export default DisplayModeSelector;
