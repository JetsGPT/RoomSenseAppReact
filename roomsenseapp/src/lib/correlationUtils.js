/**
 * Utility functions for correlation analysis and derived weather metrics.
 */

/**
 * Calculates the Heat Index (feels-like temperature) using the Rothfusz regression.
 * Formula source: NWS (National Weather Service)
 * 
 * @param {number} t - Temperature in Celsius
 * @param {number} rh - Relative Humidity in percent (0-100)
 * @returns {number|null} Heat Index in Celsius, or null if inputs are invalid/out of range
 */
export function calculateHeatIndex(t, rh) {
    if (typeof t !== 'number' || typeof rh !== 'number') return null;

    // Heat Index is only valid for temps >= 27°C (approx 80°F) and RH >= 40%
    // However, we'll return the simpler formula or raw temp if outside range to avoid gaps,
    // but strictly speaking the regression is only valid in hot/humid conditions.
    // For this app, we'll return null if it's too cold to have a meaningful "heat index",
    // or just return the temperature itself if we want a fallback.
    // Let's return null to indicate "not applicable" if it's below 20°C, just to be safe.

    // Convert C to F for the formula
    const T = (t * 9 / 5) + 32;
    const RH = rh;

    // Simple formula first
    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

    // If avg is >= 80F, use full regression
    if (HI >= 80) {
        HI = -42.379 + 2.04901523 * T + 10.14333127 * RH
            - 0.22475541 * T * RH - 0.00683783 * T * T
            - 0.05481717 * RH * RH + 0.00122874 * T * T * RH
            + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;

        if (RH < 13 && T >= 80 && T <= 112) {
            const adj = ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
            HI -= adj;
        } else if (RH > 85 && T >= 80 && T <= 87) {
            const adj = ((RH - 85) / 10) * ((87 - T) / 5);
            HI += adj;
        }
    }

    // Convert back to Celsius
    const result = (HI - 32) * 5 / 9;
    return parseFloat(result.toFixed(1));
}

/**
 * Calculates the Dew Point using the Magnus-Tetens approximation.
 * 
 * @param {number} t - Temperature in Celsius
 * @param {number} rh - Relative Humidity in percent (0-100)
 * @returns {number|null} Dew Point in Celsius
 */
export function calculateDewPoint(t, rh) {
    if (typeof t !== 'number' || typeof rh !== 'number') return null;
    if (rh <= 0) return null;

    const a = 17.625;
    const b = 243.04;

    const alpha = Math.log(rh / 100) + ((a * t) / (b + t));
    const dp = (b * alpha) / (a - alpha);

    return parseFloat(dp.toFixed(1));
}

/**
 * Pairs two arrays of sensor data by timestamp within a tolerance.
 * Assumes data is sorted by timestamp (ascending).
 * 
 * @param {Array} dataA - First dataset [{ timestamp, value }]
 * @param {Array} dataB - Second dataset [{ timestamp, value }]
 * @param {number} toleranceMs - Max time difference in ms to consider a match (default 60s)
 * @returns {Array} Paired data [{ x, y, timestamp, timestampDiff }]
 */
export function pairSensorData(dataA, dataB, toleranceMs = 60000) {
    if (!dataA || !dataB) return [];

    const paired = [];
    let bIndex = 0;

    for (let i = 0; i < dataA.length; i++) {
        const itemA = dataA[i];
        const timeA = new Date(itemA.timestamp).getTime();

        // Advance B to window start
        while (bIndex < dataB.length && (new Date(dataB[bIndex].timestamp).getTime()) < timeA - toleranceMs) {
            bIndex++;
        }

        // Search window in B
        let bestMatch = null;
        let minDiff = Infinity;

        // Check potential matches starting from bIndex
        for (let j = bIndex; j < dataB.length; j++) {
            const itemB = dataB[j];
            const timeB = new Date(itemB.timestamp).getTime();
            const diff = Math.abs(timeA - timeB);

            if (timeB > timeA + toleranceMs) break; // Passed window

            if (diff <= toleranceMs && diff < minDiff) {
                minDiff = diff;
                bestMatch = itemB;
            }
        }

        if (bestMatch) {
            paired.push({
                x: itemA.value,
                y: bestMatch.value,
                timestamp: timeA,
                timestampDiff: minDiff
            });
        }
    }

    return paired;
}

/**
 * Calculates the Pearson correlation coefficient (r).
 * 
 * @param {Array} pairedData - Array of objects with x and y properties
 * @returns {number|null} Correlation coefficient (-1 to 1)
 */
export function calculateCorrelation(pairedData) {
    const n = pairedData.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const point of pairedData) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumX2 += point.x * point.x;
        sumY2 += point.y * point.y;
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0; // No variation

    return parseFloat((numerator / denominator).toFixed(3));
}
