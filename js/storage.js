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

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem("eq:exam-current");
  localStorage.removeItem("eq:exam-history");
  localStorage.removeItem("eq:writing");
  localStorage.removeItem("eq:writing-history");
}

export function getDictCache() { return read(DICT_CACHE_KEY, {}); }
export function setDictCache(word, vi) {
  const c = getDictCache();
  c[word] = vi;
  write(DICT_CACHE_KEY, c);
}

export function getPrefs() { return read(PREFS_KEY, { fontSize: 17 }); }
export function savePrefs(p) { write(PREFS_KEY, { ...getPrefs(), ...p }); }

// ---- Thi thử ----
const EXAM_KEY = "eq:exam-current";
const EXAM_HISTORY_KEY = "eq:exam-history";

export const getExam = () => read(EXAM_KEY, null);
export const saveExam = (exam) => write(EXAM_KEY, exam);
export const clearExam = () => localStorage.removeItem(EXAM_KEY);

export const getExamHistory = () => read(EXAM_HISTORY_KEY, []);
export function addExamHistory(entry) {
  write(EXAM_HISTORY_KEY, [entry, ...getExamHistory()].slice(0, 20));
}

// ---- Luyện viết ----
const WRITING_KEY = "eq:writing";
const WRITING_HISTORY_KEY = "eq:writing-history";

export const getWriting = () => read(WRITING_KEY, {});
export const getWritingState = (id) => getWriting()[id] ?? null;
export function saveWritingState(id, state) {
  const all = getWriting();
  all[id] = state;
  write(WRITING_KEY, all);
}
export function clearWritingState(id) {
  const all = getWriting();
  delete all[id];
  write(WRITING_KEY, all);
}

export const getWritingHistory = () => read(WRITING_HISTORY_KEY, []);
export function addWritingHistory(entry) {
  write(WRITING_HISTORY_KEY, [entry, ...getWritingHistory()].slice(0, 50));
}
export function updateWritingHistory(id, submittedAt, patch) {
  write(WRITING_HISTORY_KEY, getWritingHistory().map((h) => (h.id === id && h.submittedAt === submittedAt ? { ...h, ...patch } : h)));
}
