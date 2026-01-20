/**
 * Calculate the bounding box of elements and sensors with padding
 * Returns viewBox { x, y, width, height } in normalized coordinates (0-1)
 */
export const calculateBoundingBox = (elements = [], sensors = []) => {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    let hasContent = false;

    // Check elements
    elements.forEach(el => {
        el.points?.forEach(([x, y]) => {
            hasContent = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    });

    // Check sensors
    sensors.forEach(sensor => {
        hasContent = true;
        const { x, y } = sensor.position;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });

    if (!hasContent) return { x: 0, y: 0, width: 1, height: 1 };

    // Calculate dimensions
    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;

    // Add padding (10% of the larger dimension)
    const padding = Math.max(contentWidth, contentHeight) * 0.1 || 0.1;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(1, maxX + padding);
    maxY = Math.min(1, maxY + padding);

    // Enforce aspect ratio? 
    // No, the container might have different aspect ratio. 
    // We just provide the bounds of the interesting area.
    // The viewer will need to fit this box into the container.

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
};

/**
 * Transform normalized coordinate (0-1) to view coordinate (0-1 relative to viewBox)
 */
export const transformCoordinate = (val, min, size) => {
    return (val - min) / size;
};
