require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./database/db');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

const initializeDemoData = () => {
  const rows = db.prepare('SELECT COUNT(*) as count FROM sensor_readings').get();
  if (rows.count === 0) {
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO sensor_readings (device_id, timestamp, ph, tds, turbidity, temperature, flow_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('MINEPURE-001', timestamp, 7.1, 185, 1.4, 28.2, 12.7);

    db.prepare(`
      INSERT INTO quality_checks (timestamp, ph, tds, turbidity, temperature, flow_rate, status, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(timestamp, 7.1, 185, 1.4, 28.2, 12.7, 'PASS', 'Meets configured target / requires laboratory validation');

    db.prepare(`
      INSERT INTO treatment_events (timestamp, stage, action, status, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(timestamp, 'System', 'STARTUP', 'READY', 'Prototype initialized');

    db.prepare(`
      INSERT INTO alerts (timestamp, type, severity, message, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `).run(timestamp, 'System', 'INFO', 'MINEPURE system initialized in demo mode');
  }
};

initializeDemoData();

app.listen(PORT, () => {
  console.log(`MINEPURE backend running on http://localhost:${PORT}`);
});
