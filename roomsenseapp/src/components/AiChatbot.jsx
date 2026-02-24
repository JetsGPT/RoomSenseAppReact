import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Leaf, User, AlertCircle } from 'lucide-react';
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

export default function AiChatbot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conversationHistory, setConversationHistory] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Don't render if not logged in
    if (!user) return null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

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
            const result = await aiAPI.chat(messageText, conversationHistory);

            // Add AI response
            const aiMsg = { id: Date.now() + 1, role: 'ai', text: result.response };
            setMessages(prev => [...prev, aiMsg]);
            setConversationHistory(result.conversationHistory || []);
        } catch (err) {
            console.error('[AiChatbot] Error:', err);
            const errorMsg = err.response?.status === 503
                ? 'AI service is not configured yet. Ask your admin to set the Gemini API key in Settings.'
                : err.response?.data?.error || 'Something went wrong. Please try again.';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, conversationHistory]);

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
    };

    // Simple markdown-like bold rendering (**text**)
    const renderText = (text) => {
        if (!text) return '';
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

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
                            <button
                                className="chat-header-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
