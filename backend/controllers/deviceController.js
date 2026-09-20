const db = require('../database/db');
const { getTimestamp } = require('../utils/helpers');

function getDeviceStatus(req, res) {
  const device = db.prepare('SELECT * FROM devices ORDER BY id DESC LIMIT 1').get();
  const systemStatus = db.prepare('SELECT key, value FROM system_status').all();
  const statusMap = {};
  systemStatus.forEach((item) => {
    statusMap[item.key] = item.value;
  });

  return res.status(200).json({
    success: true,
    data: {
      device: device || { device_id: 'MINEPURE-001', status: 'ONLINE', mode: 'AUTO' },
      systemStatus: statusMap,
      timestamp: getTimestamp()
    }
  });
}

function controlDevice(req, res) {
  const { deviceId, module, state } = req.body || {};

  if (!module || !state) {
    return res.status(400).json({ success: false, message: 'module and state are required' });
  }

  const normalizedDeviceId = deviceId || 'MINEPURE-001';
  db.prepare(`
    INSERT INTO devices (device_id, name, status, last_seen, mode)
    VALUES (?, ?, 'ONLINE', ?, 'AUTO')
    ON CONFLICT(device_id) DO UPDATE SET status = 'ONLINE', last_seen = excluded.last_seen, mode = excluded.mode
  `).run(normalizedDeviceId, normalizedDeviceId, getTimestamp());

  return res.status(200).json({
    success: true,
    message: 'Device control command accepted',
    data: { deviceId: normalizedDeviceId, module, state, timestamp: getTimestamp() }
  });
}

module.exports = { getDeviceStatus, controlDevice };
