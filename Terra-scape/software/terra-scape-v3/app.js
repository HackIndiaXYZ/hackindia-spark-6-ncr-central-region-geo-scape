/* Terra-Scape EWS v3 — app.js */
document.addEventListener("DOMContentLoaded", () => {

  // ── 1. BOOT ANIMATION ──
  const bootEl = document.getElementById('boot');
  const bootLines = document.getElementById('boot-lines');
  const bootBar = document.getElementById('boot-bar');
  const lines = [
    '> Initializing Terra-Scape EWS v3.0...',
    '> Loading sensor firmware.............. OK',
    '> Connecting Node 01 (Alpha).......... OK',
    '> Connecting Node 02 (Beta)........... OK',
    '> Connecting Node 03 (Gamma).......... OK',
    '> Calibrating MPU-6050 gyroscope...... OK',
    '> Loading QGIS topological layers..... OK',
    '> Telecom gateway handshake........... OK',
    '> Dashboard rendering................. OK',
    '> ✅ SYSTEM READY — ENTERING LIVE MODE'
  ];
  let li = 0;
  function bootTick() {
    if (li < lines.length) {
      bootLines.innerHTML += lines[li] + '\n';
      bootBar.style.width = ((li + 1) / lines.length * 100) + '%';
      li++;
      setTimeout(bootTick, 180 + Math.random() * 120);
    } else {
      setTimeout(() => bootEl.classList.add('hidden'), 500);
    }
  }
  bootTick();

  // ── 2. THEME ──
  const H = document.documentElement;
  document.getElementById('theme-btn').addEventListener('click', () => {
    const n = H.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    H.setAttribute('data-theme', n);
    localStorage.setItem('ts3', n);
    if (chartsOK) refreshChartTheme();
  });

  // ── 3. TABS ──
  document.querySelectorAll('.tab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
      b.classList.add('on');
      const pg = document.getElementById(b.getAttribute('data-tab'));
      if (pg) pg.classList.add('on');
    });
  });

  // ── 4. UPTIME COUNTER ──
  const startTime = Date.now();
  function tickUptime() {
    const d = Date.now() - startTime;
    const h = String(Math.floor(d / 3600000)).padStart(2, '0');
    const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
    document.getElementById('uptime').textContent = `UPTIME ${h}:${m}:${s}`;
    requestAnimationFrame(tickUptime);
  }
  tickUptime();

  // ── 5. STATE ──
  const S = { moisture: 45, tilt: 0.0, temp: 24.5, hum: 65, threat: 'SAFE' };

  // ── 6. CHARTS ──
  let chartsOK = false;
  let tiltChart, moistChart, tempChart, histChart;
  const tc = () => H.getAttribute('data-theme') === 'dark' ? '#8b949e' : '#57606a';
  const gc = () => H.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  function initCharts() {
    try {
      if (typeof Chart === 'undefined') throw new Error('offline');
      chartsOK = true;
      Chart.defaults.font.family = "'Inter',sans-serif";
      Chart.defaults.color = tc();

      tiltChart = new Chart(document.getElementById('tiltChart'), {
        type: 'line',
        data: { labels: ['T-5','T-4','T-3','T-2','T-1','Now'], datasets: [{ data: [0,0,0,0,0,S.tilt], borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#58a6ff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 15, grid: { color: gc() } }, x: { grid: { color: gc() } } }, animation: { duration: 400 } }
      });

      moistChart = new Chart(document.getElementById('moistChart'), {
        type: 'doughnut',
        data: { labels: ['Moist','Dry'], datasets: [{ data: [S.moisture, 100-S.moisture], backgroundColor: ['#3fb950','#21262d'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '78%', plugins: { legend: { display: false } }, animation: { duration: 600 } }
      });

      tempChart = new Chart(document.getElementById('tempChart'), {
        type: 'bar',
        data: { labels: ['T-5','T-4','T-3','T-2','T-1','Now'], datasets: [
          { label: 'Temp °C', data: [23,23.5,24,24,24.3,S.temp], backgroundColor: 'rgba(210,153,34,0.7)', borderRadius: 4 },
          { label: 'Hum %', data: [62,63,64,64,65,S.hum], backgroundColor: 'rgba(88,166,255,0.5)', borderRadius: 4 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: gc() } }, x: { grid: { color: gc() } } }, plugins: { legend: { labels: { color: tc(), font: { size: 10 } } } }, animation: { duration: 300 } }
      });

      histChart = new Chart(document.getElementById('histChart'), {
        type: 'line',
        data: { labels: ['Day 1','Day 2','Day 3','Day 4','Day 5 (Rain)','Day 6 (Event)','Day 7'], datasets: [
          { label: 'Soil Moisture %', yAxisID: 'yM', data: [28,30,34,44,82,95,94], borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.1)', fill: true, tension: 0.4, borderWidth: 2 },
          { label: 'Pitch Tilt °', yAxisID: 'yT', data: [0.1,0.1,0.2,0.4,1.1,8.8,12.2], borderColor: '#f85149', borderWidth: 2.5, tension: 0.1 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc() } }, tooltip: { mode: 'index', intersect: false } }, scales: {
          x: { grid: { color: gc() }, ticks: { color: tc() } },
          yM: { type: 'linear', position: 'left', min: 0, max: 100, title: { display: true, text: 'Moisture (%)', color: tc() }, grid: { color: gc() }, ticks: { color: '#3fb950' } },
          yT: { type: 'linear', position: 'right', min: 0, max: 15, title: { display: true, text: 'Tilt (°)', color: tc() }, grid: { display: false }, ticks: { color: '#f85149' } }
        } }
      });
    } catch (e) {
      document.getElementById('offline-msg').style.display = 'block';
    }
  }

  function refreshChartTheme() {
    if (!chartsOK) return;
    Chart.defaults.color = tc();
    [tiltChart, moistChart, tempChart, histChart].forEach(c => { if (c) c.update(); });
  }

  initCharts();

  // ── 7. PHYSICS ENGINE ──
  let prevThreat = 'SAFE';

  function run() {
    if (S.tilt >= 5.0 || (S.moisture >= 80 && S.tilt >= 2.0)) S.threat = 'DANGER';
    else if (S.moisture >= 70 || S.tilt >= 2.0) S.threat = 'CAUTION';
    else S.threat = 'SAFE';

    const isDanger = S.threat === 'DANGER', isCaution = S.threat === 'CAUTION';
    const risk = isDanger ? 98 : isCaution ? 62 : 18;

    // Banner
    const banner = document.getElementById('banner');
    const led = document.getElementById('led');
    const title = document.getElementById('b-title');
    const pill = document.getElementById('pill');

    banner.className = 'banner' + (isDanger ? ' crit' : isCaution ? ' warn' : '');
    led.className = 'led' + (isDanger ? ' d' : isCaution ? ' w' : '');

    if (isDanger) { title.textContent = '🔴 CRITICAL — IMMINENT SLIDE DETECTED'; pill.textContent = '● RED ZONE'; pill.className = 'pill pd'; }
    else if (isCaution) { title.textContent = '🟡 CAUTION — ANOMALOUS READINGS'; pill.textContent = '● YELLOW ZONE'; pill.className = 'pill pw'; }
    else { title.textContent = '✔ NETWORK SECURE — CONTINUOUS MONITORING'; pill.textContent = '● GREEN ZONE'; pill.className = 'pill'; }

    // KPIs
    document.getElementById('k-risk').innerHTML = `${risk}<span style="font-size:1rem;font-weight:600">%</span>`;
    document.getElementById('k-tilt').innerHTML = `${S.tilt.toFixed(1)}<span style="font-size:1rem">°</span>`;
    document.getElementById('k-moist').innerHTML = `${S.moisture}<span style="font-size:1rem">%</span>`;

    const rb = document.getElementById('k-risk-b');
    if (isDanger) { rb.textContent = '● CRITICAL'; rb.className = 'kpi-badge dn'; }
    else if (isCaution) { rb.textContent = '● ELEVATED'; rb.className = 'kpi-badge wn'; }
    else { rb.textContent = '● BASELINE'; rb.className = 'kpi-badge up'; }

    // Risk Ring
    const arc = document.getElementById('risk-arc');
    arc.style.strokeDashoffset = 264 - (risk / 100) * 264;
    arc.style.stroke = isDanger ? '#f85149' : isCaution ? '#d29922' : '#3fb950';
    document.getElementById('risk-pct').textContent = risk;
    const aiL = document.getElementById('ai-lbl');
    aiL.textContent = isDanger ? 'CRITICAL' : isCaution ? 'ELEVATED' : 'BASELINE SECURE';
    aiL.className = 'card-m ' + (isDanger ? 't-r' : isCaution ? 't-y' : 't-g');

    // Node 01 dot
    const n1d = document.getElementById('n1d'), n1s = document.getElementById('n1s'), pin1 = document.getElementById('pin1');
    if (isDanger) { n1d.className = 'dot dot-r'; n1s.textContent = 'DANGER'; n1s.style.color = 'var(--red)'; if (pin1) { pin1.style.background = 'var(--red)'; pin1.style.color = 'var(--red)'; } }
    else if (isCaution) { n1d.className = 'dot dot-y'; n1s.textContent = 'CAUTION'; n1s.style.color = 'var(--yellow)'; if (pin1) { pin1.style.background = 'var(--yellow)'; pin1.style.color = 'var(--yellow)'; } }
    else { n1d.className = 'dot dot-g'; n1s.textContent = 'ONLINE'; n1s.style.color = 'var(--green)'; if (pin1) { pin1.style.background = 'var(--green)'; pin1.style.color = 'var(--green)'; } }

    // Readings
    document.getElementById('tilt-txt').textContent = S.tilt.toFixed(1) + '°';
    document.getElementById('moist-txt').textContent = S.moisture + '%';
    document.getElementById('temp-txt').textContent = S.temp.toFixed(1) + '°C';
    document.getElementById('hum-txt').textContent = S.hum.toFixed(0) + '%';
    document.getElementById('sync-ts').textContent = new Date().toLocaleTimeString();

    // Smart Evacuation
    const ea = document.getElementById('ev-a'), eb = document.getElementById('ev-b'), ec = document.getElementById('ev-c');
    const eta = document.getElementById('eta'), etap = document.getElementById('eta-p');
    if (isDanger) {
      ea.textContent = '❌ BLOCKED'; ea.className = 'rt-b';
      eb.textContent = '✅ SAFE (PRIMARY)'; eb.className = 'rt-s';
      ec.textContent = '❌ BLOCKED'; ec.className = 'rt-b';
      eta.textContent = '14 min'; eta.style.color = 'var(--red)';
      etap.textContent = 'Urgent pace — follow community leader';
    } else if (isCaution) {
      ea.textContent = '⚠️ CAUTION'; ea.className = 'rt-c';
      eb.textContent = '✅ SAFE (PRIMARY)'; eb.className = 'rt-s';
      ec.textContent = '⚠️ RESTRICTED'; ec.className = 'rt-c';
      eta.textContent = '18 min'; eta.style.color = 'var(--yellow)';
      etap.textContent = 'Standard pace — remain alert';
    } else {
      ea.textContent = '✅ SAFE (Primary)'; ea.className = 'rt-s';
      eb.textContent = '✅ SAFE'; eb.className = 'rt-s';
      ec.textContent = '⚠️ RESTRICTED'; ec.className = 'rt-c';
      eta.textContent = '18 min'; eta.style.color = 'var(--blue)';
      etap.textContent = 'Standard walking pace';
    }

    // Charts
    if (chartsOK) {
      tiltChart.data.datasets[0].data[5] = S.tilt; tiltChart.update();
      moistChart.data.datasets[0].data = [S.moisture, 100 - S.moisture];
      moistChart.data.datasets[0].backgroundColor[0] = isDanger ? '#f85149' : isCaution ? '#d29922' : '#3fb950';
      moistChart.update();
      if (tempChart) { tempChart.data.datasets[0].data[5] = S.temp; tempChart.data.datasets[1].data[5] = S.hum; tempChart.update(); }
    }

    // Alert Log — push entry on threat CHANGE
    if (S.threat !== prevThreat) {
      pushAlert(S.threat);
      prevThreat = S.threat;
    }
  }

  function pushAlert(level) {
    const log = document.getElementById('alert-log');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cls = level === 'DANGER' ? 'c' : level === 'CAUTION' ? 'w' : 's';
    const label = level === 'DANGER' ? 'CRIT' : level === 'CAUTION' ? 'WARN' : 'SAFE';
    const msgs = {
      DANGER: 'CRITICAL THRESHOLD BREACHED. Algorithm triggered full evacuation protocol.',
      CAUTION: 'Anomalous readings detected. Entering elevated monitoring mode.',
      SAFE: 'Parameters returned to nominal. Threat level downgraded to baseline.'
    };
    const row = document.createElement('div');
    row.className = 'al-row';
    row.innerHTML = `<div class="al-time">${time}</div><div class="al-level ${cls}">${label}</div><div class="al-msg">${msgs[level]}</div><div class="al-node">SIM</div>`;
    log.insertBefore(row, log.firstChild);
  }

  // ── 8. SIM CONTROLS ──
  document.getElementById('si-m').addEventListener('input', e => {
    S.moisture = parseInt(e.target.value);
    document.getElementById('sv-m').textContent = S.moisture + '%';
    run();
  });
  document.getElementById('si-t').addEventListener('input', e => {
    S.tilt = parseFloat(e.target.value);
    document.getElementById('sv-t').textContent = S.tilt.toFixed(1) + '°';
    run();
  });
  document.getElementById('si-tp').addEventListener('input', e => {
    S.temp = parseFloat(e.target.value);
    S.hum = Math.max(0, 100 - S.temp * 1.5);
    document.getElementById('sv-tp').textContent = S.temp.toFixed(1) + '°C';
    run();
  });

  // ── 9. BROADCAST ──
  document.getElementById('btn-bc').addEventListener('click', () => {
    const t = document.getElementById('term');
    let c = 0;
    t.innerHTML = `<span style="color:#3b4045">// INITIALIZING...</span>\n`;
    setTimeout(() => { t.innerHTML += `<span style="color:var(--yellow)">> HANDSHAKING TELECOM API... OK</span>\n`; }, 100);
    setTimeout(() => { t.innerHTML += `> GEOFENCE QUERY: SECTOR ALPHA → 5,420 TARGETS\n`; }, 400);
    setTimeout(() => { t.innerHTML += `<span style="color:var(--yellow)">> DISPATCHING MASS LOOP...</span>\n`; }, 700);
    let delay = 900;
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        t.innerHTML += `> TX → +91 98xxx xx${100 + Math.floor(Math.random() * 900)} · DELIVERED\n`;
        t.scrollTop = t.scrollHeight;
      }, delay + i * 60);
    }
    setTimeout(() => {
      t.innerHTML += `\n<span style="color:#fff;background:var(--green);padding:2px 8px;border-radius:4px">✅ BROADCAST COMPLETE — 5,420 MESSAGES IN 87s</span>\n`;
      t.scrollTop = t.scrollHeight;
    }, delay + 20 * 60 + 100);
  });

  // ── INIT ──
  run();
});
