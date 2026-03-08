// ═══════════════════════════════════════════
// LOGGER.JS — Dashboard Core: Navigation, Today View,
//   Exercise Picker, Week View, Settings
// ═══════════════════════════════════════════
// Split modules: nutrition.js, progress.js, workout.js
// Dependencies: USER, TARGETS, GYM_DAYS, DAY_WORKOUTS,
//   mealLogs, wktDone, saveToStorage(), lsGet(), lsSet()

// ═══════════════════════════════════════════
// LOGGER.JS — Dashboard UI, Workout Environment, 
//   Nutrition/Food Tracking, Progress, Exercise Modals
// ═══════════════════════════════════════════
// Dependencies: All globals from app.js, scoring.js functions

// ── EXERCISE VIDEO MAP (YouTube Shorts / short tutorials for form reference) ──
// Short-form only — no 5+ minute videos. Falls back to YouTube search for unmapped exercises.
const EXERCISE_VIDEOS = {
  // Chest
  'Bench Press': 'gRVjAtPip0Y',
  'Incline Barbell Press': '2tMce4VpHuE',
  'Dumbbell Bench Press': 'YQ2s_Y7g5Qk',
  'Incline DB Press': 'FGXM_kfdxhk',
  'Cable Crossover': 'taI4XduLpTk',
  'Push-Ups': 'ba8tr1NzwXU',
  'Chest Dip': 'dX_nSOOJIsE',
  // Back
  'Deadlift': 'XxWcirHIwVo',
  'Conventional Deadlift': 'XxWcirHIwVo',
  'Barbell Row': 'FWJR5Ve8bnQ',
  'Pull-Ups': 'HRV5YKKaeVw',
  'Lat Pulldown': 'SALxEARiMkw',
  'Seated Cable Row': 'xQNrFHEMhI4',
  'Face Pulls': 'rep-qVOkqgk',
  'Dumbbell Row': 'EL_pgSij6SY',
  // Shoulders
  'Shoulder Press': 'M2rwvNhTOu0',
  'Overhead Press': 'M2rwvNhTOu0',
  'Lateral Raise': '_OZeEP7lziM',
  'Arnold Press': 'vj2w851ZHRM',
  // Legs
  'Back Squat': 'bEv6CCg2BC8',
  'Front Squat': 'v-mQm_9JCMo',
  'Goblet Squat': 'MeIiIdhvXT4',
  'Romanian Deadlift': '7j-2w4-P14I',
  'Leg Press': 'IZxyjW7MPJQ',
  'Bulgarian Split Squat': 'hPlKMm-bySY',
  'Lunges': '3KFeySmhfIo',
  'Hip Thrust': 'Zp26q4BY5HE',
  'Calf Raises': '-M4-G8p8fmc',
  // Arms
  'Barbell Curl': 'kwG2ipFRgFo',
  'Hammer Curl': 'TwD-YGVP4Bk',
  'Tricep Pushdown': '2-LAMcpzODU',
  'Skull Crushers': 'd_KZxkY_0cM',
  // Core
  'Plank': 'yeKv5oX_6GY',
  'Dead Bug': '2LgSCwyNqTo',
};

// ── WARMUP RECOMMENDATIONS by workout focus ──
const WARMUP_MAP = {
  'Upper Push':  { time: '5-8 min', steps: ['2 min light cardio (jump rope or jog)', 'Arm circles — 20 forward, 20 backward', 'Band pull-aparts × 15', '10 push-ups (slow tempo)', 'Empty bar bench press × 10-12'] },
  'Upper Pull':  { time: '5-8 min', steps: ['2 min light cardio', 'Band pull-aparts × 15', 'Cat-cow stretches × 10', 'Dead hangs 20-30 sec', 'Light lat pulldowns × 10-12'] },
  'Lower Power': { time: '8-10 min', steps: ['3 min walk/bike', 'Leg swings — 15 each side', 'Bodyweight squats × 15', 'Glute bridges × 15', 'Light goblet squat × 10', 'Empty bar squats × 8-10'] },
  'Lower Hyper': { time: '5-8 min', steps: ['2 min bike or walk', 'Leg swings — 15 each side', 'Bodyweight lunges × 10 each', 'Glute bridges × 15', 'Light leg press × 10-12'] },
  'Full Body':   { time: '5-8 min', steps: ['3 min light cardio', 'Arm circles × 15 each', 'Leg swings × 10 each', 'Bodyweight squats × 15', 'Light push-ups × 10'] },
  'Push':        { time: '5-8 min', steps: ['2 min jump rope or jog', 'Arm circles — 20 forward, 20 backward', 'Band pull-aparts × 15', '10 push-ups (slow tempo)', 'Empty bar bench press × 10'] },
  'Pull':        { time: '5-8 min', steps: ['2 min light cardio', 'Band pull-aparts × 15', 'Cat-cow stretches × 10', 'Dead hangs 20-30 sec', 'Light lat pulldowns × 10'] },
  'Legs':        { time: '8-10 min', steps: ['3 min bike or walk', 'Hip circles × 10 each', 'Leg swings — 15 each side', 'Bodyweight squats × 15', 'Glute bridges × 15', 'Empty bar squats × 8'] },
  'Arms':        { time: '5 min', steps: ['2 min light cardio', 'Wrist circles × 20', 'Light curls × 12', 'Light pushdowns × 12'] },
  'default':     { time: '5 min', steps: ['2-3 min light cardio (walk, jog, or bike)', 'Dynamic stretches for target muscles', 'One light warm-up set of the first exercise'] }
};
let _warmupDismissed = false;

function _renderWarmupBanner(workoutName) {
  const banner = document.getElementById('wo-warmup-banner');
  if (!banner || _warmupDismissed) { if (banner) banner.style.display = 'none'; return; }
  // Match workout name to warmup
  let warmup = WARMUP_MAP.default;
  for (const key in WARMUP_MAP) {
    if (key !== 'default' && workoutName && workoutName.toLowerCase().includes(key.toLowerCase())) {
      warmup = WARMUP_MAP[key]; break;
    }
  }
  banner.style.cssText = 'margin:10px 14px;padding:14px 16px;background:rgba(251,146,60,0.08);border:1px solid rgba(251,146,60,0.25);border-radius:12px';
  banner.innerHTML = 
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem;letter-spacing:1.5px;color:var(--orange)">WARM UP · ' + warmup.time + '</div>' +
      '<button onclick="_dismissWarmup()" style="background:none;border:none;color:var(--dim);font-size:0.85rem;cursor:pointer;padding:2px 6px">✕</button>' +
    '</div>' +
    warmup.steps.map(function(s) { return '<div style="display:flex;align-items:flex-start;gap:8px;padding:2px 0"><span style="color:var(--orange);font-size:0.7rem;margin-top:2px">●</span><span style="font-size:0.78rem;color:var(--off);line-height:1.4">' + s + '</span></div>'; }).join('');
}
function _dismissWarmup() {
  _warmupDismissed = true;
  const banner = document.getElementById('wo-warmup-banner');
  if (banner) banner.style.display = 'none';
}

// Fuzzy multi-word search: all words in query must appear in name or muscles
function _fuzzySearchMatch(query, name, muscles) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (!words.length) return true;
  const equip = (typeof _getEquipment === 'function') ? _getEquipment(name).toLowerCase() : '';
  const cat = (EXERCISE_DB[name] ? EXERCISE_DB[name].category : '').toLowerCase();
  const target = (name + ' ' + (muscles || '') + ' ' + equip + ' ' + cat).toLowerCase();
  const matchCount = words.filter(word => target.includes(word)).length;
  // Require all words for 1-2 word queries; allow 1 miss for 3+ word queries
  const threshold = words.length <= 2 ? words.length : words.length - 1;
  return matchCount >= threshold;
}

function dashNav(view, btn) {
  // Close any open modals/overlays first — prevents blocking tab navigation
  var unplannedModal = document.getElementById('unplanned-modal');
  if (unplannedModal && unplannedModal.style.display !== 'none') {
    if (typeof closeUnplannedModal === 'function') closeUnplannedModal();
    else unplannedModal.style.display = 'none';
  }
  var mobDrawer = document.getElementById('mob-more-drawer');
  if (mobDrawer) mobDrawer.classList.remove('open');

  // Hide all views cleanly — no inline style pollution
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.cssText = '';
  });
  document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById('view-' + view);
  if (!targetView) return;
  targetView.classList.add('active');

  if (btn) btn.classList.add('active');

  // Coach gets its own full-screen layout on mobile
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    if (view === 'coach') mainContent.classList.add('coach-active');
    else mainContent.classList.remove('coach-active');
  }

  // Always reset scroll to top when switching views (except coach)
  if (view !== 'coach' && mainContent) mainContent.scrollTop = 0;

  // Sync mobile bottom tabs
  document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
  const mobTab = document.getElementById('mob-tab-' + view);
  if (mobTab) mobTab.classList.add('active');

  if (view === 'nutrition') renderNutrition();
  if (view === 'week') renderWeek();
  if (view === 'progress') { renderStreak(); renderWeightHistory(); renderNutritionChart(); renderFreqChart(); renderStrengthTrends(); }
  if (view === 'today') { renderTodayWorkout(); refreshDashMacros(); renderDashWater(); }
  if (view === 'program') renderProgram();
  if (view === 'settings') renderSettingsGymDays();
  if (view === 'coach') initCoach();
}


// ── TODAY ──
function renderTodayWorkout() {
  const workout = DAY_WORKOUTS[TODAY_IDX];
  if (!workout) {
    const wktName = document.getElementById('d-wkt-name'); if (wktName) wktName.textContent = 'Rest Day';
    const wktSub = document.getElementById('d-wkt-sub'); if (wktSub) wktSub.textContent = 'Recovery & mobility';
    const wcBadge = document.getElementById('wc-badge'); if (wcBadge) wcBadge.textContent = '● Rest Day';
    const wcName = document.getElementById('wc-name'); if (wcName) wcName.textContent = 'ACTIVE RECOVERY';
    const startBtn = document.getElementById('today-start-btn');
    if (startBtn) {
      startBtn.style.display = '';
      startBtn.textContent = '+ ADD UNPLANNED WORKOUT';
      startBtn.style.background = 'linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B)';
      startBtn.style.border = 'none';
      startBtn.style.color = '#111';
      startBtn.onclick = () => openUnplannedWorkout(TODAY_IDX);
    }
    document.getElementById('today-ex-list').innerHTML = '<div style="padding:16px;color:var(--off);font-size:0.86rem">Rest day — stretch, hydrate, recover. Or log an unplanned workout.</div>';
    const custBtn = document.getElementById('today-customize-btn');
    if (custBtn) custBtn.style.display = 'none';
    return;
  }
  // Show customize button on gym days
  const custBtn2 = document.getElementById('today-customize-btn');
  if (custBtn2) custBtn2.style.display = 'flex';
  const exes = workout.exercises, total = exes.length;
  const done = exes.filter((_,i) => getPrevSet(TODAY_IDX, i, 0) !== null).length;
  document.getElementById('d-wkt-name').textContent = workout.name;
  document.getElementById('d-wkt-sub').textContent = (wktDone.has(TODAY_IDX)?total:0)+' / '+total+' done';
  document.getElementById('d-wkt-bar').style.width = (wktDone.has(TODAY_IDX)?100:0)+'%';
  document.getElementById('wc-badge').textContent = '● Today · '+workout.name;
  document.getElementById('wc-name').textContent = workout.name.toUpperCase();
  const btn = document.getElementById('today-start-btn');
  btn.style.display = '';
  if (wktDone.has(TODAY_IDX)) { btn.textContent = '✓ COMPLETE'; btn.classList.add('done'); }
  else { btn.textContent = 'START WORKOUT'; btn.classList.remove('done'); }
  document.getElementById('today-ex-list').innerHTML = exes.map((ex,i)=>{
    const prev = getPrevSet(TODAY_IDX,i,0);
    return `<div class="ex-row ${wktDone.has(TODAY_IDX)?'done':''}" onclick="openWorkoutEnv(${TODAY_IDX},${i})">
      <button class="ex-row-dots" onclick="event.stopPropagation();toggleExRowMenu(event,${i})" title="Options">⋮</button>
      <div><div class="ex-name">${ex.name}</div><div class="ex-detail">${ex.sets}×${ex.reps} · Rest ${ex.rest}s${prev?` · Last: ${prev.weight}lbs×${prev.reps}`:''}</div></div>
      <div class="ex-detail">${ex.muscles}</div>
    </div>`;
  }).join('');
}

// ── Portal dropdown (appended to body, never clipped) ──
let _exMenuEl = null;
function toggleExRowMenu(ev, idx) {
  ev.stopPropagation();
  closeExRowMenu();
  const btn = ev.currentTarget;
  const rect = btn.getBoundingClientRect();
  _exMenuEl = document.createElement('div');
  _exMenuEl.className = 'ex-row-dropdown-portal';
  _exMenuEl.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 0;min-width:180px;z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,0.7);animation:fadeUp 0.15s ease`;
  _exMenuEl.innerHTML = `
    <span onclick="openDashExPicker('superset',${idx});closeExRowMenu()" style="display:block;padding:12px 16px;font-size:0.85rem;color:#E2DFD8;cursor:pointer">Add Superset</span>
    <span onclick="openDashExPicker('substitute',${idx});closeExRowMenu()" style="display:block;padding:12px 16px;font-size:0.85rem;color:#E2DFD8;cursor:pointer">Substitute</span>
    <span onclick="deleteTodayExercise(${idx});closeExRowMenu()" style="display:block;padding:12px 16px;font-size:0.85rem;color:#F43F5E;cursor:pointer">Delete</span>`;
  _exMenuEl.querySelectorAll('span').forEach(s => {
    s.onmouseenter = () => s.style.background = 'rgba(255,255,255,0.06)';
    s.onmouseleave = () => s.style.background = 'none';
  });
  document.body.appendChild(_exMenuEl);
  // Close on any tap outside
  setTimeout(() => {
    document.addEventListener('click', function _close(e) {
      if (_exMenuEl && !_exMenuEl.contains(e.target)) closeExRowMenu();
      document.removeEventListener('click', _close);
    }, { once: true });
  }, 10);
}

function closeExRowMenu() {
  if (_exMenuEl && _exMenuEl.parentNode) {
    _exMenuEl.parentNode.removeChild(_exMenuEl);
  }
  _exMenuEl = null;
}

function deleteTodayExercise(idx) {
  const workout = DAY_WORKOUTS[TODAY_IDX];
  if (!workout || workout.exercises.length <= 1) { showToast('Need at least one exercise.', 'warning'); return; }
  workout.exercises.splice(idx, 1);
  persistTodayWorkout();
  renderTodayWorkout();
}

var _dashExPickerMode = null;
var _dashExPickerIdx = null;
var _dashExPickerCat = 'All';

var _buildPickerSelected = []; // [{name, sets, reps, rest, muscles}]
var _aesFilterMuscle = 'All';
var _aesFilterEquip = 'All';
var _aesDropdownEl = null;

// Equipment inference from exercise name/muscles
const EQUIPMENT_MAP = {
  'Barbell': ['Barbell','Conventional Deadlift','Sumo Deadlift','Rack Pull','Pendlay Row','Yates Row','Underhand Barbell Row','Barbell Row','Barbell Curl','EZ Bar Curl','Overhead Press','Barbell Shrugs','Bradford Press','Zercher Squat','Safety Bar Squat','Box Squat','Back Squat','Front Squat','Good Mornings','Board Press','Pin Press','Reverse Grip Bench Press','Guillotine Press','Bench Press','Incline Barbell Press','Decline Bench Press','Close Grip Bench'],
  'Dumbbell': ['Dumbbell','DB','Arnold Press','Zottman Curl','Incline DB','Dumbbell Bench','Dumbbell Flyes','Dumbbell Row','Dumbbell Curl','Hammer Curl','Concentration Curl','DB Press','Lateral Raises','Front Raises','Rear Delt Fly','Kickbacks','Dumbbell Shrug','Dumbbell Thruster','Dumbbell Pullover','Romanian Deadlift (DB)'],
  'Cable': ['Cable','Rope Pushdown','Cable Row','Seated Cable Row','Cable Crossover','Face Pull','Cable Face Pull','Straight-Arm Pulldown','Cable Crunch','Pallof Press','Cable Curl','Cable Hammer Curl','Cable Kickback','Cable Woodchop','Cable Oblique','Behind-the-Back Cable','Low Cable','High Cable','Single-Arm Cable'],
  'Machine': ['Machine','Leg Press','Leg Extension','Leg Curl','Seated Leg Curl','Lying Leg Curl','Pec Deck','Hack Squat','Adductor Machine','Abductor Machine','Lat Pulldown','Close-Grip Lat Pulldown','Wide-Grip Lat Pulldown','Reverse-Grip Lat Pulldown','Low Row Machine','High Row Machine','Tricep Dip Machine','Machine Shoulder Press','Seated Calf Raise Machine','Standing Calf Raise Machine','Pendulum Squat','Smith Machine','Chest Press Machine'],
  'Bodyweight': ['Push-Ups','Diamond Push','Pull-Ups','Chin-Ups','Dips','Plank','Side Plank','Dead Bug','Bird Dog','Mountain Climbers','Hollow','V-Ups','Bicycle','Superman','Burpees','Box Jumps','Jump Squat','Pistol Squat','Inverted Row','Nordic Curl','Glute Bridge','Frog Pump','L-Sit','Dragon Flag','Toes to Bar','Knee Raise','Windshield','Hollow Rock','Hollow Hold','Reverse Crunch','Copenhagen','Stir the Pot','GHD Sit-Up','Curtsy Lunge','Lateral Lunge'],
  'Kettlebell': ['Kettlebell'],
  'Resistance Band': ['Band','Banded'],
  'Cardio Machine': ['Rowing Machine','Stair Climber','Elliptical','Cycling','Treadmill','Assault Bike'],
};

function _getEquipment(name) {
  for (var equip in EQUIPMENT_MAP) {
    var keywords = EQUIPMENT_MAP[equip];
    for (var k = 0; k < keywords.length; k++) {
      if (name.toLowerCase().indexOf(keywords[k].toLowerCase()) !== -1) return equip;
    }
  }
  return 'Barbell'; // default
}

const MUSCLE_COLORS = {
  'Chest': '#f87171', 'Back': '#60a5fa', 'Shoulders': '#c084fc',
  'Biceps': '#fb923c', 'Triceps': '#f97316', 'Biceps': '#fb923c', 'Triceps': '#f97316', 'Arms': '#fb923c', 'Legs': '#4ade80', 'Core': '#facc15', 'Cardio': '#38bdf8'
};

function openDashExPicker(mode, exIdx) {
  _dashExPickerMode = mode;
  _dashExPickerIdx = exIdx;
  var modal = document.getElementById('dash-ex-picker-modal');
  modal.classList.add('open');
  var isBuild = mode === 'build';
  document.getElementById('dash-ex-picker-title').textContent = isBuild ? 'BUILD CUSTOM WORKOUT' : (mode==='substitute' ? 'SUBSTITUTE EXERCISE' : 'ADD SUPERSET');
  document.getElementById('dash-ex-picker-search').value = '';
  _aesFilterMuscle = 'All';
  _aesFilterEquip = 'All';
  _updateAesFilterLabels();
  // Show/hide build tray
  var tray = document.getElementById('aes-build-tray');
  if (tray) tray.style.display = isBuild ? 'block' : 'none';
  if (isBuild) { _buildPickerSelected = []; _updateBuildTray(); }
  renderDashExPickerList();
}

function _updateAesFilterLabels() {
  var mLabel = document.getElementById('aes-filter-muscle-label');
  var eLabel = document.getElementById('aes-filter-equip-label');
  var mBtn = document.getElementById('aes-filter-muscle-btn');
  var eBtn = document.getElementById('aes-filter-equip-btn');
  if (mLabel) mLabel.textContent = _aesFilterMuscle === 'All' ? 'MUSCLE GROUP' : _aesFilterMuscle.toUpperCase();
  if (eLabel) eLabel.textContent = _aesFilterEquip === 'All' ? 'EQUIPMENT' : _aesFilterEquip.toUpperCase();
  if (mBtn) mBtn.classList.toggle('active', _aesFilterMuscle !== 'All');
  if (eBtn) eBtn.classList.toggle('active', _aesFilterEquip !== 'All');
}

function toggleAesDropdown(type, btn) {
  // Close any open dropdown
  if (_aesDropdownEl) { _aesDropdownEl.remove(); _aesDropdownEl = null; return; }
  var rect = btn.getBoundingClientRect();
  var options = type === 'muscle'
    ? ['All','Chest','Back','Shoulders','Biceps','Triceps','Legs','Core','Cardio']
    : ['All','Barbell','Dumbbell','Cable','Machine','Bodyweight','Kettlebell','Resistance Band','Cardio Machine'];
  var current = type === 'muscle' ? _aesFilterMuscle : _aesFilterEquip;
  _aesDropdownEl = document.createElement('div');
  _aesDropdownEl.className = 'aes-dropdown';
  _aesDropdownEl.style.cssText = 'top:' + (rect.bottom + 4) + 'px;left:' + rect.left + 'px;';
  _aesDropdownEl.innerHTML = options.map(function(opt) {
    var safeOpt = opt.replace(/'/g, "\\'");
    return '<div class="aes-dropdown-item' + (opt === current ? ' selected' : '') + '" onclick="_setAesFilter(\'' + type + '\',\'' + safeOpt + '\')">' + (opt === 'All' ? 'All' : opt) + '</div>';
  }).join('');
  document.body.appendChild(_aesDropdownEl);
  setTimeout(function() {
    document.addEventListener('click', function _closeDD(e) {
      if (_aesDropdownEl && !_aesDropdownEl.contains(e.target) && e.target !== btn) {
        _aesDropdownEl.remove(); _aesDropdownEl = null;
      }
      document.removeEventListener('click', _closeDD);
    }, { once: true });
  }, 10);
}

function _setAesFilter(type, value) {
  if (type === 'muscle') _aesFilterMuscle = value;
  else _aesFilterEquip = value;
  if (_aesDropdownEl) { _aesDropdownEl.remove(); _aesDropdownEl = null; }
  _updateAesFilterLabels();
  renderDashExPickerList();
}

function closeDashExPicker() {
  document.getElementById('dash-ex-picker-modal').classList.remove('open');
  _dashExPickerMode = null;
  _dashExPickerIdx = null;
  _woSubstituteMode = false;
}

function filterDashExPicker() {
  // Auto-clear muscle/equipment filters when user starts searching
  const search = (document.getElementById('dash-ex-picker-search') || {}).value || '';
  if (search.trim().length > 0 && (_aesFilterMuscle !== 'All' || _aesFilterEquip !== 'All')) {
    _aesFilterMuscle = 'All';
    _aesFilterEquip = 'All';
    _updateAesFilterLabels();
  }
  renderDashExPickerList();
}

function renderDashExPickerList() {
  var search = (document.getElementById('dash-ex-picker-search')||{}).value.toLowerCase();
  var list = document.getElementById('dash-ex-picker-list');
  var filtered = Object.keys(EXERCISE_DB).filter(function(name){
    var data = EXERCISE_DB[name];
    var muscleMatch = _aesFilterMuscle === 'All' || data.category === _aesFilterMuscle;
    var equipMatch = _aesFilterEquip === 'All' || _getEquipment(name) === _aesFilterEquip;
    var searchMatch = !search || _fuzzySearchMatch(search, name, data.muscles || '');
    return muscleMatch && equipMatch && searchMatch;
  });
  // Sort: selected first, then alphabetical
  filtered.sort(function(a, b) {
    var aSelected = _dashExPickerMode === 'build' && _buildPickerSelected.some(function(e){ return e.name === a; });
    var bSelected = _dashExPickerMode === 'build' && _buildPickerSelected.some(function(e){ return e.name === b; });
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.localeCompare(b);
  });
  list.innerHTML = filtered.map(function(name){
    var data = EXERCISE_DB[name];
    var safeName = name.replace(/'/g,"\\'");
    var isSelected = _dashExPickerMode === 'build' && _buildPickerSelected.some(function(e){ return e.name === name; });
    var dotColor = MUSCLE_COLORS[data.category] || 'var(--dim)';
    return '<div class="aes-item" onclick="selectDashEx(\''+safeName+'\')" style="'+(isSelected?'border-color:rgba(212,165,32,0.3);background:rgba(212,165,32,0.05)':'')+'">'+
      '<div class="aes-muscle-dot" style="background:'+dotColor+'"></div>'+
      '<div><div class="aes-item-name">'+name+'</div><div class="aes-item-cat">'+(data.muscles||'').toUpperCase()+'</div></div>'+
      '<button class="aes-item-add" style="'+(isSelected?'background:var(--gold);color:var(--black)':'')+'">'+(isSelected?'✓':'+')+'</button></div>';
  }).join('');
  if (!filtered.length) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--dim);font-size:0.83rem">No exercises found</div>';
}

function selectDashEx(name) {
  var db = getExerciseData(name);
  if (_dashExPickerMode === 'build') {
    // If already selected, remove it; otherwise open config to set sets/reps/rest
    var idx = _buildPickerSelected.findIndex(function(e){ return e.name === name; });
    if (idx >= 0) {
      _buildPickerSelected.splice(idx, 1);
      _updateBuildTray();
      renderDashExPickerList();
    } else {
      _openAesConfig(name, db);
    }
    return;
  }
  var newEx = { name: name, sets: db.sets, reps: db.reps, rest: db.rest, muscles: db.muscles };
  
  if (_woSubstituteMode && woWorkout) {
    // Substituting from within workout env — update live workout
    const mode = _dashExPickerMode;
    const targetIdx = _dashExPickerIdx;
    if (mode === 'substitute') {
      woWorkout.exercises[targetIdx] = newEx;
    } else {
      newEx._supersetWith = woWorkout.exercises[targetIdx].name;
      woWorkout.exercises.splice(targetIdx + 1, 0, newEx);
    }
    // Also persist to plan if this is a planned workout
    if (DAY_WORKOUTS[woDay]) {
      DAY_WORKOUTS[woDay].exercises = woWorkout.exercises;
      persistTodayWorkout();
    }
    closeDashExPicker();
    // Reload current exercise to reflect changes
    renderEcList();
    loadExercise(mode === 'substitute' ? targetIdx : targetIdx + 1);
    return;
  }
  
  var workout = DAY_WORKOUTS[TODAY_IDX];
  if (!workout) { closeDashExPicker(); return; }
  if (_dashExPickerMode === 'substitute') {
    workout.exercises[_dashExPickerIdx] = newEx;
  } else {
    newEx._supersetWith = workout.exercises[_dashExPickerIdx].name;
    workout.exercises.splice(_dashExPickerIdx + 1, 0, newEx);
  }
  persistTodayWorkout();
  renderTodayWorkout();
  closeDashExPicker();
}

function _updateBuildTray() {
  var sel = document.getElementById('aes-build-selected');
  var beginBtn = document.getElementById('aes-begin-btn');
  if (!sel) return;
  if (_buildPickerSelected.length === 0) {
    sel.innerHTML = '<span style="font-size:0.75rem;color:var(--dim)">Tap exercises to add them</span>';
    if (beginBtn) beginBtn.style.display = 'none';
  } else {
    sel.innerHTML = _buildPickerSelected.map(function(e, i){
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 8px;font-size:0.7rem;color:#F2F0EB;font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.5px">'
        + e.name + ' ' + e.sets + '×' + e.reps
        + '<button onclick="_removeBuildEx('+i+')" style="background:none;border:none;color:#F2F0EB;cursor:pointer;padding:0;margin-left:2px;font-size:0.75rem;opacity:0.7">✕</button></span>';
    }).join('');
    if (beginBtn) beginBtn.style.display = 'block';
  }
}

function _removeBuildEx(idx) {
  _buildPickerSelected.splice(idx, 1);
  _updateBuildTray();
  renderDashExPickerList();
}

var _aesConfigPending = null; // {name, db}

function _openAesConfig(name, db) {
  _aesConfigPending = { name: name, db: db };
  document.getElementById('aes-config-name').textContent = name.toUpperCase();
  document.getElementById('aes-config-muscles').textContent = (db.muscles || '').toUpperCase();
  document.getElementById('aes-config-sets').value = db.sets || 3;
  var repsRaw = String(db.reps || '10');
  document.getElementById('aes-config-reps').value = parseInt(repsRaw.split('-')[0]) || 10;
  var rest = db.rest || 90;
  document.getElementById('aes-config-rest').value = rest;
  document.getElementById('aes-config-rest-display').textContent = rest + 's';
  var overlay = document.getElementById('aes-config-overlay');
  overlay.style.display = 'flex';
}

function closeAesConfig() {
  document.getElementById('aes-config-overlay').style.display = 'none';
  _aesConfigPending = null;
}

function adjustAesConfig(field, delta) {
  if (field === 'sets') {
    var el = document.getElementById('aes-config-sets');
    el.value = Math.max(1, Math.min(10, (parseInt(el.value)||3) + delta));
  } else if (field === 'reps') {
    var el = document.getElementById('aes-config-reps');
    el.value = Math.max(1, Math.min(50, (parseInt(el.value)||10) + delta));
  } else if (field === 'rest') {
    var el = document.getElementById('aes-config-rest');
    var newVal = Math.max(15, Math.min(300, (parseInt(el.value)||90) + delta));
    el.value = newVal;
    document.getElementById('aes-config-rest-display').textContent = newVal + 's';
  }
}

function confirmAesConfig() {
  if (!_aesConfigPending) return;
  var sets = parseInt(document.getElementById('aes-config-sets').value) || 3;
  var reps = parseInt(document.getElementById('aes-config-reps').value) || 10;
  var rest = parseInt(document.getElementById('aes-config-rest').value) || 90;
  var db = _aesConfigPending.db;
  _buildPickerSelected.push({
    name: _aesConfigPending.name,
    sets: sets,
    reps: reps,
    rest: rest,
    muscles: db.muscles
  });
  closeAesConfig();
  _updateBuildTray();
  renderDashExPickerList();
}

function beginCustomWorkoutFromPicker() {
  if (!_buildPickerSelected.length) return;
  _unplannedDayIdx = TODAY_IDX;
  closeDashExPicker();
  _launchUnplannedEnv(_buildPickerSelected.map(function(e){
    return { name: e.name, sets: e.sets || 3, reps: e.reps || '8-10', rest: e.rest || 90, muscles: e.muscles };
  }));
}

function persistTodayWorkout() {
  var workout = DAY_WORKOUTS[TODAY_IDX];
  if (!workout || !generatedPlan) return;
  var sched = generatedPlan.weekly_schedule[TODAY_IDX];
  if (sched && sched.type === 'workout') {
    sched.exercises = workout.exercises;
    lsSet('fs_plan', generatedPlan);
  }
}

document.addEventListener('click', function(){ closeExRowMenu(); });

// ── MACROS ──
function refreshDashMacros() {
  const t = getAllEntries(TODAY_IDX).reduce((a,e)=>({cal:a.cal+e.cal,pro:a.pro+e.pro,carb:a.carb+(e.carb||0),fat:a.fat+(e.fat||0)}),{cal:0,pro:0,carb:0,fat:0});
  const circumference = 263.9;
  
  [['cal',TARGETS.cal,'','d-cal','d-cal-ring','d-cal-sub'],
   ['pro',TARGETS.pro,'g','d-pro','d-pro-ring','d-pro-sub'],
   ['carb',TARGETS.carb,'g','d-carb','d-carb-ring','d-carb-sub'],
   ['fat',TARGETS.fat,'g','d-fat','d-fat-ring','d-fat-sub']].forEach(([k,tgt,u,vid,rid,sid])=>{
    const val = t[k];
    const pct = tgt > 0 ? val / tgt : 0;
    const offset = circumference * (1 - Math.min(pct, 1));
    let color;
    if (pct > 1.05) color = '#ef4444';
    else if (pct >= 0.90) color = '#22c55e';
    else color = '#F2F0EB';
    const el = document.getElementById(vid);
    const ring = document.getElementById(rid);
    const sub = document.getElementById(sid);
    if (el) el.textContent = (k==='cal' ? val.toLocaleString() : val) + u;
    if (ring) { ring.style.strokeDashoffset = offset; ring.setAttribute('stroke', color); }
    if (sub) sub.textContent = 'of ' + (tgt||'\u2014') + (u ? u : '');
  });
}

// ── WEEK ──
function renderWeek() {
  const gymCount = GYM_DAYS.length;
  document.getElementById('wk-done-sub').textContent = 'of '+gymCount+' scheduled';
  document.getElementById('week-grid').innerHTML = DAYS_FULL.map((day,i)=>{
    const isGym = GYM_DAYS.includes(i), isToday = i===TODAY_IDX, isDone = wktDone.has(i);
    const workout = DAY_WORKOUTS[i];
    let cls = 'wday';
    if (isToday) cls += ' is-today'; else if (isDone) cls += ' is-done';
    const svgCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="#F2F0EB" stroke-width="2.5" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg>';
    const svgDumbbell = '<svg viewBox="0 0 28 14" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="12" style="opacity:0.6;color:var(--tier-color)"><rect x="11" y="5" width="6" height="4" rx="1" fill="currentColor"/><rect x="7" y="3" width="4" height="8" rx="1" fill="currentColor"/><rect x="17" y="3" width="4" height="8" rx="1" fill="currentColor"/><rect x="3" y="4" width="4" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="4" width="4" height="6" rx="1.5" fill="currentColor"/></svg>';
    const svgRestBlank = '<svg viewBox="0 0 24 24" fill="none" width="20" height="20" style="opacity:0.18"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const icon = isDone ? svgCheck : isGym ? svgDumbbell : svgRestBlank;
    const label = workout ? workout.name : 'Rest';
    // Today + gym day → start workout. Done day → view recap. Future/past gym day → preview. Rest → unplanned.
    let clickFn;
    if (!workout) {
      clickFn = `openUnplannedWorkout(${i})`;
    } else if (isToday && !isDone) {
      clickFn = `openWorkoutEnv(${i})`;
    } else {
      // Preview mode for any non-today workout day (past or future)
      clickFn = `openWorkoutPreview(${i})`;
    }
    return `<div class="${cls}" onclick="${clickFn}"><div class="wday-name">${DAYS_SHORT[i]}</div><div class="wday-icon">${icon}</div><div class="wday-label">${label}</div></div>`;
  }).join('');
  const doneCount = [...wktDone].length;
  document.getElementById('wk-done').textContent = doneCount;
  document.getElementById('wk-done-bar').style.width = (gymCount?doneCount/gymCount*100:0)+'%';
}

// ── WORKOUT PREVIEW MODAL (tap any non-today day to see exercises + edit) ──
function openWorkoutPreview(dayIdx) {
  const workout = DAY_WORKOUTS[dayIdx];
  if (!workout) return;
  const isDone = wktDone.has(dayIdx);
  const isToday = dayIdx === TODAY_IDX;
  const ph = getTrainingPhase(CURRENT_WEEK);
  const deload = isDeloadWeek(CURRENT_WEEK);
  const phLabel = deload ? '⚡ DELOAD WEEK' : ph.name + ' PHASE';

  // Build exercise rows with phase-adjusted sets/reps
  const exRows = workout.exercises.map((ex, i) => {
    const phMod = getPhaseExerciseModifier(CURRENT_WEEK);
    const adjSets = deload ? Math.max(2, Math.round(ex.sets * 0.6)) : (phMod.setMult !== 1.0 ? Math.max(3, Math.round(ex.sets * phMod.setMult)) : ex.sets);
    const adjReps = (!deload && phMod.repRange) ? phMod.repRange : ex.reps;
    // Show last session data if available
    const exlogs = getExLogs();
    const sessions = exlogs[ex.name] || [];
    const today = todayDateStr();
    const prevSession = sessions.find(s => s.date !== today);
    let prevText = '';
    if (prevSession && prevSession.sets) {
      const best = prevSession.sets.filter(Boolean).reduce((b, s) => (s.weight > (b ? b.weight : 0) ? s : b), null);
      if (best) prevText = `<span class="wpr-prev">Last: ${best.weight}lbs × ${best.reps}</span>`;
    }
    return `<div class="wpr-ex-row">
      <div class="wpr-ex-num">${i+1}</div>
      <div class="wpr-ex-info">
        <div class="wpr-ex-name">${ex.name}</div>
        <div class="wpr-ex-meta">${adjSets} sets · ${adjReps} reps · ${ex.rest}s rest ${prevText}</div>
      </div>
    </div>`;
  }).join('');

  const modal = document.getElementById('workout-preview-modal');
  if (!modal) return;
  document.getElementById('wpr-title').textContent = workout.name.toUpperCase();
  document.getElementById('wpr-day').textContent = DAYS_FULL[dayIdx] + ' · ' + phLabel;
  document.getElementById('wpr-ex-list').innerHTML = exRows;

  const startBtn = document.getElementById('wpr-start-btn');
  if (isDone) {
    startBtn.textContent = '✓ COMPLETED';
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';
    startBtn.style.cursor = 'default';
  } else {
    startBtn.textContent = isToday ? 'START WORKOUT' : 'START ANYWAY';
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.style.cursor = 'pointer';
    startBtn.onclick = () => { closeWorkoutPreview(); openWorkoutEnv(dayIdx); };
  }

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.querySelector('.wpr-sheet').style.transform = 'translateY(0)';
  });
}

function closeWorkoutPreview() {
  const modal = document.getElementById('workout-preview-modal');
  if (!modal) return;
  const sheet = modal.querySelector('.wpr-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { modal.style.display = 'none'; }, 280);
}



// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════

// ── SETTINGS ──
function renderSettingsGymDays() {
  const container = document.getElementById('settings-gym-days'); if (!container) return;
  container.innerHTML = '';
  DAYS_SHORT.forEach((d,i)=>{
    const active = GYM_DAYS.includes(i);
    const el = document.createElement('div');
    el.textContent = d; el.dataset.idx = i; if(active) el.dataset.active='1';
    el.style.cssText = `padding:10px 16px;border-radius:8px;border:1px solid ${active?'rgba(255,255,255,0.15)':'var(--border)'};background:${active?'rgba(255,255,255,0.06)':'var(--dark)'};color:${active?'var(--bone)':'var(--dim)'};font-family:'DM Mono',monospace;font-size:0.8rem;cursor:pointer;transition:all 0.2s`;
    el.onclick = function(){
      const now = !this.dataset.active; this.dataset.active=now?'1':'';
      this.style.borderColor=now?'rgba(255,255,255,0.15)':'var(--border)';
      this.style.background=now?'rgba(255,255,255,0.06)':'var(--dark)';
      this.style.color=now?'var(--bone)':'var(--dim)';
    };
    container.appendChild(el);
  });
}

function saveSettings() {
  // Update user profile
  const newName   = document.getElementById('s-name').value.trim();
  const newWeight = parseFloat(document.getElementById('s-weight').value);
  const newGoal   = parseFloat(document.getElementById('s-goal').value);
  if (newName && USER) USER.name = newName;
  if (newWeight && USER) {
    const prevWeight = parseFloat(USER.weight) || newWeight;
    USER.weight = newWeight;
    if (Math.abs(prevWeight - newWeight) > 0.5) {
      const n = calcNutrition(newWeight, newGoal || USER.goal, USER.weeks || 12, USER.gender || 'Male', USER.age || 30, USER.heightCm || 175, USER.activity || 'moderate');
      USER.nutrition = n;
      TARGETS.cal = n.calories; TARGETS.pro = n.protein; TARGETS.carb = n.carbs; TARGETS.fat = n.fat;
      document.getElementById('s-cal').value = n.calories; document.getElementById('s-pro').value = n.protein;
      document.getElementById('s-carb').value = n.carbs; document.getElementById('s-fat').value = n.fat;
    }
  }
  if (newGoal && USER) USER.goal = newGoal;
  // Save body goals and injuries
  const sBodyGoals = document.getElementById('s-body-goals');
  if (sBodyGoals && USER) USER.bodyGoals = sBodyGoals.value.trim();
  const sInjuries = document.getElementById('s-injuries');
  if (sInjuries && USER) USER.injuries = sInjuries.value.trim();
  const sRules = document.getElementById('s-rules');
  if (sRules && USER) USER.personalRules = sRules.value.trim();
  lsSet('fs_user', USER);

  // Save gym days
  const gymDayEls = document.querySelectorAll('#settings-gym-days [data-idx]');
  if (gymDayEls.length > 0) {
    const newGymDays = [];
    gymDayEls.forEach(el => { if (el.dataset.active === '1') newGymDays.push(parseInt(el.dataset.idx)); });
    if (newGymDays.length > 0) {
      GYM_DAYS.length = 0;
      newGymDays.forEach(d => GYM_DAYS.push(d));
      if (USER) USER.gymDays = GYM_DAYS.slice();
      lsSet('fs_gym_days', GYM_DAYS.slice());
      if (typeof buildDayWorkouts === 'function') buildDayWorkouts();
      renderWeek();
    }
  }

  // Allow manual override of macro targets
  TARGETS.cal  = parseInt(document.getElementById('s-cal').value)  || TARGETS.cal;
  TARGETS.pro  = parseInt(document.getElementById('s-pro').value)  || TARGETS.pro;
  TARGETS.carb = parseInt(document.getElementById('s-carb').value) || TARGETS.carb;
  TARGETS.fat  = parseInt(document.getElementById('s-fat').value)  || TARGETS.fat;
  refreshDashMacros(); renderMacros(); saveToStorage();

  const btn = document.getElementById('save-btn'), orig = btn.textContent;
  btn.textContent='✓ SAVED'; btn.style.background='rgba(255,255,255,0.08)'; btn.style.color='var(--bone)'; btn.style.border='1px solid rgba(255,255,255,0.12)';
  setTimeout(()=>{ btn.textContent=orig; btn.style.background='var(--gold)'; btn.style.color='var(--black)'; btn.style.border='none'; }, 1800);
}

// ═══════════════════════════════════════════
// DATA EXPORT / IMPORT — localStorage safety net
// ═══════════════════════════════════════════

// All localStorage keys used by the app
var _FS_KEYS = [
  'fs_user', 'fs_plan', 'fs_entered', 'fs_program_start',
  'fs_mealLogs', 'fs_wktDone', 'fs_setLogs', 'fs_targets', 'fs_exlogs',
  'fs_wo_draft', 'fs_rest_timer', 'fs_water_today', 'fs_water_goal',
  'fs_water_goal_custom', 'fs_weightLog', 'fs_weight_log', 'fs_workout_dates',
  'fs_coach_history', 'fs_proactive_msgs', 'fs_proactive_last',
  'fs_recipes', 'fs_adaptive_last', 'fs_adaptive_insight',
  'fs_weekly_report', 'fs_weekly_report_ts', 'fs_gym_days',
  'fs_recent_foods', 'fs_custom_foods', 'fs_water_logs'
];

function exportData() {
  try {
    var data = { _blueprint_backup: true, _version: 1, _date: new Date().toISOString(), _keys: {} };
    for (var i = 0; i < _FS_KEYS.length; i++) {
      var key = _FS_KEYS[i];
      var val = localStorage.getItem(key);
      if (val !== null) data._keys[key] = val;
    }
    // Also grab any fs_ keys we might have missed
    for (var j = 0; j < localStorage.length; j++) {
      var k = localStorage.key(j);
      if (k && k.startsWith('fs_') && !data._keys[k]) {
        data._keys[k] = localStorage.getItem(k);
      }
    }
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var userName = (USER && USER.name) ? USER.name.replace(/[^a-zA-Z0-9]/g, '') : 'blueprint';
    a.download = 'blueprint-backup-' + userName + '-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.', 'success');
  } catch (e) {
    showToast('Export failed: ' + e.message, 'error');
  }
}

function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data._blueprint_backup || !data._keys) {
          showToast('This doesn\'t look like a Blueprint backup file.', 'error');
          return;
        }
        var keyCount = Object.keys(data._keys).length;
        if (!confirm('Restore backup from ' + (data._date ? data._date.split('T')[0] : 'unknown date') + '?\n\nThis will replace your current data with ' + keyCount + ' saved items.\n\nYour current data will be overwritten.')) return;

        // Write all keys
        var keys = Object.keys(data._keys);
        for (var i = 0; i < keys.length; i++) {
          localStorage.setItem(keys[i], data._keys[keys[i]]);
        }
        showToast('Backup restored! Reloading...', 'success', 2000);
        setTimeout(function() { location.reload(); }, 1500);
      } catch (err) {
        showToast('Invalid backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('Are you sure? This will delete ALL your data — plan, workouts, nutrition logs, progress, everything.\n\nThis cannot be undone. Consider downloading a backup first.')) return;
  if (!confirm('Really delete everything?')) return;
  localStorage.clear();
  showToast('All data cleared. Reloading...', 'info', 2000);
  setTimeout(function() { location.reload(); }, 1500);
}
