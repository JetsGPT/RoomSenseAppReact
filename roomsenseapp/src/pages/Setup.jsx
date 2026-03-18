import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CloudSun,
    Compass,
    Copy,
    Database,
    Download,
    Loader2,
    MapPin,
    Search,
    Shield,
    Sparkles,
    Wifi
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useWeather } from '../contexts/WeatherContext';
import { settingsAPI } from '../services/api';
import { setupAPI } from '../services/setupAPI';
import { weatherAPI } from '../services/weatherAPI';

const STEPS = [
    { id: 'welcome', title: 'Welcome', icon: Compass, note: 'Local-first onboarding' },
    { id: 'settings', title: 'Core Settings', icon: CloudSun, note: 'Weather and AI' },
    { id: 'devices', title: 'Sensors', icon: Wifi, note: 'Hardware prep' },
    { id: 'security', title: 'Security', icon: Shield, note: 'One-time credentials' },
    { id: 'finish', title: 'Finish', icon: CheckCircle2, note: 'Final confirmation' }
];

const getErrorMessage = (err, fallback) => {
    if (err.response) {
        return err.response.data?.error || err.response.data?.message || fallback;
    }
    if (err.request) {
        return 'No response from the server. Check the RoomSense service and try again.';
    }
    return err.message || fallback;
};

const formatLocation = (location) => [location?.name, location?.admin1, location?.country || location?.countryCode].filter(Boolean).join(', ');

const ShellCard = ({ title, description, children }) => (
    <Card className="border-slate-200/80">
        <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
    </Card>
);

export default function Setup() {
    const { user, setIsSetupCompleted, refreshSetupStatus } = useAuth();
    const { refresh: refreshWeather } = useWeather();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [bootstrapping, setBootstrapping] = useState(true);
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
    const [certificateDownloaded, setCertificateDownloaded] = useState(false);
    const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);
    const [certificateConfirmed, setCertificateConfirmed] = useState(false);

    const isAdmin = user?.role === 'admin';
    const locationLabel = useMemo(() => formatLocation(selectedLocation), [selectedLocation]);
    const currentStep = STEPS[step];
    const navLocked = busy === 'save' || busy === 'credentials' || busy === 'complete';

    useEffect(() => {
        let active = true;

        const load = async () => {
            setBootstrapping(true);
            try {
                const [location, geminiSetting] = await Promise.all([
                    weatherAPI.getLocation(),
                    isAdmin ? settingsAPI.get('gemini_api_key').catch((err) => err.response?.status === 404 ? null : Promise.reject(err)) : Promise.resolve(null)
                ]);

                if (!active) {
                    return;
                }

                if (location) {
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

        load();
        return () => {
            active = false;
        };
    }, [isAdmin]);

    useEffect(() => {
        if (step !== 3 || credentialsLoaded) {
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
    }, [step, credentialsLoaded]);

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
            await weatherAPI.setLocation(selectedLocation.latitude, selectedLocation.longitude, formatLocation(selectedLocation));
            if (isAdmin && geminiKey.trim()) {
                await settingsAPI.update('gemini_api_key', geminiKey.trim(), 'Google Gemini API key for RoomSense AI features', true);
                setGeminiKey('');
                setHasExistingGeminiKey(true);
            }
            await refreshWeather();
            setNotice('Core settings saved.');
            setStep((current) => Math.min(current + 1, STEPS.length - 1));
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to save setup settings.'));
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
        try {
            const data = await setupAPI.getCredentials();
            setCredentials(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to reload the temporary credentials file.'));
        } finally {
            setBusy('');
        }
    };

    const downloadCertificate = () => {
        window.open(setupAPI.getCertificateDownloadUrl(), '_blank', 'noopener,noreferrer');
        setCertificateDownloaded(true);
        setNotice('Certificate download started in a new tab.');
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

    const next = () => {
        setError('');
        setNotice('');
        if (step === 1) {
            saveSettings();
            return;
        }
        if (step === STEPS.length - 1) {
            completeSetup();
            return;
        }
        setStep((current) => Math.min(current + 1, STEPS.length - 1));
    };

    const renderBody = () => {
        if (currentStep.id === 'welcome') {
            return (
                <div className="grid gap-4 md:grid-cols-3">
                    <ShellCard title={<span className="flex items-center gap-2"><CloudSun className="h-5 w-5 text-primary" />Weather-aware</span>} description="Outdoor conditions feed comfort scoring and mold insights." />
                    <ShellCard title={<span className="flex items-center gap-2"><Wifi className="h-5 w-5 text-primary" />Sensor ready</span>} description="Finish setup first, then pair sensors from the unlocked dashboard." />
                    <ShellCard title={<span className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Secure by default</span>} description="Credentials and certificate are handled once, then removed." />
                </div>
            );
        }

        if (currentStep.id === 'settings') {
            return (
                <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                    <ShellCard title="Weather Location" description="Search for the city or region this server should use for outdoor comparisons.">
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
                            />
                            <Button type="button" variant="outline" onClick={searchLocations} disabled={busy === 'search' || busy === 'save'}>
                                {busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                Search
                            </Button>
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700">
                            {selectedLocation ? <span><Badge variant="success">Selected</Badge> <span className="ml-2">{locationLabel}</span></span> : 'Select a result below or keep the current saved location.'}
                        </div>
                        {locationResults.length > 0 && (
                            <div className="space-y-2">
                                {locationResults.map((location) => {
                                    const label = formatLocation(location);
                                    return (
                                        <button
                                            key={`${location.latitude}-${location.longitude}-${label}`}
                                            type="button"
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 px-3 py-3 text-left hover:border-primary/30 hover:bg-primary/5"
                                            onClick={() => {
                                                setSelectedLocation(location);
                                                setWeatherQuery(label);
                                                setLocationResults([]);
                                                setNotice('Weather location selected.');
                                            }}
                                        >
                                            <div>
                                                <div className="font-medium text-slate-900">{label}</div>
                                                <div className="text-xs text-slate-500">{location.latitude}, {location.longitude}</div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-400" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ShellCard>

                    <ShellCard title="Gemini API Key" description="Optional. Enable AI summaries and chat after setup.">
                        {isAdmin ? (
                            <>
                                {hasExistingGeminiKey && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                        A Gemini API key is already configured. Leave the field empty to keep it.
                                    </div>
                                )}
                                <Input type="password" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder="AIzaSy..." disabled={busy === 'save'} />
                            </>
                        ) : (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                Only admin users can manage the Gemini API key. Setup can still be completed without it.
                            </div>
                        )}
                    </ShellCard>
                </div>
            );
        }

        if (currentStep.id === 'devices') {
            return (
                <div className="grid gap-4 lg:grid-cols-2">
                    <ShellCard title="Before You Continue" description="Power on the first RoomSense sensor and keep it within range of this server.">
                        <p className="text-sm text-slate-700">The setup flow no longer jumps into `/boxes` because that route stays locked until setup finishes.</p>
                        <p className="text-sm text-slate-700">After setup, open Device Pairing from the sidebar and connect sensors with the full app available.</p>
                    </ShellCard>
                    <Card className="border-slate-200/80 bg-slate-950 text-white">
                        <CardHeader>
                            <CardTitle className="text-xl">Recommended Flow</CardTitle>
                            <CardDescription className="text-slate-300">Finish setup, land on the dashboard, then pair hardware.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-200">
                            <p>1. Save the security material on the next step.</p>
                            <p>2. Finalize setup.</p>
                            <p>3. Pair the first sensor from the dashboard.</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (currentStep.id === 'security') {
            return (
                <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                    <ShellCard title="Temporary Credentials" description="These values are only exposed while setup is incomplete.">
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
                            className="min-h-72 w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-200 outline-none"
                            readOnly
                            value={credentials || (busy === 'credentials' ? 'Loading credentials...' : 'Credentials are not currently available.')}
                        />
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Finishing setup deletes this file and blocks access to it.
                        </div>
                    </ShellCard>

                    <ShellCard title="Root Certificate" description="Install this on clients that should trust the local HTTPS endpoint.">
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700">
                            Download the RoomSense root CA before setup completes.
                            {certificateDownloaded && <span className="ml-2"><Badge variant="success">Requested</Badge></span>}
                        </div>
                        <Button type="button" onClick={downloadCertificate} className="w-full">
                            <Download className="h-4 w-4" />
                            Download Certificate
                        </Button>
                    </ShellCard>
                </div>
            );
        }

        return (
            <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
                <ShellCard title="Final Review" description="Confirm the system is ready before locking setup.">
                    {[
                        ['Weather location', locationLabel || 'Not set'],
                        ['Gemini key', hasExistingGeminiKey || geminiKey.trim() ? 'Configured' : 'Skipped'],
                        ['Certificate download', certificateDownloaded ? 'Requested' : 'Not requested yet']
                    ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">{label}</span>
                            <span className="text-sm font-medium text-slate-900">{value}</span>
                        </div>
                    ))}
                </ShellCard>

                <ShellCard title="Required Checks" description="These are the last irreversible steps before the wizard closes.">
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm text-slate-700">
                        <input type="checkbox" className="mt-1" checked={credentialsConfirmed} onChange={(event) => setCredentialsConfirmed(event.target.checked)} />
                        <span>{credentials ? 'I saved the generated backend credentials somewhere outside this device.' : 'I understand the temporary credentials file could not be loaded and will not be available after setup.'}</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm text-slate-700">
                        <input type="checkbox" className="mt-1" checked={certificateConfirmed} onChange={(event) => setCertificateConfirmed(event.target.checked)} />
                        <span>I downloaded the RoomSense root certificate and understand the endpoint is disabled after setup completes.</span>
                    </label>
                </ShellCard>
            </div>
        );
    };

    if (bootstrapping) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
                <div className="flex items-center gap-3 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading setup state...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 md:px-6 md:py-10">
            <Motion.div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[280px,1fr]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <aside className="rounded-3xl bg-slate-950 p-6 text-white shadow-2xl">
                    <div className="mb-8">
                        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">RoomSense Setup</div>
                        <h1 className="text-2xl font-semibold tracking-tight">Finish provisioning this local server.</h1>
                        <p className="mt-3 text-sm text-slate-300">Setup stays available until the final confirmation. After that, the dashboard becomes the default landing page.</p>
                    </div>
                    <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                    </div>
                    <div className="space-y-3">
                        {STEPS.map((item, index) => {
                            const Icon = item.icon;
                            const active = index === step;
                            const complete = index < step;
                            return (
                                <div key={item.id} className={`rounded-2xl border px-4 py-3 ${active ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${complete ? 'bg-emerald-400 text-slate-950' : active ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{item.title}</p>
                                            <p className="text-xs text-slate-300">{item.note}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                <Card className="border-white/60 bg-white/95 shadow-2xl backdrop-blur">
                    <CardHeader className="border-b border-slate-200/80 pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Step {step + 1} of {STEPS.length}</p>
                                <CardTitle className="mt-2 text-3xl tracking-tight text-slate-950">{currentStep.title}</CardTitle>
                                <CardDescription className="mt-2 max-w-2xl text-base">{currentStep.note}</CardDescription>
                            </div>
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium text-slate-700">{currentStep.note}</Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="flex min-h-[620px] flex-col gap-6 p-6 md:p-8">
                        <AnimatePresence mode="wait">
                            <Motion.div key={currentStep.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="flex-1">
                                {renderBody()}
                            </Motion.div>
                        </AnimatePresence>

                        {notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</div>}
                        {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>}

                        <div className="mt-auto flex flex-col gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <Button type="button" variant="ghost" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || navLocked} className="justify-start">
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <Button type="button" onClick={next} disabled={navLocked || (step === STEPS.length - 1 && (!credentialsConfirmed || !certificateConfirmed))}>
                                {(busy === 'save' || busy === 'complete') && <Loader2 className="h-4 w-4 animate-spin" />}
                                {step === 1 ? 'Save and Continue' : step === 3 ? 'Continue to Finish' : step === STEPS.length - 1 ? 'Finish Setup' : 'Continue'}
                                {busy !== 'save' && busy !== 'complete' && <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </Motion.div>
        </div>
    );
}
