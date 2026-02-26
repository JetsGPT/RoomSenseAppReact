import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Info, CheckCircle2, XCircle, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { notificationsAPI } from '@/services/notificationsAPI';
import '@/styles/notifications.css';

// ── Mock data (shown when backend is unavailable) ────────────────
const MOCK_NOTIFICATIONS = [
    {
        id: 'mock-1',
        sensor_type: 'temperature',
        sensor_id: 'living-room',
        sensor_value: 31.2,
        status: 'sent',
        notification_target: 'roomsense-alerts',
        sent_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        _title: 'High Temperature Alert',
        _message: 'Living Room Temp > 30°C',
        _read: false,
    },
    {
        id: 'mock-2',
        sensor_type: 'humidity',
        sensor_id: 'bedroom',
        sensor_value: 22,
        status: 'sent',
        notification_target: 'roomsense-alerts',
        sent_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        _title: 'Humidity Alert',
        _message: 'Bedroom humidity dropped below 25%',
        _read: false,
    },
    {
        id: 'mock-3',
        sensor_type: 'temperature',
        sensor_id: 'kitchen',
        sensor_value: 24.5,
        status: 'sent',
        notification_target: 'roomsense-alerts',
        sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        _title: 'Box Reconnected',
        _message: 'Kitchen Box is back online after 4h downtime',
        _read: false,
    },
    {
        id: 'mock-4',
        sensor_type: 'co2',
        sensor_id: 'office',
        sensor_value: 1200,
        status: 'failed',
        notification_target: 'roomsense-alerts',
        sent_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        _title: 'CO₂ Level Critical',
        _message: 'Office CO₂ sensor reading above 1000 ppm',
        _read: true,
    },
];

const METRIC_LABELS = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO₂',
    voc: 'VOC',
    pm25: 'PM2.5',
};

const METRIC_UNITS = {
    temperature: '°C',
    humidity: '%',
    co2: 'ppm',
    voc: '',
    pm25: 'µg/m³',
};

// ── Helpers ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function entryIcon(entry) {
    if (entry.status === 'failed') return <XCircle size={16} className="text-destructive shrink-0" />;
    if (entry.sensor_type === 'temperature') return <Thermometer size={16} className="text-orange-500 shrink-0" />;
    if (entry.status === 'sent') return <CheckCircle2 size={16} className="text-green-500 shrink-0" />;
    return <Info size={16} className="text-blue-500 shrink-0" />;
}

function entryTitle(entry) {
    if (entry._title) return entry._title;
    const metric = METRIC_LABELS[entry.sensor_type] || entry.sensor_type;
    return `${metric} Alert`;
}

function entryMessage(entry) {
    if (entry._message) return entry._message;
    const unit = METRIC_UNITS[entry.sensor_type] || '';
    return `${entry.sensor_id}: ${entry.sensor_value}${unit}`;
}

// ── Component ────────────────────────────────────────────────────
export default function NotificationBell() {
    const [items, setItems] = useState([]);
    const [readIds, setReadIds] = useState(new Set());
    const [open, setOpen] = useState(false);

    // Fetch history from API; fall back to mock data
    const fetchData = useCallback(async () => {
        try {
            const data = await notificationsAPI.getHistory({ limit: 10 });
            const list = Array.isArray(data?.history) ? data.history : Array.isArray(data) ? data : [];
            if (list.length > 0) {
                setItems(list);
                return;
            }
        } catch {
            // API not available – use mock data
        }
        setItems(MOCK_NOTIFICATIONS);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const unreadCount = items.filter(
        (n) => !(n._read || readIds.has(n.id))
    ).length;

    const markAllRead = () => {
        setReadIds(new Set(items.map((n) => n.id)));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    aria-label="Notifications"
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="notification-bell-badge">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="notification-bell-dropdown w-[360px] p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={markAllRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="notification-bell-list">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                            <Bell size={32} className="mb-2 opacity-40" />
                            No notifications yet
                        </div>
                    ) : (
                        items.map((entry) => {
                            const isRead = entry._read || readIds.has(entry.id);
                            return (
                                <div
                                    key={entry.id}
                                    className={`notification-bell-item ${isRead ? 'read' : ''}`}
                                    onClick={() =>
                                        setReadIds((prev) => new Set([...prev, entry.id]))
                                    }
                                >
                                    <div className="mt-0.5">{entryIcon(entry)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground leading-tight">
                                            {entryTitle(entry)}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                                            {entryMessage(entry)}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground/70 mt-1">
                                            {entry.sent_at ? timeAgo(entry.sent_at) : '—'}
                                        </div>
                                    </div>
                                    {!isRead && (
                                        <span className="notification-bell-unread-dot" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2">
                    <Link
                        to="/notifications"
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                        onClick={() => setOpen(false)}
                    >
                        View all notifications →
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
