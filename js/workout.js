(function () {
  const EXERCISE_LIBRARY = {
    Chest: [
      "Bench Press",
      "Incline Dumbbell Press",
      "Machine Chest Press",
      "Cable Fly",
      "Pec Deck",
      "Push-Up",
      "Smith Machine Incline Press"
    ],
    Back: [
      "Lat Pulldown",
      "Pull-Up",
      "Chest Supported Row",
      "Barbell Row",
      "Seated Cable Row",
      "Single Arm Dumbbell Row",
      "Machine Row"
    ],
    Shoulders: [
      "Seated Dumbbell Press",
      "Machine Shoulder Press",
      "Cable Lateral Raise",
      "Dumbbell Lateral Raise",
      "Rear Delt Fly",
      "Face Pull",
      "Upright Row"
    ],
    Quads: [
      "Back Squat",
      "Hack Squat",
      "Leg Press",
      "Bulgarian Split Squat",
      "Walking Lunge",
      "Leg Extension",
      "Goblet Squat"
    ],
    Hamstrings: [
      "Romanian Deadlift",
      "Seated Leg Curl",
      "Lying Leg Curl",
      "Good Morning",
      "Glute Ham Raise",
      "Single Leg RDL"
    ],
    Glutes: [
      "Hip Thrust",
      "Glute Bridge",
      "Cable Kickback",
      "Step-Up",
      "Reverse Lunge",
      "Smith Machine Hip Thrust"
    ],
    Calves: [
      "Standing Calf Raise",
      "Seated Calf Raise",
      "Leg Press Calf Raise",
      "Single Leg Calf Raise"
    ],
    Arms: [
      "EZ Bar Curl",
      "Incline Dumbbell Curl",
      "Hammer Curl",
      "Cable Curl",
      "Close Grip Bench Press",
      "Rope Pushdown",
      "Overhead Tricep Extension",
      "Skull Crusher"
    ],
    Core: [
      "Cable Crunch",
      "Hanging Leg Raise",
      "Ab Wheel",
      "Plank",
      "Reverse Crunch",
      "Decline Sit-Up"
    ],
    FullBody: [
      "Trap Bar Deadlift",
      "Goblet Squat",
      "Push-Up",
      "Lat Pulldown",
      "Dumbbell RDL",
      "Machine Press",
      "Walking Lunge"
    ]
  };

  const CATEGORY_ORDER = [
    "All",
    "Chest",
    "Back",
    "Shoulders",
    "Quads",
    "Hamstrings",
    "Glutes",
    "Calves",
    "Arms",
    "Core",
    "FullBody"
  ];

  function q(id) {
    return document.getElementById(id);
  }

  function htmlEscape(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getGlobal(name, fallback) {
    try {
      return typeof window[name] !== "undefined" ? window[name] : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setGlobal(name, value) {
    try {
      window[name] = value;
    } catch (_) {}
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function uid() {
    return (
      "w_" +
      Math.random().toString(36).slice(2, 10) +
      "_" +
      Date.now().toString(36)
    );
  }

  function defaultExercise(name, category) {
    return {
      id: uid(),
      name,
      category,
      sets: 3,
      reps: "8-12",
      rir: 1,
      rest: 90,
      notes: ""
    };
  }

  function getCustomBuilderState() {
    const state = getGlobal("__CUSTOM_WORKOUT_BUILDER__", null);
    if (state && typeof state === "object") return state;

    const fresh = {
      dayName: "Custom Workout",
      selectedCategory: "All",
      search: "",
      items: []
    };
    setGlobal("__CUSTOM_WORKOUT_BUILDER__", fresh);
    return fresh;
  }

  function saveCustomBuilderState() {
    writeJSON("blueprint_custom_builder", getCustomBuilderState());
  }

  function loadCustomBuilderState() {
    const saved = readJSON("blueprint_custom_builder", null);
    if (saved && typeof saved === "object") {
      setGlobal("__CUSTOM_WORKOUT_BUILDER__", {
        dayName: saved.dayName || "Custom Workout",
        selectedCategory: saved.selectedCategory || "All",
        search: saved.search || "",
        items: Array.isArray(saved.items) ? saved.items : []
      });
    }
  }

  function getAvailableCategories() {
    const dynamic = Object.keys(EXERCISE_LIBRARY);
    const merged = Array.from(new Set([...CATEGORY_ORDER, ...dynamic]));
    return merged.filter(Boolean);
  }

  function getExercisesForCategory(cat) {
    if (!cat || cat === "All") {
      return Object.entries(EXERCISE_LIBRARY).flatMap(([category, names]) =>
        names.map((name) => ({ name, category }))
      );
    }

    const names = EXERCISE_LIBRARY[cat] || [];
    return names.map((name) => ({ name, category: cat }));
  }

  function filterExercises(cat, search) {
    const term = String(search || "").trim().toLowerCase();
    return getExercisesForCategory(cat).filter((x) => {
      if (!term) return true;
      return (
        x.name.toLowerCase().includes(term) ||
        x.category.toLowerCase().includes(term)
      );
    });
  }

  function ensureWorkoutArrays() {
    if (!Array.isArray(getGlobal("DAY_WORKOUTS", null))) {
      setGlobal("DAY_WORKOUTS", []);
    }
    if (!Array.isArray(getGlobal("GYM_DAYS", null))) {
      setGlobal("GYM_DAYS", []);
    }
  }

  function getTodayIndex() {
    const idx = Number(getGlobal("TODAY_IDX", 0));
    return Number.isFinite(idx) ? idx : 0;
  }

  function getCurrentWorkout() {
    ensureWorkoutArrays();
    const dayWorkouts = getGlobal("DAY_WORKOUTS", []);
    const idx = getTodayIndex();
    return dayWorkouts[idx] || null;
  }

  function persistWorkoutState() {
    try {
      const saveAppState = getGlobal("saveAppState", null);
      if (typeof saveAppState === "function") {
        saveAppState();
        return;
      }
    } catch (_) {}

    try {
      writeJSON("DAY_WORKOUTS", getGlobal("DAY_WORKOUTS", []));
      writeJSON("GYM_DAYS", getGlobal("GYM_DAYS", []));
      writeJSON("wktDone", getGlobal("wktDone", {}));
    } catch (_) {}
  }

  function normalizeExercise(ex, fallbackCategory) {
    const safeName = String(ex?.name || "Exercise").trim() || "Exercise";
    return {
      id: ex?.id || uid(),
      name: safeName,
      category: ex?.category || fallbackCategory || "General",
      sets: Number(ex?.sets) > 0 ? Number(ex.sets) : 3,
      reps: String(ex?.reps || "8-12"),
      rir: Number.isFinite(Number(ex?.rir)) ? Number(ex.rir) : 1,
      rest: Number.isFinite(Number(ex?.rest)) ? Number(ex.rest) : 90,
      notes: String(ex?.notes || "")
    };
  }

  function injectBuilderModal() {
    if (q("customWorkoutBuilderModal")) return;

    const modal = document.createElement("div");
    modal.id = "customWorkoutBuilderModal";
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "9999";
    modal.style.background = "rgba(0,0,0,.72)";
    modal.innerHTML = `
      <div style="position:absolute; inset:0; overflow:auto;">
        <div style="max-width:980px; margin:24px auto; background:#111827; color:#fff; border-radius:18px; border:1px solid rgba(255,255,255,.08); box-shadow:0 20px 60px rgba(0,0,0,.35); overflow:hidden;">
          <div style="padding:18px 18px 14px; border-bottom:1px solid rgba(255,255,255,.08); display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div style="font-size:12px; opacity:.7; letter-spacing:.08em; text-transform:uppercase;">Workout Builder</div>
              <div style="font-size:24px; font-weight:700;">Create a custom workout</div>
            </div>
            <button id="closeCustomWorkoutBuilderBtn" style="border:0; background:#1f2937; color:#fff; border-radius:12px; padding:10px 14px; cursor:pointer;">Close</button>
          </div>

          <div style="padding:18px; display:grid; grid-template-columns:1.2fr .9fr; gap:18px;">
            <div style="min-width:0;">
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                <input id="customWorkoutName" placeholder="Workout name" style="flex:1; min-width:220px; padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
                <input id="customExerciseSearch" placeholder="Search exercises" style="flex:1; min-width:220px; padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
              </div>

              <div id="customCategoryTabs" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;"></div>
              <div id="customExerciseLibrary" style="display:grid; gap:10px;"></div>
            </div>

            <div style="min-width:0; background:#0b1220; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:14px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
                <div>
                  <div style="font-size:12px; opacity:.7; text-transform:uppercase; letter-spacing:.08em;">Selected</div>
                  <div style="font-size:20px; font-weight:700;">Your workout</div>
                </div>
                <button id="clearCustomWorkoutBtn" style="border:0; background:#1f2937; color:#fff; border-radius:10px; padding:8px 12px; cursor:pointer;">Clear</button>
              </div>
              <div id="customSelectedExercises" style="display:grid; gap:10px;"></div>
              <div style="display:flex; gap:10px; margin-top:14px;">
                <button id="saveCustomWorkoutBtn" style="flex:1; border:0; background:#22c55e; color:#06210d; font-weight:700; border-radius:12px; padding:12px 14px; cursor:pointer;">Save to today</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    q("closeCustomWorkoutBuilderBtn")?.addEventListener("click", hideCustomBuilder);
    q("clearCustomWorkoutBtn")?.addEventListener("click", function () {
      const state = getCustomBuilderState();
      state.items = [];
      saveCustomBuilderState();
      renderCustomBuilder();
    });
    q("saveCustomWorkoutBtn")?.addEventListener("click", saveCustomWorkoutToToday);

    q("customWorkoutName")?.addEventListener("input", function (e) {
      const state = getCustomBuilderState();
      state.dayName = e.target.value || "Custom Workout";
      saveCustomBuilderState();
    });

    q("customExerciseSearch")?.addEventListener("input", function (e) {
      const state = getCustomBuilderState();
      state.search = e.target.value || "";
      saveCustomBuilderState();
      renderCustomBuilder();
    });
  }

  function renderCategoryTabs() {
    const wrap = q("customCategoryTabs");
    if (!wrap) return;

    const state = getCustomBuilderState();
    const cats = getAvailableCategories();
    wrap.innerHTML = cats
      .map((cat) => {
        const active = cat === state.selectedCategory;
        return `
          <button
            class="custom-cat-tab"
            data-cat="${htmlEscape(cat)}"
            style="
              border:1px solid ${active ? "rgba(34,197,94,.45)" : "rgba(255,255,255,.1)"};
              background:${active ? "rgba(34,197,94,.18)" : "#0f172a"};
              color:#fff;
              border-radius:999px;
              padding:8px 12px;
              cursor:pointer;
              font-weight:${active ? "700" : "500"};
            "
          >${htmlEscape(cat)}</button>
        `;
      })
      .join("");

    wrap.querySelectorAll(".custom-cat-tab").forEach((btn) => {
      btn.addEventListener("click", function () {
        const state = getCustomBuilderState();
        state.selectedCategory = this.getAttribute("data-cat") || "All";
        saveCustomBuilderState();
        renderCustomBuilder();
      });
    });
  }

  function renderExerciseLibrary() {
    const wrap = q("customExerciseLibrary");
    if (!wrap) return;

    const state = getCustomBuilderState();
    const items = filterExercises(state.selectedCategory, state.search).slice(0, 80);

    if (!items.length) {
      wrap.innerHTML = `
        <div style="padding:16px; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:#0b1220; opacity:.8;">
          No exercises found.
        </div>
      `;
      return;
    }

    wrap.innerHTML = items
      .map((item) => {
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:#0b1220;">
            <div>
              <div style="font-weight:700;">${htmlEscape(item.name)}</div>
              <div style="font-size:12px; opacity:.7;">${htmlEscape(item.category)}</div>
            </div>
            <button
              class="add-custom-exercise-btn"
              data-name="${htmlEscape(item.name)}"
              data-category="${htmlEscape(item.category)}"
              style="border:0; background:#2563eb; color:#fff; border-radius:10px; padding:10px 12px; cursor:pointer;"
            >Add</button>
          </div>
        `;
      })
      .join("");

    wrap.querySelectorAll(".add-custom-exercise-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const name = this.getAttribute("data-name") || "Exercise";
        const category = this.getAttribute("data-category") || "General";
        addExerciseToCustomBuilder(name, category);
      });
    });
  }

  function renderSelectedExercises() {
    const wrap = q("customSelectedExercises");
    if (!wrap) return;

    const state = getCustomBuilderState();
    if (!state.items.length) {
      wrap.innerHTML = `
        <div style="padding:14px; border:1px dashed rgba(255,255,255,.12); border-radius:14px; opacity:.75;">
          No exercises added yet.
        </div>
      `;
      return;
    }

    wrap.innerHTML = state.items
      .map((ex, idx) => {
        return `
          <div style="padding:12px; border-radius:14px; background:#111827; border:1px solid rgba(255,255,255,.08);">
            <div style="display:flex; align-items:start; justify-content:space-between; gap:10px; margin-bottom:10px;">
              <div>
                <div style="font-weight:700;">${htmlEscape(ex.name)}</div>
                <div style="font-size:12px; opacity:.7;">${htmlEscape(ex.category)}</div>
              </div>
              <button class="remove-custom-exercise-btn" data-idx="${idx}" style="border:0; background:#7f1d1d; color:#fff; border-radius:10px; padding:8px 10px; cursor:pointer;">Remove</button>
            </div>

            <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px;">
              <label style="display:grid; gap:6px; font-size:12px;">
                <span style="opacity:.7;">Sets</span>
                <input class="custom-ex-input" data-idx="${idx}" data-key="sets" type="number" min="1" step="1" value="${htmlEscape(ex.sets)}" style="padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
              </label>
              <label style="display:grid; gap:6px; font-size:12px;">
                <span style="opacity:.7;">Reps</span>
                <input class="custom-ex-input" data-idx="${idx}" data-key="reps" type="text" value="${htmlEscape(ex.reps)}" style="padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
              </label>
              <label style="display:grid; gap:6px; font-size:12px;">
                <span style="opacity:.7;">RIR</span>
                <input class="custom-ex-input" data-idx="${idx}" data-key="rir" type="number" min="0" max="5" step="1" value="${htmlEscape(ex.rir)}" style="padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
              </label>
              <label style="display:grid; gap:6px; font-size:12px;">
                <span style="opacity:.7;">Rest</span>
                <input class="custom-ex-input" data-idx="${idx}" data-key="rest" type="number" min="0" step="15" value="${htmlEscape(ex.rest)}" style="padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:#0f172a; color:#fff;" />
              </label>
            </div>
          </div>
        `;
      })
      .join("");

    wrap.querySelectorAll(".remove-custom-exercise-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const idx = Number(this.getAttribute("data-idx"));
        const state = getCustomBuilderState();
        if (Number.isInteger(idx) && idx >= 0 && idx < state.items.length) {
          state.items.splice(idx, 1);
          saveCustomBuilderState();
          renderCustomBuilder();
        }
      });
    });

    wrap.querySelectorAll(".custom-ex-input").forEach((input) => {
      input.addEventListener("input", function () {
        const idx = Number(this.getAttribute("data-idx"));
        const key = this.getAttribute("data-key");
        const state = getCustomBuilderState();
        if (!Number.isInteger(idx) || idx < 0 || idx >= state.items.length || !key) return;

        let val = this.value;
        if (key === "sets" || key === "rir" || key === "rest") {
          val = Number(val);
          if (!Number.isFinite(val)) return;
        }

        state.items[idx][key] = val;
        saveCustomBuilderState();
      });
    });
  }

  function renderCustomBuilder() {
    injectBuilderModal();

    const state = getCustomBuilderState();
    const nameInput = q("customWorkoutName");
    const searchInput = q("customExerciseSearch");

    if (nameInput) nameInput.value = state.dayName || "Custom Workout";
    if (searchInput) searchInput.value = state.search || "";

    renderCategoryTabs();
    renderExerciseLibrary();
    renderSelectedExercises();
  }

  function addExerciseToCustomBuilder(name, category) {
    const state = getCustomBuilderState();
    state.items.push(defaultExercise(name, category));
    saveCustomBuilderState();
    renderCustomBuilder();
  }

  function hideCustomBuilder() {
    const modal = q("customWorkoutBuilderModal");
    if (modal) modal.style.display = "none";
  }

  function showCustomBuilder() {
    loadCustomBuilderState();
    injectBuilderModal();
    renderCustomBuilder();

    const modal = q("customWorkoutBuilderModal");
    if (modal) modal.style.display = "block";
  }

  function saveCustomWorkoutToToday() {
    const state = getCustomBuilderState();
    if (!state.items.length) {
      alert("Add at least one exercise first.");
      return;
    }

    ensureWorkoutArrays();
    const idx = getTodayIndex();
    const dayWorkouts = getGlobal("DAY_WORKOUTS", []);
    const gymDays = getGlobal("GYM_DAYS", []);
    const dayName =
      String(state.dayName || "").trim() ||
      gymDays[idx] ||
      "Custom Workout";

    const nextWorkout = {
      day: dayName,
      title: dayName,
      exercises: state.items.map((ex) => normalizeExercise(ex, ex.category))
    };

    dayWorkouts[idx] = nextWorkout;
    setGlobal("DAY_WORKOUTS", dayWorkouts);

    if (Array.isArray(gymDays) && idx < gymDays.length) {
      gymDays[idx] = dayName;
      setGlobal("GYM_DAYS", gymDays);
    }

    persistWorkoutState();

    try {
      const renderWorkout = getGlobal("renderWorkout", null);
      if (typeof renderWorkout === "function") {
        renderWorkout();
      }
    } catch (_) {}

    hideCustomBuilder();
  }

  function simpleWorkoutHTML(workout) {
    if (!workout || !Array.isArray(workout.exercises)) {
      return `<div style="padding:12px; border:1px dashed rgba(255,255,255,.15); border-radius:12px;">No workout loaded.</div>`;
    }

    return `
      <div style="display:grid; gap:10px;">
        ${workout.exercises
          .map((ex, i) => {
            return `
              <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:#0f172a;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                  <div>
                    <div style="font-weight:700;">${i + 1}. ${htmlEscape(ex.name)}</div>
                    <div style="font-size:12px; opacity:.7;">${htmlEscape(ex.category || "General")}</div>
                  </div>
                  <div style="font-size:12px; opacity:.8;">${htmlEscape(ex.sets)} sets</div>
                </div>
                <div style="margin-top:8px; font-size:14px; opacity:.92;">
                  Reps: ${htmlEscape(ex.reps)} · RIR: ${htmlEscape(ex.rir)} · Rest: ${htmlEscape(ex.rest)}s
                </div>
                ${ex.notes ? `<div style="margin-top:8px; font-size:13px; opacity:.75;">${htmlEscape(ex.notes)}</div>` : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderWorkout() {
    const host =
      q("workoutContainer") ||
      q("todayWorkout") ||
      q("workoutView") ||
      q("workoutList");

    if (!host) return;

    const workout = getCurrentWorkout();
    host.innerHTML = simpleWorkoutHTML(workout);
  }

  function markWorkoutDone() {
    const done = getGlobal("wktDone", {}) || {};
    const idx = getTodayIndex();
    done[idx] = true;
    setGlobal("wktDone", done);
    persistWorkoutState();
  }

  function resetWorkoutDone() {
    const done = getGlobal("wktDone", {}) || {};
    const idx = getTodayIndex();
    delete done[idx];
    setGlobal("wktDone", done);
    persistWorkoutState();
  }

  function generateFallbackWorkout(dayName) {
    const lower = String(dayName || "").toLowerCase();

    let blocks = [];
    if (lower.includes("push")) {
      blocks = [
        defaultExercise("Bench Press", "Chest"),
        defaultExercise("Incline Dumbbell Press", "Chest"),
        defaultExercise("Seated Dumbbell Press", "Shoulders"),
        defaultExercise("Cable Lateral Raise", "Shoulders"),
        defaultExercise("Rope Pushdown", "Arms")
      ];
    } else if (lower.includes("pull")) {
      blocks = [
        defaultExercise("Lat Pulldown", "Back"),
        defaultExercise("Chest Supported Row", "Back"),
        defaultExercise("Single Arm Dumbbell Row", "Back"),
        defaultExercise("Face Pull", "Shoulders"),
        defaultExercise("Hammer Curl", "Arms")
      ];
    } else if (lower.includes("leg")) {
      blocks = [
        defaultExercise("Back Squat", "Quads"),
        defaultExercise("Romanian Deadlift", "Hamstrings"),
        defaultExercise("Leg Press", "Quads"),
        defaultExercise("Seated Leg Curl", "Hamstrings"),
        defaultExercise("Standing Calf Raise", "Calves")
      ];
    } else {
      blocks = [
        defaultExercise("Goblet Squat", "FullBody"),
        defaultExercise("Machine Chest Press", "Chest"),
        defaultExercise("Lat Pulldown", "Back"),
        defaultExercise("Dumbbell RDL", "Hamstrings"),
        defaultExercise("Cable Crunch", "Core")
      ];
    }

    return {
      day: dayName || "Workout",
      title: dayName || "Workout",
      exercises: blocks
    };
  }

  function ensureTodayWorkoutExists() {
    ensureWorkoutArrays();
    const idx = getTodayIndex();
    const dayWorkouts = getGlobal("DAY_WORKOUTS", []);
    const gymDays = getGlobal("GYM_DAYS", []);
    if (!dayWorkouts[idx]) {
      dayWorkouts[idx] = generateFallbackWorkout(gymDays[idx] || "Workout");
      setGlobal("DAY_WORKOUTS", dayWorkouts);
      persistWorkoutState();
    }
  }

  function wireWorkoutButtons() {
    const openBtn =
      q("openCustomWorkoutBuilder") ||
      q("customWorkoutBuilderBtn") ||
      q("buildCustomWorkoutBtn");

    if (openBtn && !openBtn.__workoutBuilderBound) {
      openBtn.__workoutBuilderBound = true;
      openBtn.addEventListener("click", showCustomBuilder);
    }

    const doneBtn =
      q("completeWorkoutBtn") ||
      q("markWorkoutDoneBtn");

    if (doneBtn && !doneBtn.__markWorkoutDoneBound) {
      doneBtn.__markWorkoutDoneBound = true;
      doneBtn.addEventListener("click", markWorkoutDone);
    }

    const resetBtn =
      q("resetWorkoutDoneBtn");

    if (resetBtn && !resetBtn.__resetWorkoutDoneBound) {
      resetBtn.__resetWorkoutDoneBound = true;
      resetBtn.addEventListener("click", resetWorkoutDone);
    }
  }

  function initWorkoutModule() {
    loadCustomBuilderState();
    ensureTodayWorkoutExists();
    injectBuilderModal();
    wireWorkoutButtons();
    renderWorkout();
  }

  window.showCustomBuilder = showCustomBuilder;
  window.hideCustomBuilder = hideCustomBuilder;
  window.renderWorkout = renderWorkout;
  window.initWorkoutModule = initWorkoutModule;
  window.ensureTodayWorkoutExists = ensureTodayWorkoutExists;
  window.markWorkoutDone = markWorkoutDone;
  window.resetWorkoutDone = resetWorkoutDone;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkoutModule);
  } else {
    initWorkoutModule();
  }
})();
