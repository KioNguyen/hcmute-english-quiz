// Dữ liệu Writing: data/writing/tasks.json (dạng bài + đề).
import { getJSON } from "../core/data.js";

export const loadWriting = () => getJSON("writing/tasks.json");
