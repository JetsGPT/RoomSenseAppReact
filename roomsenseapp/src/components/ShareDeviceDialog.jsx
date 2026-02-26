import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { boxesAPI } from '@/services/api';
import { Loader2, Users, UserMinus, Plus, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ShareDeviceDialog({ open, onOpenChange, device }) {
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [revokingEmail, setRevokingEmail] = useState(null);
    const { toast } = useToast();

    // The backend uses `id` for `connected_servers.id` (which is `box_id` in assignments table)
    const boxId = device?.box_id || device?.id;

    const fetchAssignments = async () => {
        if (!boxId || !open) return;

        setIsLoading(true);
        try {
            const result = await boxesAPI.getAssignments(boxId);
            setAssignments(result.assignments || []);
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            // If the user is not the owner or endpoint fails, ensure assignments is empty
            setAssignments([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchAssignments();
            setEmailInput('');
        }
    }, [open, boxId]);

    const handleShare = async (e) => {
        e.preventDefault();
        const email = emailInput.trim();
        if (!email || !boxId) return;

        setIsSubmitting(true);
        try {
            await boxesAPI.assignBox(boxId, email);
            toast({
                title: "Shared Successfully",
                description: `${email} can now view this box.`,
            });
            setEmailInput('');
            await fetchAssignments();
        } catch (error) {
            console.error('Failed to share box:', error);
            toast({
                title: "Sharing Failed",
                description: error.response?.data?.detail || error.message || "Could not share box.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async (email) => {
        if (!boxId) return;
        setRevokingEmail(email);
        try {
            await boxesAPI.revokeAssignment(boxId, email);
            toast({
                title: "Access Revoked",
                description: `${email} can no longer view this box.`,
            });
            setAssignments(prev => prev.filter(a => a.assigned_user_email !== email));
        } catch (error) {
            console.error('Failed to revoke access:', error);
            toast({
                title: "Revoke Failed",
                description: error.response?.data?.detail || error.message || "Could not revoke access.",
                variant: "destructive",
            });
        } finally {
            setRevokingEmail(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Share Box
                    </DialogTitle>
                    <DialogDescription>
                        Give other users access to view sensor data for <span className="font-semibold text-foreground">{device?.box_name || device?.box_id || 'this box'}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add User Form */}
                    <form onSubmit={handleShare} className="space-y-3">
                        <Label htmlFor="share-email">User Email</Label>
                        <div className="flex gap-2">
                            <Input
                                id="share-email"
                                type="email"
                                placeholder="name@example.com"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                disabled={isSubmitting || isLoading}
                                required
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                disabled={isSubmitting || isLoading || !emailInput.trim()}
                                className="min-w-[100px]"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Share
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Assignments List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Shared With</h4>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-6 text-muted-foreground">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
                                <ShieldAlert className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                <AnimatePresence>
                                    {assignments.map((assignment) => (
                                        <motion.div
                                            key={assignment.assigned_user_email}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center justify-between p-3 border rounded-md bg-card"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                                                    {assignment.assigned_user_email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium truncate">
                                                    {assignment.assigned_user_email}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRevoke(assignment.assigned_user_email)}
                                                disabled={revokingEmail === assignment.assigned_user_email}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                title="Revoke access"
                                            >
                                                {revokingEmail === assignment.assigned_user_email ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <UserMinus className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
