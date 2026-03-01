// ═══════════════════════════════════════════
// SCORING.JS — Strength Score (0-1000) Math
// ═══════════════════════════════════════════
// Dependencies: woWorkout, woSets, USER, todayDateStr(), getExLogs()
// Exposes: _computeWorkoutStrengthScore(), _showWorkoutSummary()

function _computeWorkoutStrengthScore() {
  if (!woWorkout) return { score: 0, prevScore: 0 };
  var rawScore = 0, rawPrev = 0;
  var today = todayDateStr();
  woWorkout.exercises.forEach(function(ex){
    var exlogs = getExLogs();
    var sessions = exlogs[ex.name] || [];
    var todaySession = sessions.find(function(s){ return s.date === today; });
    if (todaySession && todaySession.sets) {
      todaySession.sets.forEach(function(s){
        if (s && s.weight && s.reps) rawScore += s.weight * s.reps;
      });
    }
    var prev = sessions.find(function(s){ return s.date !== today; });
    if (prev && prev.sets) {
      prev.sets.forEach(function(s){
        if (s && s.weight && s.reps) rawPrev += s.weight * s.reps;
      });
    }
  });

  // Normalize to 0-1000 using user profile baseline
  // Baseline = expected total volume for a session based on bodyweight, age, experience
  var bw = (USER && USER.weight) ? parseFloat(USER.weight) : 160;
  var age = (USER && USER.age) ? parseInt(USER.age) : 25;
  var tier = (USER && USER.tier) || 'beginner';
  // Age multiplier: peak at 25, declines gently
  var ageMult = age <= 25 ? 1.0 : Math.max(0.6, 1.0 - (age - 25) * 0.008);
  // Tier multiplier: advanced lifters move more total volume
  var tierMult = tier === 'advanced' ? 1.8 : tier === 'intermediate' ? 1.3 : 1.0;
  // Baseline: a "1000-score" session = roughly 1.0x bodyweight * 5 exercises * 4 sets * 10 reps * tierMult * ageMult
  var maxBaseline = bw * 5 * 4 * 10 * tierMult * ageMult;
  // Floor baseline so beginners still get meaningful scores
  if (maxBaseline < 5000) maxBaseline = 5000;

  var score = Math.round(Math.min(1000, (rawScore / maxBaseline) * 1000));
  var prevScore = Math.round(Math.min(1000, (rawPrev / maxBaseline) * 1000));
  return { score: score, prevScore: prevScore };
}

function _showWorkoutSummary(workoutName, prs, durationMs, setsData, exercises) {
  var result = _computeWorkoutStrengthScore();
  var score = result.score;
  var prevScore = result.prevScore;

  // ── Compute Stats ──
  var totalVolume = 0, maxWeight = 0, totalSets = 0, totalReps = 0;
  var heaviestLift = { name: '', weight: 0, reps: 0 };
  var exerciseStats = [];

  (exercises || []).forEach(function(ex, i) {
    var sets = setsData[i] || [];
    var exVol = 0, exSets = 0, exMaxW = 0, exMaxR = 0;
    sets.forEach(function(s) {
      if (s && s.done && s.weight && s.reps) {
        var w = parseFloat(s.weight), r = parseInt(s.reps);
        exVol += w * r;
        exSets++;
        totalReps += r;
        if (w > exMaxW) { exMaxW = w; exMaxR = r; }
        if (w > maxWeight) maxWeight = w;
        if (w > heaviestLift.weight) { heaviestLift = { name: ex.name, weight: w, reps: r }; }
      }
    });
    totalVolume += exVol;
    totalSets += exSets;
    if (exSets > 0) exerciseStats.push({ name: ex.name, vol: exVol, sets: exSets, maxW: exMaxW, maxR: exMaxR });
  });

  // Duration
  var durMins = durationMs ? Math.round(durationMs / 60000) : 0;
  var durStr = durMins >= 60 ? Math.floor(durMins/60) + 'h ' + (durMins%60) + 'm' : durMins + ' min';

  // Score delta
  var pct = prevScore > 0 ? Math.round(((score - prevScore) / prevScore) * 100) : 0;
  var deltaText = prevScore > 0 ? (pct >= 0 ? '+' + pct + '%' : pct + '%') : '';
  var deltaColor = pct >= 0 ? '#4ADE80' : '#f87171';

  // Gauge
  var fillPct = Math.min(100, (score / 1000) * 100);
  var arcLen = 251.2;
  var offset = arcLen - (arcLen * fillPct / 100);

  // PR rows
  var prRows = (prs || []).map(function(p) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">' +
      '<span style="font-size:0.95rem;color:#fff;font-weight:600">' + p.exercise + '</span>' +
      '<span style="font-family:\'DM Mono\',monospace;font-size:0.88rem;color:#4ADE80;font-weight:700">' + p.weight + ' lbs × ' + p.reps + ' <span style="font-size:0.7rem;vertical-align:middle;letter-spacing:1px">▲ PR</span></span></div>';
  }).join('');

  // Stat boxes — always show full numbers with lbs, no abbreviations
  var stats = [];
  if (totalVolume > 0) stats.push({ label: 'TOTAL VOLUME', value: totalVolume.toLocaleString(), unit: 'lbs' });
  if (maxWeight > 0) stats.push({ label: 'MAX WEIGHT', value: maxWeight.toLocaleString(), unit: 'lbs' });
  if (totalSets > 0) stats.push({ label: 'SETS', value: totalSets.toString(), unit: '' });
  if (totalReps > 0) stats.push({ label: 'TOTAL REPS', value: totalReps.toString(), unit: '' });
  if (durMins > 0) stats.push({ label: 'DURATION', value: durStr, unit: '' });
  if (exercises && exercises.length) stats.push({ label: 'EXERCISES', value: exercises.length.toString(), unit: '' });

  // Take the top 4 most relevant stats
  var displayStats = stats.slice(0, 4);
  var statGrid = displayStats.map(function(s) {
    var unitSpan = s.unit ? '<span style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-left:2px">' + s.unit + '</span>' : '';
    return '<div style="text-align:center;padding:10px 0">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.5rem;letter-spacing:1px;color:#fff;line-height:1">' + s.value + unitSpan + '</div>' +
      '<div style="font-size:0.55rem;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-top:2px">' + s.label + '</div>' +
      '</div>';
  }).join('');

  // Date string
  var now = new Date();
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var dateStr = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
  var userName = (USER && USER.name) ? USER.name.toUpperCase() : '';

  // Build the card
  var overlay = document.createElement('div');
  overlay.id = 'wo-summary-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeUp 0.3s ease';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML =
    '<div style="max-width:400px;width:100%;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">' +
    // ── The shareable card area ──
    '<div id="wo-share-card" style="background:linear-gradient(145deg,#0a0a0a 0%,#111 50%,#0d1117 100%);border:1px solid rgba(74,222,128,0.25);border-radius:24px;padding:30px 24px 22px;position:relative;overflow:hidden">' +
      // Subtle glow effect
      '<div style="position:absolute;top:-40px;right:-40px;width:140px;height:140px;background:radial-gradient(circle,rgba(74,222,128,0.1) 0%,transparent 70%);pointer-events:none"></div>' +
      '<div style="position:absolute;bottom:-30px;left:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(74,222,128,0.06) 0%,transparent 70%);pointer-events:none"></div>' +
      // Header
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px">' +
        '<div>' +
          '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.8rem;letter-spacing:3px;color:rgba(255,255,255,0.5)">' + dateStr + '</div>' +
          '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.6rem;letter-spacing:2px;color:#fff;line-height:1.1;margin-top:4px">' + (workoutName || 'WORKOUT').toUpperCase() + '</div>' +
          (userName ? '<div style="font-size:0.85rem;color:rgba(255,255,255,0.5);margin-top:3px;font-weight:600">' + userName + '</div>' : '') +
        '</div>' +
        '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.75rem;letter-spacing:2px;color:#4ADE80;text-align:right;line-height:1.4">WORKOUT<br>COMPLETE ✓</div>' +
      '</div>' +
      // Score gauge
      '<div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;padding:18px;background:rgba(255,255,255,0.03);border-radius:16px;border:1px solid rgba(255,255,255,0.06)">' +
        '<div style="position:relative;width:100px;height:56px;flex-shrink:0">' +
          '<svg viewBox="0 0 200 110" style="width:100%;height:100%">' +
            '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="14" stroke-linecap="round"/>' +
            '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#4ADE80" stroke-width="14" stroke-linecap="round" stroke-dasharray="251.2" stroke-dashoffset="' + offset + '"/>' +
          '</svg>' +
          '<div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);font-family:\'Bebas Neue\',sans-serif;font-size:1.4rem;color:#4ADE80;letter-spacing:1px">' + score + '</div>' +
        '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:0.75rem;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.5)">STRENGTH SCORE</div>' +
          '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2.2rem;color:#fff;line-height:1">' + score + '<span style="font-size:0.85rem;color:rgba(255,255,255,0.4)">/1000</span></div>' +
          (deltaText ? '<div style="font-size:0.85rem;font-weight:700;color:' + deltaColor + '">' + deltaText + ' vs last</div>' : '') +
        '</div>' +
      '</div>' +
      // Stats grid
      '<div style="display:grid;grid-template-columns:repeat(' + Math.min(displayStats.length, 4) + ',1fr);gap:1px;background:rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:18px">' +
        displayStats.map(function(s) {
          var unitSpan = s.unit ? '<span style="font-size:0.8rem;color:rgba(255,255,255,0.5);margin-left:2px;text-transform:uppercase">' + s.unit + '</span>' : '';
          return '<div style="background:#0a0a0a;padding:16px 8px;text-align:center">' +
            '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.6rem;color:#fff;line-height:1">' + s.value + unitSpan + '</div>' +
            '<div style="font-size:0.6rem;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.45);margin-top:4px">' + s.label + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      // Heaviest lift callout
      (heaviestLift.weight > 0 ? '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:12px;margin-bottom:14px">' +
        '<div style="font-size:1.3rem;color:#4ADE80;font-weight:700">↑</div>' +
        '<div style="flex:1"><div style="font-size:0.75rem;font-weight:700;letter-spacing:1.5px;color:#4ADE80">HEAVIEST LIFT</div>' +
        '<div style="font-size:1rem;color:#fff;font-weight:700;margin-top:2px">' + heaviestLift.name + ' — ' + heaviestLift.weight + ' lbs × ' + heaviestLift.reps + '</div></div></div>' : '') +
      // PRs
      (prRows ? '<div style="margin-bottom:14px"><div style="font-size:0.75rem;font-weight:700;letter-spacing:2px;color:#4ADE80;margin-bottom:10px">PERSONAL RECORDS</div>' + prRows + '</div>' : '') +
      // Footer branding
      '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)">' +
        '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:2px;color:rgba(255,255,255,0.35)">FIT<span style="color:rgba(74,222,128,0.5)">●</span>START</div>' +
        '<div style="font-size:0.65rem;letter-spacing:1.5px;color:rgba(255,255,255,0.25);font-weight:600">AI-POWERED FITNESS</div>' +
      '</div>' +
    '</div>' +
    // ── Action buttons (outside the shareable card) ──
    '<div style="display:flex;gap:10px;margin-top:14px">' +
      '<button id="wo-share-btn" style="flex:1;padding:14px;background:#4ADE80;border:none;border-radius:12px;color:#000;font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:1.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
        'SHARE WORKOUT</button>' +
      '<button id="wo-summary-done-btn" style="padding:14px 24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:1.5px;cursor:pointer">DONE</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.getElementById('wo-summary-done-btn').onclick = function() { overlay.remove(); };

  // ── Share functionality ──
  document.getElementById('wo-share-btn').onclick = function() {
    _shareWorkoutCard();
  };
}

function _shareWorkoutCard() {
  var card = document.getElementById('wo-share-card');
  if (!card) return;

  // Use html2canvas-like approach with canvas
  try {
    var canvas = document.createElement('canvas');
    var scale = 2; // retina
    var rect = card.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Draw card background
    var grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(0.5, '#111111');
    grad.addColorStop(1, '#0d1117');
    _roundRect(ctx, 0, 0, rect.width, rect.height, 24, grad);

    // Since canvas drawing of complex HTML is tricky, use SVG foreignObject approach
    var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + rect.width + '" height="' + rect.height + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml">' +
      card.outerHTML + '</div></foreignObject></svg>';
    var img = new Image();
    var blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    img.onload = function() {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function(blob) {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'workout.png', { type: 'image/png' })] })) {
          navigator.share({
            files: [new File([blob], 'FitStart-Workout.png', { type: 'image/png' })],
            title: 'My FitStart Workout',
            text: 'Just crushed a workout on FitStart 💪'
          }).catch(function() {});
        } else {
          // Fallback: download
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'FitStart-Workout.png';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }, 'image/png');
    };
    img.onerror = function() {
      // Fallback: copy text summary
      _fallbackShareText(card);
    };
    img.src = url;
  } catch(e) {
    _fallbackShareText(card);
  }
}

function _roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function _fallbackShareText(card) {
  // Text-based share fallback
  var text = card.innerText.replace(/\n{3,}/g, '\n\n').trim();
  if (navigator.share) {
    navigator.share({ title: 'My FitStart Workout', text: text }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      var btn = document.getElementById('wo-share-btn');
      if (btn) { btn.textContent = 'COPIED!'; setTimeout(function() { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> SHARE WORKOUT'; }, 2000); }
    });
  }
}
