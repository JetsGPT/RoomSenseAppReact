import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, 
    Database, 
    Wifi, 
    CheckCircle, 
    Download, 
    ChevronRight, 
    ChevronLeft,
    Shield,
    AlertTriangle,
    Compass,
    CloudSun,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { setupAPI } from '../services/setupAPI';
import { settingsAPI } from '../services/api';
import { useWeather } from '../contexts/WeatherContext';
import { useNavigate } from 'react-router-dom';

const STEPS = [
    { title: 'Welcome', icon: Compass, id: 'welcome' },
    { title: 'Settings', icon: CloudSun, id: 'settings' },
    { title: 'Sensors', icon: Wifi, id: 'sensors' },
    { title: 'Security', icon: Shield, id: 'security' },
    { title: 'Finish', icon: CheckCircle, id: 'finish' }
];

export default function Setup() {
    const { setIsSetupCompleted } = useAuth();
    const { refreshWeather } = useWeather();
    const navigate = useNavigate();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Step 2: Settings
    const [weatherLocation, setWeatherLocation] = useState('Vienna, AT');
    const [geminiKey, setGeminiKey] = useState('');
    
    // Step 4: Security
    const [credentials, setCredentials] = useState('');
    const [certDownloaded, setCertDownloaded] = useState(false);
    const [credsSaved, setCredsSaved] = useState(false);

    useEffect(() => {
        // Fetch existing settings if any
        const loadSettings = async () => {
            try {
                const settings = await settingsAPI.getAll();
                const loc = settings.find(s => s.key === 'weather_location')?.value;
                if (loc) setWeatherLocation(loc);
                const key = settings.find(s => s.key === 'gemini_api_key')?.value;
                if (key) setGeminiKey(key);
            } catch (err) {
                console.warn('[Setup] Failed to load initial settings', err);
            }
        };
        loadSettings();
    }, []);

    const fetchCredentials = async () => {
        setLoading(true);
        try {
            const data = await setupAPI.getCredentials();
            setCredentials(data);
        } catch (err) {
            console.error('[Setup] Failed to fetch credentials', err);
            setError('Could not load system credentials. They might have been deleted already.');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
            if (STEPS[currentStep + 1].id === 'security') {
                fetchCredentials();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const saveSettings = async () => {
        setLoading(true);
        try {
            await settingsAPI.update('weather_location', weatherLocation);
            if (geminiKey) {
                await settingsAPI.update('gemini_api_key', geminiKey);
            }
            refreshWeather();
            handleNext();
        } catch (err) {
            setError('Failed to save settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCert = () => {
        window.open('/api/setup/certificate', '_blank');
        setCertDownloaded(true);
    };

    const completeSetup = async () => {
        setLoading(true);
        try {
            await setupAPI.completeSetup();
            setIsSetupCompleted(true);
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to finalize setup. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
            <motion.div 
                className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-neutral-900 p-8 text-white">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Compass className="text-white" size={18} />
                        </div>
                        <span className="font-bold text-lg tracking-tight">RoomSense</span>
                    </div>
                    
                    <nav className="space-y-4">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = currentStep === idx;
                            const isPast = currentStep > idx;
                            
                            return (
                                <div key={step.id} className="flex items-center gap-3 relative">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                        ${isActive ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : 
                                          isPast ? 'bg-neutral-700 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}
                                    `}>
                                        {isPast ? <CheckCircle size={14} /> : idx + 1}
                                    </div>
                                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 md:p-12 flex flex-col h-[600px]">
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div 
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1"
                            >
                                <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">Welcome to RoomSense</h1>
                                <p className="text-neutral-600 mb-8 leading-relaxed">
                                    Let's get your local server configured for your home. We'll set up your location, connect your first sensor, and provide you with your secure backend credentials.
                                </p>
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-4 items-start mb-8 text-emerald-800 text-sm">
                                    <Settings className="flex-shrink-0" size={18} />
                                    <span>This setup is for the local server only. Your data stays in your home.</span>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div 
                                key="settings"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1"
                            >
                                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Basic Settings</h2>
                                <p className="text-neutral-500 mb-8 text-sm">Configure the core functionality of your system.</p>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Weather Location</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-neutral-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all text-neutral-900" 
                                            value={weatherLocation}
                                            onChange={(e) => setWeatherLocation(e.target.value)}
                                            placeholder="e.g. Vienna, AT"
                                        />
                                        <p className="text-[10px] text-neutral-400 mt-2">Used to fetch outside temperature and humidity data.</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Gemini AI API Key (Optional)</label>
                                        <input 
                                            type="password" 
                                            className="w-full bg-neutral-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all text-neutral-900" 
                                            value={geminiKey}
                                            onChange={(e) => setGeminiKey(e.target.value)}
                                            placeholder="Paste your key here..."
                                        />
                                        <p className="text-[10px] text-neutral-400 mt-2">Enables smart insights and home analysis chat feature.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div 
                                key="sensors"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 text-center py-8"
                            >
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                    <Wifi size={40} className="animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-bold text-neutral-900 mb-4">Connect First Sensor</h2>
                                <p className="text-neutral-600 mb-8">
                                    Power on your RoomSense sensor box and place it near the server. 
                                    You can skip this step and connect devices later from the dashboard.
                                </p>
                                <button 
                                    className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-all inline-flex items-center gap-2"
                                    onClick={() => navigate('/boxes')}
                                >
                                    Open Device Pairing <ExternalLink size={16} />
                                </button>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div 
                                key="security"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1"
                            >
                                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Backend Security</h2>
                                
                                <div className="space-y-4">
                                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                                                <Database size={16} /> Generated Credentials
                                            </span>
                                            <button 
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(credentials);
                                                    alert('Credentials copied to clipboard!');
                                                }}
                                            >
                                                Copy All
                                            </button>
                                        </div>
                                        <textarea 
                                            className="w-full h-32 bg-white rounded-xl border-none text-[10px] font-mono p-3 focus:ring-0 resize-none overflow-y-auto"
                                            readOnly
                                            value={credentials}
                                        />
                                    </div>
                                    
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-4 items-start text-amber-900 text-xs">
                                        <AlertTriangle className="flex-shrink-0 text-amber-500" size={18} />
                                        <span>IMPORTANT: This file exists temporarily on your Pi's SD card. It will be <strong>permanently deleted</strong> once you finish. Be sure to save these values now!</span>
                                    </div>

                                    <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                        <Shield className="text-emerald-600 flex-shrink-0" size={24} />
                                        <div className="flex-1">
                                            <p className="font-bold text-emerald-900 text-xs">Root CA Certificate</p>
                                            <p className="text-[10px] text-emerald-700 mb-2">Install this on your devices to trust the local HTTPS connection.</p>
                                            <button 
                                                className="bg-white text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 border border-emerald-100"
                                                onClick={downloadCert}
                                            >
                                                <Download size={14} /> Download Certificate
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 4 && (
                            <motion.div 
                                key="finish"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center text-center"
                            >
                                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-500/30">
                                    <CheckCircle size={48} />
                                </div>
                                <h2 className="text-3xl font-extrabold text-neutral-900 mb-4">Configuration Complete!</h2>
                                <p className="text-neutral-600 mb-10 max-w-sm">
                                    You're all set. The temporary credentials file will be deleted now. Welcome home!
                                </p>
                                
                                <div className="space-y-4 w-full px-8">
                                    <label className="flex items-start gap-3 text-left cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 transition-all border-neutral-300"
                                            checked={credsSaved}
                                            onChange={(e) => setCredsSaved(e.target.checked)}
                                        />
                                        <span className="text-xs text-neutral-600 group-hover:text-neutral-900 transition-all leading-relaxed">
                                            I have saved the backend credentials and downloaded the certificate. I understand the temporary file will be deleted.
                                        </span>
                                    </label>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Controls */}
                    <div className="mt-auto pt-8 border-t border-neutral-100 flex items-center justify-between">
                        {currentStep > 0 && (
                            <button 
                                className="text-neutral-500 font-bold text-sm flex items-center gap-1 hover:text-neutral-900 transition-all px-2"
                                onClick={handleBack}
                                disabled={loading}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        <div className="flex-1" />
                        
                        {currentStep === 1 ? (
                            <button 
                                className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center gap-2"
                                onClick={saveSettings}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save & Continue'} <ChevronRight size={18} />
                            </button>
                        ) : currentStep === STEPS.length - 1 ? (
                            <button 
                                className={`
                                    px-8 py-3 rounded-2xl font-bold transition-all
                                    ${credsSaved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}
                                `}
                                onClick={completeSetup}
                                disabled={!credsSaved || loading}
                            >
                                {loading ? 'Finalizing...' : 'Go to Dashboard'}
                            </button>
                        ) : (
                            <button 
                                className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center gap-2"
                                onClick={handleNext}
                                disabled={loading}
                            >
                                {STEPS[currentStep].id === 'sensors' ? 'Skip for now' : 'Continue'} <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl mt-4 flex items-center gap-2 border border-red-100">
                             <AlertTriangle size={14} /> {error}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
