// Tiến độ Reading: luyện tập / kiểm tra từng passage và thi thử.
import { read, write } from "../core/storage.js";

const PROGRESS_KEY = "eq:progress";
const EXAM_KEY = "eq:exam-current";
const EXAM_HISTORY_KEY = "eq:exam-history";

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

// ---- Thi thử ----
export const getExam = () => read(EXAM_KEY, null);
export const saveExam = (exam) => write(EXAM_KEY, exam);
export const clearExam = () => localStorage.removeItem(EXAM_KEY);

export const getExamHistory = () => read(EXAM_HISTORY_KEY, []);
export function addExamHistory(entry) {
  write(EXAM_HISTORY_KEY, [entry, ...getExamHistory()].slice(0, 20));
}
