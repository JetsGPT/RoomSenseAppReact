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
import { Loader2, AlertTriangle } from 'lucide-react';

export function DeleteAccountDialog({ open, onOpenChange, onConfirm }) {
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setPassword('');
            setError('');
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password.trim()) {
            setError('Please enter your password to confirm.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onConfirm(password);
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Failed to delete account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setPassword('');
        setError('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <DialogTitle>Delete Account</DialogTitle>
                        </div>
                        <DialogDescription className="text-destructive font-medium pt-2">
                            Are you sure? This action cannot be undone.
                        </DialogDescription>
                        <DialogDescription>
                            Your account and all associated data will be permanently removed.
                            Please enter your password to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                disabled={isSubmitting}
                                autoFocus
                            />
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
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isSubmitting || !password.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Account'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
