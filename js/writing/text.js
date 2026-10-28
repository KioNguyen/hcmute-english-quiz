// Đếm từ, định dạng thời gian và phân tích máy móc bài viết (số từ, từ nối, viết tắt, lặp từ).

export function fmtDuration(ms) {
  const s = Math.round(Math.abs(ms) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export const wordsOf = (text) => text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
export const paragraphsOf = (text) => text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
export const checklistItems = (t) => t.checklist.flatMap((g) => g.items);

const LINKERS = [
  "first", "firstly", "first of all", "to begin with", "second", "secondly", "third", "thirdly", "finally", "lastly",
  "moreover", "furthermore", "in addition", "additionally", "besides", "also",
  "however", "nevertheless", "although", "even though", "while", "whereas", "in contrast", "on the other hand", "admittedly",
  "because", "since", "therefore", "thus", "as a result", "consequently", "so that",
  "for example", "for instance", "such as", "in other words", "in fact", "in particular", "similarly",
  "in conclusion", "to sum up", "overall", "in my opinion", "in my view", "alternatively", "unfortunately",
];
const STOP = new Set(("the a an and or but if of to in on at for with by from as is are was were be been being it its this that these those they them their there " +
  "he she his her we our you your i my me not no do does did have has had will would can could should may might must about into than then so very " +
  "also more most some many much such which who whom what when where why how all any each other only just even because while although").split(" "));
const CONTRACTION = /\b(?:\w+n['’]t|(?:i|you|we|they|he|she|it|that|there|what|let)['’](?:m|re|ve|ll|d|s))\b/gi;

export function analyze(text) {
  const words = wordsOf(text);
  const lower = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => wordsOf(s).length);
  const linkers = LINKERS.filter((l) => new RegExp(`[^a-z]${l.replace(/ /g, "\\s")}[^a-z]`).test(lower));
  const contractions = [...new Set((text.match(CONTRACTION) || []).map((c) => c.toLowerCase()))];
  const counts = {};
  for (const w of words) {
    const k = w.toLowerCase();
    if (k.length >= 4 && !STOP.has(k)) counts[k] = (counts[k] || 0) + 1;
  }
  const repeated = Object.entries(counts).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const longSentences = sentences.filter((s) => wordsOf(s).length > 40).length;
  return {
    words: words.length, paragraphs: paragraphsOf(text).length, sentences: sentences.length,
    avg: sentences.length ? words.length / sentences.length : 0,
    linkers, contractions, repeated, longSentences, lowercaseI: /(^|[^A-Za-z])i(?![A-Za-z.])/.test(text),
  };
}
