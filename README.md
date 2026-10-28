# English Quiz — Ôn tập TOEFL Reading

Web tĩnh ôn tập phần Reading (14 passage, 138 câu) với đáp án, giải thích tiếng Việt, highlight minh chứng trong bài và tra từ bằng nhấp đôi.

## Chạy local

```bash
python3 -m http.server 8080
# mở http://localhost:8080
```

(Cần chạy qua HTTP vì trang dùng `fetch` để đọc JSON.)

## Cấu trúc

- `index.html` — danh sách passage + tiến độ
- `passage.html?id=N&mode=practice|test` — trang làm bài
- `data/passages/NN.json` — nội dung đề (xem `docs/DATA-SCHEMA.md`)
- `data/dictionary.json` — từ điển EN→VI offline
- `scripts/validate.mjs` — kiểm tra dữ liệu (`node scripts/validate.mjs --dict`)
- `scripts/build-index.mjs` — sinh `data/index.json`
- `scripts/extract-words.mjs` — liệt kê từ còn thiếu trong từ điển
- `docs/PLAN.md` — kế hoạch

## Deploy

Push lên GitHub, bật GitHub Pages (branch `main`, folder `/`).

## Ghi chú dữ liệu

- Đáp án lấy theo **khoanh tay trong ảnh**. Câu có cờ "cần kiểm tra" là câu có 2 dấu khoanh (lấy dấu không bị gạch) hoặc không khoanh (tự chọn theo bài):
  P1 Q1, Q3, Q5–Q10 · P2 Q3, Q9 · P4 Q1 · P8 Q2 (không khoanh), Q5.
- P1 Q10 (chèn câu) bị **thiếu câu cần chèn** trong đề → hiển thị nhưng không tính điểm.
- Text P5, P6, P13, P14 được nhận dạng bằng OCR (`scripts/ocr.swift`, Apple Vision) và đã rà lại; các passage khác chép tay từ ảnh.
- `scripts/convert-images.sh` tạo bản JPG của ảnh gốc vào `images/jpg/` để đối chiếu.
