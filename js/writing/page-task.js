// Trang làm bài viết: bấm giờ + đếm từ, nộp bài rồi tự chấm theo checklist và so với bài mẫu.
import { loadWriting } from "./data.js";
import { initTooltip } from "../core/tooltip.js";
import { escapeHtml, fmtDate, bindFontSize } from "../core/ui.js";
import { fmtDuration as fmt, wordsOf, checklistItems, analyze } from "./text.js";
import { getWritingState, saveWritingState, clearWritingState, addWritingHistory, updateWritingHistory } from "./storage.js";

const $ = (s, r = document) => r.querySelector(s);
const taskId = Number(new URLSearchParams(location.search).get("id"));

let data, task, type, state, timerHandle, tickFrom;

function analysisHtml(a) {
  const tips = [];
  if (a.words < type.minWords) tips.push(["bad", `Mới ${a.words} từ, chưa đủ ${type.minWords} từ tối thiểu.`]);
  else tips.push(["ok", `Đủ số từ (${a.words}/${type.minWords}).`]);
  if (task.type === "essay" && a.paragraphs < 4) tips.push(["bad", `Chỉ có ${a.paragraphs} đoạn — bài luận nên có ít nhất 4 đoạn (mở bài, 2–3 thân bài, kết bài). Nhấn Enter để xuống đoạn.`]);
  if (a.linkers.length < 4) tips.push(["bad", `Chỉ dùng ${a.linkers.length} loại từ nối — nên dùng đa dạng hơn (xem mục Cụm từ hữu ích).`]);
  else tips.push(["ok", `Dùng ${a.linkers.length} loại từ nối: ${a.linkers.join(", ")}.`]);
  if (a.contractions.length && task.type !== "discussion") tips.push(["bad", `Có dạng viết tắt (${a.contractions.join(", ")}) — văn trang trọng nên viết đầy đủ (do not, cannot, it is…).`]);
  if (a.lowercaseI) tips.push(["bad", "Có chữ \"i\" viết thường — đại từ I luôn viết hoa."]);
  if (a.longSentences) tips.push(["warn", `${a.longSentences} câu dài hơn 40 từ — câu quá dài dễ sai ngữ pháp, cân nhắc tách câu.`]);
  if (a.sentences && a.avg < 9) tips.push(["warn", `Câu trung bình chỉ ${a.avg.toFixed(1)} từ — thử nối câu bằng because, although, which… để có câu phức.`]);
  if (a.repeated.length) tips.push(["warn", `Từ lặp nhiều: ${a.repeated.map(([w, n]) => `${w} (${n})`).join(", ")} — cân nhắc dùng từ đồng nghĩa hoặc đại từ.`]);
  return `
    <div class="w-metrics">
      <div><b>${a.words}</b><span>từ</span></div>
      <div><b>${a.paragraphs}</b><span>đoạn</span></div>
      <div><b>${a.sentences}</b><span>câu</span></div>
      <div><b>${a.avg.toFixed(1)}</b><span>từ/câu</span></div>
    </div>
    <ul class="w-tips">${tips.map(([c, t]) => `<li class="${c}">${escapeHtml(t)}</li>`).join("")}</ul>
    <p class="muted small">Đây chỉ là kiểm tra máy móc (số từ, từ nối, viết tắt, lặp từ) — không phát hiện được lỗi ngữ pháp. Hãy tự chấm theo checklist bên dưới và so với bài mẫu.</p>`;
}

// ---------- Làm bài ----------
const submitted = () => state.submittedAt != null;
const limitMs = () => type.minutes * 60 * 1000;
const elapsed = () => state.elapsedMs + (tickFrom ? Date.now() - tickFrom : 0);
function persist() { saveWritingState(task.id, state); }

function renderTask() {
  $("#task-view").hidden = false;
  $("#title").textContent = `W${task.id} · ${task.title}`;
  document.title = `Luyện viết · ${task.title}`;
  const badge = $("#type-badge");
  badge.hidden = false;
  badge.textContent = type.label;
  state = getWritingState(task.id) || { text: "", elapsedMs: 0, startedAt: null, submittedAt: null, checks: [] };
  renderLeft();
  renderRight();
}

function promptHtml() {
  const d = task.discussion;
  return `
    <div class="w-prompt translatable">${escapeHtml(task.prompt)}</div>
    ${d ? `
    <div class="post post-prof translatable"><div class="post-name">${escapeHtml(d.professor.name)}</div>${escapeHtml(d.professor.text)}</div>
    ${d.students.map((s) => `<div class="post translatable"><div class="post-name">${escapeHtml(s.name)}</div>${escapeHtml(s.text)}</div>`).join("")}` : ""}`;
}

function helpHtml() {
  return `
    <h3>Dàn ý gợi ý</h3>
    <ol class="w-outline">${task.outline.map((o) => `<li><strong>${escapeHtml(o.part)}:</strong> ${escapeHtml(o.vi)}</li>`).join("")}</ol>
    <h3>Từ vựng theo chủ đề</h3>
    <table class="w-phrases"><tbody>${task.vocab.map((p) => `<tr><td class="translatable">${escapeHtml(p.en)}</td><td>${escapeHtml(p.vi)}</td></tr>`).join("")}</tbody></table>
    <h3>Cụm từ hữu ích (${escapeHtml(type.label.toLowerCase())})</h3>
    <table class="w-phrases"><tbody>${type.phrases.map((p) => `<tr><td class="translatable">${escapeHtml(p.en)}</td><td>${escapeHtml(p.vi)}</td></tr>`).join("")}</tbody></table>`;
}

function renderLeft() {
  const left = $("#task-left");
  left.innerHTML = `
    <h2 class="passage-title">Đề bài</h2>
    ${promptHtml()}
    <p class="howto small"><strong>Cách làm:</strong> ${escapeHtml(type.howto)}</p>
    ${submitted() ? `
      <section class="w-section">${helpHtml()}</section>
      <section class="w-section">
        <h3>Bài mẫu</h3>
        <div class="w-sample translatable">${task.sample.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div>
        <p class="muted small">${wordsOf(task.sample.join(" ")).length} từ</p>
        <h3>Vì sao bài mẫu tốt?</h3>
        <ul class="w-notes">${task.sampleNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </section>`
    : `<details class="w-help"><summary>Xem gợi ý: dàn ý, từ vựng, cụm từ <span class="muted">(nên tự nghĩ trước)</span></summary>${helpHtml()}</details>`}`;
  left.parentElement.scrollTop = 0;
}

function renderRight() {
  const right = $("#task-right");
  if (!submitted()) {
    right.innerHTML = `
      <div class="w-bar">
        <span id="wc" class="wc"></span>
        <span class="muted small" id="save-status"></span>
      </div>
      <textarea id="editor" class="w-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="sentences"
        placeholder="Bắt đầu viết ở đây… Đồng hồ ${type.minutes} phút sẽ chạy khi bạn gõ chữ đầu tiên. Nhấn Enter để xuống đoạn."></textarea>
      <p class="muted small">Đã tắt kiểm tra chính tả của trình duyệt để giống điều kiện thi thật. Bài được tự động lưu trên máy này.</p>
      <div class="actions">
        <button type="button" id="submit-btn" class="btn btn-primary">Nộp bài</button>
        <button type="button" id="reset-btn" class="btn btn-ghost">Xoá bài, viết lại từ đầu</button>
      </div>`;
    const ed = $("#editor");
    ed.value = state.text;
    ed.addEventListener("input", () => {
      state.text = ed.value;
      if (!state.startedAt && ed.value.trim()) { state.startedAt = Date.now(); startTimer(); }
      updateCount();
      persist();
      $("#save-status").textContent = "Đã lưu nháp";
    });
    $("#submit-btn").onclick = submit;
    $("#reset-btn").onclick = () => {
      if (!confirm("Xoá toàn bộ bài đang viết và đặt lại đồng hồ?")) return;
      stopTimer();
      clearWritingState(task.id);
      renderTask();
    };
    updateCount();
    if (state.startedAt) startTimer();
    else showTimer();
    return;
  }

  stopTimer();
  showTimer();
  const items = checklistItems(type);
  right.innerHTML = `
    <section class="result">
      <div><div class="muted small">Đã nộp lúc ${fmtDate(state.submittedAt)}</div>
      <div><strong>${wordsOf(state.text).length}</strong> từ · thời gian <strong>${fmt(state.elapsedMs)}</strong> / ${type.minutes}:00</div></div>
    </section>
    <section class="w-section">
      <h3>Bài của bạn</h3>
      <div class="w-essay translatable">${escapeHtml(state.text) || '<span class="muted">(bỏ trống)</span>'}</div>
    </section>
    <section class="w-section">
      <h3>Kiểm tra tự động</h3>
      ${analysisHtml(analyze(state.text))}
    </section>
    <section class="w-section">
      <h3>Tự chấm theo checklist <span id="self-score" class="w-score"></span></h3>
      <p class="muted small">Đọc lại bài của bạn, so với bài mẫu bên trái và tick những tiêu chí bạn đã đạt. Tiêu chí chưa đạt là thứ cần tập trung ở bài sau.</p>
      ${(() => {
        let k = 0;
        return type.checklist.map((g) => `
          <div class="w-check-group"><div class="w-check-title">${escapeHtml(g.group)}</div>
          ${g.items.map((it) => { const i = k++; return `
            <label class="w-check"><input type="checkbox" data-i="${i}" ${state.checks.includes(i) ? "checked" : ""}> <span>${escapeHtml(it)}</span></label>`; }).join("")}
          </div>`).join("");
      })()}
    </section>
    <div class="actions">
      <button type="button" id="again-btn" class="btn">Viết lại đề này</button>
      ${nextTask() ? `<a class="btn btn-primary" href="task.html?id=${nextTask().id}">Đề tiếp theo →</a>` : `<a class="btn btn-primary" href="index.html">Về danh sách đề</a>`}
    </div>`;

  const updateScore = () => { $("#self-score").textContent = `${state.checks.length}/${items.length}`; };
  updateScore();
  for (const cb of right.querySelectorAll(".w-check input")) cb.onchange = () => {
    const i = Number(cb.dataset.i);
    state.checks = cb.checked ? [...new Set([...state.checks, i])] : state.checks.filter((x) => x !== i);
    persist();
    updateWritingHistory(task.id, state.submittedAt, { checked: state.checks.length });
    updateScore();
  };
  $("#again-btn").onclick = () => {
    if (!confirm("Viết lại đề này từ đầu? Bài cũ vẫn được giữ trong mục \"Bài đã nộp\" ở trang danh sách.")) return;
    clearWritingState(task.id);
    renderTask();
  };
  right.parentElement.scrollTop = 0;
}

const nextTask = () => data.tasks[data.tasks.findIndex((x) => x.id === task.id) + 1];

function updateCount() {
  const n = wordsOf(state.text).length;
  const el = $("#wc");
  el.textContent = `${n} / ${type.minWords} từ`;
  el.classList.toggle("ok", n >= type.minWords);
}

// ---------- Đồng hồ (chỉ chạy khi trang đang mở) ----------
function showTimer() {
  const t = $("#timer");
  t.hidden = false;
  if (submitted()) {
    t.textContent = fmt(state.elapsedMs);
    t.title = "Thời gian làm bài";
    t.classList.toggle("over", state.elapsedMs > limitMs());
    return;
  }
  const r = limitMs() - elapsed();
  t.textContent = r >= 0 ? fmt(r) : `+${fmt(r)}`;
  t.title = r >= 0 ? "Thời gian còn lại" : "Đã quá giờ";
  t.classList.toggle("low", r >= 0 && r < 2 * 60 * 1000);
  t.classList.toggle("over", r < 0);
}

function startTimer() {
  stopTimer();
  tickFrom = Date.now();
  showTimer();
  timerHandle = setInterval(showTimer, 1000);
}

function stopTimer() {
  clearInterval(timerHandle);
  if (tickFrom) { state.elapsedMs = elapsed(); tickFrom = null; }
}

function submit() {
  const n = wordsOf(state.text).length;
  const msg = !n ? "Bạn chưa viết gì. Vẫn nộp để xem bài mẫu?"
    : n < type.minWords ? `Bài mới có ${n}/${type.minWords} từ. Nộp bài luôn?` : "Nộp bài và tự chấm?";
  if (!confirm(msg)) return;
  stopTimer();
  state.submittedAt = Date.now();
  state.checks = [];
  persist();
  if (n) addWritingHistory({
    id: task.id, title: task.title, submittedAt: state.submittedAt, words: n,
    timeMs: state.elapsedMs, checked: 0, total: checklistItems(type).length, text: state.text,
  });
  renderLeft();
  renderRight();
}

// Lưu thời gian khi rời trang / chuyển tab để đồng hồ không chạy lúc không làm bài.
function bindLifecycle() {
  const pause = () => { if (task && state && !submitted() && tickFrom) { stopTimer(); persist(); } };
  window.addEventListener("pagehide", pause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else if (task && state?.startedAt && !submitted() && !tickFrom) startTimer();
  });
}


async function main() {
  bindFontSize();
  bindLifecycle();
  initTooltip(document);
  try {
    data = await loadWriting();
  } catch (e) {
    $("#task-left").innerHTML = `<p class="error">Không tải được dữ liệu. Hãy chạy web qua HTTP (vd. <code>python3 -m http.server 8080</code>).<br><small>${escapeHtml(e.message)}</small></p>`;
    $("#task-view").hidden = false;
    return;
  }
  task = data.tasks.find((x) => x.id === taskId);
  if (!task) { location.replace("index.html"); return; }
  type = data.types[task.type];
  renderTask();
}

main();
