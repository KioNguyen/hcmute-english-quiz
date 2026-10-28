// Tiến độ Writing: bài đang viết / đã nộp theo đề và lịch sử bài nộp.
import { read, write } from "../core/storage.js";

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
