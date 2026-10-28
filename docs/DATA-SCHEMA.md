# Data schema — `data/reading/passages/NN.json`

Mỗi passage là một file `data/reading/passages/NN.json` (NN = 2 chữ số: `01`…`14`). Toàn bộ text tiếng Anh chép **nguyên văn** từ ảnh trong `images/jpg/`.

```json
{
  "id": 1,
  "title": "Women's Suffrage in Britain and the US",
  "topic": "Lịch sử quyền bầu cử của phụ nữ ở Anh và Mỹ",
  "source": { "images": ["IMG_9158", "IMG_9159", "IMG_9160"] },
  "numberedParagraphs": false,
  "paragraphs": [
    "Throughout Western civilization, women's suffrage ... have **progressed** is in ... [A] In England ... [B] However ... [C] In America ... [D]",
    "..."
  ],
  "questions": [ { ...Question } ],
  "notes": ["Ghi chú tiếng Việt về lỗi đề / dữ liệu thiếu (có thể rỗng)"]
}
```

## Markup bên trong `paragraphs[]` (chuỗi thuần, KHÔNG dùng HTML)

| Markup | Ý nghĩa | Ví dụ |
|---|---|---|
| `**từ**` | Từ/cụm in đậm trong đề (thường là từ được hỏi nghĩa / từ tham chiếu) | `have **progressed** is` |
| `__từ__` | Từ in đậm + gạch chân trong đề | `is further __bolstered__ by` |
| `^^câu^^` | Câu được highlight (dạng sentence simplification) | `^^In the wake of ... level.^^` |
| `[A]` `[B]` `[C]` `[D]` | Ô chèn câu (insert-sentence), giữ đúng vị trí trong đề | `Parliament ... vote. [B] However,` |

- Mỗi phần tử của `paragraphs` = một đoạn văn trong đề. Nếu đề in số đoạn (¹ ² ³) thì **bỏ số** khỏi text và đặt `"numberedParagraphs": true`.
- Tiêu đề phụ trong bài (vd. "How We Work") → đưa thành phần tử riêng với tiền tố `## ` (vd. `"## How We Work"`).
- Bỏ các chữ cái A/B/D lạc lõng là marker sót (P4, P9) khi không có câu hỏi insert dùng chúng.
- Sửa lỗi in rõ ràng (vd. "Home habilis" → "Homo habilis") và ghi vào `notes`.
- Nếu đề có tiêu đề in sẵn thì dùng; nếu không, tự đặt tiêu đề tiếng Anh ngắn gọn.

## Question

```json
{
  "n": 2,
  "type": "vocabulary",
  "stem": "The word \"progressed\" in line 3 is closest in meaning to ____.",
  "target": { "paragraph": 1, "text": "progressed" },
  "options": { "A": "withheld", "B": "withstood", "C": "advanced", "D": "contained" },
  "answer": "C",
  "answerSource": "handwritten",
  "needsReview": false,
  "explanation": "...tiếng Việt...",
  "evidence": [ { "paragraph": 1, "text": "The best example of how these rights have progressed is in two nations" } ],
  "status": "ok"
}
```

| Trường | Quy tắc |
|---|---|
| `n` | Số thứ tự câu trong passage (1..10) |
| `type` | Một trong: `vocabulary`, `detail`, `reference`, `negative` (NOT/EXCEPT), `inference`, `purpose` (why does the author mention…), `main-idea`, `simplification`, `insert`, `opinion` |
| `stem` | Nguyên văn câu hỏi. Chỗ trống viết là `____`. Giữ nguyên "in line 27" nếu đề ghi vậy. |
| `target` | Chỉ có với câu hỏi về một từ/cụm/câu cụ thể trong bài (`vocabulary`, `reference`, `purpose` trích dẫn, `simplification`). `paragraph` = chỉ số **1-based** trong `paragraphs`; `text` = chuỗi **nguyên văn** xuất hiện trong đoạn đó (không gồm markup `**`). Không có thì bỏ trường này. |
| `options` | Đúng 4 key `A`,`B`,`C`,`D`. Nguyên văn, bỏ chữ cái đầu "A." |
| `answer` | `"A"`/`"B"`/`"C"`/`"D"` — lấy theo **đáp án khoanh tay** trong ảnh: lựa chọn được khoanh tròn và KHÔNG bị gạch chéo. |
| `answerSource` | `"handwritten"` (khoanh rõ, 1 đáp án) · `"handwritten-corrected"` (có 2 dấu, một bị gạch → lấy cái không gạch) · `"inferred"` (không khoanh → tự chọn theo bài đọc) |
| `needsReview` | `true` khi `answerSource` ≠ `"handwritten"` HOẶC khi đáp án khoanh tay **mâu thuẫn rõ ràng với bài đọc** (vẫn giữ `answer` theo khoanh tay, nhưng nêu nghi vấn trong `explanation` và `notes`). |
| `explanation` | Tiếng Việt, 2–5 câu: (1) đáp án đúng và vì sao, dẫn lại ý trong bài; (2) vì sao các lựa chọn còn lại sai. Với `vocabulary`: ghi nghĩa tiếng Việt của cả 4 từ. Với `reference`: chỉ rõ danh từ được thay thế. |
| `evidence` | Mảng 1–3 đoạn trích **nguyên văn, liên tục** trong `paragraphs[paragraph-1]` (sau khi bỏ markup `**`, `__`, `^^`). Chuỗi phải khớp chính xác từng ký tự (kể cả dấu phẩy, nháy). Ưu tiên 1 câu hoặc mệnh đề đủ ý, ≤ 40 từ. Câu `main-idea` có thể trích câu chủ đề; nếu thật sự không có đoạn cụ thể thì để `[]`. |
| `status` | `"ok"` hoặc `"incomplete"` (đề thiếu dữ liệu để trả lời, vd. P1 Q10 thiếu câu cần chèn — vẫn ghi stem/options, `answer` theo khoanh tay nếu có). |

## Quy ước chung

- Dấu nháy: dùng nháy thẳng `"` `'` (không dùng nháy cong “ ” ‘ ’). Gạch nối dài trong đề → `—`.
- Không bịa text. Chỗ nào ảnh mờ không đọc được → đoán hợp lý nhất và ghi vào `notes`.
- Sau khi viết xong, chạy `node scripts/validate.mjs` và sửa đến khi 0 lỗi.
