# MINEPURE Smart Water Monitoring & Treatment Control System

A complete prototype for a smart water purification and quality monitoring system designed for SIH 2026. The solution includes a Node.js + Express backend, SQLite database, React dashboard, ESP32 communication structure, and a configurable rule-based treatment decision engine.

## Overview

MINEPURE monitors raw and treated water quality using sensor data from a real ESP32 device or simulation mode during demonstrations. It tracks pH, TDS/EC, turbidity, temperature, and flow rate, evaluates treatment stages, triggers alerts, and supports re-treatment loops when final quality fails.

## Features

- Live dashboard with monitoring cards
- Realtime sensor charting using Recharts
- Treatment process visualization
- Rule-based treatment decision engine
- Final quality checks with PASS/FAIL logic
- Re-treatment loop and event logging
- Alerts with severity and status tracking
- Device control interface for operators
- SQLite-backed persistent storage
- Demo mode for SIH prototype without hardware
- ESP32 sketch structure for JSON sensor uploads

## Architecture

- Frontend: React + Vite + JavaScript
- Backend: Node.js + Express
- Database: SQLite via better-sqlite3
- Hardware interface: ESP32 via HTTP JSON payloads

## Folder Structure

```text
minepure/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── database/
│   ├── middleware/
│   ├── utils/
│   ├── server.js
│   └── package.json
├── esp32/
│   └── minepure_esp32.ino
├── README.md
├── .env.example
└── package.json
```

## Technology Stack

- React
- Vite
- Recharts
- Express.js
- better-sqlite3
- dotenv
- CORS
- ESP32 Arduino

## Installation

From the project root:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Backend Setup

1. Copy `.env.example` to `.env`.
2. Configure any required environment values.
3. Start the backend:

```bash
cd backend
npm run dev
```

The server runs on:

- http://localhost:5000

## Frontend Setup

Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend runs on:

- http://localhost:5173

## SQLite Setup

The backend automatically creates the SQLite database and tables on first run. The database file is stored in:

- backend/database/minepure.db

## ESP32 Setup

Open the Arduino sketch in `esp32/minepure_esp32.ino` and update the Wi-Fi credentials and backend URL. The device posts JSON sensor data to:

```text
POST http://<laptop-ip>:5000/api/sensors/readings
```

## API Endpoints

### Health
- `GET /api/health`

### Sensors
- `GET /api/sensors/latest`
- `GET /api/sensors/history`
- `POST /api/sensors/readings`

### Treatment
- `GET /api/treatment/status`
- `POST /api/treatment/control`
- `GET /api/treatment/history`

### Quality
- `GET /api/quality/latest`
- `POST /api/quality/check`

### Alerts
- `GET /api/alerts`
- `POST /api/alerts`
- `PATCH /api/alerts/:id`

### Device
- `GET /api/device/status`
- `POST /api/device/control`

### Reports
- `GET /api/reports/summary`
- `GET /api/reports/export`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

## Demo Mode

When the ESP32 is not connected, the system uses realistic simulation data. Demo controls allow generating normal water, contaminated water, high turbidity, high TDS, abnormal pH, and final fail conditions.

## How to Run

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

## Troubleshooting

- If the database is not created, ensure the backend ran once.
- If CORS errors appear, check `FRONTEND_URL` and backend config.
- If the frontend cannot connect, confirm both services are running.
- If demo mode is not updating, reload the dashboard and keep simulation mode enabled.

## Important Note

This prototype is for monitoring, process management, and demonstration. It must not be interpreted as laboratory-certified potable water validation. It supports informed operational decisions and requires laboratory validation where required.
