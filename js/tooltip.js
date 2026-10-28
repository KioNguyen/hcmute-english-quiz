// Tooltip dịch từ khi nhấp đôi (desktop) hoặc nhấn giữ (mobile) trên vùng .translatable.
import { translate } from "./dictionary.js";
import { escapeHtml } from "./render.js";

const SOURCE_LABEL = { offline: "📖 từ điển", cache: "🌐 đã lưu", online: "🌐 online" };
let tip, hideTimer, reqId = 0;

function ensureTip() {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.id = "tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);
  return tip;
}

export function hideTooltip() { if (tip) tip.hidden = true; }

function place(rect) {
  const t = ensureTip();
  t.hidden = false;
  t.style.left = "0px"; t.style.top = "0px";
  const { width, height } = t.getBoundingClientRect();
  const margin = 8;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  let top = rect.bottom + margin;
  let pos = "below";
  if (top + height > window.innerHeight - margin) { top = rect.top - height - margin; pos = "above"; }
  t.style.left = `${left + window.scrollX}px`;
  t.style.top = `${top + window.scrollY}px`;
  t.dataset.pos = pos;
}

async function showFor(word, rect) {
  const t = ensureTip();
  const id = ++reqId;
  t.innerHTML = `<div class="tip-word">${escapeHtml(word)}</div><div class="tip-vi muted">Đang tra…</div>`;
  place(rect);
  const r = await translate(word);
  if (id !== reqId) return;
  if (!r) {
    t.innerHTML = `<div class="tip-word">${escapeHtml(word)}</div><div class="tip-vi muted">Không tìm thấy nghĩa (kiểm tra kết nối mạng)</div>`;
  } else {
    const head = r.key && r.key !== r.word ? `${escapeHtml(r.word)} <span class="muted">→ ${escapeHtml(r.key)}</span>` : escapeHtml(r.word);
    t.innerHTML = `
      <div class="tip-word">${head}</div>
      <div class="tip-meta">${r.ipa ? `<span class="ipa">${escapeHtml(r.ipa)}</span>` : ""}${r.pos ? `<span class="pos">${escapeHtml(r.pos)}</span>` : ""}</div>
      <div class="tip-vi">${escapeHtml(r.vi)}</div>
      <div class="tip-src">${SOURCE_LABEL[r.source] || ""}</div>`;
  }
  place(rect);
}

/** Lấy từ tại vị trí chạm (dùng cho long-press). */
function wordAtPoint(x, y) {
  let range;
  if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); }
  }
  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
  const node = range.startContainer, text = node.nodeValue, i = range.startOffset;
  const isW = (c) => /[A-Za-z'’-]/.test(c);
  let s = i, e = i;
  while (s > 0 && isW(text[s - 1])) s--;
  while (e < text.length && isW(text[e])) e++;
  if (s === e) return null;
  const r = document.createRange();
  r.setStart(node, s); r.setEnd(node, e);
  return { word: text.slice(s, e), rect: r.getBoundingClientRect() };
}

export function initTooltip(root = document) {
  ensureTip();

  root.addEventListener("dblclick", (e) => {
    if (!e.target.closest(".translatable")) return;
    const sel = window.getSelection();
    const word = sel?.toString().trim();
    if (!word || !/[A-Za-z]/.test(word) || sel.rangeCount === 0) return;
    showFor(word, sel.getRangeAt(0).getBoundingClientRect());
  });

  // Long-press trên thiết bị cảm ứng
  let pressTimer = null;
  root.addEventListener("touchstart", (e) => {
    if (!e.target.closest(".translatable") || e.touches.length !== 1) return;
    const { clientX, clientY } = e.touches[0];
    pressTimer = setTimeout(() => {
      const hit = wordAtPoint(clientX, clientY);
      if (hit) showFor(hit.word, hit.rect);
    }, 500);
  }, { passive: true });
  const cancel = () => { clearTimeout(pressTimer); pressTimer = null; };
  root.addEventListener("touchend", cancel, { passive: true });
  root.addEventListener("touchmove", cancel, { passive: true });

  document.addEventListener("pointerdown", (e) => { if (!e.target.closest("#tooltip")) hideTooltip(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTooltip(); });
  document.addEventListener("scroll", () => { clearTimeout(hideTimer); hideTimer = setTimeout(hideTooltip, 150); }, true);
}
