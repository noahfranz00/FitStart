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

function _showWorkoutSummary(workoutName, prs) {
  var result = _computeWorkoutStrengthScore();
  var score = result.score;
  var prevScore = result.prevScore;
  var totalSets = woWorkout ? woWorkout.exercises.reduce(function(a,e){ return a + (e.sets||3); }, 0) : 0;
  var loggedSets = 0;
  if (woWorkout && woSets) {
    woWorkout.exercises.forEach(function(_,i){
      var s = woSets[i];
      if (s) for (var j=0;j<s.length;j++) if (s[j] && s[j].done) loggedSets++;
    });
  }
  // Gauge fills based on score/1000 — 95pts = 9.5% fill, not sets completed
  var fillPct = Math.min(100, (score / 1000) * 100);
  var arcLen = 251.2;
  var offset = arcLen - (arcLen * fillPct / 100);

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeUp 0.3s ease';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var pct = prevScore > 0 ? Math.round(((score - prevScore) / prevScore) * 100) : 0;
  var deltaText = prevScore > 0 ? (pct >= 0 ? '+'+pct+'% vs last time' : pct+'% vs last time') : '';
  var prRows = (prs || []).map(function(p){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-size:0.88rem;color:var(--white)">'+p.exercise+'</div><div style="font-family:\'DM Mono\',monospace;font-size:0.82rem;color:var(--green)">'+p.weight+'lbs × '+p.reps+' <span style="font-size:0.65rem;font-weight:700">▲ PR</span></div></div>';
  }).join('');

  overlay.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px 24px;max-width:380px;width:100%;text-align:center" onclick="event.stopPropagation()">'+
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.2rem;letter-spacing:3px;color:var(--dim);margin-bottom:20px">WORKOUT COMPLETE</div>'+
    '<div style="position:relative;width:200px;height:110px;margin:0 auto 20px">'+
    '<svg viewBox="0 0 200 110" style="width:100%;height:100%">'+
    '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" stroke-linecap="round"/>'+
    '<path id="gauge-fill" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--green)" stroke-width="12" stroke-linecap="round" stroke-dasharray="251.2" stroke-dashoffset="'+offset+'"/>'+
    '</svg>'+
    '<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-family:\'Bebas Neue\',sans-serif;font-size:2rem;letter-spacing:2px;color:var(--green)">'+score+'<span style="font-size:0.8rem;color:var(--dim)">/1000</span></div>'+
    '</div>'+
    '<div style="font-size:0.62rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">Strength Score</div>'+
    (deltaText ? '<div style="font-size:0.8rem;color:var(--green);margin-bottom:16px">'+deltaText+'</div>' : '<div style="margin-bottom:16px"></div>')+
    (prRows ? '<div style="text-align:left;border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><div style="font-size:0.65rem;font-weight:700;letter-spacing:2px;color:var(--green);margin-bottom:10px">PRs HIT TODAY</div>'+prRows+'</div>' : '')+
    '<button id="wo-summary-done-btn" style="margin-top:20px;padding:12px 32px;background:var(--green);border:none;border-radius:10px;color:var(--black);font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:1.5px;cursor:pointer">DONE</button>'+
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('wo-summary-done-btn').onclick = function(){ overlay.remove(); };
}
