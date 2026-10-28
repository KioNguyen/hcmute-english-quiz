// Trang danh sách đề viết + lịch sử bài đã nộp.
import { loadWriting } from "./data.js";
import { escapeHtml, fmtDate } from "../core/ui.js";
import { fmtDuration as fmt, wordsOf, checklistItems } from "./text.js";
import { getWriting, getWritingHistory } from "./storage.js";

let data;

function renderList(list) {
  const saved = getWriting();
  const groups = Object.entries(data.types).map(([key, t]) => {
    const tasks = data.tasks.filter((x) => x.type === key);
    if (!tasks.length) return "";
    return `
    <section class="w-group">
      <h2>${escapeHtml(t.label)} <span class="muted">· ${escapeHtml(t.en)} · ≥${t.minWords} từ · ${t.minutes} phút</span></h2>
      <div class="cards">${tasks.map((x) => taskCard(x, saved[x.id])).join("")}</div>
    </section>`;
  }).join("");
  const history = getWritingHistory();
  list.innerHTML = `
    <section class="howto">
      <strong>Cách luyện:</strong> chọn đề → tự lập dàn ý → viết trong thời gian quy định (đồng hồ chạy khi bạn bắt đầu gõ) → nộp bài →
      tự chấm theo checklist và so sánh với bài mẫu. Nên ghi lại lỗi hay mắc để tránh ở bài sau.
      Trong đề và bài mẫu, <strong>nhấp đôi</strong> vào từ để xem nghĩa.
    </section>
    ${groups}
    ${history.length ? `
    <section class="intro-card w-history">
      <h3>Bài đã nộp</h3>
      <table class="history">
        <thead><tr><th>Thời điểm</th><th>Đề</th><th>Số từ</th><th>Thời gian</th><th>Tự chấm</th></tr></thead>
        <tbody>${history.map((h) => `
          <tr><td>${fmtDate(h.submittedAt)}</td><td><a href="task.html?id=${h.id}">W${h.id}</a> ${escapeHtml(h.title)}</td>
          <td>${h.words}</td><td>${fmt(h.timeMs)}</td><td>${h.checked != null ? `${h.checked}/${h.total}` : "—"}</td></tr>
          <tr class="h-text"><td colspan="5"><details><summary>Xem bài viết</summary><div class="w-essay">${escapeHtml(h.text)}</div></details></td></tr>`).join("")}
        </tbody>
      </table>
    </section>` : ""}`;
}

function taskCard(x, s) {
  const t = data.types[x.type];
  let status = "Chưa viết";
  if (s?.submittedAt) status = `Đã nộp · ${wordsOf(s.text).length} từ · tự chấm ${s.checks?.length ?? 0}/${checklistItems(t).length}`;
  else if (s?.text?.trim()) status = `Đang viết dở · ${wordsOf(s.text).length} từ`;
  return `
  <article class="card">
    <div class="card-head"><span class="pid">W${x.id}</span><h2>${escapeHtml(x.title)}</h2></div>
    <p class="topic">${escapeHtml(x.topic)}</p>
    <p class="meta">${escapeHtml(t.label)} · ≥${t.minWords} từ · ${t.minutes} phút${x.relatedPassage ? ` · liên quan <a href="../reading/passage.html?id=${x.relatedPassage}&mode=practice">Passage ${x.relatedPassage}</a>` : ""}</p>
    <p class="progress">${status}</p>
    <div class="card-actions"><a class="btn btn-primary" href="task.html?id=${x.id}">${s?.submittedAt ? "Xem lại" : s?.text ? "Viết tiếp" : "Viết bài"}</a></div>
  </article>`;
}

async function main() {
  const list = document.querySelector("#list");
  try {
    data = await loadWriting();
  } catch (e) {
    list.innerHTML = `<p class="error">Không tải được dữ liệu. Hãy chạy web qua HTTP (vd. <code>python3 -m http.server 8080</code>).<br><small>${escapeHtml(e.message)}</small></p>`;
    return;
  }
  document.querySelector("#summary").textContent = `${data.tasks.length} đề · ${Object.keys(data.types).length} dạng bài`;
  renderList(list);
}

main();
