// ═══════════════════════════════════════════
// PROGRESS.JS — Progress View: Weight, Streaks,
//   Workout Frequency, Nutrition Chart, Strength Trends
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, CURRENT_WEEK, TOTAL_WEEKS, GYM_DAYS,
//   todayDateStr, dateStr, lsGet, lsSet, wktDone, mealLogs, getExLogs,
//   showToast, getTrainingPhase, isDeloadWeek

// ── RECORD WORKOUT DATE ──
// Called by finishWorkout() in workout.js

function recordWorkoutDate() {
  var dates = lsGet('fs_workout_dates') || [];
  var today = todayDateStr();
  if (dates.indexOf(today) < 0) {
    dates.push(today);
    lsSet('fs_workout_dates', dates);
  }
}

// ── BODY WEIGHT ──

function logBodyWeight() {
  var input = document.getElementById('weight-log-input');
  if (!input) return;
  var val = parseFloat(input.value);
  if (!val || val < 50 || val > 600) {
    if (typeof showToast === 'function') showToast('Enter a valid weight (50–600 lbs).', 'warning');
    return;
  }
  var log = lsGet('fs_weightLog') || [];
  var today = todayDateStr();
  // Replace today's entry if already logged
  var existing = log.findIndex(function(e) { return e.date === today; });
  if (existing >= 0) {
    log[existing].weight = val;
  } else {
    log.push({ date: today, weight: val });
  }
  // Sort by date ascending
  log.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  lsSet('fs_weightLog', log);
  input.value = '';
  // Update user's current weight
  if (typeof USER !== 'undefined' && USER) {
    USER.weight = val;
    lsSet('fs_user', USER);
  }
  if (typeof showToast === 'function') showToast('Weight logged: ' + val + ' lbs', 'success');
  renderWeightHistory();
  _updateProgressStats();
}

function renderWeightHistory() {
  var log = lsGet('fs_weightLog') || [];
  var display = document.getElementById('weight-current-display');
  var emptyEl = document.getElementById('weight-chart-empty');
  var svgEl = document.getElementById('weight-chart-svg');
  var listEl = document.getElementById('weight-history-list');

  if (log.length === 0) {
    if (display) display.textContent = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (svgEl) svgEl.style.display = 'none';
    if (listEl) listEl.innerHTML = '';
    return;
  }

  var latest = log[log.length - 1];
  if (display) {
    var goalW = (USER && USER.goal) ? parseFloat(USER.goal) : null;
    var diff = goalW ? (latest.weight - goalW).toFixed(1) : null;
    display.innerHTML = 'Current: <strong style="color:var(--white)">' + latest.weight + ' lbs</strong>' +
      (diff !== null ? ' · <span style="color:' + (diff > 0 ? 'var(--orange)' : '#22c55e') + '">' + (diff > 0 ? diff + ' lbs to go' : 'At or below goal!') + '</span>' : '');
  }

  // Chart
  if (log.length >= 2 && svgEl) {
    if (emptyEl) emptyEl.style.display = 'none';
    svgEl.style.display = 'block';
    _drawWeightChart(svgEl, log);
  } else {
    if (emptyEl) emptyEl.style.display = 'flex';
    if (svgEl) svgEl.style.display = 'none';
  }

  // History list (last 10)
  if (listEl) {
    var recent = log.slice(-10).reverse();
    listEl.innerHTML = recent.map(function(e) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 8px;border-radius:6px;background:var(--dark);font-size:0.78rem">' +
        '<span style="color:var(--dim)">' + e.date + '</span>' +
        '<span style="color:var(--white);font-weight:600">' + e.weight + ' lbs</span></div>';
    }).join('');
  }
}

function _drawWeightChart(svg, log) {
  var W = 400, H = 160, pad = 24;
  var pts = log.slice(-30); // last 30 entries
  var weights = pts.map(function(p) { return p.weight; });
  var minW = Math.min.apply(null, weights) - 2;
  var maxW = Math.max.apply(null, weights) + 2;
  if (maxW === minW) maxW = minW + 4;
  var xStep = pts.length > 1 ? (W - pad * 2) / (pts.length - 1) : 0;

  var pathD = '';
  var areaD = '';
  pts.forEach(function(p, i) {
    var x = pad + i * xStep;
    var y = H - pad - ((p.weight - minW) / (maxW - minW)) * (H - pad * 2);
    if (i === 0) {
      pathD += 'M' + x + ',' + y;
      areaD += 'M' + x + ',' + (H - pad) + ' L' + x + ',' + y;
    } else {
      pathD += ' L' + x + ',' + y;
      areaD += ' L' + x + ',' + y;
    }
    if (i === pts.length - 1) {
      areaD += ' L' + x + ',' + (H - pad) + ' Z';
    }
  });

  var goalY = null;
  if (USER && USER.goal) {
    var g = parseFloat(USER.goal);
    if (g >= minW && g <= maxW) {
      goalY = H - pad - ((g - minW) / (maxW - minW)) * (H - pad * 2);
    }
  }

  svg.innerHTML =
    '<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(212,165,32,0.25)"/><stop offset="100%" stop-color="rgba(212,165,32,0)"/></linearGradient></defs>' +
    '<path d="' + areaD + '" fill="url(#wg)"/>' +
    '<path d="' + pathD + '" fill="none" stroke="#D4A520" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    (goalY !== null ? '<line x1="' + pad + '" y1="' + goalY + '" x2="' + (W - pad) + '" y2="' + goalY + '" stroke="rgba(34,197,94,0.4)" stroke-width="1" stroke-dasharray="4,4"/>' +
      '<text x="' + (W - pad) + '" y="' + (goalY - 4) + '" fill="#22c55e" font-size="9" text-anchor="end">Goal</text>' : '') +
    // Last point dot
    '<circle cx="' + (pad + (pts.length - 1) * xStep) + '" cy="' + (H - pad - ((pts[pts.length - 1].weight - minW) / (maxW - minW)) * (H - pad * 2)) + '" r="4" fill="#D4A520"/>' +
    // Axis labels
    '<text x="' + pad + '" y="12" fill="var(--dim)" font-size="9">' + maxW.toFixed(0) + '</text>' +
    '<text x="' + pad + '" y="' + (H - 6) + '" fill="var(--dim)" font-size="9">' + minW.toFixed(0) + '</text>';
}


// ── STREAK CALENDAR ──

function renderStreak() {
  var cal = document.getElementById('streak-cal');
  var monthLabel = document.getElementById('streak-month-label');
  if (!cal) return;

  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  if (monthLabel) monthLabel.textContent = months[month] + ' ' + year;

  // Collect all workout dates
  var workoutDates = new Set(lsGet('fs_workout_dates') || []);
  // Also add from wktDone (day indices for current week)
  if (typeof wktDone !== 'undefined') {
    var wkStart = _getWeekStart(now);
    wktDone.forEach(function(dayIdx) {
      var d = new Date(wkStart);
      d.setDate(d.getDate() + dayIdx);
      workoutDates.add(dateStr(d));
    });
  }

  var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so Monday=0
  var startOffset = (firstDay + 6) % 7;

  var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center">';
  ['M','T','W','T','F','S','S'].forEach(function(d) {
    html += '<div style="font-size:0.55rem;color:var(--dim);font-weight:700;padding:2px 0">' + d + '</div>';
  });
  for (var i = 0; i < startOffset; i++) {
    html += '<div></div>';
  }
  for (var day = 1; day <= daysInMonth; day++) {
    var ds = dateStr(new Date(year, month, day));
    var isToday = ds === todayDateStr();
    var didWorkout = workoutDates.has(ds);
    var bg = didWorkout ? 'rgba(212,165,32,0.35)' : 'rgba(255,255,255,0.03)';
    var border = isToday ? '2px solid var(--gold)' : '1px solid transparent';
    var color = didWorkout ? 'var(--white)' : 'var(--dim)';
    html += '<div style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:6px;background:' + bg + ';border:' + border + ';font-size:0.68rem;font-weight:600;color:' + color + '">' + day + '</div>';
  }
  html += '</div>';
  cal.innerHTML = html;

  // Update streak stat
  _updateProgressStats();
}

function _getWeekStart(d) {
  var date = new Date(d);
  var day = date.getDay();
  var diff = (day + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function _computeStreak() {
  var workoutDates = lsGet('fs_workout_dates') || [];
  if (workoutDates.length === 0) return 0;
  var sorted = workoutDates.slice().sort().reverse();
  // Check consecutive days from today backward (count weeks with at least 1 workout)
  var streak = 0;
  var today = new Date();
  for (var i = 0; i < 365; i++) {
    var checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    var ds = dateStr(checkDate);
    if (sorted.indexOf(ds) >= 0) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken
    }
    // Allow today to not yet have a workout
    if (i === 0 && sorted.indexOf(ds) < 0) continue;
  }
  return streak;
}


// ── WORKOUT FREQUENCY CHART ──

function renderFreqChart() {
  var svg = document.getElementById('freq-chart-svg');
  if (!svg) return;

  var workoutDates = lsGet('fs_workout_dates') || [];
  var now = new Date();
  var weeks = [];
  for (var w = 7; w >= 0; w--) {
    var wkStart = new Date(now);
    wkStart.setDate(wkStart.getDate() - wkStart.getDay() + 1 - w * 7);
    var wkEnd = new Date(wkStart);
    wkEnd.setDate(wkEnd.getDate() + 6);
    var count = 0;
    workoutDates.forEach(function(d) {
      if (d >= dateStr(wkStart) && d <= dateStr(wkEnd)) count++;
    });
    weeks.push(count);
  }

  var W = 400, H = 100, pad = 20;
  var maxVal = Math.max.apply(null, weeks.concat([GYM_DAYS ? GYM_DAYS.length : 4]));
  if (maxVal === 0) maxVal = 4;
  var barW = (W - pad * 2) / weeks.length - 6;

  var goalLine = GYM_DAYS ? GYM_DAYS.length : 0;
  var goalY = H - pad - (goalLine / maxVal) * (H - pad * 2);

  var bars = '';
  weeks.forEach(function(count, i) {
    var x = pad + i * ((W - pad * 2) / weeks.length) + 3;
    var barH = (count / maxVal) * (H - pad * 2);
    var y = H - pad - barH;
    var fill = count >= goalLine ? '#D4A520' : 'rgba(255,255,255,0.15)';
    bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="3" fill="' + fill + '"/>';
    bars += '<text x="' + (x + barW / 2) + '" y="' + (H - 4) + '" fill="var(--dim)" font-size="8" text-anchor="middle">' + (i === 7 ? 'This' : '-' + (7 - i)) + '</text>';
    if (count > 0) {
      bars += '<text x="' + (x + barW / 2) + '" y="' + (y - 4) + '" fill="var(--off)" font-size="9" text-anchor="middle" font-weight="700">' + count + '</text>';
    }
  });

  var goalLineHtml = goalLine > 0 ?
    '<line x1="' + pad + '" y1="' + goalY + '" x2="' + (W - pad) + '" y2="' + goalY + '" stroke="rgba(212,165,32,0.3)" stroke-width="1" stroke-dasharray="4,4"/>' +
    '<text x="' + (W - pad) + '" y="' + (goalY - 3) + '" fill="rgba(212,165,32,0.5)" font-size="8" text-anchor="end">Goal: ' + goalLine + '/wk</text>' : '';

  svg.innerHTML = goalLineHtml + bars;
}


// ── NUTRITION CHART (average macros trend) ──

function renderNutritionChart() {
  // Compute average daily protein over recent days for the stat strip
  var avgPro = _computeAvgProtein(7);
  var el = document.getElementById('stat-avg-pro');
  if (el) el.textContent = avgPro > 0 ? avgPro + 'g' : '—';
}

function _computeAvgProtein(days) {
  if (typeof mealLogs === 'undefined') return 0;
  var totalPro = 0;
  var counted = 0;
  for (var i = 0; i < Math.min(days, 7); i++) {
    var dayEntries = mealLogs[i];
    if (!dayEntries || !Array.isArray(dayEntries) || dayEntries.length === 0) continue;
    var dayPro = 0;
    dayEntries.forEach(function(e) {
      dayPro += (e.protein || 0);
    });
    if (dayPro > 0) {
      totalPro += dayPro;
      counted++;
    }
  }
  return counted > 0 ? Math.round(totalPro / counted) : 0;
}


// ── STRENGTH TRENDS ──

function renderStrengthTrends() {
  // This populates the progress stat strip with workout count for current month
  var workoutDates = lsGet('fs_workout_dates') || [];
  var now = new Date();
  var monthStr = dateStr(now).substring(0, 7); // YYYY-MM
  var thisMonthCount = workoutDates.filter(function(d) { return d.substring(0, 7) === monthStr; }).length;
  var el = document.getElementById('stat-workouts');
  if (el) el.textContent = thisMonthCount;
}


// ── PROGRESS STATS STRIP ──

function _updateProgressStats() {
  // Streak
  var streak = _computeStreak();
  var streakEl = document.getElementById('stat-streak');
  if (streakEl) streakEl.textContent = streak;
  var dashStreak = document.getElementById('dash-streak');
  if (dashStreak) dashStreak.textContent = streak || 1;

  // Lbs lost/gained
  var log = lsGet('fs_weightLog') || [];
  var lbsEl = document.getElementById('stat-lbs-lost');
  var lbsLabel = document.getElementById('stat-lbs-label');
  if (log.length >= 2 && lbsEl) {
    var first = log[0].weight;
    var last = log[log.length - 1].weight;
    var diff = last - first;
    if (diff < 0) {
      lbsEl.textContent = Math.abs(diff).toFixed(1);
      if (lbsLabel) lbsLabel.textContent = 'Lbs Lost';
    } else if (diff > 0) {
      lbsEl.textContent = '+' + diff.toFixed(1);
      if (lbsLabel) lbsLabel.textContent = 'Lbs Gained';
    } else {
      lbsEl.textContent = '0';
      if (lbsLabel) lbsLabel.textContent = 'Weight Change';
    }
  }

  // This month workouts
  renderStrengthTrends();
  // Avg protein
  renderNutritionChart();
}
