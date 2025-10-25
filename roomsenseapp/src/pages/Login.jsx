import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Time from '../components/ui/Time';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [role, setRole] = useState('user');
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
            setLocalError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setLocalError('');
        setPassword('');
    };

    return (
        <motion.div 
            className="flex flex-col items-center justify-center h-screen bg-background px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                className="w-full max-w-md space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {/* Header */}
                <motion.div 
                    className="text-center space-y-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Time className='text-4xl font-bold text-foreground' showSeconds={true} />
                    <h1 className="text-3xl font-bold text-foreground">
                        RoomSense
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {isRegistering ? 'Create your account' : 'Sign in to your account'}
                    </p>
                </motion.div>

                {/* Error Message */}
                {localError && (
                    <motion.div 
                        className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {localError}
                    </motion.div>
                )}

                {/* Form */}
                <motion.form 
                    onSubmit={handleSubmit} 
                    className="space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                    >
                        <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.6 }}
                        >
                            <label htmlFor="username" className="text-sm font-medium text-foreground">
                                Username
                            </label>
                            <Input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                autoComplete="username"
                                className="w-full"
                                placeholder="Enter your username"
                            />
                        </motion.div>

                        <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.7 }}
                        >
                            <label htmlFor="password" className="text-sm font-medium text-foreground">
                                Password
                            </label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                className="w-full"
                                placeholder="Enter your password"
                            />
                        </motion.div>

                        {isRegistering && (
                            <motion.div 
                                className="space-y-2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.8 }}
                            >
                                <label htmlFor="role" className="text-sm font-medium text-foreground">
                                    Role
                                </label>
                                <select
                                    id="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-input bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </motion.div>
                        )}
                    </motion.div>

                    <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.9 }}
                    >
                        <Button 
                            type="submit" 
                            size='lg' 
                            variant='default' 
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
                        </Button>
                        <Button 
                            type="button" 
                            size='lg' 
                            variant='outline' 
                            onClick={toggleMode} 
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isRegistering ? 'Back to Sign In' : 'Create Account'}
                        </Button>
                    </motion.div>
                </motion.form>
            </motion.div>
        </motion.div>
    );
};

export default Login;

