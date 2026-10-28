// Tải dữ liệu JSON (cần chạy qua HTTP, không chạy được trên file://).
const cache = new Map();

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được ${url} (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export const loadIndex = () => getJSON("data/index.json");
export const loadPassage = (id) => getJSON(`data/passages/${String(id).padStart(2, "0")}.json`);
export const loadDictionary = () => getJSON("data/dictionary.json");
