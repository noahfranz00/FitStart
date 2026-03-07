(function () {
  'use strict';

  var USER_KEY = 'fs_user';
  var memoryCache = { user: null };

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(raw, fallback) {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[StorageAPI] Failed to parse fs_user:', err);
      return fallback;
    }
  }

  function normalizeUser(user) {
    if (!isObject(user)) return {};
    return clone(user);
  }

  function emitUserChanged(user) {
    window.dispatchEvent(new CustomEvent('fs:user-changed', {
      detail: { user: clone(user) }
    }));
  }

  function getUser() {
    if (memoryCache.user && isObject(memoryCache.user)) {
      return clone(memoryCache.user);
    }
    var parsed = safeParse(localStorage.getItem(USER_KEY), {});
    var normalized = normalizeUser(parsed);
    memoryCache.user = clone(normalized);
    return clone(normalized);
  }

  function setUser(user) {
    var normalized = normalizeUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    memoryCache.user = clone(normalized);
    emitUserChanged(normalized);
    return clone(normalized);
  }

  function patchUser(patch) {
    var current = getUser();
    var next = Object.assign({}, current, isObject(patch) ? patch : {});
    return setUser(next);
  }

  function clearUser() {
    localStorage.removeItem(USER_KEY);
    memoryCache.user = {};
    emitUserChanged({});
  }

  function hasUser() {
    return Object.keys(getUser()).length > 0;
  }

  function reloadUser() {
    memoryCache.user = null;
    return getUser();
  }

  window.StorageAPI = {
    getUser: getUser,
    setUser: setUser,
    patchUser: patchUser,
    clearUser: clearUser,
    hasUser: hasUser,
    reloadUser: reloadUser
  };
})();
