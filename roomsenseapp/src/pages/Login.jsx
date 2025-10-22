import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

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
        <div className="flex flex-col items-center justify-center h-screen">
            <h1>RoomSense - {isRegistering ? 'Register' : 'Login'}</h1>
            
            {localError && <div style={{ color: 'red' }}>{localError}</div>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username</label>
                    <Input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                        autoComplete="username"
                    />
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <Input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    />
                </div>

                {isRegistering && (
                    <div>
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                )}

                <div className='flex flex-col gap-2'>
                    <Button type="submit" size='lg' variant='default' disabled={isLoading}>
                        {isLoading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
                    </Button>
                    <Button type="button" size='lg' variant='outline' onClick={toggleMode} disabled={isLoading}>
                        {isRegistering ? 'Back to Login' : 'Create Account'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Login;

