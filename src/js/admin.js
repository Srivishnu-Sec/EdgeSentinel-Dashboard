/* ============================================================
   EdgeSentinel — Admin Dashboard JS
   Connected to real Flask API via Socket.io + REST
   ============================================================ */
 
import Chart from 'chart.js/auto';
import { io } from 'socket.io-client';
 
// ── Config ───────────────────────────────────────────────────────
const GATEWAY_URL = 'http://localhost:5000';
 
// TIER → display
const TIER_COLOR = {
  TRUSTED:    { css: 'success', label: 'TRUSTED',    dot: 'pulse-green' },
  SUSPICIOUS: { css: 'warn',    label: 'SUSPICIOUS', dot: 'pulse-cyan'  },
  QUARANTINE: { css: 'danger',  label: 'QUARANTINE', dot: 'pulse-red'   },
  BLACKLIST:  { css: 'danger',  label: 'BLACKLIST',  dot: 'pulse-red'   },
};
 
// ── State ─────────────────────────────────────────────────────────
let devices    = {};
let sensors    = {};
let forensics  = [];
let pktHistory = [];
let socket     = null;
let pktChart   = null;
let threatChart = null;
let connected  = false;
 
// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initCharts();
  connectSocket();
  fetchAll();
  setInterval(fetchAll, 4000);
});
 
// ── Clock ─────────────────────────────────────────────────────────
function initClock() {
  const el = document.getElementById('topbar-time');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}
 
// ── Socket.io ─────────────────────────────────────────────────────
function connectSocket() {
  socket = io(GATEWAY_URL, { transports: ['websocket', 'polling'] });
 
  socket.on('connect', () => {
    connected = true;
    setGatewayStatus(true);
    logAlert('info', '⬤', 'Gateway connected via Socket.io');
  });
 
  socket.on('disconnect', () => {
    connected = false;
    setGatewayStatus(false);
    logAlert('warn', '⚠', 'Gateway disconnected — retrying…');
    setTimeout(() => fetchAll(), 3000);
  });
 
  socket.on('device_update', (data) => {
    devices = data;
    renderDeviceCards();
    renderStatCards();
    updateThreatChart();
  });
 
  socket.on('sensor_update', (data) => {
    sensors = data;
    renderSensors();
  });
}
 
function setGatewayStatus(online) {
  const badge = document.getElementById('gateway-badge');
  const dot   = document.getElementById('gateway-dot');
  if (!badge) return;
  badge.textContent = online ? 'GATEWAY ONLINE' : 'GATEWAY OFFLINE';
  badge.className   = `badge ${online ? 'badge-online' : 'badge-offline'}`;
  if (dot) {
    dot.className = `pulse ${online ? 'pulse-green' : 'pulse-red'}`;
  }
}
 
// ── Fetch all data ────────────────────────────────────────────────
async function fetchAll() {
  try {
    const [devRes, senRes, forRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/api/devices`),
      fetch(`${GATEWAY_URL}/api/sensors`),
      fetch(`${GATEWAY_URL}/api/forensics`),
    ]);
    devices   = await devRes.json();
    sensors   = await senRes.json();
    forensics = await forRes.json();
 
    renderDeviceCards();
    renderStatCards();
    renderSensors();
    renderForensicFeed();
    renderOPALog();
    updateThreatChart();
    updatePktChart();
  } catch (e) {
    if (connected) {
      connected = false;
      setGatewayStatus(false);
    }
  }
}
 
// ── Stat Cards ────────────────────────────────────────────────────
function renderStatCards() {
  const devList = Object.values(devices);
  const total    = devList.length;
  const threats  = devList.filter(d => d.tier !== 'TRUSTED').length;
  const blocked  = devList.filter(d => d.quarantined || d.blacklisted).length;
  const avgScore = total
    ? Math.round(devList.reduce((s, d) => s + d.risk_score, 0) / total)
    : 0;
 
  setStatCard('stat-devices',  total,    '');
  setStatCard('stat-threats',  threats,  threats > 0 ? 'danger' : '');
  setStatCard('stat-blocked',  blocked,  blocked > 0 ? 'danger' : '');
  setStatCard('stat-score',    avgScore, avgScore > 30 ? (avgScore > 60 ? 'danger' : 'warn') : 'success');
}
 
function setStatCard(id, value, modifier) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  const card = el.closest('.stat-card');
  if (!card) return;
  card.className = `stat-card corner-accent ${modifier}`;
}
 
// ── Device Cards ──────────────────────────────────────────────────
function renderDeviceCards() {
  const grid = document.getElementById('device-grid');
  if (!grid) return;
 
  grid.innerHTML = Object.values(devices).map(d => {
    const tc  = TIER_COLOR[d.tier] || TIER_COLOR.TRUSTED;
    const rogue = d.blacklisted || d.quarantined;
    const sData = sensors[d.device_id] || {};
    const temp = sData.temperature != null ? `${sData.temperature}°C` : '--';
    const hum  = sData.humidity    != null ? `${sData.humidity}%`     : '--';
 
    return `
      <div class="device-card ${rogue ? 'rogue' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span class="pulse ${tc.dot}"></span>
          <span class="badge badge-${tc.css}" style="font-size:0.6rem;padding:2px 6px">${tc.label}</span>
        </div>
        <div class="device-name">${d.device_id}</div>
        <div class="device-ip">HSM: ${d.has_hsm ? '<span style="color:var(--green)">YES ✓</span>' : '<span style="color:var(--red)">NO</span>'}</div>
        <div style="margin:8px 0">
          <div style="background:var(--bg-deep);border-radius:2px;height:4px;overflow:hidden">
            <div style="background:${scoreColor(d.risk_score)};height:4px;width:${d.risk_score}%;transition:width 0.5s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:3px;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">
            <span>Risk Score</span>
            <span style="color:${scoreColor(d.risk_score)}">${d.risk_score}</span>
          </div>
        </div>
        <div class="device-metric"><span>Temperature</span><span>${temp}</span></div>
        <div class="device-metric"><span>Humidity</span><span>${hum}</span></div>
        <div class="device-metric"><span>Quarantined</span><span style="color:${d.quarantined?'var(--red)':'var(--green)'}">${d.quarantined?'YES':'NO'}</span></div>
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px">
          ${['no_hsm','scapy_anomaly','tinyml_anomaly','opa_violation'].map(sig => `
            <button onclick="fireSignal('${d.device_id}','${sig}')" style="font-size:0.6rem;padding:2px 5px;background:transparent;border:1px solid var(--border-red);color:var(--red);border-radius:2px;cursor:pointer;font-family:var(--font-mono)">+${sig.replace(/_/g,' ')}</button>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}
 
function scoreColor(score) {
  if (score >= 81) return 'var(--red)';
  if (score >= 61) return '#ff6030';
  if (score >= 31) return 'var(--orange)';
  return 'var(--green)';
}
 
// ── Sensor Data ───────────────────────────────────────────────────
function renderSensors() {
  const el = document.getElementById('sensor-panel');
  if (!el) return;
  const entries = Object.entries(sensors);
  if (!entries.length) {
    el.innerHTML = '<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);padding:12px">No sensor data yet…</div>';
    return;
  }
  el.innerHTML = entries.map(([id, d]) => `
    <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:4px;padding:12px;margin-bottom:8px">
      <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--cyan);margin-bottom:8px">${id}</div>
      <div style="display:flex;gap:24px">
        <div style="text-align:center">
          <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--orange)">${d.temperature != null ? d.temperature+'°C' : '--'}</div>
          <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">TEMPERATURE</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--cyan)">${d.humidity != null ? d.humidity+'%' : '--'}</div>
          <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">HUMIDITY</div>
        </div>
        <div style="text-align:center;margin-left:auto">
          <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted)">${d.last_updated ? new Date(d.last_updated).toLocaleTimeString('en-IN',{hour12:false}) : 'No data'}</div>
          <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">LAST UPDATE</div>
        </div>
      </div>
    </div>`).join('');
}
 
// ── Forensic Feed (MQTT log) ──────────────────────────────────────
function renderForensicFeed() {
  const tbody = document.getElementById('feed-tbody');
  if (!tbody) return;
  const recent = [...forensics].reverse().slice(0, 30);
  tbody.innerHTML = recent.map((ev, i) => {
    const isNew = i === 0;
    const danger = ev.risk_score >= 61;
    const warn   = ev.risk_score >= 31 && ev.risk_score < 61;
    const cls = danger ? 't-deny' : warn ? 't-warn' : 't-allow';
    return `
      <tr class="${isNew ? 'new-row' : ''}">
        <td style="color:var(--text-muted)">${new Date(ev.timestamp).toLocaleTimeString('en-IN',{hour12:false})}</td>
        <td class="t-allow">${ev.device_id}</td>
        <td class="${cls}">${ev.event_type}</td>
        <td style="color:${scoreColor(ev.risk_score)}">${ev.risk_score}</td>
        <td style="color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.details || ''}</td>
      </tr>`;
  }).join('');
}
 
// ── OPA Policy Log ────────────────────────────────────────────────
function renderOPALog() {
  const el = document.getElementById('opa-list');
  if (!el) return;
  const opaEvents = [...forensics]
    .filter(e => e.event_type === 'OPA_VIOLATION' || e.event_type === 'DEVICE_REGISTERED' || e.event_type === 'DEVICE_CONNECTED')
    .reverse().slice(0, 15);
  el.innerHTML = opaEvents.map(ev => {
    const isViolation = ev.event_type === 'OPA_VIOLATION';
    return `
      <div class="opa-row">
        <span class="opa-decision ${isViolation ? 'opa-deny' : 'opa-allow'}">${isViolation ? 'DENY' : 'ALLOW'}</span>
        <span class="opa-device">${ev.device_id}</span>
        <span class="opa-policy">${ev.details || ev.event_type}</span>
        <span class="opa-time">${new Date(ev.timestamp).toLocaleTimeString('en-IN',{hour12:false})}</span>
      </div>`;
  }).join('') || '<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);padding:8px">No policy events yet…</div>';
}
 
// ── Charts ────────────────────────────────────────────────────────
function initCharts() {
  const pktCtx = document.getElementById('pkt-chart');
  if (pktCtx) {
    pktChart = new Chart(pktCtx, {
      type: 'line',
      data: {
        labels: Array(20).fill(''),
        datasets: [{
          label: 'Risk Events',
          data: Array(20).fill(0),
          borderColor: '#00f5ff',
          backgroundColor: 'rgba(0,245,255,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
        }],
      },
      options: {
        animation: false,
        scales: {
          x: { display: false },
          y: { min: 0, max: 100, grid: { color: 'rgba(0,245,255,0.06)' }, ticks: { color: '#3d6070', font: { family: 'Share Tech Mono', size: 10 } } },
        },
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
 
  const thrCtx = document.getElementById('threat-chart');
  if (thrCtx) {
    threatChart = new Chart(thrCtx, {
      type: 'doughnut',
      data: {
        labels: ['Trusted', 'Suspicious', 'Quarantine/Blacklist'],
        datasets: [{
          data: [3, 0, 0],
          backgroundColor: ['rgba(0,255,136,0.7)', 'rgba(255,149,0,0.7)', 'rgba(255,45,85,0.7)'],
          borderColor: ['#00ff88', '#ff9500', '#ff2d55'],
          borderWidth: 1,
        }],
      },
      options: {
        animation: false,
        plugins: {
          legend: { labels: { color: '#8ab4c4', font: { family: 'Share Tech Mono', size: 10 }, boxWidth: 12 } },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}
 
function updatePktChart() {
  if (!pktChart) return;
  const devList = Object.values(devices);
  const maxScore = devList.length ? Math.max(...devList.map(d => d.risk_score)) : 0;
  pktHistory.push(maxScore);
  if (pktHistory.length > 20) pktHistory.shift();
  pktChart.data.datasets[0].data = [...pktHistory];
  pktChart.data.datasets[0].borderColor = maxScore >= 61 ? '#ff2d55' : maxScore >= 31 ? '#ff9500' : '#00f5ff';
  pktChart.update('none');
}
 
function updateThreatChart() {
  if (!threatChart) return;
  const devList = Object.values(devices);
  const trusted  = devList.filter(d => d.tier === 'TRUSTED').length;
  const susp     = devList.filter(d => d.tier === 'SUSPICIOUS').length;
  const danger   = devList.filter(d => d.tier === 'QUARANTINE' || d.tier === 'BLACKLIST').length;
  threatChart.data.datasets[0].data = [trusted, susp, danger];
  threatChart.update('none');
}
 
// ── Alert Log ─────────────────────────────────────────────────────
function logAlert(type, icon, msg) {
  const list = document.getElementById('alerts-list');
  if (!list) return;
  const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const div = document.createElement('div');
  div.className = `alert-item ${type}`;
  div.innerHTML = `
    <span class="alert-icon">${icon}</span>
    <span class="alert-time">${time}</span>
    <span class="alert-msg">${msg}</span>`;
  list.prepend(div);
  // Keep last 20
  while (list.children.length > 20) list.removeChild(list.lastChild);
}
 
// ── Attack Simulator ──────────────────────────────────────────────
window.runAttack = async function(type) {
  const statusEl = document.getElementById('sim-status-log');
  const actions = {
    rogue:   { device: 'esp32_rogue',  signal: 'no_hsm',         label: 'Rogue device detected — no HSM chip' },
    portscan:{ device: 'esp32_rogue',  signal: 'scapy_anomaly',   label: 'Port scan detected by Scapy monitor' },
    replay:  { device: 'esp32_rogue',  signal: 'tinyml_anomaly',  label: 'Replay attack — ML anomaly fired' },
    policy:  { device: 'esp32_1',      signal: 'opa_violation',   label: 'OPA policy violation — unauthorized action' },
  };
  const a = actions[type];
  if (!a) return;
  if (statusEl) {
    statusEl.innerHTML = `<span class="sim-log">▶ Firing ${a.label}…</span>`;
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/api/devices/${a.device}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal: a.signal }),
    });
    const data = await res.json();
    logAlert('danger', '⚡', `${a.label} → score: ${data.device?.risk_score}`);
    if (statusEl) {
      statusEl.innerHTML = `<span class="sim-log">✓ Score now: ${data.device?.risk_score} | Tier: ${data.device?.tier}</span>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span class="sim-log" style="color:var(--orange)">⚠ Gateway unreachable</span>`;
  }
};
 
// ── Fire Signal (device card buttons) ────────────────────────────
window.fireSignal = async function(deviceId, signal) {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/devices/${deviceId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal }),
    });
    const data = await res.json();
    logAlert('warn', '⚡', `Signal ${signal} → ${deviceId} | score: ${data.device?.risk_score}`);
  } catch (e) {
    logAlert('danger', '✗', `Failed to send signal to ${deviceId}`);
  }
};
 
// ── OPA Policy Check ──────────────────────────────────────────────
window.checkPolicy = async function(deviceId, action) {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/policy/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, action }),
    });
    const data = await res.json();
    logAlert(
      data.allowed ? 'info' : 'danger',
      data.allowed ? '✓' : '✗',
      `OPA: ${deviceId} → ${action} → ${data.allowed ? 'ALLOWED' : 'DENIED'}`
    );
  } catch (e) {}
};
 
// ── Verify Forensic Chain ─────────────────────────────────────────
window.verifyChain = async function() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/forensics/verify`);
    const data = await res.json();
    logAlert(
      data.intact ? 'info' : 'danger',
      data.intact ? '✓' : '⚠',
      data.intact ? 'Forensic chain intact — no tampering detected' : 'CHAIN TAMPERED — integrity violated!'
    );
    alert(data.intact ? '✅ Chain intact — no tampering detected' : '❌ CHAIN TAMPERED — integrity violated!');
  } catch (e) {}
};
 
// ── Reset ─────────────────────────────────────────────────────────
window.resetAll = async function() {
  if (!confirm('Reset all devices and forensic chain to clean state?')) return;
  try {
    await fetch(`${GATEWAY_URL}/api/reset`, { method: 'POST' });
    logAlert('info', '↺', 'System reset — all devices cleared');
    forensics = [];
    fetchAll();
  } catch (e) {}
};