import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, HelpCircle } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { useComfortZones } from '../../hooks/useComfortZones';

/**
 * RoomScore Component
 * 
 * Displays overall room health score (0-100) with visual indicator
 * and plain English status message.
 */
export const RoomScore = memo(function RoomScore({
    readings,
    roomName = 'Your Room',
    showBar = true,
    size = 'default',
    className = ''
}) {
    const { calculateRoomScore, getScoreInfo, getRoomStatusMessage } = useComfortZones();

    const score = useMemo(() => calculateRoomScore(readings), [calculateRoomScore, readings]);
    const scoreInfo = useMemo(() => getScoreInfo(score), [getScoreInfo, score]);
    const statusMessage = useMemo(() => getRoomStatusMessage(score, roomName), [getRoomStatusMessage, score, roomName]);

    const ScoreIcon = scoreInfo.Icon || HelpCircle;

    const sizeClasses = {
        small: 'room-score-small',
        default: 'room-score-default',
        large: 'room-score-large'
    };

    return (
        <motion.div
            className={`room-score ${sizeClasses[size]} ${className}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Score circle */}
            <div className="room-score-circle" style={{ borderColor: scoreInfo.color }}>
                <ScoreIcon className="room-score-icon-svg" style={{ color: scoreInfo.color }} />
                {score !== null ? (
                    <NumberFlow value={score} className="room-score-value" />
                ) : (
                    <span className="room-score-value">—</span>
                )}
            </div>

            {/* Status text */}
            <div className="room-score-text">
                <div className="room-score-label" style={{ color: scoreInfo.color }}>
                    {scoreInfo.label}
                </div>
                <div className="room-score-message">
                    {statusMessage}
                </div>
            </div>

            {/* Progress bar */}
            {showBar && score !== null && (
                <div className="room-score-bar">
                    <motion.div
                        className="room-score-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{ backgroundColor: scoreInfo.color }}
                    />
                </div>
            )}
        </motion.div>
    );
});

/**
 * RoomScoreCompact Component
 * 
 * Smaller version for use in cards and lists.
 */
export const RoomScoreCompact = memo(function RoomScoreCompact({
    readings,
    roomName,
    className = ''
}) {
    const { calculateRoomScore, getScoreInfo } = useComfortZones();

    const score = useMemo(() => calculateRoomScore(readings), [calculateRoomScore, readings]);
    const scoreInfo = useMemo(() => getScoreInfo(score), [getScoreInfo, score]);

    const ScoreIcon = scoreInfo.Icon || HelpCircle;

    return (
        <div className={`room-score-compact ${className}`}>
            <ScoreIcon className="w-4 h-4" style={{ color: scoreInfo.color }} />
            <span className="room-score-compact-value" style={{ color: scoreInfo.color }}>
                {score !== null ? score : '—'}
            </span>
            <span className="room-score-compact-label">/100</span>
        </div>
    );
});

/**
 * TipsCard Component
 * 
 * Displays actionable tips based on sensor readings.
 */
export const TipsCard = memo(function TipsCard({
    readings,
    maxTips = 3,
    className = ''
}) {
    const { generateTips } = useComfortZones();

    const tips = useMemo(() => generateTips(readings).slice(0, maxTips), [generateTips, readings, maxTips]);

    if (tips.length === 0) {
        return (
            <motion.div
                className={`tips-card tips-card-empty ${className}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <Sparkles className="w-5 h-5 text-green-500" />
                <span className="tips-card-text">Everything looks good!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`tips-card ${className}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="tips-card-header">
                <span className="tips-card-title">💡 Suggestions</span>
            </div>
            <ul className="tips-card-list">
                {tips.map((tip, index) => {
                    const TipIcon = tip.Icon;
                    return (
                        <motion.li
                            key={index}
                            className={`tips-card-item tips-card-item-${tip.priority}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <TipIcon className="tips-card-item-icon w-5 h-5" />
                            <span className="tips-card-item-text">{tip.text}</span>
                        </motion.li>
                    );
                })}
            </ul>
        </motion.div>
    );
});

export default RoomScore;
