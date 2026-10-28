// Lưu tiến độ và cache dịch vào localStorage.
const PROGRESS_KEY = "eq:progress";
const DICT_CACHE_KEY = "eq:dict-cache";
const PREFS_KEY = "eq:prefs";

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProgress() { return read(PROGRESS_KEY, {}); }

export function getPassageState(id, mode) {
  return getProgress()[id]?.[mode] ?? null;
}

export function savePassageState(id, mode, state) {
  const all = getProgress();
  all[id] = { ...(all[id] || {}), [mode]: state };
  write(PROGRESS_KEY, all);
}

export function clearPassageState(id, mode) {
  const all = getProgress();
  if (all[id]) { delete all[id][mode]; write(PROGRESS_KEY, all); }
}

export function clearProgress() { localStorage.removeItem(PROGRESS_KEY); }

export function getDictCache() { return read(DICT_CACHE_KEY, {}); }
export function setDictCache(word, vi) {
  const c = getDictCache();
  c[word] = vi;
  write(DICT_CACHE_KEY, c);
}

export function getPrefs() { return read(PREFS_KEY, { fontSize: 17 }); }
export function savePrefs(p) { write(PREFS_KEY, { ...getPrefs(), ...p }); }
