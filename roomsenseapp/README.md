# RoomSenseApp

Frontend of the **RoomSense** platform — an application for monitoring, visualizing, and analyzing indoor climate and sensor data. Built as a modern React SPA, it runs on desktop and mobile (via Capacitor as an iOS/Android app) and communicates with a separate backend that provides authentication, sensor data, AI insights, and weather data.

## Features

- OS-inspired dashboard with a floor plan editor and kiosk mode
- Real-time sensor values (temperature, humidity, CO₂, etc.) with charts & gauges
- AI chatbot and automatic insights for indoor climate data
- Correlation analysis and heatmap view
- Notifications and system health monitoring
- Weather integration
- Box management, pairing flow, and device renaming
- Role-based access control (User / Admin) with server-side authentication via session cookies
- Native builds for iOS and Android via Capacitor

## Tech Stack

- **React 19** + **Vite 7**
- **React Router 7** for routing
- **TanStack Query** for server state management
- **Tailwind CSS 4** + shadcn/ui-style components built on **Radix UI**
- **Framer Motion** for animations
- **Recharts** and **react-gauge-component** for data visualization
- **Axios** for HTTP requests
- **Capacitor 7** for iOS/Android builds
- **ESLint** for linting

## Project Structure

```
roomsenseapp/
├── android/                 # Capacitor Android project
├── ios/                     # Capacitor iOS project
├── certificates/            # Local dev certificates (HTTPS)
├── docs/                    # Additional documentation (auth, routes, frontend)
├── public/                  # Static assets
├── src/
│   ├── assets/              # Images, icons
│   ├── components/          # Reusable UI components
│   │   ├── box-detail/      # Sensor box detail view
│   │   ├── floor-plan/      # Floor plan editor components
│   │   ├── notifications/   # Notification UI
│   │   └── ui/              # shadcn-style base components
│   ├── config/              # Configuration (API URLs, etc.)
│   ├── contexts/            # React contexts (Auth, Theme, Weather, …)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Helper libraries
│   ├── pages/               # Pages / top-level routes
│   ├── services/            # API clients (api, aiAPI, sensorsAPI, …)
│   ├── shared/              # Shared modules
│   ├── styles/              # Global styles
│   ├── utils/               # Utility functions
│   ├── App.jsx              # Routing + providers
│   └── main.jsx             # Entry point
├── capacitor.config.json    # Capacitor configuration
├── vite.config.js           # Vite configuration (incl. HTTPS)
├── eslint.config.js         # ESLint configuration
├── components.json          # shadcn/ui configuration
├── index.html
├── package.json
└── tsconfig*.json
```

## Pages

- `Login` — Login and registration form
- `Dashboard` — Main dashboard with overview, charts, and AI insights
- `BoxManagement` — Manage sensor boxes
- `FloorPlanEditor` — Floor plan editor including box placement
- `HeatmapView` — Heatmap visualization of sensor data
- `CorrelationAnalysis` — Correlations between sensor metrics
- `KioskView` — Full-screen view for stationary displays
- `Weather` — Weather data and outdoor comparison
- `Notifications` — Notification center
- `SystemHealth` — Status overview of all system components
- `Setup` / `Download` / `Admin` / `AboutMe` / `Unauthorized`

## Services (API Layer)

All backend communication is encapsulated in `src/services/`:

- `api.js` — Base client (Axios instance, session cookies, interceptors)
- `sensorsAPI.js` — Sensor and box data
- `aiAPI.js` — AI chatbot & insights
- `floorPlanAPI.js` — Floor plans
- `notificationsAPI.js` — Notifications
- `setupAPI.js` — Onboarding / setup
- `weatherAPI.js` — Weather data

## Authentication

Authentication is handled entirely by the backend (see `docs/AUTH_MIDDLEWARE_DOCUMENTATION.md` and `docs/PROTECTED_ROUTES_DOCUMENTATION.md`):

- HTTP-only session cookies issued by the backend
- The client makes no security-relevant decisions
- `AuthContext` holds the current user state (derived from backend validation)
- `ProtectedRoute` guards routes at the UI level and enforces role checks

## Prerequisites

- Node.js ≥ 20
- npm (or a compatible package manager)
- A running RoomSense backend (for real data)
- Optional for mobile builds: Xcode (iOS) or Android Studio (Android)

## Installation

```bash
git clone <repo-url>
cd roomsenseapp
npm install
```

## Scripts

| Script              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start the Vite development server                        |
| `npm run dev:https` | Start the dev server with HTTPS and network access (`--host`) |
| `npm run build`     | Create a production build in `dist/`                     |
| `npm run preview`   | Preview the production build                             |
| `npm run lint`      | Run ESLint across the project                            |

## Configuration

API endpoints and environment parameters are set in `src/config/` or via Vite environment variables (`.env`, `.env.local`). Typical variables:

```
VITE_API_BASE_URL=https://api.example.com
```

For HTTPS in development, certificates from `certificates/` are used (see `vite.config.js`).

## Mobile Builds (Capacitor)

After running `npm run build`, sync the web build into the native projects:

```bash
npx cap sync
npx cap open ios      # opens Xcode
npx cap open android  # opens Android Studio
```

Capacitor configuration is in `capacitor.config.json`.

## Additional Documentation

Further documents can be found in the `docs/` folder:

- `FRONTEND_README.md` — Detailed frontend documentation
- `AUTH_MIDDLEWARE_DOCUMENTATION.md` — Auth middleware
- `PROTECTED_ROUTES_DOCUMENTATION.md` — Protected routes & roles

## Typical Development Flow

1. Start the backend (provides the API + session cookies).
2. Run `npm run dev:https` and open the app in your browser.
3. Log in or register at `/login`.
4. Pair boxes, create a floor plan, and start visualizing sensor data in the dashboard.

## License

Internal / Proprietary — unless otherwise stated.
