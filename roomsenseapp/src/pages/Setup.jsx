import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CloudSun,
    Copy,
    Database,
    Download,
    Loader2,
    Lock,
    MapPin,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import Logo from '../components/logo';
import { useAuth } from '../contexts/AuthContext';
import { useWeather } from '../contexts/WeatherContext';
import { settingsAPI } from '../services/api';
import { setupAPI } from '../services/setupAPI';
import { weatherAPI } from '../services/weatherAPI';
import { describeRequestError } from '../lib/runtimeRecovery';

const BASE_STEPS = [
    { id: 'certificate', title: 'Certificate', description: 'Install the RoomSense root certificate on this device before authentication.', icon: Shield },
    { id: 'account', title: 'Admin Account', description: 'Create the first RoomSense administrator account.', icon: UserPlus, requiresFirstInstall: true },
    { id: 'basics', title: 'Basics', description: 'Choose the weather location and optionally store the Gemini key.', icon: CloudSun },
    { id: 'security', title: 'Security Files', description: 'Save the one-time backend credentials before setup finishes.', icon: Database },
    { id: 'finish', title: 'Finish', description: 'Confirm the final checks and unlock the dashboard.', icon: CheckCircle2 },
];

const WINDOWS_CERTIFICATE_STEPS = [
    'Download the current RoomSense certificate file from this step.',
    'Double-click the downloaded .crt file and choose Install Certificate.',
    'Pick Place all certificates in the following store, then select Trusted Root Certification Authorities.',
    'Finish the wizard, then reload the page if Windows or your browser was blocking secure RoomSense requests.',
];

const getErrorMessage = (err, fallback) => {
    if (err?.response) {
        return err.response.data?.error || err.response.data?.message || fallback;
    }
    return describeRequestError(err, fallback);
};

const formatLocation = (location) => [location?.name, location?.admin1, location?.country || location?.countryCode].filter(Boolean).join(', ');

const StepCard = ({ title, description, children, className = '' }) => (
    <Card className={`border-slate-200/80 bg-white/95 shadow-sm ${className}`}>
        <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
            {description && <CardDescription className="text-sm text-slate-600">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
    </Card>
);

export default function Setup() {
    const {
        user,
        isFirstInstall,
        createInitialAccount,
        setIsSetupCompleted,
        refreshSetupStatus,
    } = useAuth();
    const { refresh: refreshWeather, setLocation: saveWeatherLocation } = useWeather();
    const navigate = useNavigate();

    const [stepId, setStepId] = useState('certificate');
    const [bootstrapping, setBootstrapping] = useState(Boolean(user));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [weatherQuery, setWeatherQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationResults, setLocationResults] = useState([]);
    const [hasExistingGeminiKey, setHasExistingGeminiKey] = useState(false);
    const [geminiKey, setGeminiKey] = useState('');

    const [credentials, setCredentials] = useState('');
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);
    const [credentialsCopied, setCredentialsCopied] = useState(false);
    const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);

    const [certificateDownloaded, setCertificateDownloaded] = useState(false);
    const [certificateConfirmed, setCertificateConfirmed] = useState(false);

    const [accountUsername, setAccountUsername] = useState('');
    const [accountPassword, setAccountPassword] = useState('');
    const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');

    const isAdmin = user?.role === 'admin';
    const showAccountStep = !user && isFirstInstall === true;
    const steps = useMemo(
        () => BASE_STEPS.filter((item) => !item.requiresFirstInstall || showAccountStep),
        [showAccountStep]
    );

    useEffect(() => {
        if (steps.some((item) => item.id === stepId)) {
            return;
        }

        setStepId(user ? 'basics' : steps[0]?.id || 'certificate');
    }, [stepId, steps, user]);

    const currentIndex = Math.max(steps.findIndex((item) => item.id === stepId), 0);
    const currentStep = steps[currentIndex] || steps[0];
    const nextStep = steps[currentIndex + 1] || null;
    const isFinalStep = currentIndex === steps.length - 1;
    const progressPercent = steps.length > 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    const locationLabel = useMemo(() => formatLocation(selectedLocation), [selectedLocation]);

    const navLocked = ['save', 'credentials', 'complete', 'account'].includes(busy);
    const accountInputsMissing = !accountUsername.trim() || !accountPassword || !accountPasswordConfirm;

    const primaryActionLabel = useMemo(() => {
        switch (currentStep?.id) {
            case 'certificate':
                return showAccountStep ? 'Continue to Account' : 'Continue to Basics';
            case 'account':
                return 'Create Account and Continue';
            case 'basics':
                return 'Save and Continue';
            case 'security':
                return 'Continue to Final Review';
            default:
                return 'Finish Setup';
        }
    }, [currentStep?.id, showAccountStep]);

    const actionHint = useMemo(() => {
        switch (currentStep?.id) {
            case 'certificate':
                return certificateConfirmed
                    ? `Up next: ${nextStep?.title || 'the next setup step'}.`
                    : 'Install and confirm the local certificate before continuing.';
            case 'account':
                return 'Create the first admin account to unlock the authenticated setup steps.';
            case 'basics':
                return 'Save the weather location before continuing to the security files.';
            case 'security':
                return 'Save the temporary credentials now. The final review comes next.';
            default:
                return credentialsConfirmed
                    ? 'Finish setup and open the dashboard.'
                    : 'Confirm the temporary credentials were saved before finishing.';
        }
    }, [certificateConfirmed, credentialsConfirmed, currentStep?.id, nextStep?.title]);

    const primaryActionDisabled = navLocked
        || (currentStep?.id === 'certificate' && !certificateConfirmed)
        || (currentStep?.id === 'account' && accountInputsMissing)
        || (isFinalStep && (!credentialsConfirmed || !certificateConfirmed));

    useEffect(() => {
        let active = true;

        const loadSetupState = async () => {
            if (!user) {
                setBootstrapping(false);
                return;
            }

            setBootstrapping(true);
            try {
                const [location, geminiSetting] = await Promise.all([
                    weatherAPI.getLocation(),
                    isAdmin
                        ? settingsAPI.get('gemini_api_key').catch((err) => (err.response?.status === 404 ? null : Promise.reject(err)))
                        : Promise.resolve(null),
                ]);

                if (!active) {
                    return;
                }

                if (location?.latitude != null && location?.longitude != null) {
                    setSelectedLocation(location);
                    setWeatherQuery(formatLocation(location));
                }

                setHasExistingGeminiKey(Boolean(geminiSetting?.value));
            } catch (err) {
                if (active) {
                    setError(getErrorMessage(err, 'Failed to load setup state.'));
                }
            } finally {
                if (active) {
                    setBootstrapping(false);
                }
            }
        };

        loadSetupState();

        return () => {
            active = false;
        };
    }, [isAdmin, user]);

    useEffect(() => {
        if (!user || currentStep?.id !== 'security' || credentialsLoaded) {
            return;
        }

        const loadCredentials = async () => {
            setBusy('credentials');
            try {
                const data = await setupAPI.getCredentials();
                setCredentials(data);
            } catch (err) {
                setError(getErrorMessage(err, 'Failed to load the temporary credentials file.'));
            } finally {
                setCredentialsLoaded(true);
                setBusy('');
            }
        };

        loadCredentials();
    }, [credentialsLoaded, currentStep?.id, user]);

    const searchLocations = async () => {
        const query = weatherQuery.trim();
        if (query.length < 2) {
            setError('Enter at least two characters to search for a weather location.');
            return;
        }

        setBusy('search');
        setError('');
        setNotice('');
        try {
            const results = await weatherAPI.geocode(query);
            setLocationResults(results);
            if (results.length === 0) {
                setNotice('No matching locations were found.');
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to search for locations.'));
        } finally {
            setBusy('');
        }
    };

    const saveSettings = async () => {
        if (!selectedLocation) {
            setError('Choose a weather location before continuing.');
            return;
        }

        setBusy('save');
        setError('');
        setNotice('');
        try {
            await saveWeatherLocation(selectedLocation.latitude, selectedLocation.longitude, formatLocation(selectedLocation));

            if (isAdmin && geminiKey.trim()) {
                await settingsAPI.update('gemini_api_key', geminiKey.trim(), 'Google Gemini API key for RoomSense AI features', true);
                setGeminiKey('');
                setHasExistingGeminiKey(true);
            }

            await refreshWeather();
            setLocationResults([]);
            setNotice('Core settings saved.');
            setStepId('security');
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to save setup settings.'));
        } finally {
            setBusy('');
        }
    };

    const createAccount = async () => {
        if (!accountUsername.trim() || !accountPassword || !accountPasswordConfirm) {
            setError('Username, password, and password confirmation are required.');
            return;
        }

        if (accountPassword !== accountPasswordConfirm) {
            setError('The password confirmation does not match.');
            return;
        }

        setBusy('account');
        setError('');
        setNotice('');
        try {
            const result = await createInitialAccount(accountUsername.trim(), accountPassword);
            if (!result.success) {
                setError(result.error || 'Failed to create the initial setup account.');
                return;
            }

            setAccountPassword('');
            setAccountPasswordConfirm('');
            setNotice('Administrator account created. Continue with the remaining setup.');
            setStepId('basics');
        } finally {
            setBusy('');
        }
    };

    const copyCredentials = async () => {
        if (!credentials) {
            return;
        }

        try {
            await navigator.clipboard.writeText(credentials);
            setCredentialsCopied(true);
            setNotice('Credentials copied to the clipboard.');
        } catch {
            setError('Clipboard access failed. Copy the credentials manually from the text area.');
        }
    };

    const retryCredentials = async () => {
        setBusy('credentials');
        setError('');
        setNotice('');
        try {
            const data = await setupAPI.getCredentials();
            setCredentials(data);
            setCredentialsCopied(false);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to reload the temporary credentials file.'));
        } finally {
            setBusy('');
        }
    };

    const downloadCertificate = () => {
        const link = document.createElement('a');
        link.href = setupAPI.getCertificateDownloadUrl();
        link.download = 'RoomSense_RootCA.crt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setCertificateDownloaded(true);
        setNotice('Certificate download started.');
    };

    const completeSetup = async () => {
        if (!credentialsConfirmed || !certificateConfirmed) {
            return;
        }

        setBusy('complete');
        setError('');
        try {
            await setupAPI.completeSetup();
            setIsSetupCompleted(true);
            await refreshSetupStatus({ silent: true });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to finalize setup.'));
        } finally {
            setBusy('');
        }
    };

    const goBack = () => {
        if (navLocked || currentIndex === 0) {
            return;
        }

        setError('');
        setNotice('');
        setStepId(steps[currentIndex - 1].id);
    };

    const next = () => {
        setError('');
        setNotice('');

        switch (currentStep?.id) {
            case 'certificate':
                if (!certificateConfirmed) {
                    setError('Install the certificate and confirm it before continuing.');
                    return;
                }
                setStepId(showAccountStep ? 'account' : 'basics');
                return;
            case 'account':
                createAccount();
                return;
            case 'basics':
                saveSettings();
                return;
            case 'security':
                setStepId('finish');
                return;
            default:
                completeSetup();
        }
    };

    const setupSummaryItems = [
        ['Certificate', certificateConfirmed ? 'Trusted on this device' : certificateDownloaded ? 'Downloaded' : 'Pending'],
        ['Administrator account', user ? `${user.username} (${user.role})` : 'Not created yet'],
        ['Weather location', locationLabel || (user ? 'Not set' : 'Available after the account step')],
        ['Gemini key', user ? (hasExistingGeminiKey || geminiKey.trim() ? 'Configured' : 'Skipped') : 'Available after the account step'],
        ['Credentials file', user ? (credentialsCopied ? 'Copied' : credentials ? 'Loaded' : 'Not loaded yet') : 'Available after sign-in'],
    ];

    const renderCertificateStep = () => (
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <StepCard
                title="Install the RoomSense Root Certificate"
                description="Do this first so local HTTPS requests can succeed before login and the rest of setup."
            >
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Windows first: double-click the downloaded certificate, choose <span className="font-semibold">Install Certificate</span>,
                    then place it in <span className="font-semibold">Trusted Root Certification Authorities</span>.
                </div>

                <div className="space-y-3">
                    {WINDOWS_CERTIFICATE_STEPS.map((item, index) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                {index + 1}
                            </span>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={downloadCertificate} className="h-11 bg-slate-900 text-white hover:bg-slate-800">
                        <Download className="h-4 w-4" />
                        Download Certificate
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.location.reload()} className="h-11">
                        <RefreshCw className="h-4 w-4" />
                        Reload Page
                    </Button>
                </div>

                {certificateDownloaded && (
                    <Badge variant="outline" className="w-fit border-emerald-300 bg-emerald-50 text-emerald-700">
                        Download requested
                    </Badge>
                )}
            </StepCard>

            <div className="space-y-6">
                <StepCard
                    title="Other Devices"
                    description="If you are not on Windows, trust the same certificate in the device's system certificate store before continuing."
                >
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        The important part is that this device trusts the current RoomSense root certificate before any secure RoomSense API calls run.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        If Windows prompts for administrator approval during certificate import, allow it and finish the wizard.
                    </div>
                </StepCard>

                <StepCard
                    title="Confirmation"
                    description="The next setup step unlocks only after this device trusts the current certificate."
                >
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            className="mt-1"
                            checked={certificateConfirmed}
                            onChange={(event) => setCertificateConfirmed(event.target.checked)}
                        />
                        <span>I installed or trusted the current RoomSense root certificate on this device.</span>
                    </label>
                </StepCard>
            </div>
        </div>
    );

    const renderAccountStep = () => (
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <StepCard
                title="Create the First Administrator Account"
                description="This is the first permanent RoomSense user and it will stay signed in for the rest of setup."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="setup-username" className="text-sm font-medium text-slate-900">
                            Username
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                                <UserPlus className="h-4 w-4" />
                            </div>
                            <Input
                                id="setup-username"
                                value={accountUsername}
                                onChange={(event) => setAccountUsername(event.target.value)}
                                disabled={busy === 'account'}
                                placeholder="admin"
                                className="h-11 border-slate-300 pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="setup-password" className="text-sm font-medium text-slate-900">
                            Password
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                                <Lock className="h-4 w-4" />
                            </div>
                            <Input
                                id="setup-password"
                                type="password"
                                value={accountPassword}
                                onChange={(event) => setAccountPassword(event.target.value)}
                                disabled={busy === 'account'}
                                placeholder="Choose a password"
                                className="h-11 border-slate-300 pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="setup-password-confirm" className="text-sm font-medium text-slate-900">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                                <Lock className="h-4 w-4" />
                            </div>
                            <Input
                                id="setup-password-confirm"
                                type="password"
                                value={accountPasswordConfirm}
                                onChange={(event) => setAccountPasswordConfirm(event.target.value)}
                                disabled={busy === 'account'}
                                placeholder="Repeat the password"
                                className="h-11 border-slate-300 pl-9"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    The first account is automatically created with the <span className="font-semibold">admin</span> role.
                </div>
            </StepCard>

            <div className="space-y-6">
                <StepCard
                    title="Why This Is Inside Setup"
                    description="The certificate step happens first so local HTTPS trust problems do not block account creation."
                >
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        After this account is created, RoomSense keeps the session active and continues with the weather and security steps.
                    </div>
                </StepCard>

                <StepCard
                    title="Sign-In Later"
                    description="This username and password become the normal RoomSense login after setup finishes."
                >
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Save these credentials now. They are separate from the one-time backend credentials shown later in setup.
                    </div>
                </StepCard>
            </div>
        </div>
    );

    const renderBasicsStep = () => (
        <div className="space-y-6">
            <StepCard title="Before You Continue" description="Finish the core settings now, then save the one-time security files on the next step.">
                <div className="grid gap-3 md:grid-cols-3">
                    {[
                        {
                            icon: MapPin,
                            title: 'Weather baseline',
                            description: 'Pick one outdoor location so RoomSense can compare indoor readings against local conditions.',
                        },
                        {
                            icon: Sparkles,
                            title: 'AI optional',
                            description: 'The Gemini API key can be skipped now and added later from the admin settings page.',
                        },
                        {
                            icon: Shield,
                            title: 'Security files next',
                            description: 'The following step shows the temporary credentials file that is deleted once setup is completed.',
                        },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                            </div>
                        );
                    })}
                </div>
            </StepCard>

            <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                <StepCard title="Weather Location" description="Search for the city or region this server should use for outdoor comparisons.">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            value={weatherQuery}
                            onChange={(event) => {
                                setWeatherQuery(event.target.value);
                                if (selectedLocation && event.target.value !== locationLabel) {
                                    setSelectedLocation(null);
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    searchLocations();
                                }
                            }}
                            placeholder="Vienna, AT"
                            disabled={busy === 'save'}
                            className="h-11 border-slate-300"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={searchLocations}
                            disabled={busy === 'search' || busy === 'save'}
                            className="h-11"
                        >
                            {busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Search
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {selectedLocation ? (
                            <span className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                                    Selected
                                </Badge>
                                <span>{locationLabel}</span>
                            </span>
                        ) : (
                            'Choose a result below or keep the saved location.'
                        )}
                    </div>

                    {locationResults.length > 0 && (
                        <div className="space-y-2">
                            {locationResults.map((location) => {
                                const label = formatLocation(location);
                                return (
                                    <button
                                        key={`${location.latitude}-${location.longitude}-${label}`}
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
                                        onClick={() => {
                                            setSelectedLocation(location);
                                            setWeatherQuery(label);
                                            setLocationResults([]);
                                            setNotice('Weather location selected.');
                                        }}
                                    >
                                        <div>
                                            <div className="font-medium text-slate-900">{label}</div>
                                            <div className="text-xs text-slate-500">
                                                {location.latitude}, {location.longitude}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </StepCard>

                <StepCard title="Gemini API Key" description="Optional. This enables RoomSense AI summaries and chat after setup.">
                    {isAdmin ? (
                        <>
                            {hasExistingGeminiKey && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    A Gemini API key is already configured. Leave the field empty to keep it.
                                </div>
                            )}
                            <Input
                                type="password"
                                value={geminiKey}
                                onChange={(event) => setGeminiKey(event.target.value)}
                                placeholder="AIzaSy..."
                                disabled={busy === 'save'}
                                className="h-11 border-slate-300"
                            />
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                You can skip this for now and add it later from the admin settings page.
                            </div>
                        </>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Only admin users can add the Gemini API key. You can finish setup without it.
                        </div>
                    )}
                </StepCard>
            </div>
        </div>
    );

    const renderSecurityStep = () => (
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <StepCard title="Temporary Credentials" description="Save these now. They are removed as soon as setup is completed.">
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={copyCredentials} disabled={!credentials}>
                        <Copy className="h-4 w-4" />
                        {credentialsCopied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={retryCredentials} disabled={busy === 'credentials'}>
                        {busy === 'credentials' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        Reload
                    </Button>
                </div>
                <textarea
                    className="min-h-80 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-50 outline-none"
                    readOnly
                    value={credentials || (busy === 'credentials' ? 'Loading credentials...' : 'Credentials are not currently available.')}
                />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Finishing setup removes this temporary file from the server.
                </div>
            </StepCard>

            <div className="space-y-6">
                <StepCard title="What Happens Next" description="The wizard stays short. Pairing and day-to-day changes happen after setup.">
                    <div className="space-y-3">
                        {[
                            'Save the temporary backend credentials on this step.',
                            'Finish setup and open the dashboard.',
                            'Pair the first RoomSense box from the sidebar after setup finishes.',
                        ].map((item, index) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                    {index + 1}
                                </span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </StepCard>

                <StepCard title="Certificate For Other Devices" description="If another PC or phone needs local RoomSense access later, install the same certificate there too.">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        You can download the current certificate again from the login page or any RoomSense recovery panel if another device needs trust later.
                    </div>
                </StepCard>
            </div>
        </div>
    );

    const renderFinishStep = () => (
        <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
            <StepCard title="Final Review" description="Make sure the essentials are saved before unlocking the dashboard.">
                <div className="space-y-3">
                    {setupSummaryItems.map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <span className="text-sm text-slate-600">{label}</span>
                            <span className="text-sm font-medium text-slate-900">{value}</span>
                        </div>
                    ))}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Sensor pairing happens after setup. Open the dashboard first, then connect the first RoomSense box.
                    </div>
                </div>
            </StepCard>

            <StepCard title="Required Check" description="Only the temporary credentials still need confirmation before setup can finish.">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={credentialsConfirmed}
                        onChange={(event) => setCredentialsConfirmed(event.target.checked)}
                    />
                    <span>
                        {credentials
                            ? 'I saved the generated backend credentials somewhere outside this device.'
                            : 'I understand the temporary credentials file could not be loaded and will not be available after setup.'}
                    </span>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Certificate trust was already confirmed on the first step. Setup completion removes only the temporary credentials endpoint. The certificate download remains available later if another device needs to trust RoomSense.
                </div>
            </StepCard>
        </div>
    );

    const renderStep = () => {
        switch (currentStep?.id) {
            case 'certificate':
                return renderCertificateStep();
            case 'account':
                return renderAccountStep();
            case 'basics':
                return renderBasicsStep();
            case 'security':
                return renderSecurityStep();
            default:
                return renderFinishStep();
        }
    };

    if (bootstrapping) {
        return (
            <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-4 py-10">
                <div className="mx-auto flex max-w-xl items-center justify-center">
                    <Card className="w-full border-slate-200 bg-white/95 shadow-sm">
                        <CardContent className="flex items-center gap-4 px-6 py-6 text-sm text-slate-600">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                <div className="scale-[1.5] text-slate-900">
                                    <Logo />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                                <span>Loading setup state...</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eefbf3_100%)] px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <Card className="border-slate-200/80 bg-white/95 shadow-sm">
                    <CardContent className="space-y-6 px-6 py-6 md:px-8">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                        <div className="scale-[1.7] text-slate-900">
                                            <Logo />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">RoomSense</div>
                                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Guided Setup</h1>
                                    </div>
                                </div>
                                <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                                    Install the local certificate first, create the first administrator account during setup, then finish the remaining first-boot essentials.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Certificate first', 'Admin account in setup', 'Security files', 'Dashboard pairing next'].map((label) => (
                                        <Badge key={label} variant="outline" className="rounded-full border-slate-300 bg-white text-slate-700">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full max-w-md space-y-3">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Step {currentIndex + 1} of {steps.length}</span>
                                    <span>{currentStep?.title}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${progressPercent}%` }} />
                                </div>
                                <div className={`grid gap-2 ${steps.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                    {steps.map((item, index) => {
                                        const Icon = item.icon;
                                        const active = index === currentIndex;
                                        const complete = index < currentIndex;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-2xl border px-3 py-3 text-left ${
                                                    active
                                                        ? 'border-emerald-300 bg-emerald-50'
                                                        : complete
                                                            ? 'border-slate-300 bg-slate-50'
                                                            : 'border-slate-200 bg-white'
                                                }`}
                                            >
                                                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <span className="font-medium text-slate-900">{currentStep?.title}:</span> {currentStep?.description}
                        </div>
                    </CardContent>
                </Card>

                {notice && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {notice}
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-6">{renderStep()}</div>

                    <div className="space-y-6">
                        <StepCard title="Setup Snapshot" description="A quick view of what is already in place.">
                            <div className="space-y-3">
                                {setupSummaryItems.map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                                        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </StepCard>

                        <StepCard title="After Setup" description="The wizard ends once the system is safe to use.">
                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    Open the dashboard and pair the first RoomSense box from the sidebar.
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    Review weather and AI settings later without repeating the whole wizard.
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    The setup-only credentials are removed once setup finishes.
                                </div>
                            </div>
                        </StepCard>
                    </div>
                </div>

                <Card className="border-slate-200/80 bg-white/95 shadow-sm">
                    <CardContent className="flex flex-col gap-4 px-6 py-5 md:px-8">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={goBack}
                                disabled={currentIndex === 0 || navLocked}
                                className="h-11 w-fit rounded-2xl px-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <p className="text-sm text-slate-600 sm:text-right">{actionHint}</p>
                        </div>

                        <div className="flex justify-center">
                            <Button
                                type="button"
                                size="lg"
                                onClick={next}
                                disabled={primaryActionDisabled}
                                className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 sm:max-w-md"
                            >
                                {navLocked && <Loader2 className="h-4 w-4 animate-spin" />}
                                {primaryActionLabel}
                                {!navLocked && <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>The wizard is intentionally short. Detailed sensor pairing continues after setup.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
