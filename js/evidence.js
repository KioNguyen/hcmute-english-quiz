// Tô màu đoạn minh chứng / từ mục tiêu trong bài đọc bằng cách bọc các text node trong <mark>.

function textNodesOf(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

/** Tìm `text` trong đoạn (dung sai khoảng trắng) và bọc <mark class="cls">. Trả về mark đầu tiên hoặc null. */
export function markText(paraEl, text, cls) {
  if (!paraEl || !text) return null;
  const nodes = textNodesOf(paraEl);
  const full = nodes.map((n) => n.nodeValue).join("");
  const pattern = text.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const m = new RegExp(pattern, "i").exec(full);
  if (!m) return null;
  const start = m.index, end = start + m[0].length;

  let offset = 0, first = null;
  for (const node of nodes) {
    const len = node.nodeValue.length;
    const nStart = offset, nEnd = offset + len;
    offset = nEnd;
    if (nEnd <= start || nStart >= end) continue;
    const from = Math.max(start, nStart) - nStart;
    const to = Math.min(end, nEnd) - nStart;
    let target = node;
    if (from > 0) target = target.splitText(from);
    if (to - from < target.nodeValue.length) target.splitText(to - from);
    const mark = document.createElement("mark");
    mark.className = cls;
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
    first ??= mark;
  }
  return first;
}

export function clearMarks(container, cls) {
  for (const mark of container.querySelectorAll(`mark.${cls}`)) {
    const parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}

const paraEl = (container, i) => container.querySelector(`.para[data-para="${i}"]`);

/** Highlight danh sách evidence [{paragraph, text}] và cuộn tới cái đầu tiên. */
export function showEvidence(container, evidence, { scroll = true } = {}) {
  clearMarks(container, "evidence");
  let first = null;
  for (const ev of evidence || []) {
    const m = markText(paraEl(container, ev.paragraph), ev.text, "evidence");
    first ??= m;
  }
  if (first && scroll) first.scrollIntoView({ behavior: "smooth", block: "center" });
  return first;
}

/** Nhấp nháy từ mục tiêu của câu hỏi (target {paragraph, text}). */
export function flashTarget(container, target, { scroll = true } = {}) {
  clearMarks(container, "target");
  if (!target) return;
  const m = markText(paraEl(container, target.paragraph), target.text, "target");
  if (m && scroll) m.scrollIntoView({ behavior: "smooth", block: "center" });
}
