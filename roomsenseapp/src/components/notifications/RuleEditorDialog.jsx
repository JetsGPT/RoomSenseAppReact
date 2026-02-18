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
import { Loader2 } from 'lucide-react';

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
    { value: '==', label: '== Equal to' },
    { value: '!=', label: '!= Not equal to' },
];

const DEFAULT_FORM = {
    name: '',
    sensor_id: '',
    sensor_type: '',       // maps to "metric" in UI
    condition: '>',        // maps to "operator" in UI
    threshold: '',
    notification_target: '', // maps to "ntfy_topic" in UI
    cooldown_minutes: '15',  // converted to seconds on submit
};

/**
 * Dialog for creating or editing a notification rule.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onOpenChange - Callback to toggle open state
 * @param {Object|null} props.editingRule - Rule to edit (null = create mode)
 * @param {function} props.onSave - Called with form data on submit
 */
export function RuleEditorDialog({ open, onOpenChange, editingRule, onSave }) {
    const { activeConnections } = useConnections();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(editingRule);

    // Populate form when editing — map backend field names to form fields
    useEffect(() => {
        if (editingRule) {
            setForm({
                name: editingRule.name || '',
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
            });
        } else {
            setForm(DEFAULT_FORM);
        }
    }, [editingRule, open]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cooldownMinutes = parseInt(form.cooldown_minutes, 10) || 15;

            // Auto-generate a name if the user didn't provide one
            const autoName = form.name.trim()
                || `${METRIC_LABELS[form.sensor_type] || form.sensor_type} alert`;

            // Send data with backend-expected field names
            await onSave({
                name: autoName,
                sensor_id: form.sensor_id,
                sensor_type: form.sensor_type,
                condition: form.condition,
                threshold: parseFloat(form.threshold),
                notification_target: form.notification_target,
                notification_provider: 'ntfy',
                cooldown_seconds: cooldownMinutes * 60,
            });
            onOpenChange(false);
        } catch {
            // Error handling is done in the parent via toast
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
        form.notification_target.trim();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Rule' : 'New Notification Rule'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the threshold rule configuration.'
                            : 'Define a threshold rule to receive notifications via ntfy.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Rule Name */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-name">Rule Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input
                            id="rule-name"
                            type="text"
                            placeholder="e.g. High humidity alert"
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

                    {/* Metric (sensor_type) */}
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

                    {/* Operator (condition) + Threshold */}
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

                    {/* ntfy topic (notification_target) */}
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
                        <Button type="submit" disabled={!isValid || saving}>
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
