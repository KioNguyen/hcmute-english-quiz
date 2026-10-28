// Trang làm bài: chế độ luyện tập (practice) và kiểm tra (test).
import { loadPassage, loadIndex } from "./data.js";
import { renderPassage, renderQuestion, escapeHtml } from "./render.js";
import { showEvidence, flashTarget, clearMarks } from "./evidence.js";
import { initTooltip } from "./tooltip.js";
import { getPassageState, savePassageState, clearPassageState, getPrefs, savePrefs } from "./storage.js";

const params = new URLSearchParams(location.search);
const id = Number(params.get("id")) || 1;
const mode = params.get("mode") === "test" ? "test" : "practice";

const $ = (s, r = document) => r.querySelector(s);
const els = {
  title: $("#title"), modeBadge: $("#mode-badge"), timer: $("#timer"),
  passage: $("#passage"), notes: $("#notes"), questions: $("#questions"),
  nav: $("#q-nav"), actions: $("#actions"), result: $("#result"),
  prev: $("#prev-link"), next: $("#next-link"),
};

let passage, state, timerHandle;
const scorable = (q) => q.status !== "incomplete";

function defaultState() {
  return { answers: {}, submitted: false, startedAt: Date.now(), elapsed: 0 };
}

function persist() { savePassageState(id, mode, state); }

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function startTimer() {
  stopTimer();
  const base = state.elapsed, from = Date.now();
  const tick = () => { els.timer.textContent = fmtTime(base + Date.now() - from); };
  tick();
  timerHandle = setInterval(tick, 1000);
  window.addEventListener("beforeunload", () => { if (!state.submitted) { state.elapsed = base + Date.now() - from; persist(); } });
}
function stopTimer() { clearInterval(timerHandle); }

/** Hiện đúng/sai + giải thích cho một câu. */
function reveal(q, card) {
  const chosen = state.answers[q.n];
  card.classList.add("answered");
  for (const opt of card.querySelectorAll(".opt")) {
    const L = opt.dataset.letter;
    opt.querySelector("input").disabled = true;
    if (L === q.answer) opt.classList.add("correct");
    if (L === chosen && chosen !== q.answer) opt.classList.add("wrong");
  }
  const fb = $(".feedback", card);
  const verdict = $(".verdict", fb);
  if (!scorable(q)) { verdict.className = "verdict incomplete"; verdict.textContent = "Đề thiếu dữ liệu — không tính điểm. Đáp án khoanh trong đề: " + q.answer; }
  else if (!chosen) { verdict.className = "verdict skipped"; verdict.textContent = `Bỏ trống — Đáp án đúng: ${q.answer}`; }
  else if (chosen === q.answer) { verdict.className = "verdict ok"; verdict.textContent = `Chính xác! Đáp án: ${q.answer}`; }
  else { verdict.className = "verdict bad"; verdict.textContent = `Sai rồi. Bạn chọn ${chosen}, đáp án đúng: ${q.answer}`; }
  fb.hidden = false;
  updateNav();
}

// Màn hình rộng: bài đọc và câu hỏi cuộn độc lập nên có thể tự cuộn bài đọc.
// Màn hình hẹp: chỉ cuộn khi người dùng chủ động bấm "Xem minh chứng".
const isWide = () => window.matchMedia("(min-width: 861px)").matches;

function focusQuestion(q, { force = false } = {}) {
  const card = $(`#q${q.n}`);
  if (!force && card.classList.contains("active")) return;
  for (const c of els.questions.querySelectorAll(".question.active")) c.classList.remove("active");
  card.classList.add("active");
  clearMarks(els.passage, "evidence");
  clearMarks(els.passage, "target");
  const revealed = state.submitted || (mode === "practice" && state.answers[q.n] !== undefined);
  const scroll = force || isWide();
  if (revealed && q.evidence?.length) showEvidence(els.passage, q.evidence, { scroll });
  else if (q.target) flashTarget(els.passage, q.target, { scroll });
}

function updateNav() {
  els.nav.innerHTML = passage.questions.map((q) => {
    const chosen = state.answers[q.n];
    const revealed = state.submitted || mode === "practice";
    let cls = "dot";
    if (!scorable(q)) cls += " incomplete";
    else if (chosen === undefined) cls += " empty";
    else if (!revealed) cls += " filled";
    else cls += chosen === q.answer ? " ok" : " bad";
    return `<a href="#q${q.n}" class="${cls}" data-n="${q.n}" title="Câu ${q.n}">${q.n}</a>`;
  }).join("");
  if (mode === "test" && !state.submitted) {
    const done = passage.questions.filter((q) => state.answers[q.n] !== undefined).length;
    $("#submit-btn").textContent = `Nộp bài (${done}/${passage.questions.length})`;
  }
}

function onSelect(q, letter) {
  if (state.submitted || (mode === "practice" && state.answers[q.n] !== undefined)) return;
  state.answers[q.n] = letter;
  persist();
  if (mode === "practice") { reveal(q, $(`#q${q.n}`)); focusQuestion(q, { force: isWide() }); }
  else updateNav();
}

function score() {
  const qs = passage.questions.filter(scorable);
  const correct = qs.filter((q) => state.answers[q.n] === q.answer).length;
  return { correct, total: qs.length };
}

function submit() {
  const empty = passage.questions.filter((q) => scorable(q) && state.answers[q.n] === undefined).length;
  if (empty && !confirm(`Còn ${empty} câu chưa trả lời. Nộp bài luôn?`)) return;
  stopTimer();
  state.elapsed += Date.now() - (state.startedAt || Date.now());
  state.submitted = true;
  state.submittedAt = Date.now();
  const { correct, total } = score();
  state.score = correct; state.total = total;
  persist();
  renderResult();
  for (const q of passage.questions) reveal(q, $(`#q${q.n}`));
  els.result.scrollIntoView({ behavior: "smooth" });
}

function renderResult() {
  if (!state.submitted) { els.result.hidden = true; return; }
  const { correct, total } = score();
  const pct = total ? Math.round((correct / total) * 100) : 0;
  els.result.hidden = false;
  els.result.innerHTML = `
    <div class="score">${correct}/${total} <small>(${pct}%)</small></div>
    <div class="muted">Thời gian: ${fmtTime(state.elapsed)}</div>
    <button type="button" id="retry-btn" class="btn">Làm lại</button>`;
  $("#retry-btn").onclick = reset;
  els.timer.textContent = fmtTime(state.elapsed);
}

function reset() {
  if (!confirm("Xoá kết quả và làm lại passage này?")) return;
  clearPassageState(id, mode);
  location.reload();
}

function renderActions() {
  if (mode === "practice") {
    els.actions.innerHTML = `<button type="button" id="retry-btn" class="btn btn-ghost">Làm lại từ đầu</button>`;
    $("#retry-btn").onclick = reset;
  } else if (!state.submitted) {
    els.actions.innerHTML = `<button type="button" id="submit-btn" class="btn btn-primary">Nộp bài</button>`;
    $("#submit-btn").onclick = submit;
  } else els.actions.innerHTML = "";
}

function bindQuestions() {
  for (const q of passage.questions) {
    const card = $(`#q${q.n}`);
    card.addEventListener("change", (e) => { if (e.target.type === "radio") onSelect(q, e.target.value); });
    card.addEventListener("click", (e) => { if (!e.target.closest(".show-evidence")) focusQuestion(q); });
    card.addEventListener("focusin", () => focusQuestion(q));
    $(".show-evidence", card)?.addEventListener("click", () => focusQuestion(q, { force: true }));
    const chosen = state.answers[q.n];
    if (chosen) { const input = card.querySelector(`input[value="${chosen}"]`); if (input) input.checked = true; }
    if (state.submitted || (mode === "practice" && chosen !== undefined)) reveal(q, card);
  }
  els.nav.addEventListener("click", (e) => {
    const dot = e.target.closest(".dot");
    if (!dot) return;
    e.preventDefault();
    const q = passage.questions.find((x) => x.n === Number(dot.dataset.n));
    $(`#q${q.n}`).scrollIntoView({ behavior: "smooth", block: "start" });
    focusQuestion(q, { force: true });
  });
}

function bindKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.altKey || (e.ctrlKey && e.key !== "Enter")) return;
    if (e.target.matches("textarea, button, input:not([type=radio])")) return;
    const active = $(".question.active");
    const map = { 1: "A", 2: "B", 3: "C", 4: "D", a: "A", b: "B", c: "C", d: "D" };
    const key = e.key.toLowerCase();
    if (active && map[key]) {
      const input = active.querySelector(`input[value="${map[key]}"]`);
      if (input && !input.disabled) { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault(); // tránh radio tự đổi lựa chọn khi bấm mũi tên
      const n = active ? Number(active.dataset.n) : 0;
      const q = passage.questions.find((x) => x.n === n + (e.key === "ArrowRight" ? 1 : -1));
      if (q) { $(`#q${q.n}`).scrollIntoView({ behavior: "smooth", block: "start" }); focusQuestion(q); }
    } else if (e.key === "Enter" && mode === "test" && !state.submitted && e.ctrlKey) submit();
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
  try { passage = await loadPassage(id); }
  catch (e) { els.passage.innerHTML = `<p class="error">Không tải được dữ liệu passage ${id}. Hãy chạy web qua HTTP (vd. <code>python3 -m http.server 8080</code>).<br><small>${escapeHtml(e.message)}</small></p>`; return; }

  document.title = `P${passage.id} · ${passage.title}`;
  els.title.textContent = `Passage ${passage.id}: ${passage.title}`;
  els.modeBadge.textContent = mode === "test" ? "Kiểm tra" : "Luyện tập";
  els.modeBadge.className = `badge ${mode}`;

  state = getPassageState(id, mode) || defaultState();
  if (mode === "test" && !state.submitted) state.startedAt = Date.now();

  els.passage.innerHTML = renderPassage(passage);
  if (passage.notes?.length) els.notes.innerHTML = `<details><summary>Ghi chú về đề (${passage.notes.length})</summary><ul>${passage.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul></details>`;
  els.questions.innerHTML = passage.questions.map(renderQuestion).join("");

  renderActions();
  renderResult();
  bindQuestions();
  updateNav();
  bindKeyboard();
  bindFontSize();
  initTooltip(document);

  if (mode === "test") { els.timer.hidden = false; if (!state.submitted) startTimer(); else els.timer.textContent = fmtTime(state.elapsed); }

  // Link passage trước/sau
  try {
    const index = await loadIndex();
    const ids = index.passages.map((p) => p.id);
    const i = ids.indexOf(id);
    const link = (el, pid) => { if (pid) { el.href = `passage.html?id=${pid}&mode=${mode}`; el.hidden = false; } };
    link(els.prev, ids[i - 1]);
    link(els.next, ids[i + 1]);
  } catch { /* không có index.json */ }
}

main();
