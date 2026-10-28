// Render bài đọc và câu hỏi từ JSON sang HTML.

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Chuyển markup trong đoạn văn (**, __, ^^, [A]) thành HTML. */
export function inlineMarkup(text) {
  return escapeHtml(text)
    .replace(/\^\^(.+?)\^\^/g, '<span class="hl-sentence">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<b class="kw">$1</b>')
    .replace(/__(.+?)__/g, '<b class="kw kw-u">$1</b>')
    .replace(/\[([A-D])\]/g, '<span class="insert-marker" data-marker="$1" title="Vị trí chèn câu [$1]">$1</span>');
}

export function renderPassage(p) {
  let n = 0;
  return p.paragraphs.map((para, i) => {
    if (para.startsWith("## ")) return `<h3 class="sub">${escapeHtml(para.slice(3))}</h3>`;
    n++;
    return `<p class="para translatable" data-para="${i + 1}" data-num="${n}">${inlineMarkup(para)}</p>`;
  }).join("");
}

const TYPE_LABEL = {
  vocabulary: "Từ vựng", detail: "Chi tiết", reference: "Tham chiếu", negative: "NOT / EXCEPT",
  inference: "Suy luận", purpose: "Mục đích tác giả", "main-idea": "Ý chính",
  simplification: "Rút gọn câu", insert: "Chèn câu", opinion: "Quan điểm",
};

export function renderQuestion(q) {
  const opts = ["A", "B", "C", "D"].map((L) => `
    <label class="opt" data-letter="${L}">
      <input type="radio" name="q${q.n}" value="${L}">
      <span class="letter">${L}</span>
      <span class="opt-text translatable">${escapeHtml(q.options[L])}</span>
    </label>`).join("");
  const flags = [
    q.needsReview ? '<span class="flag flag-review" title="Đáp án khoanh tay chưa chắc chắn">cần kiểm tra</span>' : "",
    q.status === "incomplete" ? '<span class="flag flag-incomplete" title="Đề thiếu dữ liệu, không tính điểm">thiếu dữ liệu</span>' : "",
  ].join("");
  return `
  <article class="question" id="q${q.n}" data-n="${q.n}" data-status="${q.status}">
    <header class="q-head">
      <span class="q-num">Câu ${q.n}</span>
      <span class="q-type">${TYPE_LABEL[q.type] || q.type}</span>
      ${flags}
    </header>
    <p class="stem translatable">${escapeHtml(q.stem)}</p>
    <div class="opts">${opts}</div>
    <div class="feedback" hidden>
      <div class="verdict"></div>
      <div class="explanation translatable">${escapeHtml(q.explanation)}</div>
      ${q.evidence?.length ? '<button type="button" class="btn-link show-evidence">Xem minh chứng trong bài ↗</button>' : ""}
    </div>
  </article>`;
}
