// ═══════════════════════════════════════════
// COACH.JS — AI Coach Chat & Food Logging via Coach
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, GYM_DAYS, DAY_WORKOUTS, CURRENT_WEEK,
//   callClaude(), getMealCatEntries(), saveToStorage(), renderMealCategories(),
//   renderMacros(), refreshDashMacros(), TODAY_IDX, mealLogs, getAllEntries()

// ── AI COACH ──
let _coachHistory = [];
let _coachStreaming = false;
let _coachPendingImage = null; // { base64, mediaType }
const COACH_LS_KEY = 'fs_coach_history';
const COACH_MAX_MESSAGES = 50;

function handleCoachPhoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  // Limit to 4MB
  if (file.size > 4 * 1024 * 1024) {
    showToast('Image too large — please use one under 4MB.', 'warning');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(',')[1];
    const mediaType = file.type || 'image/jpeg';
    _coachPendingImage = { base64, mediaType };
    // Show preview
    const preview = document.getElementById('coach-img-preview');
    const thumb = document.getElementById('coach-img-thumb');
    if (preview && thumb) {
      thumb.src = dataUrl;
      preview.style.display = 'block';
    }
    // Focus text input for optional description
    document.getElementById('coach-input').focus();
    document.getElementById('coach-input').placeholder = 'Describe what\'s in the photo (optional)...';
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function clearCoachImage() {
  _coachPendingImage = null;
  const preview = document.getElementById('coach-img-preview');
  if (preview) preview.style.display = 'none';
  document.getElementById('coach-input').placeholder = 'Ask your coach...';
}

function _loadCoachHistory() {
  try {
    const stored = localStorage.getItem(COACH_LS_KEY);
    if (stored) _coachHistory = JSON.parse(stored);
  } catch(e) { _coachHistory = []; }
}

function _saveCoachHistory() {
  // Keep last N messages to avoid bloating localStorage
  if (_coachHistory.length > COACH_MAX_MESSAGES) {
    _coachHistory = _coachHistory.slice(-COACH_MAX_MESSAGES);
  }
  // Strip image data from saved history (too large for localStorage)
  const saveable = _coachHistory.map(function(msg) {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const textParts = msg.content.filter(function(p) { return p.type === 'text'; });
      const hadImage = msg.content.some(function(p) { return p.type === 'image'; });
      let text = textParts.map(function(p) { return p.text; }).join(' ');
      if (hadImage) text = '[📷 Image shared] ' + text;
      return { role: 'user', content: text };
    }
    return msg;
  });
  try { localStorage.setItem(COACH_LS_KEY, JSON.stringify(saveable)); } catch(e) {}
}

function initCoach() {
  _loadCoachHistory();
  const container = document.getElementById('coach-messages');
  const starters = document.getElementById('coach-starters');
  const clearBtn = document.getElementById('coach-clear-btn');
  if (!container) return;

  if (_coachHistory.length > 0) {
    if (starters) starters.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'block';
    const existing = container.querySelectorAll('.coach-bubble');
    existing.forEach(b => b.remove());
    for (const msg of _coachHistory) {
      const bubble = document.createElement('div');
      bubble.className = 'coach-bubble ' + msg.role;
      // Handle multimodal content (array with image + text)
      if (Array.isArray(msg.content)) {
        let html = '';
        for (const part of msg.content) {
          if (part.type === 'image') html += '<div style="font-size:0.75rem;color:var(--dim);padding:4px 0">📷 Image shared</div>';
          else if (part.type === 'text') html += _formatCoachText(part.text);
        }
        bubble.innerHTML = html;
      } else {
        bubble.innerHTML = _formatCoachText(msg.content || '');
      }
      container.appendChild(bubble);
    }
    container.scrollTop = container.scrollHeight;
  } else {
    if (starters) starters.style.display = '';
    if (clearBtn) clearBtn.style.display = 'none';
  }

  // Flush any queued proactive messages and clear the notification dot
  if (typeof _flushProactiveMessages === 'function') _flushProactiveMessages();
}

// Handle iOS keyboard: when keyboard opens, visualViewport shrinks. 
// Adjust the coach fixed overlay to match.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const mc = document.querySelector('.main-content.coach-active');
    if (!mc) return;
    const container = document.getElementById('coach-chat-container');
    if (!container) return;
    // On iOS when keyboard opens, viewport height shrinks. Adjust to keep input visible.
    const vvh = window.visualViewport.height;
    const fullH = window.innerHeight;
    if (vvh < fullH - 50) {
      // Keyboard is open — shrink container and hide tab bar
      const tabBar = document.getElementById('mobile-tab-bar');
      if (tabBar) tabBar.style.display = 'none';
      mc.style.height = vvh + 'px';
      mc.style.maxHeight = vvh + 'px';
      mc.style.overflow = 'hidden';
    } else {
      // Keyboard closed — restore
      const tabBar = document.getElementById('mobile-tab-bar');
      if (tabBar) tabBar.style.display = '';
      mc.style.height = '';
      mc.style.maxHeight = '';
      mc.style.overflow = '';
    }
    // Scroll to bottom of messages
    const msgs = document.getElementById('coach-messages');
    if (msgs) setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 50);
  });
}

function clearCoachHistory() {
  _coachHistory = [];
  localStorage.removeItem(COACH_LS_KEY);
  const container = document.getElementById('coach-messages');
  if (container) {
    const bubbles = container.querySelectorAll('.coach-bubble');
    bubbles.forEach(b => b.remove());
  }
  const starters = document.getElementById('coach-starters');
  if (starters) starters.style.display = '';
  const clearBtn = document.getElementById('coach-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
}

function _acceptCoachWorkout() {
  const wk = window._pendingCoachWorkout;
  if (!wk || !wk.exercises) return;
  // Replace today's workout
  const exes = wk.exercises.map(function(e) {
    const db = getExerciseData(e.name);
    return { name: e.name, sets: e.sets || db.sets || 3, reps: e.reps || db.reps || '8-10', rest: e.rest || db.rest || 90, muscles: e.muscles || db.muscles || '' };
  });
  DAY_WORKOUTS[TODAY_IDX] = { name: wk.name || 'Custom Workout', focus: '', exercises: exes };
  if (generatedPlan && generatedPlan.weekly_schedule && generatedPlan.weekly_schedule[TODAY_IDX]) {
    generatedPlan.weekly_schedule[TODAY_IDX].exercises = exes;
    generatedPlan.weekly_schedule[TODAY_IDX].badge = wk.name || 'Custom';
    lsSet('fs_plan', generatedPlan);
  }
  window._pendingCoachWorkout = null;
  _appendCoachBubble('assistant', '✓ **Workout updated!** Your Today tab now shows the new workout. Tap Today to start it.');
  if (typeof renderTodayWorkout === 'function') renderTodayWorkout();
}

function _regenerateCoachWorkout() {
  window._pendingCoachWorkout = null;
  _sendCoachMsg('Generate a different workout with different exercises. Keep the same muscle focus but change the exercise selection.');
}

function _getCoachSystemPrompt() {
  const weightLog = getWeightLog();
  const currentWeight = weightLog.length ? weightLog[weightLog.length - 1].lbs : (USER ? USER.weight : '?');
  const goalWeight = USER ? USER.goal : '?';
  const goalDirection = goalWeight > currentWeight ? 'build muscle / gain weight' : 'lose weight';
  const workoutDates = getWorkoutDates();

  // Current streak
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const check = new Date(d);
    check.setDate(d.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth()+1).padStart(2,'0') + '-' + String(check.getDate()).padStart(2,'0');
    if (workoutDates.has(key)) { streak++; } else if (i > 0) break;
  }

  // Time & date context
  const now = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayName = dayNames[now.getDay()];
  const monthName = monthNames[now.getMonth()];
  const hour = now.getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else if (hour >= 21) timeOfDay = 'night';
  else if (hour < 4) timeOfDay = 'night';
  else timeOfDay = 'early morning';
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Fresh today index — don't rely on the global TODAY_IDX which may be stale if app was open across midnight
  const freshTodayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0, Sun=6
  const DAYS_FULL_LOCAL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // Today's nutrition so far (all 4 macros)
  const todayMeals = getMealCatEntries ? (() => {
    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
    for (const cat of (MEAL_CATS || [])) {
      const entries = getMealCatEntries(freshTodayIdx, cat.id);
      for (const e of entries) { totalCal += (e.cal || 0); totalPro += (e.pro || 0); totalCarb += (e.carb || 0); totalFat += (e.fat || 0); }
    }
    return { cal: totalCal, pro: totalPro, carb: totalCarb, fat: totalFat };
  })() : { cal: 0, pro: 0, carb: 0, fat: 0 };

  // Build food memory — compact summary of recent meals (last 3 days) from mealLogs
  let foodMemory = '';
  try {
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const memoryDays = [];
    for (let d = 0; d < 3; d++) {
      const dayIdx = freshTodayIdx - d;
      if (dayIdx < 0) break;
      const dayLabel = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : dayNames[(new Date().getDay() - d + 7) % 7];
      const allItems = [];
      for (const cat of ['breakfast','lunch','dinner','snacks','other']) {
        const entries = getMealCatEntries(dayIdx, cat);
        for (const e of entries) {
          allItems.push(cat + ': ' + e.name + ' (' + e.cal + 'cal ' + e.pro + 'P ' + (e.carb||0) + 'C ' + (e.fat||0) + 'F)');
        }
      }
      if (allItems.length > 0) {
        memoryDays.push(dayLabel + ':\n  ' + allItems.join('\n  '));
      }
    }
    if (memoryDays.length > 0) {
      foodMemory = '\n\nRECENT FOOD LOG (from app database — use this if user says "same as yesterday" or references past meals):\n' + memoryDays.join('\n');
    }
  } catch(e) { foodMemory = ''; }

  // Today's workout status
  const todayWorkout = DAY_WORKOUTS[freshTodayIdx];
  const todayDone = wktDone.has(freshTodayIdx);
  const isGymDay = GYM_DAYS.includes(freshTodayIdx);

  // Recent workout history (last 7 days)
  const recentDays = [];
  for (let i = 0; i < 7; i++) {
    const check = new Date(now);
    check.setDate(now.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth()+1).padStart(2,'0') + '-' + String(check.getDate()).padStart(2,'0');
    if (workoutDates.has(key)) recentDays.push(dayNames[check.getDay()]);
  }

  // Tomorrow's workout context — explicit so AI never guesses wrong
  const tomorrowJSDay = (now.getDay() + 1) % 7; // JS day: 0=Sun, 1=Mon, ...
  const tomorrowIdx = tomorrowJSDay === 0 ? 6 : tomorrowJSDay - 1; // App day: Mon=0, Sun=6
  const tomorrowName = dayNames[tomorrowJSDay];
  const tomorrowWorkout = DAY_WORKOUTS[tomorrowIdx];
  const tomorrowIsGym = GYM_DAYS.includes(tomorrowIdx);
  let tomorrowStr = 'Tomorrow is ' + tomorrowName + '. ';
  if (tomorrowIsGym && tomorrowWorkout) {
    tomorrowStr += tomorrowWorkout.name + ' day — exercises: ' + tomorrowWorkout.exercises.map(function(e){ return e.name; }).join(', ');
  } else {
    tomorrowStr += 'Rest day (no workout scheduled).';
  }

  // Strength context — recent PRs and notable lifts
  let strengthContext = '';
  try {
    const exlogs = getExLogs();
    const recentPRs = [];
    const keyLifts = [];
    for (var exName in exlogs) {
      var sessions = exlogs[exName];
      if (!sessions || sessions.length < 1) continue;
      var latest = sessions[0];
      if (latest && latest.sets) {
        var bestWeight = 0, bestReps = 0;
        latest.sets.filter(Boolean).forEach(function(s) {
          if (s.weight > bestWeight || (s.weight === bestWeight && s.reps > bestReps)) { bestWeight = s.weight; bestReps = s.reps; }
        });
        if (bestWeight > 0) keyLifts.push(exName + ': ' + bestWeight + 'lbs × ' + bestReps + ' (' + latest.date + ')');
      }
    }
    if (keyLifts.length > 0) {
      strengthContext = '\n\nRECENT LIFT DATA (from workout logs — reference these when discussing their strength):\n  ' + keyLifts.slice(0, 12).join('\n  ');
    }
  } catch(e) { strengthContext = ''; }

  // Remaining macros context for end-of-day coaching
  const remainCal = Math.max(0, TARGETS.cal - todayMeals.cal);
  const remainPro = Math.max(0, TARGETS.pro - todayMeals.pro);
  const calPct = TARGETS.cal > 0 ? Math.round(todayMeals.cal / TARGETS.cal * 100) : 0;
  const proPct = TARGETS.pro > 0 ? Math.round(todayMeals.pro / TARGETS.pro * 100) : 0;

  // Build weekly schedule summary for coach context
  let weekScheduleStr = '';
  try {
    const dayLabels = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    for (let d = 0; d < 7; d++) {
      if (DAY_WORKOUTS[d] && DAY_WORKOUTS[d].exercises) {
        weekScheduleStr += '  ' + dayLabels[d] + ': ' + DAY_WORKOUTS[d].name + ' — ' + DAY_WORKOUTS[d].exercises.map(function(e){ return e.name; }).join(', ') + '\n';
      }
    }
    if (weekScheduleStr) weekScheduleStr = 'THIS WEEK\'S FULL SCHEDULE:\n' + weekScheduleStr;
  } catch(e) { weekScheduleStr = ''; }

  return `You are the Blueprint AI Coach — an elite-level personal trainer and sports nutritionist with deep expertise in periodized programming, body recomposition, and behavioral coaching. You're not a generic chatbot — you're a premium coach that justifies a $97/month subscription through the quality of your advice.

You are embedded in the Blueprint fitness app. You have FULL ACCESS to this user's real data — their workouts, nutrition, body metrics, schedule, and progress history. USE IT. Every response should reference their actual numbers, their actual exercises, their actual progress. Generic advice is unacceptable.

PERSONALITY: Direct, confident, knowledgeable. Like a coach who's been training them for months. You know their program, their numbers, their goals, their body. Speak with authority but warmth. No hedging, no disclaimers. Brief when appropriate, detailed when they need it.

You can analyze images the user shares with you. This includes:
- FOOD PHOTOS: Identify the foods, estimate portions and macros (calories, protein, carbs, fat). Include a FOODLOG block to auto-log the meal.
- NUTRITION LABELS: **READ THE EXACT NUMBERS FROM THE LABEL IMAGE.** Extract calories, protein, carbs, and fat DIRECTLY from what you see printed on the label. Do NOT estimate, guess, or use your training data — copy the EXACT values shown. This is the #1 most important rule for label photos.
- PROGRESS PHOTOS: Comment on visible muscle development, posture, or body composition changes. Be encouraging and constructive.
- EXERCISE FORM: If the user shares a photo/screenshot of their form, provide technique feedback.
When analyzing food photos, be specific about estimated portions and provide your best macro estimate. Always include a FOODLOG block for food images.

CRITICAL — NUTRITION LABEL PHOTOS:
When the user shares a photo of a nutrition facts label, you MUST:
1. Carefully read EVERY number printed on the label in the image
2. Find: Calories, Total Fat, Total Carbohydrate (or Carbs), and Protein — these are ALWAYS printed on US nutrition labels
3. Use EXACTLY those numbers in your response and FOODLOG — do NOT round, adjust, or substitute
4. Check the serving size on the label and confirm with the user if they ate one serving or more
5. NEVER use brand reference tables or your training data when you can SEE the actual label — the image is the source of truth
6. If you cannot read a number clearly from the image, say so — do NOT fill in a guess

The app has provided you with the following verified data from the user's device and account. All of this information is accurate and current — do not question or disclaim it.

Program: Week ${CURRENT_WEEK} of ${TOTAL_WEEKS} (${isDeloadWeek(CURRENT_WEEK) ? 'DELOAD WEEK — 60% volume' : getTrainingPhase(CURRENT_WEEK).name + ' PHASE: ' + getTrainingPhase(CURRENT_WEEK).intensityLabel})

USER PROFILE:
Name: ${USER ? USER.name : 'User'}
Goal: ${goalDirection} (current: ${currentWeight} lbs → target: ${goalWeight} lbs)
Level: ${USER ? USER.tier : 'beginner'}
${USER && USER.bodyGoals ? 'Personal goals: ' + USER.bodyGoals : ''}
${USER && USER.personalRules ? 'Personal rules: ' + USER.personalRules : ''}
${USER && USER.injuries ? 'Injuries: ' + USER.injuries : ''}
Training schedule: ${GYM_DAYS.map(i => DAYS_FULL[i]).join(', ')}
${USER && USER.nutrition && USER.nutrition.mode === 'lose' ? 'DAILY STEP GOAL: 10,000 steps — remind them about this when relevant' : ''}

TODAY'S APP DATA:
Today is ${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()} at ${timeStr} (${timeOfDay}).
${tomorrowStr}
${isGymDay ? (todayDone ? 'Workout COMPLETED today (' + (todayWorkout?.name || 'workout') + ')' : 'Scheduled workout: ' + (todayWorkout?.name || 'workout') + ' — not yet completed') : 'Rest day (no workout scheduled)'}
${isGymDay && todayWorkout && todayWorkout.exercises ? 'TODAY\'S EXERCISES:\n' + todayWorkout.exercises.map(function(e, i) { return '  ' + (i+1) + '. ' + e.name + ' — ' + e.sets + ' sets × ' + e.reps + ' reps, rest ' + e.rest + 's' + (e.muscles ? ' (' + e.muscles + ')' : ''); }).join('\n') : ''}
${weekScheduleStr}
NUTRITION STATUS:
Logged so far: ${todayMeals.cal} of ${TARGETS.cal} cal (${calPct}%), ${todayMeals.pro}g of ${TARGETS.pro}g protein (${proPct}%), ${todayMeals.carb}g of ${TARGETS.carb}g carbs, ${todayMeals.fat}g of ${TARGETS.fat}g fat
Remaining: ${remainCal} cal, ${remainPro}g protein
Daily targets: ${TARGETS.cal} cal · ${TARGETS.pro}g protein · ${TARGETS.carb}g carbs · ${TARGETS.fat}g fat${foodMemory}${strengthContext}

RECENT ACTIVITY (from app logs):
Workout streak: ${streak} day${streak !== 1 ? 's' : ''}
Workouts this week: ${recentDays.length > 0 ? recentDays.join(', ') : 'none yet'}
All-time workouts: ${workoutDates.size}

BEHAVIOR — THIS IS WHAT MAKES YOU WORTH $97/MONTH:
- Be concise and specific — 2-3 short paragraphs. No fluff, no filler, no generic fitness platitudes.
- ALWAYS reference their ACTUAL data: their lift numbers, their calorie count, their specific exercises, their phase. If they ask "how am I doing?", cite their real numbers.
- Use their name naturally (not in every sentence).
- Time-aware coaching:
  · Morning: Preview today's workout, set intention, brief nutrition game plan
  · Midday: Check nutrition progress ("you're at ${calPct}% of calories — ${remainPro}g protein left to hit")
  · Evening/night: Wrap up the day, preview tomorrow, suggest evening recovery
  · Post-workout: Celebrate specific lifts, note PRs, suggest post-workout nutrition
- When they ask general questions ("is creatine good?", "should I do cardio?"), give the answer BUT tie it back to THEIR specific situation, goals, and program. Never give Wikipedia answers.
- CRITICAL — DATES: Today is ${dayName}. Tomorrow is ${tomorrowName}. NEVER get this wrong. When referencing upcoming workouts, use the correct day names from the schedule above.
- If they mention pain or injury, take it seriously and recommend a medical professional if needed.
${USER && USER.injuries ? '\nCRITICAL — INJURY AWARENESS:\nThe user has reported: "' + USER.injuries + '"\nFactor this into EVERY exercise recommendation. Never suggest exercises that could aggravate these conditions.' : ''}
- Never say you don't have access to real-time data — the app provides it above.
- CONSISTENCY: Do NOT contradict yourself within a conversation. If you give advice, stand by it unless fundamentally new information changes the picture.
- Short food logs: When they log food, acknowledge briefly with all 4 macros, one sentence of context. Don't recap the whole day unless asked.
- When coaching on exercise form, tempo, or technique: be SPECIFIC. "3-second eccentric on the bench press" not "lower the weight slowly". "Squeeze your lats at the bottom of each row" not "focus on the muscle".

WORKOUT COACHING:
- You CAN see the user's full workout schedule above — today's exercises, sets, reps, and rest times. ALWAYS reference this data when discussing their training.
- When the user asks about their workout, exercises, or schedule, refer to the ACTUAL exercises listed above. Never say you can't see their workout or that you don't have access to it.
- CRITICAL — EXERCISE FEEDBACK: When a user expresses concern about ANY exercise or combination of exercises (e.g. "heavy squats and deadlifts back to back is too much", "I don't like this exercise", "this doesn't feel right"), you MUST:
  1. Acknowledge their concern and explain why they're right or wrong
  2. ALWAYS offer a specific alternative exercise that solves the problem
  3. Include a WORKOUT block with the modified workout so they can accept the change with one tap
  4. Never dismiss exercise feedback — the user knows their body
- If the user wants to SUBSTITUTE a single exercise, suggest a specific replacement AND include a WORKOUT block with the full updated workout so they can accept with one tap. Don't just tell them to use an Edit button.
- If the user asks for a COMPLETELY DIFFERENT workout, generate one and include a WORKOUT block at the END of your response:
\`\`\`WORKOUT
{"name":"Custom Leg Day","exercises":[{"name":"Back Squat","sets":4,"reps":"8-10","rest":90,"muscles":"Quads, Glutes"},{"name":"Romanian Deadlift","sets":3,"reps":"10-12","rest":90,"muscles":"Hamstrings"}]}
\`\`\`
The app will show Accept and Regenerate buttons. Only include this for full workout replacements, not minor substitutions.
- When suggesting exercise substitutions, consider: their experience level (${USER ? USER.tier : 'beginner'}), the current training phase, available equipment, and the muscle groups that need to be hit.
- You can recommend modifications like adjusting sets/reps, changing exercise order, or adding warm-up sets.

FOOD LOGGING:
When the user tells you what they ate, include a FOODLOG JSON block at the END of your response so the app can auto-log it.
When acknowledging food (whether auto-logged or via FOODLOG), ALWAYS show ALL FOUR macros clearly in your response: calories, protein, carbs, AND fat. Format example: "That's **320 cal · 28g protein · 35g carbs · 8g fat**". Never omit carbs or fat — users need to see the full picture.

IMPORTANT — BRAND ACCURACY IS CRITICAL:
When a user mentions a SPECIFIC BRAND, you MUST log the correct macros for that exact brand and serving size. Do NOT guess or use generic category values. Here is a reference table:

Protein Powders (per scoop):
  Ballerina Farm Farmer Protein Vanilla (1 scoop/37g): 120cal 24P 6C 1F
  Ballerina Farm Farmer Protein Chocolate (1 scoop): 140cal 24P 7C 1.5F
  Equate Whey: 130cal 25P 3C 1.5F | ON Gold Standard: 120cal 24P 3C 1F
  Dymatize ISO100: 120cal 25P 2C 0.5F | MyProtein Impact Whey: 110cal 21P 1C 1.5F
  Ghost Whey: 130cal 25P 4C 1.5F | Muscle Milk Powder: 150cal 16P 8C 6F
  Body Fortress Whey: 200cal 30P 8C 4F | Six Star Whey: 140cal 23P 6C 3F

Ready-to-Drink:
  Premier Protein Shake (11oz): 160cal 30P 5C 3F | Muscle Milk (14oz): 230cal 25P 9C 9F
  Fairlife Core Power (14oz): 230cal 42P 8C 4.5F | Fairlife Core Power Light: 150cal 26P 6C 2F
  Orgain Protein Shake (11oz): 150cal 16P 15C 3F

Dairy:
  Fairlife Fat Free Milk (1 cup): 80cal 13P 6C 0F | Fairlife 2% (1 cup): 130cal 13P 6C 4.5F
  Chobani 0% Greek Yogurt (5.3oz): 80cal 14P 6C 0F | Fage 0% (7oz): 100cal 18P 6C 0F
  Oikos Triple Zero (5.3oz): 90cal 15P 7C 0F
  Horizon Organic Whole Milk (1 cup): 150cal 8P 12C 8F

Bars:
  Quest Bar: 200cal 21P 21C 8F | RXBar: 210cal 12P 24C 9F
  Kind Protein Bar: 250cal 12P 17C 17F | ONE Bar: 220cal 20P 23C 8F
  Clif Bar: 250cal 10P 44C 5F | Nature Valley Protein Bar: 190cal 10P 29C 5F
  Built Bar: 130cal 17P 15C 3F | Barebells: 200cal 20P 18C 7F

Bread/Pancakes:
  Kodiak Protein Pancakes (3): 390cal 33P 54C 6F | Kodiak Waffle (2): 260cal 22P 36C 4F
  Dave's Killer Bread (1 slice): 120cal 5P 22C 1.5F | Ezekiel (1 slice): 80cal 4P 15C 0.5F

Jerky & Meat Snacks (per 1oz/28g unless noted):
  Old Trapper Peppered Beef Jerky (1oz): 70cal 11P 6C 0F
  Old Trapper Original Beef Jerky (1oz): 70cal 11P 6C 0F
  Old Trapper Teriyaki Beef Jerky (1oz): 70cal 11P 7C 0F
  Jack Link's Original Beef Jerky (1oz): 80cal 12P 5C 1F
  Jack Link's Teriyaki Beef Jerky (1oz): 80cal 11P 7C 1F
  Jack Link's Peppered Beef Jerky (1oz): 80cal 12P 5C 1F
  Chomps Original Beef Stick (1 stick/1.15oz): 90cal 10P 0C 6F
  Epic Venison Sea Salt Bar (1 bar/1.3oz): 100cal 10P 5C 4F
  Country Archer Original Beef Jerky (1oz): 70cal 10P 5C 1F
  Tillamook Country Smoker (1oz): 70cal 11P 3C 1F
  Slim Jim Original (1 stick/0.28oz): 40cal 2P 1C 3F | Slim Jim Giant: 150cal 6P 2C 13F

Frozen Chicken & Prepared Meats:
  Just Bare Lightly Breaded Chicken Breast Chunks (3oz/84g): 160cal 16P 9C 7F
  Just Bare Lightly Breaded Chicken Breast Strips (3oz/84g): 160cal 16P 9C 7F
  Just Bare Chicken Breast Nuggets (5 nuggets/84g): 160cal 16P 9C 7F
  Tyson Chicken Nuggets (5 pieces/90g): 230cal 12P 15C 14F
  Tyson Grilled Chicken Breast Strips (3oz): 110cal 19P 2C 3F
  Perdue Chicken Breast Tenders (3oz): 170cal 12P 12C 8F
  Foster Farms Crispy Strips (3 pieces/84g): 210cal 14P 14C 10F
  Banquet Chicken Nuggets (6 pieces/85g): 220cal 10P 16C 14F

Snacks:
  Goldfish Crackers (1oz/55 pieces): 140cal 3P 20C 5F
  Cheez-Its (1oz/27 crackers): 150cal 3P 17C 8F
  Ritz Crackers (5 crackers): 80cal 1P 10C 4F
  Lays Classic Chips (1oz): 160cal 2P 15C 10F
  SkinnyPop Popcorn (1oz): 140cal 2P 15C 9F
  Rice Krispies Treat (1 bar): 90cal 1P 17C 2F
  String Cheese (1 stick): 80cal 7P 1C 5F
  Light/Low-Fat String Cheese (1 stick): 50cal 6P 1C 2.5F
  Babybel Light (1 piece): 50cal 6P 0C 3F
  Quaker Rice Cakes Chocolate (1 cake): 60cal 1P 12C 0.5F
  Quaker Rice Cakes Lightly Salted (1 cake): 35cal 1P 7C 0F
  Quaker Rice Cakes Caramel (1 cake): 50cal 1P 11C 0F
  Quaker Rice Cakes White Cheddar (1 cake): 45cal 1P 10C 0F

Drinks:
  Fairlife Core Power (14oz/414ml): 230cal 42P 8C 4.5F
  Fairlife Core Power (11.5oz/340ml): 170cal 26P 6C 4.5F
  Gatorade (20oz): 140cal 0P 36C 0F
  Body Armor (16oz): 70cal 0P 18C 0F

Cereal & Oats:
  Quaker Oats (1/2 cup dry): 150cal 5P 27C 3F
  Cheerios (1 cup): 100cal 3P 20C 2F
  Magic Spoon (1 cup): 140cal 13P 15C 7F

CRITICAL SERVING SIZE RULE: When a user specifies an exact weight (e.g. "2.68oz" or "7 ounces"), you MUST:

PRODUCT VARIANT RULE: When the user specifies "low fat", "light", "fat free", "reduced fat", "sugar free", or any variant, you MUST use the macros for that SPECIFIC variant — not the regular version. If the variant isn't in your reference table, look for it in database results or ask the user to check the label. NEVER silently use regular macros when they said "low fat".
1. Find the per-serving macros from the table above (note the serving size listed — e.g. "per 1oz" or "per 3oz/85g")
2. Calculate how many servings their amount equals: (their amount) ÷ (serving size)
3. Multiply ALL macros by that number
4. Round to nearest whole number

Example: Just Bare Chicken Chunks are 160cal/16P/9C/7F per 3oz serving. If user says "7oz":
  7/3 = 2.333 servings → 2.333 × 160 = 373cal | 2.333 × 16 = 37P | 2.333 × 9 = 21C | 2.333 × 7 = 16F
  Log: 373cal 37P 21C 16F

Example: Old Trapper Peppered Jerky is 70cal/11P/6C/0F per 1oz. If user says "2.68oz":
  2.68 × 70 = 188cal | 2.68 × 11 = 29P | 2.68 × 6 = 16C | 2.68 × 0 = 0F
  Log: 188cal 29P 16C 0F

NEVER estimate or round the serving count to a whole number. Always use the exact multiplier.

If the user says a brand NOT in this list:
1. The app will automatically search its nutrition database and provide results in a [NUTRITION DATABASE RESULTS] section. USE THOSE VALUES — they come from real product labels.
2. If database results are provided, find the best match and use its exact macros. Scale to the user's serving size using the per-100g values.
3. If no database results are provided or none match, tell the user you don't have exact macros and ask them to check the label.
4. NEVER silently default to generic category values (e.g. don't use "generic beef jerky" when they said a specific brand)

If the user says just "protein shake" or "whey protein" WITHOUT a brand, ASK which brand before logging. Say something like "Which brand? That way I can log the exact macros."

WHEN DATABASE RESULTS ARE PROVIDED: Always use them. They contain real nutrition label data. Example:
If database says "Real Good Chicken Chunks (Real Good Foods) — per 141g: 200cal 28P 3C 9F (per 100g: 142cal 20P 2C 6F)"
And user says "8oz (2 servings)": 8oz = 227g. Using per-100g: 227/100 × 142 = 322cal, 227/100 × 20 = 45P, 227/100 × 2 = 5C, 227/100 × 6 = 14F.
Log: 322cal 45P 5C 14F.

FOODLOG FORMAT (must be at the very end of your response):
\`\`\`FOODLOG
{"meal":"breakfast","items":[{"name":"Large Eggs (2)","cal":140,"pro":12,"carb":1,"fat":10}]}
\`\`\`

Rules:
- "meal": "breakfast", "lunch", "dinner", "snacks", or "other"
- ONLY use a specific meal category if the user explicitly mentions it (e.g. "for breakfast", "lunch was", "dinner snack") OR if a meal context is provided below. If neither, ALWAYS default to "other".
- Include brand + quantity in the "name" field
- cal, pro, carb, fat must be integers
- ONLY include FOODLOG when the user describes food they ate — NOT for general nutrition questions
- The FOODLOG block must be the LAST thing in your response
- CRITICAL: ONLY log food items mentioned in the user's CURRENT message. NEVER re-log items from earlier in the conversation. If the user says "I ate one egg", the FOODLOG should ONLY contain the egg — not anything they mentioned before. Previous items are already logged.
- ACCURACY IS CRITICAL: Users trust these numbers for their diet. Getting macros wrong by even 50 calories per item compounds across meals. Always use the brand reference table or database results. If you don't have exact data for a branded item, say so and ask the user to check the label rather than guessing.
- For common whole foods not in the brand table (chicken breast, rice, eggs, etc.), use standard USDA values.

MOVING MEALS:
If the user says they logged food to the wrong meal (e.g. "move my eggs from breakfast to lunch" or "that should be in dinner not snacks"), include a MOVEMEAL block at the END of your response:
\`\`\`MOVEMEAL
{"from":"breakfast","to":"lunch","item":"eggs"}
\`\`\`
The app will search for the closest matching item in the "from" category and move it. Confirm the move to the user.

DELETING FOOD:
If the user says to delete/remove a food they logged (e.g. "delete the eggs" or "remove that protein shake from my log"), include a DELETEFOOD block:
\`\`\`DELETEFOOD
{"meal":"breakfast","item":"eggs"}
\`\`\`
The app will find and remove the closest matching item. If "meal" is unknown, use "any" to search all categories. Confirm the deletion.`;
}

function sendCoachStarter(text) {
  const starters = document.getElementById('coach-starters');
  if (starters) starters.style.display = 'none';
  const clearBtn = document.getElementById('coach-clear-btn');
  if (clearBtn) clearBtn.style.display = 'block';
  _sendCoachMsg(text);
}

function sendCoachMessage() {
  const input = document.getElementById('coach-input');
  const text = (input.value || '').trim();
  const hasImage = !!_coachPendingImage;
  if ((!text && !hasImage) || _coachStreaming) return;
  input.value = '';
  input.placeholder = 'Ask your coach...';
  const starters = document.getElementById('coach-starters');
  if (starters) starters.style.display = 'none';
  const clearBtn = document.getElementById('coach-clear-btn');
  if (clearBtn) clearBtn.style.display = 'block';
  // Grab image before clearing
  const image = _coachPendingImage;
  clearCoachImage();
  _sendCoachMsg(text || 'What do you see in this image?', image);
}

function _appendCoachBubble(role, content) {
  const container = document.getElementById('coach-messages');
  const bubble = document.createElement('div');
  bubble.className = 'coach-bubble ' + role;
  bubble.innerHTML = _formatCoachText(content);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

function _formatCoachText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

async function _sendCoachMsg(text, image) {
  _coachStreaming = true;
  const sendBtn = document.getElementById('coach-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  // Show user bubble with image if present
  let bubbleHtml = '';
  if (image) {
    bubbleHtml += `<img src="data:${image.mediaType};base64,${image.base64}" style="max-width:200px;max-height:200px;border-radius:10px;margin-bottom:8px;display:block">`;
  }
  if (text) bubbleHtml += _formatCoachText(text);
  const container = document.getElementById('coach-messages');
  const userBubble = document.createElement('div');
  userBubble.className = 'coach-bubble user';
  userBubble.innerHTML = bubbleHtml;
  container.appendChild(userBubble);
  container.scrollTop = container.scrollHeight;

  // Build the content array for the API message
  let userContent;
  if (image) {
    userContent = [];
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 }
    });
    // Always include a text part — if user didn't type anything, add a default instruction
    const imageText = text || 'Here is a photo of what I ate. If this is a nutrition label, please read the exact numbers from it and log them.';
    userContent.push({ type: 'text', text: imageText });
  } else {
    userContent = text;
  }

  _coachHistory.push({ role: 'user', content: userContent });
  _saveCoachHistory();

  const typing = document.createElement('div');
  typing.className = 'coach-typing';
  typing.id = 'coach-typing';
  typing.innerHTML = '<div class="coach-typing-dot"></div><div class="coach-typing-dot"></div><div class="coach-typing-dot"></div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;

  try {
    // Check if this is a food logging message — if so, try to auto-log from database BEFORE calling AI
    // Skip auto-log if an image is attached (let AI analyze the image)
    let autoLogContext = '';
    let autoLogged = false;
    if (!image && _looksLikeFoodLog(text)) {
      const foodQuery = _extractFoodQuery(text);
      const servingInfo = _extractServingAmount(text);
      if (foodQuery) {
        // Check user's recipe book FIRST — these have verified macros
        const recipeMatch = typeof findRecipeByName === 'function' ? findRecipeByName(foodQuery) : null;
        if (recipeMatch) {
          const rm = calcRecipeMacros(recipeMatch);
          // Determine amount from text
          let recipeFactor = 1 / recipeMatch.servings; // default 1 serving
          const gramMatch = text.match(/(\d+)\s*g(?:ram)?s?\b/i);
          const servMatch = text.match(/(\d+(?:\.\d+)?)\s*serving/i);
          if (gramMatch) {
            recipeFactor = parseFloat(gramMatch[1]) / recipeMatch.totalWeightG;
          } else if (servMatch) {
            recipeFactor = parseFloat(servMatch[1]) / recipeMatch.servings;
          }
          autoLogContext = `\n\n[AUTO-LOGGED FROM RECIPE: "${recipeMatch.name}" — ${Math.round(rm.totalCal * recipeFactor)} cal, ${Math.round(rm.totalPro * recipeFactor)}g P, ${Math.round(rm.totalCarb * recipeFactor)}g C, ${Math.round(rm.totalFat * recipeFactor)}g F. These macros are USDA-verified. Confirm this was logged and show the macros. Include a FOODLOG block with these exact values.]`;
          // Auto-log it
          const mealCat = window._pendingMealCat || _detectMealFromText(text) || 'other';
          const entry = {
            name: recipeMatch.name,
            cal: Math.round(rm.totalCal * recipeFactor),
            pro: Math.round(rm.totalPro * recipeFactor),
            carb: Math.round(rm.totalCarb * recipeFactor),
            fat: Math.round(rm.totalFat * recipeFactor),
            source: 'recipe'
          };
          if (!mealLogs[TODAY_IDX]) mealLogs[TODAY_IDX] = {};
          if (!mealLogs[TODAY_IDX][mealCat]) mealLogs[TODAY_IDX][mealCat] = [];
          mealLogs[TODAY_IDX][mealCat].push(entry);
          saveToStorage();
          refreshDashMacros();
          if (nutDay === TODAY_IDX) { renderMacros(); renderMealCategories(); }
          autoLogged = true;
        }

        if (!autoLogged) {
        try {
          // Search USDA first, then OFF as fallback
          let bestMatch = null;
          const usdaResults = await _searchUSDA(foodQuery);
          if (usdaResults && usdaResults.length > 0) {
            bestMatch = usdaResults[0];
          } else {
            const offResults = await fetchOFF(foodQuery);
            if (offResults && offResults.length > 0) {
              bestMatch = {
                name: offResults[0].name + (offResults[0].brand ? ' (' + offResults[0].brand + ')' : ''),
                brand: offResults[0].brand || '',
                cal100: offResults[0].cal100, pro100: offResults[0].pro100,
                carb100: offResults[0].carb100, fat100: offResults[0].fat100,
                servingG: offResults[0].servingG,
                servingSize: offResults[0].serving,
              };
            }
          }

          if (bestMatch && bestMatch.cal100 > 0 && (bestMatch._score || 0) >= 2) {
            // Calculate macros: use user's serving size if specified, otherwise use label serving
            let grams = servingInfo.grams;
            let servingDesc = servingInfo.original;
            if (!grams && bestMatch.servingG) {
              grams = bestMatch.servingG * (servingInfo.count || 1);
              servingDesc = (servingInfo.count > 1 ? servingInfo.count + ' servings' : '1 serving') + ' (' + grams + 'g)';
            }
            if (!grams) grams = bestMatch.servingG || 100;

            const factor = grams / 100;
            const cal = Math.round(bestMatch.cal100 * factor);
            const pro = Math.round(bestMatch.pro100 * factor);
            const carb = Math.round(bestMatch.carb100 * factor);
            const fat = Math.round(bestMatch.fat100 * factor);

            const foodName = bestMatch.name + (bestMatch.brand && !bestMatch.name.includes(bestMatch.brand) ? ' (' + bestMatch.brand + ')' : '');
            const displayName = foodName.length > 50 ? foodName.substring(0, 47) + '...' : foodName;

            // Determine meal — use pending meal from nutrition page, or check explicit mentions, or default to 'other'
            let meal = 'other';
            if (window._pendingMealCat) {
              meal = window._pendingMealCat;
            } else {
              // Check for explicit meal mentions
              const tl = text.toLowerCase();
              if (tl.includes('breakfast')) meal = 'breakfast';
              else if (tl.includes('lunch')) meal = 'lunch';
              else if (tl.includes('dinner') || tl.includes('supper')) meal = 'dinner';
              else if (tl.includes('snack')) meal = 'snacks';
            }

            // Auto-log it
            _processFoodLog({
              meal: meal,
              items: [{ name: `${displayName} (${servingDesc || grams + 'g'})`, cal, pro, carb, fat }]
            });
            autoLogged = true;

            // Tell the AI what was logged so it can comment appropriately
            autoLogContext = `\n\n[AUTO-LOGGED BY APP: ${displayName} — ${servingDesc || grams + 'g'} — ${cal}cal ${pro}P ${carb}C ${fat}F → logged to ${meal}. Source: USDA database. The food has already been logged — do NOT include a FOODLOG block. Just acknowledge the logged food and give brief nutritional commentary.]`;
          }
        } catch(e) {
          console.log('Auto-log pre-fetch failed:', e.message);
          // Fall through to normal AI flow with FOODLOG
        }
        } // end if (!autoLogged) — recipe was not found
      }
    }

    // Build messages — strip old FOODLOG blocks so AI doesn't re-log old food
    // Also handle multimodal messages (with images)
    const messages = _coachHistory.slice(-20).map(function(msg) {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content.replace(/```FOODLOG[\s\S]*?```/g, '').trim() };
      }
      // For user messages with images (array content), strip FOODLOG from text parts
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        return { role: msg.role, content: msg.content.map(function(part) {
          if (part.type === 'text') return { type: 'text', text: part.text.replace(/```FOODLOG[\s\S]*?```/g, '').trim() };
          return part;
        })};
      }
      return msg;
    });
    let systemPrompt = _getCoachSystemPrompt();
    // Add user's saved recipes to context
    if (typeof getRecipeContext === 'function') {
      systemPrompt += getRecipeContext();
      systemPrompt += '\n\nWhen the user mentions a saved recipe, use the EXACT macros listed above — these are USDA-verified. Do NOT estimate or recalculate. If they say how many grams or servings, multiply the per-serving or per-gram values accordingly.';
    }
    if (autoLogContext) {
      systemPrompt += autoLogContext;
    }
    // When an image is attached, add strong instruction to read it carefully
    if (image) {
      systemPrompt += `\n\n[IMAGE ATTACHED — CRITICAL INSTRUCTIONS]
The user has shared an image. If it contains a nutrition facts label:
- You MUST read the EXACT numbers from the label in the image. The image is your PRIMARY and ONLY source of truth.
- Do NOT use the brand reference table above — those are only for when no image is available.
- Read the label systematically: Serving Size → Calories → Total Fat → Total Carbohydrate → Protein
- State each value: "From the label I can read: Serving size: X, Calories: X, Total Fat: Xg, Total Carbs: Xg, Protein: Xg"
- Use ONLY those exact values in your FOODLOG block — do NOT adjust, estimate, or substitute from memory
- If you read Calories as 200, log 200. If you read Protein as 20g, log 20. Do NOT change any number.
- TRIPLE CHECK: Before writing the FOODLOG, verify each number matches what you stated from the label. If any number differs, fix it.
- If the image is NOT a nutrition label (it's a food photo), estimate the macros from the food visible and note it's an estimate.`;
    }
    // If user came from a meal section, tell AI which meal to log to
    if (window._pendingMealCat && window._pendingMealLabel) {
      systemPrompt += `\n\n[MEAL CONTEXT: The user clicked "${window._pendingMealLabel}" from the nutrition page to log food. Use "${window._pendingMealCat}" as the meal category in your FOODLOG block. Do NOT default to "other".]`;
    }

    let reply = await callClaude(messages, {
      system: systemPrompt,
      max_tokens: 800
    });

    const typingEl = document.getElementById('coach-typing');
    if (typingEl) typingEl.remove();

    // Parse and process FOODLOG if present (only if we didn't auto-log)
    if (!autoLogged) {
      const foodLogResult = _parseFoodLog(reply);
      if (foodLogResult) {
        reply = foodLogResult.cleanReply;
        _processFoodLog(foodLogResult.data);
      }
    } else {
      // Strip any FOODLOG block the AI might have added anyway
      reply = reply.replace(/```FOODLOG[\s\S]*?```/g, '').trim();
    }

    // Parse MOVEMEAL block if present
    const moveMealMatch = reply.match(/```MOVEMEAL\s*([\s\S]*?)```/);
    if (moveMealMatch) {
      try {
        const moveData = JSON.parse(moveMealMatch[1].trim());
        if (moveData.from && moveData.to && moveData.item) {
          const fromEntries = getMealCatEntries(TODAY_IDX, moveData.from);
          const matchIdx = fromEntries.findIndex(function(e) {
            return e.name.toLowerCase().includes(moveData.item.toLowerCase());
          });
          if (matchIdx >= 0) {
            const item = fromEntries.splice(matchIdx, 1)[0];
            getMealCatEntries(TODAY_IDX, moveData.to).push(item);
            saveToStorage(); if (typeof renderMealCategories === 'function') renderMealCategories(); if (typeof renderMacros === 'function') renderMacros();
          }
        }
      } catch(e2) {}
      reply = reply.replace(/```MOVEMEAL[\s\S]*?```/g, '').trim();
    }

    // Parse DELETEFOOD block if present
    const deleteFoodMatch = reply.match(/```DELETEFOOD\s*([\s\S]*?)```/);
    if (deleteFoodMatch) {
      try {
        const delData = JSON.parse(deleteFoodMatch[1].trim());
        if (delData.item) {
          const searchItem = delData.item.toLowerCase();
          let found = false;
          const catsToSearch = delData.meal === 'any' ? ['breakfast','lunch','dinner','snacks','other'] : [delData.meal];
          for (const catId of catsToSearch) {
            const entries = getMealCatEntries(TODAY_IDX, catId);
            const matchIdx = entries.findIndex(function(e) {
              return e.name.toLowerCase().includes(searchItem);
            });
            if (matchIdx >= 0) {
              entries.splice(matchIdx, 1);
              found = true;
              break;
            }
          }
          if (found) {
            saveToStorage();
            if (typeof renderMealCategories === 'function') renderMealCategories();
            if (typeof renderMacros === 'function') renderMacros();
            if (typeof refreshDashMacros === 'function') refreshDashMacros();
          }
        }
      } catch(e2) {}
      reply = reply.replace(/```DELETEFOOD[\s\S]*?```/g, '').trim();
    }

    // Parse WORKOUT block if present — show Accept/Regenerate buttons
    const workoutMatch = reply.match(/```WORKOUT\s*([\s\S]*?)```/);
    if (workoutMatch) {
      try {
        const wkData = JSON.parse(workoutMatch[1].trim());
        if (wkData.exercises && wkData.exercises.length > 0) {
          window._pendingCoachWorkout = wkData;
          reply = reply.replace(/```WORKOUT[\s\S]*?```/g, '').trim();
          reply += '\n\n<div style="display:flex;gap:8px;margin-top:12px">' +
            '<button onclick="_acceptCoachWorkout()" style="flex:1;padding:12px;background:linear-gradient(135deg,#B8900B,#D4A520,#F0D060,#D4A520,#B8900B);border:none;border-radius:10px;color:#111;font-family:\'Bebas Neue\',sans-serif;font-size:0.95rem;letter-spacing:1.5px;cursor:pointer">ACCEPT WORKOUT</button>' +
            '<button onclick="_regenerateCoachWorkout()" style="flex:1;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--dim);font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1px;cursor:pointer">REGENERATE</button>' +
            '</div>';
        }
      } catch(e2) {
        reply = reply.replace(/```WORKOUT[\s\S]*?```/g, '').trim();
      }
    }

    _appendCoachBubble('assistant', reply || 'Sorry, I could not generate a response. Please try again.');
    _coachHistory.push({ role: 'assistant', content: reply });
    _saveCoachHistory();
  } catch (e) {
    const typingEl = document.getElementById('coach-typing');
    if (typingEl) typingEl.remove();
    _appendCoachBubble('assistant', e.message || 'Something went wrong. Try again in a moment.');
  }

  _coachStreaming = false;
  if (sendBtn) sendBtn.disabled = false;
  document.getElementById('coach-input')?.focus();
}

// ── USDA FoodData Central — parse a single food item ──
function _parseUSDAFood(food) {
  const per100 = {};
  for (const n of (food.foodNutrients || [])) {
    const id = n.nutrientId || n.nutrientNumber;
    const nm = n.nutrientName || '';
    if (id === 1008 || nm === 'Energy') per100.cal = n.value || 0;
    else if (id === 1003 || nm === 'Protein') per100.pro = n.value || 0;
    else if (id === 1005 || nm === 'Carbohydrate, by difference') per100.carb = n.value || 0;
    else if (id === 1004 || nm === 'Total lipid (fat)') per100.fat = n.value || 0;
  }
  let servingG = food.servingSize ? parseFloat(food.servingSize) : 0;
  if (!servingG || isNaN(servingG)) servingG = 100;
  const factor = servingG / 100;
  const unit = (food.servingSizeUnit || 'g').toLowerCase();
  let servingLabel;
  if (food.householdServingFullText) {
    servingLabel = food.householdServingFullText + ' (' + Math.round(servingG) + (unit === 'g' ? 'g' : unit) + ')';
  } else {
    servingLabel = Math.round(servingG) + (unit === 'g' ? 'g' : unit);
  }
  return {
    name: (food.description || '').replace(/,\s*UPC.*$/i, '').trim(),
    brand: (food.brandOwner || food.brandName || '').replace(/,.*$/, '').trim(),
    serving: servingLabel,
    servingG,
    cal:  Math.round((per100.cal  || 0) * factor),
    pro:  Math.round((per100.pro  || 0) * factor),
    carb: Math.round((per100.carb || 0) * factor),
    fat:  Math.round((per100.fat  || 0) * factor),
    cal100:  Math.round(per100.cal  || 0),
    pro100:  Math.round(per100.pro  || 0),
    carb100: Math.round(per100.carb || 0),
    fat100:  Math.round(per100.fat  || 0),
  };
}

// USDA Branded — real product labels with serving sizes (primary source)
async function _searchUSDA_branded(query) {
  try {
    const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=' + encodeURIComponent(query) + '&dataType=Branded&pageSize=50';
    const fetchPromise = fetch(url).then(function(r) { return r.json(); });
    const timeoutPromise = new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('timeout')); }, 8000); });
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    return (data.foods || [])
      .map(function(f) { return Object.assign(_parseUSDAFood(f), { _source: 'usda_branded' }); })
      .filter(function(f) { return f.cal > 0; });
  } catch(e) {
    console.log('USDA branded search failed:', e.message);
    return [];
  }
}

// USDA Foundation + SR Legacy — whole foods with verified nutrition (chicken breast, rice, etc.)
async function _searchUSDA_foundation(query) {
  try {
    const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=' + encodeURIComponent(query) + '&dataType=Foundation,SR%20Legacy&pageSize=10';
    const fetchPromise = fetch(url).then(function(r) { return r.json(); });
    const timeoutPromise = new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('timeout')); }, 8000); });
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    if (!data || !data.foods) return [];
    return (data.foods || []).map(function(food) {
      var parsed = _parseUSDAFood(food);
      if (!food.servingSize) {
        parsed.servingG = smartServingG(food.description) || 100;
        var sg = parsed.servingG;
        parsed.serving = sg === 100 ? '100g' : sg + 'g';
        var factor = sg / 100;
        parsed.cal  = Math.round(parsed.cal100  * factor);
        parsed.pro  = Math.round(parsed.pro100  * factor);
        parsed.carb = Math.round(parsed.carb100 * factor);
        parsed.fat  = Math.round(parsed.fat100  * factor);
      }
      return Object.assign(parsed, { _source: 'usda_foundation' });
    }).filter(function(f) { return f.cal > 0; });
  } catch(e) {
    console.log('USDA foundation search failed:', e.message);
    return [];
  }
}

// Alias for AI coach food auto-logging (uses branded only)
async function _searchUSDA(query) {
  return _searchUSDA_branded(query);
}

// ── SETS / REPS EDITOR ──
var _sreExIdx = -1;

function openSetRepEditor(exIdx) {
  _sreExIdx = exIdx;
  const ex = woWorkout.exercises[exIdx];
  if (!ex) return;
  document.getElementById('sre-ex-name').textContent = ex.name.toUpperCase();
  document.getElementById('sre-sets').value = woExtraSets[exIdx] || ex.sets;
  // Parse reps — could be "10-15" or "10"
  var repsRaw = String(ex.reps || '10');
  var repsNum = parseInt(repsRaw.split('-')[0]) || 10;
  document.getElementById('sre-reps').value = repsNum;
  var rest = ex.rest || 90;
  document.getElementById('sre-rest').value = rest;
  document.getElementById('sre-rest-display').textContent = rest + 's';
  document.getElementById('setrepedit-modal').style.display = 'flex';
}

function closeSetRepEditor() {
  document.getElementById('setrepedit-modal').style.display = 'none';
  _sreExIdx = -1;
}

function adjustSRE(field, delta) {
  if (field === 'sets') {
    var el = document.getElementById('sre-sets');
    el.value = Math.max(1, Math.min(10, (parseInt(el.value)||3) + delta));
  } else if (field === 'reps') {
    var el = document.getElementById('sre-reps');
    el.value = Math.max(1, Math.min(50, (parseInt(el.value)||10) + delta));
  } else if (field === 'rest') {
    var el = document.getElementById('sre-rest');
    var newVal = Math.max(15, Math.min(300, (parseInt(el.value)||90) + delta));
    el.value = newVal;
    document.getElementById('sre-rest-display').textContent = newVal + 's';
  }
}

function applySetRepEdit() {
  if (_sreExIdx < 0 || !woWorkout) return;
  var sets = parseInt(document.getElementById('sre-sets').value) || 3;
  var reps = parseInt(document.getElementById('sre-reps').value) || 10;
  var rest = parseInt(document.getElementById('sre-rest').value) || 90;
  var targetIdx = _sreExIdx;

  // Mutate exercise object directly
  var ex = woWorkout.exercises[targetIdx];
  if (!ex) { closeSetRepEditor(); return; }
  ex.sets = sets;
  ex.reps = reps;
  ex.rest = rest;

  // woExtraSets controls the actual row count in renderSetsTable
  woExtraSets[targetIdx] = sets;

  closeSetRepEditor();

  // Force badge update immediately (don't wait for loadExercise to re-read stale values)
  var badgeEl = document.getElementById('wo-ex-badge');
  if (badgeEl) {
    badgeEl.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<span>' + sets + ' × ' + reps + '</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11" style="opacity:0.6;flex-shrink:0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
      '</div>' +
      '<span style="font-size:0.6rem;opacity:0.7;letter-spacing:0.5px">REST ' + rest + 's</span>';
    badgeEl.onclick = function() { openSetRepEditor(targetIdx); };
  }

  // Re-render the sets table with the new set count
  renderSetsTable(targetIdx, ex);
  persistWorkoutDraft();
}

// Detect if a message looks like food logging (vs a general question)
function _looksLikeFoodLog(text) {
  const t = text.toLowerCase();
  // Patterns that suggest food intake
  const atePatterns = /\b(i (?:had|ate|just had|just ate|eaten|drink|drank)|for (?:breakfast|lunch|dinner|snack)|(?:i'm|im) (?:having|eating)|(?:log|track|add)\b.*\b(?:cal|food|meal)|\d+\s*(?:oz|ounce|cup|scoop|piece|slice|serving|bowl|plate|g\b|gram))/i;
  return atePatterns.test(t);
}

// Extract the food name/brand from a food logging message
function _extractFoodQuery(text) {
  let q = text
    // Remove leading action phrases
    .replace(/^(i (?:had|ate|just had|just ate|eaten)|for (?:breakfast|lunch|dinner|snack)[,:]?\s*(?:i (?:had|ate))?|i'm having|im eating|log|track|add)\s*/i, '')
    // Remove serving amounts
    .replace(/\b\d+\.?\d*\s*(oz|ounce|ounces|cup|cups|scoop|scoops|piece|pieces|slice|slices|serving|servings|bowl|bowls|plate|plates|grams?|g|tbsp|tsp|ml|liter|litre)\s*(of\s*)?/gi, '')
    // Remove trailing meal context and command words
    .replace(/\b(for\s+)?(breakfast|lunch|dinner|snack|brunch|my meal|that|this|it|please|thanks|today|tonight|yesterday|log\s*(that|it|this)?|track\s*(that|it|this)?|add\s*(that|it|this)?)\b/gi, '')
    .replace(/\babout\b/gi, '')
    .trim();
  // Clean up extra whitespace
  q = q.replace(/\s+/g, ' ').trim();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 6) q = words.slice(0, 6).join(' ');
  return q.length >= 2 ? q : null;
}

// Extract serving amount from user text and convert to grams
function _extractServingAmount(text) {
  const t = text.toLowerCase();
  let grams = 0;
  let original = '';
  let count = 1;

  // Match patterns: "84g", "84 grams", "3oz", "3 ounces", "8 oz", "2.5 cups", "2 servings", etc.
  const patterns = [
    // Grams: "84g", "84 grams", "84 g"
    { re: /(\d+\.?\d*)\s*(?:g|grams?)\b/i, toG: (m) => parseFloat(m) },
    // Ounces: "8oz", "8 ounces", "2.68 oz"
    { re: /(\d+\.?\d*)\s*(?:oz|ounces?)\b/i, toG: (m) => parseFloat(m) * 28.35 },
    // Cups: "2 cups", "1.5 cup"
    { re: /(\d+\.?\d*)\s*(?:cups?)\b/i, toG: (m) => parseFloat(m) * 240 },
    // Tablespoons: "2 tbsp"
    { re: /(\d+\.?\d*)\s*(?:tbsp|tablespoons?)\b/i, toG: (m) => parseFloat(m) * 15 },
    // Teaspoons: "1 tsp"
    { re: /(\d+\.?\d*)\s*(?:tsp|teaspoons?)\b/i, toG: (m) => parseFloat(m) * 5 },
    // Pounds: "1.5 lbs"
    { re: /(\d+\.?\d*)\s*(?:lbs?|pounds?)\b/i, toG: (m) => parseFloat(m) * 453.6 },
    // ml: "250ml"
    { re: /(\d+\.?\d*)\s*(?:ml|milliliters?)\b/i, toG: (m) => parseFloat(m) },
    // Servings: "2 servings" — we'll use this as a multiplier
    { re: /(\d+\.?\d*)\s*(?:servings?)\b/i, toG: null, isCount: true },
    // Pieces/slices: "3 pieces", "2 slices"
    { re: /(\d+\.?\d*)\s*(?:pieces?|slices?|scoops?)\b/i, toG: null, isCount: true },
  ];

  for (const p of patterns) {
    const match = t.match(p.re);
    if (match) {
      original = match[0];
      if (p.isCount) {
        count = parseFloat(match[1]) || 1;
      } else {
        grams = p.toG(match[1]);
      }
      break;
    }
  }

  return { grams: Math.round(grams), original, count };
}

function _parseFoodLog(reply) {
  // Look for ```FOODLOG ... ``` block
  const regex = /```FOODLOG\s*\n?([\s\S]*?)```/;
  const match = reply.match(regex);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1].trim());
    if (!data.meal || !Array.isArray(data.items) || data.items.length === 0) return null;
    const cleanReply = reply.replace(regex, '').trim();
    return { data, cleanReply };
  } catch(e) {
    return null;
  }
}

// ── MACRO SANITY CHECK ──
// Catches AI hallucinations where protein/carb/fat values are inverted or wildly wrong
// Rule: calories ≈ protein*4 + carbs*4 + fat*9 (within tolerance)
function _validateAndFixMacros(entry) {
  const { cal, pro, carb, fat } = entry;
  if (!cal || cal < 5) return entry; // skip trivial items (water, etc.)

  const computed = Math.round(pro * 4 + carb * 4 + fat * 9);
  const diff = Math.abs(computed - cal);
  const tolerance = Math.max(cal * 0.25, 30); // 25% or 30cal, whichever is larger

  if (diff <= tolerance) return entry; // macros add up

  // Try common inversions and see if any fix it
  const swaps = [
    { pro: carb, carb: pro, fat, label: 'pro↔carb' },
    { pro: fat, carb, fat: pro, label: 'pro↔fat' },
    { pro, carb: fat, fat: carb, label: 'carb↔fat' },
  ];

  for (const s of swaps) {
    const swapComputed = Math.round(s.pro * 4 + s.carb * 4 + s.fat * 9);
    const swapDiff = Math.abs(swapComputed - cal);
    if (swapDiff < diff && swapDiff <= tolerance) {
      console.warn('[MacroFix] ' + entry.name + ': fixed ' + s.label + ' swap (' + pro + 'P/' + carb + 'C/' + fat + 'F → ' + s.pro + 'P/' + s.carb + 'C/' + s.fat + 'F)');
      entry.pro = Math.round(s.pro);
      entry.carb = Math.round(s.carb);
      entry.fat = Math.round(s.fat);
      entry._macroFixed = s.label;
      return entry;
    }
  }

  // No swap fixed it — recalculate calories from macros if macros seem more plausible
  if (computed > 20 && computed < 5000) {
    const macroRatio = computed / cal;
    if (macroRatio > 1.4 || macroRatio < 0.6) {
      console.warn('[MacroFix] ' + entry.name + ': recalculated cal from macros (' + cal + ' → ' + computed + ')');
      entry.cal = computed;
      entry._macroFixed = 'cal-recalc';
      return entry;
    }
  }

  // Can't fix automatically — flag it
  console.warn('[MacroCheck] ' + entry.name + ': macros don\'t add up (cal=' + cal + ', computed=' + computed + ', diff=' + diff + ')');
  entry._macroWarning = true;
  return entry;
}

function _processFoodLog(data) {
  const validMeals = ['breakfast', 'lunch', 'dinner', 'snacks', 'other'];
  // Use pending meal from nutrition page if set, otherwise use what AI said
  let meal;
  if (window._pendingMealCat && validMeals.includes(window._pendingMealCat)) {
    meal = window._pendingMealCat;
  } else {
    meal = validMeals.includes(data.meal) ? data.meal : 'other';
  }
  // Clear pending meal after use
  window._pendingMealCat = null;
  window._pendingMealLabel = null;
  const loggedItems = [];

  for (const item of data.items) {
    if (!item.name) continue;
    let entry = {
      name: item.name,
      cal: Math.round(item.cal || 0),
      pro: Math.round(item.pro || 0),
      carb: Math.round(item.carb || 0),
      fat: Math.round(item.fat || 0),
    };
    // Validate macros add up — catches AI inversions (e.g. swapped protein/carbs)
    entry = _validateAndFixMacros(entry);
    getMealCatEntries(TODAY_IDX, meal).push(entry);
    loggedItems.push(entry);
  }

  if (loggedItems.length > 0) {
    saveToStorage();
    renderMealCategories();
    renderMacros();
    refreshDashMacros();

    // Show a confirmation card in the chat — ONLY the items just logged
    const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
    const itemList = loggedItems.map(e => {
      let badge = '';
      if (e._macroFixed) badge = '<span style="font-size:0.6rem;background:rgba(96,165,250,0.15);color:#60a5fa;padding:2px 6px;border-radius:4px;margin-left:6px">auto-corrected</span>';
      else if (e._macroWarning) badge = '<span style="font-size:0.6rem;background:rgba(244,63,94,0.15);color:#F43F5E;padding:2px 6px;border-radius:4px;margin-left:6px">check macros</span>';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
        <span style="color:var(--off);font-weight:600">${e.name}${badge}</span>
        <span style="font-family:'DM Mono',monospace;font-size:0.7rem;color:#F2F0EB;white-space:nowrap;margin-left:12px">${e.cal} cal · ${e.pro}g P · ${e.carb||0}g C · ${e.fat||0}g F</span>
      </div>`
    }).join('');

    const container = document.getElementById('coach-messages');
    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(212,165,32,0.06);border:1px solid rgba(212,165,32,0.15);border-radius:14px;padding:12px 14px;font-size:0.78rem;color:var(--off);line-height:1.5;max-width:85%;align-self:flex-start;';
    card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="color:#F2F0EB;font-size:0.9rem">✓</span><span style="font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:1.5px;color:#F2F0EB">LOGGED TO ${mealLabel.toUpperCase()}</span></div>
      ${itemList}`;
    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }
}

// ═══════════════════════════════════════════
// PROACTIVE COACH ENGINE
// ═══════════════════════════════════════════

const PROACTIVE_LS_KEY = 'fs_proactive_msgs';
const PROACTIVE_LAST_KEY = 'fs_proactive_last';

// Trigger types and their cooldowns (ms)
const PROACTIVE_COOLDOWNS = {
  post_workout:     0,           // Always fires after a workout
  missed_workout:   20 * 60 * 60 * 1000, // Once per 20h
  morning_primer:   20 * 60 * 60 * 1000, // Once per 20h
  streak_milestone: 7 * 24 * 60 * 60 * 1000, // Once per week per milestone
  low_protein:      20 * 60 * 60 * 1000, // Once per 20h
};

function _getProactiveLast() {
  try { return JSON.parse(localStorage.getItem(PROACTIVE_LAST_KEY)) || {}; } catch(e) { return {}; }
}
function _setProactiveLast(key) {
  const all = _getProactiveLast();
  all[key] = Date.now();
  try { localStorage.setItem(PROACTIVE_LAST_KEY, JSON.stringify(all)); } catch(e) {}
}
function _proactiveCooldownOk(key) {
  const cooldown = PROACTIVE_COOLDOWNS[key] || (24 * 60 * 60 * 1000);
  const last = _getProactiveLast();
  return !last[key] || (Date.now() - last[key]) > cooldown;
}

// Queue a proactive message — stores it and shows notification dot
function _queueProactiveMessage(msg, triggerKey) {
  const msgs = _getProactiveQueue();
  msgs.push({ text: msg, ts: Date.now(), trigger: triggerKey, read: false });
  // Keep last 10
  const trimmed = msgs.slice(-10);
  try { localStorage.setItem(PROACTIVE_LS_KEY, JSON.stringify(trimmed)); } catch(e) {}
  _updateCoachNotifDot();
  // If coach is currently open, inject the bubble live
  const coachView = document.getElementById('view-coach');
  if (coachView && coachView.classList.contains('active')) {
    _injectProactiveBubble(msg, false);
    _markProactiveRead();
  }
}

function _getProactiveQueue() {
  try { return JSON.parse(localStorage.getItem(PROACTIVE_LS_KEY)) || []; } catch(e) { return []; }
}

function _markProactiveRead() {
  const msgs = _getProactiveQueue();
  msgs.forEach(m => m.read = true);
  try { localStorage.setItem(PROACTIVE_LS_KEY, JSON.stringify(msgs)); } catch(e) {}
  _updateCoachNotifDot();
}

function _updateCoachNotifDot() {
  const msgs = _getProactiveQueue();
  const unread = msgs.filter(m => !m.read).length;
  // Update sidebar dot
  let dot = document.getElementById('coach-notif-dot');
  let mobDot = document.getElementById('coach-notif-dot-mob');
  if (unread > 0) {
    if (!dot) {
      // Find sidebar coach button and add dot
      const coachSbBtn = document.querySelector('.sb-btn[onclick*="\'coach\'"]');
      if (coachSbBtn) {
        dot = document.createElement('div');
        dot.id = 'coach-notif-dot';
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--gold);position:absolute;top:6px;right:6px;animation:pulse 2s ease infinite;pointer-events:none';
        coachSbBtn.style.position = 'relative';
        coachSbBtn.appendChild(dot);
      }
    }
    if (!mobDot) {
      const mobCoach = document.getElementById('mob-tab-coach');
      if (mobCoach) {
        mobDot = document.createElement('div');
        mobDot.id = 'coach-notif-dot-mob';
        mobDot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--gold);position:absolute;top:4px;right:4px;animation:pulse 2s ease infinite;pointer-events:none';
        mobCoach.style.position = 'relative';
        mobCoach.appendChild(mobDot);
      }
    }
    if (dot) dot.style.display = '';
    if (mobDot) mobDot.style.display = '';
  } else {
    if (dot) dot.style.display = 'none';
    if (mobDot) mobDot.style.display = 'none';
  }
}

function _injectProactiveBubble(text, skipHistory) {
  const container = document.getElementById('coach-messages');
  if (!container) return;
  // Don't hide starters for the first proactive message — keep them accessible
  // Only hide starters if there's already a conversation
  if (_coachHistory.length > 0) {
    const starters = document.getElementById('coach-starters');
    if (starters) starters.style.display = 'none';
  }
  const clearBtn = document.getElementById('coach-clear-btn');
  if (clearBtn) clearBtn.style.display = 'block';
  const bubble = document.createElement('div');
  bubble.className = 'coach-bubble assistant proactive-bubble';
  bubble.style.cssText = 'border-color:rgba(212,165,32,0.22);background:rgba(212,165,32,0.06)';
  bubble.innerHTML = _formatCoachText(text);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  // Only add to history if not already persisted there
  if (!skipHistory) {
    _coachHistory.push({ role: 'assistant', content: text });
    _saveCoachHistory();
  }
}

// Called when coach view opens — flush any queued unread messages
function _flushProactiveMessages() {
  const msgs = _getProactiveQueue();
  const unread = msgs.filter(m => !m.read);
  if (!unread.length) return;
  // Only show messages from the last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  // Check which ones are already in chat history (don't re-render them)
  const historyTexts = new Set(_coachHistory.map(m => typeof m.content === 'string' ? m.content.trim() : ''));
  unread.filter(m => m.ts > cutoff).forEach(m => {
    if (!historyTexts.has(m.text.trim())) {
      _injectProactiveBubble(m.text, false);
    }
  });
  _markProactiveRead();
}

// ── TRIGGER 1: Post-Workout Message ──
async function triggerPostWorkoutMessage(workoutName, prList, totalVolume, durationMs) {
  if (!USER) return;
  _setProactiveLast('post_workout');
  try {
    const durMins = durationMs ? Math.round(durationMs / 60000) : 0;
    const prText = prList && prList.length > 0
      ? `PRs hit: ${prList.map(p => p.exercise + ' ' + p.weight + 'lbs×' + p.reps + (p.e1rmGain ? ' (+' + p.e1rmGain + ' e1RM)' : '')).join(', ')}.`
      : 'No new PRs today.';
    const ph = (typeof getTrainingPhase === 'function') ? getTrainingPhase(CURRENT_WEEK) : { name: '' };

    const prompt = `You are the Blueprint AI Coach. Write a SHORT post-workout message (2-3 sentences max) for ${USER.name || 'your client'}.

Workout just completed: ${workoutName}
Duration: ${durMins} min
Total volume: ${totalVolume ? totalVolume.toLocaleString() + ' lbs' : 'not tracked'}
${prText}
Phase: ${(typeof isDeloadWeek === 'function' && isDeloadWeek(CURRENT_WEEK)) ? 'DELOAD WEEK' : ph.name + ' PHASE'}

Be specific, warm, coach-like. Mention at least one concrete detail from the session. End with ONE focus point for recovery or next session. No generic fluff. Don't use the word "incredible" or "amazing".`;

    const reply = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 150 });
    if (reply) _queueProactiveMessage(reply, 'post_workout');
  } catch(e) { console.log('Post-workout message error:', e); }
}

// ── TRIGGER 2: Missed Workout Nudge (evening check) ──
async function triggerMissedWorkoutCheck() {
  if (!USER) return;
  if (!_proactiveCooldownOk('missed_workout')) return;

  const now = new Date();
  const hour = now.getHours();
  // Only fire 7pm–10pm
  if (hour < 19 || hour >= 22) return;

  const isGymDay = (typeof GYM_DAYS !== 'undefined') && GYM_DAYS.includes(TODAY_IDX);
  if (!isGymDay) return;

  const todayDone = wktDone && wktDone.has(TODAY_IDX);
  if (todayDone) return;

  _setProactiveLast('missed_workout');
  try {
    const todayWorkout = (typeof DAY_WORKOUTS !== 'undefined') ? DAY_WORKOUTS[TODAY_IDX] : null;
    const workoutName = todayWorkout ? todayWorkout.name : 'your workout';
    const ph = (typeof getTrainingPhase === 'function') ? getTrainingPhase(CURRENT_WEEK) : { name: '' };

    // Count missed days this week
    const workoutDates = (typeof getWorkoutDates === 'function') ? getWorkoutDates() : new Set();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    let doneThisWeek = 0;
    workoutDates.forEach(d => { if (new Date(d + 'T00:00:00') >= weekStart) doneThisWeek++; });
    const weekGoal = (typeof GYM_DAYS !== 'undefined') ? GYM_DAYS.length : 3;

    const prompt = `You are the Blueprint AI Coach. Write a SHORT missed-workout nudge (2 sentences) for ${USER.name || 'your client'}.

It's ${hour >= 20 ? 'late evening' : 'evening'}, they haven't done their scheduled ${workoutName} today.
Week progress: ${doneThisWeek}/${weekGoal} workouts done so far.
Phase: ${(typeof isDeloadWeek === 'function' && isDeloadWeek(CURRENT_WEEK)) ? 'DELOAD WEEK (reduced volume — especially easy to get in)' : ph.name + ' PHASE'}

Be honest but not guilt-trippy. Acknowledge it's late, offer a practical option (shorter session, tomorrow, etc). Sound like a real trainer texting them — not a push notification. 2 sentences max.`;

    const reply = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 100 });
    if (reply) _queueProactiveMessage(reply, 'missed_workout');
  } catch(e) { console.log('Missed workout check error:', e); }
}

// ── TRIGGER 3: Morning Gym Day Primer ──
async function triggerMorningPrimer() {
  if (!USER) return;
  if (!_proactiveCooldownOk('morning_primer')) return;

  const now = new Date();
  const hour = now.getHours();
  // Only 6am–11am
  if (hour < 6 || hour >= 11) return;

  const isGymDay = (typeof GYM_DAYS !== 'undefined') && GYM_DAYS.includes(TODAY_IDX);
  if (!isGymDay) return;

  const todayDone = wktDone && wktDone.has(TODAY_IDX);
  if (todayDone) return;

  _setProactiveLast('morning_primer');
  try {
    const todayWorkout = (typeof DAY_WORKOUTS !== 'undefined') ? DAY_WORKOUTS[TODAY_IDX] : null;
    const workoutName = todayWorkout ? todayWorkout.name : 'your workout';
    const exercises = todayWorkout && todayWorkout.exercises ? todayWorkout.exercises.slice(0, 3).map(e => e.name).join(', ') : '';
    const ph = (typeof getTrainingPhase === 'function') ? getTrainingPhase(CURRENT_WEEK) : { name: '' };

    // Check yesterday's protein
    const mealData = lsGet('fs_mealLogs') || {};
    const yIdx = TODAY_IDX > 0 ? TODAY_IDX - 1 : 0;
    const yCals = (mealData[yIdx] || []);
    let yPro = 0;
    if (typeof getMealCatEntries === 'function' && typeof MEAL_CATS !== 'undefined') {
      for (const cat of MEAL_CATS) {
        const entries = getMealCatEntries(yIdx, cat.id);
        entries.forEach(e => { yPro += (e.pro || 0); });
      }
    }
    const proTarget = (typeof TARGETS !== 'undefined') ? TARGETS.pro : 150;

    const prompt = `You are the Blueprint AI Coach. Write a morning pre-workout message (2 sentences) for ${USER.name || 'your client'}.

Today's workout: ${workoutName}${exercises ? ' — ' + exercises : ''}
Phase: ${(typeof isDeloadWeek === 'function' && isDeloadWeek(CURRENT_WEEK)) ? 'DELOAD WEEK — lighter loads, focus on movement quality' : ph.name + ' PHASE: ' + ph.intensityLabel}
${yPro > 0 ? 'Yesterday protein: ' + yPro + 'g (target: ' + proTarget + 'g)' + (yPro < proTarget * 0.8 ? ' — was low, remind them to hit protein today' : '') : ''}

Sound like a trainer texting before a session — energized but not cheesy. Mention what muscle groups they're hitting. One tactical tip for the phase they're in. 2 sentences max.`;

    const reply = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 100 });
    if (reply) _queueProactiveMessage(reply, 'morning_primer');
  } catch(e) { console.log('Morning primer error:', e); }
}

// ── TRIGGER 4: Streak Milestone ──
async function triggerStreakMilestone(streak) {
  if (!USER) return;
  const milestones = [3, 7, 14, 21, 30, 50, 75, 100];
  if (!milestones.includes(streak)) return;

  const milestoneKey = 'streak_' + streak;
  const last = _getProactiveLast();
  if (last[milestoneKey]) return; // Only fire once per milestone ever
  _setProactiveLast(milestoneKey);

  try {
    const prompt = `You are the Blueprint AI Coach. Write a streak milestone message (2 sentences) for ${USER.name || 'your client'}.

They just hit a ${streak}-day workout streak. Goal: ${USER.nutrition?.mode === 'lose' ? 'fat loss' : 'muscle gain'}.

Celebrate genuinely but briefly. Make it feel earned, not generic. Reference the actual number. 2 sentences.`;

    const reply = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 80 });
    if (reply) _queueProactiveMessage('🔥 ' + reply, milestoneKey);
  } catch(e) { console.log('Streak milestone error:', e); }
}

// ── TRIGGER 5: Low Protein End-of-Day ──
async function triggerLowProteinNudge() {
  if (!USER) return;
  if (!_proactiveCooldownOk('low_protein')) return;

  const now = new Date();
  const hour = now.getHours();
  // Only 6pm–9pm
  if (hour < 18 || hour >= 21) return;

  const proTarget = (typeof TARGETS !== 'undefined') ? TARGETS.pro : 150;
  let todayPro = 0;
  if (typeof getMealCatEntries === 'function' && typeof MEAL_CATS !== 'undefined' && typeof TODAY_IDX !== 'undefined') {
    for (const cat of MEAL_CATS) {
      const entries = getMealCatEntries(TODAY_IDX, cat.id);
      entries.forEach(e => { todayPro += (e.pro || 0); });
    }
  }

  // Only fire if logged some food but protein is under 60% of target
  if (todayPro === 0) return; // No food logged — don't nudge
  if (todayPro >= proTarget * 0.7) return; // Doing fine

  _setProactiveLast('low_protein');
  try {
    const remaining = proTarget - todayPro;
    const prompt = `You are the Blueprint AI Coach. Write a protein nudge (1-2 sentences) for ${USER.name || 'your client'}.

They've logged ${todayPro}g protein today against a target of ${proTarget}g. It's ${hour >= 20 ? 'late evening' : 'evening'}.
Remaining: ${remaining}g to hit target.

Be practical — suggest a specific high-protein food or quick option they could still eat. Don't lecture. 1-2 sentences.`;

    const reply = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 80 });
    if (reply) _queueProactiveMessage(reply, 'low_protein');
  } catch(e) { console.log('Low protein nudge error:', e); }
}

// ── MASTER CHECK: run all ambient triggers ──
// Called from initDashboard once per app load
async function runProactiveCoachChecks() {
  if (!USER) return;
  // Stagger slightly so they don't all fire simultaneously
  setTimeout(() => triggerMorningPrimer(), 2000);
  setTimeout(() => triggerMissedWorkoutCheck(), 4000);
  setTimeout(() => triggerLowProteinNudge(), 6000);

  // Check streak milestone
  try {
    const workoutDates = (typeof getWorkoutDates === 'function') ? getWorkoutDates() : new Set();
    const now = new Date();
    let streak = 0;
    for (let i = 0; i < 120; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      if (workoutDates.has(key)) streak++;
      else if (i > 0) break;
    }
    if (streak > 0) setTimeout(() => triggerStreakMilestone(streak), 1000);
  } catch(e) {}

  // Restore notification dot state
  setTimeout(() => _updateCoachNotifDot(), 500);
}
