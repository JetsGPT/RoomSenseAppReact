import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function RenameDeviceDialog({ device, open, onOpenChange, onRename }) {
    const [displayName, setDisplayName] = useState(device?.name || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when dialog opens with new device
    React.useEffect(() => {
        if (open && device) {
            setDisplayName(device.name || '');
            setError('');
        }
    }, [open, device]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        const trimmedName = displayName.trim();
        if (!trimmedName) {
            setError('Display name cannot be empty');
            return;
        }

        if (trimmedName.length > 50) {
            setError('Display name must be 50 characters or less');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onRename(device.address, trimmedName);
            onOpenChange(false);
        } catch (err) {
            setError(err.message || 'Failed to rename device');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setDisplayName(device?.name || '');
        setError('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Device</DialogTitle>
                        <DialogDescription>
                            Give your sensor box a friendly name to easily identify it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="display-name">Display Name</Label>
                            <Input
                                id="display-name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g., Living Room"
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {device?.original_name && (
                                <p className="text-xs text-muted-foreground">
                                    Technical ID: {device.original_name}
                                </p>
                            )}
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
