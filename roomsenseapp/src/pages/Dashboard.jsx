import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <div>
                <p>Welcome, {user?.username}!</p>
                <p>User ID: {user?.id}</p>
                <p>Role: {user?.role}</p>
                <p>Member Since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default Dashboard;

