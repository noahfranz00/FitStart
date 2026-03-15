// ═══════════════════════════════════════════════════════════════
// CLOUD-SYNC.JS — Auto backup + recovery + agent tool support
//
// Load order: AFTER storage.js, BEFORE app.js
//
// What it does:
//   1. Persistent device ID (localStorage + cookie fallback)
//   2. Debounced auto-push to KV on every fs_* write
//   3. Auto-recovery banner if localStorage is wiped
//   4. Patches callClaude() to send device ID (enables agent tools)
//   5. Handles _sync_pull flag (tools modified server data → pull fresh)
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  var SYNC_API = 'https://fitstart-api.noah-0c3.workers.dev/api/sync';
  var DEVICE_ID_KEY = 'fs_device_id';
  var COOKIE_NAME = 'bp_device_id';
  var SYNC_DEBOUNCE_MS = 5000;
  var SYNC_INTERVAL_MS = 300000;
  var FS_PREFIX = 'fs_';

  // ═══ DEVICE ID ═══
  function _uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function _getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function _setCookie(name, value) {
    var d = new Date(); d.setFullYear(d.getFullYear() + 10);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getDeviceId() {
    var id = localStorage.getItem(DEVICE_ID_KEY);
    if (id) { _setCookie(COOKIE_NAME, id); return id; }
    id = _getCookie(COOKIE_NAME);
    if (id) { localStorage.setItem(DEVICE_ID_KEY, id); return id; }
    id = _uuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
    _setCookie(COOKIE_NAME, id);
    return id;
  }

  // ═══ COLLECT FS KEYS ═══
  function _collectKeys() {
    var keys = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith(FS_PREFIX) && k !== DEVICE_ID_KEY) keys[k] = localStorage.getItem(k);
    }
    return keys;
  }

  // ═══ PUSH ═══
  var _pushTimer = null;
  var _pushing = false;

  function schedulePush() {
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(_doPush, SYNC_DEBOUNCE_MS);
  }

  async function _doPush() {
    if (_pushing) return;
    _pushing = true;
    var keys = _collectKeys();
    if (Object.keys(keys).length === 0) { _pushing = false; return; }
    try {
      var resp = await fetch(SYNC_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Device-ID': getDeviceId() },
        body: JSON.stringify({ keys: keys })
      });
      if (resp.ok) {
        var d = await resp.json();
        console.log('[CloudSync] Pushed ' + d.keyCount + ' keys');
        _updateUI('synced');
      } else {
        _updateUI('error');
      }
    } catch (e) {
      console.log('[CloudSync] Push skipped (offline)');
      _updateUI('offline');
    }
    _pushing = false;
  }

  async function forcePush() {
    if (_pushTimer) clearTimeout(_pushTimer);
    _updateUI('syncing');
    await _doPush();
  }

  // ═══ PULL ═══
  async function pullFromCloud() {
    _updateUI('syncing');
    try {
      var resp = await fetch(SYNC_API, {
        method: 'GET', headers: { 'X-Device-ID': getDeviceId() }
      });
      if (!resp.ok) { _updateUI('error'); return { ok: false }; }
      var data = await resp.json();
      if (!data.found || !data.keys) { _updateUI('synced'); return { ok: true, found: false, restored: 0 }; }
      var n = 0;
      for (var k in data.keys) {
        if (k.startsWith(FS_PREFIX) && data.keys[k] != null) {
          _origSet(k, data.keys[k]); n++;
        }
      }
      _origSet(DEVICE_ID_KEY, getDeviceId());
      _updateUI('synced');
      console.log('[CloudSync] Restored ' + n + ' keys');
      return { ok: true, found: true, restored: n, ts: data.ts };
    } catch (e) {
      _updateUI('offline');
      return { ok: false, error: e.message };
    }
  }

  // ═══ SILENT PULL — called when agent tools modified server data ═══
  // Only pulls plan/nutrition data — never overwrites coach history or local-only state
  var _SKIP_ON_SILENT_PULL = ['fs_coach_history', 'fs_proactive_msgs', 'fs_proactive_last', 'fs_wo_draft', 'fs_rest_timer', 'fs_device_id'];

  async function silentPull() {
    try {
      // Push current state first so we don't lose anything
      await _doPush();
      var resp = await fetch(SYNC_API, {
        method: 'GET', headers: { 'X-Device-ID': getDeviceId() }
      });
      if (!resp.ok) return;
      var data = await resp.json();
      if (!data.found || !data.keys) return;
      var updated = 0;
      for (var k in data.keys) {
        if (!k.startsWith(FS_PREFIX)) continue;
        if (_SKIP_ON_SILENT_PULL.indexOf(k) !== -1) continue;
        if (data.keys[k] != null) { _origSet(k, data.keys[k]); updated++; }
      }
      console.log('[CloudSync] Silent pull complete — updated ' + updated + ' keys (preserved coach history)');
      if (typeof loadFromStorage === 'function') loadFromStorage();
      if (typeof renderTodayWorkout === 'function') renderTodayWorkout();
      if (typeof refreshDashMacros === 'function') refreshDashMacros();
      if (typeof renderTimeline === 'function') renderTimeline();
    } catch (e) { console.log('[CloudSync] Silent pull failed:', e.message); }
  }

  // ═══ AUTO-RECOVERY ═══
  async function _checkRecovery() {
    if (localStorage.getItem('fs_plan')) { schedulePush(); return; }
    var did = getDeviceId();
    if (!did) return;
    try {
      var resp = await fetch(SYNC_API + '/keys', { method: 'GET', headers: { 'X-Device-ID': did } });
      if (!resp.ok) return;
      var data = await resp.json();
      if (!data.found || !data.keys || data.keys.length === 0) return;
      _showRecoveryBanner(data.keys.length, data.ts ? new Date(data.ts).toLocaleDateString() : 'unknown');
    } catch (e) {}
  }

  function _showRecoveryBanner(count, dateStr) {
    if (document.getElementById('cloud-recovery-banner')) return;
    var b = document.createElement('div');
    b.id = 'cloud-recovery-banner';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:0.85rem;display:flex;flex-direction:column;gap:12px;animation:fadeUp 0.3s ease;box-shadow:0 4px 24px rgba(0,0,0,0.3)';
    b.innerHTML =
      '<div><strong>Cloud backup found!</strong> Your data from ' + dateStr + ' (' + count + ' items) can be restored.</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button id="cloud-restore-btn" style="flex:1;padding:10px;background:#111;color:#F2F0EB;border:none;border-radius:8px;font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:1.5px;cursor:pointer">RESTORE MY DATA</button>' +
        '<button onclick="this.closest(\'#cloud-recovery-banner\').remove()" style="padding:10px 16px;background:rgba(0,0,0,0.2);color:#fff;border:none;border-radius:8px;cursor:pointer">Skip</button>' +
      '</div>';
    document.body.appendChild(b);
    document.getElementById('cloud-restore-btn').onclick = async function() {
      this.textContent = 'RESTORING...'; this.disabled = true;
      var r = await pullFromCloud();
      b.remove();
      if (r.ok && r.restored > 0) {
        if (typeof showToast === 'function') showToast('Restored ' + r.restored + ' items!', 'success');
        setTimeout(function() { location.reload(); }, 1500);
      } else {
        if (typeof showToast === 'function') showToast('Restore failed.', 'error');
      }
    };
  }

  // ═══ HOOK localStorage ═══
  var _origSet = localStorage.setItem.bind(localStorage);
  var _origRemove = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    _origSet(key, value);
    if (key && key.startsWith(FS_PREFIX)) schedulePush();
  };
  localStorage.removeItem = function(key) {
    _origRemove(key);
    if (key && key.startsWith(FS_PREFIX)) schedulePush();
  };

  // ═══ PATCH callClaude — add device ID + handle _sync_pull ═══
  // Runs after app.js loads callClaude, patches it to enable agent tools
  function _patchCallClaude() {
    if (typeof window.callClaude !== 'function' || window.callClaude._cloudPatched) return false;
    var origCallClaude = window.callClaude;
    window.callClaude = async function(messages, opts) {
      // Inject device ID into the fetch call by patching AI_PROXY headers
      var _origFetch = window.fetch;
      var deviceId = getDeviceId();

      window.fetch = function(url, options) {
        // Only patch calls to our API proxy
        if (typeof url === 'string' && url.includes('fitstart-api')) {
          options = options || {};
          options.headers = options.headers || {};
          if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
            options.headers['X-Device-ID'] = deviceId;
          }
          // Inject local date into POST body (avoids CORS header issues)
          if (options.method === 'POST' && options.body) {
            try {
              var _body = JSON.parse(options.body);
              var _now = new Date();
              var _days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
              _body._local_date = _days[_now.getDay()] + '|' + _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');
              options.body = JSON.stringify(_body);
            } catch(e) {}
          }
        }
        return _origFetch.call(window, url, options);
      };

      try {
        var result = await origCallClaude(messages, opts);
        return result;
      } finally {
        window.fetch = _origFetch;
      }
    };
    window.callClaude._cloudPatched = true;
    console.log('[CloudSync] Patched callClaude with device ID');
    return true;
  }

  // Also patch the raw response handler to detect _sync_pull
  function _patchResponseHandler() {
    var _origFetch = window.fetch;
    window.fetch = function(url, options) {
      var promise = _origFetch.call(window, url, options);
      // Intercept responses from our API
      if (typeof url === 'string' && url.includes('fitstart-api')) {
        return promise.then(function(response) {
          // Clone to read body without consuming it
          var clone = response.clone();
          clone.json().then(function(data) {
            if (data && data._sync_pull) {
              console.log('[CloudSync] Server modified data — pulling fresh');
              setTimeout(silentPull, 500);
            }
          }).catch(function() {});
          return response;
        });
      }
      return promise;
    };
  }

  // ═══ UI HELPER ═══
  function _updateUI(status) {
    var el = document.getElementById('cloud-sync-status');
    if (!el) return;
    var labels = { synced:'● Synced', syncing:'◌ Syncing...', error:'● Error', offline:'● Offline' };
    var colors = { synced:'#22c55e', syncing:'var(--gold)', error:'#ef4444', offline:'var(--dim)' };
    el.textContent = labels[status] || status;
    el.style.color = colors[status] || 'var(--dim)';
  }

  async function manualRestore() {
    if (!confirm('Replace local data with cloud backup?')) return;
    _updateUI('syncing');
    var r = await pullFromCloud();
    if (r.ok && r.restored > 0) {
      if (typeof showToast === 'function') showToast('Restored ' + r.restored + ' items. Reloading...', 'success');
      setTimeout(function() { location.reload(); }, 1500);
    } else {
      if (typeof showToast === 'function') showToast(r.found === false ? 'No cloud backup found.' : 'Restore failed.', 'warning');
    }
  }

  // ═══ INIT ═══
  getDeviceId();
  setTimeout(_checkRecovery, 2000);
  setInterval(function() { if (localStorage.getItem('fs_plan')) schedulePush(); }, SYNC_INTERVAL_MS);

  // Patch callClaude after app.js loads (retry a few times)
  var _patchAttempts = 0;
  var _patchInterval = setInterval(function() {
    if (_patchCallClaude() || ++_patchAttempts > 20) clearInterval(_patchInterval);
  }, 500);

  _patchResponseHandler();

  window.CloudSync = {
    getDeviceId: getDeviceId,
    forcePush: forcePush,
    pullFromCloud: pullFromCloud,
    silentPull: silentPull,
    manualRestore: manualRestore
  };
})();
