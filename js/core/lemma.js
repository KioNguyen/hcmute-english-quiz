// Chuẩn hoá từ về dạng gốc để tra từ điển. Dùng chung cho browser (dictionary.js) và Node (validate.mjs).

/** Làm sạch từ: bỏ dấu câu hai đầu, lowercase. */
export function cleanWord(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

/** Sinh danh sách ứng viên dạng gốc theo thứ tự ưu tiên (từ cụ thể → chung). */
export function candidates(word) {
  const w = cleanWord(word);
  if (!w) return [];
  const out = [w];
  const add = (s) => { if (s && s.length >= 2 && !out.includes(s)) out.push(s); };

  if (w.endsWith("'s")) add(w.slice(0, -2));
  if (w.endsWith("s'")) add(w.slice(0, -1));

  // Danh từ số nhiều / động từ ngôi 3
  if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ves")) { add(w.slice(0, -3) + "f"); add(w.slice(0, -3) + "fe"); }
  if (w.endsWith("es")) add(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) add(w.slice(0, -1));

  // Quá khứ / phân từ
  if (w.endsWith("ied")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ed")) {
    add(w.slice(0, -2));
    add(w.slice(0, -1)); // loved → love
    if (/([^aeiou])\1ed$/.test(w)) add(w.slice(0, -3)); // stopped → stop
  }

  // V-ing
  if (w.endsWith("ing")) {
    add(w.slice(0, -3));
    add(w.slice(0, -3) + "e"); // making → make
    if (/([^aeiou])\1ing$/.test(w)) add(w.slice(0, -4)); // running → run
  }

  // So sánh hơn / nhất
  if (w.endsWith("er")) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith("est")) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  if (w.endsWith("ier")) add(w.slice(0, -3) + "y");
  if (w.endsWith("iest")) add(w.slice(0, -4) + "y");

  // Trạng từ -ly
  if (w.endsWith("ly")) { add(w.slice(0, -2)); if (w.endsWith("ily")) add(w.slice(0, -3) + "y"); if (w.endsWith("ally")) add(w.slice(0, -4)); }

  // Từ ghép có gạch nối: thử phần cuối
  if (w.includes("-")) { add(w.replace(/-/g, "")); add(w.split("-").pop()); }

  return out;
}

/** Tra từ điển, trả về { key, ...entry } hoặc null. */
export function lookup(dict, word) {
  for (const c of candidates(word)) {
    const e = dict[c];
    if (e) return { key: c, ...e };
  }
  return null;
}
