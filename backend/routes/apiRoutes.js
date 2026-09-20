const express = require('express');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { getLatestReading, getHistory, postReading, demoReadings } = require('../controllers/sensorController');
const { getTreatmentStatus, controlTreatment, getTreatmentHistory, runQualityCheck } = require('../controllers/treatmentController');
const { getAlerts, addAlert, patchAlert } = require('../controllers/alertController');
const { getDeviceStatus, controlDevice } = require('../controllers/deviceController');
const { getReportsSummary, exportReports } = require('../controllers/reportController');
const { getSettings, updateSettings } = require('../controllers/settingsController');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MINEPURE backend is running',
    timestamp: new Date().toISOString()
  });
});

router.get('/sensors/latest', getLatestReading);
router.get('/sensors/history', getHistory);
router.post('/sensors/readings', [
  body('deviceId').optional().isString().trim(),
  body('ph').optional().isFloat({ min: 0, max: 14 }),
  body('tds').optional().isFloat({ min: 0, max: 2000 }),
  body('turbidity').optional().isFloat({ min: 0, max: 100 }),
  body('temperature').optional().isFloat({ min: -50, max: 100 }),
  body('flowRate').optional().isFloat({ min: 0, max: 200 })
], handleValidationErrors, postReading);
router.get('/sensors/demo', demoReadings);

router.get('/treatment/status', getTreatmentStatus);
router.post('/treatment/control', [
  body('stage').isString().notEmpty(),
  body('action').isString().notEmpty()
], handleValidationErrors, controlTreatment);
router.get('/treatment/history', getTreatmentHistory);
router.post('/treatment/check', runQualityCheck);

router.get('/quality/latest', (req, res) => {
  const latest = require('../database/db').prepare('SELECT * FROM quality_checks ORDER BY id DESC LIMIT 1').get();
  res.status(200).json({ success: true, data: latest });
});
router.post('/quality/check', runQualityCheck);

router.get('/alerts', getAlerts);
router.post('/alerts', [
  body('type').isString().notEmpty(),
  body('severity').isIn(['INFO', 'WARNING', 'CRITICAL']),
  body('message').isString().notEmpty()
], handleValidationErrors, addAlert);
router.patch('/alerts/:id', [param('id').isInt()], handleValidationErrors, patchAlert);

router.get('/device/status', getDeviceStatus);
router.post('/device/control', [
  body('module').isString().notEmpty(),
  body('state').isIn(['ON', 'OFF', 'OPEN', 'CLOSED'])
], handleValidationErrors, controlDevice);

router.get('/reports/summary', getReportsSummary);
router.get('/reports/export', exportReports);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
