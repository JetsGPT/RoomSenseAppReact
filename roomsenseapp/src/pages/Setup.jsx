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
    Search,
    Shield,
    Wifi
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

const STEPS = [
    { id: 'welcome', title: 'Welcome', icon: Compass, note: 'See the setup flow before you begin.' },
    { id: 'settings', title: 'Core Settings', icon: CloudSun, note: 'Choose the weather location and optional AI key.' },
    { id: 'devices', title: 'Sensors', icon: Wifi, note: 'Finish setup first, then pair hardware from the dashboard.' },
    { id: 'security', title: 'Security', icon: Shield, note: 'Download the credentials and certificate before you finish.' },
    { id: 'finish', title: 'Finish', icon: CheckCircle2, note: 'Confirm everything is saved and unlock the app.' }
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

const pageBackgroundStyle = {
    background: 'linear-gradient(160deg, rgba(248,250,248,1) 0%, rgba(255,255,255,1) 38%, rgba(var(--cambridge-blue-rgb),0.45) 100%)',
};

const surfaceStyle = {
    background: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(var(--dark-slate-green-rgb),0.12)',
};

const accentSurfaceStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(var(--honeydew-2-rgb),0.92))',
    borderColor: 'rgba(var(--tea-green-rgb),0.28)',
};

const deepSurfaceStyle = {
    background: 'linear-gradient(180deg, rgba(61,70,70,0.98), rgba(72,81,81,0.96))',
    borderColor: 'rgba(255,255,255,0.12)',
};

const readableBadgeStyle = {
    background: 'rgba(255,255,255,0.92)',
    color: 'rgba(var(--dark-slate-green-rgb), 1)',
    borderColor: 'rgba(var(--dark-slate-green-rgb),0.12)',
};

const sidebarBadgeStyle = {
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(var(--honeydew-2-rgb), 0.96)',
    borderColor: 'rgba(255,255,255,0.14)',
};

const panelStyle = {
    borderColor: 'rgba(var(--dark-slate-green-rgb),0.12)',
    background: 'rgba(255,255,255,0.86)',
    color: 'rgba(75,85,99,0.96)',
};

const softPanelStyle = {
    borderColor: 'rgba(var(--moss-green-rgb),0.28)',
    background: 'rgba(var(--honeydew-2-rgb),0.88)',
    color: 'rgba(75,85,99,0.96)',
};

const positivePanelStyle = {
    borderColor: 'rgba(var(--tea-green-rgb),0.3)',
    background: 'rgba(var(--tea-green-rgb),0.14)',
    color: 'rgba(75,85,99,0.96)',
};

const cautionPanelStyle = {
    borderColor: 'rgba(245,158,11,0.22)',
    background: 'rgba(255,247,237,0.92)',
    color: 'rgba(75,85,99,0.96)',
};

const inputSurfaceStyle = {
    background: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(var(--dark-slate-green-rgb),0.12)',
    color: 'rgba(55,65,81,0.98)',
};

const textareaStyle = {
    background: 'rgba(var(--dark-slate-green-rgb),0.98)',
    color: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(var(--tea-green-rgb),0.22)',
};

const contentSurfaceStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(var(--honeydew-2-rgb),0.68))',
    backdropFilter: 'blur(16px)',
};

const noticePanelStyle = {
    borderColor: 'rgba(var(--tea-green-rgb),0.3)',
    background: 'rgba(255,255,255,0.92)',
    color: 'rgba(75,85,99,0.96)',
};

const errorPanelStyle = {
    borderColor: 'rgba(239,68,68,0.22)',
    background: 'rgba(254,242,242,0.96)',
    color: 'rgba(127,29,29,0.96)',
};

const primaryActionStyle = {
    background: 'linear-gradient(135deg, rgba(55,65,81,1), rgba(var(--dark-slate-green-rgb),1))',
    color: 'rgba(255,255,255,0.98)',
    boxShadow: '0 18px 36px rgba(55,65,81,0.24)',
};

const headingInkStyle = {
    color: 'rgba(55,65,81,1)',
};

const descriptionInkStyle = {
    color: 'rgba(110,124,138,0.96)',
};

const helperInkStyle = {
    color: 'rgba(75,85,99,0.96)',
};

const inputInkClassName = 'text-[rgba(55,65,81,0.98)] placeholder:text-[rgba(107,114,128,0.78)]';

const ShellCard = ({ title, description, children, style = surfaceStyle, className = '' }) => (
    <Card className={`border shadow-[0_20px_50px_rgba(69,84,83,0.08)] backdrop-blur-sm ${className}`} style={style}>
        <CardHeader>
            <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading)', ...headingInkStyle }}>
                {title}
            </CardTitle>
            {description && <CardDescription style={descriptionInkStyle}>{description}</CardDescription>}
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
    const nextStep = step < STEPS.length - 1 ? STEPS[step + 1] : null;
    const navLocked = busy === 'save' || busy === 'credentials' || busy === 'complete';
    const isFinalStep = step === STEPS.length - 1;
    const primaryActionLabel = step === 1 ? 'Save and Continue' : step === 3 ? 'Continue to Finish' : isFinalStep ? 'Finish Setup' : 'Continue';
    const actionHint = isFinalStep
        ? (credentialsConfirmed && certificateConfirmed
            ? 'Finish setup and open the RoomSense dashboard.'
            : 'Confirm both required checks before finishing setup.')
        : step === 1
            ? 'Save the core settings, then move on to the next step.'
            : nextStep
                ? `Up next: ${nextStep.title}.`
                : 'Continue through the setup flow.';

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
                    <Motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                        <ShellCard
                            title={<span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--tea-green-rgb),0.14)]"><CloudSun className="h-5 w-5" style={headingInkStyle} /></span>Weather baseline</span>}
                            description="Pick the right location once so indoor readings can be compared against the outdoor climate."
                            style={accentSurfaceStyle}
                        />
                    </Motion.div>
                    <Motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                        <ShellCard
                            title={<span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--tea-green-rgb),0.14)]"><Wifi className="h-5 w-5" style={headingInkStyle} /></span>Sensor pairing</span>}
                            description="This setup stays focused on the essentials. Pair the first sensor right after you reach the dashboard."
                            style={accentSurfaceStyle}
                        />
                    </Motion.div>
                    <Motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                        <ShellCard
                            title={<span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--tea-green-rgb),0.14)]"><Shield className="h-5 w-5" style={headingInkStyle} /></span>Secure finish</span>}
                            description="Download the credentials and certificate during setup. They are hidden once setup is complete."
                            style={accentSurfaceStyle}
                        />
                    </Motion.div>
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
                                className={inputInkClassName}
                                style={inputSurfaceStyle}
                            />
                            <Button type="button" variant="outline" onClick={searchLocations} disabled={busy === 'search' || busy === 'save'}>
                                {busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                Search
                            </Button>
                        </div>
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={{ ...panelStyle, ...helperInkStyle }}>
                            {selectedLocation ? <span className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border" style={readableBadgeStyle}>Selected</Badge><span>{locationLabel}</span></span> : 'Choose a result below or keep the saved location.'}
                        </div>
                        {locationResults.length > 0 && (
                            <div className="space-y-2">
                                {locationResults.map((location) => {
                                    const label = formatLocation(location);
                                    return (
                                        <Motion.button
                                            key={`${location.latitude}-${location.longitude}-${label}`}
                                            type="button"
                                            whileHover={{ x: 4 }}
                                            className="flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left"
                                            style={softPanelStyle}
                                            onClick={() => {
                                                setSelectedLocation(location);
                                                setWeatherQuery(label);
                                                setLocationResults([]);
                                                setNotice('Weather location selected.');
                                            }}
                                        >
                                            <div>
                                                <div className="font-medium" style={headingInkStyle}>{label}</div>
                                                <div className="text-xs" style={descriptionInkStyle}>{location.latitude}, {location.longitude}</div>
                                            </div>
                                            <ChevronRight className="h-4 w-4" style={helperInkStyle} />
                                        </Motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </ShellCard>

                    <ShellCard title="Gemini API Key" description="Optional. Enable AI summaries and chat after setup." style={accentSurfaceStyle}>
                        {isAdmin ? (
                            <>
                                {hasExistingGeminiKey && <div className="rounded-2xl border px-4 py-3 text-sm" style={{ ...positivePanelStyle, ...helperInkStyle }}>A Gemini API key is already configured. Leave the field empty to keep it.</div>}
                                <Input type="password" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder="AIzaSy..." disabled={busy === 'save'} className={inputInkClassName} style={inputSurfaceStyle} />
                            </>
                        ) : (
                            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ ...panelStyle, ...helperInkStyle }}>Only admin users can add the Gemini API key. You can finish setup without it.</div>
                        )}
                    </ShellCard>
                </div>
            );
        }

        if (currentStep.id === 'devices') {
            return (
                <div className="grid gap-4 lg:grid-cols-2">
                    <ShellCard title="What to Prepare" description="Power on the first RoomSense sensor and keep it near this server.">
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={softPanelStyle}>Pairing opens after setup is complete, so this step only asks you to have the hardware ready.</div>
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={panelStyle}>When you reach the dashboard, open Device Pairing from the sidebar and connect the first sensor.</div>
                    </ShellCard>
                    <Card className="border text-[rgba(var(--honeydew-2-rgb),0.96)] shadow-[0_28px_70px_rgba(69,84,83,0.18)]" style={deepSurfaceStyle}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity }} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)]">
                                    <Wifi className="h-5 w-5 text-[rgba(var(--honeydew-2-rgb),0.98)]" />
                                </Motion.div>
                                <div>
                                    <CardTitle className="text-xl text-[rgba(var(--honeydew-2-rgb),0.98)]" style={{ fontFamily: 'var(--font-heading)' }}>After Setup</CardTitle>
                                    <CardDescription className="text-[rgba(var(--honeydew-2-rgb),0.72)]">Unlock the dashboard, then connect the first device.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-[rgba(var(--honeydew-2-rgb),0.88)]">
                            {['Save the security files on the next step.', 'Finish setup and open the dashboard.', 'Go to Device Pairing and connect the first sensor.'].map((line, index) => (
                                <div key={line} className="flex items-start gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(var(--tea-green-rgb),0.92)] text-xs font-semibold text-[rgba(var(--dark-slate-green-rgb),1)]">{index + 1}</span>
                                    <span>{line}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (currentStep.id === 'security') {
            return (
                <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                    <ShellCard title="Temporary Credentials" description="Save these now. They are removed when setup is finished.">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={copyCredentials} disabled={!credentials}><Copy className="h-4 w-4" />{credentialsCopied ? 'Copied' : 'Copy'}</Button>
                            <Button type="button" variant="ghost" onClick={retryCredentials} disabled={busy === 'credentials'}>{busy === 'credentials' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}Reload</Button>
                        </div>
                        <textarea className="min-h-72 w-full rounded-3xl border p-4 font-mono text-xs outline-none" style={textareaStyle} readOnly value={credentials || (busy === 'credentials' ? 'Loading credentials...' : 'Credentials are not currently available.')} />
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={cautionPanelStyle}>Finishing setup removes this temporary file.</div>
                    </ShellCard>
                    <ShellCard title="Root Certificate" description="Install this on clients that should trust the local HTTPS endpoint." style={accentSurfaceStyle}>
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={softPanelStyle}>
                            Download the RoomSense root CA before setup completes.
                            {certificateDownloaded && <div className="mt-3"><Badge variant="outline" className="border" style={readableBadgeStyle}>Requested</Badge></div>}
                        </div>
                        <Button type="button" onClick={downloadCertificate} className="w-full"><Download className="h-4 w-4" />Download Certificate</Button>
                    </ShellCard>
                </div>
            );
        }

        return (
            <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
                <ShellCard title="Final Review" description="Make sure the essentials are saved before unlocking the dashboard." style={accentSurfaceStyle}>
                    {[['Weather location', locationLabel || 'Not set'], ['Gemini key', hasExistingGeminiKey || geminiKey.trim() ? 'Configured' : 'Skipped'], ['Certificate download', certificateDownloaded ? 'Requested' : 'Not requested yet']].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border px-4 py-3" style={softPanelStyle}>
                            <span className="text-sm" style={descriptionInkStyle}>{label}</span>
                            <span className="text-sm font-medium" style={headingInkStyle}>{value}</span>
                        </div>
                    ))}
                </ShellCard>
                <ShellCard title="Required Checks" description="Both confirmations are required before setup can finish.">
                    <label className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm" style={softPanelStyle}>
                        <input type="checkbox" className="mt-1" checked={credentialsConfirmed} onChange={(event) => setCredentialsConfirmed(event.target.checked)} />
                        <span>{credentials ? 'I saved the generated backend credentials somewhere outside this device.' : 'I understand the temporary credentials file could not be loaded and will not be available after setup.'}</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm" style={panelStyle}>
                        <input type="checkbox" className="mt-1" checked={certificateConfirmed} onChange={(event) => setCertificateConfirmed(event.target.checked)} />
                        <span>I downloaded the RoomSense root certificate and understand the endpoint is disabled after setup completes.</span>
                    </label>
                </ShellCard>
            </div>
        );
    };

    if (bootstrapping) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4" style={pageBackgroundStyle}>
                <Motion.div className="absolute -left-16 top-8 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(var(--tea-green-rgb),0.12)' }} animate={{ x: [0, 28, -8, 0], y: [0, -16, 10, 0], scale: [1, 1.08, 0.96, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
                <Motion.div className="absolute right-[-60px] bottom-[-40px] h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(var(--cambridge-blue-rgb),0.24)' }} animate={{ x: [0, -24, 12, 0], y: [0, 14, -10, 0], scale: [1, 0.94, 1.08, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
                <Card className="border shadow-[0_30px_90px_rgba(69,84,83,0.14)]" style={accentSurfaceStyle}>
                    <CardContent className="flex items-center gap-4 px-6 py-5 text-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-[rgba(255,255,255,0.72)]" style={{ borderColor: 'rgba(var(--moss-green-rgb),0.28)', ...headingInkStyle }}>
                            <div className="scale-[1.55]">
                                <Logo />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" style={headingInkStyle} />
                            <span style={helperInkStyle}>Loading setup state...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden" style={pageBackgroundStyle}>
            <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(var(--dark-slate-green-rgb),0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <Motion.div className="absolute -left-16 top-10 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(var(--tea-green-rgb),0.12)' }} animate={{ x: [0, 35, -12, 0], y: [0, -22, 12, 0], scale: [1, 1.08, 0.95, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
            <Motion.div className="absolute right-[-80px] top-20 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(var(--cambridge-blue-rgb),0.22)' }} animate={{ x: [0, -28, 10, 0], y: [0, 22, -16, 0], scale: [1, 0.96, 1.1, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
            <Motion.div className="absolute bottom-[-120px] left-[24%] h-96 w-96 rounded-full blur-3xl" style={{ background: 'rgba(var(--moss-green-rgb),0.16)' }} animate={{ x: [0, 18, -22, 0], y: [0, -28, 10, 0], scale: [1, 1.05, 0.98, 1] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }} />

            <Motion.div className="relative grid min-h-screen w-full lg:grid-cols-[360px_minmax(0,1fr)]" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <aside className="relative overflow-hidden border-b py-6 pr-6 pl-8 text-[rgba(var(--honeydew-2-rgb),0.98)] shadow-[0_28px_90px_rgba(69,84,83,0.26)] backdrop-blur-xl lg:min-h-screen lg:border-b-0 lg:border-r lg:py-8 lg:pr-8 lg:pl-10" style={{ ...deepSurfaceStyle, borderRightColor: 'rgba(255,255,255,0.1)', borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                    <Motion.div className="absolute -right-12 top-10 h-36 w-36 rounded-full blur-3xl" style={{ background: 'rgba(var(--tea-green-rgb),0.14)' }} animate={{ x: [0, -10, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
                    <Motion.div className="absolute left-[-30px] bottom-12 h-40 w-40 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.08)' }} animate={{ x: [0, 14, 0], y: [0, -16, 0], scale: [1, 0.94, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
                    <div className="relative flex h-full flex-col">
                        <div className="mb-8 flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border bg-[rgba(255,255,255,0.08)]" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                                <div className="scale-[1.9] text-[rgba(var(--honeydew-2-rgb),0.96)]">
                                    <Logo />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.24em] text-[rgba(var(--honeydew-2-rgb),0.58)]">RoomSense</div>
                                <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Guided Setup</div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="mb-4 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]" style={{ borderColor: 'rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.1)', color: 'rgba(var(--honeydew-2-rgb),0.84)' }}>Getting Started</div>
                            <h1 className="text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Set up RoomSense</h1>
                            <p className="mt-3 max-w-xs text-sm text-[rgba(var(--honeydew-2-rgb),0.72)]">Choose the location, save the one-time security files, and unlock the dashboard.</p>
                        </div>

                        <div className="mb-5 flex flex-wrap gap-2">
                            {['Local setup', 'Security files', '5 steps'].map((label) => (
                                <Badge key={label} variant="outline" className="border px-3 py-1 text-[10px] uppercase tracking-[0.16em]" style={sidebarBadgeStyle}>{label}</Badge>
                            ))}
                        </div>

                        <div className="mb-6 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                            <Motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, rgba(var(--tea-green-rgb),0.98), rgba(var(--honeydew-2-rgb),0.94))' }} animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.35, ease: 'easeOut' }} />
                        </div>

                        <div className="space-y-3">
                            {STEPS.map((item, index) => {
                                const Icon = item.icon;
                                const active = index === step;
                                const complete = index < step;
                                return (
                                    <Motion.div key={item.id} animate={{ x: active ? 8 : 0, scale: active ? 1.02 : 1, opacity: active || complete ? 1 : 0.82 }} transition={{ duration: 0.2 }} className="rounded-2xl border px-4 py-3" style={{ borderColor: active ? 'rgba(var(--tea-green-rgb),0.34)' : 'rgba(255,255,255,0.12)', background: active ? 'rgba(var(--tea-green-rgb),0.16)' : 'rgba(255,255,255,0.07)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: complete ? 'rgba(var(--tea-green-rgb),0.96)' : active ? 'rgba(var(--honeydew-2-rgb),0.92)' : 'rgba(255,255,255,0.08)', color: complete || active ? 'rgba(var(--dark-slate-green-rgb),1)' : 'rgba(var(--honeydew-2-rgb),0.92)' }}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{item.title}</p>
                                                <p className="text-xs text-[rgba(var(--honeydew-2-rgb),0.64)]">{item.note}</p>
                                            </div>
                                        </div>
                                    </Motion.div>
                                );
                            })}
                        </div>

                        <div className="mt-12 pt-2 grid gap-3 sm:grid-cols-3 lg:mt-auto lg:pt-4 lg:grid-cols-1">
                            {[
                                [`${step + 1} of ${STEPS.length}`, 'Setup progress'],
                                ['Local server', 'Runs without a cloud dependency'],
                                ['One-time files', 'Removed after setup is complete']
                            ].map(([value, label]) => (
                                <div key={label} className="rounded-2xl border px-4 py-4" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)' }}>
                                    <div className="text-lg font-semibold text-[rgba(var(--honeydew-2-rgb),0.98)]">{value}</div>
                                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[rgba(var(--honeydew-2-rgb),0.58)]">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <section className="relative flex min-h-[60vh] flex-col lg:min-h-screen" style={contentSurfaceStyle}>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),transparent_32%)]" />
                    <div className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full blur-3xl" style={{ background: 'rgba(var(--tea-green-rgb),0.08)' }} />

                    <header className="relative border-b px-6 py-6 lg:px-10 lg:py-8" style={{ borderColor: 'rgba(var(--moss-green-rgb),0.22)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.24em]" style={descriptionInkStyle}>Step {step + 1} of {STEPS.length}</p>
                                <h2 className="mt-3 text-4xl tracking-tight lg:text-5xl" style={{ fontFamily: 'var(--font-display)', ...headingInkStyle }}>{currentStep.title}</h2>
                                <p className="mt-3 max-w-3xl text-base lg:text-lg" style={descriptionInkStyle}>{currentStep.note}</p>
                            </div>
                            <Badge variant="outline" className="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]" style={readableBadgeStyle}>Guided Setup</Badge>
                        </div>
                    </header>

                    <div className="relative flex-1 px-6 py-6 lg:px-10 lg:py-8">
                        <AnimatePresence mode="wait">
                            <Motion.div key={currentStep.id} initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.985 }} transition={{ duration: 0.22 }} className="flex-1">
                                {renderBody()}
                            </Motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="relative border-t px-6 py-5 lg:px-10" style={{ borderColor: 'rgba(var(--moss-green-rgb),0.22)' }}>
                        {notice && <div className="rounded-2xl border px-4 py-3 text-sm" style={noticePanelStyle}>{notice}</div>}
                        {error && <div className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm" style={errorPanelStyle}><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /><span>{error}</span></div>}

                        <div className="mt-5 flex flex-col gap-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep((current) => Math.max(current - 1, 0))}
                                    disabled={step === 0 || navLocked}
                                    className="h-11 w-fit rounded-2xl px-2 text-sm font-medium"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Back
                                </Button>
                                <p className="text-sm sm:text-right" style={descriptionInkStyle}>
                                    {actionHint}
                                </p>
                            </div>

                            <div className="flex justify-center">
                                <Button
                                    type="button"
                                    size="lg"
                                    onClick={next}
                                    disabled={navLocked || (isFinalStep && (!credentialsConfirmed || !certificateConfirmed))}
                                    className="h-14 w-full rounded-2xl px-6 text-base font-semibold sm:max-w-md"
                                    style={primaryActionStyle}
                                >
                                    {(busy === 'save' || busy === 'complete') && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {primaryActionLabel}
                                    {busy !== 'save' && busy !== 'complete' && <ChevronRight className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </Motion.div>
        </div>
    );
}
