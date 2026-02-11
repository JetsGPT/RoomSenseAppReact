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

export function ClaimDeviceDialog({ open, onOpenChange, onClaim }) {
    const [boxId, setBoxId] = useState('');
    const [claimPassword, setClaimPassword] = useState('');
    const [boxName, setBoxName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setBoxId('');
            setClaimPassword('');
            setBoxName('');
            setError('');
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedId = boxId.trim();
        const trimmedPassword = claimPassword.trim();
        const trimmedName = boxName.trim();

        if (!trimmedId) {
            setError('Server ID is required');
            return;
        }
        if (!trimmedPassword) {
            setError('Claim password is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onClaim({
                box_id: trimmedId,
                claim_password: trimmedPassword,
                box_name: trimmedName || undefined,
            });
            onOpenChange(false);
        } catch (err) {
            // Extract useful error message from API response
            const msg =
                err.response?.data?.error ||
                err.message ||
                'Failed to claim device';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Claim Device</DialogTitle>
                        <DialogDescription>
                            Enter the Server ID and Claim Password printed on your RoomSense box to link it to your account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="claim-box-id">Server ID</Label>
                            <Input
                                id="claim-box-id"
                                value={boxId}
                                onChange={(e) => setBoxId(e.target.value)}
                                placeholder="e.g., RS-0042"
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="claim-password">Claim Password</Label>
                            <Input
                                id="claim-password"
                                type="password"
                                value={claimPassword}
                                onChange={(e) => setClaimPassword(e.target.value)}
                                placeholder="Enter claim password"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="claim-box-name">
                                Box Name <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="claim-box-name"
                                value={boxName}
                                onChange={(e) => setBoxName(e.target.value)}
                                placeholder="e.g., Living Room Box"
                                disabled={isSubmitting}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Claiming...
                                </>
                            ) : (
                                'Claim Device'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
