// ═══════════════════════════════════════════
// APP.JS — Main App Initialization, Exercise DB,
//   State Management, Onboarding, Signup, Storage, API
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// EXERCISE DATABASE — wger images (start/mid/end), categories, customizable
// Images from wger.de public API: /api/v2/exerciseimage/
// ═══════════════════════════════════════════

// wger exercise IDs map to their image URLs
// Format: { sets, reps, rest, muscles, category, wgerId }
// wger images: https://wger.de/en/exercise/{id}/view/name
// image base: https://wger.de/

const EXERCISE_DB = {
  // ── CHEST ──
  'Bench Press':           { sets:4, reps:'6-8',   rest:90, muscles:'Chest, Triceps, Shoulders', category:'Chest',     wgerId:192 },
  'Incline DB Press':      { sets:3, reps:'8-10',  rest:120, muscles:'Upper Chest, Triceps',       category:'Chest',     wgerId:211 },
  'Incline Barbell Press': { sets:4, reps:'6-8',   rest:90, muscles:'Upper Chest, Triceps',       category:'Chest',     wgerId:210 },
  'Dumbbell Bench Press':  { sets:3, reps:'8-10',  rest:120, muscles:'Chest, Triceps',             category:'Chest',     wgerId:97  },
  'Dumbbell Flyes':        { sets:3, reps:'10-12', rest:90,  muscles:'Chest',                      category:'Chest',     wgerId:28  },
  'Incline Dumbbell Flyes':{ sets:3, reps:'10-12', rest:90,  muscles:'Upper Chest',                category:'Chest',     wgerId:28  },
  'Cable Crossover':       { sets:3, reps:'12-15', rest:60,  muscles:'Chest, Anterior Delts',      category:'Chest',     wgerId:346 },
  'Push-Ups':              { sets:3, reps:'10-20', rest:60,  muscles:'Chest, Triceps, Shoulders',  category:'Chest',     wgerId:18  },
  'Diamond Push-Ups':      { sets:3, reps:'8-15',  rest:60,  muscles:'Triceps, Inner Chest',       category:'Chest',     wgerId:18  },
  'Decline Bench Press':   { sets:3, reps:'8-10',  rest:120, muscles:'Lower Chest, Triceps',       category:'Chest',     wgerId:213 },
  'Chest Dip':             { sets:3, reps:'8-12',  rest:90,  muscles:'Lower Chest, Triceps',       category:'Chest',     wgerId:37  },
  'Machine Chest Press':   { sets:3, reps:'10-12', rest:90,  muscles:'Chest, Triceps',             category:'Chest',     wgerId:null },
  'Pec Deck Machine':      { sets:3, reps:'12-15', rest:60,  muscles:'Chest',                      category:'Chest',     wgerId:null },
  'Landmine Press':        { sets:3, reps:'10-12', rest:90,  muscles:'Upper Chest, Shoulders',     category:'Chest',     wgerId:null },
  'Floor Press':           { sets:3, reps:'8-10',  rest:120, muscles:'Chest, Triceps',             category:'Chest',     wgerId:null },
  'Svend Press':           { sets:3, reps:'12-15', rest:60,  muscles:'Inner Chest',                category:'Chest',     wgerId:null },
  // ── BACK ──
  'Pull-Ups':              { sets:4, reps:'6-8',   rest:90, muscles:'Lats, Biceps, Rear Delts',   category:'Back',      wgerId:3   },
  'Chin-Ups':              { sets:3, reps:'6-10',  rest:120, muscles:'Lats, Biceps',               category:'Back',      wgerId:181 },
  'Barbell Row':           { sets:4, reps:'6-8',   rest:90, muscles:'Back, Biceps',               category:'Back',      wgerId:63  },
  'Pendlay Row':           { sets:4, reps:'5-8',   rest:90, muscles:'Back, Lats',                 category:'Back',      wgerId:63  },
  'Dumbbell Row':          { sets:3, reps:'8-12',  rest:90,  muscles:'Lats, Rhomboids, Biceps',    category:'Back',      wgerId:362 },
  'Lat Pulldown':          { sets:3, reps:'10-12', rest:90,  muscles:'Lats, Biceps',               category:'Back',      wgerId:122 },
  'Close-Grip Lat Pulldown':{ sets:3, reps:'10-12', rest:90, muscles:'Lats, Lower Back',           category:'Back',      wgerId:122 },
  'Cable Row':             { sets:3, reps:'10-12', rest:90,  muscles:'Mid Back, Biceps',           category:'Back',      wgerId:111 },
  'Seated Cable Row':      { sets:3, reps:'10-12', rest:90,  muscles:'Mid Back, Rhomboids',        category:'Back',      wgerId:111 },
  'Face Pulls':            { sets:3, reps:'15-20', rest:60,  muscles:'Rear Delts, Rotator Cuff',   category:'Back',      wgerId:313 },
  'Deadlift':              { sets:4, reps:'4-6',   rest:120, muscles:'Full Posterior Chain',        category:'Back',      wgerId:29  },
  'Conventional Deadlift': { sets:5, reps:'3-5',   rest:120, muscles:'Full Posterior Chain',        category:'Back',      wgerId:29  },
  'Sumo Deadlift':         { sets:4, reps:'4-6',   rest:120, muscles:'Glutes, Quads, Back',        category:'Back',      wgerId:29  },
  'Rack Pull':             { sets:3, reps:'5-8',   rest:90, muscles:'Upper Back, Traps, Glutes',  category:'Back',      wgerId:null },
  'T-Bar Row':             { sets:3, reps:'8-10',  rest:120, muscles:'Mid Back, Lats',             category:'Back',      wgerId:227 },
  'Hyperextensions':       { sets:3, reps:'12-15', rest:60,  muscles:'Lower Back, Glutes',         category:'Back',      wgerId:88  },
  'Meadows Row':           { sets:3, reps:'8-12',  rest:90,  muscles:'Lats, Rear Delts',           category:'Back',      wgerId:null },
  'Chest-Supported Row':   { sets:3, reps:'10-12', rest:90,  muscles:'Mid Back, Rear Delts',       category:'Back',      wgerId:null },
  'Straight-Arm Pulldown': { sets:3, reps:'12-15', rest:60,  muscles:'Lats',                       category:'Back',      wgerId:null },
  'Inverted Row':          { sets:3, reps:'8-15',  rest:60,  muscles:'Back, Biceps',               category:'Back',      wgerId:null },
  'Pullover':              { sets:3, reps:'10-12', rest:90,  muscles:'Lats, Chest, Serratus',      category:'Back',      wgerId:99  },
  'Shrugs':                { sets:3, reps:'12-15', rest:60,  muscles:'Traps',                      category:'Back',      wgerId:null },
  'Barbell Shrugs':        { sets:4, reps:'10-12', rest:90,  muscles:'Traps, Upper Back',          category:'Back',      wgerId:150 },
  // ── SHOULDERS ──
  'Shoulder Press':        { sets:3, reps:'8-10',  rest:120, muscles:'Shoulders, Triceps',         category:'Shoulders', wgerId:73  },
  'Overhead Press':        { sets:4, reps:'5-8',   rest:90, muscles:'Shoulders, Triceps, Core',   category:'Shoulders', wgerId:256 },
  'Dumbbell Shoulder Press':{ sets:3, reps:'8-10', rest:120, muscles:'Shoulders, Triceps',         category:'Shoulders', wgerId:73  },
  'Arnold Press':          { sets:3, reps:'10-12', rest:90,  muscles:'Shoulders (all heads)',       category:'Shoulders', wgerId:116 },
  'Lateral Raises':        { sets:3, reps:'12-15', rest:60,  muscles:'Side Delts',                 category:'Shoulders', wgerId:72  },
  'Cable Lateral Raise':   { sets:3, reps:'12-15', rest:60,  muscles:'Side Delts',                 category:'Shoulders', wgerId:72  },
  'Front Raises':          { sets:3, reps:'12-15', rest:60,  muscles:'Front Delts',                category:'Shoulders', wgerId:74  },
  'Upright Row':           { sets:3, reps:'10-12', rest:90,  muscles:'Shoulders, Traps',           category:'Shoulders', wgerId:75  },
  'Rear Delt Fly':         { sets:3, reps:'15-20', rest:60,  muscles:'Rear Delts',                 category:'Shoulders', wgerId:314 },
  'Reverse Pec Deck':      { sets:3, reps:'12-15', rest:60,  muscles:'Rear Delts',                 category:'Shoulders', wgerId:null },
  'Machine Shoulder Press': { sets:3, reps:'10-12', rest:90, muscles:'Shoulders, Triceps',         category:'Shoulders', wgerId:null },
  'Push Press':            { sets:3, reps:'5-8',   rest:90, muscles:'Shoulders, Triceps, Legs',   category:'Shoulders', wgerId:null },
  'Lu Raises':             { sets:3, reps:'10-12', rest:60,  muscles:'Front/Side Delts',           category:'Shoulders', wgerId:null },
  'Bradford Press':        { sets:3, reps:'8-10',  rest:90,  muscles:'Shoulders (all heads)',       category:'Shoulders', wgerId:null },
  'Cable Face Pull':       { sets:3, reps:'15-20', rest:60,  muscles:'Rear Delts, Rotator Cuff',   category:'Shoulders', wgerId:313 },
  // ── ARMS: BICEPS ──
  'Barbell Curl':          { sets:3, reps:'10-12', rest:60,  muscles:'Biceps',                     category:'Biceps',      wgerId:48  },
  'EZ Bar Curl':           { sets:3, reps:'10-12', rest:60,  muscles:'Biceps',                     category:'Biceps',      wgerId:48  },
  'Dumbbell Curl':         { sets:3, reps:'10-12', rest:60,  muscles:'Biceps',                     category:'Biceps',      wgerId:81  },
  'Hammer Curls':          { sets:3, reps:'10-12', rest:60,  muscles:'Biceps, Brachialis',         category:'Biceps',      wgerId:396 },
  'Incline DB Curl':       { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (long head)',         category:'Biceps',      wgerId:218 },
  'Preacher Curl':         { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (short head)',        category:'Biceps',      wgerId:175 },
  'Concentration Curl':    { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (peak)',              category:'Biceps',      wgerId:52  },
  'Cable Curl':            { sets:3, reps:'12-15', rest:60,  muscles:'Biceps',                     category:'Biceps',      wgerId:null },
  'Spider Curl':           { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (short head)',        category:'Biceps',      wgerId:null },
  'Reverse Curl':          { sets:3, reps:'12-15', rest:60,  muscles:'Forearms, Brachioradialis',  category:'Biceps',      wgerId:null },
  'Wrist Curls':           { sets:3, reps:'15-20', rest:45,  muscles:'Forearms',                   category:'Biceps',      wgerId:null },
  'Reverse Wrist Curls':   { sets:3, reps:'15-20', rest:45,  muscles:'Forearm Extensors',          category:'Biceps',      wgerId:null },
  'Zottman Curl':          { sets:3, reps:'10-12', rest:60,  muscles:'Biceps, Forearms',           category:'Biceps',      wgerId:null },
  // ── ARMS: TRICEPS ──
  'Tricep Dips':           { sets:3, reps:'10-12', rest:90,  muscles:'Triceps, Chest',             category:'Triceps',      wgerId:37  },
  'Tricep Pushdown':       { sets:3, reps:'12-15', rest:60,  muscles:'Triceps',                    category:'Triceps',      wgerId:26  },
  'Rope Pushdown':         { sets:3, reps:'12-15', rest:60,  muscles:'Triceps (lateral head)',     category:'Triceps',      wgerId:26  },
  'Skull Crushers':        { sets:3, reps:'10-12', rest:90,  muscles:'Triceps',                    category:'Triceps',      wgerId:25  },
  'Close Grip Bench':      { sets:3, reps:'8-10',  rest:120, muscles:'Triceps, Chest',             category:'Triceps',      wgerId:358 },
  'Overhead Tricep Extension': { sets:3, reps:'10-12', rest:60, muscles:'Triceps (long head)',     category:'Triceps',      wgerId:null },
  'Kickbacks':             { sets:3, reps:'12-15', rest:60,  muscles:'Triceps',                    category:'Triceps',      wgerId:null },
  'Diamond Push-Up':       { sets:3, reps:'10-15', rest:60,  muscles:'Triceps, Inner Chest',       category:'Triceps',      wgerId:null },
  'JM Press':              { sets:3, reps:'8-10',  rest:90,  muscles:'Triceps',                    category:'Triceps',      wgerId:null },
  // ── LEGS: QUADS ──
  'Back Squat':            { sets:4, reps:'5-8',   rest:90, muscles:'Quads, Glutes, Core',        category:'Legs',      wgerId:6   },
  'Front Squat':           { sets:4, reps:'6-8',   rest:90, muscles:'Quads, Core',                category:'Legs',      wgerId:null },
  'Goblet Squat':          { sets:3, reps:'10-15', rest:90,  muscles:'Quads, Glutes, Core',        category:'Legs',      wgerId:197 },
  'Hack Squat':            { sets:3, reps:'8-12',  rest:120, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  'Leg Press':             { sets:3, reps:'10-12', rest:120, muscles:'Quads, Glutes',              category:'Legs',      wgerId:45  },
  'Leg Extension':         { sets:3, reps:'12-15', rest:60,  muscles:'Quads',                      category:'Legs',      wgerId:41  },
  'Sissy Squat':           { sets:3, reps:'10-15', rest:60,  muscles:'Quads',                      category:'Legs',      wgerId:null },
  'Wall Sit':              { sets:3, reps:'30-60s', rest:60, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  'Box Squat':             { sets:4, reps:'5-8',   rest:90, muscles:'Quads, Glutes, Hips',        category:'Legs',      wgerId:null },
  'Smith Machine Squat':   { sets:3, reps:'8-12',  rest:120, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  // ── LEGS: HAMSTRINGS & GLUTES ──
  'Romanian Deadlift':     { sets:3, reps:'8-10',  rest:120, muscles:'Hamstrings, Glutes',         category:'Legs',      wgerId:113 },
  'Stiff-Leg Deadlift':    { sets:3, reps:'8-10',  rest:120, muscles:'Hamstrings, Lower Back',     category:'Legs',      wgerId:113 },
  'Leg Curl':              { sets:3, reps:'12-15', rest:60,  muscles:'Hamstrings',                 category:'Legs',      wgerId:42  },
  'Seated Leg Curl':       { sets:3, reps:'12-15', rest:60,  muscles:'Hamstrings',                 category:'Legs',      wgerId:42  },
  'Nordic Curl':           { sets:3, reps:'5-8',   rest:120, muscles:'Hamstrings',                 category:'Legs',      wgerId:null },
  'Good Mornings':         { sets:3, reps:'10-12', rest:90,  muscles:'Hamstrings, Lower Back',     category:'Legs',      wgerId:null },
  'Hip Thrust':            { sets:3, reps:'10-12', rest:90,  muscles:'Glutes, Hamstrings',         category:'Legs',      wgerId:332 },
  'Hip Thrusts':           { sets:3, reps:'10-12', rest:90,  muscles:'Glutes, Hamstrings',         category:'Legs',      wgerId:332 },
  'Glute Bridge':          { sets:3, reps:'15-20', rest:60,  muscles:'Glutes, Core',               category:'Legs',      wgerId:104 },
  'Cable Pull-Through':    { sets:3, reps:'12-15', rest:60,  muscles:'Glutes, Hamstrings',         category:'Legs',      wgerId:null },
  'Glute Kickback':        { sets:3, reps:'12-15', rest:60,  muscles:'Glutes',                     category:'Legs',      wgerId:null },
  'Reverse Lunge':         { sets:3, reps:'10/leg', rest:90, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  // ── LEGS: COMPOUND / FULL LEG ──
  'Lunges':                { sets:3, reps:'10/leg', rest:90, muscles:'Quads, Glutes, Hamstrings',  category:'Legs',      wgerId:19  },
  'Walking Lunges':        { sets:3, reps:'10 each', rest:60,muscles:'Quads, Glutes',              category:'Legs',      wgerId:19  },
  'Bulgarian Split Squat': { sets:3, reps:'8-10/leg',rest:120,muscles:'Quads, Glutes',             category:'Legs',      wgerId:399 },
  'Step-Ups':              { sets:3, reps:'10/leg', rest:60, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  'Pistol Squat':          { sets:3, reps:'5-8/leg',rest:120,muscles:'Quads, Glutes, Balance',     category:'Legs',      wgerId:null },
  'Calf Raises':           { sets:4, reps:'15-20', rest:60,  muscles:'Calves',                     category:'Legs',      wgerId:33  },
  'Seated Calf Raises':    { sets:4, reps:'15-20', rest:60,  muscles:'Soleus, Calves',             category:'Legs',      wgerId:null },
  'Donkey Calf Raises':    { sets:3, reps:'15-20', rest:60,  muscles:'Calves',                     category:'Legs',      wgerId:null },
  'Tibialis Raise':        { sets:3, reps:'15-20', rest:45,  muscles:'Tibialis Anterior',          category:'Legs',      wgerId:null },
  'Adductor Machine':      { sets:3, reps:'12-15', rest:60,  muscles:'Inner Thighs',               category:'Legs',      wgerId:null },
  'Abductor Machine':      { sets:3, reps:'12-15', rest:60,  muscles:'Outer Glutes',               category:'Legs',      wgerId:null },
  // ── CORE ──
  'Plank':                 { sets:3, reps:'30-60s', rest:60, muscles:'Core, Stability',            category:'Core',      wgerId:105 },
  'Side Plank':            { sets:3, reps:'30s/side',rest:60,muscles:'Obliques, Core',             category:'Core',      wgerId:null },
  'Dead Bug':              { sets:3, reps:'10/side', rest:60,muscles:'Core, Lower Back',           category:'Core',      wgerId:336 },
  'Bird Dog':              { sets:3, reps:'10/side', rest:60,muscles:'Core, Glutes',               category:'Core',      wgerId:337 },
  'Cable Crunch':          { sets:3, reps:'12-15', rest:60,  muscles:'Abs',                        category:'Core',      wgerId:168 },
  'Hanging Leg Raise':     { sets:3, reps:'10-15', rest:60,  muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:56  },
  'Ab Wheel Rollout':      { sets:3, reps:'8-12',  rest:90,  muscles:'Core, Shoulders',            category:'Core',      wgerId:329 },
  'Russian Twist':         { sets:3, reps:'20 total',rest:60,muscles:'Obliques, Abs',              category:'Core',      wgerId:154 },
  'Bicycle Crunch':        { sets:3, reps:'20 total',rest:60,muscles:'Abs, Obliques',              category:'Core',      wgerId:null },
  'V-Ups':                 { sets:3, reps:'12-15', rest:60,  muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Mountain Climbers':     { sets:3, reps:'30s',   rest:30,  muscles:'Core, Cardio',               category:'Core',      wgerId:null },
  'Pallof Press':          { sets:3, reps:'10/side', rest:60,muscles:'Core, Anti-Rotation',        category:'Core',      wgerId:null },
  'Dragon Flag':           { sets:3, reps:'5-8',   rest:90,  muscles:'Abs, Full Core',             category:'Core',      wgerId:null },
  'L-Sit':                 { sets:3, reps:'15-30s', rest:60, muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Decline Sit-Up':        { sets:3, reps:'12-20', rest:60,  muscles:'Abs',                        category:'Core',      wgerId:null },
  'Woodchoppers':          { sets:3, reps:'12/side',rest:60, muscles:'Obliques, Core',             category:'Core',      wgerId:null },
  'Weighted Crunch':       { sets:3, reps:'12-15', rest:60,  muscles:'Abs',                        category:'Core',      wgerId:null },
  'Farmer Walk':           { sets:3, reps:'40m',   rest:90,  muscles:'Core, Grip, Traps',          category:'Core',      wgerId:null },
  'Suitcase Carry':        { sets:3, reps:'40m/side',rest:90,muscles:'Obliques, Core, Grip',       category:'Core',      wgerId:null },
  // ── CARDIO / CONDITIONING ──
  'Brisk Walk':            { sets:1, reps:'20-30 min',rest:0,muscles:'Cardio, Endurance',          category:'Cardio',    wgerId:null },
  'Brisk Walk / Cardio':   { sets:1, reps:'20-30 min',rest:0,muscles:'Cardio, Endurance',          category:'Cardio',    wgerId:null },
  'HIIT Intervals':        { sets:1, reps:'20 min',  rest:0, muscles:'Full Body, Cardio',          category:'Cardio',    wgerId:null },
  'Jump Rope':             { sets:3, reps:'3 min',   rest:60,muscles:'Cardio, Calves, Shoulders',  category:'Cardio',    wgerId:null },
  'Rowing Machine':        { sets:1, reps:'20 min',  rest:0, muscles:'Full Body, Cardio',          category:'Cardio',    wgerId:null },
  'Stair Climber':         { sets:1, reps:'20 min',  rest:0, muscles:'Legs, Cardio',               category:'Cardio',    wgerId:null },
  'Battle Ropes':          { sets:3, reps:'30s',   rest:60,  muscles:'Full Body, Cardio',          category:'Cardio',    wgerId:null },
  'Box Jumps':             { sets:3, reps:'8-12',  rest:90,  muscles:'Legs, Explosiveness',        category:'Cardio',    wgerId:null },
  'Burpees':               { sets:3, reps:'10-15', rest:60,  muscles:'Full Body, Cardio',          category:'Cardio',    wgerId:null },
  'Sled Push':             { sets:3, reps:'40m',   rest:120, muscles:'Legs, Core, Cardio',         category:'Cardio',    wgerId:null },
  'Kettlebell Swing':      { sets:3, reps:'15-20', rest:60,  muscles:'Glutes, Hips, Cardio',       category:'Cardio',    wgerId:null },
  'Assault Bike':          { sets:1, reps:'20 min',  rest:0, muscles:'Full Body, Cardio',          category:'Cardio',    wgerId:null },
  'Sprint Intervals':      { sets:6, reps:'30s on/60s off', rest:60, muscles:'Legs, Cardio',       category:'Cardio',    wgerId:null },

  // ── CHEST (additional) ──
  'Low Cable Fly':           { sets:3, reps:'12-15', rest:60,  muscles:'Upper Chest',                category:'Chest',     wgerId:null },
  'High Cable Fly':          { sets:3, reps:'12-15', rest:60,  muscles:'Lower Chest',                category:'Chest',     wgerId:null },
  'Guillotine Press':        { sets:3, reps:'8-10',  rest:120, muscles:'Upper Chest, Triceps',       category:'Chest',     wgerId:null },
  'Reverse Grip Bench Press':{ sets:3, reps:'8-10',  rest:120, muscles:'Upper Chest, Triceps',       category:'Chest',     wgerId:null },
  'Dumbbell Pullover':       { sets:3, reps:'10-12', rest:90,  muscles:'Chest, Lats',                category:'Chest',     wgerId:null },
  'Squeeze Press':           { sets:3, reps:'10-12', rest:90,  muscles:'Inner Chest',                category:'Chest',     wgerId:null },
  'Hex Press':               { sets:3, reps:'10-12', rest:90,  muscles:'Inner Chest, Triceps',       category:'Chest',     wgerId:null },
  'Pin Press':               { sets:3, reps:'5-8',   rest:120, muscles:'Chest, Triceps',             category:'Chest',     wgerId:null },
  'Board Press':             { sets:3, reps:'5-8',   rest:120, muscles:'Chest, Triceps',             category:'Chest',     wgerId:null },
  'Smith Machine Bench':     { sets:3, reps:'8-10',  rest:90,  muscles:'Chest, Triceps',             category:'Chest',     wgerId:null },

  // ── BACK (additional) ──
  'Kroc Row':                { sets:2, reps:'20-25', rest:120, muscles:'Lats, Traps, Grip',          category:'Back',      wgerId:null },
  'Yates Row':               { sets:4, reps:'6-10',  rest:90,  muscles:'Mid Back, Biceps',           category:'Back',      wgerId:null },
  'Seal Row':                { sets:3, reps:'8-12',  rest:90,  muscles:'Mid Back, Rhomboids',        category:'Back',      wgerId:null },
  'Banded Pull-Apart':       { sets:3, reps:'15-20', rest:45,  muscles:'Rear Delts, Rhomboids',      category:'Back',      wgerId:null },
  'Trap Bar Deadlift':       { sets:4, reps:'5-6',   rest:120, muscles:'Full Posterior Chain',       category:'Back',      wgerId:null },
  'Deficit Deadlift':        { sets:3, reps:'4-6',   rest:120, muscles:'Full Posterior Chain',       category:'Back',      wgerId:null },
  'Romanian Deadlift (DB)':  { sets:3, reps:'10-12', rest:90,  muscles:'Hamstrings, Glutes',         category:'Back',      wgerId:null },
  'Underhand Barbell Row':   { sets:3, reps:'8-10',  rest:90,  muscles:'Lats, Lower Back, Biceps',   category:'Back',      wgerId:null },
  'Wide-Grip Lat Pulldown':  { sets:3, reps:'10-12', rest:90,  muscles:'Lats, Teres Major',          category:'Back',      wgerId:null },
  'Reverse-Grip Lat Pulldown':{ sets:3, reps:'10-12',rest:90,  muscles:'Lats, Biceps',               category:'Back',      wgerId:null },
  'Low Row Machine':         { sets:3, reps:'10-12', rest:90,  muscles:'Mid Back, Lats',             category:'Back',      wgerId:null },
  'High Row Machine':        { sets:3, reps:'10-12', rest:90,  muscles:'Upper Back, Rear Delts',     category:'Back',      wgerId:null },

  // ── SHOULDERS (additional) ──
  'Z Press':                 { sets:3, reps:'8-10',  rest:90,  muscles:'Shoulders, Core',            category:'Shoulders', wgerId:null },
  'Prone Y-T-W Raises':      { sets:3, reps:'10-12', rest:60,  muscles:'Lower Traps, Rear Delts',    category:'Shoulders', wgerId:null },
  'Band Pull-Apart':         { sets:3, reps:'20-25', rest:30,  muscles:'Rear Delts, Rhomboids',      category:'Shoulders', wgerId:null },
  'Plate Raise':             { sets:3, reps:'12-15', rest:60,  muscles:'Front Delts, Traps',         category:'Shoulders', wgerId:null },
  'Dumbbell Shrug':          { sets:3, reps:'12-15', rest:60,  muscles:'Traps',                      category:'Shoulders', wgerId:null },
  'Snatch-Grip Press':       { sets:3, reps:'8-10',  rest:90,  muscles:'Shoulders, Upper Back',      category:'Shoulders', wgerId:null },
  'Seated DB Press':         { sets:3, reps:'8-12',  rest:90,  muscles:'Shoulders, Triceps',         category:'Shoulders', wgerId:null },
  'Single-Arm DB Press':     { sets:3, reps:'10-12', rest:90,  muscles:'Shoulders, Core',            category:'Shoulders', wgerId:null },
  'Cuban Press':             { sets:3, reps:'10-12', rest:60,  muscles:'Rotator Cuff, Shoulders',    category:'Shoulders', wgerId:null },
  'Crucifix Hold':           { sets:3, reps:'20-30s',rest:60,  muscles:'Side Delts, Traps',          category:'Shoulders', wgerId:null },

  // ── ARMS (additional) ──
  'Bayesian Curl':           { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (long head)',         category:'Biceps',      wgerId:null },
  'Cross-Body Hammer Curl':  { sets:3, reps:'10-12', rest:60,  muscles:'Brachialis, Brachioradialis',category:'Biceps',      wgerId:null },
  'Wide-Grip Curl':          { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (short head)',        category:'Biceps',      wgerId:null },
  'Drag Curl':               { sets:3, reps:'10-12', rest:60,  muscles:'Biceps (long head)',         category:'Biceps',      wgerId:null },
  '21s Curl':                { sets:3, reps:'21',    rest:90,  muscles:'Biceps (full)',              category:'Biceps',      wgerId:null },
  'Cable Hammer Curl':       { sets:3, reps:'12-15', rest:60,  muscles:'Brachialis',                 category:'Biceps',      wgerId:null },
  'Behind-the-Back Cable Curl':{ sets:3, reps:'12-15',rest:60, muscles:'Biceps (long head)',         category:'Biceps',      wgerId:null },
  'Tate Press':              { sets:3, reps:'10-12', rest:60,  muscles:'Triceps (medial head)',      category:'Triceps',      wgerId:null },
  'Lying Tricep Extension':  { sets:3, reps:'10-12', rest:90,  muscles:'Triceps',                    category:'Triceps',      wgerId:null },
  'Single-Arm Cable Pushdown':{ sets:3, reps:'12-15',rest:60,  muscles:'Triceps (lateral head)',     category:'Triceps',      wgerId:null },
  'Single-Arm Overhead Ext': { sets:3, reps:'10-12', rest:60,  muscles:'Triceps (long head)',        category:'Triceps',      wgerId:null },
  'Tricep Dip Machine':      { sets:3, reps:'10-12', rest:90,  muscles:'Triceps',                    category:'Triceps',      wgerId:null },
  'Reverse-Grip Pushdown':   { sets:3, reps:'12-15', rest:60,  muscles:'Triceps (medial head)',      category:'Triceps',      wgerId:null },
  'Band Tricep Pushdown':    { sets:3, reps:'15-20', rest:45,  muscles:'Triceps',                    category:'Triceps',      wgerId:null },

  // ── LEGS (additional) ──
  'Pause Squat':             { sets:4, reps:'4-6',   rest:120, muscles:'Quads, Glutes, Core',        category:'Legs',      wgerId:null },
  'Tempo Squat':             { sets:3, reps:'6-8',   rest:120, muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  'Safety Bar Squat':        { sets:4, reps:'5-8',   rest:90,  muscles:'Quads, Glutes, Core',        category:'Legs',      wgerId:null },
  'Zercher Squat':           { sets:3, reps:'6-8',   rest:120, muscles:'Quads, Glutes, Core',        category:'Legs',      wgerId:null },
  'Leg Press (Close Foot)':  { sets:3, reps:'10-12', rest:90,  muscles:'Quads',                      category:'Legs',      wgerId:null },
  'Leg Press (Wide Foot)':   { sets:3, reps:'10-12', rest:90,  muscles:'Glutes, Inner Thighs',       category:'Legs',      wgerId:null },
  'Single-Leg Leg Press':    { sets:3, reps:'10-12/leg',rest:90,muscles:'Quads, Glutes',             category:'Legs',      wgerId:null },
  'Pendulum Squat':          { sets:3, reps:'10-12', rest:90,  muscles:'Quads, Glutes',              category:'Legs',      wgerId:null },
  'Lying Leg Curl':          { sets:3, reps:'12-15', rest:60,  muscles:'Hamstrings',                 category:'Legs',      wgerId:null },
  'Single-Leg Leg Curl':     { sets:3, reps:'12-15/leg',rest:60,muscles:'Hamstrings',                category:'Legs',      wgerId:null },
  'Glute-Ham Raise':         { sets:3, reps:'6-10',  rest:90,  muscles:'Hamstrings, Glutes',         category:'Legs',      wgerId:null },
  'Frog Pump':               { sets:3, reps:'15-20', rest:45,  muscles:'Glutes',                     category:'Legs',      wgerId:null },
  'Single-Leg Hip Thrust':   { sets:3, reps:'10-12/leg',rest:60,muscles:'Glutes, Hamstrings',        category:'Legs',      wgerId:null },
  'Cable Kickback':          { sets:3, reps:'15/leg', rest:45, muscles:'Glutes',                     category:'Legs',      wgerId:null },
  'Sumo Squat':              { sets:3, reps:'10-12', rest:90,  muscles:'Glutes, Inner Thighs, Quads',category:'Legs',      wgerId:null },
  'Curtsy Lunge':            { sets:3, reps:'10/leg', rest:60, muscles:'Glutes, Quads',              category:'Legs',      wgerId:null },
  'Lateral Lunge':           { sets:3, reps:'10/leg', rest:60, muscles:'Quads, Glutes, Adductors',   category:'Legs',      wgerId:null },
  'Jump Squat':              { sets:3, reps:'10-12', rest:60,  muscles:'Quads, Glutes, Explosive',   category:'Legs',      wgerId:null },
  'Broad Jump':              { sets:4, reps:'5',     rest:90,  muscles:'Glutes, Quads, Explosive',   category:'Legs',      wgerId:null },
  'Standing Calf Raise Machine':{ sets:4, reps:'15-20',rest:60,muscles:'Calves (gastrocnemius)',      category:'Legs',      wgerId:null },

  // ── CORE (additional) ──
  'Hollow Hold':             { sets:3, reps:'20-40s', rest:60, muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Hollow Rock':             { sets:3, reps:'10-15', rest:60,  muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Superman Hold':           { sets:3, reps:'10-15', rest:60,  muscles:'Lower Back, Glutes',         category:'Core',      wgerId:null },
  'Copenhagen Plank':        { sets:3, reps:'20-30s/side',rest:60,muscles:'Adductors, Core',         category:'Core',      wgerId:null },
  'Stir the Pot':            { sets:3, reps:'10/direction',rest:60,muscles:'Core, Stability',        category:'Core',      wgerId:null },
  'Cable Woodchop':          { sets:3, reps:'12/side', rest:60,muscles:'Obliques, Core',             category:'Core',      wgerId:null },
  'Landmine Rotation':       { sets:3, reps:'10/side', rest:60,muscles:'Obliques, Core, Shoulders',  category:'Core',      wgerId:null },
  'GHD Sit-Up':              { sets:3, reps:'10-15', rest:60,  muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Toes to Bar':             { sets:3, reps:'8-12',  rest:60,  muscles:'Abs, Lats',                  category:'Core',      wgerId:null },
  'Knee Raise':              { sets:3, reps:'12-15', rest:60,  muscles:'Abs, Hip Flexors',           category:'Core',      wgerId:null },
  'Cable Oblique Crunch':    { sets:3, reps:'12/side', rest:60,muscles:'Obliques',                   category:'Core',      wgerId:null },
  'Windshield Wipers':       { sets:3, reps:'8-12',  rest:60,  muscles:'Obliques, Abs',              category:'Core',      wgerId:null },
  'Reverse Crunch':          { sets:3, reps:'12-15', rest:60,  muscles:'Lower Abs',                  category:'Core',      wgerId:null },
  'Toe Touch Crunch':        { sets:3, reps:'15-20', rest:45,  muscles:'Upper Abs',                  category:'Core',      wgerId:null },
  'McGill Crunch':           { sets:3, reps:'10/side', rest:45,muscles:'Abs, Spine Stability',       category:'Core',      wgerId:null },

  // ── CARDIO (additional) ──
  'Elliptical':              { sets:1, reps:'20-30 min',rest:0, muscles:'Full Body, Cardio',         category:'Cardio',    wgerId:null },
  'Cycling':                 { sets:1, reps:'20-45 min',rest:0, muscles:'Legs, Cardio',              category:'Cardio',    wgerId:null },
  'Swimming Laps':           { sets:1, reps:'20-30 min',rest:0, muscles:'Full Body, Cardio',         category:'Cardio',    wgerId:null },
  'Treadmill Run':           { sets:1, reps:'20-30 min',rest:0, muscles:'Cardio, Legs',              category:'Cardio',    wgerId:null },
  'Incline Walk':            { sets:1, reps:'20-30 min',rest:0, muscles:'Glutes, Cardio',            category:'Cardio',    wgerId:null },
  'Tabata':                  { sets:8, reps:'20s on/10s off',rest:10,muscles:'Full Body, Cardio',    category:'Cardio',    wgerId:null },
  'Prowler Push':            { sets:4, reps:'30m',   rest:120, muscles:'Legs, Core, Cardio',         category:'Cardio',    wgerId:null },
  'Medicine Ball Slam':      { sets:3, reps:'10-12', rest:60,  muscles:'Full Body, Power',           category:'Cardio',    wgerId:null },
  'Tire Flip':               { sets:3, reps:'8-10',  rest:120, muscles:'Full Body, Power',           category:'Cardio',    wgerId:null },
  'Clean and Press':         { sets:4, reps:'5-6',   rest:120, muscles:'Full Body, Power',           category:'Cardio',    wgerId:null },
  'Dumbbell Thruster':       { sets:3, reps:'10-12', rest:90,  muscles:'Legs, Shoulders, Cardio',    category:'Cardio',    wgerId:null },
  'Sandbag Carry':           { sets:3, reps:'40m',   rest:90,  muscles:'Full Body, Grip, Cardio',    category:'Cardio',    wgerId:null },
};

const EXERCISE_CATEGORIES = ['Chest','Back','Shoulders','Biceps','Triceps','Legs','Core','Cardio'];

function getExerciseData(name) {
  if (EXERCISE_DB[name]) return EXERCISE_DB[name];
  const key = Object.keys(EXERCISE_DB).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase().split(' ')[0])
  );
  return key ? EXERCISE_DB[key] : { sets:3, reps:'8-12', rest:90, muscles:'Multiple muscle groups', category:'Other', wgerId:null };
}

// wger image URL builder — returns array of image URLs for an exercise
function getExerciseImages(wgerId) {
  if (!wgerId) return null;
  // wger hosts exercise images at this pattern
  return {
    start: `https://wger.de/en/exercise/${wgerId}/view/exercise`,
    // Use wger's exerciseimage API for actual images
    api: `https://wger.de/api/v2/exerciseimage/?exercise=${wgerId}&format=json`
  };
}

// ═══════════════════════════════════════════
// ONBOARDING STATE
// ═══════════════════════════════════════════
let currentTier = 'beginner';
let selectedSplit = 'ppl';
let selectedWeeks = 16;
let generatedPlan = null;
let USER = {};

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TODAY_IDX  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const tierConfig = {
  beginner: {
    color:'var(--green)', badge:'● Beginner', badgeClass:'',
    sidebarLabel:'What You Get — Beginner',
    features:['Low-impact cardio & bodyweight exercises','No equipment required — home-friendly','Habit-building focus, short sessions','Macro guidance & calorie targets','Recovery and mobility basics']
  },
  intermediate: {
    color:'var(--orange)', badge:'◆ Intermediate', badgeClass:'intermediate',
    sidebarLabel:'What You Get — Intermediate',
    features:['Strength + cardio hybrid training','Progressive overload built in','Gym or home with dumbbells/bands','Macro tracking & nutrition strategy','Weekly intensity variation & deload']
  },
  advanced: {
    color:'var(--red)', badge:'▲ Advanced', badgeClass:'advanced',
    sidebarLabel:'What You Get — Advanced',
    features:['Heavy compound lifting with structured weekly progression','Track your max lifts and push for new personal records each week','Advanced techniques: drop sets, pause reps, and supersets built in','Built-in lighter recovery weeks every 4th week so you don\'t burn out','Conditioning work tailored to your sport or athletic goals']
  }
};

function setTier(tier, btn) {
  currentTier = tier;
  document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.body.className = tier === 'beginner' ? '' : tier;
  const cfg = tierConfig[tier];
  document.getElementById('ob-logo-dot').style.color = cfg.color;
  // Headline change
  const accent = document.getElementById('ob-accent');
  const line3  = document.getElementById('ob-headline-line3');
  if (tier === 'beginner') {
    accent.textContent = 'SMARTER,';
    line3.textContent = 'NOT HARDER';
  } else {
    accent.textContent = 'SMARTER';
    line3.textContent = 'AND HARDER';
  }
  accent.style.color = cfg.color;
  const badge = document.getElementById('tierBadge');
  badge.textContent = cfg.badge; badge.className = 'tier-badge ' + cfg.badgeClass;
  document.getElementById('sidebar-label').textContent = cfg.sidebarLabel;
  document.getElementById('tier-features').innerHTML = cfg.features.map(f =>
    `<div class="feature-item"><div class="feature-dot"></div><div class="feature-text">${f}</div></div>`
  ).join('');
}

function selectSplit(btn) {
  document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSplit = btn.dataset.split;
}

function selectTimeline(btn) {
  document.querySelectorAll('.tl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedWeeks = parseInt(btn.dataset.weeks);
}

function initDayPicker() {
  document.querySelectorAll('#ob-day-picker .day-pill').forEach(p => {
    p.addEventListener('click', () => {
      p.classList.toggle('active');
      const count = document.querySelectorAll('#ob-day-picker .day-pill.active').length;
      const lbl = document.getElementById('day-count-label');
      if (lbl) lbl.textContent = count > 0 ? `— ${count} day${count!==1?'s':''} selected` : '';
    });
  });
  document.querySelectorAll('#ob-equipment-picker .day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const isExclusive = pill.dataset.equip === 'Full Gym' || pill.dataset.equip === 'Bodyweight Only';
      if (isExclusive) {
        document.querySelectorAll('#ob-equipment-picker .day-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      } else {
        document.querySelectorAll('#ob-equipment-picker .day-pill').forEach(p => {
          if (p.dataset.equip === 'Full Gym' || p.dataset.equip === 'Bodyweight Only') p.classList.remove('active');
        });
        pill.classList.toggle('active');
      }
    });
  });
}

function getSelectedDays() { return [...document.querySelectorAll('#ob-day-picker .day-pill.active')].map(p => p.dataset.day).filter(d => d); }

// ── NUTRITION CALCULATOR ──
function calcNutrition(weightLbs, goalLbs, weeks, gender, age, heightCm, activityLevel) {
  // Mifflin-St Jeor BMR — requires real height
  const wKg = weightLbs * 0.453592;
  const hCm = heightCm || 175; // fallback if not provided
  const a = parseInt(age) || 30;
  let bmr;
  if (gender === 'Female') {
    bmr = 10 * wKg + 6.25 * hCm - 5 * a - 161;
  } else {
    bmr = 10 * wKg + 6.25 * hCm - 5 * a + 5;
  }

  // Activity multipliers (Harris-Benedict scale)
  // These represent TOTAL daily activity including gym training
  const activityMultipliers = {
    sedentary: 1.375,  // desk job + gym training
    light:     1.55,   // lightly active + gym
    moderate:  1.725,  // moderately active + gym
    very:      1.9     // very active + gym
  };
  const multiplier = activityMultipliers[activityLevel] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  const diff = weightLbs - goalLbs; // positive = lose, negative = gain
  const mode = diff > 2 ? 'lose' : diff < -2 ? 'gain' : 'maintain';

  let calories, surplus, deficit, weeklyChange;

  if (mode === 'lose') {
    const totalDeficit = diff * 3500;
    const dailyDeficit = Math.round(totalDeficit / (weeks * 7));
    // Cap: max 1% body weight per week loss to preserve muscle
    const maxDailyDeficit = Math.round((weightLbs * 0.01 * 3500) / 7);
    deficit = Math.max(250, Math.min(750, dailyDeficit, maxDailyDeficit));
    calories = Math.max(1200, tdee - deficit);
    weeklyChange = (deficit * 7 / 3500).toFixed(1);
    surplus = 0;
  } else if (mode === 'gain') {
    const totalSurplus = Math.abs(diff) * 3500;
    const dailySurplus = Math.round(totalSurplus / (weeks * 7));
    surplus = Math.max(200, Math.min(500, dailySurplus)); // lean bulk: 200-500 cal surplus
    calories = tdee + surplus;
    weeklyChange = (surplus * 7 / 3500).toFixed(1);
    deficit = 0;
  } else {
    calories = tdee;
    surplus = 0; deficit = 0;
    weeklyChange = '0';
  }

  // Evidence-based protein targets (Helms et al., 2014; Morton et al., 2018)
  // Cutting: 1.0-1.2g/lb to preserve muscle in deficit
  // Bulking: 0.8-1.0g/lb sufficient for hypertrophy
  // Maintenance: 0.85g/lb
  const proteinPerLb = mode === 'lose' ? 1.1 : mode === 'gain' ? 0.9 : 0.85;
  const protein = Math.round(weightLbs * proteinPerLb);

  // Fat: minimum 20% of calories for hormonal health, target 25-30%
  const fat = Math.round(calories * 0.27 / 9);

  // Carbs: fill remaining calories — primary fuel for training performance
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, fat, carbs, weeklyChange, tdee, deficit, surplus, mode, bmr: Math.round(bmr), multiplier };
}

// ── PLAN GENERATION ──
function getSelectedEquipment() {
  return Array.from(document.querySelectorAll('#ob-equipment-picker .day-pill.active')).map(el => el.dataset.equip);
}

async function generatePlan() {
  const name     = document.getElementById('ob-name').value.trim();
  const age      = document.getElementById('ob-age').value;
  const gender   = document.getElementById('ob-gender').value;
  const weight   = parseFloat(document.getElementById('ob-weight').value);
  const goal     = parseFloat(document.getElementById('ob-goal').value);
  const heightFt = parseInt(document.getElementById('ob-height-ft').value) || 0;
  const heightIn = parseInt(document.getElementById('ob-height-in').value) || 0;
  const activity = document.getElementById('ob-activity').value;
  const injuries = document.getElementById('ob-injuries').value.trim();
  const selDays  = getSelectedDays();
  const duration = document.getElementById('ob-duration').value;
  const equipment = getSelectedEquipment();

  // Validate each field individually for clear feedback
  const missing = [];
  if (!age) missing.push('Age');
  if (!gender) missing.push('Gender');
  if (!weight) missing.push('Current Weight');
  if (!goal) missing.push('Goal Weight');
  if (!heightFt) missing.push('Height (feet)');
  if (!activity) missing.push('Activity Level');
  if (selDays.length === 0) missing.push('Gym Days');
  if (!duration) missing.push('Session Length');
  if (equipment.length === 0) missing.push('Available Equipment');
  if (missing.length > 0) {
    alert('Please fill in: ' + missing.join(', '));
    return;
  }

  const heightCm = Math.round((heightFt * 12 + heightIn) * 2.54);
  const nutrition = calcNutrition(weight, goal, selectedWeeks, gender, age, heightCm, activity);
  USER = { name: name || 'You', age, gender, weight, goal, heightCm, heightFt, heightIn, activity, injuries, equipment, selDays, duration, tier: currentTier, weeks: selectedWeeks, split: selectedSplit, nutrition };

  document.getElementById('generateBtn').disabled = true;
  document.querySelector('.main-layout').style.display = 'none';
  document.getElementById('hero-section').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('results-section').style.display = 'none';

  const msgs = [
    'Analyzing your body metrics...',
    'Calculating precise calorie & macro targets...',
    'Designing your periodized program...',
    'Selecting exercises for your equipment...',
    'Optimizing your training split...',
    'Finalizing your plan...'
  ];
  let mi = 0;
  const miv = setInterval(() => { mi=(mi+1)%msgs.length; document.getElementById('loading-detail').textContent = msgs[mi]; }, 1200);

  try {
    generatedPlan = await buildPlan(selDays);
    clearInterval(miv);
    lsSet('fs_plan', generatedPlan);
    lsSet('fs_user', USER);
    renderResults(generatedPlan);
  } catch(e) {
    clearInterval(miv);
    document.getElementById('generateBtn').disabled = false;
    document.querySelector('.main-layout').style.display = '';
    document.getElementById('hero-section').style.display = '';
    document.getElementById('loading').style.display = 'none';
    alert('Error: ' + (e.message || String(e)));
  }
}

async function buildPlan(selDays) {
  const u = USER;
  const n = u.nutrition;
  const heightStr = u.heightFt + "'" + u.heightIn + '"';
  const equipStr = u.equipment.join(', ') || 'Full Gym';
  const injuryStr = u.injuries || 'None';
  const splitLabel = { ppl:'Push/Pull/Legs', ul:'Upper/Lower', fb:'Full Body', ai:'AI Optimized (choose best for me)' }[u.split] || 'Push/Pull/Legs';
  const gymDaysStr = selDays.join(', ');
  const modeStr = n.mode === 'lose' ? 'fat loss' : n.mode === 'gain' ? 'muscle gain (lean bulk)' : 'body recomposition';

  const systemPrompt = `You are an elite strength coach. Respond ONLY with a single valid JSON object. No markdown, no code blocks, no explanation. Raw JSON only. Keep ALL strings as short as possible.`;

  const exPerSession = u.tier === 'beginner' ? '3-4' : u.tier === 'intermediate' ? '4-5' : '5-6';
  const userPrompt = `${u.age}yo ${u.gender}, ${heightStr}, ${u.weight}→${u.goal}lbs, ${u.activity}, ${u.tier}, goal: ${modeStr}.
Equip: ${equipStr}. Injuries: ${injuryStr}. Days: ${gymDaysStr} (${selDays.length}x/wk), ${u.duration}, ${splitLabel}, ${u.weeks}wk.

Return ONLY this JSON structure:
{"planName":"short name","tagline":"short","philosophy":"1 sentence","schedule":[{"day":"Monday","type":"workout","badge":"Push","exercises":[{"name":"Bench Press","sets":4,"reps":"6-8","rest":120,"muscles":"Chest"}]},{"day":"Tuesday","type":"rest","badge":"Rest","exercises":[]}]}

CRITICAL RULES:
- All 7 days Mon-Sun must be included
- Gym days: ${gymDaysStr}. All other days are rest.
- ${exPerSession} exercises per workout
- Exercise names: 2-3 words max (e.g. "Bench Press" not "Barbell Flat Bench Press")
- muscles: single word (e.g. "Chest" not "Chest, Front Delts")
- philosophy: 1 short sentence only
- Equipment: ${equipStr}. Avoid: ${injuryStr}`;

  // Try up to 2 attempts in case of truncated response
  let parsed;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callClaude(
      [{ role: 'user', content: attempt === 0 ? userPrompt : userPrompt + '\n\nIMPORTANT: Keep exercise names SHORT (2-3 words max). Keep philosophy under 50 words. Minimize all string lengths to fit within token limits.' }],
      { system: systemPrompt, max_tokens: 8000, timeout: 90000 }
    );

    try {
      let clean = raw.replace(/^```json\n?|^```\n?|```$/gm, '').trim();
      // Attempt direct parse first
      try { parsed = JSON.parse(clean); break; } catch(_) {}
      // Try to repair truncated JSON by closing open brackets/braces
      let repaired = clean;
      // Remove trailing incomplete key-value pair (e.g. ,"muscles":"Che )
      repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*":\s*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*$/, '');
      // Count and close unclosed brackets
      const opens = (repaired.match(/\[/g)||[]).length - (repaired.match(/\]/g)||[]).length;
      const braces = (repaired.match(/\{/g)||[]).length - (repaired.match(/\}/g)||[]).length;
      for (let i = 0; i < opens; i++) repaired += ']';
      for (let i = 0; i < braces; i++) repaired += '}';
      parsed = JSON.parse(repaired);
      break;
    } catch(e) {
      if (attempt === 1) throw new Error('JSON parse failed: ' + e.message + ' | Raw: ' + raw.substring(0, 200));
    }
  }

  // Validate the parsed plan has required fields
  if (!parsed || !parsed.schedule || !Array.isArray(parsed.schedule) || parsed.schedule.length < 7) {
    throw new Error('AI returned an incomplete plan. Please try again — this is usually a one-time issue.');
  }

  // Enrich exercises with DB data (sets/reps/rest overridden by AI, but pull muscle images etc.)
  const schedule = parsed.schedule.map(day => {
    if (day.type === 'rest') {
      return { day: day.day, type: 'rest', badge: 'Rest', workout: 'Rest day. Recover, hydrate, and let your muscles rebuild.', exercises: [] };
    }
    const exercises = (day.exercises || []).map(ex => {
      const db = getExerciseData(ex.name);
      return {
        name: ex.name,
        sets: ex.sets || db.sets,
        reps: ex.reps || db.reps,
        rest: ex.rest || db.rest,
        muscles: ex.muscles || db.muscles,
        ytId: db.yt || null
      };
    });
    return {
      day: day.day,
      type: 'workout',
      badge: day.badge,
      workout: exercises.map(e => e.name + ' ' + e.sets + '×' + e.reps).join(', '),
      exercises
    };
  });

  const nu = USER.nutrition;
  return {
    name: parsed.planName,
    tagline: parsed.tagline,
    philosophy: parsed.philosophy,
    calorie_target: nu.calories.toLocaleString() + ' cal/day',
    protein_target: nu.protein + 'g/day',
    weekly_loss: '~' + nu.weeklyChange + ' lbs/week',
    mode: nu.mode,
    timeline: u.weeks + ' weeks',
    workout_philosophy: parsed.philosophy,
    schedule
  };
}

function renderResults(plan) {
  document.getElementById('loading').style.display = 'none';
  const tier = currentTier;
  document.getElementById('plan-name').textContent = plan.name;
  document.getElementById('plan-tagline').textContent = plan.tagline;
  const rtb = document.getElementById('results-tier-badge');
  rtb.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  rtb.className = 'results-tier-badge ' + (tier==='beginner'?'':tier);

  const n = USER.nutrition;
  // Populate myplan tab too
  const myplanGrid = document.getElementById('myplan-results-grid');
  const myplanBanner = document.getElementById('myplan-banner');
  if (myplanBanner) myplanBanner.innerHTML = `<div class="results-banner" style="border-radius:14px;margin-bottom:0"><div><h2>${plan.name}</h2><p>${plan.tagline}</p></div><div class="results-tier-badge">${USER.tier.charAt(0).toUpperCase()+USER.tier.slice(1)}</div></div>`;
  document.getElementById('results-grid').innerHTML = [
    { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', title:'YOUR GOAL', html:`<ul style="margin-top:4px;margin-left:14px"><li>Current weight: <strong>${USER.weight} lbs</strong></li><li>Goal weight: <strong>${USER.goal} lbs</strong></li><li>Timeline: <strong>${plan.timeline}</strong></li><li>${n.mode==='gain'?'Gaining':'Losing'} <strong>${Math.abs(parseFloat(n.weeklyChange))} lbs/week</strong></li></ul>` },
    { icon:'🥩', title:'NUTRITION TARGETS', html:`<p><strong>${plan.calorie_target}</strong> daily calories</p><p><strong>${plan.protein_target}</strong> protein</p><p style="margin-top:6px;color:var(--dim);font-size:0.83rem">Carbs: ${USER.nutrition.carbs}g · Fat: ${USER.nutrition.fat}g · TDEE: ${USER.nutrition.tdee} cal</p>` },
    { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'TRAINING APPROACH', html:`<ul style="margin-top:4px;margin-left:14px">${(plan.workout_philosophy||plan.philosophy||'Personalized program built for your goals.').split('. ').filter(s=>s.trim()).map(s=>`<li style="margin-bottom:6px">${s.trim().replace(/\.$/,'')}</li>`).join('')}</ul>` },
  ].map(c=>`<div class="r-card"><div class="r-card-icon">${c.icon}</div><h3>${c.title}</h3>${c.html}</div>`).join('');

  document.getElementById('week-card').innerHTML = '<h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> WEEK 1 SCHEDULE</h3>' +
    plan.weekly_schedule.map(d=>{
      const tagCls = d.type==='rest' ? 'rest' : 'workout '+(tier!=='beginner'?tier:'');
      return `<div class="day-row"><div class="day-name">${d.day}</div><div class="day-workout"><strong style="color:var(--off)">${d.badge}</strong> — ${d.workout.length>80?d.workout.slice(0,80)+'...':d.workout}</div><div class="day-tag ${tagCls}">${d.type==='rest'?'Rest':'Train'}</div></div>`;
    }).join('');

  const rs = document.getElementById('results-section');
  rs.style.display = 'block';
  rs.scrollIntoView({behavior:'smooth',block:'start'});
  document.getElementById('generateBtn').disabled = false;
  renderMyPlan(generatedPlan);
}

// ── SIGNUP ──
function enterApp() {
  // Hide the CTA section permanently
  const cta = document.querySelector('.cta-into-app');
  if (cta) cta.style.display = 'none';
  lsSet('fs_entered', true);
  goToDash();
}

function goBackToResults() {
  document.getElementById('screen-signup').classList.remove('active');
  document.getElementById('screen-onboard').style.display = 'block';
  document.getElementById('results-section').scrollIntoView({behavior:'smooth',block:'start'});
}

function checkPwStrength(val) {
  const bars = ['pw1','pw2','pw3','pw4'].map(id=>document.getElementById(id));
  bars.forEach(b=>b.className='pw-bar');
  if (!val) return;
  const score = (val.length>=8?1:0)+(/[A-Z]/.test(val)?1:0)+(/[0-9]/.test(val)?1:0)+(/[^A-Za-z0-9]/.test(val)?1:0);
  const cls = score<=1?'weak':score<=2?'ok':'strong';
  for(let i=0;i<score;i++) bars[i].className='pw-bar '+cls;
}

function submitSignup() {
  const first = document.getElementById('su-firstname').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pw    = document.getElementById('su-password').value;
  if (!first) { document.getElementById('su-firstname').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('su-firstname').style.borderColor='',1500); return; }
  if (!email||!email.includes('@')) { document.getElementById('su-email').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('su-email').style.borderColor='',1500); return; }
  if (pw.length<8) { document.getElementById('su-password').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('su-password').style.borderColor='',1500); return; }
  const last = document.getElementById('su-lastname').value.trim();
  USER.name = first+(last?' '+last:'');
  USER.email = email;
  const btn = document.getElementById('su-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> CREATING YOUR ACCOUNT...';
  setTimeout(()=>{
    btn.innerHTML = '✓ REDIRECTING TO CHECKOUT...';
    setTimeout(()=>{ window.location.href = 'https://link.fastpaydirect.com/payment-link/699794d31a8400387302a088'; }, 600);
  }, 1400);
}

function goToDash() {
  // Restore plan from localStorage if not in memory (e.g. after page reload)
  if (!generatedPlan) {
    const saved = lsGet('fs_plan');
    const savedUser = lsGet('fs_user');
    if (saved && savedUser) {
      generatedPlan = saved;
      USER = savedUser;
    }
  }
  const cta = document.querySelector('.cta-into-app');
  if (cta && lsGet('fs_entered')) cta.style.display = 'none';
  // Hide all screens with inline style to override any CSS specificity
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  initDashboard();
  const dash = document.getElementById('screen-dash');
  // Must use inline flex — CSS #screen-dash{display:none} beats .screen.active{display:block}
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  dash.style.minHeight = '100vh';
  dash.classList.add('active');
  window.scrollTo(0,0);
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
let TARGETS = { cal:2000, pro:150, carb:200, fat:55 };
let GYM_DAYS = [];
let DAY_WORKOUTS = {};
let TOTAL_WEEKS = 16;
let CURRENT_WEEK = 1;
// PERIODIZATION: training phases — hypertrophy (wks 1-4), strength (5-8), power (9-12), peak (13-16)
// Every 4th week is a deload (60% volume)
const TRAINING_PHASES = [
  { name:'HYPERTROPHY', weeks:[1,2,3,4], repRange:'8-12', setMultiplier:1.0,  intensityLabel:'Moderate weight, high reps. Focus on the squeeze and muscle connection.' },
  { name:'STRENGTH',    weeks:[5,6,7,8], repRange:'5-8',  setMultiplier:1.1,  intensityLabel:'Heavier weight, lower reps. Control the eccentric. Rest fully between sets.' },
  { name:'POWER',       weeks:[9,10,11,12], repRange:'3-6', setMultiplier:1.2, intensityLabel:'Near maximal loads. Explosive concentric. Take 2-3 min rest between sets.' },
  { name:'PEAK',        weeks:[13,14,15,16], repRange:'4-6', setMultiplier:1.15, intensityLabel:'Maintain intensity. Reduce volume. Nail technique at heavy loads.' },
];
function getTrainingPhase(week) {
  return TRAINING_PHASES.find(p => p.weeks.includes(week)) || TRAINING_PHASES[0];
}
function isDeloadWeek(week) { return week % 4 === 0; }
function getPhaseExerciseModifier(week) {
  if (isDeloadWeek(week)) return { setMult: 0.6, repRange: null, label: 'DELOAD' };
  const ph = getTrainingPhase(week);
  return { setMult: ph.setMultiplier, repRange: ph.repRange, label: ph.name };
}
let mealLogs = Object.fromEntries(Array.from({length:7},(_,i)=>[i,[]]));
let wktDone = new Set();
let nutDay = TODAY_IDX;

// localStorage keys
const LS = {
  mealLogs: 'fs_mealLogs',
  wktDone:  'fs_wktDone',
  setLogs:  'fs_setLogs',  // { 'dayIdx_exIdx_setIdx': { weight, reps, date } }
  targets:  'fs_targets',
  woDraft:  'fs_wo_draft', // { [dayIdx]: { sets: woSets, extraSets: woExtraSets } } — every keystroke persisted
};

function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

// ── ANTHROPIC API (via Cloudflare Worker proxy) ──
const AI_PROXY = 'https://fitstart-api.noah-0c3.workers.dev';

async function callClaude(messages, opts = {}) {
  const body = {
    model: opts.model || 'claude-sonnet-4-20250514',
    max_tokens: opts.max_tokens || 2048,
    messages: messages
  };
  if (opts.system) body.system = opts.system;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 60000);
  try {
    const response = await fetch(AI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error('Slow down — too many requests. Try again in a minute.');
      throw new Error(err.error?.message || 'AI is temporarily unavailable. Try again shortly.');
    }
    const data = await response.json();
    return (data.content?.[0]?.text || '').trim();
  } catch(e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('Request timed out. Try again.');
    throw e;
  }
}

function loadFromStorage() {
  const ml = lsGet(LS.mealLogs); if (ml) mealLogs = ml;
  const wd = lsGet(LS.wktDone);  if (wd) wktDone = new Set(wd);
  const tg = lsGet(LS.targets);  if (tg) TARGETS = tg;
  // Calculate current training week from program start date
  const startDate = lsGet('fs_program_start');
  if (startDate) {
    const msElapsed = Date.now() - new Date(startDate).getTime();
    const weeksElapsed = Math.floor(msElapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
    CURRENT_WEEK = Math.min(weeksElapsed, TOTAL_WEEKS);
  } else {
    lsSet('fs_program_start', new Date().toISOString());
    CURRENT_WEEK = 1;
  }
}

function saveToStorage() {
  lsSet(LS.mealLogs, mealLogs);
  lsSet(LS.wktDone, [...wktDone]);
  lsSet(LS.targets, TARGETS);
  // Refresh charts if on progress tab
  if (document.getElementById('view-progress') &&
      document.getElementById('view-progress').style.display !== 'none') {
    renderNutritionChart();
  }
}

// Set log: store previous week's weights/reps
// ── EXERCISE LOG — keyed by exercise name, not day slot ──
function getExLogs() { return lsGet('fs_exlogs') || {}; }

function saveSet(dayIdx, exIdx, setIdx, weight, reps) {
  // Allow partial saves for draft; full write to exlogs only when both present
  const exName = (woWorkout && woWorkout.exercises[exIdx]) ? woWorkout.exercises[exIdx].name : null;
  if (!exName) return;
  const hasWeight = weight != null && String(weight).trim() !== '';
  const hasReps = reps != null && String(reps).trim() !== '';
  if (hasWeight && hasReps) {
    // Persist to set logs and exlogs for completed set
    const logs = lsGet(LS.setLogs) || {};
    logs[`${dayIdx}_${exIdx}_${setIdx}`] = { weight, reps, date: new Date().toLocaleDateString() };
    lsSet(LS.setLogs, logs);
    const exlogs = getExLogs();
    if (!exlogs[exName]) exlogs[exName] = [];
    const today = todayDateStr();
    let session = exlogs[exName].find(s => s.date === today);
    if (!session) {
      session = { date: today, sets: [] };
      exlogs[exName].unshift(session);
      exlogs[exName] = exlogs[exName].slice(0, 30);
    }
    session.sets[setIdx] = { weight: parseFloat(weight), reps: parseInt(reps) };
    lsSet('fs_exlogs', exlogs);
  }
}

function getPrevSet(dayIdx, exIdx, setIdx) {
  const exName = (woWorkout && woWorkout.exercises[exIdx]) ? woWorkout.exercises[exIdx].name : null;
  if (exName) {
    const exlogs = getExLogs();
    const sessions = exlogs[exName] || [];
    const today = todayDateStr();
    const prev = sessions.find(s => s.date !== today);
    if (prev && prev.sets && prev.sets[setIdx]) {
      return { weight: prev.sets[setIdx].weight, reps: prev.sets[setIdx].reps, date: prev.date };
    }
  }
  const logs = lsGet(LS.setLogs) || {};
  return logs[`${dayIdx}_${exIdx}_${setIdx}`] || null;
}

function getWorkoutDraft(dayIdx) {
  const all = lsGet(LS.woDraft) || {};
  return all[String(dayIdx)] || null;
}

function persistWorkoutDraft() {
  if (woWorkout == null) return;
  const all = lsGet(LS.woDraft) || {};
  all[String(woDay)] = { sets: JSON.parse(JSON.stringify(woSets)), extraSets: JSON.parse(JSON.stringify(woExtraSets)) };
  lsSet(LS.woDraft, all);
}

function getLastSessionSummary(exName) {
  if (!exName) return null;
  const exlogs = getExLogs();
  const sessions = exlogs[exName] || [];
  const today = todayDateStr();
  const prev = sessions.find(s => s.date !== today);
  if (!prev || !prev.sets || !prev.sets.length) return null;
  const setStr = prev.sets.filter(Boolean).map(s => `${s.weight}×${s.reps}`).join(', ');
  return `${setStr} · ${prev.date}`;
}

function _getOverloadSuggestion(exName) {
  const exlogs = getExLogs();
  const sessions = exlogs[exName] || [];
  const today = todayDateStr();
  const prev = sessions.find(s => s.date !== today);
  if (!prev || !prev.sets || !prev.sets.length) return null;
  // Find the best set from last time (highest weight)
  let bestW = 0, bestR = 0;
  prev.sets.filter(Boolean).forEach(s => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps) || 0;
    if (w > bestW || (w === bestW && r > bestR)) { bestW = w; bestR = r; }
  });
  if (!bestW) return null;
  // Suggest: if reps < 10, try +1 rep same weight; if reps >= 10, try +5lbs same reps
  if (bestR >= 10) {
    return `Try ${bestW + 5}lbs × ${bestR} today (last: ${bestW}×${bestR})`;
  } else {
    return `Try ${bestW}lbs × ${bestR + 1} today (last: ${bestW}×${bestR})`;
  }
}

// Helper: get fresh exercise list for a workout name + tier (used by plan auto-update)
function _getFreshExercises(workoutName, tier) {
  const workoutExercises = {
    'Push Day': {
      beginner:     ['Bench Press','Shoulder Press','Incline DB Press','Lateral Raises','Tricep Pushdown'],
      intermediate: ['Bench Press','Incline DB Press','Shoulder Press','Lateral Raises','Cable Crossover','Tricep Pushdown'],
      advanced:     ['Bench Press','Incline DB Press','Shoulder Press','Lateral Raises','Cable Crossover','Skull Crushers']
    },
    'Pull Day': {
      beginner:     ['Barbell Row','Lat Pulldown','Cable Row','Face Pulls','Barbell Curl'],
      intermediate: ['Barbell Row','Lat Pulldown','Cable Row','Face Pulls','Barbell Curl','Hammer Curls'],
      advanced:     ['Deadlift','Barbell Row','Lat Pulldown','Face Pulls','Barbell Curl','Hammer Curls']
    },
    'Legs': {
      beginner:     ['Goblet Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raises'],
      intermediate: ['Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raises'],
      advanced:     ['Back Squat','Romanian Deadlift','Leg Press','Walking Lunges','Leg Curl','Calf Raises']
    },
    'Upper Body': {
      beginner:     ['Bench Press','Barbell Row','Shoulder Press','Lat Pulldown','Barbell Curl'],
      intermediate: ['Bench Press','Barbell Row','Shoulder Press','Lat Pulldown','Hammer Curls'],
      advanced:     ['Bench Press','Barbell Row','Shoulder Press','Lat Pulldown','Lateral Raises','Hammer Curls']
    },
    'Lower Body': {
      beginner:     ['Goblet Squat','Romanian Deadlift','Leg Press','Calf Raises'],
      intermediate: ['Back Squat','Romanian Deadlift','Leg Press','Calf Raises'],
      advanced:     ['Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raises']
    },
    'Full Body': {
      beginner:     ['Goblet Squat','Bench Press','Barbell Row','Shoulder Press','Plank'],
      intermediate: ['Back Squat','Bench Press','Barbell Row','Shoulder Press','Plank'],
      advanced:     ['Back Squat','Bench Press','Barbell Row','Shoulder Press','Romanian Deadlift','Dead Bug']
    }
  };
  const exNames = workoutExercises[workoutName] && workoutExercises[workoutName][tier];
  if (!exNames) return null;
  return exNames.map(name => {
    const db = getExerciseData(name);
    return { name, sets: db.sets, reps: db.reps, rest: db.rest, muscles: db.muscles, ytId: db.yt };
  });
}

function initDashboard() {
  if (!generatedPlan || !generatedPlan.weekly_schedule || !Array.isArray(generatedPlan.weekly_schedule)) {
    // Plan data is missing or corrupt — clear and show onboarding
    localStorage.removeItem('fs_plan');
    localStorage.removeItem('fs_user');
    localStorage.removeItem('fs_entered');
    const dash = document.getElementById('screen-dash');
    if (dash) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:40px;color:#fff;font-size:1rem;text-align:center';
      errDiv.innerHTML = '<h2 style="margin-bottom:16px">⚠️ Plan needs to be regenerated</h2><p style="color:#aaa;margin-bottom:20px">Your saved plan is outdated. Please create a new plan.</p><button onclick="localStorage.clear();location.reload()" style="padding:12px 24px;background:#4ADE80;border:none;border-radius:8px;font-weight:700;cursor:pointer">Start Fresh</button>';
      dash.appendChild(errDiv);
    }
    return;
  }

  // Auto-update workout exercises if plan was generated with old templates (v2 = compound-first)
  const PLAN_VERSION = 3;
  if (generatedPlan._v !== PLAN_VERSION && generatedPlan.weekly_schedule && USER) {
    const t = USER.tier || 'beginner';
    generatedPlan.weekly_schedule.forEach(d => {
      if (d.type !== 'workout' || !d.badge) return;
      const freshExList = _getFreshExercises(d.badge, t);
      if (freshExList) {
        d.exercises = freshExList;
        d.workout = freshExList.map(e => `${e.name} ${e.sets}×${e.reps}`).join(', ');
      }
    });
    generatedPlan._v = PLAN_VERSION;
    lsSet('fs_plan', generatedPlan);
  }

  loadFromStorage();

  TARGETS = {
    cal:  USER.nutrition.calories,
    pro:  USER.nutrition.protein,
    carb: USER.nutrition.carbs,
    fat:  USER.nutrition.fat
  };
  TOTAL_WEEKS = USER.weeks || 16;

  // Build DAY_WORKOUTS from plan
  GYM_DAYS = [];
  DAY_WORKOUTS = {};
  generatedPlan.weekly_schedule.forEach((d, i) => {
    if (d.type === 'workout' && d.exercises && d.exercises.length > 0) {
      GYM_DAYS.push(i);
      DAY_WORKOUTS[i] = {
        name: d.badge,
        focus: d.workout.slice(0,80),
        exercises: d.exercises
      };
    }
  });

  // Nav/header
  const initials = USER.name ? USER.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '?';
  document.getElementById('dash-avatar').textContent = initials;
  document.getElementById('dash-username').textContent = USER.name || 'You';
  document.getElementById('dash-day-title').textContent = DAYS_FULL[TODAY_IDX].toUpperCase();
  const _phMod = getPhaseExerciseModifier(CURRENT_WEEK);
  const _phaseLabel = isDeloadWeek(CURRENT_WEEK) ? '⚡ DELOAD WEEK' : _phMod.label + ' PHASE';
  document.getElementById('dash-day-sub').textContent = `Week ${CURRENT_WEEK} of ${TOTAL_WEEKS} · ${_phaseLabel} · ${generatedPlan.name}`;
  const pvs=document.getElementById('prog-view-sub'); if(pvs) pvs.textContent = `Week ${CURRENT_WEEK} · ${generatedPlan.name}`;
  const wps=document.getElementById('wk-pro-sub'); if(wps) wps.textContent = `goal: ${TARGETS.pro}g/day`;

  // Settings defaults
  document.getElementById('s-name').value   = USER.name || '';
  document.getElementById('s-weight').value = USER.weight ? USER.weight + ' lbs' : '';
  document.getElementById('s-goal').value   = USER.goal ? USER.goal + ' lbs' : '';
  document.getElementById('s-tier').value   = USER.tier ? USER.tier.charAt(0).toUpperCase()+USER.tier.slice(1) : '';
  document.getElementById('s-cal').value    = TARGETS.cal;
  document.getElementById('s-pro').value    = TARGETS.pro;
  document.getElementById('s-carb').value   = TARGETS.carb;
  document.getElementById('s-fat').value    = TARGETS.fat;

  // Progress (null-safe - elements may not exist in all views)
  const pwCur = document.getElementById('pw-current');
  if (pwCur) pwCur.innerHTML = USER.weight + ' <span style="font-size:1.2rem;color:var(--dim)">lbs</span>';
  const pwDet = document.getElementById('pw-detail');
  if (pwDet) pwDet.textContent = 'Goal: ' + USER.goal + ' lbs';
  const pwRng = document.getElementById('pw-range');
  if (pwRng) pwRng.innerHTML = '<span>'+USER.weight+' lbs</span><span>Today</span><span>'+USER.goal+' lbs</span>';

  // Program stats
  const ptv=document.getElementById('prog-tier-val'); if(ptv) ptv.textContent = USER.tier ? USER.tier.charAt(0).toUpperCase()+USER.tier.slice(1) : '—';
  const ppn=document.getElementById('prog-plan-name'); if(ppn) ppn.textContent = generatedPlan.name;
  const pgd=document.getElementById('prog-gym-days'); if(pgd) pgd.textContent = GYM_DAYS.map(i=>DAYS_SHORT[i]).join(' · ');
  const pdc=document.getElementById('prog-days-count'); if(pdc) pdc.textContent = GYM_DAYS.length + ' days/week';
  const pf=document.getElementById('prog-fraction'); if(pf) pf.textContent = `${CURRENT_WEEK} / ${TOTAL_WEEKS}`;
  const ppb=document.getElementById('prog-pct-bar'); if(ppb) ppb.style.width = (CURRENT_WEEK/TOTAL_WEEKS*100) + '%';

  nutDay = TODAY_IDX;

  // ── AI Adaptive Intelligence ──
  // Runs weekly: checks weight trend, strength progress, and adjusts macros/workouts
  _runAdaptiveCheck();

  try {
    renderTodayWorkout(); renderTodayMiniLog();
    refreshDashMacros();
    renderWeek();
    renderStreak();
    renderWeightHistory();
    renderNutritionChart();
    renderFreqChart();
    renderNutritionChart();
    renderProgram();
    renderSettingsGymDays();
    renderMyPlan(generatedPlan);
    saveToStorage();
  } catch(e) {
    console.error('Dashboard render error:', e);
    const main = document.querySelector('#screen-dash .main-content');
    if (main) main.innerHTML = '<div style="padding:40px;color:#fff"><h2 style="color:#F43F5E;margin-bottom:12px">Error Loading Dashboard</h2><pre style="background:#111;padding:16px;border-radius:8px;font-size:0.8rem;color:#aaa;white-space:pre-wrap">' + e.stack + '</pre><button onclick="localStorage.clear();location.reload()" style="margin-top:16px;padding:12px 24px;background:#4ADE80;border:none;border-radius:8px;font-weight:700;cursor:pointer">Clear Data & Restart</button></div>';
  }
}

// ═══════════════════════════════════════════
// AI ADAPTIVE INTELLIGENCE
// Checks weight trend & workout performance weekly, adjusts macros & workout intensity
// ═══════════════════════════════════════════
function _runAdaptiveCheck() {
  try {
    const lastCheck = lsGet('fs_adaptive_last');
    const now = Date.now();
    // Run at most once per 3 days
    if (lastCheck && (now - lastCheck) < 3 * 24 * 60 * 60 * 1000) return;

    const weightLog = lsGet('fs_weightLog') || [];
    if (weightLog.length < 2) return; // Need at least 2 weigh-ins

    // Calculate weight trend (last 2 weeks vs previous 2 weeks)
    const sorted = [...weightLog].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, Math.min(5, sorted.length));
    const older = sorted.slice(Math.min(5, sorted.length), Math.min(10, sorted.length));
    if (older.length === 0) return;

    const avgRecent = recent.reduce((s,w) => s + w.weight, 0) / recent.length;
    const avgOlder = older.reduce((s,w) => s + w.weight, 0) / older.length;
    const weeklyChange = avgRecent - avgOlder;

    // Calculate workout volume trend
    const exLogs = getExLogs();
    let recentVolume = 0, olderVolume = 0;
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    Object.values(exLogs).forEach(sessions => {
      sessions.forEach(s => {
        const vol = (s.sets || []).reduce((sum, set) => sum + ((set?.weight || 0) * (set?.reps || 0)), 0);
        if (s.date >= twoWeeksAgo) recentVolume += vol;
        else if (s.date >= fourWeeksAgo) olderVolume += vol;
      });
    });

    const mode = USER?.nutrition?.mode || 'lose';
    const currentCal = TARGETS.cal;
    let newCal = currentCal;
    let adaptMsg = '';

    if (mode === 'lose') {
      if (weeklyChange > 0.5) {
        // Gaining weight while trying to lose — reduce calories
        newCal = Math.max(1200, currentCal - 150);
        adaptMsg = `You've gained ~${weeklyChange.toFixed(1)} lbs recently. Reducing daily target to ${newCal} cal to get back on track.`;
      } else if (weeklyChange < -2) {
        // Losing too fast — increase slightly to preserve muscle
        newCal = currentCal + 100;
        adaptMsg = `You're losing ${Math.abs(weeklyChange).toFixed(1)} lbs/week — great progress! Bumping calories slightly to ${newCal} to preserve muscle.`;
      } else if (weeklyChange >= -1 && weeklyChange <= -0.3) {
        adaptMsg = `On track — losing ${Math.abs(weeklyChange).toFixed(1)} lbs/week. Keep it up.`;
      }
    } else if (mode === 'gain') {
      if (weeklyChange < 0) {
        // Losing weight while trying to gain — increase calories
        newCal = currentCal + 200;
        adaptMsg = `You've lost weight while bulking. Increasing target to ${newCal} cal to fuel muscle growth.`;
      } else if (weeklyChange > 1.5) {
        // Gaining too fast — reduce surplus to limit fat gain
        newCal = currentCal - 100;
        adaptMsg = `Gaining ${weeklyChange.toFixed(1)} lbs/week is too fast. Reducing to ${newCal} cal to minimize fat gain.`;
      }
    }

    // Strength progress insight
    let strengthMsg = '';
    if (olderVolume > 0 && recentVolume > 0) {
      const volumeChange = ((recentVolume - olderVolume) / olderVolume * 100);
      if (volumeChange > 10) {
        strengthMsg = `Strength is up ${volumeChange.toFixed(0)}% — your progressive overload is working.`;
      } else if (volumeChange < -10) {
        strengthMsg = `Volume dropped ${Math.abs(volumeChange).toFixed(0)}%. Consider a deload week, then push harder.`;
      }
    }

    // Apply calorie adjustment
    if (newCal !== currentCal) {
      TARGETS.cal = newCal;
      // Scale macros proportionally
      const ratio = newCal / currentCal;
      TARGETS.carb = Math.round(TARGETS.carb * ratio);
      TARGETS.fat = Math.round(TARGETS.fat * ratio);
      // Protein stays the same or increases
      lsSet('fs_targets', TARGETS);
      if (USER && USER.nutrition) {
        USER.nutrition.calories = newCal;
        USER.nutrition.carbs = TARGETS.carb;
        USER.nutrition.fat = TARGETS.fat;
        lsSet('fs_user', USER);
      }
    }

    // Periodization insight
    let periodMsg = '';
    if (isDeloadWeek(CURRENT_WEEK)) {
      periodMsg = `Week ${CURRENT_WEEK} is your DELOAD week — volume is automatically reduced to 60%. Your body is recovering and will come back stronger.`;
    } else {
      const ph = getTrainingPhase(CURRENT_WEEK);
      periodMsg = `${ph.name} PHASE (Week ${CURRENT_WEEK}): ${ph.intensityLabel}`;
    }

    // Show insight card on dashboard
    const fullMsg = [periodMsg, adaptMsg, strengthMsg].filter(Boolean).join(' ');
    if (fullMsg) {
      lsSet('fs_adaptive_insight', fullMsg);
      lsSet('fs_adaptive_last', now);
    }
    _showAdaptiveInsight();

    // Weekly AI progress report (runs once per week)
    const lastReport = lsGet('fs_weekly_report_ts');
    if (!lastReport || (now - lastReport) > 6 * 24 * 60 * 60 * 1000) {
      _generateWeeklyProgressReport(weeklyChange, recentVolume, olderVolume);
    }
  } catch(e) {
    console.log('Adaptive check error:', e);
  }
}

// ── WEEKLY AI PROGRESS REPORT ──
async function _generateWeeklyProgressReport(weightChange, recentVol, olderVol) {
  if (!USER) return;
  try {
    const workoutDates = new Set(lsGet('fs_workout_dates') || []);
    const ph = getTrainingPhase(CURRENT_WEEK);
    const deload = isDeloadWeek(CURRENT_WEEK);
    const volChange = olderVol > 0 ? ((recentVol - olderVol) / olderVol * 100).toFixed(0) : 'N/A';
    const prompt = `Generate a concise weekly fitness progress report for ${USER.name || 'this user'}.

Data:
- Program: Week ${CURRENT_WEEK} of ${TOTAL_WEEKS}, ${deload ? 'DELOAD WEEK' : ph.name + ' PHASE'}
- Goal: ${USER.nutrition?.mode === 'lose' ? 'Weight loss' : 'Muscle gain'} (current: ${USER.weight}lbs, target: ${USER.goal}lbs)
- Weekly weight change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs
- Training volume change (recent vs 2wks prior): ${volChange !== 'N/A' ? volChange + '%' : 'insufficient data'}
- Workouts completed: ${workoutDates.size} total
- Daily calorie target: ${TARGETS.cal} cal / ${TARGETS.pro}g protein

Write 3-4 sentences covering: 1) progress assessment, 2) what to focus on this week, 3) one specific, actionable tip. Be direct and motivating. Reference their actual numbers. No fluff.`;

    const report = await callClaude([{ role: 'user', content: prompt }], { max_tokens: 300 });
    if (report) {
      lsSet('fs_weekly_report', report);
      lsSet('fs_weekly_report_ts', Date.now());
      // Update insight card with report
      lsSet('fs_adaptive_insight', report);
      _showAdaptiveInsight();
    }
  } catch(e) {
    console.log('Weekly report error:', e);
  }
}

function _showAdaptiveInsight() {
  const msg = lsGet('fs_adaptive_insight');
  if (!msg) return;
  let card = document.getElementById('ai-insight-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'ai-insight-card';
    card.style.cssText = 'background:linear-gradient(135deg,rgba(74,222,128,0.08),rgba(74,222,128,0.02));border:1px solid rgba(74,222,128,0.2);border-radius:14px;padding:16px;margin-bottom:16px;position:relative';
    const todayView = document.getElementById('view-today');
    if (todayView) todayView.insertBefore(card, todayView.firstChild);
  }
  const phMod2 = getPhaseExerciseModifier(CURRENT_WEEK);
  const phLabel2 = isDeloadWeek(CURRENT_WEEK) ? '⚡ DELOAD' : phMod2.label;
  card.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:1.1rem">🧠</span><span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;letter-spacing:1.5px;color:var(--green)">AI INSIGHT</span><span style="font-size:0.62rem;font-weight:700;letter-spacing:1.5px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);border-radius:4px;padding:2px 7px;color:var(--green)">${phLabel2} · WK ${CURRENT_WEEK}</span><button onclick="this.parentElement.parentElement.remove();lsSet('fs_adaptive_insight',null)" style="margin-left:auto;background:none;border:none;color:var(--dim);cursor:pointer;font-size:0.8rem">✕</button></div><p style="font-size:0.82rem;color:var(--off);line-height:1.5;margin:0">${msg}</p><div style="margin-top:10px;display:flex;gap:8px"><button onclick="_generateWeeklyProgressReport(0,0,0)" style="padding:5px 12px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);border-radius:6px;color:var(--green);font-size:0.72rem;font-weight:700;cursor:pointer;letter-spacing:0.5px">↻ REFRESH REPORT</button><button onclick="dashNav('coach');document.getElementById('coach-input').value='Give me my weekly progress report and what I should focus on this week';sendCoachMsg()" style="padding:5px 12px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);border-radius:6px;color:var(--blue);font-size:0.72rem;font-weight:700;cursor:pointer">ASK COACH →</button></div>`;
}

// ── INIT (called from index.html after all modules load) ──
function _bootApp() {
  try {
    setTier('beginner', document.querySelector('.tier-btn[data-tier="beginner"]'));
    initDayPicker();

    // Attach workout nav listeners reliably (more robust than onclick on iOS)
    const prev = document.getElementById('wo-prev-btn');
    const next = document.getElementById('wo-next-btn');
    if (prev) prev.addEventListener('click', function(e) { e.stopPropagation(); prevExercise(); });
    if (next) next.addEventListener('click', function(e) { e.stopPropagation(); nextExercise(); });

    // Auto-skip to dashboard if user already has a saved plan
    const savedPlan = lsGet('fs_plan');
    const savedUser = lsGet('fs_user');
    const hasNewFields = savedUser && savedUser.heightCm && savedUser.activity && savedUser.equipment;
    if (savedPlan && savedPlan.weekly_schedule && savedUser && hasNewFields) {
      generatedPlan = savedPlan;
      USER = savedUser;
      goToDash();
    } else {
      // Clear any stale/incomplete data and show onboarding
      localStorage.removeItem('fs_plan');
      localStorage.removeItem('fs_user');
      localStorage.removeItem('fs_entered');
    }
  } catch(e) {
    console.error('Boot error, clearing data:', e);
    localStorage.removeItem('fs_plan');
    localStorage.removeItem('fs_user');
    localStorage.removeItem('fs_entered');
    location.reload();
  }
}


// ── MOBILE BOTTOM NAV ──
function syncMobTab(view) {
  document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('mob-tab-' + view);
  if (tab) tab.classList.add('active');
  closeMobMore();
}

function toggleMobMore() {
  const drawer = document.getElementById('mob-more-drawer');
  drawer.classList.toggle('open');
}

function closeMobMore() {
  const drawer = document.getElementById('mob-more-drawer');
  if (drawer) drawer.classList.remove('open');
}

function mobNavTo(view) {
  // Find the matching sidebar button and use it
  const sidebarBtns = document.querySelectorAll('.sb-btn');
  let matchBtn = null;
  sidebarBtns.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'" + view + "'")) {
      matchBtn = btn;
    }
  });
  if (matchBtn) {
    dashNav(view, matchBtn);
  } else {
    // Fallback: just switch views directly
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById('view-' + view);
    if (viewEl) viewEl.classList.add('active');
    if (view === 'program') renderProgram();
    if (view === 'settings') renderSettingsGymDays();
  }
  closeMobMore();
}

// Close more drawer when tapping outside
document.addEventListener('click', function(e) {
  const drawer = document.getElementById('mob-more-drawer');
  const moreBtn = document.getElementById('mob-tab-more');
  if (drawer && drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== moreBtn && !moreBtn.contains(e.target)) {
    closeMobMore();
  }
});

// Session restore happens only when user explicitly clicks "Enter App"
// Auto-redirect removed to allow users to regenerate their plan

function renderMyPlan(plan) {
  const body = document.getElementById('myplan-body');
  if (!body || !plan) return;
  const n = USER.nutrition || {};
  const days = plan.weekly_schedule || [];
  const gymCount = days.filter(d => d.type === 'workout').length;
  const weekHtml = days.map((d, i) => {
    const isRest = d.type !== 'workout';
    const dayLabel = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];
    const exNames = (!isRest && d.exercises) ? d.exercises.slice(0,3).map(e=>e.name).join(', ') + (d.exercises.length>3?' +more':'') : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;font-family:'DM Mono',monospace;font-size:0.72rem;font-weight:600;color:var(--dim);flex-shrink:0">${dayLabel}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.9rem;font-weight:600;color:${isRest?'var(--dim)':'var(--white)'}">${isRest ? 'Rest Day' : (d.badge || d.workout || 'Training')}</div>
        ${exNames ? `<div style="font-size:0.73rem;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${exNames}</div>` : ''}
      </div>
      <div style="font-size:0.62rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 9px;border-radius:6px;white-space:nowrap;background:${isRest?'rgba(255,255,255,0.05)':'var(--green-dim)'};color:${isRest?'var(--dim)':'var(--green)'};border:1px solid ${isRest?'transparent':'rgba(74,222,128,0.2)'};">${isRest ? 'Rest' : 'Train'}</div>
    </div>`;
  }).join('');

  // Update banner
  const banner = document.getElementById('myplan-banner');
  if (banner) banner.innerHTML = `<div style="background:linear-gradient(135deg,var(--card),var(--dark));border:1px solid var(--border2);border-radius:16px;padding:20px 22px">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--white);margin-bottom:4px">${plan.name}</div>
    <div style="font-size:0.85rem;color:var(--off);margin-bottom:12px">${plan.tagline}</div>
    <span style="font-size:0.65rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:var(--tier-dim);color:var(--tier-color);padding:5px 12px;border-radius:6px">${USER.tier?USER.tier.charAt(0).toUpperCase()+USER.tier.slice(1):''}</span>
  </div>`;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Training Days</div>
        <div style="font-size:2rem;font-weight:700;color:var(--green)">${gymCount}<span style="font-size:0.85rem;font-weight:400;color:var(--dim);margin-left:2px">/ week</span></div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Program Length</div>
        <div style="font-size:2rem;font-weight:700;color:var(--white)">${USER.weeks||16}<span style="font-size:0.85rem;font-weight:400;color:var(--dim);margin-left:2px">wks</span></div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Daily Calories</div>
        <div style="font-size:2rem;font-weight:700;color:var(--white)">${(n.calories||0).toLocaleString()}<span style="font-size:0.85rem;font-weight:400;color:var(--dim);margin-left:2px">cal</span></div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Protein Target</div>
        <div style="font-size:2rem;font-weight:700;color:#60a5fa">${n.protein||0}<span style="font-size:0.85rem;font-weight:400;color:var(--dim);margin-left:2px">g/day</span></div>
      </div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 18px 4px;margin-bottom:14px">
      <div style="font-size:0.68rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">Weekly Schedule</div>
      ${weekHtml}
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:0.68rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">Daily Macros</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div style="text-align:center;padding:14px 8px;background:var(--dark);border-radius:12px">
          <div style="font-size:1.5rem;font-weight:700;color:var(--orange)">${n.carbs||0}g</div>
          <div style="font-size:0.65rem;color:var(--dim);margin-top:4px;font-weight:600;letter-spacing:1px">CARBS</div>
        </div>
        <div style="text-align:center;padding:14px 8px;background:var(--dark);border-radius:12px">
          <div style="font-size:1.5rem;font-weight:700;color:#60a5fa">${n.protein||0}g</div>
          <div style="font-size:0.65rem;color:var(--dim);margin-top:4px;font-weight:600;letter-spacing:1px">PROTEIN</div>
        </div>
        <div style="text-align:center;padding:14px 8px;background:var(--dark);border-radius:12px">
          <div style="font-size:1.5rem;font-weight:700;color:#f472b6">${n.fat||0}g</div>
          <div style="font-size:0.65rem;color:var(--dim);margin-top:4px;font-weight:600;letter-spacing:1px">FAT</div>
        </div>
      </div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:0.68rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Your Profile</div>
      ${[
        ['Name', USER.name],
        ['Goal', USER.goal],
        ['Current Weight', USER.weight ? USER.weight+' lbs' : null],
        ['Goal Weight', USER.goalWeight ? USER.goalWeight+' lbs' : null],
        ['Training Split', USER.split],
      ].filter(r=>r[1]).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--dim);font-size:0.82rem">${k}</span><span style="color:var(--white);font-size:0.82rem;font-weight:600">${v}</span></div>`).join('')}
    </div>
  `;
}
