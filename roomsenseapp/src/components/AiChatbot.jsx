import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Leaf, User, AlertCircle, Clock, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { aiAPI } from '../services/aiAPI';
import { useAuth } from '../contexts/AuthContext';

const PERSONA = {
    name: 'Sage',
    emoji: '🌿',
    greeting: "Hi! I'm Sage, your smart home assistant.",
    subtitle: 'Ask me about temperatures, humidity, mold risk, or anything about your home sensors.',
};

const SUGGESTIONS = [
    "What's the temperature everywhere?",
    "Is there any mold risk?",
    "Which room is warmest?",
    "How humid is it outside?",
];

/** Format a date as relative time (e.g. "2 min ago", "3 days ago") */
function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
}

export default function AiChatbot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeConversationId, setActiveConversationId] = useState(null);

    // History sidebar
    const [showHistory, setShowHistory] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen && inputRef.current && !showHistory) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, showHistory]);

    // Load conversations when history panel opens
    useEffect(() => {
        if (showHistory) {
            loadConversations();
        }
    }, [showHistory]);

    const loadConversations = async () => {
        setLoadingConversations(true);
        try {
            const data = await aiAPI.listConversations();
            setConversations(data);
        } catch (err) {
            console.error('[AiChatbot] Failed to load conversations:', err);
        } finally {
            setLoadingConversations(false);
        }
    };

    const loadConversation = async (id) => {
        try {
            const data = await aiAPI.getConversation(id);
            setMessages(
                (data.messages || []).map((m, i) => ({
                    id: Date.now() + i,
                    role: m.role,
                    text: m.text,
                }))
            );
            setActiveConversationId(id);
            setShowHistory(false);
            setError(null);
        } catch (err) {
            console.error('[AiChatbot] Failed to load conversation:', err);
            setError('Failed to load conversation.');
        }
    };

    const deleteConversation = async (id) => {
        setDeletingId(id);
        try {
            await aiAPI.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            // If deleting the active conversation, reset to new chat
            if (id === activeConversationId) {
                startNewChat();
            }
        } catch (err) {
            console.error('[AiChatbot] Failed to delete conversation:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setActiveConversationId(null);
        setError(null);
        setShowHistory(false);
    };

    const handleSend = useCallback(async (text) => {
        const messageText = (text || inputValue).trim();
        if (!messageText || isLoading) return;

        setInputValue('');
        setError(null);

        // Add user message
        const userMsg = { id: Date.now(), role: 'user', text: messageText };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const result = await aiAPI.chat(messageText, activeConversationId);

            // Force response to string
            let responseText = result.response;
            if (typeof responseText !== 'string') {
                responseText = responseText?.text || responseText?.message || JSON.stringify(responseText) || 'No response received.';
            }

            // Add AI response
            const aiMsg = { id: Date.now() + 1, role: 'ai', text: String(responseText) };
            setMessages(prev => [...prev, aiMsg]);

            // Track conversation ID and refresh history
            if (result.conversationId) {
                setActiveConversationId(result.conversationId);
                // Silently refresh conversations list in background
                aiAPI.listConversations().then(data => setConversations(data)).catch(() => { });
            }
        } catch (err) {
            console.error('[AiChatbot] Error:', err);
            let errorMsg;
            if (err.response?.status === 503) {
                errorMsg = 'AI service is not configured yet. Ask your admin to set the Gemini API key in Settings.';
            } else {
                const raw = err.response?.data?.error;
                errorMsg = (typeof raw === 'string') ? raw : (raw?.message || JSON.stringify(raw) || 'Something went wrong.');
                if (err.response?.data?.details) {
                    errorMsg += ` (${String(err.response.data.details)})`;
                }
            }
            setError(String(errorMsg));
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, activeConversationId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (text) => {
        handleSend(text);
    };

    const toggleChat = () => {
        setIsOpen(prev => !prev);
        if (showHistory) setShowHistory(false);
    };

    // Simple markdown-like bold rendering (**text**)
    const renderText = (text) => {
        if (!text) return '';
        const str = typeof text === 'string' ? text : String(text);
        const parts = str.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    // Don't render if not logged in (placed after all hooks to satisfy React rules)
    if (!user) return null;

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                className={`chat-fab ${isOpen ? 'is-open' : 'chat-fab-pulse'}`}
                onClick={toggleChat}
                whileTap={{ scale: 0.92 }}
                aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
                id="ai-chat-fab"
            >
                <span className="fab-icon">
                    {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                </span>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chat-window"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        {/* Header */}
                        <div className="chat-header">
                            <div className="chat-avatar">{PERSONA.emoji}</div>
                            <div className="chat-header-info">
                                <div className="chat-header-name">{PERSONA.name}</div>
                                <div className="chat-header-status">
                                    <span className="chat-status-dot" />
                                    RoomSense AI Assistant
                                </div>
                            </div>
                            <div className="chat-header-actions">
                                <button
                                    className="chat-header-btn"
                                    onClick={startNewChat}
                                    aria-label="New chat"
                                    title="New chat"
                                    id="ai-new-chat"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    className={`chat-header-btn ${showHistory ? 'is-active' : ''}`}
                                    onClick={() => setShowHistory(prev => !prev)}
                                    aria-label="Chat history"
                                    title="Chat history"
                                    id="ai-chat-history-toggle"
                                >
                                    <Clock size={16} />
                                </button>
                                <button
                                    className="chat-header-btn"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close chat"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* History Sidebar */}
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    className="chat-history-panel"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="chat-history-header">
                                        <button
                                            className="chat-history-back"
                                            onClick={() => setShowHistory(false)}
                                            aria-label="Back to chat"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <span className="chat-history-title">Chat History</span>
                                    </div>

                                    <div className="chat-history-list">
                                        {loadingConversations ? (
                                            <div className="chat-history-empty">Loading...</div>
                                        ) : conversations.length === 0 ? (
                                            <div className="chat-history-empty">
                                                No past chats yet.
                                                <br />
                                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                    Start a conversation and it will appear here.
                                                </span>
                                            </div>
                                        ) : (
                                            conversations.map(conv => (
                                                <motion.div
                                                    key={conv.id}
                                                    className={`chat-history-item ${conv.id === activeConversationId ? 'is-active' : ''}`}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    layout
                                                >
                                                    <button
                                                        className="chat-history-item-content"
                                                        onClick={() => loadConversation(conv.id)}
                                                    >
                                                        <span className="chat-history-item-title">
                                                            {conv.title || 'Untitled'}
                                                        </span>
                                                        <span className="chat-history-item-meta">
                                                            {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''} · {timeAgo(conv.updated_at)}
                                                        </span>
                                                    </button>
                                                    <button
                                                        className="chat-history-item-delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteConversation(conv.id);
                                                        }}
                                                        disabled={deletingId === conv.id}
                                                        aria-label="Delete conversation"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages (hidden when history is open) */}
                        {!showHistory && (
                            <>
                                <div className="chat-messages">
                                    {messages.length === 0 && !isLoading ? (
                                        /* Welcome State */
                                        <div className="chat-welcome">
                                            <motion.div
                                                className="chat-welcome-avatar"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                                            >
                                                {PERSONA.emoji}
                                            </motion.div>
                                            <motion.h3
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.25 }}
                                            >
                                                {PERSONA.greeting}
                                            </motion.h3>
                                            <motion.p
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.35 }}
                                            >
                                                {PERSONA.subtitle}
                                            </motion.p>
                                            <motion.div
                                                className="chat-suggestions"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.45 }}
                                            >
                                                {SUGGESTIONS.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        className="chat-suggestion"
                                                        onClick={() => handleSuggestion(s)}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map((msg) => (
                                                <motion.div
                                                    key={msg.id}
                                                    className={`chat-message is-${msg.role === 'user' ? 'user' : 'ai'}`}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="chat-message-avatar">
                                                        {msg.role === 'ai' ? <Leaf size={14} /> : <User size={14} />}
                                                    </div>
                                                    <div className="chat-bubble">
                                                        {renderText(msg.text)}
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Typing indicator */}
                                            {isLoading && (
                                                <motion.div
                                                    className="chat-typing"
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                >
                                                    <div className="chat-message-avatar" style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--tea-green), var(--moss-green))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                                    }}>
                                                        <Leaf size={14} />
                                                    </div>
                                                    <div className="chat-typing-dots">
                                                        <span className="chat-typing-dot" />
                                                        <span className="chat-typing-dot" />
                                                        <span className="chat-typing-dot" />
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Error */}
                                            {error && (
                                                <motion.div
                                                    className="chat-error"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                >
                                                    <AlertCircle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                                                    {error}
                                                </motion.div>
                                            )}
                                        </>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="chat-input-area">
                                    <textarea
                                        ref={inputRef}
                                        className="chat-input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask Sage something..."
                                        rows={1}
                                        disabled={isLoading}
                                        id="ai-chat-input"
                                    />
                                    <button
                                        className="chat-send-btn"
                                        onClick={() => handleSend()}
                                        disabled={!inputValue.trim() || isLoading}
                                        aria-label="Send message"
                                        id="ai-chat-send"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
