const db = require('../database/db');
const { getTimestamp } = require('../utils/helpers');

function getAlerts(req, res) {
  const rows = db.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT 100').all();
  return res.status(200).json({ success: true, data: rows });
}

function addAlert(req, res) {
  const { type, severity, message, status } = req.body || {};

  if (!type || !severity || !message) {
    return res.status(400).json({ success: false, message: 'type, severity and message are required' });
  }

  const result = db.prepare(`
    INSERT INTO alerts (timestamp, type, severity, message, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(getTimestamp(), type, severity, message, status || 'ACTIVE');

  return res.status(200).json({ success: true, data: { id: result.lastInsertRowid, type, severity, message, status: status || 'ACTIVE' } });
}

function patchAlert(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  const result = db.prepare('UPDATE alerts SET status = ? WHERE id = ?').run(status || 'ACKNOWLEDGED', Number(id));
  if (!result.changes) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  return res.status(200).json({ success: true, message: 'Alert updated' });
}

module.exports = { getAlerts, addAlert, patchAlert };
