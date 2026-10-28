// Trang danh sách passage + tiến độ.
import { loadIndex } from "./data.js";
import { getProgress, clearProgress } from "./storage.js";
import { escapeHtml } from "./render.js";

function card(p, prog) {
  const pr = prog?.practice, te = prog?.test;
  const practiceDone = pr ? Object.keys(pr.answers || {}).length : 0;
  const practiceLine = practiceDone ? `Luyện tập: ${practiceDone}/${p.questionCount} câu` : "Luyện tập: chưa làm";
  const testLine = te?.submitted ? `Kiểm tra: ${te.score}/${te.total} (${Math.round((te.score / te.total) * 100)}%)` : te ? "Kiểm tra: đang làm dở" : "Kiểm tra: chưa làm";
  return `
  <article class="card">
    <div class="card-head"><span class="pid">P${p.id}</span><h2>${escapeHtml(p.title)}</h2></div>
    <p class="topic">${escapeHtml(p.topic || "")}</p>
    <p class="meta">${p.questionCount} câu${p.notes?.length ? ` · <span title="${escapeHtml(p.notes.join("\n"))}">⚠︎ ${p.notes.length} ghi chú</span>` : ""}</p>
    <p class="progress">${practiceLine}<br>${testLine}</p>
    <div class="card-actions">
      <a class="btn btn-primary" href="passage.html?id=${p.id}&mode=practice">Luyện tập</a>
      <a class="btn" href="passage.html?id=${p.id}&mode=test">Kiểm tra</a>
    </div>
  </article>`;
}

async function main() {
  const list = document.querySelector("#list");
  try {
    const index = await loadIndex();
    const progress = getProgress();
    list.innerHTML = index.passages.map((p) => card(p, progress[p.id])).join("");
    document.querySelector("#summary").textContent = `${index.passages.length} passage · ${index.passages.reduce((s, p) => s + p.questionCount, 0)} câu hỏi`;
  } catch (e) {
    list.innerHTML = `<p class="error">Không tải được dữ liệu. Hãy chạy web qua HTTP (vd. <code>python3 -m http.server 8080</code>).<br><small>${escapeHtml(e.message)}</small></p>`;
  }
  document.querySelector("#clear-btn").onclick = () => {
    if (confirm("Xoá toàn bộ tiến độ đã lưu?")) { clearProgress(); location.reload(); }
  };
}
main();
