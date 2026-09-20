let Database;

try {
  const sqlite = require('node:sqlite');
  Database = sqlite.DatabaseSync;
} catch (error) {
  Database = require('better-sqlite3');
}

const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..');
const dbPath = process.env.DB_PATH || path.join(dbDir, 'database', 'minepure.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ph REAL,
    tds REAL,
    turbidity REAL,
    temperature REAL,
    flow_rate REAL
  );

  CREATE TABLE IF NOT EXISTS quality_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    ph REAL,
    tds REAL,
    turbidity REAL,
    temperature REAL,
    flow_rate REAL,
    status TEXT,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS treatment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    stage TEXT,
    action TEXT,
    status TEXT,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT,
    severity TEXT,
    message TEXT,
    status TEXT DEFAULT 'ACTIVE'
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE,
    name TEXT,
    status TEXT DEFAULT 'ONLINE',
    last_seen TEXT,
    ip_address TEXT,
    mode TEXT DEFAULT 'AUTO'
  );

  CREATE TABLE IF NOT EXISTS system_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at TEXT
  );
`);

const defaultSettings = [
  ['ph_min', '6.5'],
  ['ph_max', '8.5'],
  ['tds_threshold', '250'],
  ['turbidity_threshold', '2.5'],
  ['temperature_min', '15'],
  ['temperature_max', '35'],
  ['flow_min', '5'],
  ['re_treatment_attempts', '3'],
  ['sensor_update_interval', '5000'],
  ['simulation_mode', 'true'],
  ['demo_mode', 'true'],
  ['alert_sms_enabled', 'false']
];

for (const [key, value] of defaultSettings) {
  const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key);
  if (!existing) {
    db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, new Date().toISOString());
  }
}

const defaultStatus = [
  ['system_status', 'NORMAL'],
  ['connection_status', 'SIMULATION'],
  ['treatment_cycle', 'READY'],
  ['device_mode', 'AUTO'],
  ['last_quality_check', 'PENDING']
];

for (const [key, value] of defaultStatus) {
  const existing = db.prepare('SELECT id FROM system_status WHERE key = ?').get(key);
  if (!existing) {
    db.prepare('INSERT INTO system_status (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, new Date().toISOString());
  }
}

module.exports = db;
