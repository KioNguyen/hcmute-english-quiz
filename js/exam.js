// Logic thi thử: chọn ngẫu nhiên passage, xáo câu hỏi + đáp án, đổi chữ cái trong giải thích.
const LETTERS = ["A", "B", "C", "D"];

export const EXAM_PASSAGES = 4;
export const EXAM_MINUTES = 60;

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Câu chèn câu ([A]-[D] gắn với vị trí trong bài) thì không được xáo đáp án. */
const keepOptionOrder = (q) => q.type === "insert" || Object.values(q.options).some((v) => /^\[[A-D]\]$/.test(v));

/** Tạo cấu trúc đề: chỉ lưu thứ tự, không lưu nội dung (để localStorage gọn). */
export function createExam(index) {
  const picked = shuffle(index.passages).slice(0, EXAM_PASSAGES);
  return {
    version: 1,
    createdAt: Date.now(),
    durationMs: EXAM_MINUTES * 60 * 1000,
    startedAt: null,
    submittedAt: null,
    // order: [{ id, questions: [{ n, opts: ["C","A","D","B"] }] }] — opts[i] = chữ cái gốc hiển thị ở vị trí LETTERS[i]
    order: picked.map((p) => ({ id: p.id, questions: null })),
    answers: {}, // key `${id}-${n}` → chữ cái GỐC người dùng chọn
  };
}

/** Điền thứ tự câu/đáp án khi đã tải passage (gọi một lần cho mỗi passage). */
export function fillOrder(entry, passage) {
  if (entry.questions) return false;
  entry.questions = shuffle(passage.questions).map((q) => ({
    n: q.n,
    opts: keepOptionOrder(q) ? [...LETTERS] : shuffle(LETTERS),
  }));
  return true;
}

/** Đổi chữ cái A-D trong giải thích theo bảng map (gốc → hiển thị); bỏ qua phần trích dẫn "..." và ô [A]. */
export function remapLetters(text, map) {
  return text.split(/("[^"]*")/).map((seg, i) =>
    i % 2 ? seg : seg.replace(/(?<![\p{L}\p{N}\[])[A-D](?![\p{L}\p{N}\]])/gu, (m) => map[m] ?? m)
  ).join("");
}

/** Bỏ các ghi chú về dấu khoanh trên giấy (không còn đúng sau khi xáo đáp án). */
export function stripHandwritingNotes(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !/^Trong ảnh có hai dấu khoanh/.test(s))
    .join(" ")
    .replace(/\s*\([^()]*khoanh[^()]*\)/g, "");
}

/** Tạo câu hỏi hiển thị (đã xáo) từ câu gốc + thứ tự. */
export function viewQuestion(q, ord, displayN) {
  const toDisplay = {}; // gốc → hiển thị
  ord.opts.forEach((orig, i) => { toDisplay[orig] = LETTERS[i]; });
  const options = {};
  LETTERS.forEach((L, i) => { options[L] = q.options[ord.opts[i]]; });
  return {
    ...q,
    origN: q.n,
    n: displayN,
    options,
    answer: toDisplay[q.answer],
    explanation: remapLetters(stripHandwritingNotes(q.explanation), toDisplay),
    toDisplay,
    toOrig: Object.fromEntries(LETTERS.map((L, i) => [L, ord.opts[i]])),
  };
}

export const answerKey = (id, n) => `${id}-${n}`;
