// Trang luyện viết: chọn đề, viết bài có bấm giờ + đếm từ, nộp bài rồi tự chấm theo checklist và so với bài mẫu.
import { loadWriting } from "./data.js";
import { escapeHtml } from "./render.js";
import { initTooltip } from "./tooltip.js";
import {
  getWriting, getWritingState, saveWritingState, clearWritingState,
  getWritingHistory, addWritingHistory, updateWritingHistory, getPrefs, savePrefs,
} from "./storage.js";

const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);
const taskId = Number(params.get("id")) || null;

let data, task, type, state, timerHandle, tickFrom, tickBase;

// ---------- Tiện ích ----------
function fmt(ms) {
  const s = Math.round(Math.abs(ms) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
const fmtDate = (t) => new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const wordsOf = (text) => text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
const paragraphsOf = (text) => text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
const checklistItems = (t) => t.checklist.flatMap((g) => g.items);

// ---------- Phân tích tự động ----------
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

function analyze(text) {
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

// ---------- Danh sách đề ----------
function renderList() {
  $("#list-view").hidden = false;
  $(".font-ctl").hidden = true;
  document.title = "Luyện viết";
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
  $("#list-view").innerHTML = `
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
          <tr><td>${fmtDate(h.submittedAt)}</td><td><a href="writing.html?id=${h.id}">W${h.id}</a> ${escapeHtml(h.title)}</td>
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
    <p class="meta">${escapeHtml(t.label)} · ≥${t.minWords} từ · ${t.minutes} phút${x.relatedPassage ? ` · liên quan Passage ${x.relatedPassage}` : ""}</p>
    <p class="progress">${status}</p>
    <div class="card-actions"><a class="btn btn-primary" href="writing.html?id=${x.id}">${s?.submittedAt ? "Xem lại" : s?.text ? "Viết tiếp" : "Viết bài"}</a></div>
  </article>`;
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
      ${nextTask() ? `<a class="btn btn-primary" href="writing.html?id=${nextTask().id}">Đề tiếp theo →</a>` : `<a class="btn btn-primary" href="writing.html">Về danh sách đề</a>`}
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

function bindFontSize() {
  const apply = (px) => { document.documentElement.style.setProperty("--reading-size", `${px}px`); savePrefs({ fontSize: px }); };
  let size = getPrefs().fontSize || 17;
  apply(size);
  $("#font-minus").onclick = () => apply((size = Math.max(14, size - 1)));
  $("#font-plus").onclick = () => apply((size = Math.min(24, size + 1)));
}

async function main() {
  bindFontSize();
  bindLifecycle();
  initTooltip(document);
  try {
    data = await loadWriting();
  } catch (e) {
    $("#list-view").hidden = false;
    $("#list-view").innerHTML = `<p class="error">Không tải được dữ liệu. Hãy chạy web qua HTTP (vd. <code>python3 -m http.server 8080</code>).<br><small>${escapeHtml(e.message)}</small></p>`;
    return;
  }
  task = taskId && data.tasks.find((x) => x.id === taskId);
  if (!task) return renderList();
  type = data.types[task.type];
  $("#back").href = "writing.html";
  $("#back").textContent = "← Đề viết";
  renderTask();
}

main();
