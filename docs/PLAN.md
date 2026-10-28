# Kế hoạch: Web tĩnh ôn tập TOEFL Reading (HCMUTE English Quiz)

## 1. Bối cảnh

Người dùng là người học tiếng Anh, có đề cương ôn tập phần **Reading** dưới dạng 28 ảnh chụp (`images/IMG_9158–9186.HEIC`, thiếu `IMG_9166`). Mục tiêu: một **web tĩnh đơn giản** để tự ôn, trong đó mỗi câu hỏi có đáp án, **giải thích tiếng Việt**, **highlight đoạn minh chứng** trong bài đọc, và **nhấp đôi vào bất kỳ từ nào → tooltip dịch tiếng Việt**.

Quyết định đã chốt với người dùng:
- Stack: **HTML + CSS + Vanilla JS**, dữ liệu JSON, không build step.
- Dịch từ: **từ điển offline tạo sẵn + fallback API online** (MyMemory) khi thiếu.
- Đáp án: **lấy theo khoanh tay trong ảnh** (đáp án khoanh, không bị gạch). Claude chỉ viết giải thích; câu nào khoanh mâu thuẫn/không khoanh thì đánh cờ `needsReview`.
- Chế độ: **Luyện tập** (phản hồi ngay) + **Kiểm tra** (làm hết rồi nộp, có đồng hồ), lưu tiến độ `localStorage`.

## 2. Nội dung nguồn (đã kiểm kê toàn bộ 28 ảnh)

**14 passages, 138 câu**, 4 lựa chọn A–D, đánh số lại từ 1 ở mỗi passage.

| # | Chủ đề | Số câu | Ảnh |
|---|---|---|---|
| 1 | Women's suffrage (Anh & Mỹ) | 10 | 9158–9160 |
| 2 | Desert animals' survival | 9 | 9160–9162 |
| 3 | Home burglary precautions (đoạn đánh số 1–8) | 10 | 9162–9163 |
| 4 | Fresh water supply | 9 (*) | 9163–9165 |
| 5 | Human right-handedness | 10 | 9167–9168 |
| 6 | Gifted children: nature vs upbringing (đoạn 1–5) | 10 | 9168–9170 |
| 7 | Noise pollution (đoạn 1–4) | 10 | 9170–9171 |
| 8 | Children & TV sports (đoạn 1–4) | 10 | 9172–9173 |
| 9 | Space liftoff & reentry | 10 | 9173–9176 |
| 10 | On Tour with the LSO | 10 | 9176–9177 |
| 11 | The Decathlon | 10 | 9177–9179 |
| 12 | Subversive messages in art | 10 | 9179–9181 |
| 13 | NYLSO amateur orchestra | 10 | 9182–9183 |
| 14 | Clinical depression | 10 | 9183–9186 (9186 xoay 90°) |

Dạng câu hỏi: vocabulary-in-context (nhiều nhất), detail, reference (*their/they/this/it*), NOT/EXCEPT, inference, rhetorical purpose, main idea/title, sentence simplification (P1 Q9), insert sentence [A][B][C][D] (P1 Q10), author's opinion.

**Lỗi nội dung & cách xử lý:**

| Vấn đề | Xử lý |
|---|---|
| P1 Q10 insert-sentence nhưng **không in câu cần chèn** | `status: "incomplete"`, hiển thị thông báo, không tính điểm |
| P2 Q9 in thừa 1 lựa chọn "D" | Giữ 4 lựa chọn A–D theo thứ tự in, bỏ D thừa; ghi `note` |
| P4 chỉ có Q9, ảnh 9166 thiếu (*) | Nhập 9 câu, ghi chú "có thể thiếu Q10" trong `notes` |
| Đề nhắc "in line 27" nhưng không in số dòng | Giữ nguyên stem; thêm trường `target` (từ/cụm in đậm) để highlight & scroll tới trong passage |
| Chữ "A/B/D" thừa trong P4, P9 (marker chèn câu sót) | Loại bỏ khi nhập text |
| P5 Q6 typo "Home habilis" | Sửa thành "Homo habilis" |
| P8 Q2 không khoanh | `needsReview: true`, Claude chọn đáp án hợp lý nhất, ghi `answerSource: "inferred"` |
| Khoanh 2 lần (P1 Q1,3,5–10; P2 Q3,9; P4 Q1; P8 Q5) | Lấy đáp án khoanh **không bị gạch**; `answerSource: "handwritten-corrected"`, `needsReview: true` |

## 3. Kiến trúc & cấu trúc thư mục

```
english-quiz/
├── index.html                 # Danh sách 14 passage + tiến độ + chọn chế độ
├── passage.html               # Trang làm bài: ?id=3&mode=practice|test
├── css/style.css
├── js/
│   ├── storage.js             # localStorage: tiến độ, kết quả, cache dịch
│   ├── data.js                # fetch data/index.json, data/passages/NN.json
│   ├── render.js              # render passage (đoạn, từ in đậm, marker [A]-[D]) & câu hỏi
│   ├── quiz.js                # state máy làm bài: practice/test, chấm điểm, đồng hồ
│   ├── evidence.js            # tìm & bọc <mark> đoạn minh chứng
│   ├── dictionary.js          # tra từ offline → chuẩn hoá → fallback MyMemory, cache
│   ├── tooltip.js             # bắt dblclick, lấy từ, định vị tooltip
│   └── app-index.js / app-passage.js   # entry cho 2 trang
├── data/
│   ├── index.json             # metadata 14 passage (id, title, topic, số câu, notes)
│   ├── passages/01.json … 14.json
│   └── dictionary.json        # từ điển EN→VI cho toàn bộ từ trong 14 passage
├── scripts/
│   ├── convert-images.sh      # HEIC → JPG (sips) vào images/jpg/ để tiện đối chiếu
│   └── validate.mjs           # kiểm tra JSON: evidence khớp text, đủ 4 lựa chọn, dictionary coverage
├── images/                    # ảnh gốc (giữ nguyên)
└── docs/PLAN.md               # bản sao kế hoạch này
```

Chạy local: `python3 -m http.server 8080` (cần HTTP vì `fetch` JSON không chạy trên `file://`). Deploy: GitHub Pages (push thư mục gốc là xong, không build).

## 4. Mô hình dữ liệu

### `data/passages/NN.json`
```json
{
  "id": 1,
  "title": "Women's Suffrage in Britain and the US",
  "source": { "images": ["IMG_9158", "IMG_9159", "IMG_9160"] },
  "numberedParagraphs": false,
  "paragraphs": [
    "Throughout Western civilization, women's suffrage ... **progressed** ... [A] In England ... [B] However ... [C] In America ... [D]",
    "..."
  ],
  "questions": [
    {
      "n": 2,
      "type": "vocabulary",
      "stem": "The word \"progressed\" in line 3 is closest in meaning to ____.",
      "target": { "paragraph": 1, "text": "progressed" },
      "options": { "A": "withheld", "B": "withstood", "C": "advanced", "D": "contained" },
      "answer": "C",
      "answerSource": "handwritten",
      "needsReview": false,
      "explanation": "\"Progressed\" = tiến triển, phát triển. Trong ngữ cảnh \"how these rights have progressed\" (các quyền này đã tiến triển ra sao) → đồng nghĩa với \"advanced\". A withheld (giữ lại), B withstood (chịu đựng), D contained (chứa/kìm hãm) đều ngược nghĩa.",
      "evidence": [
        { "paragraph": 1, "text": "The best example of how these rights have progressed is in two nations" }
      ],
      "status": "ok"
    }
  ],
  "notes": ["Q10: đề không in câu cần chèn → đánh dấu incomplete."]
}
```

Quy ước trong `paragraphs`: `**từ**` = in đậm trong đề (từ được hỏi), `__từ__` = in đậm gạch chân, `[A]`…`[D]` = ô chèn câu, `^^câu^^` = câu được highlight (P1 Q9). `render.js` chuyển các marker này thành `<b data-target>`, `<span class="insert-marker">`, `<span class="highlighted-sentence">`.

`type` ∈ `vocabulary | detail | reference | negative | inference | purpose | main-idea | simplification | insert | opinion`.

### `data/dictionary.json`
```json
{
  "suffrage": { "pos": "n", "ipa": "/ˈsʌfrɪdʒ/", "vi": "quyền bầu cử" },
  "pivotal":  { "pos": "adj", "vi": "then chốt, quan trọng" },
  "stall":    { "pos": "v", "vi": "đình trệ, ngưng lại" }
}
```
Key = dạng gốc (lemma) viết thường. Ước tính ~2.000–2.500 từ duy nhất cho 14 passage; nghĩa chọn theo ngữ cảnh bài đọc.

### `localStorage`
- `eq:progress` → `{ [passageId]: { practice: { answers: {n: "C"}, done: bool }, test: { answers, score, timeSpent, submittedAt } } }`
- `eq:dict-cache` → `{ [word]: "nghĩa từ API" }`

## 5. Tính năng chi tiết

### 5.1 Trang danh sách (`index.html`)
- Card cho mỗi passage: số, tiêu đề, chủ đề, số câu, tiến độ (đã làm x/y, điểm test gần nhất).
- Nút **Luyện tập** / **Kiểm tra** → `passage.html?id=N&mode=...`.
- Nút "Xoá tiến độ".

### 5.2 Trang làm bài (`passage.html`)
- Layout 2 cột trên desktop: **trái = bài đọc** (cuộn độc lập, sticky), **phải = câu hỏi**; mobile xếp dọc, có nút "Xem bài đọc" nhảy lên.
- Bài đọc: đoạn đánh số (hiện số đoạn cho mọi passage để dễ đối chiếu "paragraph N"), từ được hỏi in đậm, marker [A]–[D] hiển thị là ô vuông.
- Câu hỏi: 1 câu/ card, 4 radio. Khi câu có `target` → hover/focus câu hỏi sẽ nhấp nháy từ tương ứng trong bài đọc và scroll tới.
- Điều hướng: trước/sau, thanh số câu (dot đã làm/đúng/sai), link về danh sách, sang passage kế.

### 5.3 Chế độ Luyện tập
- Chọn đáp án → khoá câu đó, tô xanh/đỏ, hiện ngay **giải thích tiếng Việt** + bật **highlight minh chứng** trong bài đọc (scroll tới `<mark>`).
- Lưu từng câu vào `localStorage`; mở lại giữ nguyên trạng thái.

### 5.4 Chế độ Kiểm tra
- Đồng hồ đếm lên (hiển thị thời gian đã làm; gợi ý 20 phút/passage như TOEFL).
- Không phản hồi cho tới khi bấm **Nộp bài**; xác nhận nếu còn câu trống.
- Sau nộp: điểm x/y, thời gian, chuyển sang chế độ xem lại giống Luyện tập (giải thích + highlight), nút "Làm lại".

### 5.5 Highlight minh chứng (`evidence.js`)
- Mỗi `evidence` có `paragraph` + `text` (chuỗi con nguyên văn). Khi cần highlight: lấy text node của đoạn, `indexOf` chuỗi (so khớp không phân biệt khoảng trắng kép), bọc bằng `<mark class="evidence">`. Hỗ trợ nhiều evidence cho 1 câu.
- Bỏ highlight cũ khi chuyển câu. `scripts/validate.mjs` đảm bảo 100% evidence tìm thấy trong passage (tránh lỗi gõ sai).

### 5.6 Dịch từ khi nhấp đôi (`tooltip.js` + `dictionary.js`)
- Lắng nghe `dblclick` trên vùng bài đọc **và** vùng câu hỏi. Lấy từ qua `window.getSelection()` (trình duyệt tự chọn từ khi dblclick); làm sạch dấu câu, lowercase.
- Tra theo thứ tự: nguyên dạng → bỏ `'s` → bỏ `-s/-es/-ed/-ing/-ies→y` → cắt phụ âm đôi (`stalled→stall`) → `dictionary.json`. Không có → kiểm tra `eq:dict-cache` → gọi `https://api.mymemory.translated.net/get?q=<word>&langpair=en|vi` (miễn phí, không cần key, ~1000 từ/ngày) → cache. Nếu offline/thất bại: hiện "Không tìm thấy nghĩa".
- Tooltip: định vị theo `range.getBoundingClientRect()`, tự lật lên/xuống khi sát mép; nội dung: **từ**, IPA (nếu có), loại từ, nghĩa Việt, nhãn nguồn (📖 offline / 🌐 online). Đóng khi click ra ngoài / Esc / cuộn.
- Trên mobile: dblclick không ổn định → thêm **long-press (500ms)** làm hành vi tương đương.

### 5.7 Khác
- Giao diện: font dễ đọc (Inter/system), cỡ chữ bài đọc 17–18px, line-height 1.7; có nút tăng/giảm cỡ chữ. Không làm dark mode trong phạm vi này.
- Phím tắt: `1–4`/`A–D` chọn đáp án, `←/→` chuyển câu, `Enter` nộp (test).
- Toàn bộ nhãn UI bằng tiếng Việt.

## 6. Quy trình số hoá nội dung (phần tốn công nhất)

1. `scripts/convert-images.sh`: HEIC → JPG 1600px vào `images/jpg/` (dùng `sips`, đã kiểm chứng chạy được trên máy này); xoay `IMG_9186` 90°.
2. Nhập từng passage (theo batch 2–3 passage/lượt) vào `data/passages/NN.json`: chép nguyên văn, giữ từ in đậm/gạch chân, marker [A]–[D], câu highlight; sửa lỗi đã liệt kê ở mục 2.
3. Nhập câu hỏi + đáp án từ khoanh tay theo quy tắc mục 2; gắn `type`, `target`.
4. Viết **giải thích tiếng Việt** cho 138 câu (giải thích vì sao đúng + vì sao 3 phương án còn lại sai, với dạng vocabulary ghi nghĩa cả 4 từ) và chọn `evidence` nguyên văn.
5. Tạo `dictionary.json`: script `scripts/extract-words.mjs` gom mọi từ duy nhất từ 14 passage + câu hỏi → Claude điền nghĩa theo ngữ cảnh → validate coverage.
6. Chạy `node scripts/validate.mjs`: JSON hợp lệ, đủ 4 lựa chọn, `answer ∈ A–D`, mọi `evidence`/`target` tìm thấy trong đoạn tương ứng, dictionary coverage ≥ 98% từ trong passage.
7. Đối chiếu ngẫu nhiên 2 câu/passage với ảnh gốc; liệt kê các câu `needsReview` để người dùng tự xác nhận.

## 7. Các bước thực hiện

| Bước | Nội dung | Kết quả |
|---|---|---|
| 0 | Khởi tạo cấu trúc thư mục, `docs/PLAN.md`, convert ảnh, `.gitignore`, `git init` | Khung dự án |
| 1 | Số hoá Passage 1–3 (JSON + đáp án + giải thích + evidence) | Dữ liệu mẫu để dựng UI |
| 2 | `index.html` + `passage.html` + render passage/câu hỏi + chế độ Luyện tập + localStorage | Chạy được với P1–3 |
| 3 | Highlight evidence + nhảy tới `target` | Tính năng giải thích hoàn chỉnh |
| 4 | Từ điển: extract words, tạo `dictionary.json` (P1–3), `dictionary.js`, `tooltip.js`, fallback API, long-press mobile | Dịch dblclick hoạt động |
| 5 | Chế độ Kiểm tra (đồng hồ, nộp, xem lại), phím tắt, responsive | Đủ 2 chế độ |
| 6 | Số hoá Passage 4–14 + mở rộng dictionary; chạy `validate.mjs` | Đủ 14 passage |
| 7 | Rà soát với ảnh gốc, báo cáo danh sách `needsReview`; deploy GitHub Pages | Hoàn tất |

## 8. Kiểm thử / nghiệm thu

- `node scripts/validate.mjs` pass (0 lỗi evidence/target, coverage từ điển đạt).
- Chạy `python3 -m http.server 8080`, mở `http://localhost:8080`:
  - Danh sách hiện 14 passage, tiến độ cập nhật sau khi làm.
  - Luyện tập P1: chọn sai → đỏ + giải thích + `<mark>` đúng vị trí trong bài; chọn đúng → xanh. Reload giữ trạng thái.
  - Kiểm tra P1: không lộ đáp án trước khi nộp; nộp → điểm, thời gian, xem lại đầy đủ.
  - P1 Q10 hiển thị cảnh báo "thiếu dữ liệu", không tính vào điểm.
  - Nhấp đôi "suffrage" → tooltip "quyền bầu cử" (offline); nhấp đôi một từ cố tình không có trong từ điển → thấy nhãn online (hoặc thông báo lỗi khi tắt mạng).
  - Thu nhỏ cửa sổ ≤ 768px: layout xếp dọc, long-press hiện tooltip.
- Kiểm tra trên Chrome + Safari (macOS) và Safari iOS.
