// Trang chủ: chọn kỹ năng, tóm tắt tiến độ từng kỹ năng.
import { clearAllProgress } from "./core/storage.js";
import { getProgress, getExam, getExamHistory } from "./reading/storage.js";
import { getWriting, getWritingHistory } from "./writing/storage.js";

const $ = (s) => document.querySelector(s);

function readingStatus() {
  const touched = Object.values(getProgress()).filter((p) => p.practice || p.test).length;
  const exam = getExam(), last = getExamHistory()[0];
  const parts = [touched ? `Đã làm ${touched} passage` : "Chưa làm passage nào"];
  if (exam && !exam.submittedAt) parts.push("đang có bài thi thử làm dở");
  else if (last) parts.push(`thi thử gần nhất ${last.correct}/${last.total}`);
  return parts.join(" · ");
}

function writingStatus() {
  const history = getWritingHistory();
  const drafts = Object.values(getWriting()).filter((s) => !s.submittedAt && s.text?.trim()).length;
  const parts = [history.length ? `Đã nộp ${history.length} bài` : "Chưa nộp bài nào"];
  if (drafts) parts.push(`${drafts} bài đang viết dở`);
  return parts.join(" · ");
}

$("#reading-status").textContent = readingStatus();
$("#writing-status").textContent = writingStatus();
$("#clear-btn").onclick = () => {
  if (confirm("Xoá toàn bộ tiến độ Reading và Writing (kể cả bài viết đã lưu)?")) { clearAllProgress(); location.reload(); }
};
