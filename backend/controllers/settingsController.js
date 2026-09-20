const db = require('../database/db');
const { getTimestamp } = require('../utils/helpers');

function getSettings(req, res) {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all();
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  return res.status(200).json({ success: true, data: settings });
}

function updateSettings(req, res) {
  const updates = req.body || {};
  const keys = Object.keys(updates);

  if (!keys.length) {
    return res.status(400).json({ success: false, message: 'No settings provided' });
  }

  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  keys.forEach((key) => {
    stmt.run(key, String(updates[key]), getTimestamp());
  });

  return res.status(200).json({ success: true, message: 'Settings updated' });
}

module.exports = { getSettings, updateSettings };
