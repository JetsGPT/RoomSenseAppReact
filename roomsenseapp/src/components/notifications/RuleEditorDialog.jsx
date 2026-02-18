import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { useConnections } from '@/contexts/ConnectionsContext';
import { Loader2, Bell, Globe, Lock, Code } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────
const METRICS = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'humidity', label: 'Humidity (%)' },
    { value: 'co2', label: 'CO₂ (ppm)' },
    { value: 'voc', label: 'VOC Index' },
    { value: 'pm25', label: 'PM2.5 (µg/m³)' },
];

const METRIC_LABELS = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO₂',
    voc: 'VOC',
    pm25: 'PM2.5',
};

const OPERATORS = [
    { value: '>', label: '> Greater than' },
    { value: '<', label: '< Less than' },
    { value: '>=', label: '>= Greater or equal' },
    { value: '<=', label: '<= Less or equal' },
    { value: '==', label: '== Equal to' },
    { value: '!=', label: '!= Not equal to' },
];

const HTTP_METHODS = [
    { value: 'POST', label: 'POST' },
    { value: 'GET', label: 'GET' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
];

const DEFAULT_FORM = {
    name: '',
    notification_provider: 'ntfy',
    sensor_id: '',
    sensor_type: '',
    condition: '>',
    threshold: '',
    notification_target: '',
    cooldown_minutes: '15',
    // Webhook-specific
    webhook_http_method: 'POST',
    webhook_auth_header: '',
    webhook_payload: '',
};

/**
 * Unified dialog for creating / editing notification + webhook rules.
 */
export function RuleEditorDialog({ open, onOpenChange, editingRule, onSave }) {
    const { activeConnections } = useConnections();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [payloadError, setPayloadError] = useState('');

    const isEdit = Boolean(editingRule);
    const isWebhook = form.notification_provider === 'webhook';

    // ── Populate form on edit ─────────────────────────────────────
    useEffect(() => {
        if (editingRule) {
            setForm({
                name: editingRule.name || '',
                notification_provider: editingRule.notification_provider || 'ntfy',
                sensor_id: editingRule.sensor_id || '',
                sensor_type: editingRule.sensor_type || '',
                condition: editingRule.condition || '>',
                threshold: String(editingRule.threshold ?? ''),
                notification_target: editingRule.notification_target || '',
                cooldown_minutes: String(
                    editingRule.cooldown_seconds != null
                        ? Math.round(editingRule.cooldown_seconds / 60)
                        : '15'
                ),
                webhook_http_method: editingRule.webhook_http_method || 'POST',
                webhook_auth_header: editingRule.webhook_auth_header || '',
                webhook_payload: editingRule.webhook_payload
                    ? (typeof editingRule.webhook_payload === 'string'
                        ? editingRule.webhook_payload
                        : JSON.stringify(editingRule.webhook_payload, null, 2))
                    : '',
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setPayloadError('');
    }, [editingRule, open]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));

        if (field === 'webhook_payload') {
            if (!value.trim()) {
                setPayloadError('');
            } else {
                try { JSON.parse(value); setPayloadError(''); }
                catch { setPayloadError('Invalid JSON'); }
            }
        }

        // Clear target when switching providers
        if (field === 'notification_provider') {
            setForm(prev => ({ ...prev, [field]: value, notification_target: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cooldownMinutes = parseInt(form.cooldown_minutes, 10) || 15;
            const autoName = form.name.trim()
                || `${METRIC_LABELS[form.sensor_type] || form.sensor_type} ${isWebhook ? 'webhook' : 'alert'}`;

            // Parse custom payload if provided
            let webhookPayload = null;
            if (isWebhook && form.webhook_payload.trim()) {
                try {
                    webhookPayload = JSON.parse(form.webhook_payload);
                } catch {
                    setPayloadError('Invalid JSON — fix before saving');
                    setSaving(false);
                    return;
                }
            }

            const data = {
                name: autoName,
                sensor_id: form.sensor_id,
                sensor_type: form.sensor_type,
                condition: form.condition,
                threshold: parseFloat(form.threshold),
                notification_target: form.notification_target,
                notification_provider: form.notification_provider,
                cooldown_seconds: cooldownMinutes * 60,
            };

            if (isWebhook) {
                data.webhook_http_method = form.webhook_http_method;
                data.webhook_auth_header = form.webhook_auth_header.trim() || null;
                data.webhook_payload = webhookPayload;
            }

            await onSave(data);
            onOpenChange(false);
        } catch {
            // Error handled by parent via toast
        } finally {
            setSaving(false);
        }
    };

    const isValid = (() => {
        const base =
            form.sensor_id &&
            form.sensor_type &&
            form.condition &&
            form.threshold !== '' &&
            !isNaN(parseFloat(form.threshold)) &&
            form.notification_target.trim();

        if (!base) return false;

        if (isWebhook) {
            return form.notification_target.startsWith('https://') && !payloadError;
        }
        return true;
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Edit Rule' : 'New Rule'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the rule configuration.'
                            : 'Create a notification or webhook automation rule.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* ── Provider selector ──────────────────────── */}
                    <div className="space-y-2">
                        <Label>Rule Type</Label>
                        <div className="provider-toggle">
                            <button
                                type="button"
                                className={`provider-toggle-btn ${!isWebhook ? 'active' : ''}`}
                                onClick={() => handleFieldChange('notification_provider', 'ntfy')}
                            >
                                <Bell size={14} />
                                Notification
                            </button>
                            <button
                                type="button"
                                className={`provider-toggle-btn ${isWebhook ? 'active' : ''}`}
                                onClick={() => handleFieldChange('notification_provider', 'webhook')}
                            >
                                <Globe size={14} />
                                Webhook
                            </button>
                        </div>
                    </div>

                    {/* Rule Name */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-name">
                            Name <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="rule-name"
                            type="text"
                            placeholder={isWebhook ? 'e.g. Turn on fan when hot' : 'e.g. High humidity alert'}
                            value={form.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                        />
                    </div>

                    {/* Sensor */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-sensor">Sensor Box</Label>
                        <Select
                            value={form.sensor_id}
                            onValueChange={(v) => handleFieldChange('sensor_id', v)}
                        >
                            <SelectTrigger id="rule-sensor">
                                <SelectValue placeholder="Select a sensor box" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeConnections.map((conn) => (
                                    <SelectItem key={conn.address} value={conn.address}>
                                        {conn.name || conn.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Metric */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-metric">Metric</Label>
                        <Select
                            value={form.sensor_type}
                            onValueChange={(v) => handleFieldChange('sensor_type', v)}
                        >
                            <SelectTrigger id="rule-metric">
                                <SelectValue placeholder="Select metric" />
                            </SelectTrigger>
                            <SelectContent>
                                {METRICS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Condition + Threshold */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="rule-operator">Condition</Label>
                            <Select
                                value={form.condition}
                                onValueChange={(v) => handleFieldChange('condition', v)}
                            >
                                <SelectTrigger id="rule-operator">
                                    <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {OPERATORS.map((op) => (
                                        <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-threshold">Threshold</Label>
                            <Input
                                id="rule-threshold"
                                type="number"
                                step="any"
                                placeholder="e.g. 25"
                                value={form.threshold}
                                onChange={(e) => handleFieldChange('threshold', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ── ntfy target ───────────────────────────── */}
                    {!isWebhook && (
                        <div className="space-y-2">
                            <Label htmlFor="rule-topic">ntfy Topic</Label>
                            <Input
                                id="rule-topic"
                                type="text"
                                placeholder="e.g. roomsense-alerts"
                                value={form.notification_target}
                                onChange={(e) => handleFieldChange('notification_target', e.target.value)}
                            />
                        </div>
                    )}

                    {/* ── Webhook fields ────────────────────────── */}
                    {isWebhook && (
                        <div className="rule-webhook-section">
                            {/* URL */}
                            <div className="space-y-2">
                                <Label htmlFor="rule-url">Webhook URL</Label>
                                <Input
                                    id="rule-url"
                                    type="url"
                                    placeholder="https://api.example.com/webhook"
                                    value={form.notification_target}
                                    onChange={(e) => handleFieldChange('notification_target', e.target.value)}
                                    className="font-mono text-xs"
                                />
                                {form.notification_target && !form.notification_target.startsWith('https://') && (
                                    <p className="text-xs text-destructive">URL must start with https://</p>
                                )}
                            </div>

                            {/* HTTP Method */}
                            <div className="space-y-2">
                                <Label htmlFor="rule-method">HTTP Method</Label>
                                <Select
                                    value={form.webhook_http_method}
                                    onValueChange={(v) => handleFieldChange('webhook_http_method', v)}
                                >
                                    <SelectTrigger id="rule-method">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {HTTP_METHODS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Auth Header */}
                            <div className="space-y-2">
                                <Label htmlFor="rule-auth" className="flex items-center gap-1.5">
                                    <Lock size={12} />
                                    Auth Header <span className="text-muted-foreground text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="rule-auth"
                                    type="text"
                                    placeholder="Bearer my-token or X-API-Key: my-key"
                                    value={form.webhook_auth_header}
                                    onChange={(e) => handleFieldChange('webhook_auth_header', e.target.value)}
                                    className="font-mono text-xs"
                                />
                            </div>

                            {/* Custom Payload */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Code size={12} />
                                    Custom Payload <span className="text-muted-foreground text-xs">(optional)</span>
                                </Label>
                                <textarea
                                    className="rule-payload-editor"
                                    placeholder={'{\n  "action": "turn_on",\n  "device": "fan"\n}'}
                                    value={form.webhook_payload}
                                    onChange={(e) => handleFieldChange('webhook_payload', e.target.value)}
                                    rows={4}
                                />
                                {payloadError && (
                                    <p className="text-xs text-destructive">{payloadError}</p>
                                )}
                                <p className="text-[11px] text-muted-foreground">
                                    Leave empty for auto-generated JSON with sensor data.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cooldown */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-cooldown">Cooldown (minutes)</Label>
                        <Input
                            id="rule-cooldown"
                            type="number"
                            min="1"
                            placeholder="15"
                            value={form.cooldown_minutes}
                            onChange={(e) => handleFieldChange('cooldown_minutes', e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isValid || saving} className="gap-1.5">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default RuleEditorDialog;
