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
import { Loader2, Globe, Lock, Code, Zap } from 'lucide-react';

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
    sensor_id: '',
    sensor_type: '',
    condition: '>',
    threshold: '',
    notification_target: '',
    webhook_http_method: 'POST',
    webhook_auth_header: '',
    webhook_payload: '',
    cooldown_minutes: '5',
};

/**
 * Dialog for creating / editing a webhook automation rule.
 */
export function AutomationRuleEditor({ open, onOpenChange, editingRule, onSave }) {
    const { activeConnections } = useConnections();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [payloadError, setPayloadError] = useState('');

    const isEdit = Boolean(editingRule);

    // ── Populate form on edit ─────────────────────────────────────
    useEffect(() => {
        if (editingRule) {
            setForm({
                name: editingRule.name || '',
                sensor_id: editingRule.sensor_id || '',
                sensor_type: editingRule.sensor_type || '',
                condition: editingRule.condition || '>',
                threshold: String(editingRule.threshold ?? ''),
                notification_target: editingRule.notification_target || '',
                webhook_http_method: editingRule.webhook_http_method || 'POST',
                webhook_auth_header: editingRule.webhook_auth_header || '',
                webhook_payload: editingRule.webhook_payload
                    ? (typeof editingRule.webhook_payload === 'string'
                        ? editingRule.webhook_payload
                        : JSON.stringify(editingRule.webhook_payload, null, 2))
                    : '',
                cooldown_minutes: String(
                    editingRule.cooldown_seconds != null
                        ? Math.round(editingRule.cooldown_seconds / 60)
                        : '5'
                ),
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setPayloadError('');
    }, [editingRule, open]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));

        // Validate JSON payload live
        if (field === 'webhook_payload') {
            if (!value.trim()) {
                setPayloadError('');
            } else {
                try {
                    JSON.parse(value);
                    setPayloadError('');
                } catch {
                    setPayloadError('Invalid JSON');
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cooldownMinutes = parseInt(form.cooldown_minutes, 10) || 5;

            const autoName = form.name.trim()
                || `${METRIC_LABELS[form.sensor_type] || form.sensor_type} webhook`;

            // Parse custom payload if provided
            let webhookPayload = null;
            if (form.webhook_payload.trim()) {
                try {
                    webhookPayload = JSON.parse(form.webhook_payload);
                } catch {
                    setPayloadError('Invalid JSON — please fix before saving');
                    setSaving(false);
                    return;
                }
            }

            await onSave({
                name: autoName,
                sensor_id: form.sensor_id,
                sensor_type: form.sensor_type,
                condition: form.condition,
                threshold: parseFloat(form.threshold),
                notification_target: form.notification_target,
                notification_provider: 'webhook',
                webhook_http_method: form.webhook_http_method,
                webhook_auth_header: form.webhook_auth_header.trim() || null,
                webhook_payload: webhookPayload,
                cooldown_seconds: cooldownMinutes * 60,
            });
            onOpenChange(false);
        } catch {
            // Error in parent
        } finally {
            setSaving(false);
        }
    };

    const isValid =
        form.sensor_id &&
        form.sensor_type &&
        form.condition &&
        form.threshold !== '' &&
        !isNaN(parseFloat(form.threshold)) &&
        form.notification_target.trim() &&
        form.notification_target.startsWith('https://') &&
        !payloadError;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" />
                        {isEdit ? 'Edit Automation' : 'New Webhook Automation'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the webhook automation configuration.'
                            : 'Define when a sensor triggers a webhook call to an external service.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* ── Section: Trigger ─────────────────────────── */}
                    <div className="automation-section">
                        <h3 className="automation-section-title">
                            <span className="automation-section-number">1</span>
                            Trigger Condition
                        </h3>

                        {/* Rule Name */}
                        <div className="space-y-2">
                            <Label htmlFor="auto-name">
                                Name <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="auto-name"
                                type="text"
                                placeholder="e.g. Turn on fan when hot"
                                value={form.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                            />
                        </div>

                        {/* Sensor */}
                        <div className="space-y-2">
                            <Label htmlFor="auto-sensor">Sensor Box</Label>
                            <Select
                                value={form.sensor_id}
                                onValueChange={(v) => handleFieldChange('sensor_id', v)}
                            >
                                <SelectTrigger id="auto-sensor">
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
                            <Label htmlFor="auto-metric">Metric</Label>
                            <Select
                                value={form.sensor_type}
                                onValueChange={(v) => handleFieldChange('sensor_type', v)}
                            >
                                <SelectTrigger id="auto-metric">
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
                                <Label htmlFor="auto-operator">Condition</Label>
                                <Select
                                    value={form.condition}
                                    onValueChange={(v) => handleFieldChange('condition', v)}
                                >
                                    <SelectTrigger id="auto-operator">
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
                                <Label htmlFor="auto-threshold">Threshold</Label>
                                <Input
                                    id="auto-threshold"
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 28"
                                    value={form.threshold}
                                    onChange={(e) => handleFieldChange('threshold', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Webhook Action ──────────────────── */}
                    <div className="automation-section">
                        <h3 className="automation-section-title">
                            <span className="automation-section-number">2</span>
                            <Globe size={14} />
                            Webhook Action
                        </h3>

                        {/* URL */}
                        <div className="space-y-2">
                            <Label htmlFor="auto-url">Webhook URL</Label>
                            <Input
                                id="auto-url"
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
                            <Label htmlFor="auto-method">HTTP Method</Label>
                            <Select
                                value={form.webhook_http_method}
                                onValueChange={(v) => handleFieldChange('webhook_http_method', v)}
                            >
                                <SelectTrigger id="auto-method">
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
                            <Label htmlFor="auto-auth" className="flex items-center gap-1.5">
                                <Lock size={12} />
                                Auth Header <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="auto-auth"
                                type="text"
                                placeholder="Bearer my-token or X-API-Key: my-key"
                                value={form.webhook_auth_header}
                                onChange={(e) => handleFieldChange('webhook_auth_header', e.target.value)}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Enter <code className="bg-muted px-1 rounded">Bearer token</code> or <code className="bg-muted px-1 rounded">Header-Name: value</code>
                            </p>
                        </div>
                    </div>

                    {/* ── Section: Payload ─────────────────────────── */}
                    <div className="automation-section">
                        <h3 className="automation-section-title">
                            <span className="automation-section-number">3</span>
                            <Code size={14} />
                            Custom Payload <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                        </h3>

                        <div className="space-y-2">
                            <textarea
                                id="auto-payload"
                                className="automation-payload-editor"
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

                        {/* Cooldown */}
                        <div className="space-y-2">
                            <Label htmlFor="auto-cooldown">Cooldown (minutes)</Label>
                            <Input
                                id="auto-cooldown"
                                type="number"
                                min="1"
                                placeholder="5"
                                value={form.cooldown_minutes}
                                onChange={(e) => handleFieldChange('cooldown_minutes', e.target.value)}
                            />
                        </div>
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
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Zap size={14} />
                            {isEdit ? 'Update Automation' : 'Create Automation'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default AutomationRuleEditor;
