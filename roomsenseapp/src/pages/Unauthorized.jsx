import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleGoBack = () => {
        navigate('/dashboard');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div>
            <h1>Access Denied</h1>
            <p>You don&apos;t have permission to access this resource.</p>
            <div>
                <p>User: {user?.username}</p>
                <p>Role: {user?.role}</p>
            </div>
            <button onClick={handleGoBack}>Go to Dashboard</button>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default Unauthorized;

