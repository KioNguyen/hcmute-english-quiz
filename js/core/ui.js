// Tiện ích giao diện dùng chung.
import { getPrefs, savePrefs } from "./storage.js";

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const fmtDate = (t) => new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

/** Nút A−/A+ (#font-minus, #font-plus) chỉnh cỡ chữ bài đọc, lưu vào prefs. */
export function bindFontSize() {
  const apply = (px) => { document.documentElement.style.setProperty("--reading-size", `${px}px`); savePrefs({ fontSize: px }); };
  let size = getPrefs().fontSize || 17;
  apply(size);
  document.querySelector("#font-minus").onclick = () => apply((size = Math.max(14, size - 1)));
  document.querySelector("#font-plus").onclick = () => apply((size = Math.min(24, size + 1)));
}
