# RoomSenseApp

Frontend der **RoomSense**-Plattform – einer Anwendung zur Überwachung, Visualisierung und Analyse von Raumklima- und Sensordaten. Das Projekt ist als moderne React-SPA umgesetzt, läuft auf Desktop und Mobilgeräten (via Capacitor als iOS-/Android-App) und kommuniziert mit einem separaten Backend, das Authentifizierung, Sensorik-Daten, KI-Insights und Wetterdaten bereitstellt.

## Features

- OS-inspiriertes Dashboard mit Fenstern, Floor-Plan-Editor und Kiosk-Modus
- Echtzeit-Sensorwerte (Temperatur, Luftfeuchte, CO₂ etc.) mit Charts & Gauges
- KI-Chatbot und automatische Insights zu Raumklima-Daten
- Korrelationsanalyse und Heatmap-Ansicht
- Benachrichtigungen und System-Health-Monitoring
- Wetter-Integration
- Box-Management, Pairing-Flow und Geräte-Umbenennung
- Rollenbasierte Zugriffskontrolle (User / Admin) mit Server-Side-Authentifizierung via Session-Cookies
- Native Builds für iOS und Android über Capacitor

## Tech-Stack

- **React 19** + **Vite 7**
- **React Router 7** für das Routing
- **TanStack Query** für Server-State
- **Tailwind CSS 4** + shadcn/ui-artige Komponenten auf Basis von **Radix UI**
- **Framer Motion** für Animationen
- **Recharts** und **react-gauge-component** für Visualisierung
- **Axios** für HTTP-Calls
- **Capacitor 7** für iOS-/Android-Builds
- **ESLint** für Linting

## Projektstruktur

```
roomsenseapp/
├── android/                 # Capacitor-Android-Projekt
├── ios/                     # Capacitor-iOS-Projekt
├── certificates/            # Lokale Dev-Zertifikate (HTTPS)
├── docs/                    # Zusatzdokumentation (Auth, Routen, Frontend)
├── public/                  # Statische Assets
├── src/
│   ├── assets/              # Bilder, Icons
│   ├── components/          # Wiederverwendbare UI-Komponenten
│   │   ├── box-detail/      # Detailansicht einer Sensor-Box
│   │   ├── floor-plan/      # Floor-Plan-Editor-Komponenten
│   │   ├── notifications/   # Benachrichtigungs-UI
│   │   └── ui/              # shadcn-style Basiskomponenten
│   ├── config/              # Konfiguration (API-URLs etc.)
│   ├── contexts/            # React-Contexts (Auth, Theme, Weather, …)
│   ├── hooks/               # Eigene Hooks
│   ├── lib/                 # Hilfsbibliotheken
│   ├── pages/               # Seiten / Top-Level-Routen
│   ├── services/            # API-Clients (api, aiAPI, sensorsAPI, …)
│   ├── shared/              # Gemeinsam genutzte Module
│   ├── styles/              # Globale Styles
│   ├── utils/               # Utilities
│   ├── App.jsx              # Routing + Provider
│   └── main.jsx             # Einstiegspunkt
├── capacitor.config.json    # Capacitor-Konfiguration
├── vite.config.js           # Vite-Konfiguration (inkl. HTTPS)
├── eslint.config.js         # ESLint-Konfiguration
├── components.json          # shadcn/ui-Konfiguration
├── index.html
├── package.json
└── tsconfig*.json
```

## Seiten (Auswahl)

- `Login` – Login- und Registrierungsformular
- `Dashboard` – Haupt-Dashboard mit Übersicht, Charts und KI-Insights
- `BoxManagement` – Verwaltung der Sensor-Boxen
- `FloorPlanEditor` – Editor für den Grundriss inkl. Box-Platzierung
- `HeatmapView` – Heatmap-Visualisierung
- `CorrelationAnalysis` – Korrelationen zwischen Sensor-Metriken
- `KioskView` – Vollbild-Ansicht für stationäre Displays
- `Weather` – Wetterdaten und Außenvergleich
- `Notifications` – Benachrichtigungs-Center
- `SystemHealth` – Status aller Komponenten
- `Setup` / `Download` / `Admin` / `AboutMe` / `Unauthorized`

## Services (API-Layer)

Die Kommunikation mit dem Backend ist in `src/services/` gekapselt:

- `api.js` – Basis-Client (Axios-Instanz, Session-Cookies, Interceptors)
- `sensorsAPI.js` – Sensor- und Box-Daten
- `aiAPI.js` – KI-Chatbot & Insights
- `floorPlanAPI.js` – Grundrisse
- `notificationsAPI.js` – Benachrichtigungen
- `setupAPI.js` – Onboarding/Setup
- `weatherAPI.js` – Wetter

## Authentifizierung

Authentifizierung läuft vollständig über das Backend (siehe `docs/AUTH_MIDDLEWARE_DOCUMENTATION.md` und `docs/PROTECTED_ROUTES_DOCUMENTATION.md`):

- Session-Cookies (HTTP-Only) vom Backend
- Client trifft keine sicherheitsrelevanten Entscheidungen
- `AuthContext` hält den aktuellen User-Status (aus Backend-Validierung)
- `ProtectedRoute` schützt Routen auf UI-Ebene und prüft Rollen

## Voraussetzungen

- Node.js ≥ 20
- npm (oder ein kompatibler Paketmanager)
- Laufendes RoomSense-Backend (für echte Daten)
- Optional für Mobile Builds: Xcode (iOS) bzw. Android Studio (Android)

## Installation

```bash
git clone <repo-url>
cd roomsenseapp
npm install
```

## Scripts

| Script              | Beschreibung                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Startet den Vite-Dev-Server                                       |
| `npm run dev:https` | Startet den Dev-Server mit HTTPS und Netzwerkfreigabe (`--host`)  |
| `npm run build`     | Erstellt den Produktions-Build in `dist/`                         |
| `npm run preview`   | Vorschau des Produktions-Builds                                   |
| `npm run lint`      | ESLint über das Projekt laufen lassen                             |

## Konfiguration

API-Endpunkte und Umgebungsparameter werden in `src/config/` bzw. über Vite-Umgebungsvariablen (`.env`, `.env.local`) gesetzt. Typische Variablen:

```
VITE_API_BASE_URL=https://api.example.com
```

Für HTTPS im Dev-Modus werden Zertifikate aus `certificates/` verwendet (siehe `vite.config.js`).

## Mobile Builds (Capacitor)

Nach einem `npm run build` kann der Web-Build in die nativen Projekte synchronisiert werden:

```bash
npx cap sync
npx cap open ios      # öffnet Xcode
npx cap open android  # öffnet Android Studio
```

Die Capacitor-Konfiguration liegt in `capacitor.config.json`.

## Dokumentation

Zusätzliche Dokumente im Ordner `docs/`:

- `FRONTEND_README.md` – Detaillierte Frontend-Doku
- `AUTH_MIDDLEWARE_DOCUMENTATION.md` – Auth-Middleware
- `PROTECTED_ROUTES_DOCUMENTATION.md` – Geschützte Routen & Rollen

## Entwicklungsschritte (typischer Flow)

1. Backend starten (liefert API + Session-Cookies).
2. `npm run dev:https` ausführen und im Browser öffnen.
3. Über `/login` anmelden oder registrieren.
4. Im Dashboard Boxen pairen, Floor-Plan anlegen und Sensordaten visualisieren.

## Lizenz

Intern / Proprietär – sofern nicht anders angegeben.
