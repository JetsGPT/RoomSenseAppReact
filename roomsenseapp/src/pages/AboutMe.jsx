import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { User, Shield, Calendar, Hash, Settings, Mail, Phone } from 'lucide-react';

const AboutMe = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
                        About Me
                    </h1>
                   
                </div>

                {/* User Information Block */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <InfoBlock title="Account Information" className="lg:col-span-2">
                        <InfoItem 
                            label="Username" 
                            value={user?.username} 
                            icon={User}
                        />
                        {fullName && (
                            <InfoItem 
                                label="Full Name" 
                                value={fullName} 
                                icon={User}
                            />
                        )}
                        {user?.email && (
                            <InfoItem 
                                label="Email" 
                                value={user.email} 
                                icon={Mail}
                            />
                        )}
                        {user?.phone && (
                            <InfoItem 
                                label="Phone" 
                                value={user.phone} 
                                icon={Phone}
                            />
                        )}
                        <InfoItem 
                            label="User ID" 
                            value={user?.id} 
                            icon={Hash}
                        />
                        <InfoItem 
                            label="Role" 
                            value={user?.role} 
                            icon={Shield}
                        />
                        <InfoItem 
                            label="Member Since" 
                            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} 
                            icon={Calendar}
                        />
                    </InfoBlock>

                    {/* Quick Actions Block */}
                    <InfoBlock title="Quick Actions">
                        <div className="space-y-3">
                            <button 
                                onClick={handleLogout}
                                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors font-medium"
                            >
                                Sign Out
                            </button>
                            <Link
                                to="/settings"
                                className="w-full px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent/40 text-foreground rounded-md hover:bg-accent/60 transition-colors font-medium"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </div>
                    </InfoBlock>
                </div>
            </div>
        </div>
    );
};

export default AboutMe;

