import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { Button } from './ui/button';
import { getSensorName, getSensorColor } from '../config/sensorConfig';
import { cn } from '../lib/utils';

export function SensorChartManager({
    availableSensors,
    selectedSensors,
    onChange,
    className
}) {
    const sensors = useMemo(() => (
        Array.isArray(availableSensors) ? availableSensors : []
    ), [availableSensors]);

    const selectedList = useMemo(() => (
        Array.isArray(selectedSensors) ? selectedSensors : []
    ), [selectedSensors]);

    const allSelected = sensors.length > 0 && selectedList.length === sensors.length;
    const noneSelected = selectedList.length === 0;

    const handleToggleSensor = (sensorType) => {
        if (!sensors.includes(sensorType)) {
            return;
        }

        const isSelected = selectedList.includes(sensorType);
        const nextSelection = isSelected
            ? selectedList.filter((item) => item !== sensorType)
            : [...selectedList, sensorType];

        if (onChange) {
            const orderedSelection = sensors.filter((item) => nextSelection.includes(item));
            onChange(orderedSelection);
        }
    };

    const handleSelectAll = () => {
        if (onChange) {
            onChange(sensors.slice());
        }
    };

    const handleClear = () => {
        if (onChange) {
            onChange([]);
        }
    };

    return (
        <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm backdrop-blur-sm', className)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Chart selection</p>
                        <p className="text-xs text-muted-foreground">
                            <NumberFlow value={selectedList.length} />/<NumberFlow value={sensors.length} /> sensors selected
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleSelectAll}
                        disabled={allSelected || sensors.length === 0}
                    >
                        Select all
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleClear}
                        disabled={noneSelected}
                    >
                        Remove all
                    </Button>
                </div>
            </div>
            {sensors.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-muted-foreground/40 p-4 text-xs text-muted-foreground">
                    No sensor types available yet.
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                    {sensors.map((sensorType) => {
                        const isSelected = selectedList.includes(sensorType);
                        const sensorName = getSensorName(sensorType);
                        const color = getSensorColor(sensorType) || '#6b7280';

                        return (
                            <Button
                                key={sensorType}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                className="flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                                onClick={() => handleToggleSensor(sensorType)}
                                aria-pressed={isSelected}
                                data-selected={isSelected ? 'true' : 'false'}
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                {sensorName}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SensorChartManager;
