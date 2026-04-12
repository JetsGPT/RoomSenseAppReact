/**
 * AI Chat Routes
 *
 * REST endpoints for AI-powered chat with real-time sensor data access,
 * plus conversation persistence (list, get, delete, continue).
 */

import express from 'express';
import { requireLogin } from '../auth/auth.js';
import aiService from '../services/AiService.js';
import chatService from '../services/ChatService.js';

const router = express.Router();
const DEV_AI_HEADER = 'X-RoomSense-Dev-AI';
const DEV_AI_SOURCE = 'mock-dev';
const DEV_AI_ORIGIN_PATTERNS = [
    /^https?:\/\/localhost(?::\d+)?$/i,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
    /^https?:\/\/192\.168\.\d+\.\d+(?::\d+)?$/i,
    /^https?:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/i,
    /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(?::\d+)?$/i,
];

function isObjectPayload(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLocalDevOrigin(value) {
    let normalizedValue = String(value || '').trim();

    try {
        normalizedValue = new URL(normalizedValue).origin;
    } catch {
        // Keep the original string when it is already an origin-like value.
    }

    return DEV_AI_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function getDevRequestOrigin(req) {
    return req.get('Origin') || req.get('Referer') || '';
}

function isAllowedDevAiRequest(req) {
    if (req.session?.user) {
        return false;
    }

    if (req.get(DEV_AI_HEADER) !== '1') {
        return false;
    }

    return isLocalDevOrigin(getDevRequestOrigin(req));
}

function getAiAccess(req, { requireContext = false } = {}) {
    if (req.session?.user) {
        return {
            mode: 'authenticated',
            user: req.session.user,
        };
    }

    if (!isAllowedDevAiRequest(req)) {
        return null;
    }

    if (requireContext) {
        const context = req.body?.context;
        if (!isObjectPayload(context) || context.source !== DEV_AI_SOURCE) {
            return null;
        }
    }

    return {
        mode: 'dev-context',
        user: {
            id: 'dev-mock-user',
            username: 'dev-mock-user',
            role: 'admin',
        },
    };
}

// ========================================================================
// Chat
// ========================================================================

/**
 * POST /api/ai/chat
 *
 * Send a message to the AI and get a response.
 * If conversationId is provided, continues that conversation.
 * If not, creates a new conversation automatically.
 *
 * Request body:
 *   { message: string, conversationId?: string }
 *
 * Response:
 *   { response: string, conversationHistory: Array, conversationId: string }
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationId, conversationHistory, context } = req.body;
        const access = getAiAccess(req, { requireContext: true });

        if (!access) {
            return res.status(401).json({ error: 'You must be logged in' });
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
        }

        const userId = access.user.id;
        const isDevContextRequest = access.mode === 'dev-context';
        const pool = req.app.locals.pool;

        console.log(`[AI] Chat request from user ${userId}: "${message.substring(0, 80)}..."`);

        if (isDevContextRequest) {
            const result = await aiService.chat(
                message.trim(),
                Array.isArray(conversationHistory) ? conversationHistory : [],
                userId,
                context
            );

            return res.status(200).json({
                response: result.response,
                conversationHistory: result.conversationHistory,
                conversationId: conversationId || null,
            });
        }

        // Load existing conversation or prepare a new one
        let existingConversation = null;
        let persistedConversationHistory = [];
        let displayMessages = [];

        if (conversationId) {
            existingConversation = await chatService.getConversation(pool, userId, conversationId);
            if (!existingConversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            persistedConversationHistory = existingConversation.conversation_history || [];
            displayMessages = existingConversation.messages || [];
        }

        const result = await aiService.chat(
            message.trim(),
            persistedConversationHistory,
            userId
        );

        const now = new Date().toISOString();
        displayMessages = [
            ...displayMessages,
            { role: 'user', text: message.trim(), timestamp: now },
            { role: 'ai', text: result.response, timestamp: now }
        ];

        const title = displayMessages.length === 2
            ? message.trim().substring(0, 80)
            : undefined;

        let activeConversationId;
        if (existingConversation) {
            await chatService.updateConversation(
                pool, userId, conversationId,
                displayMessages, result.conversationHistory, title
            );
            activeConversationId = conversationId;
        } else {
            const newConv = await chatService.createConversation(
                pool, userId,
                message.trim().substring(0, 80)
            );
            await chatService.updateConversation(
                pool, userId, newConv.id,
                displayMessages, result.conversationHistory
            );
            activeConversationId = newConv.id;
        }

        res.status(200).json({
            response: result.response,
            conversationHistory: result.conversationHistory,
            conversationId: activeConversationId
        });

    } catch (error) {
        console.error('[AI] Chat error:', error);

        if (error.message?.includes('API key')) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
});

// ========================================================================
// Insights & Analysis
// ========================================================================

/**
 * POST /api/ai/analyze
 *
 * Analyze sensor and weather data over a specific time range to generate insights.
 *
 * Request body:
 *   { sensorData: Array|Object, weatherData: Array|Object, timeRange: string }
 *
 * Response:
 *   { analysis: string }
 */
router.post('/analyze', async (req, res) => {
    try {
        const access = getAiAccess(req, { requireContext: false });

        if (!access) {
            return res.status(401).json({ error: 'You must be logged in' });
        }

        const { sensorData, weatherData, timeRange } = req.body;

        if (!sensorData || (!Array.isArray(sensorData) && !isObjectPayload(sensorData))) {
            return res.status(400).json({ error: 'sensorData must be an array or summary object' });
        }
        if (!weatherData || (!Array.isArray(weatherData) && !isObjectPayload(weatherData))) {
            return res.status(400).json({ error: 'weatherData must be an array or summary object' });
        }
        if (!timeRange) {
            return res.status(400).json({ error: 'timeRange is required' });
        }

        const userId = access.user.id;
        console.log(`[AI] Analyze request from user ${userId} for time range: ${timeRange}`);

        const analysis = await aiService.analyzeOverview(
            sensorData,
            weatherData,
            timeRange
        );

        res.status(200).json({ analysis });

    } catch (error) {
        console.error('[AI] Analyze error:', error);

        if (error.message?.includes('API key')) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        res.status(500).json({ error: 'Failed to generate analysis', details: error.message });
    }
});

// ========================================================================
// Conversations CRUD
// ========================================================================

/**
 * GET /api/ai/conversations
 * List all conversations for the authenticated user.
 */
router.get('/conversations', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const pool = req.app.locals.pool;
        const conversations = await chatService.listConversations(pool, userId);
        res.status(200).json(conversations);
    } catch (error) {
        console.error('[AI] List conversations error:', error);
        res.status(500).json({ error: 'Failed to list conversations' });
    }
});

/**
 * GET /api/ai/conversations/:id
 * Get a single conversation with full messages.
 */
router.get('/conversations/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const pool = req.app.locals.pool;
        const conversation = await chatService.getConversation(pool, userId, req.params.id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.status(200).json(conversation);
    } catch (error) {
        console.error('[AI] Get conversation error:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
});

/**
 * DELETE /api/ai/conversations/:id
 * Delete a conversation.
 */
router.delete('/conversations/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const pool = req.app.locals.pool;
        const deleted = await chatService.deleteConversation(pool, userId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[AI] Delete conversation error:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// ========================================================================
// Status
// ========================================================================

/**
 * GET /api/ai/status
 * Check if the AI service is available and configured.
 */
router.get('/status', (req, res) => {
    const access = getAiAccess(req, { requireContext: false });
    if (!access) {
        return res.status(401).json({ error: 'You must be logged in' });
    }

    res.status(200).json({
        available: !!aiService.genAI,
        model: 'gemini-3-flash-preview'
    });
});

export default router;
