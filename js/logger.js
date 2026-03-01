// ═══════════════════════════════════════════
// LOGGER.JS — Dashboard UI, Workout Environment, 
//   Nutrition/Food Tracking, Progress, Exercise Modals
// ═══════════════════════════════════════════
// Dependencies: All globals from app.js, scoring.js functions

function dashNav(view, btn) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.sb-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  if (btn) btn.classList.add('active');
  // Toggle coach-active class on main-content for full-screen coach layout
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    if (view === 'coach') mainContent.classList.add('coach-active');
    else mainContent.classList.remove('coach-active');
  }
  // Sync mobile bottom tabs
  const mobViews = ['today','week','nutrition','coach'];
  document.querySelectorAll('.mob-tab').forEach(t=>t.classList.remove('active'));
  if (mobViews.includes(view)) {
    const mobTab = document.getElementById('mob-tab-'+view);
    if (mobTab) mobTab.classList.add('active');
  }
  if (view==='nutrition') renderNutrition();
  if (view==='myplan') { /* already rendered on plan generation */ }
  if (view==='week') renderWeek();
  if (view==='progress') { renderStreak(); renderWeightHistory(); renderNutritionChart(); renderFreqChart(); }
  if (view==='today') { renderTodayWorkout(); refreshDashMacros(); }
  if (view==='program') renderProgram();
  if (view==='settings') renderSettingsGymDays();
  if (view==='coach') initCoach();
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
      startBtn.textContent = '+ LOG UNPLANNED WORKOUT';
      startBtn.style.background = 'rgba(251,146,60,0.15)';
      startBtn.style.border = '1px solid rgba(251,146,60,0.3)';
      startBtn.style.color = 'var(--orange)';
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
    return `<div class="ex-row ${wktDone.has(TODAY_IDX)?'done':''}" onclick="openWorkoutEnv(${TODAY_IDX})">
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
  if (!workout || workout.exercises.length <= 1) { alert('Need at least one exercise.'); return; }
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
}

function filterDashExPicker() { renderDashExPickerList(); }

function renderDashExPickerList() {
  var search = (document.getElementById('dash-ex-picker-search')||{}).value.toLowerCase();
  var list = document.getElementById('dash-ex-picker-list');
  var filtered = Object.keys(EXERCISE_DB).filter(function(name){
    var data = EXERCISE_DB[name];
    var muscleMatch = _aesFilterMuscle === 'All' || data.category === _aesFilterMuscle;
    var equipMatch = _aesFilterEquip === 'All' || _getEquipment(name) === _aesFilterEquip;
    var searchMatch = !search || name.toLowerCase().indexOf(search)!==-1 || (data.muscles||'').toLowerCase().indexOf(search)!==-1;
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
    return '<div class="aes-item" onclick="selectDashEx(\''+safeName+'\')" style="'+(isSelected?'border-color:rgba(74,222,128,0.3);background:rgba(74,222,128,0.05)':'')+'">'+
      '<div class="aes-muscle-dot" style="background:'+dotColor+'"></div>'+
      '<div><div class="aes-item-name">'+name+'</div><div class="aes-item-cat">'+(data.muscles||'').toUpperCase()+'</div></div>'+
      '<button class="aes-item-add" style="'+(isSelected?'background:var(--green);color:var(--black)':'')+'">'+(isSelected?'✓':'+')+'</button></div>';
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
  var workout = DAY_WORKOUTS[TODAY_IDX];
  if (!workout) { closeDashExPicker(); return; }
  var newEx = { name: name, sets: db.sets, reps: db.reps, rest: db.rest, muscles: db.muscles };
  if (_dashExPickerMode === 'substitute') {
    workout.exercises[_dashExPickerIdx] = newEx;
  } else {
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
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:6px;padding:3px 8px;font-size:0.7rem;color:var(--green);font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.5px">'
        + e.name + ' ' + e.sets + '×' + e.reps
        + '<button onclick="_removeBuildEx('+i+')" style="background:none;border:none;color:var(--green);cursor:pointer;padding:0;margin-left:2px;font-size:0.75rem;opacity:0.7">✕</button></span>';
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
  
  // Calories
  const calOver = t.cal > TARGETS.cal;
  const calEl = document.getElementById('d-cal'); if (!calEl) return;
  calEl.textContent = t.cal.toLocaleString();
  calEl.className = 'sc-val'+(calOver?' over':'');
  document.getElementById('d-cal-sub').textContent = 'of '+TARGETS.cal.toLocaleString();
  document.getElementById('d-cal-bar').style.width = Math.min(t.cal/TARGETS.cal*100,100)+'%';
  document.getElementById('d-cal-bar').className = 'prog-fill'+(calOver?' over':'');
  
  // Protein
  const proOver = t.pro > TARGETS.pro;
  const proEl = document.getElementById('d-pro');
  proEl.textContent = t.pro+'g';
  proEl.className = 'sc-val'+(proOver?' over':'');
  document.getElementById('d-pro-sub').textContent = 'of '+TARGETS.pro+'g';
  document.getElementById('d-pro-bar').style.width = Math.min(t.pro/TARGETS.pro*100,100)+'%';
  document.getElementById('d-pro-bar').className = 'prog-fill'+(proOver?' over':'');
  
  // Carbs
  const carbOver = t.carb > TARGETS.carb;
  const carbEl = document.getElementById('d-carb');
  if (carbEl) {
    carbEl.textContent = t.carb+'g';
    carbEl.className = 'sc-val'+(carbOver?' over':'');
    document.getElementById('d-carb-sub').textContent = 'of '+TARGETS.carb+'g';
    document.getElementById('d-carb-bar').style.width = Math.min(t.carb/TARGETS.carb*100,100)+'%';
    document.getElementById('d-carb-bar').className = 'prog-fill'+(carbOver?' over':'');
  }
  
  // Fat
  const fatOver = t.fat > TARGETS.fat;
  const fatEl = document.getElementById('d-fat');
  if (fatEl) {
    fatEl.textContent = t.fat+'g';
    fatEl.className = 'sc-val'+(fatOver?' over':'');
    document.getElementById('d-fat-sub').textContent = 'of '+TARGETS.fat+'g';
    document.getElementById('d-fat-bar').style.width = Math.min(t.fat/TARGETS.fat*100,100)+'%';
    document.getElementById('d-fat-bar').className = 'prog-fill'+(fatOver?' over':'');
  }
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
    const svgCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2.5" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg>';
    const svgDumbbell = '<svg viewBox="0 0 28 14" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="12" style="opacity:0.6;color:var(--tier-color)"><rect x="11" y="5" width="6" height="4" rx="1" fill="currentColor"/><rect x="7" y="3" width="4" height="8" rx="1" fill="currentColor"/><rect x="17" y="3" width="4" height="8" rx="1" fill="currentColor"/><rect x="3" y="4" width="4" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="4" width="4" height="6" rx="1.5" fill="currentColor"/></svg>';
    const svgRestBlank = '<svg viewBox="0 0 24 24" fill="none" width="20" height="20" style="opacity:0.18"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const icon = isDone ? svgCheck : isGym ? svgDumbbell : svgRestBlank;
    const label = workout ? workout.name : 'Rest';
    const clickFn = DAY_WORKOUTS[i] ? `openWorkoutEnv(${i})` : `openUnplannedWorkout(${i})`;
    return `<div class="${cls}" onclick="${clickFn}"><div class="wday-name">${DAYS_SHORT[i]}</div><div class="wday-icon">${icon}</div><div class="wday-label">${label}</div></div>`;
  }).join('');
  const doneCount = [...wktDone].length;
  document.getElementById('wk-done').textContent = doneCount;
  document.getElementById('wk-done-bar').style.width = (gymCount?doneCount/gymCount*100:0)+'%';
}

// ── NUTRITION ──
// ── WATER TRACKING ──
let WATER_GOAL = 64; // oz per day — updated dynamically
let waterLogs = {}; // { dayKey: oz }

function getWaterKey(dayIdx) {
  const d = new Date(); d.setDate(d.getDate() - (TODAY_IDX - dayIdx));
  return d.toISOString().split('T')[0];
}

function getWaterOz(dayIdx) {
  return waterLogs[getWaterKey(dayIdx)] || 0;
}

function setWaterOz(dayIdx, oz) {
  waterLogs[getWaterKey(dayIdx)] = Math.max(0, oz);
  lsSet('fs_water', waterLogs);
}

function updateWaterGoal(val) {
  const oz = parseInt(val);
  if (!oz || oz < 16) return;
  lsSet('fs_water_goal', oz);
  renderWater();
}

function getWaterGoal() {
  return lsGet('fs_water_goal') || 64;
}

function toggleCustomWater() {
  const row = document.getElementById('water-custom-row');
  const isHidden = row.style.display === 'none' || row.style.display === '';
  row.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    const inp = document.getElementById('water-custom-input');
    if (inp) { inp.value = ''; setTimeout(function(){ inp.focus(); }, 50); }
  }
}

function addCustomWater() {
  const input = document.getElementById('water-custom-input');
  const oz = parseFloat(input.value);
  if (!oz || oz <= 0) return;
  addWater(oz);
  input.value = '';
  const row = document.getElementById('water-custom-row');
  if (row) row.style.display = 'none';
}

function addWater(oz) {
  const current = getWaterOz(nutDay);
  setWaterOz(nutDay, current + oz);
  renderWater();
}

function undoWater() {
  const current = getWaterOz(nutDay);
  setWaterOz(nutDay, Math.max(0, current - 8));
  renderWater();
}

function renderWater() {
  WATER_GOAL = getWaterGoal();
  const goalInput = document.getElementById('water-goal-input');
  if (goalInput) goalInput.value = WATER_GOAL;
  const oz = getWaterOz(nutDay);
  const pct = Math.min(oz / WATER_GOAL, 1);
  const circumference = 263.9;
  const offset = circumference * (1 - pct);

  document.getElementById('water-oz-display').textContent = oz;
  document.getElementById('water-ring-fill').style.strokeDashoffset = offset;

  const cups = Math.floor(oz / 8);
  const totalCups = Math.min(Math.ceil(WATER_GOAL / 8), 16);
  document.getElementById('water-cups').innerHTML =
    Array.from({length: totalCups}, (_,i) =>
      `<div class="water-cup ${i < cups ? 'filled' : 'empty'}"></div>`
    ).join('');

  const pctInt = Math.round(pct * 100);
  let status = 'Stay hydrated <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 4v6M6 14v6M18 4v6M18 14v6M3 7h6M15 7h6M3 17h6M15 17h6"/></svg>';
  if (pct >= 1) status = 'Goal reached! Great work! ★';
  else if (pct >= 0.75) status = `${pctInt}% — almost there!`;
  else if (pct >= 0.5) status = `${pctInt}% — halfway there`;
  else if (pct >= 0.25) status = `${pctInt}% — keep drinking!`;
  else if (oz > 0) status = `${pctInt}% — just getting started`;
  document.getElementById('water-status').innerHTML = status;
}

// ── MEAL CATEGORIES (MFP-style) ──
const MEAL_CATS = [
  { id:'breakfast', icon:'', label:'Breakfast' },
  { id:'lunch',     icon:'', label:'Lunch' },
  { id:'dinner',    icon:'', label:'Dinner' },
  { id:'snacks',    icon:'', label:'Snacks' },
  { id:'other',     icon:'', label:'Other' },
];

let activeFoodCat = 'breakfast'; // which category we're adding to
let currentFoodItem = null;
let foodModalTab = 'search'; // 'search' | 'recent' | 'custom'

function getMealCatEntries(dayIdx, catId) {
  if (!mealLogs[dayIdx]) mealLogs[dayIdx] = {};
  if (Array.isArray(mealLogs[dayIdx])) {
    // Migrate old flat array to category format
    const old = mealLogs[dayIdx];
    mealLogs[dayIdx] = { breakfast:[], lunch:[], dinner:[], snacks:[], other:[] };
    mealLogs[dayIdx].other = old;
  }
  if (!mealLogs[dayIdx][catId]) mealLogs[dayIdx][catId] = [];
  return mealLogs[dayIdx][catId];
}

function getAllEntries(dayIdx) {
  const cats = ['breakfast','lunch','dinner','snacks','other'];
  return cats.flatMap(c => getMealCatEntries(dayIdx, c));
}

function renderMealCategories() {
  const el = document.getElementById('meal-categories');
  if (!el) return;
  el.innerHTML = MEAL_CATS.map(cat => {
    const entries = getMealCatEntries(nutDay, cat.id);
    const totalCal = entries.reduce((s,e) => s+e.cal, 0);
    const totalPro = entries.reduce((s,e) => s+e.pro, 0);
    const totalCarb = entries.reduce((s,e) => s+e.carb, 0);
    const totalFat = entries.reduce((s,e) => s+e.fat, 0);
    const entryRows = entries.map((e,i) =>
      `<div class="meal-entry-row">
        <div><div class="mer-name">${e.name}</div><div class="mer-macros">${e.pro}g P · ${e.carb}g C · ${e.fat}g F</div></div>
        <div class="mer-cal">${e.cal}</div>
        <button class="mer-del" onclick="deleteCatMeal('${cat.id}',${i})">✕</button>
      </div>`
    ).join('');
    const totalRow = entries.length ? `<div class="meal-cat-total"><span>${totalPro}g protein</span><span>${totalCarb}g carbs</span><span>${totalFat}g fat</span><span style="color:var(--green)">${totalCal} cal</span></div>` : '';
    return `<div class="meal-cat-card">
      <div class="meal-cat-header">
        <div class="meal-cat-left" style="gap:10px;flex:1">
          <div><div class="meal-cat-name">${cat.label}</div>${totalCal>0?`<div class="meal-cat-cals">${totalCal} cal</div>`:''}</div>
        </div>
      </div>
      ${entryRows ? `<div class="meal-cat-entries">${entryRows}${totalRow}</div>` : '<div style="padding:8px 12px;font-size:0.75rem;color:var(--dim)">No items logged. Use AI Coach to log food.</div>'}
    </div>`;
  }).join('');
}

function deleteCatMeal(catId, idx) {
  getMealCatEntries(nutDay, catId).splice(idx, 1);
  renderMealCategories(); renderMacros(); saveToStorage();
}

// ── FOOD MODAL ──
function openFoodModal(catId) {
  activeFoodCat = catId;
  foodModalTab = 'search';
  document.getElementById('food-modal').classList.add('open');
  document.getElementById('food-modal-cat-label').textContent =
    MEAL_CATS.find(c=>c.id===catId)?.label || catId;
  document.getElementById('food-modal-search-input').value = '';
  document.getElementById('food-modal-results').innerHTML = '';
  showFoodModalTab('search');
  renderRecentFoods();
  setTimeout(()=>document.getElementById('food-modal-search-input').focus(), 100);
}

function closeFoodModal() {
  document.getElementById('food-modal').classList.remove('open');
}

function showFoodModalTab(tab) {
  foodModalTab = tab;
  document.querySelectorAll('.fmt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const resultsEl = document.getElementById('food-modal-results');
  if (tab === 'recent') renderRecentFoodsInModal();
  else if (tab === 'custom') renderCustomFoodsInModal();
  else resultsEl.innerHTML = '<div class="food-modal-empty">Search above or scan a barcode to find foods</div>';
}

// Recent foods
function getRecentFoods() { return lsGet('fs_recent_foods') || []; }
function saveRecentFood(item) {
  let recents = getRecentFoods();
  recents = [item, ...recents.filter(r => r.name !== item.name)].slice(0, 20);
  lsSet('fs_recent_foods', recents);
}

function renderRecentFoods() {
  const recents = getRecentFoods();
  if (!recents.length) return;
  const resultsEl = document.getElementById('food-modal-results');
  if (foodModalTab === 'recent') renderRecentFoodsInModal();
}

function renderRecentFoodsInModal() {
  const recents = getRecentFoods();
  const resultsEl = document.getElementById('food-modal-results');
  if (!recents.length) {
    resultsEl.innerHTML = '<div class="food-modal-empty">No recent foods yet. Search to find and log foods.</div>';
    return;
  }
  resultsEl.innerHTML = `<div class="recent-foods-section"><div class="rfs-label">Recently Logged</div></div>` +
    recents.map((item, i) =>
      `<div class="food-modal-item" onclick="openServingModal(${i}, 'recent')">
        <div>
          <div class="fmi-name">${item.name}</div>
          ${item.brand ? `<div class="fmi-brand">${item.brand}</div>` : ''}
          <div class="fmi-macros">${item.pro100 ? Math.round(item.pro100)+'g P · '+Math.round(item.carb100)+'g C · '+Math.round(item.fat100)+'g F per 100g' : item.pro+'g P · '+item.carb+'g C · '+item.fat+'g F'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="fmi-cal">${Math.round(item.cal100 || item.cal)}</div>
          <button class="fmi-add">+</button>
        </div>
      </div>`
    ).join('');
  window._recentResults = recents;
}

// Custom foods
function getCustomFoods() { return lsGet('fs_custom_foods') || []; }
function saveCustomFood(item) {
  let customs = getCustomFoods();
  customs = [item, ...customs.filter(c => c.name !== item.name)];
  lsSet('fs_custom_foods', customs);
}

function renderCustomFoodsInModal() {
  const customs = getCustomFoods();
  const resultsEl = document.getElementById('food-modal-results');
  if (!customs.length) {
    resultsEl.innerHTML = `<div class="food-modal-empty">No custom foods saved yet.<br><br>
      <button onclick="openManualFoodEntry()" style="padding:10px 20px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:10px;color:var(--green);font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:1.5px;cursor:pointer">+ CREATE CUSTOM FOOD</button>
    </div>`;
    return;
  }
  resultsEl.innerHTML = `<div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:flex-end">
    <button onclick="openManualFoodEntry()" style="padding:8px 14px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:8px;color:var(--green);font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:1px;cursor:pointer">+ NEW CUSTOM FOOD</button>
  </div>` +
  customs.map((item, i) =>
    `<div class="food-modal-item" onclick="openServingModal(${i}, 'custom')">
      <div>
        <div class="fmi-name">${item.name}</div>
        <div class="fmi-macros">${item.pro}g P · ${item.carb}g C · ${item.fat}g F per serving</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="fmi-cal">${item.cal}</div>
        <button class="fmi-add">+</button>
      </div>
    </div>`
  ).join('');
  window._customResults = customs;
}

function openManualFoodEntry() {
  closeFoodModal();
  document.getElementById('manual-food-modal').classList.add('open');
}

function closeManualFoodModal() {
  document.getElementById('manual-food-modal').classList.remove('open');
  ['mf-name','mf-cal','mf-pro','mf-carb','mf-fat','mf-serving'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function saveManualFood() {
  const name = document.getElementById('mf-name').value.trim();
  const cal = parseInt(document.getElementById('mf-cal').value) || 0;
  const pro = parseInt(document.getElementById('mf-pro').value) || 0;
  const carb = parseInt(document.getElementById('mf-carb').value) || 0;
  const fat = parseInt(document.getElementById('mf-fat').value) || 0;
  const serving = document.getElementById('mf-serving').value.trim() || '1 serving';
  if (!name) { alert('Please enter a food name'); return; }
  const item = { name, cal, pro, carb, fat, serving, isCustom: true };
  saveCustomFood(item);
  closeManualFoodModal();
  // Log it immediately
  getMealCatEntries(nutDay, activeFoodCat).push({ name, cal, pro, carb, fat });
  renderMealCategories(); renderMacros(); saveToStorage();
}

// ── FOOD SEARCH ──
// Normalize query: fix common brand spellings and strip extra punctuation
function normalizeQuery(q) {
  return q.trim()
    .replace(/chic+\s*fil+\s*a/i, 'Chick-fil-A')
    .replace(/mcdonalds?/i, "McDonald's")
    .replace(/chipotles?/i, 'Chipotle')
    .replace(/starbucks?/i, 'Starbucks')
    .replace(/[‘’]/g, "'");
}

// ── FOOD SEARCH ──
// wger.de: free, no API key, CORS-open, English food database (primary)
// Open Food Facts: branded/packaged foods, 5s timeout (secondary)

async function fetchWger(query) {
  const url = `https://wger.de/api/v2/ingredient/?format=json&language=2&name=${encodeURIComponent(query)}&limit=30`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('wger ' + res.status);
  const data = await res.json();
  const wgerSeen = new Set();
  let results = (data.results || []).filter(f => {
    if (!f.name || !f.energy || !/^[\x20-\x7E]+$/.test(f.name)) return false;
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g,'');
    if (wgerSeen.has(key)) return false;
    wgerSeen.add(key);
    return true;
  });
  if (!results.length) {
    const url2 = `https://wger.de/en/user/api/ingredient-search/?format=json&term=${encodeURIComponent(query)}`;
    const data2 = await fetch(url2).then(r=>r.json()).catch(()=>({}));
    const suggestions = data2.suggestions || [];
    const fetches = suggestions.slice(0, 8).map(s =>
      fetch(`https://wger.de/api/v2/ingredient/${s.data.id}/?format=json`)
        .then(r => r.json()).catch(() => null)
    );
    const items = (await Promise.all(fetches)).filter(i => i && i.energy > 0);
    results = items;
  }
  return results.map(f => {
    // Use shared smartServingG + label lookup
    let servingG = smartServingG(f.name);
    let servingLabel;
    if (servingG === 0) { servingG = 100; servingLabel = '100g'; }
    else {
      const sg = servingG;
      const n = (f.name || '').toLowerCase();
      if (sg === 50) servingLabel = '1 egg (50g)';
      else if (sg === 30) servingLabel = '1 slice (30g)';
      else if (sg === 28) servingLabel = '1 oz (28g)';
      else if (sg === 240) servingLabel = '1 cup (240ml)';
      else if (sg === 120) servingLabel = '1 medium (120g)';
      else if (sg === 170) servingLabel = '6 oz (170g)';
      else if (sg === 195) servingLabel = '1 cup cooked (195g)';
      else if (sg === 14) servingLabel = '1 tbsp (14g)';
      else if (sg === 110) servingLabel = '2 pancakes (110g)';
      else if (sg === 150) servingLabel = '1 medium (150g)';
      else if (sg === 32) servingLabel = '2 tbsp (32g)';
      else if (sg === 55) servingLabel = '1 cup (55g)';
      else servingLabel = sg + 'g';
    }
    const cal100 = Math.round(f.energy || 0);
    const pro100 = Math.round(parseFloat(f.protein) || 0);
    const carb100 = Math.round(parseFloat(f.carbohydrates) || 0);
    const fat100 = Math.round(parseFloat(f.fat) || 0);
    const factor = servingG / 100;
    return {
      name: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      brand: '',
      cal: Math.round(cal100 * factor),
      pro: Math.round(pro100 * factor),
      carb: Math.round(carb100 * factor),
      fat: Math.round(fat100 * factor),
      serving: servingLabel,
      servingG,
      cal100, pro100, carb100, fat100,
    };
  });
}

function smartServingG(name) {
  const n = (name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  if (n.includes('shake') || n.includes('core power') || n.includes('fairlife') || n.includes('protein milk') || n.includes('muscle milk')) return 414;
  if (n.includes('protein bar') || n.includes('quest bar') || n.includes('rx bar') || n.includes('clif bar')) return 60;
  if (n.includes('egg')) return 50;
  if (n.includes('bread') || n.includes('slice') || n.includes('tortilla')) return 45;
  if (n.includes('cheese') || n.includes('string')) return 28;
  if (n.includes('greek yogurt')) return 113;
  if (n.includes('milk') || n.includes('yogurt') || n.includes('kefir')) return 240;
  if (n.includes('juice') || n.includes('drink') || n.includes('beverage') || n.includes('water')) return 355;
  if (n.includes('banana') || n.includes('apple') || n.includes('orange')) return 120;
  if (n.includes('chicken') || n.includes('beef') || n.includes('salmon') || n.includes('tuna') || n.includes('turkey') || n.includes('steak') || n.includes('pork') || n.includes('fish')) return 170;
  if (n.includes('rice') || n.includes('oat') || n.includes('quinoa')) return 195;
  if (n.includes('pasta') || n.includes('noodle') || n.includes('spaghetti')) return 140;
  if (n.includes('pancake') || n.includes('waffle')) return 110;
  if (n.includes('almond') || n.includes('cashew') || n.includes('walnut') || n.includes('peanut')) return 28;
  if (n.includes('butter') || n.includes('peanut butter') || n.includes('almond butter')) return 32;
  if (n.includes('oil') || n.includes('olive')) return 14;
  if (n.includes('protein powder') || n.includes('whey') || n.includes('casein') || n.includes('scoop')) return 30;
  if (n.includes('granola') || n.includes('cereal')) return 55;
  if (n.includes('cookie') || n.includes('brownie') || n.includes('muffin')) return 55;
  if (n.includes('avocado')) return 150;
  if (n.includes('sweet potato') || n.includes('potato')) return 150;
  if (n.includes('cottage cheese') || n.includes('sour cream')) return 113;
  if (n.includes('hummus')) return 56;
  if (n.includes('ground beef') || n.includes('ground turkey') || n.includes('ground pork')) return 113;
  if (n.includes('mixed nuts') || n.includes('trail mix') || n.includes('sunflower')) return 28;
  if (n.includes('soup') || n.includes('broth')) return 245;
  if (n.includes('cracker') || n.includes('pretzel') || n.includes('chip')) return 28;
  if (n.includes('broccoli') || n.includes('spinach') || n.includes('kale') || n.includes('salad')) return 85;
  if (n.includes('corn') || n.includes('peas') || n.includes('green bean')) return 85;
  if (n.includes('tofu') || n.includes('tempeh') || n.includes('edamame')) return 85;
  if (n.includes('blueberry') || n.includes('strawberry') || n.includes('raspberry')) return 148;
  return 0; // no smart default, use 100g
}

async function fetchOFF(query) {
  const url = 'https://world.openfoodfacts.org/api/v2/search?search_terms=' + encodeURIComponent(query) + '&fields=product_name,brands,nutriments,serving_size,serving_quantity,lang,lc&page_size=30&sort_by=unique_scans_n&lc=en&cc=us';
  const fetchPromise = fetch(url).then(function(r) { return r.json(); });
  const timeoutPromise = new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('timeout')); }, 6000); });
  const res_data = await Promise.race([fetchPromise, timeoutPromise]);
  const data = res_data;
  const seen = new Set();
  const _nonEnFood = /\b(fromage|lait|beurre|yaourt|jus de|blanc|noir|doux|pâté|crème|frais|confiture|noisette|fraise|vanille|sucre|farine|huile|vinaigre|miel|légume|poisson|poulet|boeuf|porc|lentille|haricot|oignon|carotte|pomme de terre|perly|jaouda|jben|lactel|président|bjorg|bonduelle|paysan|breton|vache|leche|queso|mantequilla|harina|arroz|aceite|azucar)\b/i;
  return (data.products || []).filter(p =>
    p.product_name && /^[\x20-\x7E]+$/.test(p.product_name) &&
    !_nonEnFood.test(p.product_name) &&
    p.nutriments && (p.nutriments['energy-kcal_100g'] > 0 || p.nutriments['energy-kcal'] > 0)
  ).map(p => {
    const cal100 = p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0;
    const pro100 = p.nutriments['proteins_100g'] || 0;
    const carb100 = p.nutriments['carbohydrates_100g'] || 0;
    const fat100 = p.nutriments['fat_100g'] || 0;
    // Use OFF serving if available, else smart default, else 100g
    let sg = parseFloat(p.serving_quantity) || 0;
    let servingLabel = p.serving_size || '';
    if (!sg) {
      sg = smartServingG(p.product_name);
    }
    // Build a nice label if we don't have one from OFF
    if (!servingLabel && sg > 0) {
      const n = (p.product_name||'').toLowerCase();
      if (sg === 28) servingLabel = '1 oz (28g)';
      else if (sg === 50) servingLabel = '1 egg (50g)';
      else if (sg === 30) servingLabel = '1 slice (30g)';
      else if (sg === 45) servingLabel = '1 tortilla (45g)';
      else if (sg === 240) servingLabel = '1 cup (240ml)';
      else if (sg === 414) servingLabel = '1 bottle (414ml)';
      else if (sg === 170) servingLabel = '6 oz (170g)';
      else if (sg === 195) servingLabel = '1 cup cooked (195g)';
      else if (sg === 14) servingLabel = '1 tbsp (14g)';
      else if (sg === 32) servingLabel = '2 tbsp (32g)';
      else if (sg === 110) servingLabel = '2 pancakes (110g)';
      else if (sg === 60) servingLabel = '1 bar (60g)';
      else if (sg === 30) servingLabel = '1 scoop (30g)';
      else servingLabel = sg + 'g';
    }
    if (!servingLabel) servingLabel = '100g';
    if (!sg) sg = 100;
    const factor = sg / 100;
    return {
      name: p.product_name, brand: (p.brands || '').split(',')[0].trim(),
      cal: Math.round(cal100 * factor), pro: Math.round(pro100 * factor),
      carb: Math.round(carb100 * factor), fat: Math.round(fat100 * factor),
      cal100, pro100, carb100, fat100,
      serving: servingLabel, servingG: sg,
    };
  }).filter(p => {
    // Deduplicate: keep first occurrence of each name
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    // Relevance guard: at least one query word must appear in name or brand
    // Prevents OFF returning totally unrelated popular items (cream cheese for "chicken")
    const haystack = (p.name + ' ' + (p.brand || '')).toLowerCase();
    const qw = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    return qw.some(w => haystack.includes(w));
  });
}

function renderFoodResults(results, resultsEl) {
  window._searchResults = results;
  if (!results.length) {
    resultsEl.innerHTML = '<div class="food-modal-empty">No matching results. Try a shorter search term.</div>';
    return;
  }
  resultsEl.innerHTML = results.slice(0, 30).map((item, i) => {
    const srcBadge = item._source === 'usda_branded'
      ? '<span style="font-size:0.58rem;font-weight:700;letter-spacing:0.8px;background:rgba(74,222,128,0.1);color:var(--green);border:1px solid rgba(74,222,128,0.2);border-radius:3px;padding:1px 5px;margin-left:5px">USDA</span>'
      : item._source === 'usda_foundation'
      ? '<span style="font-size:0.58rem;font-weight:700;letter-spacing:0.8px;background:rgba(96,165,250,0.1);color:var(--blue);border:1px solid rgba(96,165,250,0.2);border-radius:3px;padding:1px 5px;margin-left:5px">USDA</span>'
      : '';
    return `<div class="food-modal-item" onclick="openServingModal(${i}, 'search')">
      <div style="flex:1;min-width:0">
        <div class="fmi-name">${item.name}${srcBadge}</div>
        ${item.brand ? `<div class="fmi-brand">${item.brand}</div>` : ''}
        <div class="fmi-macros">${item.pro}g P · ${item.carb}g C · ${item.fat}g F · <span style="color:var(--dim)">per ${item.serving || '100g'}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="fmi-cal">${item.cal}<span style="font-size:0.6rem;color:var(--dim)"> cal</span></div>
        <button class="fmi-add">+</button>
      </div>
    </div>`;
  }).join('');
}

async function searchFoodModal() {
  const rawQuery = document.getElementById('food-modal-search-input').value.trim();
  if (!rawQuery) return;
  const resultsEl = document.getElementById('food-modal-results');
  resultsEl.innerHTML = '<div class="food-modal-loading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Searching...</div>';

  const query = normalizeQuery(rawQuery);

  // Words that are brand/filler words — should NOT dominate scoring
  // "just", "bare", "simple", "pure", etc. are brand names or adjectives, not food nouns
  const FILLER_WORDS = new Set(['just','bare','simply','pure','real','natural','organic','fresh',
    'original','classic','the','and','with','in','of','for','my','your','our','new',
    'easy','quick','good','best','great','big','little','small','light','lite','low','high',
    'free','no','non','ultra','super','mega','extra','premium','select','choice','true','clean']);

  // Split query into food-noun words vs filler words
  const allQWords = query.toLowerCase().split(/\s+/).filter(function(w){ return w.length > 1; });
  const foodWords  = allQWords.filter(function(w){ return !FILLER_WORDS.has(w); });
  const fillerWords = allQWords.filter(function(w){ return FILLER_WORDS.has(w); });

  // If user typed only filler (e.g. "just"), fall back to full query
  const coreWords = foodWords.length > 0 ? foodWords : allQWords;

  // Build multiple search queries to maximize recall:
  // 1. Full query ("just bare chicken") — catches exact brand matches
  // 2. Core food noun only ("chicken") — catches all chicken products
  // 3. Brand-only words ("just bare") + food noun — catches "Just Bare" branded items
  const coreQuery = coreWords.join(' ');
  const brandQuery = fillerWords.length > 0 ? fillerWords.join(' ') + ' ' + coreWords[0] : null;

  const searches = [
    _searchUSDA_branded(query),           // exact brand phrase
    _searchUSDA_branded(coreQuery),       // food noun only (broadest)
    _searchUSDA_foundation(coreQuery),    // whole foods
    fetchOFF(query)
  ];
  // If there are brand/filler words, fire an extra search combining brand + first food noun
  if (brandQuery && brandQuery !== query && brandQuery !== coreQuery) {
    searches.push(_searchUSDA_branded(brandQuery));
  }

  const settled = await Promise.allSettled(searches);

  const allItems = [];
  settled.forEach(function(r) {
    if (r.status === 'fulfilled') {
      r.value.forEach(function(item) { allItems.push(item); });
    }
  });

  // WEIGHTED scoring:
  // - Each FOOD WORD match in name: 20 pts
  // - Each FOOD WORD match in brand: 8 pts
  // - Each FILLER WORD match: 2 pts (much lower — "bare" matching "bare muffin" shouldn't compete with "chicken")
  // - Exact full-query match anywhere: 30 pts bonus
  // - All food words present: 15 pts bonus (the result contains every core word)
  // - Penalty: each extra word in result name beyond query length: -3 pts
  function scoreItem(item) {
    const nameLower  = (item.name  || '').toLowerCase();
    const brandLower = (item.brand || '').toLowerCase();
    const haystack   = nameLower + ' ' + brandLower;
    let score = 0;

    foodWords.forEach(function(w) {
      if (nameLower.includes(w))  score += 20;
      if (brandLower.includes(w)) score += 8;
    });
    fillerWords.forEach(function(w) {
      if (haystack.includes(w)) score += 2;
    });

    // Big bonus if EVERY food word is in the name (e.g. "chicken" AND "breast" both present)
    const allFoodWordsInName = foodWords.every(function(w){ return nameLower.includes(w); });
    if (allFoodWordsInName && foodWords.length > 0) score += 15;

    // Exact full query bonus
    if (haystack.includes(query.toLowerCase())) score += 30;

    // Penalty for long result names (keeps specific results above generic ones)
    const resultWordCount = nameLower.split(/\s+/).length;
    score -= Math.max(0, resultWordCount - allQWords.length - 1) * 3;

    // USDA Branded is most reliable source
    if (item._source === 'usda_branded') score += 4;

    return score;
  }

  // Merge, deduplicate, filter to items scoring > 0
  const seen = new Set();
  const merged = [];
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const key = ((item.name || '') + '|' + (item.brand || '')).toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    item._score = scoreItem(item);
    if (item._score > 0) merged.push(item);
  }

  merged.sort(function(a, b) { return b._score - a._score; });

  if (merged.length) {
    renderFoodResults(merged, resultsEl);
  } else {
    resultsEl.innerHTML = '<div class="food-modal-empty">'
      + '<div style="font-size:1.2rem;margin-bottom:8px">\uD83D\uDD0D</div>'
      + 'No results for "<strong>' + rawQuery + '</strong>".<br><br>'
      + 'Try a shorter term like <em>chicken breast</em> or <em>white rice</em>, or add it manually.<br><br>'
      + '<button onclick="searchFoodModal()" style="padding:10px 20px;background:var(--card);border:1px solid var(--border2);border-radius:10px;color:var(--green);font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1px;cursor:pointer">\u21BA RETRY</button>'
      + ' <button onclick="openManualFoodEntry()" style="padding:10px 20px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:10px;color:var(--green);font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1px;cursor:pointer">+ ADD CUSTOM</button>'
      + '</div>';
  }
}

// ── SERVING MODAL ──
function openServingModal(idx, source) {
  let item;
  if (source === 'search') {
    const p = window._searchResults[idx];
    // All sources (USDA, OFF, wger) now use unified format with cal100/pro100/carb100/fat100
    item = { name: p.name, brand: p.brand,
      cal100:  p.cal100  != null ? p.cal100  : p.cal,
      pro100:  p.pro100  != null ? p.pro100  : p.pro,
      carb100: p.carb100 != null ? p.carb100 : p.carb,
      fat100:  p.fat100  != null ? p.fat100  : p.fat,
      serving_quantity: p.servingG || 100,
      serving_size: p.serving || '100g',
      isFlat: true };
  } else if (source === 'recent') {
    item = window._recentResults[idx];
  } else if (source === 'custom') {
    const c = window._customResults[idx];
    item = { name: c.name, cal100: c.cal, pro100: c.pro, carb100: c.carb, fat100: c.fat, isCustom: true };
  }
  if (!item) return;
  currentFoodItem = item;
  document.getElementById('sm-food-name').textContent = item.name;
  document.getElementById('sm-food-brand').textContent = item.brand || '';
  
  // Build quick serving buttons
  const quickEl = document.getElementById('sm-quick-servings');
  const servings = [];
  if (item.serving_quantity && item.serving_size) {
    servings.push({ label: item.serving_size, grams: parseFloat(item.serving_quantity) });
  } else if (item.serving_quantity) {
    servings.push({ label: `1 serving (${item.serving_quantity}g)`, grams: parseFloat(item.serving_quantity) });
  }
  servings.push({ label: '100g', grams: 100 });
  if (item.isCustom) servings.splice(0, 0, { label: '1 serving', grams: 100 });
  
  quickEl.innerHTML = servings.map((s,i) => 
    `<button onclick="setServingQuick(${s.grams})" style="padding:6px 12px;background:var(--dark);border:1px solid var(--border);border-radius:8px;color:var(--off);font-family:'Inter',sans-serif;font-size:0.78rem;cursor:pointer;transition:all 0.15s" 
    onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'" 
    onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--off)'">${s.label}</button>`
  ).join('');
  
  // Default to serving size if available, else 100g
  const defaultGrams = (item.serving_quantity ? parseFloat(item.serving_quantity) : 100);
  document.getElementById('sm-grams').value = defaultGrams;
  document.getElementById('sm-unit').value = 'g';
  updateServingCalc();
  document.getElementById('serving-modal').classList.add('open');
}

function setServingQuick(grams) {
  document.getElementById('sm-grams').value = grams;
  document.getElementById('sm-unit').value = 'g';
  updateServingCalc();
}

function updateServingCalc() {
  if (!currentFoodItem) return;
  const amt = parseFloat(document.getElementById('sm-grams').value) || 100;
  const unit = document.getElementById('sm-unit').value;
  let factor;
  if (unit === 'g') factor = amt / 100;
  else if (unit === 'oz') factor = (amt * 28.3495) / 100;
  else if (unit === 'ml') factor = amt / 100; // approximate for liquids
  else factor = amt / 100;
  document.getElementById('sm-cal').textContent = Math.round((currentFoodItem.cal100 || 0) * factor);
  document.getElementById('sm-pro').textContent = Math.round((currentFoodItem.pro100 || 0) * factor) + 'g';
  document.getElementById('sm-carb').textContent = Math.round((currentFoodItem.carb100 || 0) * factor) + 'g';
  document.getElementById('sm-fat').textContent = Math.round((currentFoodItem.fat100 || 0) * factor) + 'g';
}

function closeServingModal() {
  document.getElementById('serving-modal').classList.remove('open');
  currentFoodItem = null;
}

function confirmLogFood() {
  if (!currentFoodItem) return;
  const amt = parseFloat(document.getElementById('sm-grams').value) || 100;
  const unit = document.getElementById('sm-unit').value;
  let factor;
  if (unit === 'g') factor = amt / 100;
  else if (unit === 'oz') factor = (amt * 28.3495) / 100;
  else if (unit === 'ml') factor = amt / 100;
  else factor = amt / 100;
  const entry = {
    name: currentFoodItem.name + ` (${amt}${unit})`,
    cal: Math.round((currentFoodItem.cal100 || 0) * factor),
    pro: Math.round((currentFoodItem.pro100 || 0) * factor),
    carb: Math.round((currentFoodItem.carb100 || 0) * factor),
    fat: Math.round((currentFoodItem.fat100 || 0) * factor),
  };
  getMealCatEntries(nutDay, activeFoodCat).push(entry);
  saveRecentFood(currentFoodItem);
  closeServingModal();
  renderMealCategories(); renderMacros(); saveToStorage();
}

// ── BARCODE SCANNER ──
let barcodeStream = null;
let barcodeDetectorInterval = null;

function openBarcodeScanner(catId) {
  activeFoodCat = catId;
  const modal = document.getElementById('barcode-modal');
  if (!modal) return;
  document.getElementById('barcode-input').value = '';
  modal.style.display = 'flex';
  startCameraScanner();
}

function closeBarcodeModal() {
  stopCameraScanner();
  document.getElementById('barcode-modal').style.display = 'none';
}

async function startCameraScanner() {
  const video = document.getElementById('barcode-video');
  const status = document.getElementById('barcode-scan-status');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (status) status.textContent = 'Camera not supported — enter barcode below';
    return;
  }
  try {
    if (status) status.textContent = 'Starting camera...';
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = barcodeStream;
    await video.play();
    if (status) status.textContent = 'Point camera at barcode';

    // Try native BarcodeDetector first (Chrome/Android)
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39'] });
      barcodeDetectorInterval = setInterval(async () => {
        if (video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            stopCameraScanner();
            document.getElementById('barcode-modal').style.display = 'none';
            lookupBarcode(code);
          }
        } catch(e) {}
      }, 350);
    } else {
      // Fallback: canvas-based barcode scanning for Safari/iOS
      if (status) status.textContent = 'Scanning... hold barcode steady';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      barcodeDetectorInterval = setInterval(() => {
        if (video.readyState < 2) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        // Read the center strip of the image for barcode-like patterns
        // Use manual barcode entry as primary fallback
      }, 500);
      if (status) status.textContent = 'Auto-detect not available on this browser — enter barcode number below';
    }
  } catch(e) {
    console.error('Camera error:', e.name, e.message);
    if (e.name === 'NotAllowedError') {
      if (status) status.textContent = 'Camera permission denied — check browser settings, or enter barcode below';
    } else {
      if (status) status.textContent = 'Camera unavailable — enter barcode below';
    }
  }
}

function stopCameraScanner() {
  if (barcodeDetectorInterval) { clearInterval(barcodeDetectorInterval); barcodeDetectorInterval = null; }
  if (barcodeStream) { barcodeStream.getTracks().forEach(t => t.stop()); barcodeStream = null; }
  const video = document.getElementById('barcode-video');
  if (video) video.srcObject = null;
}

function submitBarcode() {
  const code = document.getElementById('barcode-input').value.trim();
  if (!code) return;
  const status = document.getElementById('barcode-lookup-status');
  if (status) { status.textContent = 'Looking up...'; status.style.color = 'var(--green)'; }
  closeBarcodeModal();
  lookupBarcode(code);
}

async function lookupBarcode(barcode) {
  // Show loading in food modal
  const foodModal = document.getElementById('food-modal');
  if (foodModal) {
    foodModal.style.display = 'flex';
    const resultsEl = document.getElementById('food-modal-results');
    if (resultsEl) resultsEl.innerHTML = '<div class="food-modal-loading">Looking up barcode...</div>';
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { method: 'GET', mode: 'cors', credentials: 'omit', signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      const resultsEl = document.getElementById('food-modal-results');
      if (resultsEl) resultsEl.innerHTML = `<div class="food-modal-empty">Product not found for barcode ${barcode}. Try searching by name instead.</div>`;
      return;
    }
    const p = data.product;
    const n = p.nutriments || {};
    const cal100 = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
    const pro100 = Math.round(n['proteins_100g'] || 0);
    const carb100 = Math.round(n['carbohydrates_100g'] || 0);
    const fat100 = Math.round(n['fat_100g'] || 0);
    let sg = parseFloat(p.serving_quantity) || 0;
    let servingLabel = p.serving_size || '';
    if (!sg) { sg = smartServingG(p.product_name || ''); }
    if (!servingLabel && sg > 0) servingLabel = sg + 'g';
    if (!servingLabel) servingLabel = '100g';
    if (!sg) sg = 100;
    const factor = sg / 100;
    const formatted = {
      name: p.product_name || 'Unknown Product',
      brand: (p.brands || '').split(',')[0].trim(),
      cal: Math.round(cal100 * factor), pro: Math.round(pro100 * factor),
      carb: Math.round(carb100 * factor), fat: Math.round(fat100 * factor),
      cal100, pro100, carb100, fat100,
      serving: servingLabel, servingG: sg
    };
    window._searchResults = [formatted];
    openServingModal(0, 'search');
  } catch(e) {
    const resultsEl = document.getElementById('food-modal-results');
    if (resultsEl) resultsEl.innerHTML = `<div class="food-modal-empty">Barcode lookup failed. Try searching by name.</div>`;
  }
}

// Compatibility shim for old logMeal/deleteMeal
function logMeal() {
  const name = document.getElementById('n-name')?.value?.trim() || 'Meal';
  const cal = parseInt(document.getElementById('n-cal-in')?.value) || 0;
  const pro = parseInt(document.getElementById('n-pro-in')?.value) || 0;
  const carb = parseInt(document.getElementById('n-carb-in')?.value) || 0;
  const fat = parseInt(document.getElementById('n-fat-in')?.value) || 0;
  getMealCatEntries(nutDay, 'other').push({name,cal,pro,carb,fat});
  renderMealCategories(); renderMacros(); saveToStorage();
}
function deleteMeal(i) { /* handled by deleteCatMeal now */ }

function renderNutrition() {
  document.getElementById('day-picker-nav').innerHTML = DAYS_SHORT.map((d,i)=>
    `<button class="dp-btn ${i===nutDay?'active':''}" onclick="selectNutDay(${i},this)">${d}${i===TODAY_IDX?' · Today':''}</button>`
  ).join('');
  document.getElementById('n-cal-tgt').textContent = 'of '+TARGETS.cal.toLocaleString();
  document.getElementById('n-pro-tgt').textContent = 'of '+TARGETS.pro+'g';
  document.getElementById('n-carb-tgt').textContent = 'of '+TARGETS.carb+'g';
  document.getElementById('n-fat-tgt').textContent = 'of '+TARGETS.fat+'g';
  // Load water logs from storage
  waterLogs = lsGet('fs_water') || {};
  renderWater();
  renderMacros(); renderMealCategories();
  renderTodayMiniLog();
}

function selectNutDay(idx, btn) {
  nutDay = idx;
  document.querySelectorAll('.dp-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderWater(); renderMacros(); renderMealCategories();
}

function renderMacros() {
  const allEntries = getAllEntries(nutDay);
  const t = allEntries.reduce((a,e)=>({cal:a.cal+e.cal,pro:a.pro+e.pro,carb:a.carb+e.carb,fat:a.fat+e.fat}),{cal:0,pro:0,carb:0,fat:0});
  [['cal',TARGETS.cal,'','n-cal','n-cal-bar'],['pro',TARGETS.pro,'g','n-pro','n-pro-bar'],['carb',TARGETS.carb,'g','n-carb','n-carb-bar'],['fat',TARGETS.fat,'g','n-fat','n-fat-bar']].forEach(([k,tgt,u,vid,bid])=>{
    const over = t[k] > tgt, pct = Math.min(t[k]/tgt*100,100);
    const el = document.getElementById(vid), bar = document.getElementById(bid);
    el.textContent = (k==='cal' ? t[k].toLocaleString() : t[k]) + u;
    el.className = 'mb-val'+(over?' over':'');
    bar.style.width = pct+'%';
    bar.className = 'mb-fill'+(over?' over':'');
  });
  if (nutDay===TODAY_IDX) { refreshDashMacros(); renderTodayMiniLog(); }
}

function renderMealList() {
  const entries = mealLogs[nutDay];
  const list = document.getElementById('meal-list');
  if (!entries.length) { list.innerHTML = '<div class="empty"><div class="empty-icon">🍽️</div>No meals logged yet.</div>'; return; }
  list.innerHTML = entries.map((e,i)=>
    `<div class="meal-row"><div><div class="mr-name">${e.name}</div><div class="mr-macros"><span class="mp">${e.pro}g P</span><span class="mc">${e.carb}g C</span><span class="mf">${e.fat}g F</span></div></div><div class="mr-cal">${e.cal} cal</div><button class="mr-del" onclick="deleteMeal(${i})">✕</button></div>`
  ).join('');
}

function logMeal() {
  const name = document.getElementById('n-name').value.trim()||'Meal';
  const cal = parseInt(document.getElementById('n-cal-in').value)||0;
  const pro = parseInt(document.getElementById('n-pro-in').value)||0;
  const carb = parseInt(document.getElementById('n-carb-in').value)||0;
  const fat = parseInt(document.getElementById('n-fat-in').value)||0;
  mealLogs[nutDay].push({name,cal,pro,carb,fat});
  ['n-name','n-cal-in','n-pro-in','n-carb-in','n-fat-in'].forEach(id=>document.getElementById(id).value='');
  toggleLog('nt-log-form','nt-plus');
  renderMacros(); renderMealList(); saveToStorage();
}

function quickLog() {
  openQuickFoodModal();
}
function deleteMeal(i) { mealLogs[nutDay].splice(i,1); renderMacros(); renderMealList(); saveToStorage(); }

function toggleLog(formId, iconId) {
  const open = document.getElementById(formId).classList.toggle('open');
  document.getElementById(iconId).textContent = open ? '−' : '+';
}

// ── BODY WEIGHT LOGGING ──
function getWeightLog() { return lsGet('fs_weight_log') || []; }

function logBodyWeight() {
  const input = document.getElementById('weight-log-input');
  const lbs = parseFloat(input.value);
  if (!lbs || lbs < 50 || lbs > 600) { alert('Please enter a valid weight (50–600 lbs)'); return; }
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
    drawSVGLine('weight-chart', pts, '#4ADE80', 'rgba(74,222,128,0.08)', W, 140, 34, 8, 8, 20);
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
    const color = good ? '#4ADE80' : diff===0 ? 'var(--dim)' : '#f87171';
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
      const changeStr = change === 0 ? '' : `<span style="font-size:0.72rem;color:${change<0?'#4ADE80':'#f87171'}">${change>0?'+':''}${change.toFixed(1)}</span>`;
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
    <polyline points="${calPoly}" fill="none" stroke="#4ADE80" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
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
        rx="3" fill="${isThisWeek ? 'var(--green)' : 'rgba(74,222,128,0.35)'}"/>
      <text x="${(x + bw/2).toFixed(1)}" y="${H}" font-size="8" fill="rgba(255,255,255,0.4)"
        text-anchor="middle" font-family="DM Mono,monospace">${lbl}</text>
      ${count > 0 ? `<text x="${(x + bw/2).toFixed(1)}" y="${(by - 3).toFixed(1)}" font-size="9" fill="${isThisWeek ? 'var(--green)' : 'rgba(255,255,255,0.5)'}" text-anchor="middle" font-family="DM Mono,monospace">${count}</text>` : ''}
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
      : '<span style="font-size:0.6rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(74,222,128,0.07);color:var(--green);padding:2px 7px;border-radius:4px;border:1px solid rgba(74,222,128,0.15)">'+wPhase.name+'</span>';
    const badge = isDone
      ? '<span style="font-size:0.65rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--green-dim);color:var(--green);padding:3px 9px;border-radius:5px">✓ Done</span>'
      : isCurrent
      ? '<span style="font-size:0.65rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--orange-dim);color:var(--orange);padding:3px 9px;border-radius:5px">In Progress</span>'
      : '';
    const rowId = 'wrow-'+w;
    const days = GYM_DAYS.map(i=>{
      const wo = DAY_WORKOUTS[i];
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--dark);border:1px solid var(--border);border-radius:9px"><div style="font-size:0.83rem;color:var(--off)">${DAYS_FULL[i]} · ${wo?wo.name:'Workout'}</div><div style="font-size:0.7rem;font-family:'DM Mono',monospace;color:${isDone?'var(--green)':'var(--dim)'}">${isDone?'✓ Complete':'Upcoming'}</div></div>`;
    }).join('');
    card.innerHTML = `<div class="log-toggle-header" onclick="toggleWeekRow('${rowId}')" style="padding:16px 20px">
      <div style="display:flex;align-items:center;gap:10px"><div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px;color:${isCurrent?'var(--white)':'var(--dim)'}">WEEK ${w}</div>${phaseTag}${badge}</div>
      <div style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--dim)">${isDone?GYM_DAYS.length+'/'+GYM_DAYS.length+' workouts':isCurrent?'0/'+GYM_DAYS.length+' workouts':'Upcoming'}</div></div>
      <div id="${rowId}" style="display:${isCurrent?'block':'none'};padding:0 20px 16px"><div style="display:flex;flex-direction:column;gap:8px">${days}</div></div>`;
    accordion.appendChild(card);
  }
}

function toggleWeekRow(id) { const r=document.getElementById(id); if(r) r.style.display=r.style.display==='block'?'none':'block'; }

// ── SETTINGS ──
function renderSettingsGymDays() {
  const container = document.getElementById('settings-gym-days'); if (!container) return;
  container.innerHTML = '';
  DAYS_SHORT.forEach((d,i)=>{
    const active = GYM_DAYS.includes(i);
    const el = document.createElement('div');
    el.textContent = d; el.dataset.idx = i; if(active) el.dataset.active='1';
    el.style.cssText = `padding:10px 16px;border-radius:8px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'var(--green-dim)':'var(--dark)'};color:${active?'var(--green)':'var(--dim)'};font-family:'DM Mono',monospace;font-size:0.8rem;cursor:pointer;transition:all 0.2s`;
    el.onclick = function(){
      const now = !this.dataset.active; this.dataset.active=now?'1':'';
      this.style.borderColor=now?'var(--green)':'var(--border)';
      this.style.background=now?'var(--green-dim)':'var(--dark)';
      this.style.color=now?'var(--green)':'var(--dim)';
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
    USER.weight = newWeight;
    // Recalculate macros if weight changed meaningfully (>1 lb diff)
    const prevWeight = parseFloat(USER.weight) || newWeight;
    if (Math.abs(prevWeight - newWeight) > 0.5) {
      const n = calcNutrition(newWeight, newGoal || USER.goal, USER.weeks || 12, USER.gender || 'Male', USER.age || 30, USER.heightCm || 175, USER.activity || 'moderate');
      USER.nutrition = n;
      TARGETS.cal  = n.calories;
      TARGETS.pro  = n.protein;
      TARGETS.carb = n.carbs;
      TARGETS.fat  = n.fat;
      document.getElementById('s-cal').value  = n.calories;
      document.getElementById('s-pro').value  = n.protein;
      document.getElementById('s-carb').value = n.carbs;
      document.getElementById('s-fat').value  = n.fat;
    }
  }
  if (newGoal && USER) USER.goal = newGoal;
  lsSet('fs_user', USER);

  // Also allow manual override of macro targets
  TARGETS.cal  = parseInt(document.getElementById('s-cal').value)  || TARGETS.cal;
  TARGETS.pro  = parseInt(document.getElementById('s-pro').value)  || TARGETS.pro;
  TARGETS.carb = parseInt(document.getElementById('s-carb').value) || TARGETS.carb;
  TARGETS.fat  = parseInt(document.getElementById('s-fat').value)  || TARGETS.fat;
  refreshDashMacros(); renderMacros(); saveToStorage();

  const btn = document.getElementById('save-btn'), orig = btn.textContent;
  btn.textContent='✓ SAVED'; btn.style.background='var(--green-dim)'; btn.style.color='var(--green)'; btn.style.border='1px solid rgba(74,222,128,0.3)';
  setTimeout(()=>{ btn.textContent=orig; btn.style.background='var(--green)'; btn.style.color='var(--black)'; btn.style.border='none'; }, 1800);
}

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

function openWorkoutEnv(dayIdx) {
  const workout = DAY_WORKOUTS[dayIdx];
  if (!workout || !workout.exercises.length) {
    openUnplannedWorkout(dayIdx);
    return;
  }
  woDay = dayIdx;
  woCurrentEx = 0;
  woWorkout = workout;
  woPRs = [];
  woStartTime = Date.now();
  const draft = getWorkoutDraft(dayIdx);
  if (draft && draft.sets) {
    woSets = draft.sets;
    if (draft.extraSets) woExtraSets = draft.extraSets;
  } else {
    woSets = {}; woExtraSets = {};
  }

  document.getElementById('wo-title').textContent = workout.name.toUpperCase() + ' — ' + DAYS_FULL[dayIdx].toUpperCase();
  const dayTitleEl = document.getElementById('wo-day-title');
  if (dayTitleEl) dayTitleEl.textContent = workout.name.toUpperCase();
  const daySubEl = document.getElementById('wo-day-subtitle');
  if (daySubEl) daySubEl.textContent = DAYS_FULL[dayIdx];

  // Show workout screen (position:fixed covers full viewport)
  document.getElementById('screen-dash').style.display = 'none';
  const woEl = document.getElementById('screen-workout');
  woEl.classList.add('active');
  woEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  // Progress bar
  const fill = document.getElementById('wo-prog-fill');
  const label = document.getElementById('wo-prog-label');
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = `0 / ${workout.exercises.length}`;

  renderEcList();
  loadExercise(0);
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

  document.getElementById('wo-ex-title').textContent = ex.name;
  const _badgeEl = document.getElementById('wo-ex-badge');
  _badgeEl.innerHTML = 
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">` +
    `<span>${ex.sets} × ${ex.reps}</span>` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11" style="opacity:0.6;flex-shrink:0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>` +
    `</div>` +
    `<span style="font-size:0.6rem;opacity:0.7;letter-spacing:0.5px">REST ${ex.rest}s</span>`;
  _badgeEl.onclick = function() { openSetRepEditor(idx); };
  _badgeEl.title = 'Tap to edit sets & reps';
  // Update header title on mobile to show current exercise
  const titleEl = document.getElementById('wo-title');
  if (titleEl && window.innerWidth <= 768) {
    titleEl.textContent = `${idx+1}/${exes.length} — ${ex.name.toUpperCase()}`;
  }

  // Exercise demo — form cues + phase info + wger images
  const db = getExerciseData(ex.name);
  // Show current training phase badge
  const phMod = getPhaseExerciseModifier(CURRENT_WEEK);
  const phBadgeEl = document.getElementById('wo-phase-badge');
  if (phBadgeEl) {
    if (isDeloadWeek(CURRENT_WEEK)) {
      phBadgeEl.textContent = '⚡ DELOAD WEEK — 60% volume, focus on form';
      phBadgeEl.style.cssText = 'display:block;background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.3);border-radius:8px;padding:8px 14px;font-size:0.75rem;color:var(--orange);margin-bottom:10px';
    } else {
      const ph = getTrainingPhase(CURRENT_WEEK);
      phBadgeEl.textContent = `${ph.name} PHASE · ${ph.intensityLabel}`;
      phBadgeEl.style.cssText = 'display:block;background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:8px;padding:8px 14px;font-size:0.75rem;color:var(--green);margin-bottom:10px';
    }
  }
  document.getElementById('wo-muscles-tag').textContent = `Muscles: ${ex.muscles || db.muscles}`;
  const framesEl = document.getElementById('wo-demo-frames');
  // Try to load wger.de exercise image; fallback to text cues
  const wgerId = db.wgerId;
  if (wgerId) {
    renderDemoPlaceholder(framesEl, ex.name, ex.muscles || db.muscles); // show immediately
    _loadExerciseImage(framesEl, wgerId, ex.name, ex.muscles || db.muscles);
  } else {
    renderDemoPlaceholder(framesEl, ex.name, ex.muscles || db.muscles);
  }

  // Initialize dynamic set count if not set
  if (!woExtraSets[idx]) woExtraSets[idx] = ex.sets;
  renderSetsTable(idx, ex);

  // Rest timer button
  stopRestTimer();
  restTotalSecs = ex.rest;
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

function renderSetsTable(idx, ex) {
  const tbody = document.getElementById('sets-tbody');
  if (!tbody) return;
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
    // Only show saved values if the set was actually completed THIS session
    const valW = isDone && (woSets[idx][s].weight != null) ? String(woSets[idx][s].weight) : '';
    const valR = isDone && (woSets[idx][s].reps != null) ? String(woSets[idx][s].reps) : '';
    // Previous data from the SAME exercise name
    const prev = prevSets[s] || null;
    const prevHint = (prev && prev.weight && prev.reps) ? '<div style="font-size:0.7rem;color:var(--off);margin-top:3px;font-family:\'DM Mono\',monospace">Last: ' + prev.weight + 'lbs × ' + prev.reps + '</div>' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td style="color:var(--dim);font-family:\'DM Mono\',monospace;font-size:0.78rem;white-space:nowrap"><div>Set '+(s+1)+'</div>' + prevHint + '</td>'+
      '<td class="set-cell-weight"><input class="set-weight-input '+(isDone?'done':'')+'" id="w-'+idx+'-'+s+'" type="number" inputmode="decimal" value="'+escapeAttr(valW)+'" min="0" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')"></td>'+
      '<td class="set-cell-reps"><input class="set-reps-input '+(isDone?'done':'')+'" id="r-'+idx+'-'+s+'" type="number" inputmode="numeric" value="'+escapeAttr(valR)+'" min="0" '+(isDone?'readonly':'')+' oninput="autoSaveSet('+idx+','+s+','+ex.rest+')"></td>'+
      '<td><button class="set-check '+(isDone?'done':'')+'" id="sd-'+idx+'-'+s+'" '+(isDone?'disabled':'')+' onclick="completeSet('+idx+','+s+','+ex.rest+')" title="Mark done">✓</button></td>'+
      '<td><button class="set-del-btn" onclick="deleteSet('+idx+','+s+')" title="Delete set">✕</button></td>';
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
      row.style.background = 'rgba(74,222,128,0.12)';
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
  const cues = EXERCISE_CUES[name] || EXERCISE_CUES.default;
  const phases = [
    { label:'START POSITION', color:'#60a5fa', cues:cues.start },
    { label:'MID MOVEMENT',   color:'#4ADE80', cues:cues.mid },
    { label:'END / LOCKOUT',  color:'#f472b6', cues:cues.end },
  ];
  el.innerHTML = phases.map((p,pi) => `
    <div style="flex:1;display:flex;flex-direction:column;background:var(--dark);border-radius:14px;overflow:hidden;border:1px solid var(--border)">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.02)">
        <div style="width:22px;height:22px;border-radius:50%;background:${p.color}22;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:0.7rem;color:${p.color};flex-shrink:0">${pi+1}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:0.8rem;letter-spacing:1px;color:${p.color}">${p.label}</div>
      </div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:9px;flex:1">
        ${p.cues.map(c=>`<div style="display:flex;align-items:flex-start;gap:8px"><div style="width:4px;height:4px;border-radius:50%;background:${p.color};margin-top:6px;flex-shrink:0"></div><div style="font-size:0.79rem;color:var(--off);line-height:1.45">${c}</div></div>`).join('')}
      </div>
    </div>`
  ).join('');
}

// ── EXERCISE IMAGE LOADER (wger.de) ──
const _wgerImageCache = {};
async function _loadExerciseImage(framesEl, wgerId, name, muscles) {
  if (_wgerImageCache[wgerId] === null) return; // known to have no image
  if (_wgerImageCache[wgerId]) {
    _renderImageFrame(framesEl, _wgerImageCache[wgerId], name, muscles);
    return;
  }
  try {
    const resp = await fetch(`https://wger.de/api/v2/exerciseimage/?exercise=${wgerId}&format=json&limit=2`);
    if (!resp.ok) throw new Error('no image');
    const data = await resp.json();
    const imgs = data.results || [];
    if (!imgs.length) { _wgerImageCache[wgerId] = null; return; }
    // Prefer the main image (is_main=true)
    const main = imgs.find(i => i.is_main) || imgs[0];
    _wgerImageCache[wgerId] = main.image;
    _renderImageFrame(framesEl, main.image, name, muscles);
  } catch(e) {
    _wgerImageCache[wgerId] = null; // cache miss
  }
}
function _renderImageFrame(framesEl, imageUrl, name, muscles) {
  // Show image + keep one cue card
  const cues = EXERCISE_CUES[name] || EXERCISE_CUES.default;
  framesEl.innerHTML = `
    <div style="flex:1.6;display:flex;flex-direction:column;background:var(--dark);border-radius:14px;overflow:hidden;border:1px solid var(--border)">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.02)">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:0.8rem;letter-spacing:1px;color:#60a5fa">EXERCISE DEMO</div>
        <div style="margin-left:auto;font-size:0.65rem;color:var(--dim)">wger.de</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;min-height:140px">
        <img src="${imageUrl}" alt="${name}" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:8px" onerror="this.parentElement.parentElement.parentElement.remove()">
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;background:var(--dark);border-radius:14px;overflow:hidden;border:1px solid var(--border)">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02)">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:0.8rem;letter-spacing:1px;color:#4ADE80">FORM CUES</div>
      </div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;flex:1">
        ${cues.start.concat(cues.mid).slice(0,4).map(c=>`<div style="display:flex;align-items:flex-start;gap:8px"><div style="width:4px;height:4px;border-radius:50%;background:#4ADE80;margin-top:6px;flex-shrink:0"></div><div style="font-size:0.79rem;color:var(--off);line-height:1.45">${c}</div></div>`).join('')}
      </div>
    </div>`;
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
          <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;color:var(--green)">${ex.sets} × ${ex.reps}</div>
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
      <button onclick="_aiSaveEdit(${idx})" style="padding:7px 14px;background:var(--green);border:none;border-radius:7px;color:var(--black);font-size:0.75rem;font-family:'Bebas Neue',sans-serif;letter-spacing:1px;cursor:pointer;align-self:flex-end">SAVE</button>
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
            <div style="font-size:0.68rem;color:var(--green)">${db.sets}×${db.reps}</div>
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
      <div style="font-size:0.68rem;color:var(--green)">${db.sets}×${db.reps}</div>
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
            <div style="color:var(--green);font-size:1rem;font-weight:700">+</div>
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
      <div style="color:var(--green);font-size:1rem;font-weight:700">+</div>
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
  const cats = [...new Set(Object.values(EXERCISE_DB).map(e => e.category))].sort();
  document.getElementById('custom-cat-filters').innerHTML =
    ['All', ...cats].map(c =>
      `<button onclick="filterCustomExCat('${c}',this)" class="custom-cat-btn" style="padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:${c==='All'?'var(--green)':'var(--card)'};color:${c==='All'?'var(--black)':'var(--off)'};font-size:0.72rem;cursor:pointer">${c}</button>`
    ).join('');
}

let _customCatFilter = 'All';
function filterCustomExCat(cat, btn) {
  _customCatFilter = cat;
  document.querySelectorAll('.custom-cat-btn').forEach(b => {
    b.style.background = 'var(--card)'; b.style.color = 'var(--off)';
  });
  btn.style.background = 'var(--green)'; btn.style.color = 'var(--black)';
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
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${selected?'var(--green-dim)':'var(--card)'};border:1px solid ${selected?'rgba(74,222,128,0.3)':'var(--border)'};border-radius:10px;cursor:pointer" onclick="toggleCustomEx('${name}')">
      <div>
        <div style="font-size:0.88rem;font-weight:600;color:var(--white)">${name}</div>
        <div style="font-size:0.72rem;color:var(--dim)">${ex.muscles} · ${ex.sets}×${ex.reps}</div>
      </div>
      <div style="font-size:1.2rem;color:${selected?'var(--green)':'var(--dim)'}">
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
  const woEl = document.getElementById('screen-workout');
  woEl.classList.add('active');
  woEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  const dayTitleEl = document.getElementById('wo-day-title');
  if (dayTitleEl) dayTitleEl.textContent = woWorkout.dayName;
  document.getElementById('wo-day-subtitle').textContent = '';
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
      <div style="font-family:'Bebas Neue',sans-serif;font-size:0.9rem;color:var(--green)">${e.cal} cal</div>
    </div>`
  ).join('') + (entries.length > 5 ? `<div style="padding:8px 18px;font-size:0.75rem;color:var(--dim);text-align:center">+${entries.length-5} more · <a onclick="dashNav('nutrition',document.querySelector('.sb-btn:nth-child(4)'))" style="color:var(--green);cursor:pointer">View all in Nutrition</a></div>` : '');
}

function renderEcList() {
  const exes = woWorkout.exercises;
  const list = document.getElementById('wo-ex-list');
  if (!list) return;
  list.innerHTML = exes.map((ex,i) => {
    const isDone = woSets[i] && woSets[i].some(s => s.done);
    return `<div class="wo-ex-sidebar-item ${i===woCurrentEx?'active':''}" onclick="loadExercise(${i})">
      <div class="wo-ex-sidebar-num">${i+1}</div>
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
  if (woWorkout.exercises.length <= 1) { alert('Need at least one exercise.'); return; }
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
    const searchMatch = !search || name.toLowerCase().includes(search) || data.muscles.toLowerCase().includes(search);
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

// Pre-create AudioContext on first user tap so iOS allows audio later
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) _audioCtx = new Ctx();
  }
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
document.addEventListener('touchstart', function() { _getAudioCtx(); }, { once: true });
document.addEventListener('click', function() { _getAudioCtx(); }, { once: true });

function playRestChime() {
  try {
    // Always create a fresh AudioContext for the chime — iOS kills suspended ones
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Resume immediately — we're inside a setInterval tick which is close enough to user interaction on most iOS versions
    const doPlay = function() {
      const notes = [1047, 1319, 1568]; // C6, E6, G6
      notes.forEach(function(freq, i) {
        setTimeout(function() {
          try {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = freq;
            o.type = 'sine';
            g.gain.setValueAtTime(0.7, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            o.start(ctx.currentTime);
            o.stop(ctx.currentTime + 0.5);
          } catch(e2) {}
        }, i * 200);
      });
      // Close context after last note finishes
      setTimeout(function() { try { ctx.close(); } catch(e3) {} }, 1500);
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(function() { doPlay(); });
    } else {
      doPlay();
    }
    // Haptic: 3 strong bursts
    if (navigator.vibrate) navigator.vibrate([250, 100, 250, 100, 350]);
  } catch (e) {}
}

function startRestTimerSecs(secs) {
  stopRestTimer();
  // Pre-warm audio on iOS so it can play when timer ends
  _getAudioCtx();
  restTotalSecs = secs;
  restTimerEndAt = Date.now() + secs * 1000;
  lsSet('fs_rest_timer', { endAt: restTimerEndAt, total: secs });
  const label = document.getElementById('rest-timer-label');
  const secsDisplay = document.getElementById('rest-timer-secs-display');
  const bar = document.getElementById('rest-timer-progress');
  if (label) label.textContent = 'TAP TO STOP';
  if (secsDisplay) secsDisplay.textContent = secs + 's';
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
  if (navigator.vibrate) navigator.vibrate(50);
  restTimerInterval = setInterval(() => {
    const remaining = Math.ceil((restTimerEndAt - Date.now()) / 1000);
    if (secsDisplay) secsDisplay.textContent = Math.max(0, remaining) + 's';
    if (bar) {
      const elapsed = secs - remaining;
      const pct = Math.min(100, (elapsed / secs) * 100);
      bar.style.transition = 'width 0.5s linear';
      bar.style.width = pct + '%';
    }
    if (remaining <= 0) {
      if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 150]);
      playRestChime();
      skipRest();
      if (label) label.textContent = 'DONE! TAP TO RESTART';
    }
  }, 500);
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
}

function restoreRestTimerIfActive() {
  const saved = lsGet('fs_rest_timer');
  if (!saved || !saved.endAt || saved.endAt <= Date.now()) return;
  restTotalSecs = saved.total || 90;
  restTimerEndAt = saved.endAt;
  startRestTimerSecs(restTotalSecs);
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && restTimerInterval && restTimerEndAt > 0) {
    const remaining = Math.ceil((restTimerEndAt - Date.now()) / 1000);
    const secsDisplay = document.getElementById('rest-timer-secs-display');
    const bar = document.getElementById('rest-timer-progress');
    const label = document.getElementById('rest-timer-label');
    if (secsDisplay) secsDisplay.textContent = Math.max(0, remaining) + 's';
    if (remaining <= 0 && label) {
      playRestChime();
      skipRest();
    } else if (bar && restTotalSecs > 0) {
      const pct = Math.min(100, ((restTotalSecs - remaining) / restTotalSecs) * 100);
      bar.style.width = pct + '%';
    }
  }
});
