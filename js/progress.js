// ═══════════════════════════════════════════
// PROGRESS.JS — Timeline, Weight Tracking, Streak,
//   Frequency Chart, Strength Trends, Retroactive Logging
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, GYM_DAYS, DAY_WORKOUTS, TODAY_IDX,
//   CURRENT_WEEK, TOTAL_WEEKS, lsGet(), lsSet(), getExLogs(),
//   showToast(), DAYS_FULL, DAYS_SHORT

// ═══ UTILITY ═══
function todayDateStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _dayOfWeekIdx(d) {
  // Mon=0, Sun=6
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

// ═══ WORKOUT DATES ═══
function getWorkoutDates() {
  return new Set(lsGet('fs_workout_dates') || []);
}

function recordWorkoutDate() {
  var dates = lsGet('fs_workout_dates') || [];
  var today = todayDateStr();
  if (dates.indexOf(today) === -1) dates.push(today);
  lsSet('fs_workout_dates', dates);
}

// ═══ WEIGHT LOG ═══
function getWeightLog() {
  return lsGet('fs_weightLog') || [];
}

function logBodyWeight() {
  var input = document.getElementById('weight-log-input');
  if (!input) return;
  var lbs = parseFloat(input.value);
  if (!lbs || lbs < 50 || lbs > 600) { showToast('Enter a valid weight.', 'warning'); return; }
  var log = getWeightLog();
  var today = todayDateStr();
  log = log.filter(function(e) { return e.date !== today; });
  log.push({ date: today, lbs: lbs });
  log.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
  lsSet('fs_weightLog', log);
  input.value = '';
  if (USER) { USER.weight = lbs; lsSet('fs_user', USER); }
  showToast('Logged ' + lbs + ' lbs', 'success');
  renderWeightHistory();
  renderTimeline();
}

// ═══ STRENGTH SCORE FOR A DATE ═══
function _scoreForDate(dateStr) {
  var exlogs = getExLogs();
  var rawScore = 0;
  for (var exName in exlogs) {
    var sessions = exlogs[exName];
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].date === dateStr && sessions[i].sets) {
        sessions[i].sets.forEach(function(s) {
          if (s && s.weight && s.reps) rawScore += s.weight * s.reps;
        });
      }
    }
  }
  if (rawScore === 0) return 0;
  var bw = (USER && USER.weight) ? parseFloat(USER.weight) : 160;
  var tier = (USER && USER.tier) || 'beginner';
  var tierMult = tier === 'advanced' ? 1.8 : tier === 'intermediate' ? 1.3 : 1.0;
  var maxBaseline = Math.max(5000, bw * 5 * 4 * 10 * tierMult);
  return Math.round(Math.min(1000, (rawScore / maxBaseline) * 1000));
}

// ═══ EXERCISES LOGGED ON A DATE ═══
function _exercisesForDate(dateStr) {
  var exlogs = getExLogs();
  var result = [];
  for (var exName in exlogs) {
    var sessions = exlogs[exName];
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].date === dateStr && sessions[i].sets) {
        var bestWeight = 0, bestReps = 0, setCount = 0;
        sessions[i].sets.forEach(function(s) {
          if (s && s.weight) {
            setCount++;
            if (s.weight > bestWeight) { bestWeight = s.weight; bestReps = s.reps; }
          }
        });
        if (setCount > 0) result.push({ name: exName, bestWeight: bestWeight, bestReps: bestReps, sets: setCount });
      }
    }
  }
  return result;
}

// ═══ SCHEDULED WORKOUT FOR A DATE ═══
function _scheduledForDate(d) {
  var dayIdx = _dayOfWeekIdx(d);
  var workout = DAY_WORKOUTS[dayIdx];
  if (!workout || !workout.exercises || workout.exercises.length === 0) return null;
  return workout;
}

// ═══ RENDER TIMELINE — past 14 days + next 7 days ═══
function renderTimeline() {
  var container = document.getElementById('workout-timeline');
  if (!container) return;
  var workoutDates = getWorkoutDates();
  var now = new Date();
  var today = todayDateStr();

  // Build day list: past 14 + today + next 6
  var days = [];
  for (var i = 14; i >= 0; i--) {
    var d = new Date(now); d.setDate(now.getDate() - i);
    days.push(d);
  }
  for (var j = 1; j <= 6; j++) {
    var d2 = new Date(now); d2.setDate(now.getDate() + j);
    days.push(d2);
  }

  var html = '';
  var currentMonth = '';

  for (var k = 0; k < days.length; k++) {
    var day = days[k];
    var ds = _dateStr(day);
    var dayIdx = _dayOfWeekIdx(day);
    var isPast = ds < today;
    var isToday = ds === today;
    var isFuture = ds > today;
    var didWorkout = workoutDates.has(ds);
    var scheduled = _scheduledForDate(day);
    var isRestDay = !scheduled;
    var dayName = DAYS_SHORT[dayIdx];
    var dateNum = day.getDate();

    // Month header
    var monthLabel = day.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (monthLabel !== currentMonth) {
      currentMonth = monthLabel;
      html += '<div class="tl-month">' + monthLabel.toUpperCase() + '</div>';
    }

    // Skip past rest days (only show days with workouts or scheduled workouts)
    if (isPast && isRestDay && !didWorkout) continue;

    var cls = 'tl-day';
    if (isToday) cls += ' tl-today';
    if (isFuture) cls += ' tl-future';
    if (didWorkout) cls += ' tl-done';

    html += '<div class="' + cls + '" data-date="' + ds + '" onclick="_openDayDetail(\'' + ds + '\')">';

    // Left: date pill
    html += '<div class="tl-date"><div class="tl-date-name">' + dayName + '</div><div class="tl-date-num">' + dateNum + '</div></div>';

    // Center: workout info
    html += '<div class="tl-info">';

    if (didWorkout) {
      // Completed workout
      var exercises = _exercisesForDate(ds);
      var score = _scoreForDate(ds);
      var workoutName = scheduled ? scheduled.name : 'Workout';
      html += '<div class="tl-name">' + workoutName + '</div>';
      if (exercises.length > 0) {
        html += '<div class="tl-exercises">' + exercises.slice(0, 3).map(function(e) { return e.name; }).join(' · ');
        if (exercises.length > 3) html += ' +' + (exercises.length - 3);
        html += '</div>';
      }
      if (score > 0) {
        html += '<div class="tl-score">';
        html += '<div class="tl-score-bar"><div class="tl-score-fill" style="width:' + (score / 10) + '%"></div></div>';
        html += '<span class="tl-score-num">' + score + '</span>';
        html += '</div>';
      }
    } else if (isToday && scheduled) {
      html += '<div class="tl-name">' + scheduled.name + '</div>';
      html += '<div class="tl-exercises">' + scheduled.exercises.map(function(e) { return e.name; }).join(' · ') + '</div>';
      html += '<div class="tl-status tl-status-today">TODAY</div>';
    } else if (isFuture && scheduled) {
      html += '<div class="tl-name">' + scheduled.name + '</div>';
      html += '<div class="tl-exercises">' + scheduled.exercises.map(function(e) { return e.name; }).join(' · ') + '</div>';
      html += '<div class="tl-status tl-status-upcoming">UPCOMING</div>';
    } else if (isFuture && isRestDay) {
      html += '<div class="tl-name tl-rest">Rest Day</div>';
    } else if (isPast && !didWorkout && scheduled) {
      html += '<div class="tl-name tl-missed">' + scheduled.name + '</div>';
      html += '<div class="tl-status tl-status-missed">MISSED</div>';
    }

    html += '</div>'; // tl-info

    // Right: chevron
    html += '<div class="tl-chevron">›</div>';

    html += '</div>'; // tl-day
  }

  container.innerHTML = html;
}

// ═══ DAY DETAIL MODAL — click a day to see full breakdown or log retroactively ═══
function _openDayDetail(dateStr) {
  var workoutDates = getWorkoutDates();
  var didWorkout = workoutDates.has(dateStr);
  var d = new Date(dateStr + 'T12:00:00');
  var dayIdx = _dayOfWeekIdx(d);
  var dayName = DAYS_FULL[dayIdx];
  var today = todayDateStr();
  var isPast = dateStr < today;
  var isFuture = dateStr > today;
  var scheduled = _scheduledForDate(d);

  var m = document.getElementById('day-detail-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'day-detail-modal';
    m.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;animation:fadeIn 0.15s ease';
    m.innerHTML = '<div id="day-detail-inner" style="background:var(--card-solid,#151515);border:1px solid var(--border2);border-radius:18px;padding:24px;width:92%;max-width:400px;max-height:80vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.5)"></div>';
    m.addEventListener('click', function(e) { if (e.target === m) _closeDayDetail(); });
    document.body.appendChild(m);
  }
  m.style.display = 'flex';
  var inner = document.getElementById('day-detail-inner');
  var html = '';

  // Header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div>';
  html += '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.15rem;letter-spacing:1.5px;color:var(--bone)">' + dayName.toUpperCase() + ' · ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div>';
  html += '<div style="font-size:0.68rem;color:var(--dim);font-family:\'DM Mono\',monospace">' + dateStr + '</div>';
  html += '</div>';
  html += '<button onclick="_closeDayDetail()" style="background:none;border:none;color:var(--dim);font-size:1.3rem;cursor:pointer;padding:4px 8px">✕</button>';
  html += '</div>';

  if (didWorkout) {
    // Show completed workout details
    var exercises = _exercisesForDate(dateStr);
    var score = _scoreForDate(dateStr);

    if (score > 0) {
      html += '<div style="background:rgba(200,162,61,0.08);border:1px solid rgba(200,162,61,0.2);border-radius:12px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:14px">';
      html += '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2rem;color:var(--bone)">' + score + '</div>';
      html += '<div><div style="font-size:0.68rem;font-weight:700;letter-spacing:1.5px;color:var(--dim);text-transform:uppercase">Strength Score</div>';
      html += '<div style="width:120px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;margin-top:4px"><div style="height:100%;background:var(--gold-grad);border-radius:3px;width:' + (score / 10) + '%"></div></div>';
      html += '</div></div>';
    }

    if (exercises.length > 0) {
      html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;text-transform:uppercase">Exercises Logged</div>';
      for (var i = 0; i < exercises.length; i++) {
        var ex = exercises[i];
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">';
        html += '<div style="font-size:0.85rem;color:var(--off)">' + ex.name + '</div>';
        html += '<div style="font-family:\'DM Mono\',monospace;font-size:0.75rem;color:var(--bone)">' + ex.bestWeight + 'lbs × ' + ex.bestReps + ' <span style="color:var(--dim)">(' + ex.sets + ' sets)</span></div>';
        html += '</div>';
      }
    } else {
      html += '<div style="padding:14px 0;color:var(--dim);font-size:0.85rem">Workout logged but no set data recorded.</div>';
    }
  } else if (isFuture && scheduled) {
    // Show upcoming workout
    html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;text-transform:uppercase">Scheduled — ' + scheduled.name + '</div>';
    for (var j = 0; j < scheduled.exercises.length; j++) {
      var se = scheduled.exercises[j];
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">';
      html += '<div style="font-size:0.85rem;color:var(--off)">' + se.name + '</div>';
      html += '<div style="font-family:\'DM Mono\',monospace;font-size:0.75rem;color:var(--dim)">' + se.sets + '×' + se.reps + '</div>';
      html += '</div>';
    }
  } else if (isPast && scheduled) {
    html += '<div style="padding:14px 0;color:var(--orange);font-size:0.85rem">Scheduled: ' + scheduled.name + ' — not completed.</div>';
  } else {
    html += '<div style="padding:14px 0;color:var(--dim);font-size:0.85rem">Rest day — no workout scheduled.</div>';
  }

  // Retroactive log section for past days
  if (isPast) {
    html += '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">';
    html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:1.5px;color:var(--dim);margin-bottom:10px;text-transform:uppercase">Edit This Day</div>';

    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
    html += '<div style="font-size:0.85rem;color:var(--off)">Workout completed</div>';
    html += '<label class="theme-switch" style="width:48px;height:26px"><input type="checkbox" id="retro-wkt-cb" ' + (didWorkout ? 'checked' : '') + '><span class="slider"></span></label>';
    html += '</div>';

    var weightLog = getWeightLog();
    var existingW = null;
    for (var w = 0; w < weightLog.length; w++) {
      if (weightLog[w].date === dateStr) { existingW = weightLog[w].lbs; break; }
    }

    html += '<div style="font-size:0.72rem;font-weight:700;letter-spacing:1.5px;color:var(--dim);margin-bottom:6px;text-transform:uppercase">Bodyweight (lbs)</div>';
    html += '<input type="number" id="retro-bw-input" inputmode="decimal" value="' + (existingW || '') + '" placeholder="' + (USER ? USER.weight : '') + '" style="width:100%;padding:10px 14px;background:var(--dark);border:1px solid var(--border2);border-radius:10px;font-family:\'Bebas Neue\',sans-serif;font-size:1.2rem;color:var(--bone);letter-spacing:1px;outline:none;text-align:center;margin-bottom:14px">';

    html += '<button onclick="_saveRetroDay(\'' + dateStr + '\')" style="width:100%;padding:12px;background:var(--gold-grad);border:none;border-radius:10px;color:#111;font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem;letter-spacing:1.5px;cursor:pointer;font-weight:700">SAVE</button>';
    html += '</div>';
  }

  inner.innerHTML = html;
}

function _closeDayDetail() {
  var m = document.getElementById('day-detail-modal');
  if (m) m.style.display = 'none';
}

function _saveRetroDay(dateStr) {
  var cb = document.getElementById('retro-wkt-cb');
  var bwInput = document.getElementById('retro-bw-input');
  var saved = false;

  // Workout toggle
  var dates = lsGet('fs_workout_dates') || [];
  var had = dates.indexOf(dateStr) !== -1;
  if (cb && cb.checked && !had) { dates.push(dateStr); lsSet('fs_workout_dates', dates); saved = true; }
  if (cb && !cb.checked && had) { dates = dates.filter(function(d) { return d !== dateStr; }); lsSet('fs_workout_dates', dates); saved = true; }

  // Bodyweight
  if (bwInput && bwInput.value) {
    var lbs = parseFloat(bwInput.value);
    if (lbs > 0) {
      var log = getWeightLog();
      log = log.filter(function(e) { return e.date !== dateStr; });
      log.push({ date: dateStr, lbs: lbs });
      log.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      lsSet('fs_weightLog', log);
      saved = true;
    }
  }

  _closeDayDetail();
  if (saved) {
    showToast('Updated ' + dateStr, 'success');
    renderTimeline();
    renderStreak();
    renderWeightHistory();
    renderFreqChart();
  }
}

// ═══ STREAK STATS ═══
function renderStreak() {
  var workoutDates = getWorkoutDates();
  var now = new Date();

  // Current streak
  var streak = 0;
  for (var i = 0; i < 60; i++) {
    var check = new Date(now); check.setDate(now.getDate() - i);
    var key = _dateStr(check);
    if (workoutDates.has(key)) streak++;
    else if (i > 0) break;
  }
  var statStreak = document.getElementById('stat-streak');
  if (statStreak) statStreak.textContent = streak;

  // This month count
  var monthCount = 0;
  var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  for (var d = new Date(firstOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
    if (workoutDates.has(_dateStr(d))) monthCount++;
  }
  var statMonth = document.getElementById('stat-workouts');
  if (statMonth) statMonth.textContent = monthCount;

  // Streak calendar
  var calEl = document.getElementById('streak-cal');
  if (!calEl) return;
  var monthLabel = document.getElementById('streak-month-label');
  if (monthLabel) monthLabel.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  var first = new Date(now.getFullYear(), now.getMonth(), 1);
  var startPad = first.getDay() === 0 ? 6 : first.getDay() - 1; // Mon start
  var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  var today = todayDateStr();
  var html = '';
  for (var p = 0; p < startPad; p++) html += '<div class="sc-day" style="visibility:hidden"></div>';
  for (var dd = 1; dd <= daysInMonth; dd++) {
    var ds = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
    var cls = 'sc-day';
    if (ds === today) cls += ' today';
    else if (workoutDates.has(ds)) cls += ' done';
    html += '<div class="' + cls + '">' + dd + '</div>';
  }
  calEl.innerHTML = html;
}

// ═══ WEIGHT HISTORY ═══
function renderWeightHistory() {
  var log = getWeightLog();
  var listEl = document.getElementById('weight-history-list');
  var chartEl = document.getElementById('weight-chart-svg');
  var emptyEl = document.getElementById('weight-chart-empty');
  var displayEl = document.getElementById('weight-current-display');

  if (displayEl && log.length > 0) {
    var latest = log[log.length - 1];
    displayEl.textContent = 'Current: ' + latest.lbs + ' lbs (logged ' + latest.date + ')';
  }

  // Weight change stat
  var lbsEl = document.getElementById('stat-lbs-lost');
  var lbsLabel = document.getElementById('stat-lbs-label');
  if (lbsEl && log.length >= 2) {
    var diff = log[log.length - 1].lbs - log[0].lbs;
    lbsEl.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1);
    if (lbsLabel) lbsLabel.textContent = diff > 0 ? 'Lbs Gained' : 'Lbs Lost';
  }

  // History list (last 10)
  if (listEl) {
    listEl.innerHTML = log.slice(-10).reverse().map(function(e) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.78rem;border-bottom:1px solid var(--border)">' +
        '<span style="color:var(--dim);font-family:\'DM Mono\',monospace">' + e.date + '</span>' +
        '<span style="color:var(--bone);font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem">' + e.lbs + ' lbs</span></div>';
    }).join('');
  }

  // SVG chart
  if (!chartEl || log.length < 2) {
    if (emptyEl) emptyEl.style.display = 'flex';
    if (chartEl) chartEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  chartEl.style.display = 'block';

  var pts = log.slice(-30);
  var minW = Math.min.apply(null, pts.map(function(p) { return p.lbs; })) - 2;
  var maxW = Math.max.apply(null, pts.map(function(p) { return p.lbs; })) + 2;
  var range = maxW - minW || 1;
  var w = 400, h = 160, pad = 10;
  var step = (w - pad * 2) / Math.max(1, pts.length - 1);

  var pathD = pts.map(function(p, i) {
    var x = pad + i * step;
    var y = h - pad - ((p.lbs - minW) / range) * (h - pad * 2);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  chartEl.innerHTML =
    '<path d="' + pathD + '" fill="none" stroke="#F2F0EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    pts.map(function(p, i) {
      var x = pad + i * step;
      var y = h - pad - ((p.lbs - minW) / range) * (h - pad * 2);
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="#D4A520"/>';
    }).join('');
}

// ═══ FREQUENCY CHART — workouts per week, last 8 weeks ═══
function renderFreqChart() {
  var svg = document.getElementById('freq-chart-svg');
  if (!svg) return;
  var dates = getWorkoutDates();
  var now = new Date();
  var weeks = [];
  for (var w = 7; w >= 0; w--) {
    var count = 0;
    for (var d = 0; d < 7; d++) {
      var check = new Date(now); check.setDate(now.getDate() - w * 7 - d);
      if (dates.has(_dateStr(check))) count++;
    }
    weeks.push(count);
  }
  var maxCount = Math.max.apply(null, weeks) || 1;
  var barW = 36, gap = 14, totalW = weeks.length * (barW + gap);
  var h = 100;

  svg.innerHTML = weeks.map(function(c, i) {
    var barH = Math.max(4, (c / maxCount) * (h - 30));
    var x = i * (barW + gap) + 10;
    var y = h - barH - 16;
    var label = i === weeks.length - 1 ? 'This wk' : (7 - i) + 'w ago';
    return '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="4" fill="' + (i === weeks.length - 1 ? '#D4A520' : 'rgba(255,255,255,0.1)') + '"/>' +
      '<text x="' + (x + barW / 2) + '" y="' + (y - 4) + '" text-anchor="middle" fill="#F2F0EB" font-size="11" font-family="Bebas Neue">' + c + '</text>' +
      '<text x="' + (x + barW / 2) + '" y="' + (h - 2) + '" text-anchor="middle" fill="#777" font-size="8" font-family="DM Mono">' + label + '</text>';
  }).join('');
}

// ═══ NUTRITION CHART (avg protein) ═══
function renderNutritionChart() {
  var statPro = document.getElementById('stat-avg-pro');
  if (!statPro) return;
  try {
    var mealLogs = lsGet('fs_mealLogs') || {};
    var totalPro = 0, days = 0;
    for (var dayKey in mealLogs) {
      var dayData = mealLogs[dayKey];
      var dayPro = 0;
      for (var cat in dayData) {
        (dayData[cat] || []).forEach(function(item) { dayPro += item.pro || 0; });
      }
      if (dayPro > 0) { totalPro += dayPro; days++; }
    }
    statPro.textContent = days > 0 ? Math.round(totalPro / days) + 'g' : '—';
  } catch (e) { statPro.textContent = '—'; }
}

// ═══ STRENGTH TRENDS (placeholder — uses timeline now) ═══
function renderStrengthTrends() {
  // Strength data is now shown per-day in the timeline
}

// ═══ MAIN RENDER — called when Progress tab opens ═══
function renderProgressView() {
  renderStreak();
  renderWeightHistory();
  renderNutritionChart();
  renderFreqChart();
  renderStrengthTrends();
  renderTimeline();
}
