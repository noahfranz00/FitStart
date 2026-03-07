// ═══════════════════════════════════════════
// NUTRITION.JS — Water Tracking, Meal Categories,
//   Food Search & Modals, Barcode Scanner, Recipe Book
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, TODAY_IDX, mealLogs, nutDay,
//   saveToStorage(), lsGet(), lsSet(), callClaude()

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
  lsSet('fs_water_goal_custom', true);
  renderWater();
}

function getWaterGoal() {
  const stored = lsGet('fs_water_goal');
  if (stored) return stored;
  // Auto-calculate from bodyweight if available
  if (USER && USER.weight) return Math.min(Math.round(USER.weight / 2), 128);
  return 64;
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
  // Always add to today when called from dashboard buttons
  const dayIdx = TODAY_IDX;
  const current = getWaterOz(dayIdx);
  setWaterOz(dayIdx, current + oz);
  // Sync nutDay if viewing today in nutrition
  if (nutDay === TODAY_IDX) renderWater();
  renderDashWater();
}

function subtractWater(oz) {
  const current = getWaterOz(TODAY_IDX);
  setWaterOz(TODAY_IDX, Math.max(0, current - oz));
  if (nutDay === TODAY_IDX) renderWater();
  renderDashWater();
}

function undoWater() {
  const current = getWaterOz(nutDay);
  setWaterOz(nutDay, Math.max(0, current - 8));
  renderWater();
  if (nutDay === TODAY_IDX) renderDashWater();
}

function renderWater() {
  WATER_GOAL = getWaterGoal();
  const goalInput = document.getElementById('water-goal-input');
  if (goalInput) goalInput.value = WATER_GOAL;
  const oz = getWaterOz(nutDay);
  const pct = Math.min(oz / WATER_GOAL, 1);
  const circumference = 263.9;
  const offset = circumference * (1 - pct);

  const ozEl = document.getElementById('water-oz-display');
  const ringEl = document.getElementById('water-ring-fill');
  if (ozEl) ozEl.textContent = oz;
  if (ringEl) ringEl.style.strokeDashoffset = offset;

  // Also update dashboard water tracker
  renderDashWater();
}

function renderDashWater() {
  WATER_GOAL = getWaterGoal();
  const oz = getWaterOz(TODAY_IDX);
  const pct = WATER_GOAL > 0 ? Math.min(oz / WATER_GOAL, 1) : 0;
  const circumference = 263.9;
  const offset = circumference * (1 - pct);
  const pctInt = Math.round(pct * 100);

  // Dynamic ring color based on percentage
  let ringColor;
  if (pct >= 0.9) ringColor = '#22c55e';       // green
  else if (pct >= 0.76) ringColor = '#eab308';  // yellow
  else if (pct >= 0.51) ringColor = '#f97316';  // orange
  else ringColor = '#ef4444';                    // red

  const ringEl = document.getElementById('dash-water-ring');
  const ozEl = document.getElementById('dash-water-oz');
  const pctEl = document.getElementById('dash-water-pct');
  const goalEl = document.getElementById('dash-water-goal');

  if (ringEl) {
    ringEl.style.strokeDashoffset = offset;
    ringEl.setAttribute('stroke', ringColor);
  }
  if (ozEl) ozEl.textContent = oz;
  if (goalEl) goalEl.textContent = 'Goal: ' + WATER_GOAL + ' oz / day';
  if (pctEl) {
    pctEl.style.color = ringColor;
    if (pct >= 1) pctEl.textContent = '✓ Goal reached!';
    else pctEl.textContent = pctInt + '%';
  }
}

function toggleDashCustomWater() {
  const row = document.getElementById('dash-water-custom-row');
  if (!row) return;
  const showing = row.style.display === 'flex';
  row.style.display = showing ? 'none' : 'flex';
  if (!showing) document.getElementById('dash-water-custom-input').focus();
}

function addDashCustomWater() {
  const input = document.getElementById('dash-water-custom-input');
  const oz = parseInt(input.value);
  if (oz > 0) {
    addWater(oz);
    input.value = '';
    toggleDashCustomWater();
  }
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
      `<div class="meal-entry-row" style="align-items:center">
        <div style="flex:1;min-width:0"><div class="mer-name">${e.name}</div><div class="mer-macros">${e.pro}g P · ${e.carb}g C · ${e.fat}g F</div></div>
        <div style="display:flex;align-items:center;gap:1px;flex-shrink:0">
          <button onclick="event.stopPropagation();_adjustMealQty('${cat.id}',${i},0.5)" style="width:22px;height:22px;border-radius:5px;border:1px solid var(--border);background:none;color:var(--dim);font-size:0.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0" title="Half portion">½</button>
          <div class="mer-cal" style="min-width:32px;text-align:center;font-size:0.78rem">${e.cal}</div>
          <button onclick="event.stopPropagation();_adjustMealQty('${cat.id}',${i},2)" style="width:22px;height:22px;border-radius:5px;border:1px solid var(--border);background:none;color:var(--dim);font-size:0.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0" title="Double portion">2x</button>
        </div>
        <button class="mer-move" onclick="event.stopPropagation();_showMoveMealMenu('${cat.id}',${i},this)" title="Move" style="background:none;border:none;color:var(--dim);font-size:0.6rem;cursor:pointer;padding:2px 4px;font-family:'DM Mono',monospace">↔</button>
        <button class="mer-del" onclick="deleteCatMeal('${cat.id}',${i})">✕</button>
      </div>`
    ).join('');
    const totalRow = entries.length ? `<div class="meal-cat-total"><span>${totalPro}g protein</span><span>${totalCarb}g carbs</span><span>${totalFat}g fat</span><span style="background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${totalCal} cal</span></div>` : '';
    return `<div class="meal-cat-card" onclick="openCoachForMeal('${cat.id}','${cat.label}')" style="cursor:pointer">
      <div class="meal-cat-header">
        <div class="meal-cat-left" style="gap:10px;flex:1">
          <div><div class="meal-cat-name">${cat.label}</div>${totalCal>0?`<div class="meal-cat-cals">${totalCal} cal</div>`:''}</div>
        </div>
        <div style="font-size:0.7rem;color:var(--gold);font-weight:600;letter-spacing:0.5px">+ LOG FOOD</div>
      </div>
      ${entryRows ? `<div class="meal-cat-entries" onclick="event.stopPropagation()">${entryRows}${totalRow}</div>` : '<div style="padding:8px 12px;font-size:0.75rem;color:var(--dim)">Tap to log via AI Coach</div>'}
    </div>`;
  }).join('');
}

function deleteCatMeal(catId, idx) {
  getMealCatEntries(nutDay, catId).splice(idx, 1);
  renderMealCategories(); renderMacros(); saveToStorage();
}

function _adjustMealQty(catId, idx, multiplier) {
  const entries = getMealCatEntries(nutDay, catId);
  if (!entries[idx]) return;
  const e = entries[idx];
  e.cal = Math.round(e.cal * multiplier);
  e.pro = Math.round(e.pro * multiplier);
  e.carb = Math.round(e.carb * multiplier);
  e.fat = Math.round(e.fat * multiplier);
  if (multiplier === 2) {
    e.name = e.name.replace(/ \(\d+x\)$/, '') + ' (2x)';
  } else if (multiplier === 0.5) {
    e.name = e.name.replace(/ \(\d+x\)$/, '').replace(/ \(half\)$/, '') + ' (half)';
  }
  renderMealCategories(); renderMacros(); saveToStorage();
}

let _moveMealMenuEl = null;
function _showMoveMealMenu(fromCat, idx, btn) {
  if (_moveMealMenuEl) { _moveMealMenuEl.remove(); _moveMealMenuEl = null; return; }
  const rect = btn.getBoundingClientRect();
  _moveMealMenuEl = document.createElement('div');
  _moveMealMenuEl.style.cssText = 'position:fixed;top:' + (rect.bottom + 4) + 'px;right:' + Math.max(8, window.innerWidth - rect.right) + 'px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 0;min-width:150px;z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,0.7)';
  _moveMealMenuEl.innerHTML = '<div style="padding:6px 14px;font-size:0.65rem;color:var(--dim);font-weight:700;letter-spacing:1px">MOVE TO</div>' +
    MEAL_CATS.filter(function(c) { return c.id !== fromCat; }).map(function(c) {
      return '<span onclick="_moveMeal(\'' + fromCat + '\',' + idx + ',\'' + c.id + '\')" style="display:block;padding:10px 14px;font-size:0.82rem;color:#E2DFD8;cursor:pointer">' + c.label + '</span>';
    }).join('');
  _moveMealMenuEl.querySelectorAll('span').forEach(function(s) {
    s.onmouseenter = function() { s.style.background = 'rgba(255,255,255,0.06)'; };
    s.onmouseleave = function() { s.style.background = 'none'; };
  });
  document.body.appendChild(_moveMealMenuEl);
  setTimeout(function() {
    document.addEventListener('click', function _close() {
      if (_moveMealMenuEl) { _moveMealMenuEl.remove(); _moveMealMenuEl = null; }
      document.removeEventListener('click', _close);
    }, { once: true });
  }, 10);
}
function _moveMeal(fromCat, idx, toCat) {
  if (_moveMealMenuEl) { _moveMealMenuEl.remove(); _moveMealMenuEl = null; }
  const entries = getMealCatEntries(nutDay, fromCat);
  if (!entries[idx]) return;
  const item = entries.splice(idx, 1)[0];
  getMealCatEntries(nutDay, toCat).push(item);
  renderMealCategories(); renderMacros(); saveToStorage();
}

function openCoachForMeal(catId, catLabel) {
  // Set the pending meal context so AI Coach logs to this meal
  window._pendingMealCat = catId;
  window._pendingMealLabel = catLabel;
  // Navigate to AI Coach
  dashNav('coach');
  // Focus the input and show a hint
  setTimeout(function() {
    var input = document.getElementById('coach-input');
    if (input) {
      input.placeholder = 'What did you have for ' + catLabel.toLowerCase() + '?';
      input.focus();
    }
  }, 100);
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
      <button onclick="openManualFoodEntry()" style="padding:10px 20px;background:var(--gold-dim);border:1px solid rgba(212,165,32,0.2);border-radius:10px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:1.5px;cursor:pointer">+ CREATE CUSTOM FOOD</button>
    </div>`;
    return;
  }
  resultsEl.innerHTML = `<div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:flex-end">
    <button onclick="openManualFoodEntry()" style="padding:8px 14px;background:var(--gold-dim);border:1px solid rgba(212,165,32,0.2);border-radius:8px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:1px;cursor:pointer">+ NEW CUSTOM FOOD</button>
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
  if (!name) { showToast('Please enter a food name.', 'warning'); return; }
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
      ? '<span style="font-size:0.58rem;font-weight:700;letter-spacing:0.8px;background:rgba(212,165,32,0.1);background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;border:1px solid rgba(212,165,32,0.2);border-radius:3px;padding:1px 5px;margin-left:5px">USDA</span>'
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
      + '<button onclick="searchFoodModal()" style="padding:10px 20px;background:var(--card);border:1px solid var(--border2);border-radius:10px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1px;cursor:pointer">\u21BA RETRY</button>'
      + ' <button onclick="openManualFoodEntry()" style="padding:10px 20px;background:var(--gold-dim);border:1px solid rgba(212,165,32,0.2);border-radius:10px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1px;cursor:pointer">+ ADD CUSTOM</button>'
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
    onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'" 
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
  if (status) { status.textContent = 'Looking up...'; status.style.color = 'var(--gold)'; }
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
  const circumference = 263.9;
  [['cal',TARGETS.cal,'','n-cal','mr-cal-ring'],['pro',TARGETS.pro,'g','n-pro','mr-pro-ring'],['carb',TARGETS.carb,'g','n-carb','mr-carb-ring'],['fat',TARGETS.fat,'g','n-fat','mr-fat-ring']].forEach(([k,tgt,u,vid,rid])=>{
    const val = t[k];
    const pct = tgt > 0 ? val / tgt : 0;
    const offset = circumference * (1 - Math.min(pct, 1));
    // Color logic: green within 10% of target, red if over 5%, gold otherwise
    let color;
    if (pct > 1.05) color = '#ef4444';       // over 5% → red
    else if (pct >= 0.90) color = '#22c55e';  // within 10% → green
    else color = '#D4A520';                    // default gold

    const el = document.getElementById(vid);
    const ring = document.getElementById(rid);
    if (el) el.textContent = (k==='cal' ? val.toLocaleString() : val) + u;
    if (ring) {
      ring.style.strokeDashoffset = offset;
      ring.setAttribute('stroke', color);
    }
  });
  // Update target labels
  const tgtEl = (id, txt) => { const e = document.getElementById(id); if(e) e.textContent = txt; };
  tgtEl('n-cal-tgt', 'of ' + (TARGETS.cal||'—').toLocaleString());
  tgtEl('n-pro-tgt', 'of ' + (TARGETS.pro||'—') + 'g');
  tgtEl('n-carb-tgt', 'of ' + (TARGETS.carb||'—') + 'g');
  tgtEl('n-fat-tgt', 'of ' + (TARGETS.fat||'—') + 'g');
  if (nutDay===TODAY_IDX) { refreshDashMacros(); }
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


// ═══════════════════════════════════════════
// RECIPE BOOK — Custom recipes with USDA-verified macros
// ═══════════════════════════════════════════
// Storage: fs_recipes = [{id, name, ingredients:[{name,grams,cal100,pro100,carb100,fat100}], totalWeightG, servings, notes}]

function getRecipes() { return lsGet('fs_recipes') || []; }
function saveRecipes(recipes) { lsSet('fs_recipes', recipes); }

function openRecipeBook() {
  document.getElementById('recipe-book-modal').style.display = 'flex';
  renderRecipeList();
}
function closeRecipeBook() {
  document.getElementById('recipe-book-modal').style.display = 'none';
}

function renderRecipeList() {
  const recipes = getRecipes();
  const el = document.getElementById('recipe-list');
  if (!el) return;
  if (!recipes.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--dim)">No recipes yet. Create your first recipe below.</div>';
    return;
  }
  el.innerHTML = recipes.map(function(r, i) {
    const macros = calcRecipeMacros(r);
    return `<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700;color:var(--white);font-size:0.92rem">${r.name}</div>
        <div style="font-size:0.75rem;color:var(--dim);margin-top:2px">
          ${r.servings} serving${r.servings!==1?'s':''} · Per serving: ${macros.calPerServing} cal · ${macros.proPerServing}p · ${macros.carbPerServing}c · ${macros.fatPerServing}f
        </div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:1px">${r.ingredients.length} ingredient${r.ingredients.length!==1?'s':''} · ${Math.round(r.totalWeightG)}g total</div>
      </div>
      <button onclick="logRecipeServing(${i})" style="padding:6px 14px;background:rgba(212,165,32,0.15);border:1px solid rgba(212,165,32,0.3);border-radius:8px;color:#D4A520;font-size:0.72rem;font-weight:700;cursor:pointer;white-space:nowrap">+ LOG</button>
      <button onclick="viewRecipe(${i})" style="padding:6px 10px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--off);font-size:0.72rem;cursor:pointer">View</button>
      <button onclick="deleteRecipe(${i})" style="padding:6px 8px;background:none;border:none;color:#ef4444;font-size:0.8rem;cursor:pointer">✕</button>
    </div>`;
  }).join('');
}

function calcRecipeMacros(recipe) {
  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
  for (const ing of recipe.ingredients) {
    const factor = ing.grams / 100;
    totalCal += (ing.cal100 || 0) * factor;
    totalPro += (ing.pro100 || 0) * factor;
    totalCarb += (ing.carb100 || 0) * factor;
    totalFat += (ing.fat100 || 0) * factor;
  }
  const s = recipe.servings || 1;
  return {
    totalCal: Math.round(totalCal), totalPro: Math.round(totalPro),
    totalCarb: Math.round(totalCarb), totalFat: Math.round(totalFat),
    calPerServing: Math.round(totalCal / s), proPerServing: Math.round(totalPro / s),
    carbPerServing: Math.round(totalCarb / s), fatPerServing: Math.round(totalFat / s),
    calPerGram: totalCal / (recipe.totalWeightG || 1),
    proPerGram: totalPro / (recipe.totalWeightG || 1),
    carbPerGram: totalCarb / (recipe.totalWeightG || 1),
    fatPerGram: totalFat / (recipe.totalWeightG || 1)
  };
}

function logRecipeServing(idx) {
  const recipes = getRecipes();
  const r = recipes[idx];
  if (!r) return;
  const macros = calcRecipeMacros(r);
  // Ask for amount
  const amount = prompt(`Log "${r.name}"\n\nEnter servings (1 serving = ${Math.round(r.totalWeightG / r.servings)}g)\nor enter grams like "180g":`, '1');
  if (!amount) return;
  let factor;
  if (amount.toLowerCase().includes('g')) {
    const grams = parseFloat(amount);
    if (!grams || grams <= 0) return;
    factor = grams / r.totalWeightG;
  } else {
    const servings = parseFloat(amount);
    if (!servings || servings <= 0) return;
    factor = servings / r.servings;
  }
  const entry = {
    name: r.name + (factor !== 1/r.servings ? '' : ''),
    cal: Math.round(macros.totalCal * factor),
    pro: Math.round(macros.totalPro * factor),
    carb: Math.round(macros.totalCarb * factor),
    fat: Math.round(macros.totalFat * factor),
    source: 'recipe'
  };
  // Log to current meal category (default to 'other')
  const cat = window._pendingMealCat || 'other';
  if (!mealLogs[TODAY_IDX]) mealLogs[TODAY_IDX] = {};
  if (!mealLogs[TODAY_IDX][cat]) mealLogs[TODAY_IDX][cat] = [];
  mealLogs[TODAY_IDX][cat].push(entry);
  saveToStorage();
  refreshDashMacros();
  if (nutDay === TODAY_IDX) { renderMacros(); renderMealCategories(); }
  closeRecipeBook();
  showToast(entry.name + " logged — " + entry.cal + " cal", "success");
}

function deleteRecipe(idx) {
  if (!confirm('Delete this recipe?')) return;
  const recipes = getRecipes();
  recipes.splice(idx, 1);
  saveRecipes(recipes);
  renderRecipeList();
}

function viewRecipe(idx) {
  const recipes = getRecipes();
  const r = recipes[idx];
  if (!r) return;
  const macros = calcRecipeMacros(r);
  let details = `📋 ${r.name}\n`;
  details += `Total: ${macros.totalCal} cal · ${macros.totalPro}g P · ${macros.totalCarb}g C · ${macros.totalFat}g F\n`;
  details += `Servings: ${r.servings} · Per serving: ${macros.calPerServing} cal\n`;
  details += `Total weight: ${Math.round(r.totalWeightG)}g\n\nIngredients:\n`;
  for (const ing of r.ingredients) {
    const f = ing.grams / 100;
    details += `• ${ing.name}: ${ing.grams}g (${Math.round(ing.cal100 * f)} cal, ${Math.round(ing.pro100 * f)}g P)\n`;
  }
  if (r.notes) details += `\nNotes: ${r.notes}`;
  alert(details);
}

// ── CREATE RECIPE FLOW ──
let _newRecipe = { name: '', ingredients: [], servings: 1, totalWeightG: 0, notes: '' };

function openCreateRecipe() {
  _newRecipe = { name: '', ingredients: [], servings: 1, totalWeightG: 0, notes: '' };
  document.getElementById('create-recipe-modal').style.display = 'flex';
  document.getElementById('cr-name').value = '';
  document.getElementById('cr-servings').value = '1';
  document.getElementById('cr-total-weight').value = '';
  document.getElementById('cr-notes').value = '';
  renderCRIngredients();
}
function closeCreateRecipe() {
  document.getElementById('create-recipe-modal').style.display = 'none';
}

function renderCRIngredients() {
  const el = document.getElementById('cr-ingredient-list');
  if (!el) return;
  if (!_newRecipe.ingredients.length) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--dim);font-size:0.82rem">No ingredients added yet</div>';
    return;
  }
  let totalCal = 0, totalPro = 0;
  el.innerHTML = _newRecipe.ingredients.map(function(ing, i) {
    const f = ing.grams / 100;
    const cal = Math.round(ing.cal100 * f);
    const pro = Math.round(ing.pro100 * f);
    totalCal += cal; totalPro += pro;
    return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-size:0.84rem;color:var(--white)">${ing.name}</div>
        <div style="font-size:0.7rem;color:var(--dim)">${ing.grams}g · ${cal} cal · ${pro}g P · ${Math.round(ing.carb100*f)}g C · ${Math.round(ing.fat100*f)}g F</div>
        <div style="font-size:0.62rem;color:var(--dim);font-style:italic">${ing._source === 'usda_branded' ? '✓ USDA Branded' : ing._source === 'usda_foundation' ? '✓ USDA Verified' : '⚠ Manual entry'}</div>
      </div>
      <button onclick="_newRecipe.ingredients.splice(${i},1);renderCRIngredients()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.85rem;padding:4px 8px">✕</button>
    </div>`;
  }).join('');
  el.innerHTML += `<div style="padding:10px 0;font-size:0.8rem;color:var(--off);font-weight:600">Running total: ${totalCal} cal · ${totalPro}g protein</div>`;
}

async function addCRIngredient() {
  const nameInput = document.getElementById('cr-ing-name');
  const gramsInput = document.getElementById('cr-ing-grams');
  const query = (nameInput.value || '').trim();
  const grams = parseFloat(gramsInput.value) || 0;
  if (!query) { showToast('Enter an ingredient name.', 'warning'); return; }
  if (!grams || grams <= 0) { showToast('Enter amount in grams.', 'warning'); return; }

  // Show searching state
  const addBtn = document.getElementById('cr-ing-add-btn');
  const origText = addBtn.textContent;
  addBtn.textContent = 'Searching USDA...';
  addBtn.disabled = true;

  try {
    // Search USDA branded first, then foundation
    let results = await _searchUSDA_branded(query);
    let source = 'usda_branded';
    if (!results.length) {
      results = await _searchUSDA_foundation(query);
      source = 'usda_foundation';
    }

    if (results.length > 0) {
      // Show top 3 matches for user to pick
      let pickMsg = `Found in USDA database. Pick the best match:\n\n`;
      const top = results.slice(0, 5);
      top.forEach(function(r, i) {
        pickMsg += `${i+1}. ${r.name}${r.brand ? ' ('+r.brand+')' : ''}\n   Per 100g: ${r.cal100} cal, ${r.pro100}g P, ${r.carb100}g C, ${r.fat100}g F\n\n`;
      });
      pickMsg += `Enter number (1-${top.length}), or 0 for manual entry:`;
      const pick = prompt(pickMsg, '1');

      if (pick && parseInt(pick) > 0 && parseInt(pick) <= top.length) {
        const chosen = top[parseInt(pick) - 1];
        _newRecipe.ingredients.push({
          name: chosen.name + (chosen.brand ? ' ('+chosen.brand+')' : ''),
          grams: grams,
          cal100: chosen.cal100, pro100: chosen.pro100,
          carb100: chosen.carb100, fat100: chosen.fat100,
          _source: source
        });
        nameInput.value = '';
        gramsInput.value = '';
        renderCRIngredients();
      } else if (pick === '0') {
        _addManualIngredient(query, grams);
      }
    } else {
      // No USDA results — manual entry
      _addManualIngredient(query, grams);
    }
  } catch(e) {
    showToast('Search failed — enter macros manually.', 'warning');
    _addManualIngredient(query, grams);
  }

  addBtn.textContent = origText;
  addBtn.disabled = false;
}

function _addManualIngredient(name, grams) {
  // Show a proper modal instead of ugly native prompts
  const overlay = document.createElement('div');
  overlay.id = 'manual-ing-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div style="background:var(--dark);border:1px solid var(--border2);border-radius:20px;padding:24px 20px;width:100%;max-width:340px">' +
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;letter-spacing:1.5px;color:var(--white);margin-bottom:4px">' + name + '</div>' +
    '<div style="font-size:0.75rem;color:var(--dim);margin-bottom:18px">Enter total macros for ' + grams + 'g</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><div style="font-size:0.6rem;font-weight:700;letter-spacing:2px;color:var(--dim);margin-bottom:5px">CALORIES</div>' +
        '<input id="mi-cal" type="number" inputmode="numeric" placeholder="0" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:\'DM Mono\',monospace;font-size:1rem;text-align:center;outline:none;box-sizing:border-box"></div>' +
      '<div><div style="font-size:0.6rem;font-weight:700;letter-spacing:2px;color:var(--dim);margin-bottom:5px">PROTEIN (g)</div>' +
        '<input id="mi-pro" type="number" inputmode="decimal" placeholder="0" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:\'DM Mono\',monospace;font-size:1rem;text-align:center;outline:none;box-sizing:border-box"></div>' +
      '<div><div style="font-size:0.6rem;font-weight:700;letter-spacing:2px;color:var(--dim);margin-bottom:5px">CARBS (g)</div>' +
        '<input id="mi-carb" type="number" inputmode="decimal" placeholder="0" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:\'DM Mono\',monospace;font-size:1rem;text-align:center;outline:none;box-sizing:border-box"></div>' +
      '<div><div style="font-size:0.6rem;font-weight:700;letter-spacing:2px;color:var(--dim);margin-bottom:5px">FAT (g)</div>' +
        '<input id="mi-fat" type="number" inputmode="decimal" placeholder="0" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:\'DM Mono\',monospace;font-size:1rem;text-align:center;outline:none;box-sizing:border-box"></div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:18px">' +
      '<button id="mi-cancel" style="flex:1;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--dim);font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem;letter-spacing:1px;cursor:pointer">Cancel</button>' +
      '<button id="mi-save" style="flex:1;padding:12px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);border:none;border-radius:10px;color:var(--black);font-family:\'Bebas Neue\',sans-serif;font-size:0.9rem;letter-spacing:1px;cursor:pointer">Add</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  setTimeout(function() { document.getElementById('mi-cal').focus(); }, 100);
  document.getElementById('mi-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('mi-save').onclick = function() {
    var cal = parseFloat(document.getElementById('mi-cal').value) || 0;
    var pro = parseFloat(document.getElementById('mi-pro').value) || 0;
    var carb = parseFloat(document.getElementById('mi-carb').value) || 0;
    var fat = parseFloat(document.getElementById('mi-fat').value) || 0;
    if (!cal && !pro && !carb && !fat) { showToast('Enter at least one value.', 'warning'); return; }
    var factor = grams > 0 ? 100 / grams : 1;
    _newRecipe.ingredients.push({
      name: name, grams: grams,
      cal100: Math.round(cal * factor * 10) / 10, pro100: Math.round(pro * factor * 10) / 10,
      carb100: Math.round(carb * factor * 10) / 10, fat100: Math.round(fat * factor * 10) / 10,
      _source: 'manual'
    });
    document.getElementById('cr-ing-name').value = '';
    document.getElementById('cr-ing-grams').value = '';
    renderCRIngredients();
    overlay.remove();
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function saveNewRecipe() {
  const name = document.getElementById('cr-name').value.trim();
  const servings = parseFloat(document.getElementById('cr-servings').value) || 1;
  const totalWeight = parseFloat(document.getElementById('cr-total-weight').value) || 0;
  const notes = document.getElementById('cr-notes').value.trim();

  if (!name) { showToast('Enter a recipe name.', 'warning'); return; }
  if (!_newRecipe.ingredients.length) { showToast('Add at least one ingredient.', 'warning'); return; }

  // Calculate total weight from ingredients if not manually entered
  const calcWeight = _newRecipe.ingredients.reduce(function(sum, ing) { return sum + ing.grams; }, 0);
  const finalWeight = totalWeight > 0 ? totalWeight : calcWeight;

  const recipe = {
    id: Date.now(),
    name: name,
    ingredients: _newRecipe.ingredients,
    servings: servings,
    totalWeightG: finalWeight,
    notes: notes
  };

  const recipes = getRecipes();
  recipes.push(recipe);
  saveRecipes(recipes);

  closeCreateRecipe();
  renderRecipeList();

  const macros = calcRecipeMacros(recipe);
  showToast("Recipe saved: " + name + " (" + macros.calPerServing + " cal per serving)", "success", 4000);
}

// ── RECIPE LOOKUP FOR AI COACH ──
function findRecipeByName(query) {
  const recipes = getRecipes();
  const q = query.toLowerCase();
  // Try exact match first, then partial
  let match = recipes.find(function(r) { return r.name.toLowerCase() === q; });
  if (!match) match = recipes.find(function(r) { return r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase()); });
  return match || null;
}

function getRecipeContext() {
  const recipes = getRecipes();
  if (!recipes.length) return '';
  return '\n\nUSER\'S SAVED RECIPES (use these for accurate logging — macros are USDA-verified):\n' +
    recipes.map(function(r) {
      const m = calcRecipeMacros(r);
      return `- "${r.name}": ${r.servings} servings, ${Math.round(r.totalWeightG)}g total. Per serving: ${m.calPerServing} cal, ${m.proPerServing}g P, ${m.carbPerServing}g C, ${m.fatPerServing}g F. Per gram: ${m.calPerGram.toFixed(2)} cal, ${m.proPerGram.toFixed(2)}g P`;
    }).join('\n');
}
