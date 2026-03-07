(function () {
  'use strict';

  var USER_KEY = 'fs_user';
  var memoryCache = {
    user: null
  };

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(json, fallback) {
    if (typeof json !== 'string' || !json.trim()) return fallback;
    try {
      return JSON.parse(json);
    } catch (err) {
      console.warn('[StorageAPI] Failed to parse JSON:', err);
      return fallback;
    }
  }

  function normalizeUser(user) {
    if (!isObject(user)) return {};
    return deepClone(user);
  }

  function readLocalUser() {
    var raw = localStorage.getItem(USER_KEY);
    var parsed = safeParse(raw, {});
    return normalizeUser(parsed);
  }

  function writeLocalUser(user) {
    var normalized = normalizeUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function emitUserChanged(user) {
    window.dispatchEvent(new CustomEvent('fs:user-changed', {
      detail: {
        user: deepClone(user)
      }
    }));
  }

  function getUser() {
    if (memoryCache.user && isObject(memoryCache.user)) {
      return deepClone(memoryCache.user);
    }

    var user = readLocalUser();
    memoryCache.user = deepClone(user);
    return deepClone(user);
  }

  function setUser(user) {
    var normalized = writeLocalUser(user);
    memoryCache.user = deepClone(normalized);
    emitUserChanged(normalized);
    return deepClone(normalized);
  }

  function patchUser(patch) {
    var currentUser = getUser();
    var safePatch = isObject(patch) ? patch : {};
    var nextUser = Object.assign({}, currentUser, safePatch);
    return setUser(nextUser);
  }

  function clearUser() {
    localStorage.removeItem(USER_KEY);
    memoryCache.user = {};
    emitUserChanged({});
  }

  function hasUser() {
    var user = getUser();
    return Object.keys(user).length > 0;
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
