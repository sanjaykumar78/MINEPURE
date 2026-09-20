const db = require('../database/db');

function getReportsSummary(req, res) {
  const latestReading = db.prepare('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1').get();
  const latestQuality = db.prepare('SELECT * FROM quality_checks ORDER BY id DESC LIMIT 1').get();
  const alertsCount = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE status = ?').get('ACTIVE').count;
  const treatmentEvents = db.prepare('SELECT COUNT(*) as count FROM treatment_events').get().count;

  return res.status(200).json({
    success: true,
    data: {
      latestReading,
      latestQuality,
      activeAlerts: alertsCount,
      treatmentEvents,
      generatedAt: new Date().toISOString()
    }
  });
}

function exportReports(req, res) {
  const rows = db.prepare('SELECT * FROM quality_checks ORDER BY id DESC LIMIT 100').all();
  const headers = ['id', 'timestamp', 'ph', 'tds', 'turbidity', 'temperature', 'flow_rate', 'status', 'reason'];
  const csvRows = [headers.join(',')];

  rows.forEach((item) => {
    csvRows.push([
      item.id,
      item.timestamp,
      item.ph,
      item.tds,
      item.turbidity,
      item.temperature,
      item.flow_rate,
      item.status,
      item.reason
    ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=minepure-report.csv');
  return res.status(200).send(csvRows.join('\n'));
}

module.exports = { getReportsSummary, exportReports };
