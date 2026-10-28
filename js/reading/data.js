// Dữ liệu Reading: data/reading/index.json và data/reading/passages/NN.json.
import { getJSON } from "../core/data.js";

export const loadIndex = () => getJSON("reading/index.json");
export const loadPassage = (id) => getJSON(`reading/passages/${String(id).padStart(2, "0")}.json`);
