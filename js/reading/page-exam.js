// Trang thi thử: 4 passage ngẫu nhiên, xáo câu hỏi và đáp án, đếm ngược, nộp bài và xem lại.
import { loadIndex, loadPassage } from "./data.js";
import { renderPassage, renderQuestion } from "./render.js";
import { showEvidence, flashTarget, clearMarks } from "./evidence.js";
import { initTooltip } from "../core/tooltip.js";
import { escapeHtml, fmtDate, bindFontSize } from "../core/ui.js";
import { getExam, saveExam, clearExam, getExamHistory, addExamHistory } from "./storage.js";
import { createExam, fillOrder, viewQuestion, answerKey, EXAM_PASSAGES, EXAM_MINUTES } from "./exam.js";

const $ = (s, r = document) => r.querySelector(s);
const els = {
  intro: $("#intro"), exam: $("#exam"), tabs: $("#tabs"), timer: $("#timer"), title: $("#title"),
  passageTitle: $("#passage-title"), passage: $("#passage"), questions: $("#questions"),
  nav: $("#q-nav"), actions: $("#actions"),
};

let exam, passages = new Map(), current = 0, views = [], timerHandle;
const isWide = () => window.matchMedia("(min-width: 861px)").matches;
const submitted = () => exam?.submittedAt != null;
const scorable = (q) => q.status !== "incomplete";

function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- Dữ liệu ----------
async function ensurePassages() {
  let changed = false;
  for (const entry of exam.order) {
    if (!passages.has(entry.id)) passages.set(entry.id, await loadPassage(entry.id));
    changed = fillOrder(entry, passages.get(entry.id)) || changed;
  }
  if (changed) saveExam(exam);
}

/** Danh sách câu hỏi đã xáo của passage thứ i. */
function viewsFor(i) {
  const entry = exam.order[i], p = passages.get(entry.id);
  return entry.questions.map((ord, k) => viewQuestion(p.questions.find((q) => q.n === ord.n), ord, k + 1));
}

const chosenOrig = (id, q) => exam.answers[answerKey(id, q.origN)];
const chosenDisplay = (id, q) => { const o = chosenOrig(id, q); return o ? q.toDisplay[o] : undefined; };

function scoreOf(i) {
  const id = exam.order[i].id, qs = viewsFor(i).filter(scorable);
  return { correct: qs.filter((q) => chosenDisplay(id, q) === q.answer).length, total: qs.length };
}
function totalScore() {
  return exam.order.reduce((acc, _, i) => { const s = scoreOf(i); acc.correct += s.correct; acc.total += s.total; return acc; }, { correct: 0, total: 0 });
}
function answeredCount(i) {
  const id = exam.order[i].id;
  return exam.order[i].questions.filter((o) => exam.answers[answerKey(id, o.n)]).length;
}

// ---------- Đồng hồ ----------
const remaining = () => exam.durationMs - (Date.now() - exam.startedAt);
function startTimer() {
  clearInterval(timerHandle);
  els.timer.hidden = false;
  const tick = () => {
    const r = remaining();
    els.timer.textContent = fmt(r);
    els.timer.classList.toggle("low", r < 5 * 60 * 1000);
    if (r <= 0) { clearInterval(timerHandle); submit(true); }
  };
  tick();
  timerHandle = setInterval(tick, 1000);
}

// ---------- Màn hình bắt đầu ----------
function renderIntro(note = "") {
  els.exam.hidden = true;
  els.intro.hidden = false;
  els.timer.hidden = true;
  els.title.textContent = "Thi thử Reading";
  const history = getExamHistory();
  els.intro.innerHTML = `
    <section class="intro-card">
      <h2>Thi thử Reading</h2>
      ${note ? `<p class="notice">${note}</p>` : ""}
      <ul class="rules">
        <li><strong>${EXAM_PASSAGES} passage</strong> được chọn ngẫu nhiên trong ngân hàng 14 passage.</li>
        <li>Thứ tự câu hỏi và thứ tự đáp án A–D được <strong>xáo trộn</strong> mỗi lần thi.</li>
        <li>Thời gian: <strong>${EXAM_MINUTES} phút</strong>, hết giờ hệ thống tự nộp bài. Đồng hồ vẫn chạy khi bạn đóng trang.</li>
        <li>Chỉ xem đáp án, giải thích và minh chứng sau khi nộp bài.</li>
      </ul>
      <button type="button" id="start-btn" class="btn btn-primary btn-lg">Bắt đầu thi thử</button>
    </section>
    ${history.length ? `
    <section class="intro-card">
      <h3>Lịch sử thi thử</h3>
      <table class="history">
        <thead><tr><th>Thời điểm</th><th>Passage</th><th>Điểm</th><th>Thời gian</th></tr></thead>
        <tbody>${history.map((h) => `
          <tr><td>${fmtDate(h.submittedAt)}</td><td>${h.passages.map((p) => `P${p}`).join(", ")}</td>
          <td><strong>${h.correct}/${h.total}</strong> (${Math.round((h.correct / h.total) * 100)}%)</td><td>${fmt(h.timeMs)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>` : ""}`;
  $("#start-btn").onclick = start;
}

async function start() {
  const index = await loadIndex();
  exam = createExam(index);
  exam.startedAt = Date.now();
  saveExam(exam);
  await ensurePassages();
  current = 0;
  showExam();
}

// ---------- Màn hình làm bài / xem lại ----------
function showExam() {
  els.intro.hidden = true;
  els.exam.hidden = false;
  document.body.classList.toggle("exam-running", !submitted());
  if (submitted()) {
    els.timer.hidden = false;
    els.timer.classList.remove("low");
    els.timer.textContent = fmt(exam.submittedAt - exam.startedAt);
    els.timer.title = "Thời gian làm bài";
  } else startTimer();
  renderTabs();
  renderCurrent();
}

function renderTabs() {
  els.tabs.innerHTML = exam.order.map((e, i) => {
    const p = passages.get(e.id);
    const sub = submitted()
      ? (() => { const s = scoreOf(i); return `${s.correct}/${s.total} đúng`; })()
      : `${answeredCount(i)}/${e.questions.length} câu`;
    return `<button type="button" class="tab ${i === current ? "active" : ""}" data-i="${i}" title="${escapeHtml(p.title)}">
      <span class="tab-name">Bài ${i + 1}</span><span class="tab-sub">${sub}</span></button>`;
  }).join("") + (submitted()
    ? `<button type="button" class="tab tab-summary ${current === -1 ? "active" : ""}" data-i="-1"><span class="tab-name">Kết quả</span><span class="tab-sub">${(() => { const t = totalScore(); return `${t.correct}/${t.total}`; })()}</span></button>`
    : "");
  for (const b of els.tabs.querySelectorAll(".tab")) b.onclick = () => { current = Number(b.dataset.i); renderTabs(); renderCurrent(); window.scrollTo({ top: 0 }); };
}

function renderCurrent() {
  if (current === -1) return renderSummary();
  $(".layout").hidden = false;
  els.exam.querySelector(".summary")?.remove();
  const entry = exam.order[current], p = passages.get(entry.id);
  views = viewsFor(current);
  els.title.textContent = `Thi thử · Bài ${current + 1}/${exam.order.length}`;
  els.passageTitle.textContent = submitted() ? `Passage ${p.id}: ${p.title}` : p.title;
  els.passage.innerHTML = renderPassage(p);
  els.passage.parentElement.scrollTop = 0;
  els.questions.innerHTML = views.map(renderQuestion).join("");
  els.questions.parentElement.scrollTop = 0;

  for (const q of views) {
    const card = $(`#q${q.n}`);
    const d = chosenDisplay(entry.id, q);
    if (d) card.querySelector(`input[value="${d}"]`).checked = true;
    card.addEventListener("change", (e) => { if (e.target.type === "radio") select(q, e.target.value); });
    card.addEventListener("click", (e) => { if (!e.target.closest(".show-evidence")) focusQuestion(q); });
    card.addEventListener("focusin", () => focusQuestion(q));
    $(".show-evidence", card)?.addEventListener("click", () => focusQuestion(q, { force: true }));
    if (submitted()) reveal(q, card);
  }
  renderActions();
  updateNav();
}

function select(q, displayLetter) {
  if (submitted()) return;
  exam.answers[answerKey(exam.order[current].id, q.origN)] = q.toOrig[displayLetter];
  saveExam(exam);
  updateNav();
  renderTabs();
}

function reveal(q, card) {
  const chosen = chosenDisplay(exam.order[current].id, q);
  card.classList.add("answered");
  for (const opt of card.querySelectorAll(".opt")) {
    const L = opt.dataset.letter;
    opt.querySelector("input").disabled = true;
    if (L === q.answer) opt.classList.add("correct");
    if (L === chosen && chosen !== q.answer) opt.classList.add("wrong");
  }
  const fb = $(".feedback", card), v = $(".verdict", fb);
  if (!chosen) { v.className = "verdict skipped"; v.textContent = `Bỏ trống — Đáp án đúng: ${q.answer}`; }
  else if (chosen === q.answer) { v.className = "verdict ok"; v.textContent = `Chính xác! Đáp án: ${q.answer}`; }
  else { v.className = "verdict bad"; v.textContent = `Sai rồi. Bạn chọn ${chosen}, đáp án đúng: ${q.answer}`; }
  fb.hidden = false;
}

function focusQuestion(q, { force = false } = {}) {
  const card = $(`#q${q.n}`);
  if (!force && card.classList.contains("active")) return;
  for (const c of els.questions.querySelectorAll(".question.active")) c.classList.remove("active");
  card.classList.add("active");
  clearMarks(els.passage, "evidence");
  clearMarks(els.passage, "target");
  const scroll = force || isWide();
  if (submitted() && q.evidence?.length) showEvidence(els.passage, q.evidence, { scroll });
  else if (q.target) flashTarget(els.passage, q.target, { scroll });
}

function updateNav() {
  const id = exam.order[current].id;
  els.nav.innerHTML = views.map((q) => {
    const c = chosenDisplay(id, q);
    let cls = "dot";
    if (submitted()) cls += !c ? " empty bad" : c === q.answer ? " ok" : " bad";
    else cls += c ? " filled" : " empty";
    return `<a href="#q${q.n}" class="${cls}" data-n="${q.n}" title="Câu ${q.n}">${q.n}</a>`;
  }).join("");
  for (const a of els.nav.querySelectorAll(".dot")) a.onclick = (e) => {
    e.preventDefault();
    const q = views.find((x) => x.n === Number(a.dataset.n));
    $(`#q${q.n}`).scrollIntoView({ behavior: "smooth", block: "start" });
    focusQuestion(q, { force: true });
  };
  const btn = $("#submit-btn");
  if (btn) {
    const done = exam.order.reduce((s, _, i) => s + answeredCount(i), 0);
    const all = exam.order.reduce((s, e) => s + e.questions.length, 0);
    btn.textContent = `Nộp bài (${done}/${all})`;
  }
}

function renderActions() {
  const last = current === exam.order.length - 1;
  const next = `<button type="button" id="next-btn" class="btn">${last ? (submitted() ? "Xem kết quả →" : "") : "Bài tiếp theo →"}</button>`;
  els.actions.innerHTML = submitted()
    ? `${next}<button type="button" id="new-btn" class="btn btn-primary">Thi đề mới</button>`
    : `${last ? "" : next}<button type="button" id="submit-btn" class="btn btn-primary">Nộp bài</button>`;
  const nb = $("#next-btn");
  if (nb && nb.textContent) nb.onclick = () => { current = last ? -1 : current + 1; renderTabs(); renderCurrent(); window.scrollTo({ top: 0 }); };
  else nb?.remove();
  $("#submit-btn") && ($("#submit-btn").onclick = () => submit(false));
  $("#new-btn") && ($("#new-btn").onclick = newExam);
}

function submit(auto) {
  if (submitted()) return;
  if (!auto) {
    const all = exam.order.reduce((s, e) => s + e.questions.length, 0);
    const done = exam.order.reduce((s, _, i) => s + answeredCount(i), 0);
    const msg = done < all ? `Bạn còn ${all - done} câu chưa trả lời. Nộp bài luôn?` : "Nộp bài và xem kết quả?";
    if (!confirm(msg)) return;
  }
  clearInterval(timerHandle);
  exam.submittedAt = Math.min(Date.now(), exam.startedAt + exam.durationMs);
  saveExam(exam);
  const t = totalScore();
  addExamHistory({
    submittedAt: exam.submittedAt, passages: exam.order.map((e) => e.id),
    correct: t.correct, total: t.total, timeMs: exam.submittedAt - exam.startedAt,
  });
  current = -1;
  showExam();
  if (auto) alert("Hết giờ! Bài thi đã được nộp tự động.");
}

function renderSummary() {
  $(".layout").hidden = true;
  els.title.textContent = "Thi thử · Kết quả";
  els.exam.querySelector(".summary")?.remove();
  const t = totalScore(), pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
  const rows = exam.order.map((e, i) => {
    const s = scoreOf(i), p = passages.get(e.id);
    return `<tr><td>Bài ${i + 1}</td><td>P${p.id} · ${escapeHtml(p.title)}</td><td><strong>${s.correct}/${s.total}</strong></td>
      <td><button type="button" class="btn-link" data-i="${i}">Xem lại →</button></td></tr>`;
  }).join("");
  const box = document.createElement("main");
  box.className = "wrap summary";
  box.innerHTML = `
    <section class="intro-card">
      <h2>Kết quả thi thử</h2>
      <div class="big-score">${t.correct}/${t.total} <small>(${pct}%)</small></div>
      <p class="muted">Thời gian làm bài: ${fmt(exam.submittedAt - exam.startedAt)} / ${EXAM_MINUTES}:00 · Nộp lúc ${fmtDate(exam.submittedAt)}</p>
      <table class="history"><thead><tr><th></th><th>Passage</th><th>Điểm</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted small">Khi xem lại, đáp án và giải thích dùng chữ cái theo thứ tự đã xáo trong đề thi này.</p>
      <div class="actions"><button type="button" id="new-btn2" class="btn btn-primary">Thi đề mới</button></div>
    </section>`;
  els.exam.appendChild(box);
  for (const b of box.querySelectorAll("[data-i]")) b.onclick = () => { current = Number(b.dataset.i); renderTabs(); renderCurrent(); };
  $("#new-btn2").onclick = newExam;
}

function newExam() {
  if (!submitted() && !confirm("Bỏ bài thi đang làm và tạo đề mới?")) return;
  clearExam();
  clearInterval(timerHandle);
  exam = null;
  renderIntro();
}

// ---------- Phím tắt, cỡ chữ ----------
function bindKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (els.exam.hidden || current === -1) return;
    if (e.metaKey || e.altKey || e.ctrlKey) return;
    if (e.target.matches("textarea, button, input:not([type=radio])")) return;
    const active = $(".question.active");
    const map = { 1: "A", 2: "B", 3: "C", 4: "D", a: "A", b: "B", c: "C", d: "D" };
    const key = e.key.toLowerCase();
    if (active && map[key]) {
      const input = active.querySelector(`input[value="${map[key]}"]`);
      if (input && !input.disabled) { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const n = active ? Number(active.dataset.n) : 0;
      const q = views.find((x) => x.n === n + (e.key === "ArrowRight" ? 1 : -1));
      if (q) { $(`#q${q.n}`).scrollIntoView({ behavior: "smooth", block: "start" }); focusQuestion(q); }
    }
  });
}


async function main() {
  bindKeyboard();
  bindFontSize();
  initTooltip(document);
  exam = getExam();
  if (!exam) return renderIntro();
  try { await ensurePassages(); }
  catch (e) { clearExam(); return renderIntro(`Không tải được đề đang làm dở (${escapeHtml(e.message)}). Hãy tạo đề mới.`); }
  if (!submitted() && remaining() <= 0) { current = -1; submit(true); return; }
  current = submitted() ? -1 : 0;
  showExam();
}

main();
