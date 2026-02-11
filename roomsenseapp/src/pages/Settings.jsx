import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/nightmode/switch';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import { authAPI } from '../services/api';
import { toast } from '../components/ui/toaster';
import {
    User,
    Shield,
    Calendar,
    Hash,
    Settings as SettingsIcon,
    Moon,
    Sun,
    RefreshCw,
    Trash2,
    LogOut,
    Eye,
    BarChart3,
    Clock,
    Mail,
    Phone,
    Loader2,
    Save,
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Settings = () => {
    const { user, logout, updateProfile } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const { settings, updateSettings, resetSettings } = useSettings();
    const navigate = useNavigate();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });
    const [profileErrors, setProfileErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill form when user data loads
    useEffect(() => {
        if (user) {
            setProfileForm({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const handleProfileChange = (field, value) => {
        setProfileForm((prev) => ({ ...prev, [field]: value }));
        // Clear field error on change
        if (profileErrors[field]) {
            setProfileErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateProfile = () => {
        const errors = {};
        if (profileForm.email && !EMAIL_REGEX.test(profileForm.email)) {
            errors.email = 'Please enter a valid email address.';
        }
        if (profileForm.first_name && profileForm.first_name.length > 255) {
            errors.first_name = 'First name is too long.';
        }
        if (profileForm.last_name && profileForm.last_name.length > 255) {
            errors.last_name = 'Last name is too long.';
        }
        if (profileForm.phone && profileForm.phone.length > 50) {
            errors.phone = 'Phone number is too long.';
        }
        return errors;
    };

    const handleSaveProfile = async () => {
        const errors = validateProfile();
        if (Object.keys(errors).length > 0) {
            setProfileErrors(errors);
            return;
        }

        setIsSaving(true);
        setProfileErrors({});
        try {
            await updateProfile(profileForm);
            toast({
                title: 'Profile updated successfully',
                description: 'Your personal details have been saved.',
                variant: 'success',
            });
        } catch (err) {
            const message =
                err?.response?.data?.error || err.message || 'Failed to update profile.';
            toast({
                title: 'Update failed',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleDeleteAccount = async (password) => {
        await authAPI.deleteAccount(password);
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-display text-3xl font-semibold text-foreground mb-1">
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your profile, preferences, and security settings.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* ── Profile Section ── */}
                    <section>
                        <div className="mb-4">
                            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Profile
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your account information and personal details.
                            </p>
                        </div>

                        {/* Read-only account info */}
                        <Card className="mb-4">
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    <ProfileRow icon={User} label="Username" value={user?.username} />
                                    <ProfileRow icon={Hash} label="User ID" value={user?.id} />
                                    <ProfileRow icon={Shield} label="Role" value={user?.role} />
                                    <ProfileRow
                                        icon={Calendar}
                                        label="Member Since"
                                        value={
                                            user?.created_at
                                                ? new Date(user.created_at).toLocaleDateString()
                                                : 'N/A'
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Editable personal details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Personal Details</CardTitle>
                                <CardDescription>
                                    Update your name, email, and phone number.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input
                                            id="first_name"
                                            placeholder="John"
                                            value={profileForm.first_name}
                                            onChange={(e) =>
                                                handleProfileChange('first_name', e.target.value)
                                            }
                                            disabled={isSaving}
                                        />
                                        {profileErrors.first_name && (
                                            <p className="text-xs text-destructive">
                                                {profileErrors.first_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            placeholder="Doe"
                                            value={profileForm.last_name}
                                            onChange={(e) =>
                                                handleProfileChange('last_name', e.target.value)
                                            }
                                            disabled={isSaving}
                                        />
                                        {profileErrors.last_name && (
                                            <p className="text-xs text-destructive">
                                                {profileErrors.last_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={profileForm.email}
                                            onChange={(e) =>
                                                handleProfileChange('email', e.target.value)
                                            }
                                            disabled={isSaving}
                                        />
                                        {profileErrors.email && (
                                            <p className="text-xs text-destructive">
                                                {profileErrors.email}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+1 234 567 890"
                                            value={profileForm.phone}
                                            onChange={(e) =>
                                                handleProfileChange('phone', e.target.value)
                                            }
                                            disabled={isSaving}
                                        />
                                        {profileErrors.phone && (
                                            <p className="text-xs text-destructive">
                                                {profileErrors.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator />

                    {/* ── App Preferences Section ── */}
                    <section>
                        <div className="mb-4">
                            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-primary" />
                                App Preferences
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Customize how the app looks and behaves.
                            </p>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {/* Theme */}
                                    <SettingRow
                                        icon={isDark ? Moon : Sun}
                                        label="Dark Mode"
                                        description="Switch between light and dark themes."
                                    >
                                        <Switch
                                            checked={isDark}
                                            onCheckedChange={toggleTheme}
                                        />
                                    </SettingRow>

                                    {/* Auto Refresh */}
                                    <SettingRow
                                        icon={RefreshCw}
                                        label="Auto Refresh"
                                        description="Automatically refresh sensor data."
                                    >
                                        <Switch
                                            checked={settings.autoRefresh}
                                            onCheckedChange={(checked) =>
                                                updateSettings({ autoRefresh: checked })
                                            }
                                        />
                                    </SettingRow>

                                    {/* Show Chart Dots */}
                                    <SettingRow
                                        icon={BarChart3}
                                        label="Chart Data Points"
                                        description="Show individual data points on charts."
                                    >
                                        <Switch
                                            checked={settings.showChartDots}
                                            onCheckedChange={(checked) =>
                                                updateSettings({ showChartDots: checked })
                                            }
                                        />
                                    </SettingRow>

                                    {/* Show Tips */}
                                    <SettingRow
                                        icon={Eye}
                                        label="Show Tips"
                                        description="Display helpful tips on the dashboard."
                                    >
                                        <Switch
                                            checked={settings.showTips}
                                            onCheckedChange={(checked) =>
                                                updateSettings({ showTips: checked })
                                            }
                                        />
                                    </SettingRow>

                                    {/* Show Room Score */}
                                    <SettingRow
                                        icon={BarChart3}
                                        label="Room Score"
                                        description="Show the room comfort score on the dashboard."
                                    >
                                        <Switch
                                            checked={settings.showRoomScore}
                                            onCheckedChange={(checked) =>
                                                updateSettings({ showRoomScore: checked })
                                            }
                                        />
                                    </SettingRow>

                                    {/* Stale Threshold */}
                                    <SettingRow
                                        icon={Clock}
                                        label="Stale Data Threshold"
                                        description={`Mark readings as stale after ${settings.staleThresholdMinutes} min.`}
                                    >
                                        <select
                                            value={settings.staleThresholdMinutes}
                                            onChange={(e) =>
                                                updateSettings({
                                                    staleThresholdMinutes: Number(e.target.value),
                                                })
                                            }
                                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value={1}>1 min</option>
                                            <option value={2}>2 min</option>
                                            <option value={5}>5 min</option>
                                            <option value={10}>10 min</option>
                                        </select>
                                    </SettingRow>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="mt-3 flex justify-end">
                            <Button variant="outline" size="sm" onClick={resetSettings}>
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                Reset to Defaults
                            </Button>
                        </div>
                    </section>

                    <Separator />

                    {/* ── Security Section ── */}
                    <section>
                        <div className="mb-4">
                            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Security
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage your session and account security.
                            </p>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {/* Sign Out */}
                                    <div className="flex items-center justify-between px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30">
                                                <LogOut className="h-4 w-4 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    Sign Out
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    End your current session.
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleLogout}>
                                            Sign Out
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Danger Zone */}
                        <div className="mt-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6">
                            <h3 className="font-display text-lg font-semibold text-destructive mb-1">
                                Danger Zone
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account
                            </Button>
                        </div>
                    </section>
                </div>

                <DeleteAccountDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleDeleteAccount}
                />
            </div>
        </div>
    );
};

/* ── Helper Components ── */

function ProfileRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground truncate">
                    {value || 'N/A'}
                </p>
            </div>
        </div>
    );
}

function SettingRow({ icon: Icon, label, description, children }) {
    return (
        <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30">
                    <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="ml-4 shrink-0">{children}</div>
        </div>
    );
}

export default Settings;
