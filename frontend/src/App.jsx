import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import api from './services/api';

const navItems = [
  'Dashboard',
  'Live Monitoring',
  'Treatment Process',
  'Decision Engine',
  'Device Control',
  'Quality Check',
  'Alerts',
  'History',
  'Reports',
  'Settings'
];

const getStatusClass = (value) => {
  if (!value) return 'info';
  const v = String(value).toUpperCase();
  if (v.includes('SAFE') || v.includes('NORMAL') || v.includes('PASS') || v.includes('READY')) return 'safe';
  if (v.includes('WARNING') || v.includes('REVIEW') || v.includes('ACTIVE')) return 'warning';
  if (v.includes('CRITICAL') || v.includes('FAIL') || v.includes('HOLD') || v.includes('RE-TREAT')) return 'critical';
  return 'info';
};

const defaultSystem = {
  systemStatus: 'NORMAL',
  connectionStatus: 'SIMULATION',
  treatmentCycle: 'READY',
  dateTime: new Date().toISOString()
};

function App() {
  const [selectedPage, setSelectedPage] = useState('Dashboard');
  const [systemInfo, setSystemInfo] = useState(defaultSystem);
  const [latestReading, setLatestReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [treatmentStatus, setTreatmentStatus] = useState({ treatmentStatus: 'READY', issues: [], actions: [], stages: [] });
  const [settings, setSettings] = useState({});
  const [qualityLatest, setQualityLatest] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState({ device: { device_id: 'MINEPURE-001', status: 'ONLINE', mode: 'AUTO' }, systemStatus: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sensors, alertsRes, treatmentRes, qualityRes, settingsRes, deviceRes] = await Promise.all([
        api.get('/sensors/latest'),
        api.get('/alerts'),
        api.get('/treatment/status'),
        api.get('/quality/latest'),
        api.get('/settings'),
        api.get('/device/status')
      ]);

      setLatestReading(sensors.data.data);
      setAlerts(alertsRes.data.data || []);
      setTreatmentStatus(treatmentRes.data.data || { treatmentStatus: 'READY', issues: [], actions: [], stages: [] });
      setQualityLatest(qualityRes.data.data);
      setSettings(settingsRes.data.data || {});
      setDeviceStatus(deviceRes.data.data || { device: { device_id: 'MINEPURE-001' }, systemStatus: {} });
      setSystemInfo({
        systemStatus: deviceRes.data.data?.systemStatus?.system_status || 'NORMAL',
        connectionStatus: deviceRes.data.data?.systemStatus?.connection_status || 'SIMULATION',
        treatmentCycle: deviceRes.data.data?.systemStatus?.treatment_cycle || 'READY',
        dateTime: new Date().toISOString()
      });
      setDemoMode(String(settingsRes.data.data?.simulation_mode ?? 'true') === 'true');
    } catch (error) {
      console.error('Dashboard load failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/sensors/history');
      setHistory(res.data.data || []);
    } catch (error) {
      console.error('History load failed', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (demoMode) {
        const modes = ['normal', 'contaminated', 'highTurbidity', 'highTds', 'abnormalPh', 'finalFail'];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        api.get(`/sensors/demo?mode=${randomMode}`)
          .then(() => {
            loadDashboardData();
            loadHistory();
          })
          .catch((error) => console.error('Demo update failed', error));
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [demoMode]);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    return [...history].reverse().slice(-20).map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ph: Number(item.ph),
      tds: Number(item.tds),
      turbidity: Number(item.turbidity),
      temperature: Number(item.temperature),
      flowRate: Number(item.flowRate)
    }));
  }, [history]);

  const qualityStatus = latestReading ? (() => {
    if (Number(latestReading.turbidity) > Number(settings.turbidity_threshold || 2.5) || Number(latestReading.tds) > Number(settings.tds_threshold || 250) || Number(latestReading.ph) < Number(settings.ph_min || 6.5) || Number(latestReading.ph) > Number(settings.ph_max || 8.5)) {
      return 'WARNING';
    }
    return 'SAFE';
  })() : 'SAFE';

  const metricCards = [
    { label: 'pH', value: latestReading ? Number(latestReading.ph).toFixed(2) : '--', status: qualityStatus },
    { label: 'TDS / EC', value: latestReading ? `${Math.round(latestReading.tds)} ppm` : '--', status: qualityStatus },
    { label: 'Turbidity', value: latestReading ? `${Number(latestReading.turbidity).toFixed(2)} NTU` : '--', status: qualityStatus },
    { label: 'Temperature', value: latestReading ? `${Number(latestReading.temperature).toFixed(1)} °C` : '--', status: 'SAFE' },
    { label: 'Flow Rate', value: latestReading ? `${Number(latestReading.flowRate).toFixed(1)} L/min` : '--', status: 'SAFE' },
    { label: 'Water Quality Status', value: qualityStatus, status: qualityStatus }
  ];

  const runDemoScenario = async (mode) => {
    await api.get(`/sensors/demo?mode=${mode}`);
    loadDashboardData();
    loadHistory();
  };

  const handleControl = async (module, state) => {
    await api.post('/device/control', { module, state });
    loadDashboardData();
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="panel empty-state">Loading MINEPURE system...</div>;
    }

    switch (selectedPage) {
      case 'Live Monitoring':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header">
                <h3>Live Monitoring</h3>
                <div className="demo-indicator">DEMO MODE</div>
              </div>
              <div className="btn-group">
                <button className="btn" onClick={() => runDemoScenario('normal')}>NORMAL WATER</button>
                <button className="btn secondary" onClick={() => runDemoScenario('contaminated')}>CONTAMINATED WATER</button>
                <button className="btn warning" onClick={() => runDemoScenario('highTurbidity')}>HIGH TURBIDITY</button>
                <button className="btn secondary" onClick={() => runDemoScenario('highTds')}>HIGH TDS</button>
                <button className="btn warning" onClick={() => runDemoScenario('abnormalPh')}>ABNORMAL pH</button>
                <button className="btn danger" onClick={() => runDemoScenario('finalFail')}>FINAL FAIL</button>
              </div>
            </div>
            <div className="grid-2">
              <div className="panel chart-box">
                <div className="panel-header"><h3>pH vs Time</h3></div>
                <ResponsiveContainer width="100%" height="220px"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Line type="monotone" dataKey="ph" stroke="#0d6efd" strokeWidth={2}/></LineChart></ResponsiveContainer>
              </div>
              <div className="panel chart-box">
                <div className="panel-header"><h3>TDS vs Time</h3></div>
                <ResponsiveContainer width="100%" height="220px"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Area type="monotone" dataKey="tds" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25}/></AreaChart></ResponsiveContainer>
              </div>
              <div className="panel chart-box">
                <div className="panel-header"><h3>Turbidity vs Time</h3></div>
                <ResponsiveContainer width="100%" height="220px"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Line type="monotone" dataKey="turbidity" stroke="#f59e0b" strokeWidth={2}/></LineChart></ResponsiveContainer>
              </div>
              <div className="panel chart-box">
                <div className="panel-header"><h3>Temperature vs Time</h3></div>
                <ResponsiveContainer width="100%" height="220px"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Area type="monotone" dataKey="temperature" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2}/></AreaChart></ResponsiveContainer>
              </div>
              <div className="panel chart-box">
                <div className="panel-header"><h3>Flow Rate vs Time</h3></div>
                <ResponsiveContainer width="100%" height="220px"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Bar dataKey="flowRate" fill="#0ea5a4"/></BarChart></ResponsiveContainer>
              </div>
              <div className="panel">
                <div className="panel-header"><h3>Current live values</h3></div>
                <table className="table">
                  <tbody>
                    <tr><td>pH</td><td>{latestReading ? Number(latestReading.ph).toFixed(2) : '--'}</td></tr>
                    <tr><td>TDS</td><td>{latestReading ? `${Math.round(latestReading.tds)} ppm` : '--'}</td></tr>
                    <tr><td>Turbidity</td><td>{latestReading ? `${Number(latestReading.turbidity).toFixed(2)} NTU` : '--'}</td></tr>
                    <tr><td>Temperature</td><td>{latestReading ? `${Number(latestReading.temperature).toFixed(1)} °C` : '--'}</td></tr>
                    <tr><td>Flow Rate</td><td>{latestReading ? `${Number(latestReading.flowRate).toFixed(1)} L/min` : '--'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'Treatment Process':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Treatment Pipeline</h3></div>
              <div className="stage-list">
                {['RAW WATER','SEDIMENT PRE-FILTER','ADSORPTION MEDIA','ACTIVATED CARBON','UV-C DISINFECTION','OPTIONAL RO','FINAL QUALITY CHECK'].map((stage, index) => (
                  <div className="stage-item" key={stage}>
                    <div className="stage-name">{stage}</div>
                    <div>{index === 0 ? 'RAW' : 'ON'}</div>
                    <div>{index === 0 ? 'Raw feed' : 'Normal flow'}</div>
                    <div>{index === 0 ? '—' : 'No active alert'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Stage state</h3></div>
              <table className="table">
                <thead>
                  <tr><th>Stage</th><th>Status</th><th>Sensor</th><th>Flow</th><th>Alerts</th></tr>
                </thead>
                <tbody>
                  {(treatmentStatus.stages || []).map((stage, idx) => (
                    <tr key={`${stage.stage}-${idx}`}>
                      <td>{stage.stage}</td>
                      <td><span className={`status-badge ${getStatusClass(stage.status)}`}>{stage.status}</span></td>
                      <td>{stage.sensor}</td>
                      <td>{stage.flow}</td>
                      <td>{(stage.alerts || []).join(', ') || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Decision Engine':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Smart Treatment Decision Engine</h3></div>
              <div className="btn-group">
                <button className="btn" onClick={() => api.post('/treatment/check')}>Run Decision Check</button>
              </div>
              <table className="table">
                <thead><tr><th>Parameter</th><th>Configured threshold</th><th>Current value</th></tr></thead>
                <tbody>
                  <tr><td>pH range</td><td>{settings.ph_min || 6.5} - {settings.ph_max || 8.5}</td><td>{latestReading ? Number(latestReading.ph).toFixed(2) : '--'}</td></tr>
                  <tr><td>TDS threshold</td><td>{settings.tds_threshold || 250}</td><td>{latestReading ? `${Math.round(latestReading.tds)} ppm` : '--'}</td></tr>
                  <tr><td>Turbidity threshold</td><td>{settings.turbidity_threshold || 2.5}</td><td>{latestReading ? `${Number(latestReading.turbidity).toFixed(2)} NTU` : '--'}</td></tr>
                  <tr><td>Flow minimum</td><td>{settings.flow_min || 5}</td><td>{latestReading ? `${Number(latestReading.flowRate).toFixed(1)} L/min` : '--'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Rule evaluation result</h3></div>
              <p><strong>Status:</strong> {treatmentStatus.treatmentStatus}</p>
              <ul>
                {(treatmentStatus.issues || []).map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
              <p><strong>Recommended actions:</strong> {(treatmentStatus.actions || []).join(', ') || 'None'}</p>
            </div>
          </div>
        );
      case 'Device Control':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Control Console</h3></div>
              <div className="btn-group">
                <button className="btn" onClick={() => handleControl('feedPump', 'ON')}>Feed Pump ON</button>
                <button className="btn secondary" onClick={() => handleControl('feedPump', 'OFF')}>Feed Pump OFF</button>
                <button className="btn warning" onClick={() => handleControl('uv', 'ON')}>UV ON</button>
                <button className="btn danger" onClick={() => handleControl('uv', 'OFF')}>UV OFF</button>
                <button className="btn secondary" onClick={() => handleControl('valve', 'OPEN')}>Valve OPEN</button>
                <button className="btn danger" onClick={() => handleControl('valve', 'CLOSED')}>Valve CLOSED</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Device status</h3></div>
              <table className="table">
                <tbody>
                  <tr><td>Device ID</td><td>{deviceStatus.device?.device_id || 'MINEPURE-001'}</td></tr>
                  <tr><td>Status</td><td>{deviceStatus.device?.status || 'ONLINE'}</td></tr>
                  <tr><td>Mode</td><td>{deviceStatus.device?.mode || 'AUTO'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Quality Check':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Final Quality Check</h3></div>
              <p>Raw water vs treated water comparison. Final evaluation uses configured target ranges and requires laboratory validation where required.</p>
              <table className="table">
                <thead><tr><th>Parameter</th><th>Raw water</th><th>Treated water</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>pH</td><td>{latestReading ? Number(latestReading.ph).toFixed(2) : '--'}</td><td>{latestReading ? Number(latestReading.ph).toFixed(2) : '--'}</td><td>{qualityLatest?.status || 'PASS'}</td></tr>
                  <tr><td>TDS</td><td>{latestReading ? `${Math.round(latestReading.tds)} ppm` : '--'}</td><td>{latestReading ? `${Math.round(latestReading.tds)} ppm` : '--'}</td><td>{qualityLatest?.status || 'PASS'}</td></tr>
                  <tr><td>Turbidity</td><td>{latestReading ? `${Number(latestReading.turbidity).toFixed(2)} NTU` : '--'}</td><td>{latestReading ? `${Number(latestReading.turbidity).toFixed(2)} NTU` : '--'}</td><td>{qualityLatest?.status || 'PASS'}</td></tr>
                </tbody>
              </table>
              <div className="btn-group" style={{ marginTop: '16px' }}>
                <button className="btn" onClick={() => api.post('/quality/check').then(loadDashboardData)}>Run Quality Check</button>
              </div>
            </div>
          </div>
        );
      case 'Alerts':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Alerts</h3></div>
              <div className="alert-list">
                {alerts.length ? alerts.map((alert) => (
                  <div key={alert.id} className={`alert-item ${String(alert.severity).toLowerCase()}`}>
                    <strong>{alert.type}</strong>
                    <div>{alert.message}</div>
                    <small>{alert.timestamp} · {alert.severity} · {alert.status}</small>
                  </div>
                )) : <div className="empty-state">No active alerts.</div>}
              </div>
            </div>
          </div>
        );
      case 'History':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>History & Filtering</h3></div>
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>pH</th><th>TDS</th><th>Turbidity</th><th>Temp</th><th>Flow</th></tr>
                </thead>
                <tbody>
                  {history.slice(0, 12).map((row) => (
                    <tr key={row.id}><td>{new Date(row.timestamp).toLocaleString()}</td><td>{Number(row.ph).toFixed(2)}</td><td>{row.tds}</td><td>{Number(row.turbidity).toFixed(2)}</td><td>{Number(row.temperature).toFixed(1)}</td><td>{Number(row.flowRate).toFixed(1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Reports':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>MINEPURE Water Quality Report</h3></div>
              <p><strong>Date/time:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Quality status:</strong> {qualityLatest?.status || 'PASS'}</p>
              <p><strong>Reason:</strong> {qualityLatest?.reason || 'Meets configured target / requires laboratory validation'}</p>
              <div className="btn-group">
                <button className="btn" onClick={() => window.open('http://localhost:5000/api/reports/export', '_blank')}>Export CSV</button>
              </div>
            </div>
          </div>
        );
      case 'Settings':
        return (
          <div className="page">
            <div className="panel">
              <div className="panel-header"><h3>Settings</h3></div>
              <div className="form-grid">
                <div className="field"><label>pH minimum</label><input type="number" value={settings.ph_min || 6.5} onChange={(e) => setSettings({ ...settings, ph_min: e.target.value })} /></div>
                <div className="field"><label>pH maximum</label><input type="number" value={settings.ph_max || 8.5} onChange={(e) => setSettings({ ...settings, ph_max: e.target.value })} /></div>
                <div className="field"><label>TDS threshold</label><input type="number" value={settings.tds_threshold || 250} onChange={(e) => setSettings({ ...settings, tds_threshold: e.target.value })} /></div>
                <div className="field"><label>Turbidity threshold</label><input type="number" value={settings.turbidity_threshold || 2.5} onChange={(e) => setSettings({ ...settings, turbidity_threshold: e.target.value })} /></div>
                <div className="field"><label>Temperature minimum</label><input type="number" value={settings.temperature_min || 15} onChange={(e) => setSettings({ ...settings, temperature_min: e.target.value })} /></div>
                <div className="field"><label>Temperature maximum</label><input type="number" value={settings.temperature_max || 35} onChange={(e) => setSettings({ ...settings, temperature_max: e.target.value })} /></div>
                <div className="field"><label>Flow minimum</label><input type="number" value={settings.flow_min || 5} onChange={(e) => setSettings({ ...settings, flow_min: e.target.value })} /></div>
                <div className="field"><label>Re-treatment attempts</label><input type="number" value={settings.re_treatment_attempts || 3} onChange={(e) => setSettings({ ...settings, re_treatment_attempts: e.target.value })} /></div>
                <div className="field"><label>Sensor update interval</label><input type="number" value={settings.sensor_update_interval || 5000} onChange={(e) => setSettings({ ...settings, sensor_update_interval: e.target.value })} /></div>
                <div className="field"><label>Simulation mode</label><select value={settings.simulation_mode || 'true'} onChange={(e) => setSettings({ ...settings, simulation_mode: e.target.value })}><option value="true">true</option><option value="false">false</option></select></div>
              </div>
              <div className="btn-group" style={{ marginTop: '18px' }}>
                <button className="btn" onClick={() => api.put('/settings', settings).then(loadDashboardData)}>Save Settings</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="page">
            <div className="cards-row">
              {metricCards.map((card) => (
                <div key={card.label} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">{card.label}</span>
                    <span className={`status-badge ${getStatusClass(card.status)}`}><span className="status-dot" /></span>
                  </div>
                  <p className="metric-value">{card.value}</p>
                  <div className="metric-sub">{card.status}</div>
                </div>
              ))}
            </div>
            <div className="grid-2">
              <div className="panel chart-box">
                <div className="panel-header"><h3>Live trends</h3></div>
                <ResponsiveContainer width="100%" height="240px">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="ph" stroke="#0d6efd" fill="#93c5fd" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="panel">
                <div className="panel-header"><h3>System overview</h3></div>
                <table className="table">
                  <tbody>
                    <tr><td>System status</td><td><span className={`status-badge ${getStatusClass(systemInfo.systemStatus)}`}>{systemInfo.systemStatus}</span></td></tr>
                    <tr><td>Connection</td><td>{systemInfo.connectionStatus}</td></tr>
                    <tr><td>Treatment cycle</td><td>{systemInfo.treatmentCycle}</td></tr>
                    <tr><td>Current date/time</td><td>{new Date(systemInfo.dateTime).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>MINEPURE</h1>
            <small>Smart Water Monitoring</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item} className={`nav-item ${selectedPage === item ? 'active' : ''}`} onClick={() => setSelectedPage(item)}>{item}</button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h2>MINEPURE</h2>
            <small>Smart Water Purification &amp; Quality Monitoring System</small>
          </div>
          <div className="topbar-right">
            <span className={`status-badge ${getStatusClass(systemInfo.systemStatus)}`}><span className="status-dot" />{systemInfo.systemStatus}</span>
            <span className={`status-badge ${getStatusClass(systemInfo.connectionStatus)}`}><span className="status-dot" />{systemInfo.connectionStatus}</span>
            <span className="status-badge info"><span className="status-dot" />{new Date(systemInfo.dateTime).toLocaleString()}</span>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
