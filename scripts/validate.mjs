#!/usr/bin/env node
// Kiểm tra tính hợp lệ của data/reading/passages/*.json và độ phủ của data/dictionary.json.
// Dùng: node scripts/validate.mjs [--dict]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASSAGE_DIR = join(ROOT, "data", "reading", "passages");
const TYPES = new Set([
  "vocabulary", "detail", "reference", "negative", "inference",
  "purpose", "main-idea", "simplification", "insert", "opinion",
]);
const LETTERS = ["A", "B", "C", "D"];

// Bỏ markup **, __, ^^ để lấy text thuần (giữ [A]-[D])
export const stripMarkup = (s) => s.replace(/\*\*|__|\^\^/g, "").replace(/^## /, "");
const norm = (s) => s.replace(/\s+/g, " ").trim();

let errors = 0;
const err = (file, msg) => { errors++; console.error(`✗ ${file}: ${msg}`); };

const files = readdirSync(PASSAGE_DIR).filter((f) => f.endsWith(".json")).sort();
const allWords = new Set();
let totalQ = 0;

for (const f of files) {
  let p;
  try {
    p = JSON.parse(readFileSync(join(PASSAGE_DIR, f), "utf8"));
  } catch (e) {
    err(f, `JSON không hợp lệ: ${e.message}`);
    continue;
  }
  const expectedId = Number(f.replace(".json", ""));
  if (p.id !== expectedId) err(f, `id=${p.id} không khớp tên file`);
  if (!p.title) err(f, "thiếu title");
  if (!Array.isArray(p.paragraphs) || p.paragraphs.length === 0) err(f, "paragraphs rỗng");
  if (!Array.isArray(p.questions) || p.questions.length === 0) err(f, "questions rỗng");

  const plain = (p.paragraphs || []).map((s) => norm(stripMarkup(s)));
  for (const s of plain) for (const w of s.toLowerCase().match(/[a-z][a-z'-]*/g) || []) allWords.add(w.replace(/^'+|'+$/g, ""));

  const seen = new Set();
  for (const q of p.questions || []) {
    totalQ++;
    const tag = `${f} Q${q.n}`;
    if (seen.has(q.n)) err(tag, "trùng số câu");
    seen.add(q.n);
    if (!TYPES.has(q.type)) err(tag, `type lạ: ${q.type}`);
    if (!q.stem) err(tag, "thiếu stem");
    const keys = Object.keys(q.options || {});
    if (keys.length !== 4 || !LETTERS.every((l) => typeof q.options[l] === "string" && q.options[l]))
      err(tag, `options phải có đúng 4 key A-D (có: ${keys.join(",")})`);
    if (!LETTERS.includes(q.answer)) err(tag, `answer không hợp lệ: ${q.answer}`);
    if (!["handwritten", "handwritten-corrected", "inferred"].includes(q.answerSource))
      err(tag, `answerSource lạ: ${q.answerSource}`);
    if (typeof q.needsReview !== "boolean") err(tag, "needsReview phải là boolean");
    if (!q.explanation || q.explanation.length < 30) err(tag, "explanation quá ngắn/thiếu");
    if (!["ok", "incomplete"].includes(q.status)) err(tag, `status lạ: ${q.status}`);
    if (!Array.isArray(q.evidence)) err(tag, "evidence phải là mảng");
    for (const ev of q.evidence || []) {
      const para = plain[ev.paragraph - 1];
      if (!para) { err(tag, `evidence.paragraph=${ev.paragraph} không tồn tại`); continue; }
      if (!para.includes(norm(ev.text))) err(tag, `evidence không khớp đoạn ${ev.paragraph}: "${ev.text.slice(0, 60)}…"`);
    }
    if (q.target) {
      const para = plain[q.target.paragraph - 1];
      if (!para) err(tag, `target.paragraph=${q.target.paragraph} không tồn tại`);
      else if (!para.includes(norm(q.target.text))) err(tag, `target không khớp đoạn ${q.target.paragraph}: "${q.target.text}"`);
    }
    // Từ trong câu hỏi/đáp án cũng cần có trong từ điển
    for (const s of [q.stem, ...Object.values(q.options || {})])
      for (const w of (s || "").toLowerCase().match(/[a-z][a-z'-]*/g) || []) allWords.add(w.replace(/^'+|'+$/g, ""));
  }
  console.log(`✓ ${f}: ${p.paragraphs?.length ?? 0} đoạn, ${p.questions?.length ?? 0} câu`);
}

console.log(`\n${files.length} passage, ${totalQ} câu, ${allWords.size} từ duy nhất.`);

if (process.argv.includes("--dict")) {
  const dictPath = join(ROOT, "data", "dictionary.json");
  if (!existsSync(dictPath)) err("dictionary.json", "chưa tồn tại");
  else {
    const dict = JSON.parse(readFileSync(dictPath, "utf8"));
    const { lookup } = await import("../js/core/lemma.js");
    const missing = [...allWords].filter((w) => !lookup(dict, w)).sort();
    const coverage = ((allWords.size - missing.length) / allWords.size) * 100;
    console.log(`Từ điển: ${Object.keys(dict).length} mục, phủ ${coverage.toFixed(1)}% (${missing.length} từ thiếu)`);
    if (missing.length) console.log("Thiếu:", missing.join(" "));
    if (coverage < 98) err("dictionary.json", "độ phủ < 98%");
  }
}

if (errors) { console.error(`\n${errors} lỗi.`); process.exit(1); }
console.log("OK, không có lỗi.");
