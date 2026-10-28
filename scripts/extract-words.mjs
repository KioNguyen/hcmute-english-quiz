#!/usr/bin/env node
// Liệt kê các từ duy nhất trong passages + câu hỏi CHƯA có trong data/dictionary.json (sau khi chuẩn hoá lemma).
// Dùng: node scripts/extract-words.mjs [--all] [--json]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lookup, cleanWord } from "../js/core/lemma.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(ROOT, "data", "reading", "passages");
const dictPath = join(ROOT, "data", "dictionary.json");
const dict = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, "utf8")) : {};
const strip = (s) => s.replace(/\*\*|__|\^\^/g, "").replace(/\[[A-D]\]/g, "");

const counts = new Map();
const addText = (s) => {
  for (const raw of (s || "").match(/[A-Za-z][A-Za-z'’-]*/g) || []) {
    const w = cleanWord(raw);
    if (w) counts.set(w, (counts.get(w) || 0) + 1);
  }
};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const p = JSON.parse(readFileSync(join(dir, f), "utf8"));
  p.paragraphs.forEach((s) => addText(strip(s)));
  for (const q of p.questions) { addText(q.stem); Object.values(q.options).forEach(addText); }
}

const all = process.argv.includes("--all");
const words = [...counts.keys()].filter((w) => all || !lookup(dict, w)).sort();
if (process.argv.includes("--json")) console.log(JSON.stringify(words));
else { console.log(words.join("\n")); console.error(`\n${words.length} từ${all ? "" : " thiếu"} / ${counts.size} từ duy nhất`); }
