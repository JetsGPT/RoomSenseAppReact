import { getMockSensorData } from '../config/devConfig';
import { calculateDewPoint } from '../lib/correlationUtils';

const STORAGE_KEY = 'roomsense:mock-ai-conversations:v1';

function roundMetric(value, digits = 1) {
    if (!Number.isFinite(value)) {
        return null;
    }

    return Number(value.toFixed(digits));
}

function formatMetric(value, unit, digits = 1) {
    if (!Number.isFinite(value)) {
        return 'n/a';
    }

    return `${Number(value).toFixed(digits)}${unit}`;
}

function getIndoorSnapshot() {
    const latestBySeries = new Map();

    getMockSensorData().forEach((reading) => {
        const key = `${reading.sensor_box}::${reading.sensor_type}`;
        const current = latestBySeries.get(key);

        if (!current || new Date(reading.timestamp) > new Date(current.timestamp)) {
            latestBySeries.set(key, reading);
        }
    });

    const boxes = new Map();
    latestBySeries.forEach((reading) => {
        if (!boxes.has(reading.sensor_box)) {
            boxes.set(reading.sensor_box, {
                boxId: reading.sensor_box,
                metrics: {},
            });
        }

        boxes.get(reading.sensor_box).metrics[reading.sensor_type] = {
            value: Number(reading.value),
            timestamp: reading.timestamp,
        };
    });

    return Array.from(boxes.values())
        .map((box) => ({
            boxId: box.boxId,
            temperature: box.metrics.temperature?.value ?? null,
            humidity: box.metrics.humidity?.value ?? null,
            pressure: box.metrics.pressure?.value ?? null,
            light: box.metrics.light?.value ?? null,
            timestamp: Object.values(box.metrics)
                .map((metric) => new Date(metric.timestamp).getTime())
                .filter(Number.isFinite)
                .sort((left, right) => right - left)[0] ?? null,
        }))
        .sort((left, right) => left.boxId.localeCompare(right.boxId));
}

function getMockOutdoorSnapshot(date = new Date()) {
    const hours = date.getHours() + (date.getMinutes() / 60);
    const phase = ((hours - 6) * Math.PI) / 12;

    const temperature = 11 + (Math.sin(phase) * 7) + (Math.cos((date.getDate() / 31) * Math.PI * 2) * 2);
    const humidity = 66 - (Math.sin(phase) * 14) + (Math.cos((date.getMonth() / 12) * Math.PI * 2) * 2);

    return {
        temperature: roundMetric(temperature, 1),
        humidity: roundMetric(Math.max(35, Math.min(90, humidity)), 0),
    };
}

function classifyMoldRisk(temperature, humidity) {
    const dewPoint = calculateDewPoint(temperature, humidity);

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
        return {
            level: 'low',
            label: 'low',
            dewPoint: null,
        };
    }

    if (humidity >= 72 || (dewPoint ?? -Infinity) >= 18) {
        return {
            level: 'high',
            label: 'high',
            dewPoint,
        };
    }

    if (humidity >= 60 || (dewPoint ?? -Infinity) >= 15) {
        return {
            level: 'medium',
            label: 'moderate',
            dewPoint,
        };
    }

    return {
        level: 'low',
        label: 'low',
        dewPoint,
    };
}

function getAverageMetric(snapshot, key) {
    const values = snapshot
        .map((box) => Number(box[key]))
        .filter((value) => Number.isFinite(value));

    if (!values.length) {
        return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getExtremeBox(snapshot, key, direction = 'max') {
    const candidates = snapshot.filter((box) => Number.isFinite(Number(box[key])));
    if (!candidates.length) {
        return null;
    }

    return candidates.reduce((best, current) => {
        if (!best) {
            return current;
        }

        const currentValue = Number(current[key]);
        const bestValue = Number(best[key]);

        if (direction === 'min') {
            return currentValue < bestValue ? current : best;
        }

        return currentValue > bestValue ? current : best;
    }, null);
}

function getMoldRiskRooms(snapshot) {
    return snapshot
        .map((box) => ({
            ...box,
            moldRisk: classifyMoldRisk(Number(box.temperature), Number(box.humidity)),
        }))
        .sort((left, right) => {
            const severity = {
                high: 2,
                medium: 1,
                low: 0,
            };

            const severityDiff = severity[right.moldRisk.level] - severity[left.moldRisk.level];
            if (severityDiff !== 0) {
                return severityDiff;
            }

            return Number(right.humidity ?? 0) - Number(left.humidity ?? 0);
        });
}

function getIndoorSummary(sensorSummary) {
    if (!Array.isArray(sensorSummary?.boxes)) {
        return [];
    }

    return sensorSummary.boxes
        .map((box) => {
            const sensors = new Map((box.sensors || []).map((sensor) => [sensor.sensorType, sensor]));
            return {
                boxId: box.boxId,
                temperature: sensors.get('temperature')?.latest?.value ?? null,
                humidity: sensors.get('humidity')?.latest?.value ?? null,
                pressure: sensors.get('pressure')?.latest?.value ?? null,
                light: sensors.get('light')?.latest?.value ?? null,
                temperatureDelta: sensors.get('temperature')?.delta ?? null,
                humidityDelta: sensors.get('humidity')?.delta ?? null,
            };
        })
        .sort((left, right) => left.boxId.localeCompare(right.boxId));
}

function getOutdoorSummary(weatherSummary) {
    const fallback = getMockOutdoorSnapshot();
    return {
        temperature: weatherSummary?.metrics?.outdoor_temp?.latest?.value ?? fallback.temperature,
        humidity: weatherSummary?.metrics?.outdoor_humidity?.latest?.value ?? fallback.humidity,
    };
}

function getTrendLine(room, metricKey, label, unit, threshold) {
    const deltaKey = `${metricKey}Delta`;
    const delta = Number(room[deltaKey]);

    if (!Number.isFinite(delta) || Math.abs(delta) < threshold) {
        return null;
    }

    const direction = delta > 0 ? 'rose' : 'fell';
    return `- **${room.boxId}** ${label} ${direction} by **${formatMetric(Math.abs(delta), unit)}** over the selected range.`;
}

function buildMockAnalysis(sensorSummary, weatherSummary, timeRange) {
    const rooms = getIndoorSummary(sensorSummary);
    if (!rooms.length) {
        return '## Snapshot\n- No mock sensor data is available for analysis yet.';
    }

    const averageTemperature = getAverageMetric(rooms, 'temperature');
    const averageHumidity = getAverageMetric(rooms, 'humidity');
    const warmestRoom = getExtremeBox(rooms, 'temperature');
    const coolestRoom = getExtremeBox(rooms, 'temperature', 'min');
    const mostHumidRoom = getExtremeBox(rooms, 'humidity');
    const moldRiskRooms = getMoldRiskRooms(rooms);
    const topRiskRoom = moldRiskRooms[0];
    const outdoor = getOutdoorSummary(weatherSummary);
    const trendLines = rooms
        .flatMap((room) => [
            getTrendLine(room, 'temperature', 'temperature', ' C', 1.2),
            getTrendLine(room, 'humidity', 'humidity', '%', 4),
        ])
        .filter(Boolean)
        .slice(0, 4);

    const lines = [
        '## Snapshot',
        `- **${rooms.length} rooms** reported data across **${sensorSummary?.sensorSeriesCount ?? 0} sensor series** for **${timeRange}**.`,
    ];

    if (warmestRoom) {
        lines.push(`- Warmest room: **${warmestRoom.boxId}** at **${formatMetric(warmestRoom.temperature, ' C')}**.`);
    }

    if (coolestRoom) {
        lines.push(`- Coolest room: **${coolestRoom.boxId}** at **${formatMetric(coolestRoom.temperature, ' C')}**.`);
    }

    if (Number.isFinite(averageTemperature)) {
        lines.push(`- Average indoor temperature is **${formatMetric(averageTemperature, ' C')}**, compared with **${formatMetric(outdoor.temperature, ' C')}** outdoors.`);
    }

    if (Number.isFinite(averageHumidity) && mostHumidRoom) {
        lines.push(`- Average indoor humidity is **${formatMetric(averageHumidity, '%', 0)}**. The most humid room is **${mostHumidRoom.boxId}** at **${formatMetric(mostHumidRoom.humidity, '%', 0)}**.`);
    }

    lines.push('', '## Risk Areas');

    if (topRiskRoom?.moldRisk.level === 'high') {
        lines.push(`- **${topRiskRoom.boxId}** is in the **high mold-risk range** with **${formatMetric(topRiskRoom.humidity, '%', 0)}** humidity and a dew point near **${formatMetric(topRiskRoom.moldRisk.dewPoint, ' C')}**.`);
    } else if (topRiskRoom?.moldRisk.level === 'medium') {
        lines.push(`- No room is critical, but **${topRiskRoom.boxId}** is the main watch area at **${formatMetric(topRiskRoom.humidity, '%', 0)}** humidity.`);
    } else {
        lines.push('- Mold risk is currently low across the mock rooms. Humidity levels are staying below the usual warning band.');
    }

    if (Number.isFinite(outdoor.humidity)) {
        lines.push(`- Outdoor humidity is around **${formatMetric(outdoor.humidity, '%', 0)}**. Ventilation is most useful when indoor humidity stays above that level.`);
    }

    lines.push('', '## Patterns');

    if (trendLines.length) {
        lines.push(...trendLines);
    } else {
        lines.push('- Recent mock trends are relatively stable, with no sharp temperature or humidity swings in the selected window.');
    }

    const brightRoom = getExtremeBox(rooms, 'light');
    if (brightRoom) {
        lines.push(`- Brightest room right now: **${brightRoom.boxId}** at **${formatMetric(brightRoom.light, ' lx', 0)}**.`);
    }

    return lines.join('\n');
}

function buildMockOverviewResponse(snapshot) {
    const averageTemperature = getAverageMetric(snapshot, 'temperature');
    const averageHumidity = getAverageMetric(snapshot, 'humidity');
    const warmestRoom = getExtremeBox(snapshot, 'temperature');
    const outdoor = getMockOutdoorSnapshot();

    return `Mock snapshot: **${snapshot.length} rooms** are active. Average indoor temperature is **${formatMetric(averageTemperature, ' C')}** and average humidity is **${formatMetric(averageHumidity, '%', 0)}**. The warmest room is **${warmestRoom?.boxId || 'n/a'}**, and outdoor humidity is about **${formatMetric(outdoor.humidity, '%', 0)}**.`;
}

function buildTemperatureResponse(snapshot) {
    const warmestRoom = getExtremeBox(snapshot, 'temperature');
    const parts = snapshot
        .filter((box) => Number.isFinite(box.temperature))
        .map((box) => `**${box.boxId}** ${formatMetric(box.temperature, ' C')}`);

    if (!parts.length) {
        return 'No mock temperature readings are available right now.';
    }

    return `Current mock temperatures: ${parts.join(', ')}. Warmest room: **${warmestRoom?.boxId || 'n/a'}**.`;
}

function buildHumidityResponse(snapshot) {
    const mostHumidRoom = getExtremeBox(snapshot, 'humidity');
    const parts = snapshot
        .filter((box) => Number.isFinite(box.humidity))
        .map((box) => `**${box.boxId}** ${formatMetric(box.humidity, '%', 0)}`);

    if (!parts.length) {
        return 'No mock humidity readings are available right now.';
    }

    return `Current indoor humidity: ${parts.join(', ')}. Highest humidity is in **${mostHumidRoom?.boxId || 'n/a'}**.`;
}

function buildOutdoorHumidityResponse() {
    const outdoor = getMockOutdoorSnapshot();
    return `Mock outdoor humidity is about **${formatMetric(outdoor.humidity, '%', 0)}**, with an outdoor temperature near **${formatMetric(outdoor.temperature, ' C')}**.`;
}

function buildWarmestRoomResponse(snapshot) {
    const warmestRoom = getExtremeBox(snapshot, 'temperature');
    const coolestRoom = getExtremeBox(snapshot, 'temperature', 'min');

    if (!warmestRoom) {
        return 'I do not have any mock temperature data to compare yet.';
    }

    return `The warmest mock room right now is **${warmestRoom.boxId}** at **${formatMetric(warmestRoom.temperature, ' C')}**. The coolest room is **${coolestRoom?.boxId || 'n/a'}** at **${formatMetric(coolestRoom?.temperature, ' C')}**.`;
}

function buildMoldRiskResponse(snapshot) {
    const riskRooms = getMoldRiskRooms(snapshot);
    const topRiskRoom = riskRooms[0];

    if (!topRiskRoom) {
        return 'I do not have enough mock humidity data to estimate mold risk right now.';
    }

    if (topRiskRoom.moldRisk.level === 'high') {
        return `Highest mold risk is in **${topRiskRoom.boxId}**. It is sitting at **${formatMetric(topRiskRoom.humidity, '%', 0)}** humidity with a dew point near **${formatMetric(topRiskRoom.moldRisk.dewPoint, ' C')}**, which is in the high-risk band.`;
    }

    if (topRiskRoom.moldRisk.level === 'medium') {
        return `No mock room is in the critical band, but **${topRiskRoom.boxId}** is the main watch area at **${formatMetric(topRiskRoom.humidity, '%', 0)}** humidity.`;
    }

    return 'Mold risk is low across the current mock boxes. None of the rooms are sitting in a sustained high-humidity range.';
}

function buildPressureResponse(snapshot) {
    const parts = snapshot
        .filter((box) => Number.isFinite(box.pressure))
        .map((box) => `**${box.boxId}** ${formatMetric(box.pressure, ' hPa', 0)}`);

    if (!parts.length) {
        return 'No mock pressure readings are available right now.';
    }

    return `Current mock pressure readings: ${parts.join(', ')}.`;
}

function buildLightResponse(snapshot) {
    const brightestRoom = getExtremeBox(snapshot, 'light');

    if (!brightestRoom) {
        return 'No mock light readings are available right now.';
    }

    return `The brightest mock room is **${brightestRoom.boxId}** at **${formatMetric(brightestRoom.light, ' lx', 0)}**.`;
}

function buildHelpResponse() {
    return 'I can answer mock-box questions about **temperature**, **humidity**, **mold risk**, **warmest room**, **pressure**, **light**, and **outdoor humidity** while dev mode is enabled.';
}

function buildMockChatResponse(message) {
    const normalizedMessage = String(message || '').trim().toLowerCase();
    const snapshot = getIndoorSnapshot();

    if (!snapshot.length) {
        return 'No mock sensor data is available right now.';
    }

    if (/^(hi|hello|hey)\b/.test(normalizedMessage)) {
        return `Hi. ${buildMockOverviewResponse(snapshot)}`;
    }

    if (/help|what can you do/.test(normalizedMessage)) {
        return buildHelpResponse();
    }

    if (/mold|dew point|moisture/.test(normalizedMessage)) {
        return buildMoldRiskResponse(snapshot);
    }

    if (/warmest|hottest/.test(normalizedMessage)) {
        return buildWarmestRoomResponse(snapshot);
    }

    if (/coldest|coolest/.test(normalizedMessage)) {
        const coolestRoom = getExtremeBox(snapshot, 'temperature', 'min');
        const warmestRoom = getExtremeBox(snapshot, 'temperature');
        return `The coolest mock room is **${coolestRoom?.boxId || 'n/a'}** at **${formatMetric(coolestRoom?.temperature, ' C')}**. The warmest is **${warmestRoom?.boxId || 'n/a'}** at **${formatMetric(warmestRoom?.temperature, ' C')}**.`;
    }

    if ((/outside|outdoor/.test(normalizedMessage)) && /humidity|humid/.test(normalizedMessage)) {
        return buildOutdoorHumidityResponse();
    }

    if (/temperature|temp/.test(normalizedMessage)) {
        return buildTemperatureResponse(snapshot);
    }

    if (/humidity|humid/.test(normalizedMessage)) {
        return buildHumidityResponse(snapshot);
    }

    if (/pressure/.test(normalizedMessage)) {
        return buildPressureResponse(snapshot);
    }

    if (/light|bright|dark/.test(normalizedMessage)) {
        return buildLightResponse(snapshot);
    }

    if (/summary|overview|status|room|box/.test(normalizedMessage)) {
        return buildMockOverviewResponse(snapshot);
    }

    return `${buildMockOverviewResponse(snapshot)} ${buildHelpResponse()}`;
}

function readConversations() {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[MockAI] Failed to read saved conversations:', error);
        return [];
    }
}

function writeConversations(conversations) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function createConversationId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildConversationTitle(message) {
    const trimmed = String(message || '').trim() || 'New Chat';
    return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}

export function storeLocalConversationExchange({
    conversationId = null,
    message,
    response,
    conversationHistory = null,
}) {
    const conversations = readConversations();
    const now = new Date().toISOString();
    const userMessage = { role: 'user', text: String(message || ''), created_at: now };
    const assistantMessage = { role: 'ai', text: String(response || ''), created_at: now };

    let conversation = conversationId
        ? conversations.find((entry) => entry.id === conversationId)
        : null;

    if (!conversation) {
        conversation = {
            id: createConversationId(),
            title: buildConversationTitle(message),
            messages: [],
            conversation_history: [],
            created_at: now,
            updated_at: now,
        };
        conversations.unshift(conversation);
    }

    conversation.messages = [...conversation.messages, userMessage, assistantMessage];
    conversation.conversation_history = Array.isArray(conversationHistory)
        ? conversationHistory
        : [...conversation.messages];
    conversation.updated_at = now;

    writeConversations(conversations);

    return {
        conversationId: conversation.id,
        conversation,
    };
}

export function mockAnalyze(sensorSummary, weatherSummary, timeRange) {
    return {
        analysis: buildMockAnalysis(sensorSummary, weatherSummary, timeRange),
    };
}

export function mockChat(message, conversationId = null) {
    const response = buildMockChatResponse(message);
    const storedConversation = storeLocalConversationExchange({
        conversationId,
        message,
        response,
    });

    return {
        response,
        conversationHistory: storedConversation.conversation.conversation_history,
        conversationId: storedConversation.conversationId,
    };
}

export function mockListConversations() {
    return readConversations()
        .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at))
        .map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            message_count: Array.isArray(conversation.messages) ? conversation.messages.length : 0,
        }));
}

export function mockGetConversation(id) {
    return readConversations().find((conversation) => conversation.id === id) || null;
}

export function mockDeleteConversation(id) {
    const conversations = readConversations();
    const filtered = conversations.filter((conversation) => conversation.id !== id);

    if (filtered.length === conversations.length) {
        return false;
    }

    writeConversations(filtered);
    return true;
}

export function mockGetStatus() {
    return {
        available: true,
        model: 'mock-dev-assistant',
    };
}
