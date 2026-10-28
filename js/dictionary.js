// Tra nghĩa tiếng Việt: từ điển offline → cache → API MyMemory.
import { loadDictionary } from "./data.js";
import { cleanWord, lookup } from "./lemma.js";
import { getDictCache, setDictCache } from "./storage.js";

let dictPromise = null;
const getDict = () => (dictPromise ??= loadDictionary().catch(() => ({})));

/** Tải sẵn từ điển để lần nhấp đôi đầu tiên không phải chờ. */
export const preloadDictionary = () => { getDict(); };

async function fetchOnline(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const json = await res.json();
    const vi = json?.responseData?.translatedText;
    if (!vi || /^[A-Z ]+$/.test(vi) || vi.toLowerCase() === word) return null;
    return vi;
  } finally { clearTimeout(t); }
}

/**
 * @returns {Promise<{word, key?, pos?, ipa?, vi, source: 'offline'|'online'|'cache'} | null>}
 */
export async function translate(raw) {
  const word = cleanWord(raw);
  if (!word) return null;
  const dict = await getDict();
  const hit = lookup(dict, word);
  if (hit) return { word, key: hit.key, pos: hit.pos, ipa: hit.ipa, vi: hit.vi, source: "offline" };

  const cache = getDictCache();
  if (cache[word]) return { word, vi: cache[word], source: "cache" };

  try {
    const vi = await fetchOnline(word);
    if (vi) { setDictCache(word, vi); return { word, vi, source: "online" }; }
  } catch { /* offline hoặc lỗi mạng */ }
  return null;
}
