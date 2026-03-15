// ═══════════════════════════════════════════════════════════════
// BLUEPRINT API WORKER v2 — Claude Proxy + KV Sync + Agent Tools
//
// Endpoints:
//   POST /            — Claude proxy (legacy + agent tool loop)
//   POST /api/chat    — same
//   PUT  /api/sync    — Push localStorage to KV
//   GET  /api/sync    — Pull from KV (recovery)
//   DELETE /api/sync  — Wipe server data
//   GET  /api/health  — Health check
//
// Bindings: BLUEPRINT_KV (KV namespace), ANTHROPIC_API_KEY (secret)
// Optional: GOOGLE_PLACES_KEY (secret, for real restaurant search)
// Auth: X-Device-ID header
// ═══════════════════════════════════════════════════════════════

const AGENT_TOOLS = [
  {
    name: "get_user_plan",
    description: "Get the user's workout plan. Returns weekly schedule with exercises, sets, reps, rest, muscles. Use when you need to see their program or upcoming workouts.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "array", items: { type: "string" }, description: "Specific days (e.g. ['Monday','Tuesday']). Omit for full week." }
      }
    }
  },
  {
    name: "get_nutrition_status",
    description: "Get today's nutrition: foods eaten, remaining macros, daily targets, percentage complete. Use when discussing meals or checking progress.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "update_workout",
    description: "Substitute exercises for a specific day. Use when user wants changes, is traveling, or adjusting for injury. Always tell them what you changed.",
    input_schema: {
      type: "object",
      properties: {
        day: { type: "string", description: "Day of week (e.g. 'Monday')" },
        substitutions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              old_exercise: { type: "string" }, new_exercise: { type: "string" },
              sets: { type: "integer" }, reps: { type: "string" },
              rest: { type: "integer" }, muscles: { type: "string" }
            },
            required: ["old_exercise", "new_exercise"]
          }
        },
        reason: { type: "string", description: "Why the change was made" }
      },
      required: ["day"]
    }
  },
  {
    name: "adjust_plan_for_travel",
    description: "Preview which workout days fall in a travel window and what exercises need changing. Call this first, then call update_workout for each day.",
    input_schema: {
      type: "object",
      properties: {
        start_day: { type: "string", description: "First travel day (e.g. 'Wednesday')" },
        num_days: { type: "integer", description: "Number of travel days" },
        available_equipment: { type: "string", description: "What's available (e.g. 'dumbbells to 50lbs, cables, treadmill' or 'bodyweight only')" },
        location_context: { type: "string", description: "Where they're staying" }
      },
      required: ["start_day", "num_days", "available_equipment"]
    }
  },
  {
    name: "search_nearby",
    description: "Find restaurants, gyms, or grocery stores near a location. Returns specific recommendations. Use when user mentions travel, eating out, or needs local suggestions.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to find (e.g. 'high protein restaurant')" },
        location: { type: "string", description: "Area (e.g. 'downtown LA near Marriott')" },
        type: { type: "string", enum: ["restaurant", "gym", "grocery", "general"] }
      },
      required: ["query", "location"]
    }
  },
  {
    name: "log_food",
    description: "Log food items to the user's nutrition tracker with macros. Use when user tells you what they ate.",
    input_schema: {
      type: "object",
      properties: {
        meal: { type: "string", enum: ["breakfast", "lunch", "dinner", "snacks", "other"] },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" }, cal: { type: "integer" },
              pro: { type: "integer" }, carb: { type: "integer" }, fat: { type: "integer" }
            },
            required: ["name", "cal", "pro", "carb", "fat"]
          }
        }
      },
      required: ["meal", "items"]
    }
  }
];

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function dayIndex(name) { return DAY_NAMES.findIndex(d => d.toLowerCase() === name.toLowerCase()); }

// ── MAIN ──
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors204();
    const path = new URL(request.url).pathname;
    try {
      if (path === '/api/chat' || path === '/') return handleChat(request, env);
      if (path === '/api/sync') {
        const did = did_(request); if (!did) return err(401, 'Missing X-Device-ID');
        if (request.method === 'PUT') return syncPush(request, env, did);
        if (request.method === 'GET') return syncPull(env, did);
        if (request.method === 'DELETE') return syncDel(env, did);
      }
      if (path === '/api/sync/keys') {
        const did = did_(request); if (!did) return err(401, 'Missing X-Device-ID');
        return syncKeys(env, did);
      }
      if (path === '/api/health') return json({ status: 'ok', ts: Date.now() });
      return err(404, 'Not found');
    } catch (e) { console.error(e); return err(500, e.message); }
  }
};

// ═══ CHAT + AGENT LOOP ═══
async function handleChat(request, env) {
  if (request.method !== 'POST') return err(405, 'POST required');
  const body = await request.json();
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return err(500, 'API key not configured');

  const deviceId = did_(request);

  // Load user data from KV
  let ud = null;
  if (deviceId && env.BLUEPRINT_KV) {
    try {
      const raw = await env.BLUEPRINT_KV.get(`user:${deviceId}`, 'json');
      if (raw && raw.keys) ud = raw.keys;
    } catch (e) {}
  }

  const apiBody = {
    model: body.model || 'claude-sonnet-4-20250514',
    max_tokens: body.max_tokens || 2048,
    messages: body.messages || []
  };
  if (body.system) apiBody.system = body.system;

  // Attach tools only if we have user data in KV
  const hasTools = !!ud;
  if (hasTools) apiBody.tools = AGENT_TOOLS;

  let resp = await claude(apiBody, apiKey);
  let loops = 0, changed = false;

  // Agent loop: Claude calls tools → we execute → send results → Claude continues
  while (hasTools && resp.stop_reason === 'tool_use' && loops < 8) {
    loops++;
    const calls = resp.content.filter(b => b.type === 'tool_use');
    const results = [];

    for (const c of calls) {
      console.log(`[Agent] ${c.name}(${JSON.stringify(c.input).substring(0, 150)})`);
      const r = await runTool(c.name, c.input, ud, env, deviceId);
      if (r._changed) { changed = true; delete r._changed; }
      results.push({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(r) });
    }

    apiBody.messages.push({ role: 'assistant', content: resp.content });
    apiBody.messages.push({ role: 'user', content: results });
    resp = await claude(apiBody, apiKey);
  }

  // Return final response — same shape as before so client code works
  const out = { content: resp.content, model: resp.model, stop_reason: resp.stop_reason, usage: resp.usage };
  if (changed) out._sync_pull = true;
  return json(out);
}

async function claude(body, key) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  return r.json();
}

// ═══ TOOL DISPATCH ═══
async function runTool(name, input, ud, env, did) {
  if (name === 'get_user_plan') return tPlan(input, ud);
  if (name === 'get_nutrition_status') return tNutrition(ud);
  if (name === 'update_workout') return await tUpdate(input, ud, env, did);
  if (name === 'adjust_plan_for_travel') return tTravel(input, ud);
  if (name === 'search_nearby') return await tSearch(input, env);
  if (name === 'log_food') return await tFood(input, ud, env, did);
  return { error: 'Unknown tool: ' + name };
}

// ── get_user_plan ──
function tPlan(input, ud) {
  if (!ud || !ud.fs_plan) return { error: 'No plan found.' };
  let plan; try { plan = JSON.parse(ud.fs_plan); } catch (e) { return { error: 'Bad plan data.' }; }
  const sched = plan.weekly_schedule || [];
  let days = sched;
  if (input.days && input.days.length) {
    const want = input.days.map(d => d.toLowerCase());
    days = sched.filter(d => want.includes(d.day.toLowerCase()));
  }
  return {
    plan_name: plan.name, tagline: plan.tagline,
    schedule: days.map(d => d.type === 'rest' || !d.exercises?.length
      ? { day: d.day, type: 'rest' }
      : { day: d.day, badge: d.badge, exercises: d.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, muscles: e.muscles })) })
  };
}

// ── get_nutrition_status ──
function tNutrition(ud) {
  if (!ud) return { error: 'No data.' };
  let tgt = { cal: 2000, pro: 150, carb: 200, fat: 70 };
  try { const t = JSON.parse(ud.fs_targets || '{}'); if (t.cal) tgt = t; } catch (e) {}
  const idx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  let ate = { cal: 0, pro: 0, carb: 0, fat: 0 }, foods = [];
  try {
    const ml = JSON.parse(ud.fs_mealLogs || '{}')[idx] || {};
    for (const cat of Object.keys(ml))
      for (const it of ml[cat] || []) { ate.cal += it.cal||0; ate.pro += it.pro||0; ate.carb += it.carb||0; ate.fat += it.fat||0; foods.push(it.name); }
  } catch (e) {}
  return { targets: tgt, logged: ate, remaining: { cal: Math.max(0,tgt.cal-ate.cal), pro: Math.max(0,tgt.pro-ate.pro), carb: Math.max(0,tgt.carb-ate.carb), fat: Math.max(0,tgt.fat-ate.fat) }, foods_today: foods };
}

// ── update_workout ──
async function tUpdate(input, ud, env, did) {
  if (!ud || !ud.fs_plan) return { error: 'No plan.' };
  let plan; try { plan = JSON.parse(ud.fs_plan); } catch (e) { return { error: 'Bad plan.' }; }
  const di = dayIndex(input.day); if (di === -1) return { error: 'Unknown day: ' + input.day };
  const sched = plan.weekly_schedule || [];
  const day = sched[di]; if (!day || !day.exercises) return { error: input.day + ' is rest.' };
  const changes = [];
  for (const sub of (input.substitutions || [])) {
    const ei = day.exercises.findIndex(e => e.name.toLowerCase() === sub.old_exercise.toLowerCase());
    if (ei !== -1) {
      const old = day.exercises[ei];
      day.exercises[ei] = { name: sub.new_exercise, sets: sub.sets||old.sets, reps: sub.reps||old.reps, rest: sub.rest||old.rest, muscles: sub.muscles||old.muscles };
      changes.push(old.name + ' → ' + sub.new_exercise);
    } else { changes.push('Not found: ' + sub.old_exercise); }
  }
  ud.fs_plan = JSON.stringify(plan);
  await kvSave(env, did, ud);
  return { updated: input.day, changes: changes, reason: input.reason || '', _changed: true };
}

// ── adjust_plan_for_travel (preview) ──
function tTravel(input, ud) {
  if (!ud || !ud.fs_plan) return { error: 'No plan.' };
  let plan; try { plan = JSON.parse(ud.fs_plan); } catch (e) { return { error: 'Bad plan.' }; }
  const si = dayIndex(input.start_day); if (si === -1) return { error: 'Unknown day.' };
  const sched = plan.weekly_schedule || [];
  const affected = [];
  for (let i = 0; i < input.num_days; i++) {
    const d = sched[(si + i) % 7];
    if (d && d.exercises && d.exercises.length > 0)
      affected.push({ day: d.day, badge: d.badge, exercises: d.exercises.map(e => e.name) });
  }
  return {
    workout_days_in_window: affected.length,
    equipment: input.available_equipment,
    location: input.location_context || '',
    days: affected,
    next_step: 'Call update_workout for each day with equipment-appropriate substitutions.'
  };
}

// ── search_nearby ──
async function tSearch(input, env) {
  const key = env.GOOGLE_PLACES_KEY;
  if (key) {
    try {
      const q = encodeURIComponent(input.query + ' ' + input.location);
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${key}`);
      const d = await r.json();
      if (d.results && d.results.length > 0) {
        return { source: 'google_places', results: d.results.slice(0, 5).map(p => ({ name: p.name, address: p.formatted_address, rating: p.rating })) };
      }
    } catch (e) {}
  }
  return { source: 'ai_knowledge', instruction: 'No Places API key. Use your training knowledge to suggest specific ' + (input.type||'places') + ' near ' + input.location + ' for: ' + input.query + '. Give real business names and explain why they fit fitness goals.' };
}

// ── log_food ──
async function tFood(input, ud, env, did) {
  if (!ud) return { error: 'No data.' };
  const idx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  let ml; try { ml = JSON.parse(ud.fs_mealLogs || '{}'); } catch (e) { ml = {}; }
  if (!ml[idx]) ml[idx] = {};
  if (!ml[idx][input.meal]) ml[idx][input.meal] = [];
  let tc = 0, tp = 0;
  for (const it of input.items) { ml[idx][input.meal].push(it); tc += it.cal; tp += it.pro; }
  ud.fs_mealLogs = JSON.stringify(ml);
  await kvSave(env, did, ud);
  return { logged: input.items.length + ' items to ' + input.meal, added_cal: tc, added_pro: tp, _changed: true };
}

// ═══ KV ═══
async function kvSave(env, did, ud) {
  await env.BLUEPRINT_KV.put(`user:${did}`, JSON.stringify({ keys: ud, ts: Date.now(), deviceId: did, keyCount: Object.keys(ud).length }), { expirationTtl: 365*24*60*60 });
}

// ═══ SYNC ENDPOINTS ═══
async function syncPush(request, env, did) {
  const body = await request.json();
  if (!body?.keys) return err(400, 'Need { keys }');
  let ex = {}; try { const r = await env.BLUEPRINT_KV.get(`user:${did}`, 'json'); if (r?.keys) ex = r.keys; } catch (e) {}
  const merged = { ...ex, ...body.keys };
  for (const k of Object.keys(merged)) { if (merged[k] == null) delete merged[k]; }
  const p = { keys: merged, ts: Date.now(), deviceId: did, keyCount: Object.keys(merged).length };
  await env.BLUEPRINT_KV.put(`user:${did}`, JSON.stringify(p), { expirationTtl: 365*24*60*60 });
  return json({ ok: true, keyCount: p.keyCount, ts: p.ts });
}
async function syncPull(env, did) {
  const r = await env.BLUEPRINT_KV.get(`user:${did}`, 'json');
  if (!r?.keys) return json({ ok: true, found: false, keys: {}, ts: 0 });
  return json({ ok: true, found: true, keys: r.keys, ts: r.ts, keyCount: r.keyCount });
}
async function syncKeys(env, did) {
  const r = await env.BLUEPRINT_KV.get(`user:${did}`, 'json');
  if (!r?.keys) return json({ ok: true, found: false, keys: [] });
  return json({ ok: true, found: true, keys: Object.keys(r.keys).map(k => ({ key: k, bytes: (r.keys[k]||'').length })), ts: r.ts });
}
async function syncDel(env, did) {
  await env.BLUEPRINT_KV.delete(`user:${did}`);
  return json({ ok: true });
}

// ═══ HELPERS ═══
function did_(r) { return r.headers.get('X-Device-ID'); }
function cors204() { return new Response(null, { status: 204, headers: ch() }); }
function ch() { return { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type,X-Device-ID', 'Access-Control-Max-Age':'86400' }; }
function json(d, s=200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type':'application/json', ...ch() } }); }
function err(s, m) { return json({ error: { message: m } }, s); }
