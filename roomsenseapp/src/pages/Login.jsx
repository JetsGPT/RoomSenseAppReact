import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Time from '../components/ui/Time';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [role, setRole] = useState('user');
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!username || !password) {
            setLocalError('Username and password are required');
            return;
        }

        setIsLoading(true);

        try {
            let result;
            if (isRegistering) {
                result = await register(username, password, role);
            } else {
                result = await login(username, password);
            }

            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setLocalError(result.error || 'Authentication failed');
            }
        } catch (err) {
            let errorMessage = 'An unexpected error occurred';

            if (err.response) {
                errorMessage = `Server error (${err.response.status}): ${err.response.data?.message || err.response.data || 'Unknown error'}`;
                console.error('[Login] Server response:', err.response.data);
            } else if (err.request) {
                errorMessage = `No response from server: ${err.message || 'Connection failed'}`;
                console.error('[Login] Request error:', err.request);
            } else {
                errorMessage = `Error: ${err.message || 'Unknown error'}`;
                console.error('[Login] Error:', err.message);
            }

            if (err.code) {
                errorMessage += ` (Code: ${err.code})`;
                console.error('[Login] Error code:', err.code);
            }

            if (err.config) {
                console.error('[Login] Request URL:', err.config.baseURL + err.config.url);
            }

            setLocalError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering((prev) => !prev);
        setLocalError('');
        setPassword('');
    };

    return (
        <Motion.div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-background via-primary/10 to-background px-4 py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25)_0,rgba(59,130,246,0)_45%)]" />
            <Motion.div
                className="relative z-10 w-full max-w-md space-y-8 rounded-3xl border border-border/60 bg-background/95 px-6 py-10 shadow-2xl backdrop-blur-xl md:px-10"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            >
                <div className="space-y-7">
                    <div className="space-y-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">RoomSense</h1>
                            <Time className="text-3xl font-semibold text-muted-foreground" showSeconds={true} />
                        </div>
                        <p className="text-sm text-muted-foreground md:text-base">
                            {isRegistering ? 'Create a new account to access your smart spaces.' : 'Welcome back! Sign in to monitor and secure your rooms.'}
                        </p>
                    </div>

                    {localError && (
                        <Motion.div
                            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {localError}
                        </Motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="username" className="text-sm font-medium text-foreground">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <Input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="username"
                                        className="w-full pl-9"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-foreground">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                        className="w-full pl-9 pr-12"
                                        placeholder="Enter your password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="absolute inset-y-0 right-1 my-1 flex items-center justify-center text-muted-foreground"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {isRegistering && (
                                    <Motion.div
                                        key="role-field"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-2"
                                    >
                                        <label htmlFor="role" className="text-sm font-medium text-foreground">
                                            Role
                                        </label>
                                        <select
                                            id="role"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-3">
                            <Button
                                type="submit"
                                size="lg"
                                variant="default"
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    isRegistering ? 'Create Account' : 'Sign In'
                                )}
                            </Button>
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={toggleMode}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isRegistering ? 'Back to Sign In' : 'Create Account'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Motion.div>
        </Motion.div>
    );
};

export default Login;

