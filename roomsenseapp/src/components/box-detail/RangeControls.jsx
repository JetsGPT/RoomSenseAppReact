import React from 'react';
import { Button } from '../ui/button';
import { DatePicker } from '../ui/date-picker';

export function RangeControls({
    boxId,
    rangeKey,
    onSelectRange,
    timeRangeOptions,
    customDraft,
    onDraftChange,
    onApply,
    onReset,
    isCustomRange,
    isApplyDisabled,
    draftError,
    lastUpdatedLabel,
    isLoading
}) {
    const selectId = `box-${boxId}-range`;

    return (
        <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <label className="text-sm font-medium text-foreground" htmlFor={selectId}>
                        Time range
                    </label>
                    <select
                        id={selectId}
                        value={rangeKey}
                        onChange={(event) => onSelectRange(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-56"
                    >
                        {timeRangeOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                                {option.label}
                            </option>
                        ))}
                        <option value="custom">Custom period...</option>
                    </select>
                </div>
                {isCustomRange && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onReset}
                            className="h-9"
                        >
                            Reset to default
                        </Button>
                    </div>
                )}
            </div>

            {isCustomRange && (
                <div className="rounded-xl border border-border bg-background/50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Start Date & Time</label>
                            <DatePicker
                                date={customDraft.start ? new Date(customDraft.start) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        // Preserve time if exists, or default to start of day
                                        const current = customDraft.start ? new Date(customDraft.start) : new Date();
                                        date.setHours(current.getHours(), current.getMinutes());
                                        onDraftChange('start', date.toISOString());
                                    }
                                }}
                                className="w-full"
                            />
                            <input
                                type="datetime-local"
                                value={customDraft.start}
                                onChange={(e) => onDraftChange('start', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">End Date & Time</label>
                            <DatePicker
                                date={customDraft.end ? new Date(customDraft.end) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        const current = customDraft.end ? new Date(customDraft.end) : new Date();
                                        date.setHours(current.getHours(), current.getMinutes());
                                        onDraftChange('end', date.toISOString());
                                    }
                                }}
                                className="w-full"
                            />
                            <input
                                type="datetime-local"
                                value={customDraft.end}
                                onChange={(e) => onDraftChange('end', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                            <Button
                                onClick={onApply}
                                disabled={isApplyDisabled}
                                className="w-full"
                            >
                                Apply Range
                            </Button>
                        </div>
                    </div>
                    {draftError && (
                        <p className="mt-2 text-xs text-destructive">
                            Start time must be before end time.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
