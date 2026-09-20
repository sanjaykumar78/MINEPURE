const { randomUUID } = require('crypto');

function getTimestamp() {
  return new Date().toISOString();
}

function sanitizeSensorPayload(payload = {}) {
  const safe = {};
  safe.deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : 'MINEPURE-001';
  safe.ph = Number(payload.ph ?? 7.0);
  safe.tds = Number(payload.tds ?? 180);
  safe.turbidity = Number(payload.turbidity ?? 1.2);
  safe.temperature = Number(payload.temperature ?? 28.0);
  safe.flowRate = Number(payload.flowRate ?? 12.0);

  if (!Number.isFinite(safe.ph)) safe.ph = 7.0;
  if (!Number.isFinite(safe.tds)) safe.tds = 180;
  if (!Number.isFinite(safe.turbidity)) safe.turbidity = 1.2;
  if (!Number.isFinite(safe.temperature)) safe.temperature = 28.0;
  if (!Number.isFinite(safe.flowRate)) safe.flowRate = 12.0;

  return safe;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createAlertRecord(type, severity, message) {
  return {
    id: randomUUID(),
    timestamp: getTimestamp(),
    type,
    severity,
    message,
    status: 'ACTIVE'
  };
}

module.exports = {
  getTimestamp,
  sanitizeSensorPayload,
  clamp,
  createAlertRecord
};
