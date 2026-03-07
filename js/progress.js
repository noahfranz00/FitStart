// ═══════════════════════════════════════════
// PROGRESS.JS — Body Weight, Streak Calendar,
//   Frequency Charts, Nutrition Charts, Program Accordion
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, CURRENT_WEEK, TOTAL_WEEKS,
//   GYM_DAYS, DAY_WORKOUTS, lsGet(), lsSet(), getTrainingPhase()

// ── BODY WEIGHT LOGGING ──
function getWeightLog() { return lsGet('fs_weight_log') || []; }

function logBodyWeight() {
  const input = document.getElementById('weight-log-input');
  const lbs = parseFloat(input.value);
  if (!lbs || lbs < 50 || lbs > 600) { showToast('Enter a valid weight (50–600 lbs).', 'warning'); return; }
  const log = getWeightLog();
  const today = new Date().toISOString().split('T')[0];
  // Replace today's entry if exists
  const existing = log.findIndex(e => e.date === today);
  if (existing >= 0) log[existing].lbs = lbs;
  else log.push({ date: today, lbs });
  lsSet('fs_weight_log', log);
  input.value = '';
  renderWeightHistory();
  renderNutritionChart();
}

function drawSVGLine(svgId, points, color, fillColor, W, H, padL, padR, padT, padB) {
  const svg = document.getElementById(svgId);
  if (!svg || !points.length) return;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const px = x => padL + ((x - minX) / (maxX - minX || 1)) * chartW;
  const py = y => padT + chartH - ((y - minY) / rangeY) * chartH;
  const pts = points.map(p => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
  let path = `M ${pts.split(' ').join(' L ')}`;
  let fill = '';
  if (fillColor) {
    const first = points[0], last = points[points.length-1];
    fill = `<path d="M ${px(first[0]).toFixed(1)},${(padT+chartH).toFixed(1)} L ${pts.split(' ').join(' L ')} L ${px(last[0]).toFixed(1)},${(padT+chartH).toFixed(1)} Z" fill="${fillColor}" stroke="none"/>`;
  }
  // Y axis grid lines
  let grid = '';
  for (let i = 0; i <= 2; i++) {
    const yv = minY + (rangeY * i / 2);
    const ypos = py(yv).toFixed(1);
    grid += `<line x1="${padL}" y1="${ypos}" x2="${padL+chartW}" y2="${ypos}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    grid += `<text x="${padL-4}" y="${parseFloat(ypos)+4}" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="end" font-family="DM Mono,monospace">${yv.toFixed(i===0?0:1)}</text>`;
  }
  // Dots
  const dots = points.map((p,i) => `<circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="3" fill="${color}" stroke="var(--dark)" stroke-width="1.5"/>`).join('');
  svg.innerHTML = `${grid}${fill}<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
}

function renderWeightHistory() {
  const log = getWeightLog();
  const currentEl = document.getElementById('weight-current-display');
  const histEl = document.getElementById('weight-history-list');
  const chartEmptyEl = document.getElementById('weight-chart-empty');
  const deltaBadge = document.getElementById('weight-delta-badge');
  const lbsChangeEl = document.getElementById('stat-lbs-change');
  const lbsLabelEl = document.getElementById('stat-lbs-label');

  if (!log.length) {
    if (currentEl) currentEl.innerHTML = 'No weight logged yet — log your first weigh-in above';
    if (histEl) histEl.innerHTML = '<div style="color:var(--dim);font-size:0.84rem;padding:8px 0">No entries yet</div>';
    if (chartEmptyEl) chartEmptyEl.style.display = 'flex';
    return;
  }

  const sorted = [...log].sort((a,b) => new Date(a.date)-new Date(b.date));
  const latest = sorted[sorted.length-1];
  const start = sorted[0];
  const diff = latest.lbs - start.lbs;
  const mode = USER && USER.goal < USER.weight ? 'lose' : 'gain';

  // Weight chart
  if (chartEmptyEl && sorted.length >= 2) {
    chartEmptyEl.style.display = 'none';
    const svgEl = document.getElementById('weight-chart');
    const W = svgEl.parentElement.offsetWidth || 300;
    const pts = sorted.map((e, i) => [i, parseFloat(e.lbs)]);
    drawSVGLine('weight-chart', pts, '#D4A520', 'rgba(212,165,32,0.08)', W, 140, 34, 8, 8, 20);
    // X labels
    const labelsEl = document.getElementById('weight-chart-labels');
    if (labelsEl && sorted.length > 1) {
      const step = Math.max(1, Math.floor(sorted.length / 5));
      const shown = sorted.filter((_, i) => i % step === 0 || i === sorted.length-1);
      labelsEl.innerHTML = shown.map(e => `<span>${e.date.slice(5)}</span>`).join('');
    }
  }

  // Delta badge
  if (deltaBadge) {
    const arrow = diff < 0 ? '↓' : diff > 0 ? '↑' : '→';
    const good = (mode==='lose' && diff<0) || (mode==='gain' && diff>0);
    const color = good ? '#D4A520' : diff===0 ? 'var(--dim)' : '#f87171';
    deltaBadge.innerHTML = `<span style="color:${color}">${arrow} ${Math.abs(diff).toFixed(1)} lbs</span> <span style="color:var(--dim);font-size:0.72rem">from start</span>`;
  }

  // Stat boxes
  const totalChange = Math.abs(diff).toFixed(1);
  if (lbsChangeEl) lbsChangeEl.textContent = totalChange;
  if (lbsLabelEl) lbsLabelEl.textContent = mode === 'gain' ? 'LBS GAINED' : 'LBS LOST';

  // Current weight display
  if (currentEl) {
    currentEl.innerHTML = `<span style="font-size:1.8rem;font-family:'Bebas Neue',sans-serif;color:var(--white)">${latest.lbs}</span> <span style="color:var(--dim)">lbs</span>`;
  }

  // History list (compact)
  if (histEl) {
    const rev = [...sorted].reverse();
    histEl.innerHTML = rev.slice(0,10).map((e,i) => {
      const prev = rev[i+1];
      const change = prev ? (e.lbs - prev.lbs) : 0;
      const changeStr = change === 0 ? '' : `<span style="font-size:0.72rem;color:${change<0?'#D4A520':'#f87171'}">${change>0?'+':''}${change.toFixed(1)}</span>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:0.82rem;color:var(--off)">${e.date}</div>
        <div style="display:flex;align-items:center;gap:10px">
          ${changeStr}
          <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;color:var(--white)">${e.lbs} lbs</div>
          <button onclick="deleteWeightEntry('${e.date}')" style="width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:none;color:var(--dim);cursor:pointer;font-size:0.6rem">✕</button>
        </div>
      </div>`;
    }).join('');
  }
}

function renderNutritionChart() {
  // Build 14-day calorie + protein trend from mealLogs
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const dayLog = mealLogs[key];
    let cal = 0, pro = 0;
    if (dayLog) {
      Object.values(dayLog).forEach(cat => cat.forEach(e => { cal += e.cal||0; pro += e.pro||0; }));
    }
    days.push({ key, cal, pro, label: String(d.getDate()) });
  }

  const hasFoodData = days.some(d => d.cal > 0);
  const emptyEl = document.getElementById('nutrition-chart-empty');
  if (emptyEl) emptyEl.style.display = hasFoodData ? 'none' : 'flex';
  if (!hasFoodData) return;

  const svgEl = document.getElementById('nutrition-chart');
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth || 300;

  // Draw calories line (normalised to chart height)
  const calPts = days.map((d,i) => [i, d.cal]);
  const proPts = days.map((d,i) => [i, d.pro]);

  const maxCal = Math.max(...days.map(d => d.cal), 1);
  const maxPro = Math.max(...days.map(d => d.pro), 1);

  // Draw two lines sharing same SVG - normalise independently
  const padL = 36, padR = 8, padT = 8, padB = 16;
  const chartW = W - padL - padR, chartH = 120 - padT - padB;
  const pxFn = (i, total) => padL + (i / (total-1||1)) * chartW;
  const pyCal = v => padT + chartH - (v / maxCal) * chartH;
  const pyPro = v => padT + chartH - (v / maxPro) * chartH;

  let calPoly = days.map((d,i) => `${pxFn(i,days.length).toFixed(1)},${pyCal(d.cal).toFixed(1)}`).join(' ');
  let proPoly = days.map((d,i) => `${pxFn(i,days.length).toFixed(1)},${pyPro(d.pro).toFixed(1)}`).join(' ');

  // Grid
  let grid = '';
  for (let i=0;i<=2;i++) {
    const y = padT + (chartH * i / 2);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL+chartW}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    const calV = Math.round(maxCal * (1 - i/2));
    grid += `<text x="${padL-4}" y="${(y+4).toFixed(1)}" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="end" font-family="DM Mono,monospace">${calV}</text>`;
  }

  // Target line
  const targetCal = TARGETS && TARGETS.cal ? TARGETS.cal : 0;
  let targetLine = '';
  if (targetCal > 0 && targetCal <= maxCal * 1.5) {
    const ty = pyCal(targetCal).toFixed(1);
    targetLine = `<line x1="${padL}" y1="${ty}" x2="${padL+chartW}" y2="${ty}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,3"/>`;
    targetLine += `<text x="${padL+4}" y="${(parseFloat(ty)-3).toFixed(1)}" font-size="8" fill="rgba(255,255,255,0.3)" font-family="DM Mono,monospace">target</text>`;
  }

  svgEl.innerHTML = `${grid}${targetLine}
    <polyline points="${calPoly}" fill="none" stroke="#D4A520" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${proPoly}" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="none"/>`;

  // X labels (every 2 days)
  const labelsEl = document.getElementById('nutrition-chart-labels');
  if (labelsEl) {
    labelsEl.innerHTML = days.filter((_,i) => i%2===0 || i===days.length-1).map(d => `<span>${d.label}</span>`).join('');
  }

  // Update avg protein stat
  const daysWithFood = days.filter(d => d.cal > 0);
  const avgPro = daysWithFood.length ? Math.round(daysWithFood.reduce((s,d) => s+d.pro, 0) / daysWithFood.length) : null;
  const proEl = document.getElementById('stat-avg-protein');
  if (proEl) proEl.textContent = avgPro ? avgPro + 'g' : '—';
}

function deleteWeightEntry(date) {
  const log = getWeightLog().filter(e => e.date !== date);
  lsSet('fs_weight_log', log);
  renderWeightHistory();
}

// ── STREAK ──
function getWorkoutDates() {
  return new Set(lsGet('fs_workout_dates') || []);
}
function recordWorkoutDate() {
  const dates = getWorkoutDates();
  dates.add(todayDateStr());
  lsSet('fs_workout_dates', [...dates]);
}
function todayDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function renderFreqChart() {
  const svg = document.getElementById('freq-chart-svg');
  if (!svg) return;
  const dates = getWorkoutDates();
  const weeks = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const key = day.getFullYear() + '-' + String(day.getMonth()+1).padStart(2,'0') + '-' + String(day.getDate()).padStart(2,'0');
      if (dates.has(key)) count++;
    }
    weeks.push(count);
  }
  const maxCount = Math.max(...weeks, 1);
  const W = 400, H = 100, padB = 20, padT = 8, padLR = 12;
  const barW = (W - padLR * 2) / 8;
  const chartH = H - padT - padB;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  svg.innerHTML = weeks.map((count, i) => {
    const x = padLR + i * barW + barW * 0.15;
    const bw = barW * 0.7;
    const bh = (count / maxCount) * chartH;
    const by = padT + chartH - bh;
    const wkDate = new Date(now);
    wkDate.setDate(now.getDate() - now.getDay() - (7 - i) * 7);
    const lbl = i === 7 ? 'Now' : monthNames[wkDate.getMonth()] + ' ' + wkDate.getDate();
    const isThisWeek = i === 7;
    return `
      <rect x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(bh,2).toFixed(1)}"
        rx="3" fill="${isThisWeek ? 'var(--gold)' : 'rgba(212,165,32,0.35)'}"/>
      <text x="${(x + bw/2).toFixed(1)}" y="${H}" font-size="8" fill="rgba(255,255,255,0.4)"
        text-anchor="middle" font-family="DM Mono,monospace">${lbl}</text>
      ${count > 0 ? `<text x="${(x + bw/2).toFixed(1)}" y="${(by - 3).toFixed(1)}" font-size="9" fill="${isThisWeek ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}" text-anchor="middle" font-family="DM Mono,monospace">${count}</text>` : ''}
    `;
  }).join('');
}

function renderStreak() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = now.getDate();
  const workoutDates = getWorkoutDates();

  // Calculate current streak (consecutive days back from today)
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(year, month, today - i);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (workoutDates.has(key)) streak++;
    else if (i > 0) break; // gap breaks streak (day 0 = today, might not be done yet)
  }

  // Update streak stat strip
  const streakEl = document.getElementById('stat-streak');
  if (streakEl) streakEl.textContent = streak;

  // Update month label
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabelEl = document.getElementById('streak-month-label');
  if (monthLabelEl) monthLabelEl.textContent = monthNames[month].toUpperCase() + ' ' + year;
  // Render calendar
  document.getElementById('streak-cal').innerHTML = Array.from({length:daysInMonth}, (_,i) => {
    const d = i + 1;
    const key = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const cls = d === today ? 'today' : workoutDates.has(key) ? 'done' : '';
    return `<div class="sc-day ${cls}" title="${key}">${d}</div>`;
  }).join('');

  // Update workout count this month
  let monthCount = 0;
  for (let i=1; i<=daysInMonth; i++) {
    const key = year + '-' + String(month+1).padStart(2,'0') + '-' + String(i).padStart(2,'0');
    if (workoutDates.has(key)) monthCount++;
  }
  const wktCountEl = document.getElementById('stat-workouts');
  if (wktCountEl) wktCountEl.textContent = monthCount;
}

// ── MY PROGRAM ──
function renderProgram() {
  if (!generatedPlan) return;
  const accordion = document.getElementById('week-accordion');
  accordion.innerHTML = '';
  for (let w=1; w<=TOTAL_WEEKS; w++) {
    const isDone = w<CURRENT_WEEK, isCurrent = w===CURRENT_WEEK;
    const card = document.createElement('div');
    card.className = 'log-toggle-card'; card.style.borderRadius='14px';
    const wPhase = getTrainingPhase(w);
    const wDeload = isDeloadWeek(w);
    const phaseTag = wDeload
      ? '<span style="font-size:0.6rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(251,146,60,0.1);color:var(--orange);padding:2px 7px;border-radius:4px;border:1px solid rgba(251,146,60,0.2)">⚡ DELOAD</span>'
      : '<span style="font-size:0.6rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(212,165,32,0.07);background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding:2px 7px;border-radius:4px;border:1px solid rgba(212,165,32,0.15)">'+wPhase.name+'</span>';
    const badge = isDone
      ? '<span style="font-size:0.65rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--gold-dim);background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding:3px 9px;border-radius:5px">✓ Done</span>'
      : isCurrent
      ? '<span style="font-size:0.65rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--orange-dim);color:var(--orange);padding:3px 9px;border-radius:5px">In Progress</span>'
      : '';
    const rowId = 'wrow-'+w;
    const days = GYM_DAYS.map(i=>{
      const wo = DAY_WORKOUTS[i];
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--dark);border:1px solid var(--border);border-radius:9px"><div style="font-size:0.83rem;color:var(--off)">${DAYS_FULL[i]} · ${wo?wo.name:'Workout'}</div><div style="font-size:0.7rem;font-family:'DM Mono',monospace;color:${isDone?'var(--gold)':'var(--dim)'}">${isDone?'✓ Complete':'Upcoming'}</div></div>`;
    }).join('');
    card.innerHTML = `<div class="log-toggle-header" onclick="toggleWeekRow('${rowId}')" style="padding:16px 20px">
      <div style="display:flex;align-items:center;gap:10px"><div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px;color:${isCurrent?'var(--white)':'var(--dim)'}">WEEK ${w}</div>${phaseTag}${badge}</div>
      <div style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--dim)">${isDone?GYM_DAYS.length+'/'+GYM_DAYS.length+' workouts':isCurrent?'0/'+GYM_DAYS.length+' workouts':'Upcoming'}</div></div>
      <div id="${rowId}" style="display:${isCurrent?'block':'none'};padding:0 20px 16px"><div style="display:flex;flex-direction:column;gap:8px">${days}</div></div>`;
    accordion.appendChild(card);
  }
}

function toggleWeekRow(id) { const r=document.getElementById(id); if(r) r.style.display=r.style.display==='block'?'none':'block'; }
