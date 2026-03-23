// ============================================================
// Meteomedia Vorhersagediagramm — App Logic
// ============================================================

let tempChart = null;
let pressureChart = null;
let windChart = null;

const KMH_TO_KNOTS = 1 / 1.852;

// --- Forecast Range ---
let forecastDays = 4;
let currentLat = null;
let currentLon = null;
let currentName = null;

// --- Vordefinierte Stationen ---
const PRESET_STATIONS = [
  { name: 'Hamburg', lat: 53.5511, lon: 9.9937 },
  { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
  { name: 'München', lat: 48.1351, lon: 11.5820 },
  { name: 'Köln', lat: 50.9375, lon: 6.9603 },
  { name: 'Frankfurt', lat: 50.1109, lon: 8.6821 },
  { name: 'Stuttgart', lat: 48.7758, lon: 9.1829 },
  { name: 'Düsseldorf', lat: 51.2277, lon: 6.7735 },
  { name: 'Leipzig', lat: 51.3397, lon: 12.3731 },
  { name: 'Dresden', lat: 51.0504, lon: 13.7373 },
  { name: 'Hannover', lat: 52.3759, lon: 9.7320 },
  { name: 'Bremen', lat: 53.0793, lon: 8.8017 },
  { name: 'Nürnberg', lat: 49.4521, lon: 11.0767 },
  { name: 'Freiburg', lat: 47.9990, lon: 7.8421 },
  { name: 'Freudenstadt', lat: 48.4628, lon: 8.4108 },
  { name: 'Sylt', lat: 54.9079, lon: 8.3278 },
  { name: 'Zugspitze', lat: 47.4211, lon: 10.9853 },
  { name: 'Wien', lat: 48.2082, lon: 16.3738 },
  { name: 'Zürich', lat: 47.3769, lon: 8.5417 },
];

// --- Geocoding & Search ---
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const loadingIndicator = document.getElementById('loading-indicator');
let debounceTimer = null;

function showPresets(filter) {
  searchResults.innerHTML = '';
  const q = (filter || '').toLowerCase();
  const matches = q.length === 0
    ? PRESET_STATIONS
    : PRESET_STATIONS.filter(s => s.name.toLowerCase().includes(q));

  matches.forEach(s => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.textContent = s.name;
    div.addEventListener('click', () => {
      searchInput.value = s.name;
      searchResults.style.display = 'none';
      loadForecast(s.lat, s.lon, s.name);
    });
    searchResults.appendChild(div);
  });

  if (matches.length > 0) {
    searchResults.style.display = 'block';
  } else if (q.length >= 2) {
    // No preset match — search via API
    searchLocation(q);
    return;
  } else {
    searchResults.style.display = 'none';
  }
}

// Show presets on focus/click
searchInput.addEventListener('focus', () => showPresets(searchInput.value.trim()));
searchInput.addEventListener('click', () => showPresets(searchInput.value.trim()));

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();
  // First check presets
  const presetMatch = PRESET_STATIONS.some(s => s.name.toLowerCase().includes(query.toLowerCase()));
  if (presetMatch || query.length < 2) {
    showPresets(query);
    return;
  }
  // No preset match — search API with debounce
  debounceTimer = setTimeout(() => searchLocation(query), 300);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();
    if (q.length >= 2) searchLocation(q);
  }
});

document.addEventListener('click', (e) => {
  if (!searchResults.contains(e.target) && e.target !== searchInput)
    searchResults.style.display = 'none';
});

async function searchLocation(query) {
  try {
    const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=de`);
    const data = await resp.json();
    searchResults.innerHTML = '';
    if (!data.results || !data.results.length) {
      searchResults.innerHTML = '<div class="result-item" style="color:#999;">Kein Ergebnis</div>';
      searchResults.style.display = 'block';
      return;
    }
    data.results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''} (${r.country || ''})`;
      div.addEventListener('click', () => {
        searchInput.value = r.name;
        searchResults.style.display = 'none';
        loadForecast(r.latitude, r.longitude, r.name);
      });
      searchResults.appendChild(div);
    });
    searchResults.style.display = 'block';
  } catch (e) { console.error('Geocoding error:', e); }
}

// --- Forecast ---
async function loadForecast(lat, lon, name) {
  currentLat = lat;
  currentLon = lon;
  currentName = name;
  loadingIndicator.style.display = 'inline';
  try {
    const params = [
      `latitude=${lat}`, `longitude=${lon}`,
      'hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure,direct_radiation',
      `forecast_days=${forecastDays}`, 'timezone=Europe/Berlin',
    ].join('&');
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    const data = await resp.json();
    renderAll(data, name);
  } catch (e) { console.error('Forecast error:', e); }
  finally { loadingIndicator.style.display = 'none'; }
}

// --- Forecast Range Buttons ---
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    forecastDays = parseInt(btn.dataset.days, 10);
    if (currentLat !== null) {
      loadForecast(currentLat, currentLon, currentName);
    }
  });
});

// ============================================================
// GRID SYSTEM: Unified alignment for ALL panels
// ============================================================

let dayBoundaryIndices = [];
let N = 0; // total hours

function calcDayBoundaries(times) {
  dayBoundaryIndices = [];
  N = times.length;
  times.forEach((t, i) => {
    if (t.getHours() === 0 && i > 0) dayBoundaryIndices.push(i);
  });
}

// Add day separator lines (CSS overlay, percentage-based: idx/N * 100%)
function addDaySeparators(container) {
  container.querySelectorAll('.day-sep-overlay').forEach(el => el.remove());
  dayBoundaryIndices.forEach(idx => {
    const line = document.createElement('div');
    line.className = 'day-sep-overlay';
    line.style.left = (idx / N * 100) + '%';
    container.appendChild(line);
  });
}

// Add hourly grid lines (positioned divs for pixel-perfect alignment)
function addHourlyGrid(container) {
  container.querySelectorAll('.hourly-grid-line').forEach(el => el.remove());
  for (let i = 1; i < N; i++) {
    const line = document.createElement('div');
    line.className = 'hourly-grid-line';
    line.style.left = (i / N * 100) + '%';
    container.appendChild(line);
  }
}

// Add scale overlay (inside chart, right side)
function addScaleOverlayRight(container, ticks) {
  container.querySelectorAll('.scale-overlay').forEach(el => el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'scale-overlay';
  ticks.forEach(t => {
    const span = document.createElement('span');
    span.className = 'scale-tick';
    span.textContent = t;
    overlay.appendChild(span);
  });
  container.appendChild(overlay);
}

// Add scale labels in the panel-label (outside chart, left side)
function addScaleLeft(panelLabelEl, ticks) {
  panelLabelEl.querySelectorAll('.label-scale').forEach(el => el.remove());
  const col = document.createElement('div');
  col.className = 'label-scale';
  ticks.forEach(t => {
    const span = document.createElement('span');
    span.className = 'tick';
    span.textContent = t;
    col.appendChild(span);
  });
  panelLabelEl.appendChild(col);
}

// Apply grid + day separators to a panel-content element
function applyGrid(container) {
  addHourlyGrid(container);
  addDaySeparators(container);
}

// ============================================================
// RENDER
// ============================================================

function renderAll(data, stationName) {
  const hourly = data.hourly;
  const times = hourly.time.map(t => new Date(t));

  calcDayBoundaries(times);

  // Header
  document.getElementById('station-name').textContent = stationName;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('header-date').textContent =
    `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const windKnots = hourly.wind_speed_10m.map(v => v * KMH_TO_KNOTS);

  // Set diagram width: 4 days fits viewport, longer ranges scroll proportionally
  const inner = document.getElementById('diagram-inner');
  if (forecastDays <= 4) {
    inner.style.minWidth = '';
  } else {
    const scrollContainer = document.getElementById('diagram-scroll');
    const containerWidth = scrollContainer.clientWidth;
    const scale = N / 96; // ratio to 4-day baseline
    const minWidth = Math.round(containerWidth * scale);
    inner.style.minWidth = minWidth + 'px';
  }

  renderDayAxis(times);
  renderHourAxis(times);
  renderTemperature(times, hourly.temperature_2m, hourly.apparent_temperature);
  renderWeather(times, hourly.weather_code);
  renderWind(times, windKnots, hourly.wind_direction_10m);
  renderWindChart(times, windKnots);
  renderBars('precip-prob-panel', hourly.precipitation_probability, 'bar-precip-prob', 100);
  renderBars('precip-panel', hourly.precipitation, 'bar-precip');
  renderSunshineBars(hourly.direct_radiation);
  renderBars('clouds-panel', hourly.cloud_cover, 'bar-clouds', 100);
  renderPressure(times, hourly.surface_pressure);

  // Apply unified grid to ALL panel-content elements
  document.querySelectorAll('.panel-content').forEach(el => applyGrid(el));
}

// --- Day Axis ---
function renderDayAxis(times) {
  const container = document.getElementById('day-labels');
  container.innerHTML = '';
  const days = groupByDay(times);
  days.forEach((day, i) => {
    const div = document.createElement('div');
    div.className = 'time-axis-day';
    const d = day.date;
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const pad = n => String(n).padStart(2, '0');
    div.textContent = `${weekdays[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
    div.style.flex = day.count;
    if (i === days.length - 1) div.style.borderRight = 'none';
    container.appendChild(div);
  });
}

// --- Hour Axis ---
function renderHourAxisInto(containerId, times) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const labelMod = forecastDays <= 4 ? 3 : forecastDays <= 7 ? 6 : 12;
  times.forEach((t, i) => {
    const span = document.createElement('span');
    span.className = 'hour-mark';
    const h = t.getHours();
    span.textContent = (h % labelMod === 0) ? String(h).padStart(2, '0') : '';
    container.appendChild(span);
  });
  // Day boundary: border-right on the LAST hour of the previous day (index before midnight)
  times.forEach((t, i) => {
    if (t.getHours() === 0 && i > 0) {
      container.children[i - 1].classList.add('day-boundary');
    }
  });
}

function renderHourAxis(times) {
  renderHourAxisInto('hour-labels', times);
  renderHourAxisInto('hour-labels-bottom', times);
}

// ============================================================
// Chart.js: NO plugins for separators, NO y-axis display.
// x-axis: linear, min=-0.5, max=N-0.5 so data points sit at
// bar centers and CSS overlay separators align perfectly.
// ============================================================

function renderTemperature(times, temp, apparent) {
  const ctx = document.getElementById('temp-chart').getContext('2d');
  if (tempChart) tempChart.destroy();

  const labels = times.map((t, i) => i);
  const allVals = temp.concat(apparent);
  const minVal = Math.floor(Math.min(...allVals) / 2) * 2;
  const maxVal = Math.ceil(Math.max(...allVals) / 2) * 2;

  // Only color zones + horizontal grid (no day seps — CSS handles those)
  const tempPlugin = {
    id: 'tempPlugin',
    beforeDraw(chart) {
      const { ctx: c, chartArea, scales } = chart;
      if (!chartArea) return;
      const { left, right, top, bottom } = chartArea;
      const yScale = scales.y;

      // Color zones
      const zeroY = yScale.getPixelForValue(0);
      if (zeroY > top && zeroY < bottom) {
        c.fillStyle = 'rgba(255, 200, 200, 0.10)';
        c.fillRect(left, top, right - left, zeroY - top);
        c.fillStyle = 'rgba(200, 220, 255, 0.10)';
        c.fillRect(left, zeroY, right - left, bottom - zeroY);
        c.save(); c.strokeStyle = '#999'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(left, zeroY); c.lineTo(right, zeroY); c.stroke();
        c.restore();
      }

      // Horizontal grid every 2°
      c.save(); c.strokeStyle = '#ddd'; c.lineWidth = 1; c.setLineDash([3, 3]);
      for (let v = minVal; v <= maxVal; v += 2) {
        if (v === 0) continue;
        const y = yScale.getPixelForValue(v);
        if (y >= top && y <= bottom) {
          c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke();
        }
      }
      c.restore();
    }
  };

  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Temperatur °C', data: temp, borderColor: '#cc0000', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false },
        { label: 'Empf./KP °C', data: apparent, borderColor: '#0066aa', borderWidth: 1.5, borderDash: [6, 3], pointRadius: 0, tension: 0.3, fill: false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false },
        tooltip: { enabled: true, mode: 'index', intersect: false,
          callbacks: { title: (items) => { const t = times[items[0].dataIndex]; return `${String(t.getHours()).padStart(2,'0')}:00`; } }
        },
      },
      scales: {
        x: { type: 'linear', display: false, min: -0.5, max: N - 0.5, afterFit: s => { s.height = 0; } },
        y: { display: false, min: minVal, max: maxVal, afterFit: s => { s.width = 0; } },
      },
      layout: { padding: 0 },
    },
    plugins: [tempPlugin],
  });

  // Scale ticks
  const ticks = [];
  for (let v = maxVal; v >= minVal; v -= 2) ticks.push(v + '°');

  // LEFT (outside, in panel-label)
  addScaleLeft(document.querySelector('.panel-temperature .panel-label'), ticks);
  // RIGHT (inside, overlay)
  addScaleOverlayRight(document.getElementById('temp-panel'), ticks);
}

// --- Weather Symbols ---
function getIconInterval() {
  if (forecastDays <= 4) return { step: 3, flex: 3 };
  if (forecastDays <= 7) return { step: 6, flex: 6 };
  return { step: 12, flex: 12 };
}

function renderWeather(times, codes) {
  const container = document.getElementById('weather-panel');
  container.innerHTML = '';
  const { step, flex } = getIconInterval();
  for (let i = 0; i < times.length; i += step) {
    const div = document.createElement('div');
    div.className = 'weather-icon-cell';
    div.style.flex = String(flex);
    const info = getWeatherIcon(codes[i]);
    div.textContent = info.icon;
    div.title = info.desc + ' (' + String(times[i].getHours()).padStart(2, '0') + ':00)';
    container.appendChild(div);
  }
}

// --- Wind Text (knots) ---
function renderWind(times, speedKnots, direction) {
  const container = document.getElementById('wind-panel');
  container.innerHTML = '';
  const { step, flex } = getIconInterval();
  for (let i = 0; i < times.length; i += step) {
    const div = document.createElement('div');
    div.className = 'wind-cell';
    div.style.flex = String(flex);
    const arrow = degreesToArrow(direction[i]);
    const dir = degreesToDirection(direction[i]);
    const spd = Math.round(speedKnots[i]);
    div.innerHTML = `<span class="wind-arrow">${arrow}</span>${dir} ${spd}`;
    container.appendChild(div);
  }
}

// --- Wind Speed Chart (knots) ---
function renderWindChart(times, speedKnots) {
  const ctx = document.getElementById('wind-chart').getContext('2d');
  if (windChart) windChart.destroy();

  const labels = times.map((t, i) => i);
  const maxWind = Math.max(Math.ceil(Math.max(...speedKnots) / 5) * 5, 5);

  windChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Wind kn', data: speedKnots,
        borderColor: '#5588aa', backgroundColor: 'rgba(85,136,170,0.15)',
        borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false },
        tooltip: { enabled: true,
          callbacks: {
            title: (items) => { const t = times[items[0].dataIndex]; return `${String(t.getHours()).padStart(2,'0')}:00`; },
            label: (item) => `${Math.round(item.raw)} kn`
          }
        },
      },
      scales: {
        x: { type: 'linear', display: false, min: -0.5, max: N - 0.5, afterFit: s => { s.height = 0; } },
        y: { display: false, beginAtZero: true, max: maxWind, afterFit: s => { s.width = 0; } },
      },
      layout: { padding: 0 },
    },
    plugins: [], // NO plugins — CSS handles all grid/separators
  });

  const step = maxWind <= 20 ? 5 : 10;
  const ticks = [];
  for (let v = maxWind; v >= 0; v -= step) ticks.push(String(v));

  // LEFT (outside, in panel-label)
  addScaleLeft(document.querySelector('.panel-wind-chart .panel-label'), ticks);
  // RIGHT (inside, overlay)
  addScaleOverlayRight(document.getElementById('wind-chart-panel'), ticks);
}

// --- Bar Charts ---
function renderBars(containerId, values, barClass, maxVal) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const max = maxVal || Math.max(...values, 1);
  values.forEach(v => {
    const div = document.createElement('div');
    div.className = 'bar ' + barClass;
    const pct = Math.max(0, (v / max) * 100);
    div.style.height = pct + '%';
    if (pct === 0) div.style.background = 'transparent';
    container.appendChild(div);
  });
}

// --- Sunshine Bars (direct radiation) ---
function renderSunshineBars(values) {
  const container = document.getElementById('sunshine-panel');
  container.innerHTML = '';
  const max = Math.max(...values, 1);
  values.forEach(v => {
    const div = document.createElement('div');
    div.className = 'bar bar-sunshine';
    const pct = Math.max(0, (v / max) * 100);
    div.style.height = pct + '%';
    if (pct === 0) {
      div.style.background = 'transparent';
      div.style.borderRightColor = 'rgba(0,0,0,0.05)';
    }
    container.appendChild(div);
  });
}

// --- Pressure Chart ---
function renderPressure(times, pressure) {
  const ctx = document.getElementById('pressure-chart').getContext('2d');
  if (pressureChart) pressureChart.destroy();

  const labels = times.map((t, i) => i);
  const minP = Math.floor(Math.min(...pressure) / 5) * 5;
  const maxP = Math.ceil(Math.max(...pressure) / 5) * 5;

  const gridPlugin = {
    id: 'pressureGrid',
    beforeDraw(chart) {
      const { ctx: c, chartArea, scales } = chart;
      if (!chartArea) return;
      const { left, right, top, bottom } = chartArea;
      const yScale = scales.y;
      c.save(); c.strokeStyle = '#ddd'; c.lineWidth = 1; c.setLineDash([3, 3]);
      for (let v = minP; v <= maxP; v += 5) {
        const y = yScale.getPixelForValue(v);
        if (y >= top && y <= bottom) {
          c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke();
        }
      }
      c.restore();
    }
  };

  pressureChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Luftdruck hPa', data: pressure,
        borderColor: '#006600', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false },
        tooltip: { enabled: true,
          callbacks: { title: (items) => { const t = times[items[0].dataIndex]; return `${String(t.getHours()).padStart(2,'0')}:00`; } }
        },
      },
      scales: {
        x: { type: 'linear', display: false, min: -0.5, max: N - 0.5, afterFit: s => { s.height = 0; } },
        y: { display: false, min: minP, max: maxP, afterFit: s => { s.width = 0; } },
      },
      layout: { padding: 0 },
    },
    plugins: [gridPlugin],
  });

  const ticks = [];
  for (let v = maxP; v >= minP; v -= 5) ticks.push(v.toLocaleString('de-DE'));
  addScaleLeft(document.querySelector('.panel-pressure .panel-label'), ticks);
  addScaleOverlayRight(document.getElementById('pressure-panel'), ticks);
}

// --- Helpers ---
function groupByDay(times) {
  const days = [];
  let currentDay = null;
  times.forEach(t => {
    const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    if (key !== currentDay) {
      days.push({ date: new Date(t), count: 1, key });
      currentDay = key;
    } else {
      days[days.length - 1].count++;
    }
  });
  return days;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  searchInput.value = 'Hamburg';
  currentLat = 53.5511;
  currentLon = 9.9937;
  currentName = 'Hamburg';
  loadForecast(currentLat, currentLon, currentName);
});
