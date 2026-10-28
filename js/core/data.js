// Tải dữ liệu JSON trong data/ (cần chạy qua HTTP, không chạy được trên file://).
// Đường dẫn tính theo vị trí file này nên dùng được ở mọi trang con (reading/, writing/…).
const DATA_ROOT = new URL("../../data/", import.meta.url);
const cache = new Map();

export async function getJSON(path) {
  const url = new URL(path, DATA_ROOT).href;
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được ${path} (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export const loadDictionary = () => getJSON("dictionary.json");
