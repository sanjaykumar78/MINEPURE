const db = require('../database/db');
const { evaluateTreatment, finalQualityCheck } = require('../services/treatmentDecisionEngine');
const { logTreatmentEvent, logAlert, upsertSystemStatus } = require('../services/simulationService');
const { getTimestamp } = require('../utils/helpers');

function getTreatmentStatus(req, res) {
  const latest = db.prepare('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1').get();
  if (!latest) {
    return res.status(200).json({
      success: true,
      data: {
        treatmentStatus: 'READY',
        issues: [],
        actions: [],
        stages: []
      }
    });
  }

  const result = evaluateTreatment({
    ph: latest.ph,
    tds: latest.tds,
    turbidity: latest.turbidity,
    temperature: latest.temperature,
    flowRate: latest.flow_rate
  });

  const stageSummary = [
    { stage: 'Sediment Pre-Filter', status: result.issues.includes('High turbidity detected') ? 'WARNING' : 'ON', sensor: 'Turbidity', flow: 'Normal', alerts: result.issues.includes('High turbidity detected') ? ['High turbidity'] : [] },
    { stage: 'Adsorption Media', status: result.issues.includes('High TDS / EC requiring treatment review') ? 'WARNING' : 'ON', sensor: 'TDS / EC', flow: 'Normal', alerts: result.issues.includes('High TDS / EC requiring treatment review') ? ['High TDS'] : [] },
    { stage: 'Activated Carbon', status: 'ON', sensor: 'Organic load', flow: 'Normal', alerts: [] },
    { stage: 'UV-C Disinfection', status: 'ON', sensor: 'Microbial risk', flow: 'Normal', alerts: [] },
    { stage: 'Optional RO', status: result.actions.includes('optional_ro') ? 'ON' : 'BYPASSED', sensor: 'TDS', flow: 'Normal', alerts: result.actions.includes('optional_ro') ? ['RO recommendation'] : [] },
    { stage: 'Final Quality Check', status: 'ON', sensor: 'All parameters', flow: 'Normal', alerts: [] }
  ];

  return res.status(200).json({ success: true, data: { ...result, stages: stageSummary } });
}

function controlTreatment(req, res) {
  const { stage, action, status, reason } = req.body || {};

  if (!stage || !action) {
    return res.status(400).json({ success: false, message: 'stage and action are required' });
  }

  logTreatmentEvent(stage, action, status || 'OK', reason || 'Manual control');
  upsertSystemStatus('treatment_cycle', status || 'ACTIVE');

  return res.status(200).json({
    success: true,
    message: 'Treatment command applied',
    data: { stage, action, status: status || 'OK', reason: reason || 'Manual control' }
  });
}

function getTreatmentHistory(req, res) {
  const rows = db.prepare('SELECT * FROM treatment_events ORDER BY id DESC LIMIT 100').all();
  return res.status(200).json({ success: true, data: rows });
}

function runQualityCheck(req, res) {
  const latest = db.prepare('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1').get();
  if (!latest) {
    return res.status(404).json({ success: false, message: 'No sensor data available' });
  }

  const quality = finalQualityCheck({
    ph: latest.ph,
    tds: latest.tds,
    turbidity: latest.turbidity,
    temperature: latest.temperature,
    flowRate: latest.flow_rate
  });

  db.prepare(`INSERT INTO quality_checks (timestamp, ph, tds, turbidity, temperature, flow_rate, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(getTimestamp(), latest.ph, latest.tds, latest.turbidity, latest.temperature, latest.flow_rate, quality.status, quality.reason);

  if (quality.status === 'FAIL') {
    logAlert('Final quality FAIL', 'CRITICAL', 'Water held for re-treatment due to quality check fail');
    logTreatmentEvent('Final Quality Check', 'HOLD_OUTLET', 'HOLD', 'Re-treatment required');
    upsertSystemStatus('treatment_cycle', 'RE-TREAT');
  } else {
    logTreatmentEvent('Final Quality Check', 'RELEASE', 'PASS', 'Meets configured target / requires laboratory validation');
    upsertSystemStatus('treatment_cycle', 'READY');
  }

  return res.status(200).json({ success: true, data: quality });
}

module.exports = { getTreatmentStatus, controlTreatment, getTreatmentHistory, runQualityCheck };
