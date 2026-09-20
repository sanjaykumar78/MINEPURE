const db = require('../database/db');
const { getTimestamp, sanitizeSensorPayload } = require('../utils/helpers');

const baseState = {
  ph: 7.1,
  tds: 180,
  turbidity: 1.4,
  temperature: 28.1,
  flowRate: 12.6
};

const scenarioModes = {
  normal: { ph: 7.1, tds: 180, turbidity: 1.3, temperature: 28.2, flowRate: 12.6 },
  contaminated: { ph: 5.8, tds: 420, turbidity: 6.4, temperature: 30.2, flowRate: 8.9 },
  highTurbidity: { ph: 7.3, tds: 210, turbidity: 8.2, temperature: 28.6, flowRate: 9.8 },
  highTds: { ph: 7.5, tds: 580, turbidity: 2.2, temperature: 29.1, flowRate: 11.3 },
  abnormalPh: { ph: 9.4, tds: 220, turbidity: 2.8, temperature: 27.9, flowRate: 12.1 },
  finalFail: { ph: 6.2, tds: 410, turbidity: 5.8, temperature: 31.1, flowRate: 7.3 }
};

function generateDemoReadings(mode = 'normal') {
  const template = scenarioModes[mode] || scenarioModes.normal;
  const variance = {
    ph: (Math.random() - 0.5) * 0.8,
    tds: (Math.random() - 0.5) * 50,
    turbidity: (Math.random() - 0.5) * 2.2,
    temperature: (Math.random() - 0.5) * 2.5,
    flowRate: (Math.random() - 0.5) * 3.5
  };

  const values = {
    deviceId: 'MINEPURE-001',
    ph: Number((template.ph + variance.ph).toFixed(2)),
    tds: Math.max(0, Math.round(template.tds + variance.tds)),
    turbidity: Number((template.turbidity + variance.turbidity).toFixed(2)),
    temperature: Number((template.temperature + variance.temperature).toFixed(2)),
    flowRate: Number((template.flowRate + variance.flowRate).toFixed(2))
  };

  return sanitizeSensorPayload(values);
}

function upsertSystemStatus(key, value) {
  db.prepare(
    `INSERT INTO system_status (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, getTimestamp());
}

function logTreatmentEvent(stage, action, status, reason = '') {
  db.prepare(
    `INSERT INTO treatment_events (timestamp, stage, action, status, reason)
     VALUES (?, ?, ?, ?, ?)`
  ).run(getTimestamp(), stage, action, status, reason);
}

function logAlert(type, severity, message) {
  db.prepare(
    `INSERT INTO alerts (timestamp, type, severity, message, status)
     VALUES (?, ?, ?, ?, 'ACTIVE')`
  ).run(getTimestamp(), type, severity, message);
}

module.exports = {
  generateDemoReadings,
  upsertSystemStatus,
  logTreatmentEvent,
  logAlert,
  scenarioModes,
  baseState
};
