const db = require('../database/db');
const { getTimestamp } = require('../utils/helpers');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  return settings;
}

function evaluateTreatment(data) {
  const settings = getSettings();
  const thresholds = {
    phMin: Number(settings.ph_min ?? 6.5),
    phMax: Number(settings.ph_max ?? 8.5),
    tdsThreshold: Number(settings.tds_threshold ?? 250),
    turbidityThreshold: Number(settings.turbidity_threshold ?? 2.5),
    temperatureMin: Number(settings.temperature_min ?? 15),
    temperatureMax: Number(settings.temperature_max ?? 35),
    flowMin: Number(settings.flow_min ?? 5)
  };

  const issues = [];
  const actions = [];

  if (Number(data.turbidity) > thresholds.turbidityThreshold) {
    issues.push('High turbidity detected');
    actions.push('sediment_filtration');
  }

  if (Number(data.ph) < thresholds.phMin || Number(data.ph) > thresholds.phMax) {
    issues.push('pH outside configured operating range');
    actions.push('ph_adjustment');
  }

  if (Number(data.tds) > thresholds.tdsThreshold) {
    issues.push('High TDS / EC requiring treatment review');
    actions.push('optional_ro');
  }

  if (Number(data.temperature) < thresholds.temperatureMin || Number(data.temperature) > thresholds.temperatureMax) {
    issues.push('Temperature outside operating limit');
    actions.push('temperature_control');
  }

  if (Number(data.flowRate) < thresholds.flowMin) {
    issues.push('Flow below configured minimum');
    actions.push('flow_review');
  }

  const treatmentStatus = issues.length === 0 ? 'SAFE' : 'REVIEW';

  return {
    treatmentStatus,
    issues,
    actions,
    thresholds,
    timestamp: getTimestamp()
  };
}

function finalQualityCheck(data) {
  const settings = getSettings();
  const thresholds = {
    phMin: Number(settings.ph_min ?? 6.5),
    phMax: Number(settings.ph_max ?? 8.5),
    tdsThreshold: Number(settings.tds_threshold ?? 250),
    turbidityThreshold: Number(settings.turbidity_threshold ?? 2.5),
    temperatureMin: Number(settings.temperature_min ?? 15),
    temperatureMax: Number(settings.temperature_max ?? 35),
    flowMin: Number(settings.flow_min ?? 5)
  };

  const reasons = [];

  if (Number(data.ph) < thresholds.phMin || Number(data.ph) > thresholds.phMax) reasons.push('pH outside target range');
  if (Number(data.tds) > thresholds.tdsThreshold) reasons.push('TDS exceeds configured target');
  if (Number(data.turbidity) > thresholds.turbidityThreshold) reasons.push('Turbidity exceeds configured target');
  if (Number(data.temperature) < thresholds.temperatureMin || Number(data.temperature) > thresholds.temperatureMax) reasons.push('Temperature outside target');
  if (Number(data.flowRate) < thresholds.flowMin) reasons.push('Flow below configured minimum');

  const status = reasons.length === 0 ? 'PASS' : 'FAIL';

  return {
    status,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Meets configured target / requires laboratory validation',
    timestamp: getTimestamp()
  };
}

module.exports = {
  evaluateTreatment,
  finalQualityCheck,
  getSettings
};
