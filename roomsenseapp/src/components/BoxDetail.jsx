import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, PencilLine } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { Button } from './ui/button';
import { InfoBlock } from './ui/InfoBlock';
import { SensorLineChart, SensorAreaChart } from './ui/SensorCharts';
import { SensorChartManager } from './SensorChartManager';
import { DatePicker } from './ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useSensorSelection } from '../hooks/useSensorSelection';
import { useSensorData } from '../hooks/useSensorData';
import {
    getSensorIcon,
    getSensorUnit,
    getSensorName,
    getSensorColor,
    formatSensorValue,
    TIME_RANGES,
    DEFAULT_TIME_RANGE,
    DEFAULT_TIME_RANGE_VALUE,
    DATA_LIMITS
} from '../config/sensorConfig';

const DEFAULT_RANGE_KEY = DEFAULT_TIME_RANGE || '24h';
const STORAGE_PREFIX = 'roomsense.box';
const isBrowser = typeof window !== 'undefined';

const getRangeStorageKey = (boxId) => `${STORAGE_PREFIX}.${boxId}.range`;
const getCustomStorageKey = (boxId) => `${STORAGE_PREFIX}.${boxId}.customRange`;

const createDefaultCustomRange = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
};

const toInputValue = (iso) => {
    if (!iso) {
        return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const offsetMinutes = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offsetMinutes * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
};

const toIsoString = (inputValue) => {
    if (!inputValue) {
        return '';
    }
    const date = new Date(inputValue);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toISOString();
};

const readStoredRange = (boxId) => {
    if (!isBrowser || !boxId) {
        return DEFAULT_RANGE_KEY;
    }
    const stored = window.localStorage.getItem(getRangeStorageKey(boxId));
    if (!stored) {
        return DEFAULT_RANGE_KEY;
    }
    if (stored !== 'custom' && !TIME_RANGES[stored]) {
        return DEFAULT_RANGE_KEY;
    }
    return stored;
};

const readStoredCustomRange = (boxId) => {
    if (!isBrowser || !boxId) {
        return createDefaultCustomRange();
    }
    const stored = window.localStorage.getItem(getCustomStorageKey(boxId));
    if (!stored) {
        return createDefaultCustomRange();
    }
    try {
        const parsed = JSON.parse(stored);
        if (parsed?.start && parsed?.end) {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to read stored custom range', error);
    }
    return createDefaultCustomRange();
};

export function BoxDetail({ boxId }) {
    const [rangeKey, setRangeKey] = useState(() => readStoredRange(boxId));
    const [customRange, setCustomRange] = useState(() => readStoredCustomRange(boxId));
    const [customDraft, setCustomDraft] = useState(() => {
        const stored = readStoredCustomRange(boxId);
        return {
            start: toInputValue(stored.start),
            end: toInputValue(stored.end)
        };
    });
    const [showChartManager, setShowChartManager] = useState(false);
    const [sortConfig, setSortConfig] = useState({ column: 'timestamp', direction: 'desc' });

    useEffect(() => {
        setRangeKey(readStoredRange(boxId));
        const storedCustom = readStoredCustomRange(boxId);
        setCustomRange(storedCustom);
        setCustomDraft({
            start: toInputValue(storedCustom.start),
            end: toInputValue(storedCustom.end)
        });
    }, [boxId]);

    useEffect(() => {
        if (!isBrowser || !boxId) {
            return;
        }
        window.localStorage.setItem(getRangeStorageKey(boxId), rangeKey);
    }, [boxId, rangeKey]);

    useEffect(() => {
        if (!isBrowser || !boxId) {
            return;
        }
        if (!customRange?.start || !customRange?.end) {
            return;
        }
        window.localStorage.setItem(getCustomStorageKey(boxId), JSON.stringify(customRange));
    }, [boxId, customRange]);

    const isCustomRange = rangeKey === 'custom';
    const startTimeIso = isCustomRange ? customRange.start : undefined;
    const endTimeIso = isCustomRange ? customRange.end : undefined;
    const timeRangeValue = !isCustomRange
        ? TIME_RANGES[rangeKey]?.value || DEFAULT_TIME_RANGE_VALUE
        : DEFAULT_TIME_RANGE_VALUE;

    const {
        data: fetchedData = [],
        loading,
        error,
        lastFetch
    } = useSensorData({
        sensor_box: boxId,
        timeRange: timeRangeValue,
        startTime: startTimeIso,
        endTime: endTimeIso,
        autoRefresh: !isCustomRange,
        enabled: Boolean(boxId && (!isCustomRange || (startTimeIso && endTimeIso))),
        limit: DATA_LIMITS.export
    });

    const sortedBoxData = useMemo(() => {
        if (!Array.isArray(fetchedData)) {
            return [];
        }
        return fetchedData
            .slice()
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [fetchedData]);

    const latestReadings = useMemo(() => {
        const latestByType = {};
        sortedBoxData.forEach((reading) => {
            const sensorType = reading.sensor_type;
            if (
                !latestByType[sensorType] ||
                new Date(reading.timestamp) > new Date(latestByType[sensorType].timestamp)
            ) {
                latestByType[sensorType] = reading;
            }
        });
        return Object.values(latestByType);
    }, [sortedBoxData]);

    const availableSensorTypes = useMemo(
        () => [...new Set(sortedBoxData.map((reading) => reading.sensor_type))],
        [sortedBoxData]
    );

    const dataBySensorType = useMemo(() => {
        return sortedBoxData.reduce((acc, reading) => {
            if (!acc[reading.sensor_type]) {
                acc[reading.sensor_type] = [];
            }
            acc[reading.sensor_type].push({
                timestamp: reading.timestamp,
                value: reading.value
            });
            return acc;
        }, {});
    }, [sortedBoxData]);

    const getChartDataForSensorType = useCallback(
        (sensorType) => dataBySensorType[sensorType] || [],
        [dataBySensorType]
    );

    const {
        selectedSensors: selectedSensorTypes,
        setSelectedSensors: setSelectedSensorTypes
    } = useSensorSelection({
        storageKey: `roomsense.box.${boxId}.selectedSensors`,
        availableSensors: availableSensorTypes,
        defaultToAll: true
    });

    const activeSensorTypes = useMemo(
        () => selectedSensorTypes.filter((sensorType) => availableSensorTypes.includes(sensorType)),
        [selectedSensorTypes, availableSensorTypes]
    );

    const handleSort = useCallback((column) => {
        setSortConfig((prev) => {
            if (prev.column === column) {
                const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
                return { column, direction: nextDirection };
            }
            return { column, direction: column === 'timestamp' ? 'desc' : 'asc' };
        });
    }, []);

    const sortedTableRows = useMemo(() => {
        const rows = Array.isArray(sortedBoxData) ? sortedBoxData.slice() : [];
        const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;

        rows.sort((a, b) => {
            if (sortConfig.column === 'sensor') {
                const nameA = getSensorName(a.sensor_type);
                const nameB = getSensorName(b.sensor_type);
                return directionFactor * nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
            }

            if (sortConfig.column === 'value') {
                const valueA = Number(a.value) || 0;
                const valueB = Number(b.value) || 0;
                if (valueA === valueB) {
                    return directionFactor * (new Date(a.timestamp) - new Date(b.timestamp));
                }
                return directionFactor * (valueA - valueB);
            }

            // Default to timestamp
            return directionFactor * (new Date(a.timestamp) - new Date(b.timestamp));
        });

        return rows;
    }, [sortedBoxData, sortConfig]);

    const lastUpdatedLabel = useMemo(
        () => (lastFetch ? lastFetch.toLocaleString() : null),
        [lastFetch]
    );

    const hasAnyData = sortedBoxData.length > 0;
    const hasLatestReadings = latestReadings.length > 0;
    const hasLineChartData = activeSensorTypes.some(
        (sensorType) => (dataBySensorType[sensorType] || []).length > 0
    );
    const hasTrendChartData = activeSensorTypes.slice(0, 2).some(
        (sensorType) => (dataBySensorType[sensorType] || []).length > 0
    );
    const errorMessage = error?.message || 'Failed to load sensor data.';
    const showErrorBanner = Boolean(error);
    const showNoDataBanner = !showErrorBanner && !loading && !hasAnyData;
    const isLoadingInitial = loading && !hasAnyData;
    const getAriaSortValue = (column) => {
        if (sortConfig.column !== column) {
            return 'none';
        }
        return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
    };

    const timeRangeOptions = useMemo(
        () =>
            Object.entries(TIME_RANGES).map(([key, config]) => ({
                key,
                label: config.label
            })),
        []
    );

    const draftStartDate = customDraft.start ? new Date(customDraft.start) : null;
    const draftEndDate = customDraft.end ? new Date(customDraft.end) : null;
    const customDraftInvalid = Boolean(
        draftStartDate &&
        draftEndDate &&
        draftStartDate.getTime() > draftEndDate.getTime()
    );
    const isApplyDisabled = !customDraft.start || !customDraft.end || customDraftInvalid;

    const handleSelectRange = useCallback(
        (nextRange) => {
            if (nextRange === 'custom') {
                const ensured =
                    customRange?.start && customRange?.end
                        ? customRange
                        : createDefaultCustomRange();
                if (!customRange?.start || !customRange?.end) {
                    setCustomRange(ensured);
                }
                setCustomDraft({
                    start: toInputValue(ensured.start),
                    end: toInputValue(ensured.end)
                });
                setRangeKey('custom');
                return;
            }
            setRangeKey(nextRange);
        },
        [customRange]
    );

    const handleCustomDraftChange = useCallback((field, value) => {
        setCustomDraft((prev) => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleApplyCustom = useCallback(() => {
        if (isApplyDisabled) {
            return;
        }
        const startIso = toIsoString(customDraft.start);
        const endIso = toIsoString(customDraft.end);
        if (!startIso || !endIso) {
            return;
        }
        setCustomRange({ start: startIso, end: endIso });
        setRangeKey('custom');
        setCustomDraft({
            start: toInputValue(startIso),
            end: toInputValue(endIso)
        });
    }, [customDraft, isApplyDisabled]);

    const handleResetRanges = useCallback(() => {
        const defaults = createDefaultCustomRange();
        setRangeKey(DEFAULT_RANGE_KEY);
        setCustomRange(defaults);
        setCustomDraft({
            start: toInputValue(defaults.start),
            end: toInputValue(defaults.end)
        });
    }, []);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Sensor Box {boxId}</h2>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            <NumberFlow value={sortedBoxData.length} /> total readings •{' '}
                            <NumberFlow value={availableSensorTypes.length} /> sensor types
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="icon-sm"
                                variant={showChartManager ? 'secondary' : 'ghost'}
                                onClick={() => setShowChartManager((prev) => !prev)}
                                aria-pressed={showChartManager}
                                className="shrink-0"
                            >
                                <PencilLine className="h-4 w-4" />
                                <span className="sr-only">Configure sensor charts</span>
                            </Button>
                            <div className="text-left text-sm text-muted-foreground sm:text-right">
                                Last updated: {loading ? 'loading…' : lastUpdatedLabel || 'n/a'}
                            </div>
                        </div>
                    </div>
                </div>
                {showChartManager && (
                    <SensorChartManager
                        availableSensors={availableSensorTypes}
                        selectedSensors={activeSensorTypes}
                        onChange={setSelectedSensorTypes}
                        className="bg-background"
                    />
                )}
                <RangeControls
                    boxId={boxId}
                    rangeKey={rangeKey}
                    onSelectRange={handleSelectRange}
                    timeRangeOptions={timeRangeOptions}
                    customDraft={customDraft}
                    onDraftChange={handleCustomDraftChange}
                    onApply={handleApplyCustom}
                    onReset={handleResetRanges}
                    isCustomRange={isCustomRange}
                    isApplyDisabled={isApplyDisabled}
                    draftError={customDraftInvalid}
                    lastUpdatedLabel={lastUpdatedLabel}
                    isLoading={loading}
                />
                {showErrorBanner && (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        <div className="font-semibold">Error loading data</div>
                        <p className="mt-1 text-destructive/80">{errorMessage}</p>
                    </div>
                )}
                {isLoadingInitial && (
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading sensor data…
                    </div>
                )}
                {showNoDataBanner && (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        No sensor readings found for this range. Try a different preset or adjust the custom period.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {hasLatestReadings ? (
                    latestReadings.map((reading, index) => {
                        const Icon = getSensorIcon(reading.sensor_type);
                        const sensorName = getSensorName(reading.sensor_type);
                        const formattedValue = formatSensorValue(reading.value, reading.sensor_type);
                        return (
                            <InfoBlock key={`${reading.sensor_type}-${index}`} title={sensorName}>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Icon className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
                                    <div>
                                        <div className="text-lg font-bold text-foreground sm:text-2xl">
                                            <NumberFlow value={formattedValue} />
                                            {getSensorUnit(reading.sensor_type)}
                                        </div>
                                        <div className="text-xs text-muted-foreground sm:text-sm">
                                            {new Date(reading.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </InfoBlock>
                        );
                    })
                ) : (
                    <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        {loading ? 'Loading latest readings…' : 'No readings available for this range yet.'}
                    </div>
                )}
            </div>

            <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:mb-4 sm:text-lg">
                    Individual Sensor Trends
                </h3>
                {activeSensorTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to display individual charts.
                    </div>
                ) : hasLineChartData ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        {activeSensorTypes
                            .map((sensorType) => {
                                const chartData = getChartDataForSensorType(sensorType);
                                if (chartData.length === 0) {
                                    return null;
                                }
                                return (
                                    <SensorLineChart
                                        key={sensorType}
                                        data={chartData}
                                        sensorType={sensorType}
                                        showRangeSelector={false}
                                    />
                                );
                            })
                            .filter(Boolean)}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        {loading ? 'Loading chart data…' : 'No sensor data available for the selected period.'}
                    </div>
                )}
            </div>

            <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:mb-4 sm:text-lg">
                    Trend Analysis
                </h3>
                {activeSensorTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        Select at least one sensor type to analyse trend data.
                    </div>
                ) : hasTrendChartData ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        {activeSensorTypes
                            .slice(0, 2)
                            .map((sensorType) => {
                                const chartData = getChartDataForSensorType(sensorType);
                                if (chartData.length === 0) {
                                    return null;
                                }
                                return (
                                    <SensorAreaChart
                                        key={sensorType}
                                        data={chartData}
                                        sensorType={sensorType}
                                        showRangeSelector={false}
                                    />
                                );
                            })
                            .filter(Boolean)}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        {loading ? 'Loading trend data…' : 'No trend data available for the selected period.'}
                    </div>
                )}
            </div>

            <div>
                <h3 className="mb-3 text-base font-semibold text-foreground sm:mb-4 sm:text-lg">
                    All Sensor Data
                </h3>
                <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
                    <div className="max-h-96 overflow-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/20">
                                    <TableHead aria-sort={getAriaSortValue('timestamp')}>
                                        <button
                                            type="button"
                                            onClick={() => handleSort('timestamp')}
                                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <span>Timestamp</span>
                                            <span className="text-[10px]">
                                                {sortConfig.column === 'timestamp'
                                                    ? sortConfig.direction === 'asc'
                                                        ? '▲'
                                                        : '▼'
                                                    : '↕'}
                                            </span>
                                        </button>
                                    </TableHead>
                                    <TableHead aria-sort={getAriaSortValue('sensor')}>
                                        <button
                                            type="button"
                                            onClick={() => handleSort('sensor')}
                                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <span>Sensor</span>
                                            <span className="text-[10px]">
                                                {sortConfig.column === 'sensor'
                                                    ? sortConfig.direction === 'asc'
                                                        ? '▲'
                                                        : '▼'
                                                    : '↕'}
                                            </span>
                                        </button>
                                    </TableHead>
                                    <TableHead
                                        className="text-right"
                                        aria-sort={getAriaSortValue('value')}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleSort('value')}
                                            className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <span>Value</span>
                                            <span className="text-[10px]">
                                                {sortConfig.column === 'value'
                                                    ? sortConfig.direction === 'asc'
                                                        ? '▲'
                                                        : '▼'
                                                    : '↕'}
                                            </span>
                                        </button>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTableRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                                            {loading ? 'Loading data…' : 'No sensor data in the selected range.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedTableRows.map((reading, index) => (
                                        <TableRow
                                            key={`${reading.sensor_type}-${reading.timestamp}-${index}`}
                                            className={index % 2 === 0 ? 'bg-card/40' : 'bg-card/20'}
                                        >
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                {new Date(reading.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{ backgroundColor: getSensorColor(reading.sensor_type) || '#6b7280' }}
                                                        aria-hidden="true"
                                                    />
                                                    {getSensorName(reading.sensor_type)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-semibold text-foreground">
                                                {formatSensorValue(reading.value, reading.sensor_type)}
                                                {getSensorUnit(reading.sensor_type)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RangeControls({
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
                        {timeRangeOptions.map(({ key, label }) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                        <option value="custom">Custom range</option>
                    </select>
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">
                    {isLoading ? 'Loading data…' : `Last updated: ${lastUpdatedLabel || 'n/a'}`}
                </div>
            </div>
            {isCustomRange && (
                <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`${selectId}-start`}>
                                Start
                            </label>
                            <DatePicker
                                id={`${selectId}-start`}
                                value={customDraft.start}
                                onChange={(event) => onDraftChange('start', event.target.value)}
                                max={customDraft.end || undefined}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`${selectId}-end`}>
                                End
                            </label>
                            <DatePicker
                                id={`${selectId}-end`}
                                value={customDraft.end}
                                onChange={(event) => onDraftChange('end', event.target.value)}
                                min={customDraft.start || undefined}
                            />
                        </div>
                    </div>
                    {draftError && (
                        <p className="text-xs text-destructive">The end date must be after the start date.</p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onReset}>
                            Reset
                        </Button>
                        <Button type="button" onClick={onApply} disabled={isApplyDisabled}>
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
