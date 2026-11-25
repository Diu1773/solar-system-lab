const byId = id => document.getElementById(id);
const state = { sessions: [], period: 7.8, view: 'time', search: null, fit: null, model: null, records: [], playing: false };
const shape = { a: 1.12, c: .9, aspect: 90, offset: 20 };
const colors = ['#168a78', '#a44785', '#2669b1'];
const ids = ['time', 'phase', 'search'];
const number = (value, digits = 3) => value.toFixed(digits);
const notebookKey = 'pallas-1971-notebook-v2';
let periodRecords = [];
let inspectedPoint = null;
let chartFrame = null;
let animationFrame = 0;

function route() {
  const hash = location.hash.slice(1);
  const stage = ['period', 'shape', 'ai'].includes(hash) ? hash : null;
  const page = stage ? 'sim' : hash === 'lesson' ? 'lesson' : 'materials';
  for (const id of ['materials', 'lesson', 'sim']) byId(id).hidden = id !== page;
  for (const id of ['period', 'shape', 'ai']) byId(id).hidden = id !== stage;
  for (const link of document.querySelectorAll('[data-nav],[data-stage]')) {
    const selected = link.dataset.nav === (stage ? 'lab' : page) || link.dataset.stage === stage;
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (stage !== 'shape' && state.playing) byId('play').click();
  requestAnimationFrame(() => {
    if (hash === 'history' || hash === 'research') byId(hash).scrollIntoView();
    else if (hash !== 'main') window.scrollTo({ top: 0 });
  });
}
window.addEventListener('hashchange', route);
byId('print-lesson').onclick = () => window.print();

function readSessions(csv) {
  const groups = new Map();
  for (const row of csv.trim().split(/\r?\n/).slice(1)) {
    const [id, jd, flux] = row.split(',');
    if (!id || !Number.isFinite(+jd) || !(+flux > 0)) continue;
    if (!groups.has(id)) groups.set(id, { id, points: [] });
    groups.get(id).points.push([+jd, +flux]);
  }
  return [...groups.values()];
}

function plot(canvas, series, labels, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const all = series.flatMap(set => set.points);
  if (!all.length) {
    ctx.fillStyle = '#58716f'; ctx.font = '21px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('후보 찾기를 누르면 잔차가 표시됩니다.', width / 2, height / 2);
    return;
  }
  const left = 95, right = width - 28, top = 38, bottom = height - 63;
  const xValues = all.map(p => p[0]), yValues = all.map(p => p[1]);
  const [x0, x1] = options.x || [Math.min(...xValues), Math.max(...xValues)];
  const minY = Math.min(...yValues), maxY = Math.max(...yValues), pad = .075 * (maxY - minY || 1);
  const [y0, y1] = options.y || [minY - pad, maxY + pad];
  const x = v => left + (right - left) * (v - x0) / (x1 - x0 || 1);
  const y = v => options.invert ? top + (bottom - top) * (v - y0) / (y1 - y0) : bottom - (bottom - top) * (v - y0) / (y1 - y0);
  ctx.fillStyle = options.dark ? '#c5dfdc' : '#4d5c53';
  ctx.strokeStyle = options.dark ? '#37575e' : '#dedbcf'; ctx.lineWidth = 1; ctx.font = '17px system-ui';
  for (let i = 0; i <= 5; i++) {
    const vx = x0 + (x1 - x0) * i / 5, vy = y0 + (y1 - y0) * i / 5;
    ctx.beginPath(); ctx.moveTo(x(vx), top); ctx.lineTo(x(vx), bottom); ctx.moveTo(left, y(vy)); ctx.lineTo(right, y(vy)); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(number(vx, x1 - x0 <= 1 ? 1 : 0), x(vx), bottom + 25);
    ctx.textAlign = 'right'; ctx.fillText(number(vy, options.yDigits ?? 3), left - 11, y(vy) + 5);
  }
  ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.fillText(labels[1], left, 22);
  ctx.textAlign = 'center'; ctx.fillText(labels[0], (left + right) / 2, height - 12);
  for (const set of series) {
    ctx.fillStyle = set.color; ctx.strokeStyle = set.color; ctx.lineWidth = 2.8;
    if (set.line) {
      ctx.beginPath(); set.points.forEach(([u, v], i) => i ? ctx.lineTo(x(u), y(v)) : ctx.moveTo(x(u), y(v))); ctx.stroke();
    } else for (const [u, v] of set.points) {
      ctx.beginPath(); ctx.arc(x(u), y(v), 3.8, 0, 2 * Math.PI); ctx.fill();
    }
  }
  if (options.marker) {
    const [u, v] = options.marker;
    ctx.strokeStyle = '#9a421f'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x(u), top); ctx.lineTo(x(u), bottom); ctx.stroke();
    if (Number.isFinite(v)) {
      ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.arc(x(u), y(v), 5.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
  }
  return { x0, x1, left, right };
}

function drawPeriod() {
  const canvas = byId('period-plot'), { fit, view, search } = state;
  const legend = byId('legend');
  if (!fit) return;
  if (view === 'search') {
    byId('period-label').textContent = '시험 주기와 적합 잔차';
    const points = search?.grid.filter(p => Number.isFinite(p.rms)).map(p => [p.p, p.rms]) || [];
    const candidates = search?.candidates.map(p => [p.period, p.rms]) || [];
    chartFrame = plot(canvas, [{ points, color: '#168a78', line: true }, { points: candidates, color: '#a44785' }], ['시험 주기 (시간)', '잔차 RMS (mag)'], { x: [2, 16], marker: [state.period, state.fit.rms] });
    byId('point-readout').textContent = '현재 시험 주기 ' + number(state.period) + ' h · RMS ' + number(fit.rms, 4) + ' mag';
    legend.textContent = '낮은 지점일수록 현재 적합에서 관측값에 가깝습니다.';
    return;
  }
  const phase = view === 'phase';
  const point = inspectedPoint;
  const mark = point ? (phase ? [point.phase, point.adjusted] : [point.t, point.flux]) : undefined;
  byId('period-label').textContent = phase ? '접은 위상과 상대 등급' : '시간과 상대 강도';
  const series = state.sessions.map((s, i) => ({
    color: colors[i],
    points: fit.points.filter(p => p.session === s.id).map(p => phase ? [p.phase, p.adjusted] : [p.t, p.flux])
  }));
  if (phase) series.unshift({ color: '#9c5621', line: true, points: fit.curve.map((v, i) => [i / (fit.curve.length - 1), v]) });
  chartFrame = plot(canvas, series, phase ? ['회전 위상 (한 바퀴 = 1)', '상대 등급 (위쪽이 밝음)'] : ['첫 관측 이후 시간 (h)', '상대 강도 F'], { x: phase ? [0, 1] : undefined, invert: phase, marker: mark });
  byId('point-readout').textContent = point
    ? '회차 ' + point.session + ' · JD ' + number(point.jd, 6) + ' · F ' + number(point.flux, 5) + (phase ? ' · 위상 ' + number(point.phase) : '')
    : '그래프를 가리키거나, 그래프에 초점을 맞추고 ← →로 관측점을 읽으세요.';
  legend.textContent = '초록 회차 26 (41점) · 보라 회차 27 (91점) · 파랑 회차 28 (23점)' + (phase ? ' · 갈색 선은 적합 곡선' : '');
}

function orderedObservations() {
  if (!state.fit || state.view === 'search') return [];
  const key = state.view === 'phase' ? 'phase' : 't';
  return state.fit.points.slice().sort((a, b) => a[key] - b[key]);
}
byId('period-plot').onpointermove = event => {
  if (!chartFrame || state.view === 'search') return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const pixel = (event.clientX - bounds.left) * event.currentTarget.width / bounds.width;
  if (pixel < chartFrame.left || pixel > chartFrame.right) return;
  const target = chartFrame.x0 + (chartFrame.x1 - chartFrame.x0) * (pixel - chartFrame.left) / (chartFrame.right - chartFrame.left);
  const key = state.view === 'phase' ? 'phase' : 't';
  const point = state.fit.points.reduce((near, next) => Math.abs(next[key] - target) < Math.abs(near[key] - target) ? next : near);
  if (point !== inspectedPoint) { inspectedPoint = point; drawPeriod(); }
};
byId('period-plot').onkeydown = event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const rows = orderedObservations();
  if (!rows.length) return;
  event.preventDefault();
  const index = Math.max(0, rows.indexOf(inspectedPoint));
  const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: rows.length - 1 }[event.key];
  inspectedPoint = rows[Math.max(0, Math.min(next, rows.length - 1))];
  drawPeriod();
};

function drawMesh() {
  const canvas = byId('mesh'), ctx = canvas.getContext('2d'), { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const phi = +byId('spin').value, rad = Math.PI / 180;
  const angle = (360 * phi + shape.offset) * rad, tilt = shape.aspect * rad;
  const mesh = ShapeMath.ellipsoid(shape.a, shape.c, 13, 30);
  const vertices = mesh.vertices.map(([x, y, z]) => {
    const u = x * Math.cos(angle) - y * Math.sin(angle), v = x * Math.sin(angle) + y * Math.cos(angle);
    return [v, z * Math.sin(tilt) - u * Math.cos(tilt), u * Math.sin(tilt) + z * Math.cos(tilt)];
  });
  const faces = mesh.faces.map(face => ({
    corners: face.map(i => vertices[i]),
    depth: face.reduce((sum, i) => sum + vertices[i][2], 0) / 3
  })).sort((a, b) => a.depth - b.depth);
  const scale = 104 / Math.max(1, shape.a * .8);
  for (const { corners, depth } of faces) {
    const light = Math.round(30 + 23 * Math.max(0, depth));
    ctx.fillStyle = `hsl(166 36% ${light}%)`; ctx.strokeStyle = '#90c5b980'; ctx.lineWidth = .65;
    ctx.beginPath();
    corners.forEach(([x, y], i) => i ? ctx.lineTo(width / 2 + x * scale, height / 2 - y * scale) : ctx.moveTo(width / 2 + x * scale, height / 2 - y * scale));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.font = '18px system-ui'; ctx.fillStyle = '#c5dfdc'; ctx.textAlign = 'left';
  ctx.fillText('위상 ' + number(phi), 24, 33);
}

function updateModel() {
  state.model = ShapeMath.fit(state.sessions, state.period, shape);
  const model = state.model;
  byId('axis-value').textContent = number(shape.a);
  byId('aspect-value').textContent = shape.aspect + '°';
  byId('shape-period').textContent = number(state.period) + ' h';
  byId('shape-rms').textContent = number(model.rms, 4) + ' mag';
  byId('amplitude').textContent = number(model.amplitude, 4) + ' mag';
  drawModel();
  updatePrompt();
}

function drawModel() {
  if (!state.model) return;
  const model = state.model;
  const phase = Number(byId('spin').value);
  const series = state.sessions.map((s, i) => ({ color: colors[i], points: model.points.filter(p => p.session === s.id).map(p => [p.phase, p.adjusted]) }));
  series.unshift({ color: '#9c5621', line: true, points: model.curve.map((v, i) => [i / (model.curve.length - 1), v]) });
  plot(byId('model-plot'), series, ['회전 위상', '상대 등급 (위쪽이 밝음)'], { x: [0, 1], invert: true, marker: [phase, ShapeMath.rawMag(phase, shape) - model.mean] });
  drawMesh();
}

function updatePrompt() {
  const modelRows = state.records.map(r => `시선 ${r.aspect}°, a/b ${number(r.a)}, P ${number(r.period)} h, RMS ${number(r.rms, 4)} mag`);
  const fits = state.search?.candidates.slice(0, 3).map(r => `${number(r.period)} h (RMS ${number(r.rms, 4)} mag)`) || [];
  byId('prompt').value = [
    '첨부한 팔라스 1971 관측 CSV를 직접 읽어 회차별 표본 수, 시각·강도 열, 관측 사이 공백을 요약해 줘.',
    '후보별로 회차별 영점과 2차 푸리에 곡선을 맞추는 계산을 수행할 수 있으면 방법과 RMS 단위를 표시해 줘. 계산을 못 했으면 제공값을 사용했다고 밝혀 줘.',
    fits.length ? '웹의 후보 비교값: ' + fits.join(', ') + '.' : '웹에서 후보를 찾은 뒤 두 후보의 위상 모임과 RMS를 대조할 거야.',
    '비슷한 잔차가 다른 자전주기 또는 모형에서 나올 수 있는 이유와, 더 필요한 관측을 설명해 줘.',
    modelRows.length ? '내 모형 기록: ' + modelRows.join(' / ') + '.' : '타원체는 반사율이 균일하고 투영 면적에 밝기가 비례한다고 가정해.',
    '답변에서 직접 읽거나 계산한 값, 입력에서 인용한 값, 추론을 구분해 줘.'
  ].join('\n');
}

function setView(view) {
  inspectedPoint = null;
  state.view = view;
  for (const id of ids) byId(id + '-view').setAttribute('aria-pressed', String(id === view));
  drawPeriod();
}

function setPeriod(period, view) {
  state.period = Math.min(16, Math.max(2, period));
  state.fit = ObservationMath.fit(state.sessions, state.period);
  byId('trial').value = number(state.period, 6).replace(/0+$/, '').replace(/\.$/, '');
  byId('rms').textContent = state.fit ? number(state.fit.rms, 4) + ' mag' : '—';
  byId('count').textContent = (state.fit?.points.length || 0) + '점';
  setView(view || state.view);
  updateModel();
  storeNotebook();
}

function deferred(button, operation) {
  button.disabled = true;
  window.setTimeout(() => {
    try { operation(); }
    catch (error) { byId('period-status').textContent = '계산을 완료하지 못했습니다. ' + error.message; }
    finally { button.disabled = false; }
  }, 35);
}

for (const id of ids) byId(id + '-view').onclick = () => setView(id);
byId('trial').onchange = e => { if (state.sessions.length && Number.isFinite(e.target.valueAsNumber)) setPeriod(e.target.valueAsNumber, 'phase'); };
byId('search').onclick = event => {
  byId('period-status').textContent = '2–16시간 범위의 후보를 비교하는 중…';
  deferred(event.currentTarget, () => {
    const result = ObservationMath.search(state.sessions, 2);
    state.search = result;
    const list = byId('candidates'); list.replaceChildren();
    for (const fit of result.candidates) {
      const button = document.createElement('button');
      button.className = 'button'; button.type = 'button';
      button.textContent = number(fit.period) + ' h';
      button.onclick = () => setPeriod(fit.period, 'phase');
      list.append(button);
    }
    if (!result.candidates.length) { byId('period-status').textContent = '탐색 범위 안에서 후보를 찾지 못했습니다.'; return; }
    byId('half').disabled = false; byId('double').disabled = false;
    byId('period-status').textContent = '최저 잔차 후보 ' + number(result.candidates[0].period) + ' h. 다른 후보와도 비교하세요.';
    setPeriod(result.candidates[0].period, 'search');
  });
};
byId('half').onclick = () => setPeriod(state.search.candidates[0].period / 2, 'phase');
byId('double').onclick = () => setPeriod(state.search.candidates[0].period * 2, 'phase');
byId('axis').oninput = e => { if (state.sessions.length) { shape.a = +e.target.value; updateModel(); } };
byId('aspect').oninput = e => { if (state.sessions.length) { shape.aspect = +e.target.value; updateModel(); } };
for (const button of document.querySelectorAll('[data-aspect]')) button.onclick = () => {
  if (!state.sessions.length) return;
  byId('aspect').value = button.dataset.aspect;
  shape.aspect = +button.dataset.aspect;
  updateModel();
};
byId('spin').oninput = drawModel;
byId('optimize').onclick = event => {
  const button = event.currentTarget;
  button.textContent = '적합 중…';
  deferred(button, () => {
    try { Object.assign(shape, ShapeMath.optimize(state.sessions, state.period, shape)); byId('axis').value = shape.a; updateModel(); }
    finally { button.textContent = '이 시선에서 모형 맞추기'; }
  });
};
byId('record').onclick = () => {
  const same = state.records.some(r => r.aspect === shape.aspect && r.a === shape.a && r.offset === shape.offset && r.period === state.period);
  if (!same) state.records.push({ a: shape.a, c: shape.c, aspect: shape.aspect, offset: shape.offset, period: state.period, rms: state.model.rms });
  refreshNotebook(); storeNotebook();
  byId('record').textContent = same ? '이미 기록한 모형' : '탐구 노트에 기록됨';
  window.setTimeout(() => { byId('record').textContent = '현재 모형 기록'; }, 1100);
};
byId('record-period').onclick = () => {
  if (!state.fit) return;
  const same = periodRecords.some(row => Math.abs(row.period - state.period) < 1e-5);
  if (!same) periodRecords.push({ period: state.period, rms: state.fit.rms });
  refreshNotebook(); storeNotebook();
  byId('record-period').textContent = same ? '이미 기록한 주기' : '탐구 노트에 기록됨';
  window.setTimeout(() => { byId('record-period').textContent = '현재 주기 기록'; }, 1100);
};
function replaceRecords(target, rows, empty, columns) {
  const elements = (rows.length ? rows : [[empty]]).map(values => {
    const tr = document.createElement('tr');
    for (const value of values) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    if (!rows.length) tr.firstElementChild.colSpan = columns;
    return tr;
  });
  byId(target).replaceChildren(...elements);
}
function refreshNotebook() {
  replaceRecords('records', state.records.map(r => [r.aspect + '°', number(r.a), number(r.period), number(r.rms, 4)]), '회전 모형에서 서로 다른 조건을 기록하세요.', 4);
  replaceRecords('period-records', periodRecords.map(r => [number(r.period), number(r.rms, 4)]), '관측과 주기에서 시험 주기를 기록하세요.', 2);
  byId('period-log-note').textContent = periodRecords.length === 1 ? '근거를 쓰려면 다른 후보도 하나 기록하세요.' : '';
  updatePrompt();
}
function storeNotebook() {
  try { localStorage.setItem(notebookKey, JSON.stringify({ period: state.period, periodRecords, models: state.records, evidence: byId('evidence').value })); }
  catch { /* A blocked local store still allows exporting the current notebook. */ }
}
function loadNotebook() {
  try {
    const saved = JSON.parse(localStorage.getItem(notebookKey) || '{}');
    if (Number.isFinite(saved.period)) state.period = saved.period;
    if (Array.isArray(saved.periodRecords)) periodRecords = saved.periodRecords.filter(r => r && Number.isFinite(r.period) && Number.isFinite(r.rms));
    if (Array.isArray(saved.models)) state.records = saved.models.filter(r => r && [r.aspect,r.a,r.period,r.rms].every(Number.isFinite));
    if (typeof saved.evidence === 'string') byId('evidence').value = saved.evidence;
  } catch { /* Ignore stale or unavailable local records. */ }
}
byId('evidence').oninput = storeNotebook;
byId('play').onclick = () => {
  state.playing = !state.playing;
  const button = byId('play'); button.setAttribute('aria-pressed', String(state.playing));
  button.textContent = state.playing ? '일시정지' : '회전 재생';
  cancelAnimationFrame(animationFrame);
  if (!state.playing) return;
  let last = performance.now();
  function tick(now) {
    if (!state.playing) return;
    byId('spin').value = (+byId('spin').value + Math.min(60, now - last) / 7300) % 1;
    last = now; drawModel(); animationFrame = requestAnimationFrame(tick);
  }
  animationFrame = requestAnimationFrame(tick);
};
byId('copy').onclick = async () => {
  const prompt = byId('prompt');
  try { await navigator.clipboard.writeText(prompt.value); byId('ai-status').textContent = '요청문을 복사했습니다.'; }
  catch { prompt.focus(); prompt.select(); byId('ai-status').textContent = '선택된 요청문을 복사하세요.'; }
};
byId('save').onclick = () => {
  const report = { dataset: 'DAMIT (2) Pallas, 1971, 26–28', periodHours: state.period, rmsMag: state.fit?.rms ?? null, periodComparisons: periodRecords, models: state.records, evidence: byId('evidence').value };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = '팔라스_탐구기록.json'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

async function initialize() {
  loadNotebook(); refreshNotebook(); route();
  try {
    const response = await fetch('../class/data/pallas-1971.csv');
    if (!response.ok) throw new Error('CSV를 열 수 없습니다.');
    state.sessions = readSessions(await response.text());
    if (!state.sessions.length) throw new Error('유효한 관측값이 없습니다.');
    setPeriod(state.period, 'time');
    byId('period-status').textContent = '관측 공백을 먼저 찾으세요.';
    for (const id of ['search', 'optimize', 'record', 'record-period']) byId(id).disabled = false;
  } catch (error) { byId('period-status').textContent = '관측 자료를 불러오지 못했습니다. ' + error.message; }
}
initialize();
