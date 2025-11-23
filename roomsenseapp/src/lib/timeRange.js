import { TIME_RANGES, DEFAULT_TIME_RANGE } from '../config/sensorConfig';

const UNIT_TO_MS = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
};

export const CHART_RANGE_OPTIONS = ['24h', '7d', '30d'];
export const DEFAULT_CHART_RANGE = '24h';

const FALLBACK_RANGE_KEY = DEFAULT_CHART_RANGE;

const parseRelativeValue = (rangeValue) => {
    if (typeof rangeValue !== 'string') {
        return null;
    }

    const match = /^-(\d+)([mhd])$/i.exec(rangeValue.trim());
    if (!match) {
        return null;
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const unitMs = UNIT_TO_MS[unit];

    if (!Number.isFinite(amount) || !unitMs) {
        return null;
    }

    return amount * unitMs;
};

export const resolveRangeKey = (rangeKey) => {
    if (rangeKey && TIME_RANGES[rangeKey]) {
        return rangeKey;
    }
    return TIME_RANGES[DEFAULT_TIME_RANGE] ? DEFAULT_TIME_RANGE : Object.keys(TIME_RANGES)[0];
};

export const getRangeConfig = (rangeKey) => {
    const key = resolveRangeKey(rangeKey);
    return TIME_RANGES[key];
};

export const getRangeStartDate = (rangeKey, referenceDate = new Date()) => {
    const config = getRangeConfig(rangeKey);
    if (!config) {
        return null;
    }

    const durationMs = parseRelativeValue(config.value);
    if (!Number.isFinite(durationMs)) {
        return null;
    }

    return new Date(referenceDate.getTime() - durationMs);
};

export const filterDataByRange = (data, rangeKey, referenceDate = new Date()) => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    const startDate = getRangeStartDate(rangeKey, referenceDate);
    if (!startDate) {
        return data.slice();
    }

    const startTime = startDate.getTime();

    return data.filter((item) => {
        const rawTimestamp = item?.timestamp;
        if (!rawTimestamp) {
            return false;
        }

        const timestamp = new Date(rawTimestamp);
        return Number.isFinite(timestamp.getTime()) && timestamp.getTime() >= startTime;
    });
};

export const ensureRangeKey = (rangeKey, options = CHART_RANGE_OPTIONS) => {
    if (rangeKey && options.includes(rangeKey)) {
        return rangeKey;
    }

    return options.includes(FALLBACK_RANGE_KEY) ? FALLBACK_RANGE_KEY : options[0];
};
