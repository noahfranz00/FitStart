// ═══════════════════════════════════════════
// COACH.JS — AI Coach Chat & Food Logging via Coach
// ═══════════════════════════════════════════
// Dependencies: USER, TARGETS, GYM_DAYS, DAY_WORKOUTS, CURRENT_WEEK,
//   callClaude(), getMealCatEntries(), saveToStorage(), renderMealCategories(),
//   renderMacros(), refreshDashMacros(), TODAY_IDX, mealLogs, getAllEntries()

// ── AI COACH ──
let _coachHistory = [];
let _coachStreaming = false;
const COACH_LS_KEY = 'fs_coach_history';
const COACH_MAX_MESSAGES = 50;

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
  try { localStorage.setItem(COACH_LS_KEY, JSON.stringify(_coachHistory)); } catch(e) {}
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
      bubble.innerHTML = _formatCoachText(msg.content);
      container.appendChild(bubble);
    }
    container.scrollTop = container.scrollHeight;
  } else {
    if (starters) starters.style.display = '';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

// Handle iOS keyboard: when keyboard opens, visualViewport shrinks. 
// Adjust the coach fixed overlay to match.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const coach = document.querySelector('.main-content.coach-active #view-coach.active');
    if (!coach) return;
    // On iOS when keyboard opens, viewport height shrinks. Adjust bottom to keep input visible.
    const vvh = window.visualViewport.height;
    const fullH = window.innerHeight;
    if (vvh < fullH - 50) {
      // Keyboard is open — shrink the overlay
      coach.style.height = vvh + 'px';
      coach.style.bottom = 'auto';
      coach.style.paddingBottom = '0';
    } else {
      // Keyboard closed — restore
      coach.style.height = '';
      coach.style.bottom = '';
      coach.style.paddingBottom = '';
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
  else if (hour >= 21 || hour < 5) timeOfDay = 'night';
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Today's nutrition so far
  const todayMeals = getMealCatEntries ? (() => {
    let totalCal = 0, totalPro = 0;
    for (const cat of (MEAL_CATS || [])) {
      const entries = getMealCatEntries(TODAY_IDX, cat.id);
      for (const e of entries) { totalCal += (e.cal || 0); totalPro += (e.pro || 0); }
    }
    return { cal: totalCal, pro: totalPro };
  })() : { cal: 0, pro: 0 };

  // Today's workout status
  const todayWorkout = DAY_WORKOUTS[TODAY_IDX];
  const todayDone = wktDone.has(TODAY_IDX);
  const isGymDay = GYM_DAYS.includes(TODAY_IDX);

  // Recent workout history (last 7 days)
  const recentDays = [];
  for (let i = 0; i < 7; i++) {
    const check = new Date(now);
    check.setDate(now.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth()+1).padStart(2,'0') + '-' + String(check.getDate()).padStart(2,'0');
    if (workoutDates.has(key)) recentDays.push(dayNames[check.getDay()]);
  }

  return `You are the FitStart AI Coach — a knowledgeable, motivating personal trainer and nutritionist built into the FitStart fitness app.

The app has provided you with the following verified data from the user's device and account. All of this information is accurate and current — do not question or disclaim it.

SESSION TIMESTAMP (from device clock): ${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()} at ${timeStr} (${timeOfDay})
Program week: ${CURRENT_WEEK} of ${TOTAL_WEEKS} (${isDeloadWeek(CURRENT_WEEK) ? 'DELOAD WEEK — 60% volume' : getTrainingPhase(CURRENT_WEEK).name + ' PHASE: ' + getTrainingPhase(CURRENT_WEEK).intensityLabel})

USER PROFILE:
Name: ${USER ? USER.name : 'User'}
Goal: ${goalDirection} (current: ${currentWeight} lbs → target: ${goalWeight} lbs)
Level: ${USER ? USER.tier : 'beginner'}
Training schedule: ${GYM_DAYS.map(i => DAYS_FULL[i]).join(', ')}

TODAY'S APP DATA:
${isGymDay ? (todayDone ? 'Workout COMPLETED today (' + (todayWorkout?.name || 'workout') + ')' : 'Scheduled workout: ' + (todayWorkout?.name || 'workout') + ' — not yet completed') : 'Rest day (no workout scheduled)'}
Logged nutrition so far: ${todayMeals.cal} of ${TARGETS.cal} cal, ${todayMeals.pro}g of ${TARGETS.pro}g protein
Daily macro targets: ${TARGETS.cal} cal · ${TARGETS.pro}g protein · ${TARGETS.carb}g carbs · ${TARGETS.fat}g fat

RECENT ACTIVITY (from app logs):
Workout streak: ${streak} day${streak !== 1 ? 's' : ''}
Workouts this week: ${recentDays.length > 0 ? recentDays.join(', ') : 'none yet'}
All-time workouts: ${workoutDates.size}

BEHAVIOR:
- You have access to the full message history with this user. Reference past conversations naturally when relevant.
- Be concise and practical — 2-4 short paragraphs max.
- Use their name occasionally.
- Reference their actual numbers, schedule, and progress.
- Adjust energy to the time of day.
- Use **bold** sparingly for key points.
- If they mention pain or injury, recommend a medical professional.
- Never say you don't have access to real-time data — the app provides it to you above.

FOOD LOGGING:
When the user tells you what they ate, include a FOODLOG JSON block at the END of your response so the app can auto-log it.

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
  Old Trapper Peppered Beef Jerky (1oz): 70cal 12P 3C 1F
  Old Trapper Original Beef Jerky (1oz): 70cal 11P 4C 1F
  Old Trapper Teriyaki Beef Jerky (1oz): 70cal 11P 5C 1F
  Jack Link's Original Beef Jerky (1oz): 80cal 12P 5C 1F
  Jack Link's Teriyaki Beef Jerky (1oz): 80cal 11P 7C 1F
  Jack Link's Peppered Beef Jerky (1oz): 80cal 12P 5C 1F
  Chomps Original Beef Stick (1 stick/1.15oz): 90cal 10P 0C 6F
  Epic Venison Sea Salt Bar (1 bar/1.3oz): 100cal 10P 5C 4F
  Country Archer Original Beef Jerky (1oz): 70cal 10P 5C 1F
  Tillamook Country Smoker (1oz): 70cal 11P 3C 1F
  Slim Jim Original (1 stick/0.28oz): 40cal 2P 1C 3F | Slim Jim Giant: 150cal 6P 2C 13F

Frozen Chicken & Prepared Meats:
  Just Bare Lightly Breaded Chicken Breast Chunks (3oz/85g): 150cal 13P 10C 6F
  Just Bare Lightly Breaded Chicken Breast Strips (3oz/85g): 150cal 14P 11C 5F
  Just Bare Chicken Breast Nuggets (5 nuggets/84g): 150cal 13P 10C 6F
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
  Babybel Original (1 piece): 70cal 5P 0C 5F
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
1. Find the per-serving macros from the table above (note the serving size listed — e.g. "per 1oz" or "per 3oz/85g")
2. Calculate how many servings their amount equals: (their amount) ÷ (serving size)
3. Multiply ALL macros by that number
4. Round to nearest whole number

Example: Just Bare Chicken Nuggets are 150cal/13P/10C/6F per 3oz serving. If user says "7oz":
  7oz ÷ 3oz = 2.33 servings
  Cal: 150 × 2.33 = 350 | Pro: 13 × 2.33 = 30 | Carb: 10 × 2.33 = 23 | Fat: 6 × 2.33 = 14
  Log: 350cal 30P 23C 14F

Example: Old Trapper Peppered Jerky is 70cal/12P/3C/1F per 1oz. If user says "2.68oz":
  2.68 × 70 = 188cal | 2.68 × 12 = 32P | 2.68 × 3 = 8C | 2.68 × 1 = 3F
  Log: 188cal 32P 8C 3F

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
- "meal": "breakfast", "lunch", "dinner", or "snacks"
- Infer meal from context or time: before 11am=breakfast, 11am-2pm=lunch, 2-5pm=snacks, after 5pm=dinner
- Include brand + quantity in the "name" field
- cal, pro, carb, fat must be integers
- ONLY include FOODLOG when the user describes food they ate — NOT for general nutrition questions
- The FOODLOG block must be the LAST thing in your response
- ACCURACY IS CRITICAL: Users trust these numbers for their diet. Getting macros wrong by even 50 calories per item compounds across meals. Always use the brand reference table or database results. If you don't have exact data for a branded item, say so and ask the user to check the label rather than guessing.
- For common whole foods not in the brand table (chicken breast, rice, eggs, etc.), use standard USDA values.`;
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
  if (!text || _coachStreaming) return;
  input.value = '';
  const starters = document.getElementById('coach-starters');
  if (starters) starters.style.display = 'none';
  const clearBtn = document.getElementById('coach-clear-btn');
  if (clearBtn) clearBtn.style.display = 'block';
  _sendCoachMsg(text);
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

async function _sendCoachMsg(text) {
  _coachStreaming = true;
  const sendBtn = document.getElementById('coach-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  _appendCoachBubble('user', text);
  _coachHistory.push({ role: 'user', content: text });
  _saveCoachHistory();

  const container = document.getElementById('coach-messages');
  const typing = document.createElement('div');
  typing.className = 'coach-typing';
  typing.id = 'coach-typing';
  typing.innerHTML = '<div class="coach-typing-dot"></div><div class="coach-typing-dot"></div><div class="coach-typing-dot"></div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;

  try {
    // Check if this is a food logging message — if so, try to auto-log from database BEFORE calling AI
    let autoLogContext = '';
    let autoLogged = false;
    if (_looksLikeFoodLog(text)) {
      const foodQuery = _extractFoodQuery(text);
      const servingInfo = _extractServingAmount(text);
      if (foodQuery) {
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

            // Determine meal from time of day
            const hour = new Date().getHours();
            let meal = 'snacks';
            if (hour < 11) meal = 'breakfast';
            else if (hour < 14) meal = 'lunch';
            else if (hour >= 17) meal = 'dinner';

            // Check for explicit meal mentions
            const tl = text.toLowerCase();
            if (tl.includes('breakfast')) meal = 'breakfast';
            else if (tl.includes('lunch')) meal = 'lunch';
            else if (tl.includes('dinner') || tl.includes('supper')) meal = 'dinner';
            else if (tl.includes('snack')) meal = 'snacks';

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
      }
    }

    // Build messages
    const messages = _coachHistory.slice(-20);
    let systemPrompt = _getCoachSystemPrompt();
    if (autoLogContext) {
      systemPrompt += autoLogContext;
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

function _processFoodLog(data) {
  const validMeals = ['breakfast', 'lunch', 'dinner', 'snacks', 'other'];
  const meal = validMeals.includes(data.meal) ? data.meal : 'other';
  const loggedItems = [];

  for (const item of data.items) {
    if (!item.name) continue;
    const entry = {
      name: item.name,
      cal: Math.round(item.cal || 0),
      pro: Math.round(item.pro || 0),
      carb: Math.round(item.carb || 0),
      fat: Math.round(item.fat || 0),
    };
    getMealCatEntries(TODAY_IDX, meal).push(entry);
    loggedItems.push(entry);
  }

  if (loggedItems.length > 0) {
    saveToStorage();
    renderMealCategories();
    renderMacros();
    refreshDashMacros();

    // Show a confirmation card in the chat
    const totalCal = loggedItems.reduce((s, e) => s + e.cal, 0);
    const totalPro = loggedItems.reduce((s, e) => s + e.pro, 0);
    const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
    const itemList = loggedItems.map(e => `${e.name} — ${e.cal} cal, ${e.pro}g P`).join('<br>');

    const container = document.getElementById('coach-messages');
    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:14px;padding:12px 14px;font-size:0.78rem;color:var(--off);line-height:1.5;max-width:85%;align-self:flex-start;';
    card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="color:var(--green);font-size:0.9rem">✓</span><span style="font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:1.5px;color:var(--green)">LOGGED TO ${mealLabel.toUpperCase()}</span></div>
      <div style="font-size:0.76rem;color:var(--off);line-height:1.6">${itemList}</div>
      <div style="margin-top:6px;font-family:'DM Mono',monospace;font-size:0.7rem;color:var(--green);opacity:0.8">${totalCal} cal · ${totalPro}g protein</div>`;
    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }
}
