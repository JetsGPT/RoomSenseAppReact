import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

const DAYS_IN_WEEK = 7;
const WEEKS_IN_YEAR = 52;

const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to get color based on intensity (0-4 scale like GitHub)
// or dynamic interpolation if needed.
const getIntensityColor = (value, min, max, baseColor = '#10b981') => {
    if (value === null || value === undefined) {
        return {
            className: 'bg-muted/30',
            style: {}
        };
    }

    // Simple logic for now, similar to GitHub
    // Normalize value
    const range = max - min;
    const normalized = range === 0 ? 1 : (value - min) / range;

    // Using opacity for simplicity with the base color
    // 20%, 40%, 60%, 80%, 100% opacity
    const opacity = 0.2 + (normalized * 0.8);

    return {
        className: '',
        style: {
            backgroundColor: baseColor,
            opacity: opacity
        }
    };
};

export const CalendarHeatmap = ({
    data = [],
    startDate,
    endDate = new Date(),
    color = '#10b981',
    unit = '',
    loading = false
}) => {

    // Process data into a map for fast lookup: "YYYY-MM-DD" -> value
    const dataMap = useMemo(() => {
        const map = new Map();
        if (Array.isArray(data)) {
            data.forEach(item => {
                // Ensure date is YYYY-MM-DD
                const dateKey = item.date.split('T')[0];
                map.set(dateKey, item.value);
            });
        }
        return map;
    }, [data]);

    // Calculate min/max for color scaling
    const { min, max } = useMemo(() => {
        let minVal = Infinity;
        let maxVal = -Infinity;

        if (data.length === 0) return { min: 0, max: 0 };

        data.forEach(d => {
            if (d.value < minVal) minVal = d.value;
            if (d.value > maxVal) maxVal = d.value;
        });

        return { min: minVal, max: maxVal };
    }, [data]);

    // Generate calendar grid
    const calendarGrid = useMemo(() => {
        const end = new Date(endDate);
        const start = startDate ? new Date(startDate) : new Date(end);
        if (!startDate) start.setDate(end.getDate() - 364); // Default to last year

        const weeks = [];
        let currentWeek = [];

        // Align start date to the previous Sunday for the grid visualization
        const gridStart = new Date(start);
        gridStart.setDate(start.getDate() - start.getDay());

        // Iterate per day until end date
        // We typically want fixed 52 weeks matching GitHub style
        const totalDays = WEEKS_IN_YEAR * DAYS_IN_WEEK;

        // Create 52 weeks
        for (let i = 0; i < WEEKS_IN_YEAR; i++) {
            const week = [];
            for (let j = 0; j < DAYS_IN_WEEK; j++) {
                const currentDate = new Date(gridStart);
                currentDate.setDate(gridStart.getDate() + (i * 7) + j);

                const dateStr = currentDate.toISOString().split('T')[0];
                const value = dataMap.get(dateStr);

                week.push({
                    date: currentDate,
                    dateStr,
                    value,
                    isValid: currentDate <= end && currentDate >= start
                });
            }
            weeks.push(week);
        }
        return weeks;
    }, [dataMap, endDate, startDate]);


    if (loading) {
        return (
            <div className="w-full h-[200px] flex items-center justify-center animate-pulse bg-muted/10 rounded-lg">
                <span className="text-muted-foreground">Loading heatmap...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 w-full overflow-x-auto p-4 bg-card/50 rounded-xl border">
            {/* Heatmap Container */}
            <div className="flex gap-2 min-w-max">
                {/* Day Labels (Mon/Wed/Fri) */}
                <div className="flex flex-col justify-between pt-6 pb-2 text-xs text-muted-foreground gap-[2px]">
                    <div className="h-[10px]" /> {/* Spacer for Sunday/Alignment */}
                    <div className="h-[10px]">Mon</div>
                    <div className="h-[10px]" />
                    <div className="h-[10px]">Wed</div>
                    <div className="h-[10px]" />
                    <div className="h-[10px]">Fri</div>
                    <div className="h-[10px]" />
                </div>

                {/* Grid */}
                <div className="flex flex-col gap-1">
                    {/* Month Labels logic is approximated for simplicity */}
                    <div className="flex text-xs text-muted-foreground ml-1 gap-10 mb-2">
                        {MONTH_LABELS.map(m => <span key={m}>{m}</span>)}
                    </div>

                    <div className="flex gap-[3px]">
                        {calendarGrid.map((week, wIndex) => (
                            <div key={wIndex} className="flex flex-col gap-[3px]">
                                {week.map((day, dIndex) => (
                                    <HeatmapCell
                                        key={day.dateStr}
                                        day={day}
                                        min={min}
                                        max={max}
                                        color={color}
                                        unit={unit}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-muted/30" />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.2 }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.4 }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.8 }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 1.0 }} />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const HeatmapCell = ({ day, min, max, color, unit }) => {
    const { style, className } = getIntensityColor(day.value, min, max, color);

    if (!day.isValid && day.value === undefined) {
        // Future dates or out of range
        return <div className="w-[10px] h-[10px] rounded-[2px] bg-transparent" />;
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-[10px] h-[10px] rounded-[2px] transition-colors hover:ring-2 hover:ring-foreground/20 cursor-pointer ${className}`}
                        style={style}
                    />
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                    <div className="font-semibold">{day.date.toLocaleDateString()}</div>
                    <div>
                        {day.value !== undefined ? `${day.value} ${unit}` : 'No Data'}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
