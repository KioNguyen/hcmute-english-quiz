# English Quiz — Ôn tập tiếng Anh

Web tĩnh ôn tập theo kỹ năng:

- **Reading** — 14 passage, 138 câu, đáp án + giải thích tiếng Việt, highlight minh chứng, tra từ bằng nhấp đôi, thi thử.
- **Writing** — 8 đề (luận, thảo luận học thuật, email), bấm giờ, đếm từ, kiểm tra tự động, checklist tự chấm, bài mẫu.
- Listening, Speaking — sắp có.

## Chạy local

```bash
python3 -m http.server 8080
# mở http://localhost:8080
```

(Cần chạy qua HTTP vì trang dùng `fetch` để đọc JSON.)

## Cấu trúc

Mỗi kỹ năng có thư mục trang, thư mục JS và thư mục dữ liệu cùng tên — URL khớp với đường dẫn file.

```
index.html                     # trang chủ: chọn kỹ năng, tóm tắt tiến độ, xoá tiến độ
reading/
  index.html                   # /reading/            danh sách passage + tiến độ
  passage.html                 # /reading/passage.html?id=N&mode=practice|test
  exam.html                    # /reading/exam.html   thi thử 4 passage, 60 phút
writing/
  index.html                   # /writing/            danh sách đề + lịch sử bài nộp
  task.html                    # /writing/task.html?id=N   viết bài, nộp, tự chấm, bài mẫu
passage.html, exam.html        # URL cũ → chuyển hướng sang reading/ (giữ ?id=&mode=)

css/style.css                  # style dùng chung
js/
  home.js                      # trang chủ
  core/                        # dùng chung mọi kỹ năng
    data.js                    #   getJSON() — đường dẫn data/ tính theo import.meta.url
    storage.js                 #   read/write localStorage, prefs, cache dịch, clearAllProgress()
    ui.js                      #   escapeHtml, fmtDate, bindFontSize
    dictionary.js lemma.js tooltip.js   # tra từ nhấp đôi
  reading/                     # data.js storage.js render.js evidence.js exam.js page-*.js
  writing/                     # data.js storage.js text.js (đếm từ, phân tích) page-*.js
data/
  dictionary.json              # từ điển EN→VI offline (dùng chung)
  reading/index.json           # sinh bằng scripts/build-index.mjs
  reading/passages/NN.json     # nội dung đề (xem docs/DATA-SCHEMA.md)
  writing/tasks.json           # types (essay/discussion/email: số từ, thời gian, checklist, cụm từ) + tasks (đề, dàn ý, từ vựng, bài mẫu)
scripts/
  validate.mjs                 # kiểm tra dữ liệu Reading (`node scripts/validate.mjs --dict`)
  build-index.mjs              # sinh data/reading/index.json
  extract-words.mjs            # liệt kê từ còn thiếu trong từ điển
docs/                          # PLAN.md (kế hoạch ban đầu), DATA-SCHEMA.md
```

### Thêm kỹ năng mới (vd. Listening)

1. Tạo `listening/index.html` (+ các trang con), link `../css/style.css` và `../js/listening/page-*.js`.
2. `js/listening/data.js` dùng `getJSON("listening/…")` từ `js/core/data.js`; dữ liệu đặt ở `data/listening/`.
3. `js/listening/storage.js` dùng `read`/`write` từ `js/core/storage.js`, khoá bắt đầu bằng `eq:` (nút "Xoá toàn bộ tiến độ" tự xoá).
4. Bật thẻ Listening ở `index.html` và thêm dòng tiến độ trong `js/home.js`.

## Deploy

Push lên GitHub, bật GitHub Pages (branch `main`, folder `/`).

## Ghi chú dữ liệu

- Đáp án lấy theo **khoanh tay trong ảnh**. Câu có cờ "cần kiểm tra" là câu có 2 dấu khoanh (lấy dấu không bị gạch) hoặc không khoanh (tự chọn theo bài):
  P1 Q1, Q3, Q5–Q10 · P2 Q3, Q9 · P4 Q1 · P8 Q2 (không khoanh), Q5.
- P1 Q10 (chèn câu): đề không in câu cần chèn; vị trí [A]–[D] có trong đoạn 1, đáp án C theo khoanh tay.
- Text P5, P6, P13, P14 được nhận dạng bằng OCR (`scripts/ocr.swift`, Apple Vision) và đã rà lại; các passage khác chép tay từ ảnh.
- `scripts/convert-images.sh` tạo bản JPG của ảnh gốc vào `images/jpg/` để đối chiếu.
