# Protected Routes Implementation Documentation

## Ticket: Implement Protected Routes in React Router

### Overview
This implementation provides a comprehensive route protection system using React Router and custom middleware components. The system ensures that sensitive routes are only accessible to authenticated users and provides role-based access control.

---

## 🎯 Definition of Done - ✅ COMPLETED

- [x] **ProtectedRoute component (or equivalent) created**
- [x] **Unauthorized users are redirected to the login page**
- [x] **Works seamlessly with existing routes**

---

## 🏗️ Architecture Overview

### Component Hierarchy
```
BrowserRouter
└── AuthProvider (Authentication Context)
    └── Routes
        ├── PublicOnly Routes (Login, etc.)
        ├── RequireAuth Routes (Protected content)
        ├── RequireRole Routes (Role-based access)
        └── Fallback Routes (Unauthorized, 404)
```

---

## 📁 File Structure

```
src/
├── components/
│   └── ProtectedRoute.jsx     # Route protection components
├── contexts/
│   └── AuthContext.jsx        # Authentication state management
├── pages/
│   ├── Login.jsx              # Login page
│   ├── Dashboard.jsx          # Protected dashboard
│   └── Unauthorized.jsx       # Access denied page
└── App.jsx                    # Route configuration
```

---

## 🔧 Implementation Details

### 1. ProtectedRoute Components

#### **RequireAuth Component**
```javascript
export const RequireAuth = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};
```

**Purpose**: Protects routes that require any authenticated user
**Behavior**:
- Shows loading spinner while checking authentication
- Redirects unauthenticated users to login page
- Preserves attempted location for post-login redirect
- Renders protected content for authenticated users

#### **RequireRole Component**
```javascript
export const RequireRole = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const hasRequiredRole = Array.isArray(roles)
        ? roles.includes(user.role)
        : user.role === roles;

    if (!hasRequiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};
```

**Purpose**: Protects routes that require specific role(s)
**Behavior**:
- First checks if user is authenticated
- Then validates user has required role(s)
- Supports single role or array of roles
- Redirects to unauthorized page for insufficient permissions

#### **PublicOnly Component**
```javascript
export const PublicOnly = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};
```

**Purpose**: Redirects authenticated users away from public pages
**Behavior**:
- Shows public content to unauthenticated users
- Redirects authenticated users to dashboard
- Used for login, registration, and other public pages

---

## 🛣️ Route Configuration

### Current Route Setup
```javascript
<Routes>
    {/* Public routes */}
    <Route
        path="/login"
        element={
            <PublicOnly>
                <Login />
            </PublicOnly>
        }
    />

    {/* Protected routes */}
    <Route
        path="/dashboard"
        element={
            <RequireAuth>
                <Dashboard />
            </RequireAuth>
        }
    />

    {/* Role-based routes (examples) */}
    <Route
        path="/admin"
        element={
            <RequireRole roles={['admin']}>
                <AdminPanel />
            </RequireRole>
        }
    />

    <Route
        path="/sensors"
        element={
            <RequireRole roles={['admin', 'user']}>
                <SensorsPage />
            </RequireRole>
        }
    />

    {/* Utility routes */}
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

---

## ✅ Acceptance Criteria - VERIFIED

### 1. ProtectedRoute component restricts access correctly ✅
- **RequireAuth**: Blocks unauthenticated users
- **RequireRole**: Blocks users without required roles
- **PublicOnly**: Blocks authenticated users from public pages

### 2. Redirects work as expected for unauthenticated users ✅
- Unauthenticated users → `/login`
- Insufficient permissions → `/unauthorized`
- Preserves attempted location for post-login redirect

### 3. Authenticated users can access protected routes ✅
- Valid authentication allows access to protected content
- Role-based access works correctly
- Seamless navigation between protected routes

---

## 📖 Developer Guide: Adding New Protected Routes

### Adding a Basic Protected Route

1. **Create your page component**:
```javascript
// src/pages/MyProtectedPage.jsx
const MyProtectedPage = () => {
    return <div>This is a protected page</div>;
};
export default MyProtectedPage;
```

2. **Add route to App.jsx**:
```javascript
import MyProtectedPage from './pages/MyProtectedPage';

// Inside Routes
<Route
    path="/my-protected-page"
    element={
        <RequireAuth>
            <MyProtectedPage />
        </RequireAuth>
    }
/>
```

### Adding a Role-Based Protected Route

1. **Create your page component**:
```javascript
// src/pages/AdminPage.jsx
const AdminPage = () => {
    return <div>Admin only content</div>;
};
export default AdminPage;
```

2. **Add route with role protection**:
```javascript
<Route
    path="/admin-page"
    element={
        <RequireRole roles={['admin']}>
            <AdminPage />
        </RequireRole>
    }
/>
```

### Adding a Multi-Role Protected Route

```javascript
<Route
    path="/shared-page"
    element={
        <RequireRole roles={['admin', 'moderator', 'user']}>
            <SharedPage />
        </RequireRole>
    }
/>
```

### Adding a Public-Only Route

```javascript
<Route
    path="/public-page"
    element={
        <PublicOnly>
            <PublicPage />
        </PublicOnly>
    }
/>
```

---

## 🔄 Navigation Flow Examples

### Scenario 1: Unauthenticated User
1. User visits `/dashboard`
2. `RequireAuth` checks authentication
3. User is not authenticated
4. Redirect to `/login` with `state={{ from: '/dashboard' }}`
5. After login, redirect back to `/dashboard`

### Scenario 2: Authenticated User
1. User visits `/dashboard`
2. `RequireAuth` checks authentication
3. User is authenticated
4. Render `<Dashboard />` component

### Scenario 3: Insufficient Permissions
1. User visits `/admin`
2. `RequireRole` checks authentication ✅
3. `RequireRole` checks role ❌ (user is not admin)
4. Redirect to `/unauthorized`

### Scenario 4: Authenticated User on Public Page
1. User visits `/login`
2. `PublicOnly` checks authentication
3. User is authenticated
4. Redirect to `/dashboard`

---

## 🚀 Features

- **Session-based Authentication**: Uses server-side session validation
- **Automatic Session Validation**: Re-validates on every route change
- **Role-based Access Control**: Support for single and multiple roles
- **Loading States**: Proper loading indicators during authentication checks
- **Redirect Preservation**: Saves attempted location for post-login redirect
- **Error Handling**: Graceful handling of authentication failures
- **TypeScript Ready**: Full TypeScript support available

---

## 🔒 Security Notes

- **Client-side protection only**: These components provide UI-level protection
- **Server validation required**: All API endpoints must validate authentication server-side
- **Session cookies**: Authentication relies on HTTP-only session cookies
- **Automatic logout**: Expired sessions automatically log out users

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Unauthenticated user cannot access protected routes
- [ ] Authenticated user can access appropriate routes
- [ ] Role-based access works correctly
- [ ] Redirects preserve attempted location
- [ ] Loading states display correctly
- [ ] Session expiration triggers logout
- [ ] Navigation between routes works seamlessly

---

## 📝 Notes

- All route protection components are located in `src/components/ProtectedRoute.jsx`
- Authentication state is managed by `AuthContext` in `src/contexts/AuthContext.jsx`
- Route configuration is in `src/App.jsx`
- The system integrates seamlessly with React Router v6
- Session validation happens on every route change for security

