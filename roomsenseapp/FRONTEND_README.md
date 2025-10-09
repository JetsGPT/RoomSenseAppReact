# RoomSense React Frontend

A secure, OS-inspired React application for the RoomSense system with complete server-side authentication.

## Features

- ✅ **Server-Side Authentication**: All authentication checks rely on backend session validation
- ✅ **Protected Routes**: Route protection with role-based access control
- ✅ **OS-Like UI**: Modern, desktop-inspired interface design
- ✅ **Secure Communication**: HTTPS-only with secure cookie handling
- ✅ **Login & Registration**: Complete user authentication flow
- ✅ **Role Management**: Support for different user roles (admin, user)

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.jsx      # Route protection components
├── contexts/
│   └── AuthContext.jsx          # Authentication state management
├── pages/
│   ├── Login.jsx                # Login/Register page
│   ├── Dashboard.jsx            # Main dashboard
│   └── Unauthorized.jsx         # 403 error page
├── services/
│   └── api.js                   # Backend API communication
├── styles/
│   ├── Auth.css                 # Login/Register styles
│   ├── Dashboard.css            # Dashboard styles
│   └── Error.css                # Error page styles
├── App.jsx                      # Main app with routing
├── App.css                      # Global app styles
└── index.css                    # Root styles
```

## Security Architecture

### Client-Side (This App)
- **No sensitive logic**: Client never makes authorization decisions
- **Session-based**: Uses HTTP-only cookies managed by backend
- **Protected routes**: UI-level protection (UX only)
- **API validation**: All requests validated server-side

### Server-Side (Your Backend)
- **Session management**: PostgreSQL-backed sessions
- **Authentication**: Credential validation
- **Authorization**: Role-based access control
- **All security decisions**: Made on the backend

## Available Routes

### Public Routes
- `/login` - Login and registration page (redirects if already authenticated)

### Protected Routes (Requires Authentication)
- `/dashboard` - Main dashboard (all authenticated users)
- `/unauthorized` - Access denied page

### Example Role-Based Routes (Commented in App.jsx)
```jsx
// Admin only
<Route path="/admin" element={
    <RequireRole roles={['admin']}>
        <AdminPanel />
    </RequireRole>
} />

// Multiple roles
<Route path="/sensors" element={
    <RequireRole roles={['admin', 'user']}>
        <SensorsPage />
    </RequireRole>
} />
```

## Component Usage

### Using Protected Routes

```jsx
import { RequireAuth, RequireRole } from './components/ProtectedRoute';

// Require any authenticated user
<RequireAuth>
    <YourComponent />
</RequireAuth>

// Require specific role
<RequireRole roles="admin">
    <AdminComponent />
</RequireRole>

// Require one of multiple roles
<RequireRole roles={['admin', 'moderator']}>
    <ModeratorComponent />
</RequireRole>
```

### Using Auth Context

```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
    const { user, login, logout, hasRole, isAuthenticated } = useAuth();

    // Check if user is logged in
    if (isAuthenticated) {
        console.log('Current user:', user);
    }

    // Check user role
    if (hasRole('admin')) {
        console.log('User is admin');
    }

    // Login
    const handleLogin = async () => {
        const result = await login(username, password);
        if (result.success) {
            // Logged in successfully
        }
    };

    // Logout
    const handleLogout = async () => {
        await logout();
    };
}
```

### Making API Calls

```jsx
import { authAPI } from './services/api';

// The API automatically includes credentials (cookies)
// and handles the secure HTTPS connection

// Get current user
const user = await authAPI.getCurrentUser();

// Get all users (admin only - backend will verify)
const users = await authAPI.getAllUsers();
```

## Running the Application

### Development Mode (HTTPS)
```bash
npm run dev
```

The app will run on `https://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Backend Requirements

This frontend requires the backend to be running at `https://localhost:8081` with the following endpoints:

- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `POST /api/users/logout` - User logout
- `GET /api/users/me` - Get current user info
- `GET /api/users/all` - Get all users (admin only)

## HTTPS Configuration

The app is configured to use HTTPS (matching your backend). Certificates should be in:
- `./certificates/cert.key`
- `./certificates/cert.crt`

## Important Security Notes

⚠️ **Client-side route protection is for UX only!**

The protected routes prevent UI navigation but DO NOT provide actual security. All security decisions MUST be made by your backend:

1. Every API endpoint must verify the session
2. Every role-protected endpoint must check user roles server-side
3. Never trust client-side role checks for security
4. The middleware `requireLogin` and `requireRole` in your backend are the real security

## Future Development

To add new protected pages:

1. Create your page component in `src/pages/`
2. Add the route in `src/App.jsx`:
```jsx
<Route path="/your-page" element={
    <RequireAuth>
        <YourPage />
    </RequireAuth>
} />
```

3. Make sure the backend has corresponding API endpoints with proper authentication/authorization

## Dependencies

- `react` - UI library
- `react-router-dom` - Client-side routing
- `axios` - HTTP client for API calls

## Browser Support

Modern browsers with ES6+ support and secure context (HTTPS) capability.

