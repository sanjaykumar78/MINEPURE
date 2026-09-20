const db = require('../database/db');
const { sanitizeSensorPayload, getTimestamp } = require('../utils/helpers');
const { generateDemoReadings, upsertSystemStatus, logAlert } = require('../services/simulationService');
const { finalQualityCheck } = require('../services/treatmentDecisionEngine');

function getLatestReading(req, res) {
  const row = db.prepare('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1').get();
  if (!row) {
    return res.status(200).json({ success: true, data: null });
  }

  return res.status(200).json({
    success: true,
    data: {
      id: row.id,
      deviceId: row.device_id,
      timestamp: row.timestamp,
      ph: row.ph,
      tds: row.tds,
      turbidity: row.turbidity,
      temperature: row.temperature,
      flowRate: row.flow_rate
    }
  });
}

function getHistory(req, res) {
  const rows = db.prepare('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 100').all();
  return res.status(200).json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      timestamp: row.timestamp,
      ph: row.ph,
      tds: row.tds,
      turbidity: row.turbidity,
      temperature: row.temperature,
      flowRate: row.flow_rate
    }))
  });
}

function postReading(req, res) {
  const payload = sanitizeSensorPayload(req.body || {});
  const timestamp = getTimestamp();

  db.prepare(`
    INSERT INTO sensor_readings (device_id, timestamp, ph, tds, turbidity, temperature, flow_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(payload.deviceId, timestamp, payload.ph, payload.tds, payload.turbidity, payload.temperature, payload.flowRate);

  db.prepare(`
    INSERT INTO devices (device_id, name, status, last_seen, mode)
    VALUES (?, ?, 'ONLINE', ?, 'AUTO')
    ON CONFLICT(device_id) DO UPDATE SET status = 'ONLINE', last_seen = excluded.last_seen, mode = excluded.mode
  `).run(payload.deviceId, payload.deviceId, timestamp);

  upsertSystemStatus('connection_status', 'ESP32');
  upsertSystemStatus('last_quality_check', 'PENDING');

  const qualityResult = finalQualityCheck(payload);
  db.prepare(`
    INSERT INTO quality_checks (timestamp, ph, tds, turbidity, temperature, flow_rate, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(timestamp, payload.ph, payload.tds, payload.turbidity, payload.temperature, payload.flowRate, qualityResult.status, qualityResult.reason);

  if (qualityResult.status === 'FAIL') {
    logAlert('Final quality FAIL', 'CRITICAL', 'Final quality check failed and outlet is on hold');
  }

  return res.status(200).json({
    success: true,
    message: 'Reading received',
    data: payload,
    quality: qualityResult
  });
}

function demoReadings(req, res) {
  const mode = req.query.mode || 'normal';
  const payload = generateDemoReadings(mode);
  const timestamp = getTimestamp();

  db.prepare(`
    INSERT INTO sensor_readings (device_id, timestamp, ph, tds, turbidity, temperature, flow_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(payload.deviceId, timestamp, payload.ph, payload.tds, payload.turbidity, payload.temperature, payload.flowRate);

  const qualityResult = finalQualityCheck(payload); 
  db.prepare(`INSERT INTO quality_checks (timestamp, ph, tds, turbidity, temperature, flow_rate, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(timestamp, payload.ph, payload.tds, payload.turbidity, payload.temperature, payload.flowRate, qualityResult.status, qualityResult.reason);

  if (qualityResult.status === 'FAIL') {
    logAlert('Final quality FAIL', 'CRITICAL', 'Simulation mode detected final quality fail');
  }

  return res.status(200).json({ success: true, data: payload, quality: qualityResult });
}

module.exports = { getLatestReading, getHistory, postReading, demoReadings };
