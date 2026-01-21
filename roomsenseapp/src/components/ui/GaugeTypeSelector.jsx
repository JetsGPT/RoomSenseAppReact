import React from 'react';
import { GAUGE_TYPES } from '../../config/gaugeConfig';
import { Activity, Circle, Gauge, Minus, Zap, Cloud, MinusCircle } from 'lucide-react';

/**
 * Get icon component for gauge type
 */
const getIconComponent = (iconName) => {
    switch (iconName) {
        case 'Activity':
            return Activity;
        case 'Circle':
        case 'CircleHalf':
            return Circle;
        case 'Gauge':
            return Gauge;
        case 'Minus':
            return Minus;
        case 'Zap':
            return Zap;
        case 'Cloud':
            return Cloud;
        case 'MinusCircle':
            return MinusCircle;
        default:
            return Gauge;
    }
};

/**
 * GaugeTypeSelector Component
 * 
 * Dropdown selector for choosing gauge display style
 */
export function GaugeTypeSelector({ value, onChange, className = '' }) {
    return (
        <div className={`gauge-type-selector ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Select gauge type"
            >
                {GAUGE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                        {type.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

/**
 * GaugeTypeGrid Component
 * 
 * Visual grid selector for gauge types with icons
 */
export function GaugeTypeGrid({ value, onChange, className = '' }) {
    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {GAUGE_TYPES.map((type) => {
                const Icon = getIconComponent(type.icon);
                const isSelected = value === type.id;

                return (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => onChange(type.id)}
                        className={`
                            flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md
                            transition-all duration-200
                            ${isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            }
                        `}
                        title={type.description}
                        aria-pressed={isSelected}
                    >
                        <Icon size={12} />
                        <span className="hidden sm:inline">{type.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default GaugeTypeSelector;
