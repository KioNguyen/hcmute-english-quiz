// localStorage dùng chung: helper đọc/ghi, tuỳ chọn hiển thị, cache dịch, xoá tiến độ.
// Mỗi kỹ năng (reading, writing…) có storage.js riêng, khoá đều bắt đầu bằng "eq:".
const PREFIX = "eq:";
const DICT_CACHE_KEY = "eq:dict-cache";
const PREFS_KEY = "eq:prefs";
/** Khoá không phải tiến độ học — giữ lại khi xoá tiến độ. */
const KEEP_ON_CLEAR = new Set([DICT_CACHE_KEY, PREFS_KEY]);

export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Xoá tiến độ của mọi kỹ năng. */
export function clearAllProgress() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX) && !KEEP_ON_CLEAR.has(k)) localStorage.removeItem(k);
}

export function getDictCache() { return read(DICT_CACHE_KEY, {}); }
export function setDictCache(word, vi) {
  const c = getDictCache();
  c[word] = vi;
  write(DICT_CACHE_KEY, c);
}

export function getPrefs() { return read(PREFS_KEY, { fontSize: 17 }); }
export function savePrefs(p) { write(PREFS_KEY, { ...getPrefs(), ...p }); }
