// ═══════════════════════════════════════════
// WORKOUT.JS — Workout Environment, Sets Table,
//   Rest Timer, Exercise Customizer, Custom Workout Builder
// ═══════════════════════════════════════════
// Dependencies: USER, DAY_WORKOUTS, GYM_DAYS, TODAY_IDX, wktDone,
//   saveSet(), getPrevSet(), getExLogs(), persistWorkoutDraft(),
//   getWorkoutDraft(), EXERCISE_DB, getExerciseData(), callClaude()

// ═══════════════════════════════════════════
// WORKOUT ENVIRONMENT
// ═══════════════════════════════════════════
let woDay = 0;
let woCurrentEx = 0;
let woWorkout = null;
let woSets = {};
let woExtraSets = {};
let woPRs = []; // Track PRs hit during this workout session
let woStartTime = null; // Track workout duration
let restTimerInterval = null;

function openWorkoutEnv(dayIdx, startExIdx) {
  const workout = DAY_WORKOUTS[dayIdx];
  if (!workout || !workout.exercises.length) {
    openUnplannedWorkout(dayIdx);
    return;
  }
  woDay = dayIdx;
  woCurrentEx = startExIdx || 0;
  woWorkout = workout;
  woPRs = [];
  woStartTime = woStartTime || Date.now(); // Don't reset if resuming
  const draft = getWorkoutDraft(dayIdx);
  if (draft && draft.sets) {
    woSets = draft.sets;
    if (draft.extraSets) woExtraSets = draft.extraSets;
  } else if (!Object.keys(woSets).length) {
    woSets = {}; woExtraSets = {};
  }

  document.getElementById('wo-title').textContent = workout.name.toUpperCase() + ' — ' + DAYS_FULL[dayIdx].toUpperCase();
  const dayTitleEl = document.getElementById('wo-day-title');
  if (dayTitleEl) dayTitleEl.textContent = workout.name.toUpperCase();
  const daySubEl = document.getElementById('wo-day-subtitle');
  if (daySubEl) daySubEl.textContent = DAYS_FULL[dayIdx];

  // Show workout screen (position:fixed covers full viewport)
  document.getElementById('screen-dash').style.display = 'none';
  // Hide mobile tab bar during workout — use class to override !important CSS
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.classList.add('hidden-in-workout');
  const woEl = document.getElementById('screen-workout');
  woEl.classList.add('active');
  woEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  // Hide resume banner if it exists
  _hideResumeBanner();

  // Progress bar
  const fill = document.getElementById('wo-prog-fill');
  const label = document.getElementById('wo-prog-label');
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = `0 / ${workout.exercises.length}`;

  _warmupDismissed = false;
  _renderWarmupBanner(workout.name);
  renderEcList();
  loadExercise(woCurrentEx);
  restoreRestTimerIfActive();
}


// Minimize workout — hide overlay, show dash with resume banner
function minimizeWorkout() {
  const woEl = document.getElementById('screen-workout');
  woEl.classList.remove('active');
  woEl.style.display = 'none';
  document.body.style.overflow = '';

  // Restore dashboard
  const dash = document.getElementById('screen-dash');
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  dash.style.height = '100dvh';
  dash.style.height = '100vh';

  // Show mobile tab bar
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.classList.remove('hidden-in-workout');

  // Show resume banner
  _showResumeBanner();
}

function _showResumeBanner() {
  var banner = document.getElementById('wo-resume-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'wo-resume-banner';
    banner.style.cssText = 'position:fixed;bottom:70px;left:10px;right:10px;z-index:9998;padding:0;animation:fadeUp 0.25s ease;';
    banner.innerHTML = '<div style="background:linear-gradient(135deg,rgba(212,165,32,0.95),rgba(184,144,11,0.95));border-radius:14px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" width="18" height="18"><path d="M6 4v6M6 14v6M18 4v6M18 14v6M3 7h6M15 7h6M3 17h6M15 17h6"/></svg></div>' +
        '<div><div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem;letter-spacing:1px;color:#111">WORKOUT IN PROGRESS</div>' +
        '<div style="font-size:0.7rem;color:rgba(0,0,0,0.6)" id="wo-resume-detail"></div></div>' +
      '</div>' +
      '<button onclick="resumeWorkout()" style="padding:10px 20px;background:#111;color:var(--gold);border:none;border-radius:10px;font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1.5px;cursor:pointer;white-space:nowrap">RESUME</button>' +
    '</div>';
    document.body.appendChild(banner);
  }
  banner.style.display = 'block';
  // Update detail text
  var detail = document.getElementById('wo-resume-detail');
  if (detail && woWorkout) {
    var completedSets = 0;
    for (var k in woSets) {
      if (woSets[k]) {
        for (var si = 0; si < woSets[k].length; si++) {
          if (woSets[k][si] && woSets[k][si].done) completedSets++;
        }
      }
    }
    detail.textContent = woWorkout.name + ' · Exercise ' + (woCurrentEx + 1) + '/' + woWorkout.exercises.length;
  }
}

function _hideResumeBanner() {
  var banner = document.getElementById('wo-resume-banner');
  if (banner) banner.style.display = 'none';
}

function resumeWorkout() {
  if (!woWorkout) return;
  // Re-show the workout env
  document.getElementById('screen-dash').style.display = 'none';
  var tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.classList.add('hidden-in-workout');
  var woEl = document.getElementById('screen-workout');
  woEl.classList.add('active');
  woEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _hideResumeBanner();
  // Restore to the exercise they were on
  loadExercise(woCurrentEx);
  restoreRestTimerIfActive();
}

function exitWorkout() {
  stopRestTimer();
  const woEl2 = document.getElementById('screen-workout');
  woEl2.classList.remove('active');
  woEl2.style.display = '';
  document.body.style.overflow = '';
  const dashRestore = document.getElementById('screen-dash');
  dashRestore.style.display = 'flex';
  dashRestore.style.flexDirection = 'column';
  dashRestore.style.height = '100dvh';
  dashRestore.style.height = '100vh';
  // Restore mobile tab bar
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.classList.remove('hidden-in-workout');
  _hideResumeBanner();
  // Reset workout state
  woStartTime = null;
  window.scrollTo(0, 0);
  renderTodayWorkout();
  renderWeek();
}

function finishWorkout() {
  recordWorkoutDate();
  wktDone.add(woDay);
  saveToStorage();
  stopRestTimer();
  lsSet('fs_rest_timer', null);

  // Collect stats before clearing workout state
  const prList = woPRs.slice();
  const workoutName = woWorkout ? woWorkout.name : 'Workout';
  const durationMs = woStartTime ? Date.now() - woStartTime : 0;
  const setsSnapshot = woSets ? JSON.parse(JSON.stringify(woSets)) : {};
  const exercisesSnapshot = woWorkout ? woWorkout.exercises.slice() : [];

  const woEl2 = document.getElementById('screen-workout');
  woEl2.classList.remove('active');
  woEl2.style.display = '';
  document.body.style.overflow = '';
  const dashRestore = document.getElementById('screen-dash');
  dashRestore.style.display = 'flex';
  dashRestore.style.flexDirection = 'column';
  dashRestore.style.height = '100dvh';
  dashRestore.style.height = '100vh';
  // Restore mobile tab bar
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.classList.remove('hidden-in-workout');
  _hideResumeBanner();
  woStartTime = null;
  window.scrollTo(0, 0);
  renderTodayWorkout();
  renderWeek();

  _showWorkoutSummary(workoutName, prList, durationMs, setsSnapshot, exercisesSnapshot);
}

function loadExercise(idx) {
  woCurrentEx = idx;
  const exes = woWorkout.exercises;
  const ex = exes[idx];
  if (!ex) return;

  const titleEl2 = document.getElementById('wo-ex-title');
  titleEl2.textContent = ex.name;
  
  // Superset indicator
  const ssTag = ex._supersetWith ? '<div style="font-size:0.65rem;font-family:\'DM Mono\',monospace;color:var(--orange);letter-spacing:0.5px;margin-top:2px">SUPERSET with ' + ex._supersetWith + '</div>' : '';
  
  // Single clean line: SETS × REPS  |  REST  |  [EDIT]  [⋮]
  const setsInfoEl = document.getElementById('wo-sets-info');
  setsInfoEl.innerHTML = 
    `<span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1.5px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ex.sets} SETS × ${ex.reps} REPS</span>` +
    `<span style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--dim)">REST ${ex.rest}s</span>` +
    `<span style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-shrink:0">` +
      `<button onclick="openSetRepEditor(${idx})" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--dim);font-size:0.6rem;font-family:'DM Mono',monospace;cursor:pointer;letter-spacing:0.5px;display:flex;align-items:center;gap:4px" title="Edit sets & reps">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>EDIT</button>` +
      `<button onclick="_toggleWoExMenu(event)" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--dim);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1" title="Exercise options">⋮</button>` +
    `</span>` +
    ssTag;

  // Update mobile header title
  const titleEl = document.getElementById('wo-title');
  if (titleEl && window.innerWidth <= 768) {
    titleEl.textContent = `${idx+1}/${exes.length} — ${ex.name.toUpperCase()}`;
  }

  // Exercise demo — video + phase info
  const db = getExerciseData(ex.name);
  // Show current training phase badge — with exercise-specific context
  const phMod = getPhaseExerciseModifier(CURRENT_WEEK);
  const phBadgeEl = document.getElementById('wo-phase-badge');
  if (phBadgeEl) {
    if (isDeloadWeek(CURRENT_WEEK)) {
      phBadgeEl.textContent = '⚡ DELOAD WEEK — 60% volume, focus on form';
      phBadgeEl.style.cssText = 'display:block;background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.3);border-radius:8px;padding:8px 14px;font-size:0.75rem;color:var(--orange);margin-bottom:10px';
    } else {
      const ph = getTrainingPhase(CURRENT_WEEK);
      // Check if exercise reps match the phase range — if not, give exercise-specific tip
      const exRepLow = parseInt(String(ex.reps).split('-')[0]) || 8;
      const phRepLow = parseInt(ph.repRange.split('-')[0]) || 8;
      const phRepHigh = parseInt(ph.repRange.split('-')[1]) || 12;
      let badgeText;
      if (exRepLow < phRepLow) {
        // Heavy compound (e.g. deadlift 4-6 in hypertrophy phase) — give appropriate tip
        badgeText = `${ph.name} PHASE · Heavy compound: prioritize form and controlled reps. Rest fully between sets.`;
      } else if (exRepLow > phRepHigh) {
        // Higher rep accessory in a strength phase
        badgeText = `${ph.name} PHASE · Accessory work: focus on controlled tempo and muscle connection.`;
      } else {
        badgeText = `${ph.name} PHASE · ${ph.intensityLabel}`;
      }
      phBadgeEl.textContent = badgeText;
      phBadgeEl.style.cssText = 'display:block;background:rgba(212,165,32,0.07);border:1px solid rgba(212,165,32,0.2);border-radius:8px;padding:8px 14px;font-size:0.75rem;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px';
    }
  }
  document.getElementById('wo-muscles-tag').style.display = 'none';
  const framesEl = document.getElementById('wo-demo-frames');
  renderDemoPlaceholder(framesEl, ex.name, ex.muscles || db.muscles);

  // Initialize dynamic set count if not set
  if (!woExtraSets[idx]) woExtraSets[idx] = ex.sets;
  renderSetsTable(idx, ex);

  // Rest timer button
  stopRestTimer();
  // Cap rest time based on training phase — max 120s for hypertrophy/strength, 180s for power/peak
  const phName = (getTrainingPhase(CURRENT_WEEK) || {}).name || '';
  const maxRest = (phName === 'POWER' || phName === 'PEAK') ? 180 : 120;
  restTotalSecs = Math.min(ex.rest, maxRest);
  buildRestSelect();
  updateRestDisplay();

  // Nav buttons
  document.getElementById('wo-next-btn').textContent = idx < exes.length-1 ? `DONE — NEXT: ${exes[idx+1]?.name.toUpperCase() || ''}` : 'FINISH WORKOUT ✓';
  const prevBtn = document.getElementById('wo-prev-btn');
  if (prevBtn) {
    if (idx === 0) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }
  }

  renderEcList();
}

// ── WORKOUT ENV 3-DOT MENU ──
let _woExMenuEl = null;
function _toggleWoExMenu(e) {
  if (_woExMenuEl) { _woExMenuEl.remove(); _woExMenuEl = null; return; }
  // Find the clicked button from the event, or fall back to finding it in the sets-info row
  const btn = (e && e.currentTarget) ? e.currentTarget : document.querySelector('#wo-sets-info button[title="Exercise options"]');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  _woExMenuEl = document.createElement('div');
  _woExMenuEl.style.cssText = 'position:fixed;top:' + (rect.bottom + 4) + 'px;right:' + Math.max(8, window.innerWidth - rect.right) + 'px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 0;min-width:200px;z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,0.7);animation:fadeUp 0.15s ease';
  const idx = woCurrentEx;
  _woExMenuEl.innerHTML = 
    '<span onclick="_substituteFromWorkout(' + idx + ')" style="display:block;padding:12px 16px;font-size:0.85rem;color:#E2DFD8;cursor:pointer">🔄 Substitute Exercise</span>' +
    '<span onclick="_addSupersetFromWorkout(' + idx + ')" style="display:block;padding:12px 16px;font-size:0.85rem;color:#E2DFD8;cursor:pointer">➕ Add Superset</span>' +
    '<span onclick="removeExerciseFromWorkout(' + idx + ');_closeWoExMenu()" style="display:block;padding:12px 16px;font-size:0.85rem;color:#F43F5E;cursor:pointer">🗑 Remove Exercise</span>';
  _woExMenuEl.querySelectorAll('span').forEach(function(s) {
    s.onmouseenter = function() { s.style.background = 'rgba(255,255,255,0.06)'; };
    s.onmouseleave = function() { s.style.background = 'none'; };
  });
  document.body.appendChild(_woExMenuEl);
  const _menuBtn = btn;
  setTimeout(function() {
    document.addEventListener('click', function _close(e) {
      if (_woExMenuEl && !_woExMenuEl.contains(e.target) && e.target !== _menuBtn) {
        _closeWoExMenu();
      }
      document.removeEventListener('click', _close);
    }, { once: true });
  }, 10);
}
function _closeWoExMenu() {
  if (_woExMenuEl) { _woExMenuEl.remove(); _woExMenuEl = null; }
}

// Track if substitute originated from workout env
let _woSubstituteMode = false;
function _substituteFromWorkout(idx) {
  _closeWoExMenu();
  _woSubstituteMode = true;
  _dashExPickerMode = 'substitute';
  _dashExPickerIdx = idx;
  var modal = document.getElementById('dash-ex-picker-modal');
  modal.classList.add('open');
  document.getElementById('dash-ex-picker-title').textContent = 'SUBSTITUTE EXERCISE';
  document.getElementById('dash-ex-picker-search').value = '';
  _aesFilterMuscle = 'All';
  _aesFilterEquip = 'All';
  _updateAesFilterLabels();
  var tray = document.getElementById('aes-build-tray');
  if (tray) tray.style.display = 'none';
  renderDashExPickerList();
}
function _addSupersetFromWorkout(idx) {
  _closeWoExMenu();
  _woSubstituteMode = true;
  _dashExPickerMode = 'superset';
  _dashExPickerIdx = idx;
  var modal = document.getElementById('dash-ex-picker-modal');
  modal.classList.add('open');
  document.getElementById('dash-ex-picker-title').textContent = 'ADD SUPERSET';
  document.getElementById('dash-ex-picker-search').value = '';
  _aesFilterMuscle = 'All';
  _aesFilterEquip = 'All';
  _updateAesFilterLabels();
  var tray = document.getElementById('aes-build-tray');
  if (tray) tray.style.display = 'none';
  renderDashExPickerList();
}

function _isTimedExercise(reps) {
  return /\d\s*s(?:ec|\/|\b)/i.test(String(reps));
}

function _isDumbbellExercise(name) {
  const n = name.toLowerCase();
  return n.includes('dumbbell') || n.includes(' db ') || n.startsWith('db ') || n.includes('hammer curl') || n.includes('arnold press');
}

function renderSetsTable(idx, ex) {
  const tbody = document.getElementById('sets-tbody');
  if (!tbody) return;
  const isTimed = _isTimedExercise(ex.reps);
  
  // Show/hide dumbbell weight note
  let dbNote = document.getElementById('wo-db-note');
  if (!dbNote) {
    dbNote = document.createElement('div');
    dbNote.id = 'wo-db-note';
    const panel = tbody.closest('.sets-panel');
    if (panel) panel.appendChild(dbNote);
  }
  if (_isDumbbellExercise(ex.name)) {
    dbNote.style.cssText = 'padding:6px 0 2px;font-size:0.68rem;color:var(--dim);font-family:"DM Mono",monospace;text-align:center';
    dbNote.textContent = 'Log the weight of ONE dumbbell';
  } else {
    dbNote.style.display = 'none';
  }
  // Update table headers for timed exercises
  const thead = tbody.closest('table')?.querySelector('thead');
  if (thead) {
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      const cells = headerRow.querySelectorAll('th');
      if (isTimed && cells.length >= 3) {
        cells[1].textContent = 'DURATION';
        cells[2].textContent = 'NOTES';
      } else if (cells.length >= 3) {
        cells[1].textContent = 'WEIGHT';
        cells[2].textContent = 'REPS';
      }
    }
  }
  // Apply deload week volume reduction (60% of normal sets, min 2)
  let baseSets = ex.sets;
  if (isDeloadWeek(CURRENT_WEEK)) baseSets = Math.max(2, Math.round(baseSets * 0.6));
  const numSets = woExtraSets[idx] || baseSets;
  tbody.innerHTML = '';

  // Look up previous session for THIS exercise by NAME (not index)
  let prevSets = [];
  try {
    const exlogs = getExLogs();
    const sessions = exlogs[ex.name] || [];
    const today = todayDateStr();
    const prevSession = sessions.find(s => s.date !== today);
    if (prevSession && prevSession.sets) prevSets = prevSession.sets;
  } catch(e) {}

  for (let s=0; s<numSets; s++) {
    const isSaved = woSets[idx] && woSets[idx][s];
    const isDone = isSaved && woSets[idx][s].done;
    const prev = prevSets[s] || null;
    const tr = document.createElement('tr');

    if (isTimed) {
      // Timed exercise: show duration (seconds) + optional notes
      const valDur = isDone && (woSets[idx][s].weight != null) ? String(woSets[idx][s].weight) : '';
      const valNote = isDone && (woSets[idx][s].reps != null) ? String(woSets[idx][s].reps) : '';
      const prevHint = (prev && prev.weight) ? '<div style="font-size:0.7rem;color:var(--off);margin-top:3px;font-family:\'DM Mono\',monospace">Last: ' + prev.weight + 's</div>' : '';
      tr.innerHTML = '<td style="color:var(--dim);font-family:\'DM Mono\',monospace;font-size:0.78rem;white-space:nowrap"><div>Set '+(s+1)+'</div>' + prevHint + '</td>'+
        '<td class="set-cell-weight"><div style="position:relative"><input class="set-weight-input '+(isDone?'done':'')+'" id="w-'+idx+'-'+s+'" type="number" inputmode="numeric" value="'+escapeAttr(valDur)+'" min="0" placeholder="sec" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')" style="padding-right:24px"><span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.65rem;color:var(--dim);pointer-events:none">s</span></div></td>'+
        '<td class="set-cell-reps"><input class="set-reps-input '+(isDone?'done':'')+'" id="r-'+idx+'-'+s+'" type="text" value="'+escapeAttr(valNote)+'" placeholder="BW" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')" style="font-size:0.75rem"></td>'+
        '<td><button class="set-check '+(isDone?'done':'')+'" id="sd-'+idx+'-'+s+'" '+(isDone?'disabled':'')+' onclick="completeSet('+idx+','+s+','+ex.rest+')" title="Mark done">✓</button></td>'+
        '<td><button class="set-del-btn" onclick="deleteSet('+idx+','+s+')" title="Delete set">✕</button></td>';
    } else {
      // Standard weight/reps exercise
      const valW = isDone && (woSets[idx][s].weight != null) ? String(woSets[idx][s].weight) : '';
      const valR = isDone && (woSets[idx][s].reps != null) ? String(woSets[idx][s].reps) : '';
      const prevHint = (prev && prev.weight && prev.reps) ? '<div style="font-size:0.7rem;color:var(--off);margin-top:3px;font-family:\'DM Mono\',monospace">Last: ' + prev.weight + 'lbs × ' + prev.reps + '</div>' : '';
      tr.innerHTML = '<td style="color:var(--dim);font-family:\'DM Mono\',monospace;font-size:0.78rem;white-space:nowrap"><div>Set '+(s+1)+'</div>' + prevHint + '</td>'+
        '<td class="set-cell-weight"><input class="set-weight-input '+(isDone?'done':'')+'" id="w-'+idx+'-'+s+'" type="number" inputmode="decimal" value="'+escapeAttr(valW)+'" min="0" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')"></td>'+
        '<td class="set-cell-reps"><input class="set-reps-input '+(isDone?'done':'')+'" id="r-'+idx+'-'+s+'" type="number" inputmode="numeric" value="'+escapeAttr(valR)+'" min="0" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')"></td>'+
        '<td><button class="set-check '+(isDone?'done':'')+'" id="sd-'+idx+'-'+s+'" '+(isDone?'disabled':'')+' onclick="completeSet('+idx+','+s+','+ex.rest+')" title="Mark done">✓</button></td>'+
        '<td><button class="set-del-btn" onclick="deleteSet('+idx+','+s+')" title="Delete set">✕</button></td>';
    }
    tbody.appendChild(tr);
  }
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addSet() {
  if (woCurrentEx === null || !woWorkout) return;
  const idx = woCurrentEx;
  const ex = woWorkout.exercises[idx];
  woExtraSets[idx] = (woExtraSets[idx] || ex.sets) + 1;
  renderSetsTable(idx, ex);
  persistWorkoutDraft();
}

function deleteSet(exIdx, setIdx) {
  const ex = woWorkout.exercises[exIdx];
  const current = woExtraSets[exIdx] || ex.sets;
  if (current <= 1) return; // keep at least 1
  woExtraSets[exIdx] = current - 1;
  if (woSets[exIdx]) {
    woSets[exIdx].splice(setIdx, 1);
  }
  renderSetsTable(exIdx, ex);
  persistWorkoutDraft();
}

function autoSaveSet(exIdx, setIdx, restSecs) {
  const wEl = document.getElementById(`w-${exIdx}-${setIdx}`);
  const rEl = document.getElementById(`r-${exIdx}-${setIdx}`);
  if (!wEl || !rEl) return;
  const weight = (wEl.value || '').trim();
  const reps = (rEl.value || '').trim();
  // Only save to draft if at least one field has a value
  if (weight || reps) {
    if (!woSets[exIdx]) woSets[exIdx] = [];
    if (!woSets[exIdx][setIdx]) woSets[exIdx][setIdx] = {};
    woSets[exIdx][setIdx].weight = weight;
    woSets[exIdx][setIdx].reps = reps;
    persistWorkoutDraft();
    if (weight && reps) saveSet(woDay, exIdx, setIdx, weight, reps);
  }
}

function isPR(exIdx, setIdx, weight, reps) {
  const exName = woWorkout?.exercises?.[exIdx]?.name;
  if (!exName || !weight || !reps) return false;
  const w = parseFloat(weight), r = parseInt(reps);
  if (!w || !r) return false;
  const currentE1RM = w * (1 + r / 30);
  const exlogs = getExLogs();
  const sessions = exlogs[exName] || [];
  const today = todayDateStr();
  let bestE1RM = 0;
  for (const session of sessions) {
    if (session.date === today) continue;
    for (const set of (session.sets || [])) {
      if (set && set.weight && set.reps) {
        const e1rm = set.weight * (1 + set.reps / 30);
        if (e1rm > bestE1RM) bestE1RM = e1rm;
      }
    }
  }
  return bestE1RM > 0 && currentE1RM > bestE1RM;
}

function completeSet(exIdx, setIdx, restSecs) {
  _dismissWarmup(); // Auto-hide warmup once user starts logging
  const wEl = document.getElementById(`w-${exIdx}-${setIdx}`);
  const rEl = document.getElementById(`r-${exIdx}-${setIdx}`);
  const weight = wEl.value || wEl.placeholder || '0';
  const reps   = rEl.value || rEl.placeholder || '0';

  saveSet(woDay, exIdx, setIdx, weight, reps);

  const btn = document.getElementById(`sd-${exIdx}-${setIdx}`);
  const wasAlreadyDone = woSets[exIdx] && woSets[exIdx][setIdx] && woSets[exIdx][setIdx].done;

  if (wasAlreadyDone) {
    // TOGGLE OFF — user is correcting a mistake
    if (woSets[exIdx] && woSets[exIdx][setIdx]) woSets[exIdx][setIdx].done = false;
    btn.classList.remove('done');
    wEl.classList.remove('done');
    rEl.classList.remove('done');
    persistWorkoutDraft();
    return;
  }

  btn.classList.add('done');
  if (!woSets[exIdx]) woSets[exIdx] = [];
  if (!woSets[exIdx][setIdx]) woSets[exIdx][setIdx] = {};
  woSets[exIdx][setIdx].weight = weight;
  woSets[exIdx][setIdx].reps = reps;
  woSets[exIdx][setIdx].done = true;
  persistWorkoutDraft();

  // Mark inputs done (green tint) but keep them editable — user can fix typos
  wEl.classList.add('done');
  rEl.classList.add('done');

  // Focus the next set's Weight input
  const numSets = woExtraSets[exIdx] || woWorkout.exercises[exIdx].sets;
  const nextSetIdx = setIdx + 1;
  if (nextSetIdx < numSets) {
    const nextW = document.getElementById(`w-${exIdx}-${nextSetIdx}`);
    if (nextW) { nextW.focus(); }
  }

  var pr = isPR(exIdx, setIdx, weight, reps);
  if (pr) {
    var exName = woWorkout.exercises[exIdx] ? woWorkout.exercises[exIdx].name : 'Exercise';
    woPRs.push({ exercise: exName, weight: weight, reps: reps, set: setIdx + 1 });
    var row = btn.closest('tr');
    if (row) {
      row.style.background = 'rgba(212,165,32,0.12)';
      row.style.transition = 'background 0.3s';
      setTimeout(function(){ row.style.background = ''; }, 2000);
    }
  }

  // Auto-start rest timer if not last set
  const ex = woWorkout.exercises[exIdx];
  const numSetsForTimer = woExtraSets[exIdx] || ex.sets;
  const allSets = Array.from({length:numSetsForTimer},(_,i)=>document.getElementById(`sd-${exIdx}-${i}`));
  const allDone = allSets.every(b=>b&&b.disabled);
  if (!allDone && restSecs > 0) startRestTimerSecs(restTotalSecs);
}

const EXERCISE_CUES = {
  default:            { start:["Set up in position","Brace your core","Neutral spine"], mid:["Control the movement","Stay tight through the lift","Drive through the rep"], end:["Full range of motion","Squeeze at the top","Lower with control"] },
  "Pull-Ups":         { start:["Dead hang, arms fully extended","Grip shoulder-width apart","Engage lats — pull shoulders down"], mid:["Drive elbows toward hips","Pull chest toward the bar","Keep core tight, no swinging"], end:["Chin clears the bar","Squeeze back and biceps","Lower slowly — full extension"] },
  "Barbell Row":      { start:["Hip hinge 45°, bar over mid-foot","Overhand grip just outside legs","Big breath, chest up, lats engaged"], mid:["Pull bar to lower chest/belly","Drive elbows straight back","Squeeze shoulder blades hard together"], end:["Bar touches torso — hold 1 sec","Scapulae fully retracted","Lower with control, keep back flat"] },
  "Bench Press":      { start:["5-point contact: feet, glutes, upper back, head","Retract scapulae into bench","Unrack bar directly over lower chest"], mid:["Lower bar to lower chest","Elbows at 45-75 degrees","Stay tight throughout"], end:["Press to lockout directly above chest","Full elbow extension at top","Control descent — 2-3 sec down"] },
  "Back Squat":       { start:["Bar on upper traps, chest tall","Feet just outside shoulders, slight toe-out","Big breath into belly, brace hard"], mid:["Break hips and knees simultaneously","Knees track over toes throughout","Hit parallel or below — thighs level"], end:["Drive through full foot","Hips and shoulders rise at same rate","Lock out hips and knees at top"] },
  "Deadlift":         { start:["Bar over mid-foot (1 inch from shins)","Hip-width stance, grip just outside legs","Hips down, chest up, lats tight"], mid:["Push floor away — legs drive first","Bar drags up the shins and thighs","Hips and shoulders rise together"], end:["Stand tall — hips fully extended","Glutes squeeze at lockout","Lower: hinge hips back first, then bend knees"] },
  "Romanian Deadlift":{ start:["Stand tall, slight knee bend","Hip-width grip, bar against thighs","Chest up, shoulders back, brace core"], mid:["Push hips straight back — not down","Bar stays close, drags down thighs","Feel deep hamstring stretch at bottom"], end:["Drive hips forward to stand","Squeeze glutes hard at top","Keep back flat the entire rep"] },
  "Overhead Press":   { start:["Bar at collarbone, elbows slightly forward","Grip just outside shoulders","Legs hip-width, glutes and core tight"], mid:["Press straight up, head moves back slightly","Bar clears forehead — then head forward","Full arm extension, biceps near ears"], end:["Lock out overhead — shrug traps at top","Bar stacked over heels","Lower to clavicle with control"] },
  "Leg Press":        { start:["Feet shoulder-width on plate, mid-height","Full back contact with pad","Unlock safety bars, control from there"], mid:["Lower platform until 90 degrees at knee","Knees track in line with toes","Lower back stays flat on pad always"], end:["Press through heels and full foot","Extend until almost locked — soft knees","Keep knees tracking over toes"] },
  "Leg Curl":         { start:["Lie face down, pads just above heels","Adjust so knee joint aligns with pivot","Relax hips flat into pad"], mid:["Curl heel toward glutes — full range","Squeeze hamstrings at peak contraction","Keep hips pressed down throughout"], end:["Hold peak for 1-2 seconds","Lower slowly — 3 sec eccentric","Full extension at bottom each rep"] },
  "Calf Raises":      { start:["Ball of foot on edge of platform","Full stretch — heel below platform level","Hold support lightly for balance only"], mid:["Rise onto toes — full plantar flexion","Keep knees straight or slightly bent","Push through big toe side"], end:["Hold peak 2 sec — squeeze hard","Lower all the way down to full stretch","Each rep: full stretch to full contraction"] },
  "Lat Pulldown":     { start:["Wide overhand grip, thumbs around bar","Sit tall, slight backward lean","Depress shoulders — pull them down from ears"], mid:["Pull bar to upper chest","Drive elbows down and back","Arch chest slightly toward bar"], end:["Bar touches upper chest","Squeeze lats hard","Extend arms fully — feel full lat stretch"] },
  "Cable Row":        { start:["Sit tall with slight forward lean","Grip handle, arms extended","Brace core — neutral spine"], mid:["Pull handle to mid-torso","Drive elbows straight back","Squeeze shoulder blades together at end"], end:["Hold contraction 1 sec","Lean forward slightly on the return","Full arm extension — feel the stretch"] },
  "Face Pulls":       { start:["Cable set at face height","Rope grip — thumbs pointing back","Step back until arms fully extended"], mid:["Pull rope to face level, hands toward ears","Elbows flare high and wide","External rotate at end of pull"], end:["Hands beside ears, palms facing forward","Squeeze rear delts and rotator cuff","Return slowly — control the eccentric"] },
  "Barbell Curl":     { start:["Shoulder-width supinated grip","Elbows pinned at sides throughout","Stand tall, slight forward lean"], mid:["Curl without swinging — strict form","Keep elbows stationary throughout","Squeeze biceps hard at the top"], end:["Full flexion — forearm toward bicep","Hold peak 1-2 sec","Lower slowly 3 sec — full extension"] },
  "Incline DB Press": { start:["45 degree incline, feet flat on floor","DBs at chest level, elbows below wrists","Retract scapulae into pad"], mid:["Press up and slightly inward in an arc","Control the path — no extreme flare","Full extension at top"], end:["DBs nearly touch at top — squeeze chest","Lower slowly to chest level","Full range every rep"] },
  "Arnold Press":     { start:["DBs at shoulder height, palms facing you","Sit tall on bench — core braced","Slight forward lean for stability"], mid:["Press up while rotating palms outward","Elbows flare wide as you press up","Smooth rotation throughout the lift"], end:["Lockout overhead — palms fully facing forward","Pause at top 1 sec","Reverse the rotation on the way down"] },
  "Lateral Raises":   { start:["DBs at sides, very slight elbow bend","Stand shoulder-width, slight forward lean","Avoid shrugging — keep traps relaxed"], mid:["Raise to shoulder height — lead with elbows","Pinky slightly higher than thumb at top","Keep slight bend in arms throughout"], end:["Pause at shoulder height 1 sec","Lower slowly — 3 sec eccentric","Shoulders stay down throughout"] },
  "Conventional Deadlift": { start:["Bar over mid-foot","Hip-width stance, grip just outside legs","Hips down, chest up, lats tight"], mid:["Push floor away","Bar drags close to shins and thighs","Hips and shoulders rise together"], end:["Full hip extension, glutes locked","Stand completely tall","Lower with control: hips back first"] },
  "Tricep Pushdown":  { start:["Cable at chest height","Elbows tucked at sides","Slight forward lean"], mid:["Push down to full extension","Keep elbows stationary","Squeeze triceps hard"], end:["Lock out arms","Hold 1 sec at bottom","Control the return slowly"] },
};


function renderDemoPlaceholder(el, name, muscles) {
  const videoId = EXERCISE_VIDEOS[name] || null;
  const ytSearch = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' proper form short');

  if (videoId) {
    el.innerHTML = `
      <div style="position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:14px;overflow:hidden;cursor:pointer" onclick="_loadYTPlayer(this,'${videoId}')">
        <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35)">
          <div style="width:60px;height:42px;background:rgba(212,165,32,0.95);border-radius:10px;display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" fill="#111" width="22" height="22"><polygon points="6 3 20 12 6 21"/></svg>
          </div>
        </div>
        <div style="position:absolute;bottom:8px;left:8px;font-size:0.65rem;color:rgba(255,255,255,0.7);font-family:'DM Mono',monospace;letter-spacing:0.5px">TAP TO PLAY</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="width:100%;padding:16px 0;display:flex;align-items:center;justify-content:center" onclick="window.open('${ytSearch}','_blank')">
        <button style="display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:10px;padding:10px 18px;cursor:pointer;color:var(--dim);font-family:'DM Mono',monospace;font-size:0.75rem;letter-spacing:0.5px">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" width="16" height="16"><polygon points="6 3 20 12 6 21"/></svg>
          WATCH FORM TUTORIAL
        </button>
      </div>`;
  }
}

function _loadYTPlayer(wrap, videoId) {
  wrap.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" style="position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:14px" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen></iframe>';
}

// ── EXERCISE CUSTOMIZER ──
let _unplannedDayIdx = 0;
let _customBuilderSelected = []; // [{name, sets, reps, rest, muscles}]

function openCustomWorkoutBuilder() {
  // Use the same exercise picker modal as superset/substitute — build mode
  openDashExPicker('build', -1);
}

function openUnplannedWorkout(dayIdx) {
  _unplannedDayIdx = dayIdx;
  _customBuilderSelected = [];
  _aiGeneratedExercises = [];
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  // Reset ALL sub-panels
  const ids = ['unplanned-options','custom-builder','ai-workout-loading','ai-workout-preview'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = id === 'unplanned-options' ? 'block' : 'none'; });
  document.getElementById('unplanned-modal-title').textContent = 'START A WORKOUT';
  document.getElementById('unplanned-modal-day').textContent = dayNames[dayIdx].toUpperCase() + ' — CHOOSE HOW TO START';
  document.getElementById('unplanned-modal').style.display = 'flex';
}

function closeUnplannedModal() {
  document.getElementById('unplanned-modal').style.display = 'none';
  document.getElementById('unplanned-modal').classList.remove('fullscreen-builder');
  const inner = document.getElementById('unplanned-modal-inner');
  if (inner) { inner.style.maxHeight = ''; inner.style.height = ''; inner.style.maxWidth = ''; inner.style.borderRadius = ''; inner.style.paddingTop = ''; inner.style.paddingBottom = ''; }
}

// Quick Start removed

let _aiGeneratedExercises = [];

async function startAIWorkout() {
  document.getElementById('unplanned-options').style.display = 'none';
  document.getElementById('unplanned-modal-title').textContent = 'AI WORKOUT';

  // Show preset IMMEDIATELY so user always sees something
  const tier = (USER && USER.tier) || 'beginner';
  // Derive actual goal text from weight data (USER.goal is goal WEIGHT, not goal text)
  let goalText = 'general fitness';
  if (USER && USER.goal && USER.weight) {
    goalText = USER.goal < USER.weight ? 'lose weight and get lean' : 'build muscle and gain strength';
  }
  _aiGeneratedExercises = _getPreset(tier);
  _showAIPreview(_aiGeneratedExercises, tier, goalText, 'SUGGESTED');

  // Debug status helper — shows on screen since can't see console on iPhone
  const dbg = document.getElementById('ai-debug-status');
  function _dbg(msg) {
    console.log('AI-WKT: ' + msg);
    if (dbg) { dbg.style.display = 'block'; dbg.textContent = msg; }
  }

  _dbg('Requesting AI workout...');

  // Use the SAME callClaude function that the coach chat uses (which works)
  try {
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const day = dayNames[_unplannedDayIdx] || 'Monday';
    
    const duration = (USER && USER.duration) || '45-60 min';
    const equipment = (USER && USER.equipment) ? USER.equipment.join(', ') : 'Full Gym';
    const numExercises = tier === 'beginner' ? '3-4' : tier === 'intermediate' ? '4-5' : '4-5';
    
    const aiText = await callClaude([{
      role: 'user',
      content: `Generate a ${day} gym workout for a ${tier} lifter whose goal is to ${goalText}.
Session length: ${duration}. Equipment: ${equipment}.

Return ONLY a valid JSON array of ${numExercises} exercises. Each object must have these fields:
{"name":"string","sets":number,"reps":"string","rest":number,"muscles":"string"}

RULES:
- Exercise names must be simple and standard (2-3 words max, e.g. "Bench Press", "Lat Pulldown", "Romanian Deadlift")
- NO complexes, supersets, or combination movements
- Each exercise targets ONE primary muscle group
- Rest in seconds (60-120)
- Reps should be simple numbers like "8-10" or "12"
- The ENTIRE workout must fit in ${duration}

Example:
[{"name":"Back Squat","sets":4,"reps":"8-10","rest":90,"muscles":"Quads"}]

No markdown, no backticks, no explanation — just the raw JSON array.`
    }], {
      system: 'You are a fitness workout generator. Respond with ONLY a valid JSON array. No markdown fences, no backticks, no explanation text, no preamble. Just the raw JSON array starting with [ and ending with ].',
      max_tokens: 800
    });
    
    _dbg('Got: ' + (aiText ? aiText.substring(0, 60) : '(empty)'));
    
    if (!aiText) {
      _dbg('Empty response from API');
      return;
    }
    
    const parsed = _parseExerciseJSON(aiText);
    if (parsed) {
      _aiGeneratedExercises = parsed;
      if (document.getElementById('unplanned-modal').style.display !== 'none') {
        _showAIPreview(_aiGeneratedExercises, tier, goalText, 'AI-GENERATED');
        if (dbg) dbg.style.display = 'none';
      }
    } else {
      _dbg('Parse fail: ' + aiText.substring(0, 100));
    }
  } catch(e) {
    _dbg('ERR: ' + (e.name === 'AbortError' ? 'Timeout 20s' : e.message));
  }
}

// Robust JSON array extraction from AI text response
function _parseExerciseJSON(text) {
  if (!text) return null;
  try {
    // Try direct parse first
    let cleaned = text.trim();
    // Strip markdown fences
    cleaned = cleaned.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    // Try to find a JSON array in the text
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) cleaned = arrMatch[0];
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0].name) {
      return parsed;
    }
  } catch(e) {
    console.log('Exercise JSON parse failed:', e.message, 'Raw:', text.substring(0, 200));
  }
  return null;
}

async function regenerateAIWorkout() {
  const tier = (USER && USER.tier) || 'beginner';
  let goalText = 'general fitness';
  if (USER && USER.goal && USER.weight) {
    goalText = USER.goal < USER.weight ? 'lose weight and get lean' : 'build muscle and gain strength';
  }
  document.getElementById('ai-workout-preview').style.display = 'none';
  document.getElementById('ai-workout-loading').style.display = 'block';
  
  try {
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const day = dayNames[_unplannedDayIdx] || 'Monday';
    
    const aiText = await callClaude([{
      role: 'user',
      content: `Generate a different ${day} gym workout for a ${tier} lifter whose goal is to ${goalText}. Make it different from a standard workout. Return ONLY a valid JSON array of 4-6 exercises. Each object: {"name":"string","sets":number,"reps":"string","rest":number,"muscles":"string"}. No markdown, no explanation, just the JSON array.`
    }], {
      system: 'You are a fitness workout generator. Respond with ONLY a valid JSON array. No markdown fences, no backticks, no explanation text. Just the raw JSON array starting with [ and ending with ].',
      max_tokens: 800
    });
    
    const parsed = _parseExerciseJSON(aiText);
    if (parsed) {
      _aiGeneratedExercises = parsed;
      _showAIPreview(_aiGeneratedExercises, tier, goalText, 'AI-GENERATED');
      return;
    }
  } catch(e) {
    console.error('AI regenerate failed:', e.message);
  }
  // Fallback
  _aiGeneratedExercises = _getPreset(tier);
  _showAIPreview(_aiGeneratedExercises, tier, goalText, 'SUGGESTED');
}

function _getPreset(tier) {
  // Properly programmed presets: compound-first, accessories follow.
  // 6 templates cycling by day: Push, Pull, Legs, Upper, Lower, Full Body
  const dayIdx = _unplannedDayIdx !== undefined ? _unplannedDayIdx : new Date().getDay();
  const templates = {
    beginner: [
      // Day 0: Push — Bench first, then pressing accessories
      [ {name:'Bench Press',sets:3,reps:'8-10',rest:120,muscles:'Chest, Triceps, Shoulders'},{name:'Shoulder Press',sets:3,reps:'8-10',rest:90,muscles:'Shoulders, Triceps'},{name:'Incline DB Press',sets:3,reps:'10-12',rest:90,muscles:'Upper Chest'},{name:'Lateral Raises',sets:3,reps:'12-15',rest:60,muscles:'Side Delts'},{name:'Tricep Pushdown',sets:3,reps:'12-15',rest:60,muscles:'Triceps'} ],
      // Day 1: Pull — Heavy row first, then vertical pull, then accessories
      [ {name:'Barbell Row',sets:3,reps:'8-10',rest:120,muscles:'Back, Biceps'},{name:'Lat Pulldown',sets:3,reps:'10-12',rest:90,muscles:'Lats, Biceps'},{name:'Cable Row',sets:3,reps:'10-12',rest:90,muscles:'Mid Back'},{name:'Face Pulls',sets:3,reps:'15-20',rest:60,muscles:'Rear Delts'},{name:'Barbell Curl',sets:3,reps:'10-12',rest:60,muscles:'Biceps'} ],
      // Day 2: Legs — Squat first, then hamstrings/calves
      [ {name:'Goblet Squat',sets:3,reps:'10-12',rest:90,muscles:'Quads, Glutes'},{name:'Romanian Deadlift',sets:3,reps:'10-12',rest:90,muscles:'Hamstrings, Glutes'},{name:'Leg Press',sets:3,reps:'10-12',rest:90,muscles:'Quads'},{name:'Leg Curl',sets:3,reps:'12-15',rest:60,muscles:'Hamstrings'},{name:'Calf Raises',sets:3,reps:'15-20',rest:45,muscles:'Calves'} ],
      // Day 3: Upper — Bench + Row superset style, then shoulders/arms
      [ {name:'Bench Press',sets:3,reps:'8-10',rest:120,muscles:'Chest, Triceps'},{name:'Barbell Row',sets:3,reps:'8-10',rest:120,muscles:'Back, Biceps'},{name:'Arnold Press',sets:3,reps:'10-12',rest:90,muscles:'Shoulders'},{name:'Lat Pulldown',sets:3,reps:'10-12',rest:90,muscles:'Lats'},{name:'Hammer Curls',sets:3,reps:'10-12',rest:60,muscles:'Biceps, Forearms'} ],
      // Day 4: Lower — Squat first, then single-leg and hamstring work
      [ {name:'Back Squat',sets:3,reps:'8-10',rest:120,muscles:'Quads, Glutes'},{name:'Romanian Deadlift',sets:3,reps:'10-12',rest:90,muscles:'Hamstrings, Glutes'},{name:'Walking Lunges',sets:3,reps:'10 each',rest:60,muscles:'Quads, Glutes'},{name:'Leg Curl',sets:3,reps:'12-15',rest:60,muscles:'Hamstrings'},{name:'Calf Raises',sets:3,reps:'15-20',rest:45,muscles:'Calves'} ],
      // Day 5: Full Body — one big compound per body part
      [ {name:'Back Squat',sets:3,reps:'8-10',rest:120,muscles:'Quads, Glutes'},{name:'Bench Press',sets:3,reps:'8-10',rest:120,muscles:'Chest, Triceps'},{name:'Barbell Row',sets:3,reps:'8-10',rest:120,muscles:'Back, Biceps'},{name:'Shoulder Press',sets:3,reps:'10-12',rest:90,muscles:'Shoulders'},{name:'Barbell Curl',sets:2,reps:'10-12',rest:60,muscles:'Biceps'} ],
    ],
    intermediate: [
      // Day 0: Push — Heavy bench, then chest/shoulder/tricep accessories
      [ {name:'Bench Press',sets:4,reps:'6-8',rest:90,muscles:'Chest, Triceps, Shoulders'},{name:'Incline DB Press',sets:3,reps:'8-10',rest:120,muscles:'Upper Chest'},{name:'Shoulder Press',sets:3,reps:'8-10',rest:120,muscles:'Shoulders, Triceps'},{name:'Lateral Raises',sets:4,reps:'12-15',rest:60,muscles:'Side Delts'},{name:'Cable Crossover',sets:3,reps:'12-15',rest:60,muscles:'Chest'},{name:'Skull Crushers',sets:3,reps:'10-12',rest:60,muscles:'Triceps'} ],
      // Day 1: Pull — Heavy row first, pull-ups second, then isolation
      [ {name:'Barbell Row',sets:4,reps:'6-8',rest:90,muscles:'Back, Biceps'},{name:'Pull-Ups',sets:4,reps:'6-8',rest:120,muscles:'Lats, Biceps'},{name:'Cable Row',sets:3,reps:'10-12',rest:90,muscles:'Mid Back'},{name:'Face Pulls',sets:3,reps:'15-20',rest:60,muscles:'Rear Delts'},{name:'Barbell Curl',sets:3,reps:'10-12',rest:60,muscles:'Biceps'},{name:'Hammer Curls',sets:3,reps:'10-12',rest:60,muscles:'Biceps, Forearms'} ],
      // Day 2: Legs — Heavy squat, then posterior chain + accessories
      [ {name:'Back Squat',sets:4,reps:'5-8',rest:90,muscles:'Quads, Glutes'},{name:'Romanian Deadlift',sets:3,reps:'8-10',rest:120,muscles:'Hamstrings, Glutes'},{name:'Leg Press',sets:3,reps:'10-12',rest:120,muscles:'Quads'},{name:'Leg Curl',sets:3,reps:'12-15',rest:60,muscles:'Hamstrings'},{name:'Walking Lunges',sets:3,reps:'10 each',rest:60,muscles:'Quads, Glutes'},{name:'Calf Raises',sets:4,reps:'15-20',rest:45,muscles:'Calves'} ],
      // Day 3: Upper — Bench + Pull-ups, then shoulders and arms
      [ {name:'Bench Press',sets:4,reps:'6-8',rest:90,muscles:'Chest, Triceps'},{name:'Pull-Ups',sets:4,reps:'6-8',rest:120,muscles:'Lats, Biceps'},{name:'Arnold Press',sets:3,reps:'10-12',rest:90,muscles:'Shoulders'},{name:'Cable Row',sets:3,reps:'10-12',rest:90,muscles:'Mid Back'},{name:'Dumbbell Flyes',sets:3,reps:'12-15',rest:60,muscles:'Chest'},{name:'Tricep Pushdown',sets:3,reps:'12-15',rest:60,muscles:'Triceps'} ],
      // Day 4: Lower — Heavy deadlift, then quad/ham accessories
      [ {name:'Deadlift',sets:4,reps:'4-6',rest:120,muscles:'Full Posterior Chain'},{name:'Leg Press',sets:3,reps:'10-12',rest:120,muscles:'Quads'},{name:'Leg Curl',sets:3,reps:'12-15',rest:60,muscles:'Hamstrings'},{name:'Leg Extension',sets:3,reps:'12-15',rest:60,muscles:'Quads'},{name:'Hip Thrusts',sets:3,reps:'10-12',rest:90,muscles:'Glutes'},{name:'Calf Raises',sets:4,reps:'15-20',rest:45,muscles:'Calves'} ],
      // Day 5: Full Body — big compounds across all body parts
      [ {name:'Back Squat',sets:3,reps:'8-10',rest:120,muscles:'Quads, Glutes'},{name:'Bench Press',sets:3,reps:'8-10',rest:120,muscles:'Chest, Triceps'},{name:'Barbell Row',sets:3,reps:'8-10',rest:120,muscles:'Back, Biceps'},{name:'Shoulder Press',sets:3,reps:'8-10',rest:120,muscles:'Shoulders'},{name:'Barbell Curl',sets:3,reps:'10-12',rest:60,muscles:'Biceps'},{name:'Tricep Pushdown',sets:3,reps:'12-15',rest:60,muscles:'Triceps'} ],
    ],
    advanced: [
      // Day 0: Push — Heavy bench 5x, strength accessories
      [ {name:'Bench Press',sets:5,reps:'4-6',rest:90,muscles:'Chest, Triceps, Shoulders'},{name:'Incline DB Press',sets:4,reps:'6-8',rest:120,muscles:'Upper Chest'},{name:'Shoulder Press',sets:4,reps:'6-8',rest:120,muscles:'Shoulders, Triceps'},{name:'Lateral Raises',sets:4,reps:'12-15',rest:60,muscles:'Side Delts'},{name:'Cable Crossover',sets:3,reps:'12-15',rest:60,muscles:'Chest'},{name:'Skull Crushers',sets:4,reps:'8-10',rest:60,muscles:'Triceps'} ],
      // Day 1: Pull — Heavy deadlift, then rows, then vertical pull + biceps
      [ {name:'Deadlift',sets:5,reps:'3-5',rest:120,muscles:'Full Posterior Chain'},{name:'Barbell Row',sets:4,reps:'6-8',rest:90,muscles:'Back, Biceps'},{name:'Lat Pulldown',sets:3,reps:'10-12',rest:90,muscles:'Lats, Biceps'},{name:'Face Pulls',sets:3,reps:'15-20',rest:60,muscles:'Rear Delts'},{name:'Barbell Curl',sets:4,reps:'8-10',rest:60,muscles:'Biceps'},{name:'Hammer Curls',sets:3,reps:'10-12',rest:60,muscles:'Biceps, Forearms'} ],
      // Day 2: Legs — Heavy squat, then posterior chain + unilateral
      [ {name:'Back Squat',sets:5,reps:'4-6',rest:90,muscles:'Quads, Glutes'},{name:'Romanian Deadlift',sets:4,reps:'6-8',rest:120,muscles:'Hamstrings, Glutes'},{name:'Leg Press',sets:4,reps:'8-10',rest:120,muscles:'Quads'},{name:'Walking Lunges',sets:3,reps:'10 each',rest:60,muscles:'Quads, Glutes'},{name:'Leg Curl',sets:4,reps:'10-12',rest:60,muscles:'Hamstrings'},{name:'Calf Raises',sets:5,reps:'12-15',rest:45,muscles:'Calves'} ],
      // Day 3: Upper — Bench + Pull-ups heavy, then accessories
      [ {name:'Bench Press',sets:4,reps:'5-7',rest:90,muscles:'Chest, Triceps'},{name:'Pull-Ups',sets:4,reps:'6-8',rest:120,muscles:'Lats, Biceps'},{name:'Arnold Press',sets:4,reps:'8-10',rest:120,muscles:'Shoulders'},{name:'Cable Row',sets:3,reps:'10-12',rest:90,muscles:'Mid Back'},{name:'Incline DB Press',sets:3,reps:'8-10',rest:90,muscles:'Upper Chest'},{name:'Close Grip Bench',sets:3,reps:'8-10',rest:90,muscles:'Triceps'} ],
      // Day 4: Lower — Heavy deadlift, then squat + accessories
      [ {name:'Conventional Deadlift',sets:5,reps:'3-5',rest:120,muscles:'Full Posterior Chain'},{name:'Leg Press',sets:4,reps:'8-10',rest:120,muscles:'Quads'},{name:'Walking Lunges',sets:3,reps:'10 each',rest:90,muscles:'Quads, Glutes'},{name:'Leg Curl',sets:4,reps:'10-12',rest:60,muscles:'Hamstrings'},{name:'Hip Thrusts',sets:3,reps:'10-12',rest:90,muscles:'Glutes'},{name:'Hyperextensions',sets:3,reps:'12-15',rest:60,muscles:'Lower Back'} ],
      // Day 5: Full Body — strength focus, one compound per movement pattern
      [ {name:'Back Squat',sets:4,reps:'6-8',rest:90,muscles:'Quads, Glutes'},{name:'Bench Press',sets:4,reps:'5-7',rest:90,muscles:'Chest, Triceps'},{name:'Barbell Row',sets:4,reps:'5-7',rest:90,muscles:'Back, Biceps'},{name:'Shoulder Press',sets:3,reps:'8-10',rest:120,muscles:'Shoulders'},{name:'Barbell Curl',sets:3,reps:'10-12',rest:60,muscles:'Biceps'},{name:'Skull Crushers',sets:3,reps:'10-12',rest:60,muscles:'Triceps'} ],
    ],
  };
  const t = templates[tier] || templates.intermediate;
  return t[dayIdx % t.length];
}

async function _generateAIWorkout() {
  const tier = (USER && USER.tier) || 'beginner';
  let goal = 'general fitness';
  if (USER && USER.goal && USER.weight) {
    goal = USER.goal < USER.weight ? 'lose weight and get lean' : 'build muscle and gain strength';
  }
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const day = dayNames[_unplannedDayIdx];

  // Get recent workout history to avoid repeating muscle groups
  const workoutDates = getWorkoutDates();
  const recentMuscles = [];
  const exLogs = lsGet('fs_exerciseLogs') || {};
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const check = new Date(now);
    check.setDate(now.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth()+1).padStart(2,'0') + '-' + String(check.getDate()).padStart(2,'0');
    if (workoutDates.has(key)) {
      // Check what muscles were hit by looking at exercise logs
      for (const [exName, logs] of Object.entries(exLogs)) {
        if (logs.some(l => l.date === key)) {
          const dbEntry = EXERCISE_DB[exName];
          if (dbEntry) recentMuscles.push(dbEntry.muscles);
        }
      }
    }
  }

  let usedAI = false;
  try {
    const recentNote = recentMuscles.length > 0
      ? `\nThey recently trained: ${recentMuscles.join(', ')}. Avoid overlapping those muscle groups.`
      : '';
    const text = await callClaude([{
      role: 'user',
      content: `Generate a ${day} gym workout for a ${tier} level person whose goal is to ${goal}.${recentNote}

Return ONLY a valid JSON array of 4-6 exercises. Each object must have exactly these fields:
- "name": string (exercise name)
- "sets": number
- "reps": string (like "8-10" or "30s")
- "rest": number (seconds)
- "muscles": string (target muscles)

No markdown fences, no explanation, no commentary — just the raw JSON array.`
    }], { max_tokens: 800 });
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = _parseExerciseJSON(text);
    if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0].name) {
      _aiGeneratedExercises = parsed;
      usedAI = true;
    }
  } catch(e) {
    console.log('AI workout generation failed:', e.message);
  }

  if (!usedAI) {
    _aiGeneratedExercises = _getPreset(tier);
  }

  // Update the preview if modal is still open
  if (document.getElementById('unplanned-modal').style.display !== 'none') {
    const label = usedAI ? 'AI-GENERATED' : 'SUGGESTED';
    _showAIPreview(_aiGeneratedExercises, tier, goal, label);
  }
}

function _showAIPreview(exercises, tier, goal, badge) {
  document.getElementById('ai-workout-loading').style.display = 'none';
  document.getElementById('ai-preview-label').textContent =
    `${badge || 'AI-GENERATED'} · ${(tier || 'BEGINNER').toUpperCase()} · ${(goal || 'BUILD MUSCLE').toUpperCase()} · ${exercises.length} EXERCISES`;
  _renderAIPreviewList();
  document.getElementById('ai-workout-preview').style.display = 'block';
}

function _renderAIPreviewList() {
  const exercises = _aiGeneratedExercises;
  document.getElementById('ai-preview-list').innerHTML = exercises.map((ex, i) =>
    `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1px;color:var(--white)">${ex.name}</div>
          <div style="font-size:0.75rem;color:var(--dim);margin-top:2px">${ex.muscles}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ex.sets} × ${ex.reps}</div>
          <div style="font-size:0.7rem;color:var(--dim)">REST ${ex.rest}s</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
        <button onclick="_aiSwapExercise(${i})" style="flex:1;padding:7px 0;background:none;border:1px solid var(--border2);border-radius:8px;color:var(--off);font-size:0.72rem;font-family:'Inter',sans-serif;cursor:pointer">↻ Swap</button>
        <button onclick="_aiEditSetsReps(${i})" style="flex:1;padding:7px 0;background:none;border:1px solid var(--border2);border-radius:8px;color:var(--off);font-size:0.72rem;font-family:'Inter',sans-serif;cursor:pointer">✎ Edit</button>
        <button onclick="_aiRemoveExercise(${i})" style="padding:7px 12px;background:none;border:1px solid rgba(244,63,94,0.25);border-radius:8px;color:var(--red);font-size:0.72rem;font-family:'Inter',sans-serif;cursor:pointer">✕</button>
      </div>
    </div>`
  ).join('') +
  `<button onclick="_aiAddExercise()" style="width:100%;padding:14px;background:var(--card);border:1px dashed var(--border2);border-radius:12px;color:var(--dim);font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:1.5px;cursor:pointer;margin-top:4px">+ ADD EXERCISE</button>`;
  // Update the exercise count in the label
  const label = document.getElementById('ai-preview-label');
  if (label) {
    label.textContent = label.textContent.replace(/\d+ EXERCISES/, exercises.length + ' EXERCISES');
  }
}

function _aiRemoveExercise(idx) {
  if (_aiGeneratedExercises.length <= 1) return; // keep at least 1
  _aiGeneratedExercises.splice(idx, 1);
  _renderAIPreviewList();
}

function _aiEditSetsReps(idx) {
  const ex = _aiGeneratedExercises[idx];
  const card = document.getElementById('ai-preview-list').children[idx];
  if (!card) return;
  // Replace the edit row with inline inputs
  const editRow = card.querySelector('div:last-child');
  editRow.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;width:100%">
      <div style="flex:1;text-align:center">
        <div style="font-size:0.58rem;color:var(--dim);letter-spacing:1px;margin-bottom:3px">SETS</div>
        <input type="number" id="_ai-edit-sets-${idx}" value="${ex.sets}" min="1" max="10"
          style="width:100%;padding:7px 4px;background:var(--dark);border:1px solid var(--border2);border-radius:7px;color:var(--white);text-align:center;font-family:'DM Mono',monospace;font-size:0.9rem;outline:none">
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:0.58rem;color:var(--dim);letter-spacing:1px;margin-bottom:3px">REPS</div>
        <input type="text" id="_ai-edit-reps-${idx}" value="${ex.reps}"
          style="width:100%;padding:7px 4px;background:var(--dark);border:1px solid var(--border2);border-radius:7px;color:var(--white);text-align:center;font-family:'DM Mono',monospace;font-size:0.9rem;outline:none">
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:0.58rem;color:var(--dim);letter-spacing:1px;margin-bottom:3px">REST</div>
        <input type="number" id="_ai-edit-rest-${idx}" value="${ex.rest}" min="0" step="15"
          style="width:100%;padding:7px 4px;background:var(--dark);border:1px solid var(--border2);border-radius:7px;color:var(--white);text-align:center;font-family:'DM Mono',monospace;font-size:0.9rem;outline:none">
      </div>
      <button onclick="_aiSaveEdit(${idx})" style="padding:7px 14px;background:var(--gold);border:none;border-radius:7px;color:var(--black);font-size:0.75rem;font-family:'Bebas Neue',sans-serif;letter-spacing:1px;cursor:pointer;align-self:flex-end">SAVE</button>
    </div>`;
}

function _aiSaveEdit(idx) {
  const s = document.getElementById('_ai-edit-sets-' + idx);
  const r = document.getElementById('_ai-edit-reps-' + idx);
  const t = document.getElementById('_ai-edit-rest-' + idx);
  if (s) _aiGeneratedExercises[idx].sets = parseInt(s.value) || _aiGeneratedExercises[idx].sets;
  if (r && r.value.trim()) _aiGeneratedExercises[idx].reps = r.value.trim();
  if (t) _aiGeneratedExercises[idx].rest = parseInt(t.value) || _aiGeneratedExercises[idx].rest;
  _renderAIPreviewList();
}

// Swap picker: shows a mini exercise list to pick a replacement
function _aiSwapExercise(idx) {
  const ex = _aiGeneratedExercises[idx];
  // Find exercises in the same category or targeting similar muscles
  const targetMuscle = (ex.muscles || '').split(',')[0].trim().toLowerCase();
  const usedNames = new Set(_aiGeneratedExercises.map(e => e.name));
  const candidates = Object.entries(EXERCISE_DB)
    .filter(([name, db]) => !usedNames.has(name))
    .sort((a, b) => {
      // Prioritize same muscle group
      const aMatch = a[1].muscles.toLowerCase().includes(targetMuscle) ? 0 : 1;
      const bMatch = b[1].muscles.toLowerCase().includes(targetMuscle) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a[0].localeCompare(b[0]);
    });

  const card = document.getElementById('ai-preview-list').children[idx];
  if (!card) return;
  const editRow = card.querySelector('div:last-child');
  editRow.innerHTML = `
    <div style="width:100%">
      <input type="text" placeholder="Search exercises..." oninput="_aiFilterSwap(${idx},this.value)"
        style="width:100%;box-sizing:border-box;padding:8px 12px;background:var(--dark);border:1px solid var(--border2);border-radius:8px;color:var(--white);font-size:0.82rem;outline:none;margin-bottom:6px">
      <div id="_ai-swap-list-${idx}" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
        ${candidates.slice(0, 15).map(([name, db]) =>
          `<div onclick="_aiDoSwap(${idx},'${name.replace(/'/g, "\\'")}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:8px;cursor:pointer">
            <div><div style="font-size:0.82rem;color:var(--white)">${name}</div><div style="font-size:0.68rem;color:var(--dim)">${db.muscles}</div></div>
            <div style="font-size:0.68rem;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${db.sets}×${db.reps}</div>
          </div>`
        ).join('')}
      </div>
      <button onclick="_renderAIPreviewList()" style="width:100%;padding:7px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--dim);font-size:0.72rem;cursor:pointer;margin-top:6px">Cancel</button>
    </div>`;
}

function _aiFilterSwap(idx, query) {
  const q = query.toLowerCase();
  const usedNames = new Set(_aiGeneratedExercises.map(e => e.name));
  const results = Object.entries(EXERCISE_DB)
    .filter(([name]) => !usedNames.has(name) && name.toLowerCase().includes(q))
    .slice(0, 15);
  const list = document.getElementById('_ai-swap-list-' + idx);
  if (!list) return;
  list.innerHTML = results.map(([name, db]) =>
    `<div onclick="_aiDoSwap(${idx},'${name.replace(/'/g, "\\'")}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:8px;cursor:pointer">
      <div><div style="font-size:0.82rem;color:var(--white)">${name}</div><div style="font-size:0.68rem;color:var(--dim)">${db.muscles}</div></div>
      <div style="font-size:0.68rem;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${db.sets}×${db.reps}</div>
    </div>`
  ).join('') || '<div style="padding:12px;color:var(--dim);font-size:0.78rem;text-align:center">No matches</div>';
}

function _aiDoSwap(idx, name) {
  const db = EXERCISE_DB[name];
  if (!db) return;
  _aiGeneratedExercises[idx] = {
    name: name,
    sets: db.sets,
    reps: db.reps,
    rest: db.rest,
    muscles: db.muscles
  };
  _renderAIPreviewList();
}

// Add exercise picker
function _aiAddExercise() {
  const usedNames = new Set(_aiGeneratedExercises.map(e => e.name));
  const candidates = Object.entries(EXERCISE_DB)
    .filter(([name]) => !usedNames.has(name))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const listEl = document.getElementById('ai-preview-list');
  // Replace the add button at the bottom with a picker
  const addBtn = listEl.querySelector('button:last-child');
  if (addBtn) {
    addBtn.outerHTML = `
    <div id="_ai-add-panel" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-top:4px">
      <input type="text" placeholder="Search exercises to add..." oninput="_aiFilterAdd(this.value)"
        style="width:100%;box-sizing:border-box;padding:8px 12px;background:var(--dark);border:1px solid var(--border2);border-radius:8px;color:var(--white);font-size:0.82rem;outline:none;margin-bottom:8px">
      <div id="_ai-add-list" style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
        ${candidates.slice(0, 20).map(([name, db]) =>
          `<div onclick="_aiDoAdd('${name.replace(/'/g, "\\'")}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:8px;cursor:pointer">
            <div><div style="font-size:0.82rem;color:var(--white)">${name}</div><div style="font-size:0.68rem;color:var(--dim)">${db.muscles}</div></div>
            <div style="background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:1rem;font-weight:700">+</div>
          </div>`
        ).join('')}
      </div>
      <button onclick="_renderAIPreviewList()" style="width:100%;padding:7px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--dim);font-size:0.72rem;cursor:pointer;margin-top:8px">Cancel</button>
    </div>`;
  }
}

function _aiFilterAdd(query) {
  const q = query.toLowerCase();
  const usedNames = new Set(_aiGeneratedExercises.map(e => e.name));
  const results = Object.entries(EXERCISE_DB)
    .filter(([name]) => !usedNames.has(name) && name.toLowerCase().includes(q))
    .slice(0, 20);
  const list = document.getElementById('_ai-add-list');
  if (!list) return;
  list.innerHTML = results.map(([name, db]) =>
    `<div onclick="_aiDoAdd('${name.replace(/'/g, "\\'")}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:8px;cursor:pointer">
      <div><div style="font-size:0.82rem;color:var(--white)">${name}</div><div style="font-size:0.68rem;color:var(--dim)">${db.muscles}</div></div>
      <div style="background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:1rem;font-weight:700">+</div>
    </div>`
  ).join('') || '<div style="padding:12px;color:var(--dim);font-size:0.78rem;text-align:center">No matches</div>';
}

function _aiDoAdd(name) {
  const db = EXERCISE_DB[name];
  if (!db) return;
  _aiGeneratedExercises.push({
    name: name,
    sets: db.sets,
    reps: db.reps,
    rest: db.rest,
    muscles: db.muscles
  });
  _renderAIPreviewList();
}

function launchAIWorkout() {
  closeUnplannedModal();
  _launchUnplannedEnv(_aiGeneratedExercises);
}

function showCustomBuilder() {
  document.getElementById('unplanned-options').style.display = 'none';
  document.getElementById('custom-builder').style.display = 'block';
  document.getElementById('unplanned-modal-title').textContent = 'CUSTOM WORKOUT';
  document.getElementById('unplanned-modal-day').textContent = 'Select exercises and configure your workout';
  // Force fullscreen via CSS class (works reliably on iOS Safari)
  document.getElementById('unplanned-modal').classList.add('fullscreen-builder');
  _customBuilderSelected = [];
  _customCatFilter = 'All';
  if (document.getElementById('custom-ex-search')) document.getElementById('custom-ex-search').value = '';
  renderCustomExList();
  renderCustomSelected();
  const cats = EXERCISE_CATEGORIES;
  document.getElementById('custom-cat-filters').innerHTML =
    ['All', ...cats].map(c =>
      `<button onclick="filterCustomExCat('${c}',this)" class="custom-cat-btn" style="padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:${c==='All'?'var(--gold)':'var(--card)'};color:${c==='All'?'var(--black)':'var(--off)'};font-size:0.72rem;cursor:pointer">${c}</button>`
    ).join('');
}

let _customCatFilter = 'All';
function filterCustomExCat(cat, btn) {
  _customCatFilter = cat;
  document.querySelectorAll('.custom-cat-btn').forEach(b => {
    b.style.background = 'var(--card)'; b.style.color = 'var(--off)';
  });
  btn.style.background = 'var(--gold)'; btn.style.color = 'var(--black)';
  renderCustomExList();
}

function filterCustomExList() {
  renderCustomExList();
}

function renderCustomExList() {
  const search = (document.getElementById('custom-ex-search')?.value || '').toLowerCase();
  const entries = Object.entries(EXERCISE_DB).filter(([name, ex]) => {
    const matchCat = _customCatFilter === 'All' || ex.category === _customCatFilter;
    const matchSearch = !search || name.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
  const list = document.getElementById('custom-ex-list');
  if (!list) return;
  list.innerHTML = entries.map(([name, ex]) => {
    const selected = _customBuilderSelected.find(e => e.name === name);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${selected?'var(--gold-dim)':'var(--card)'};border:1px solid ${selected?'rgba(212,165,32,0.3)':'var(--border)'};border-radius:10px;cursor:pointer" onclick="toggleCustomEx('${name}')">
      <div>
        <div style="font-size:0.88rem;font-weight:600;color:var(--white)">${name}</div>
        <div style="font-size:0.72rem;color:var(--dim)">${ex.muscles} · ${ex.sets}×${ex.reps}</div>
      </div>
      <div style="font-size:1.2rem;color:${selected?'var(--gold)':'var(--dim)'}">
        ${selected ? '✓' : '+'}
      </div>
    </div>`;
  }).join('');
}

function toggleCustomEx(name) {
  const db = EXERCISE_DB[name];
  const idx = _customBuilderSelected.findIndex(e => e.name === name);
  if (idx >= 0) {
    _customBuilderSelected.splice(idx, 1);
  } else {
    // Start blank so user fills in their own values
    _customBuilderSelected.push({ name, sets: '', reps: '', rest: '', muscles: db.muscles });
  }
  renderCustomExList();
  renderCustomSelected();
}

function updateCustomEx(name, field, value) {
  const ex = _customBuilderSelected.find(e => e.name === name);
  if (ex) {
    ex[field] = field === 'sets' || field === 'rest' ? parseInt(value) || ex[field] : value;
  }
}

function renderCustomSelected() {
  const wrap = document.getElementById('custom-selected');
  const list = document.getElementById('custom-selected-list');
  if (!list) return;
  if (!_customBuilderSelected.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = _customBuilderSelected.map((ex, i) =>
    `<div style="background:var(--dark);border:1px solid var(--border2);border-radius:12px;padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;color:var(--white);letter-spacing:0.5px">${ex.name}</div>
        <button onclick="toggleCustomEx('${ex.name}')" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:1rem;padding:0 4px">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div>
          <div style="font-size:0.62rem;color:var(--dim);font-weight:600;letter-spacing:1px;margin-bottom:4px">SETS</div>
          <input type="number" placeholder="3" value="${ex.sets}" min="1" max="10"
            oninput="updateCustomEx('${ex.name}','sets',this.value)"
            style="width:100%;box-sizing:border-box;padding:10px 6px;background:var(--card);border:1px solid var(--border2);border-radius:8px;color:var(--white);font-size:1rem;text-align:center;outline:none">
        </div>
        <div>
          <div style="font-size:0.62rem;color:var(--dim);font-weight:600;letter-spacing:1px;margin-bottom:4px">REPS</div>
          <input type="text" placeholder="8-10" value="${ex.reps}"
            oninput="updateCustomEx('${ex.name}','reps',this.value)"
            style="width:100%;box-sizing:border-box;padding:10px 6px;background:var(--card);border:1px solid var(--border2);border-radius:8px;color:var(--white);font-size:1rem;text-align:center;outline:none">
        </div>
        <div>
          <div style="font-size:0.62rem;color:var(--dim);font-weight:600;letter-spacing:1px;margin-bottom:4px">REST (s)</div>
          <input type="number" placeholder="90" value="${ex.rest}" min="15" max="600" step="15"
            oninput="updateCustomEx('${ex.name}','rest',this.value)"
            style="width:100%;box-sizing:border-box;padding:10px 6px;background:var(--card);border:1px solid var(--border2);border-radius:8px;color:var(--white);font-size:1rem;text-align:center;outline:none">
        </div>
      </div>
    </div>`
  ).join('');
}

function launchCustomWorkout() {
  if (!_customBuilderSelected.length) return;
  // Fill in sensible defaults for any blank fields
  const exercises = _customBuilderSelected.map(ex => ({
    ...ex,
    sets: parseInt(ex.sets) || 3,
    reps: ex.reps || '8-10',
    rest: parseInt(ex.rest) || 90,
  }));
  closeUnplannedModal();
  _launchUnplannedEnv(exercises);
}

function _launchUnplannedEnv(exercises) {
  woDay = _unplannedDayIdx;
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  woWorkout = { dayName: dayNames[woDay] + ' — Workout', exercises: exercises };
  woCurrentEx = 0;
  woPRs = [];
  // Always start fresh for custom workouts — never load stale draft
  // exercises already have correct sets/reps from user config
  woSets = {};
  woExtraSets = {};
  exercises.forEach(function(ex, i) {
    if (ex.sets) woExtraSets[i] = ex.sets;
  });
  document.getElementById('screen-dash').style.display = 'none';
  // Hide mobile tab bar during workout
  const tabBar = document.getElementById('mobile-tab-bar');
  if (tabBar) tabBar.style.display = 'none';
  const woEl = document.getElementById('screen-workout');
  woEl.classList.add('active');
  woEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  const dayTitleEl = document.getElementById('wo-day-title');
  if (dayTitleEl) dayTitleEl.textContent = woWorkout.dayName;
  document.getElementById('wo-day-subtitle').textContent = '';
  _warmupDismissed = false;
  _renderWarmupBanner(woWorkout.dayName);
  renderEcList();
  loadExercise(0);
  restoreRestTimerIfActive();
}

function openQuickFoodModal() {
  // Opens food modal targeting 'other' category on today
  nutDay = TODAY_IDX;
  openFoodModal('other');
}

function renderTodayMiniLog() {
  const entries = getAllEntries(TODAY_IDX);
  const el = document.getElementById('today-mini-log');
  if (!el) return;
  if (!entries.length) {
    el.innerHTML = '<div style="padding:12px 18px;font-size:0.84rem;color:var(--dim)">No food logged today yet.</div>';
    return;
  }
  const last5 = entries.slice(-5).reverse();
  el.innerHTML = last5.map(e =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div style="font-size:0.84rem;color:var(--off)">${e.name}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:0.9rem" class="gm">${e.cal} cal</div>
    </div>`
  ).join('') + (entries.length > 5 ? `<div style="padding:8px 18px;font-size:0.75rem;color:var(--dim);text-align:center">+${entries.length-5} more · <a onclick="dashNav('nutrition',document.querySelector('.sb-btn:nth-child(4)'))" style="background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;cursor:pointer">View all in Nutrition</a></div>` : '');
}

function renderEcList() {
  const exes = woWorkout.exercises;
  const list = document.getElementById('wo-ex-list');
  if (!list) return;
  list.innerHTML = exes.map((ex,i) => {
    const isDone = woSets[i] && woSets[i].some(s => s.done);
    const ssLabel = ex._supersetWith ? '<div style="font-size:0.55rem;color:var(--orange);font-family:\'DM Mono\',monospace;letter-spacing:0.5px">SS</div>' : '';
    return `<div class="wo-ex-sidebar-item ${i===woCurrentEx?'active':''}" onclick="loadExercise(${i})">
      <div class="wo-ex-sidebar-num">${i+1}${ssLabel}</div>
      <div class="wo-ex-sidebar-info">
        <div class="wo-ex-sidebar-name">${ex.name}</div>
        <div class="wo-ex-sidebar-sets">${ex.sets}×${ex.reps}</div>
      </div>
      ${isDone ? '<div class="wo-ex-sidebar-done">✓</div>' : ''}
      <button class="wo-ex-del" onclick="event.stopPropagation();removeExerciseFromWorkout(${i})" title="Remove">✕</button>
    </div>`;
  }).join('');
}


function removeExercise(e, idx) {
  e.stopPropagation();
  if (woWorkout.exercises.length <= 1) { showToast('Need at least one exercise.', 'warning'); return; }
  woWorkout.exercises.splice(idx, 1);
  // Save custom workout to localStorage
  saveCustomWorkout();
  if (woCurrentEx >= woWorkout.exercises.length) woCurrentEx = woWorkout.exercises.length - 1;
  renderEcList();
  renderEcList();
  loadExercise(woCurrentEx);
}

function saveCustomWorkout() {
  const key = `fs_custom_workout_${woDay}`;
  lsSet(key, woWorkout.exercises);
}

function loadCustomWorkout(dayIdx) {
  const key = `fs_custom_workout_${dayIdx}`;
  return lsGet(key);
}

// ── ADD EXERCISE MODAL ──
let aesCurrentCat = 'All';

function removeExerciseFromWorkout(idx) {
  if (woWorkout.exercises.length <= 1) return;
  woWorkout.exercises.splice(idx, 1);
  saveCustomWorkout(woDay, woWorkout.exercises);
  if (woCurrentEx >= woWorkout.exercises.length) woCurrentEx = woWorkout.exercises.length - 1;
  renderEcList();
  loadExercise(woCurrentEx);
}

function openAddExModal() {
  const modal = document.getElementById('add-ex-modal');
  modal.classList.add('open');
  // Build category pills
  const catsEl = document.getElementById('aes-cats');
  catsEl.innerHTML = ['All',...EXERCISE_CATEGORIES].map(c =>
    `<div class="aes-cat ${c==='All'?'active':''}" data-cat="${c}" onclick="selectExCat(this)">${c}</div>`
  ).join('');
  aesCurrentCat = 'All';
  document.getElementById('aes-search-input').value = '';
  renderExModalList();
}

function closeAddExModal() {
  document.getElementById('add-ex-modal').classList.remove('open');
}

function selectExCat(btn) {
  document.querySelectorAll('.aes-cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  aesCurrentCat = btn.dataset.cat;
  renderExModalList();
}

function filterExModal() { renderExModalList(); }

function renderExModalList() {
  const search = document.getElementById('aes-search-input').value.toLowerCase();
  const currentNames = woWorkout.exercises.map(e => e.name);
  const list = document.getElementById('aes-list');
  const filtered = Object.entries(EXERCISE_DB).filter(([name, data]) => {
    const catMatch = aesCurrentCat === 'All' || data.category === aesCurrentCat;
    const searchMatch = !search || _fuzzySearchMatch(search, name, data.muscles);
    return catMatch && searchMatch;
  });
  list.innerHTML = filtered.map(([name, data]) => {
    const isAdded = currentNames.includes(name);
    return `<div class="aes-item ${isAdded?'added':''}" onclick="addExerciseToWorkout('${name.replace(/'/g,"\'")}')">
      <div><div class="aes-item-name">${name}</div><div class="aes-item-cat">${data.muscles}</div></div>
      <div class="aes-item-cat">${data.sets}×${data.reps}</div>
      <button class="aes-item-add ${isAdded?'done':''}">${isAdded?'✓':'+'}</button>
    </div>`;
  }).join('');
  if (!filtered.length) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--dim);font-size:0.83rem">No exercises found</div>';
}

function addExerciseToWorkout(name) {
  const db = getExerciseData(name);
  const already = woWorkout.exercises.find(e => e.name === name);
  if (already) { closeAddExModal(); return; }
  woWorkout.exercises.push({
    name, sets: db.sets, reps: db.reps, rest: db.rest, muscles: db.muscles
  });
  saveCustomWorkout();
  renderExModalList();
  renderEcList();
  renderWoExList();
  // Auto-navigate to the new exercise
  loadExercise(woWorkout.exercises.length - 1);
  closeAddExModal();
}

function nextExercise() {
  const exes = woWorkout.exercises;
  if (woCurrentEx < exes.length-1) {
    loadExercise(woCurrentEx+1);
  } else {
    finishWorkout();
  }
}

function prevExercise() {
  console.log('prevExercise called, woCurrentEx=', woCurrentEx);
  if (woCurrentEx > 0) {
    woCurrentEx--;
    loadExercise(woCurrentEx);
  }
}

// ── REST TIMER (timestamp-based for background accuracy) ──
let restTotalSecs = 90;
let restTimerEndAt = 0;

function buildRestSelect() { /* no-op — rest time set by restTotalSecs = ex.rest */ }

function updateRestDisplay() {
  const lbl = document.getElementById('rest-timer-label');
  const secs = document.getElementById('rest-timer-secs-display');
  if (lbl) lbl.textContent = 'START REST TIMER';
  if (secs) secs.textContent = restTotalSecs + 's';
}

function adjustRest(delta) {
  if (restTimerInterval) return;
  restTotalSecs = Math.max(15, Math.min(600, restTotalSecs + delta));
  updateRestDisplay();
}

function toggleRestTimer() {
  if (restTimerInterval) {
    skipRest();
  } else {
    startRestTimerSecs(restTotalSecs);
  }
}

function startRestTimer() {
  startRestTimerSecs(restTotalSecs);
}

// Pre-create Audio element for rest timer chime
// Dual approach: Web Audio API (primary, most reliable on iOS) + HTML5 Audio (fallback)
let _chimeAudio = null;
let _webAudioCtx = null;
let _webAudioUnlocked = false;
let _htmlAudioUnlocked = false;

function _initChimeAudio() {
  // HTML5 Audio fallback — generate a 0.3s 880Hz sine wave WAV
  if (!_chimeAudio) {
    try {
      const sr = 22050, dur = 0.3, freq = 880;
      const samples = Math.floor(sr * dur);
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      writeStr(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); writeStr(8, 'WAVE');
      writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, 1, true); view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      writeStr(36, 'data'); view.setUint32(40, samples * 2, true);
      for (let i = 0; i < samples; i++) {
        const t = i / sr;
        const envelope = Math.max(0, 1 - t / dur);
        const val = Math.sin(2 * Math.PI * freq * t) * envelope * 0.8;
        view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, val * 32767)), true);
      }
      const blob = new Blob([buffer], { type: 'audio/wav' });
      _chimeAudio = new Audio(URL.createObjectURL(blob));
      _chimeAudio.volume = 0.8;
      _chimeAudio.load();
    } catch (e) { console.log('HTML5 chime init failed:', e); }
  }

  // Web Audio API — create AudioContext (survives background on iOS better)
  if (!_webAudioCtx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _webAudioCtx = new AC();
    } catch (e) { console.log('WebAudio init failed:', e); }
  }
}

// Unlock BOTH audio systems on user gesture — iOS requires this
function _unlockChimeAudio() {
  _initChimeAudio();

  // Unlock Web Audio API — resume suspended context + play silent buffer
  if (_webAudioCtx && !_webAudioUnlocked) {
    try {
      if (_webAudioCtx.state === 'suspended') {
        _webAudioCtx.resume().then(function() { _webAudioUnlocked = true; }).catch(function() {});
      } else {
        _webAudioUnlocked = true;
      }
      // Play a silent buffer to fully activate on iOS
      var silentBuf = _webAudioCtx.createBuffer(1, 1, 22050);
      var src = _webAudioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(_webAudioCtx.destination);
      src.start(0);
    } catch (e) {}
  }

  // Unlock HTML5 Audio — play at zero volume
  if (_chimeAudio && !_htmlAudioUnlocked) {
    var origVol = _chimeAudio.volume;
    _chimeAudio.volume = 0;
    _chimeAudio.play().then(function() {
      _chimeAudio.pause();
      _chimeAudio.currentTime = 0;
      _chimeAudio.volume = origVol;
      _htmlAudioUnlocked = true;
    }).catch(function() { _chimeAudio.volume = origVol; });
  }
}

// Re-unlock on EVERY user gesture inside the workout env (not just once)
// iOS can re-suspend AudioContext after a period of inactivity
function _keepAudioAlive() {
  if (_webAudioCtx && _webAudioCtx.state === 'suspended') {
    _webAudioCtx.resume().catch(function() {});
  }
}
document.addEventListener('touchstart', _unlockChimeAudio, { once: true });
document.addEventListener('click', _unlockChimeAudio, { once: true });
// Keep-alive: re-unlock on interactions within the workout screen
document.addEventListener('touchstart', _keepAudioAlive, { passive: true });
document.addEventListener('click', _keepAudioAlive, { passive: true });

// On page load: immediately clear any stale rest timer data from previous sessions
(function() {
  try {
    const saved = JSON.parse(localStorage.getItem('fs_rest_timer'));
    if (saved && saved.endAt && saved.endAt <= Date.now()) {
      localStorage.removeItem('fs_rest_timer');
    }
  } catch(e) {}
})();

function playRestChime() {
  var played = false;

  // PRIMARY: Web Audio API — most reliable on iOS PWA
  if (_webAudioCtx && _webAudioCtx.state !== 'closed') {
    try {
      // Resume if suspended (iOS can suspend between user gestures)
      if (_webAudioCtx.state === 'suspended') {
        _webAudioCtx.resume().catch(function() {});
      }
      // Generate a pleasant two-tone chime: 880Hz + 1100Hz with decay
      var ctx = _webAudioCtx;
      var now = ctx.currentTime;

      // Tone 1: 880Hz
      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Tone 2: 1100Hz, slight delay for "ding-ding" feel
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.55);

      played = true;
    } catch (e) {
      console.log('WebAudio chime failed:', e);
    }
  }

  // FALLBACK: HTML5 Audio (if WebAudio failed or unavailable)
  if (!played && _chimeAudio) {
    try {
      _chimeAudio.currentTime = 0;
      _chimeAudio.play().catch(function() {});
    } catch (e) {}
  }

  // Haptic vibration (always attempt)
  try {
    if (navigator.vibrate) navigator.vibrate([250, 100, 250, 100, 350]);
  } catch (e) {}
}

function startRestTimerSecs(secs) {
  stopRestTimer();
  // Pre-warm BOTH audio systems — user just tapped so we have gesture context
  _initChimeAudio();
  if (_webAudioCtx && _webAudioCtx.state === 'suspended') {
    _webAudioCtx.resume().catch(function() {});
  }
  // Play a silent Web Audio buffer to keep iOS context active
  if (_webAudioCtx) {
    try {
      var silentBuf = _webAudioCtx.createBuffer(1, 1, 22050);
      var src = _webAudioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(_webAudioCtx.destination);
      src.start(0);
    } catch(e) {}
  }
  _chimePlayedForCurrentTimer = false;
  restTotalSecs = secs;
  restTimerEndAt = Date.now() + secs * 1000;
  lsSet('fs_rest_timer', { endAt: restTimerEndAt, total: secs });
  _startTimerUI(secs);
}

// Internal: start the visual countdown for an already-configured timer
function _startTimerUI(totalSecs) {
  const label = document.getElementById('rest-timer-label');
  const secsDisplay = document.getElementById('rest-timer-secs-display');
  const bar = document.getElementById('rest-timer-progress');
  if (label) label.textContent = 'TAP TO STOP';
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
  if (navigator.vibrate) navigator.vibrate(50);
  restTimerInterval = setInterval(() => {
    const remaining = Math.ceil((restTimerEndAt - Date.now()) / 1000);
    if (secsDisplay) secsDisplay.textContent = Math.max(0, remaining) + 's';
    if (bar) {
      const elapsed = totalSecs - remaining;
      const pct = Math.min(100, (elapsed / totalSecs) * 100);
      bar.style.transition = 'width 0.5s linear';
      bar.style.width = pct + '%';
    }
    // Keep Web Audio context alive on iOS — play silent buffer every ~15s
    if (remaining > 0 && remaining % 15 < 1 && _webAudioCtx) {
      try {
        if (_webAudioCtx.state === 'suspended') _webAudioCtx.resume();
        var _kb = _webAudioCtx.createBuffer(1, 1, 22050);
        var _ks = _webAudioCtx.createBufferSource();
        _ks.buffer = _kb; _ks.connect(_webAudioCtx.destination); _ks.start(0);
      } catch(e) {}
    }
    if (remaining <= 0) {
      _fireChimeOnce();
      skipRest();
      if (label) label.textContent = 'DONE! TAP TO RESTART';
    }
  }, 500);
}

// Guard: only chime once per timer cycle
let _chimePlayedForCurrentTimer = false;
function _fireChimeOnce() {
  if (_chimePlayedForCurrentTimer) return;
  _chimePlayedForCurrentTimer = true;
  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 150]);
  playRestChime();
}

function skipRest() {
  stopRestTimer();
  restTimerEndAt = 0;
  lsSet('fs_rest_timer', null);
  const label = document.getElementById('rest-timer-label');
  const bar = document.getElementById('rest-timer-progress');
  if (label) label.textContent = 'START REST TIMER';
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
  updateRestDisplay();
}

function stopRestTimer() {
  if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
  restTimerEndAt = 0;
  lsSet('fs_rest_timer', null);
}

function restoreRestTimerIfActive() {
  const saved = lsGet('fs_rest_timer');
  if (!saved || !saved.endAt) return;
  const remaining = Math.ceil((saved.endAt - Date.now()) / 1000);
  if (remaining <= 0) {
    // Timer expired — clear it. Only chime if it expired within last 30 seconds
    lsSet('fs_rest_timer', null);
    const expiredAgo = Math.abs(remaining);
    if (expiredAgo <= 30) {
      _fireChimeOnce();
    }
    return;
  }
  // Resume with the SAVED endAt, not a fresh timer
  _chimePlayedForCurrentTimer = false;
  restTotalSecs = saved.total || 90;
  restTimerEndAt = saved.endAt;
  _initChimeAudio();
  _startTimerUI(restTotalSecs);
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && restTimerInterval && restTimerEndAt > 0) {
    const remaining = Math.ceil((restTimerEndAt - Date.now()) / 1000);
    const secsDisplay = document.getElementById('rest-timer-secs-display');
    const bar = document.getElementById('rest-timer-progress');
    if (secsDisplay) secsDisplay.textContent = Math.max(0, remaining) + 's';
    if (remaining <= 0) {
      _fireChimeOnce();
      skipRest();
    } else if (bar && restTotalSecs > 0) {
      const pct = Math.min(100, ((restTotalSecs - remaining) / restTotalSecs) * 100);
      bar.style.width = pct + '%';
    }
  }
});
