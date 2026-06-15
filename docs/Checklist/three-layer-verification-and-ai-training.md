# Three-Layer Verification and AI Training Guide

Last audit: 2026-06-15

File này mô tả hướng xác minh 3 tầng cho FPTU Lost & Found System. Mục tiêu là dùng hệ thống để gợi ý thông minh hơn, nhưng quyết định trả đồ cuối cùng vẫn cần bằng chứng và xác nhận của người có quyền.

## 1. Mục tiêu xác minh 3 tầng

Hệ thống nên dùng 3 tầng để giảm claim sai và giảm rủi ro trả nhầm đồ:

- Tầng 1 - Rule-Based Matching: hệ thống tự tính phần trăm giống nhau giữa bài `LOST` và bài `FOUND` bằng thuật toán hiện tại.
- Tầng 2 - Trained AI Model: model AI được train từ dữ liệu thực tế để phân loại vật phẩm, đánh giá match và cải thiện độ chính xác của gợi ý.
- Tầng 3 - Human Verification: claimant cung cấp bằng chứng; chủ bài/staff/admin kiểm tra trước khi accept và bàn giao.

Luồng tổng quát:

1. User tạo bài `LOST` hoặc `FOUND`.
2. Tầng 1 chạy rule-based matching giữa bài mới và các bài đối lập đang mở.
3. Tầng 2, nếu đã có model riêng, nhận diện ảnh vật phẩm, trích xuất text/logo/brand, so sánh ảnh `LOST` và ảnh `FOUND`, rồi tạo `modelMatchProbability`.
4. Hệ thống lưu metadata từ tầng 2 như category gợi ý, mô tả ảnh, text/OCR, brand/logo và image similarity.
5. Hệ thống chạy lại tầng 1 thêm một lần với dữ liệu đã được AI enrich để double-check.
6. Hệ thống kết hợp điểm tầng 1 sau enrich và điểm tầng 2 để tạo `finalScore`.
7. Nếu điểm đủ cao, hệ thống lưu `match_results`, hiển thị gợi ý và có thể gửi notification.
8. Người nghi là chủ đồ gửi claim kèm mô tả bí mật/evidence.
9. Tầng 3 kiểm tra bằng chứng, yêu cầu bổ sung nếu cần.
10. Chỉ khi bằng chứng hợp lệ mới accept claim và chuyển sang luồng hẹn/bàn giao.

## 2. Tầng 1 - Thuật toán tính phần trăm giống nhau

Tầng 1 là thuật toán hiện tại trong code. Tầng này chưa phải model AI tự train; nó dùng rule, TF-IDF, cosine similarity, category/location/time score và AI tags/OCR nếu có.

Tầng 1 nên chạy 2 lần khi có tầng 2:

- Lần 1: chạy ngay sau khi user tạo bài/upload ảnh để có gợi ý nhanh.
- Lần 2: chạy lại sau khi tầng 2 đã sinh metadata như item name, category suggestion, OCR text, brand/logo và mô tả ảnh. Lần này dùng dữ liệu giàu hơn để double-check kết quả.

Tầng 1 dựa trên 4 nhóm điểm:

| Thành phần | Ý nghĩa | Default weight |
| --- | --- | --- |
| Text score | Độ giống nội dung mô tả, tiêu đề, tag AI/OCR | 40% |
| Category score | Độ giống danh mục đồ vật | 30% |
| Location score | Độ gần vị trí mất/nhặt | 20% |
| Time score | Độ gần thời gian mất/nhặt | 10% |

Các weight lấy từ config:

- `matching.weight_text`, mặc định `0.4`
- `matching.weight_category`, mặc định `0.3`
- `matching.weight_location`, mặc định `0.2`
- `matching.weight_time`, mặc định `0.1`

Ngưỡng xử lý:

- `matching.threshold`, mặc định `0.4`: dưới ngưỡng này thì không lưu match.
- `matching.notification_threshold`, mặc định `0.8`: từ ngưỡng này thì gửi notification match tốt.

### Công thức tầng 1

```txt
ruleBasedScore =
  weightText * textScore
+ weightCategory * categoryScore
+ weightLocation * locationScore
+ weightTime * timeScore

ruleBasedPercent = round(ruleBasedScore * 100)
```

Lưu ý: các weight nên có tổng bằng `1.0`. Nếu sau này cho admin chỉnh weight tự do, nên validate hoặc normalize trước khi tính.

### Text score

Text score dùng TF-IDF + cosine similarity:

1. Ghép text của bài: title, description, category/location text, AI tags/OCR nếu có.
2. Chuẩn hóa tiếng Việt bằng `normalizeText`.
3. Tách token theo khoảng trắng, bỏ token quá ngắn.
4. Tính TF-IDF vector cho bài nguồn và các bài candidate.
5. Tính cosine similarity giữa 2 vector.

Kết quả:

```txt
textScore nằm trong khoảng 0.0 -> 1.0
```

Ý nghĩa:

- `1.0`: nội dung rất giống.
- `0.5`: giống vừa phải.
- `0.0`: gần như không trùng thông tin.

### Category score

```txt
Nếu cùng category cụ thể: 1.0
Nếu cùng category cha hoặc quan hệ cha-con: 0.5
Nếu khác hẳn category: 0.0
Nếu thiếu category: 0.0
```

Ví dụ:

- Cùng là `Tai nghe`: `1.0`
- Một bên `Thiết bị điện tử`, một bên `Tai nghe`: `0.5`
- Một bên `Ví tiền`, một bên `Tai nghe`: `0.0`

### Location score

```txt
Nếu roomText/vị trí chi tiết giống nhau sau normalize: 1.0
Nếu cùng building: 0.7
Nếu cùng area/khu vực lớn: 0.4
Nếu khác khu vực hoặc thiếu dữ liệu: 0.0
```

Ví dụ:

- Cùng nhập `Alpha 301`: `1.0`
- Cùng `Tòa Alpha`: `0.7`
- Cùng khu `Tòa học`: `0.4`
- Một bên nhà xe, một bên căn tin: `0.0`

### Time score

Nếu thiếu thời gian ở một trong hai bài:

```txt
timeScore = 0.0
```

Nếu thời gian mất/nhặt cách nhau không quá 1 ngày:

```txt
timeScore = 1.0
```

Nếu lệch hơn 1 ngày:

```txt
timeScore = 1 / (1 + daysDiff / 7)
```

Ví dụ:

| Lệch thời gian | Time score xấp xỉ |
| --- | --- |
| 0-1 ngày | 100% |
| 7 ngày | 50% |
| 14 ngày | 33% |
| 21 ngày | 25% |

### Ví dụ tính điểm tầng 1

Một bài `LOST` và một bài `FOUND` có:

```txt
textScore = 0.70
categoryScore = 1.00
locationScore = 0.70
timeScore = 0.50
```

Với weight mặc định:

```txt
ruleBasedScore =
  0.4 * 0.70
+ 0.3 * 1.00
+ 0.2 * 0.70
+ 0.1 * 0.50
= 0.28 + 0.30 + 0.14 + 0.05
= 0.77

ruleBasedPercent = 77%
```

Kết luận:

- `77% >= 40%`: lưu vào `match_results`.
- `77% < 80%`: chưa gửi notification high-confidence theo threshold mặc định.

## 3. Tầng 2 - Training Model AI

Tầng 2 là model AI riêng được train từ dữ liệu của hệ thống. Tầng này dùng để cải thiện kết quả gợi ý từ tầng 1, không tự động quyết định trả đồ.

Hiện tại tầng 2 là planned. Khi chưa có model riêng, hệ thống fallback về tầng 1.

### Dữ liệu cần thu thập

Nguồn dữ liệu:

- Ảnh vật phẩm từ bài đăng.
- Tiêu đề/mô tả bài đăng.
- Category user chọn.
- AI tags/OCR hiện có.
- Cặp LOST/FOUND đã match.
- Claim accepted/rejected.
- Feedback đúng/sai từ user/admin.

Nhãn cần có:

- `item_category`: danh mục đúng của vật.
- `object_tags`: tag mô tả vật.
- `match_label`: cặp LOST/FOUND là match đúng hay sai.
- `quality_label`: ảnh rõ/mờ/trùng/rác nếu cần.

### Làm sạch và bảo mật dataset

Trước khi train:

- Xóa hoặc ẩn danh email, số điện thoại, MSSV, địa chỉ liên hệ.
- Không đưa thông tin quá nhạy cảm vào dataset nếu không cần.
- Loại bỏ ảnh không phải vật phẩm.
- Loại bỏ sample spam hoặc feedback đáng ngờ.
- Lưu dataset version để có thể tái lập kết quả train.

### Model nên train

Giai đoạn 1:

- Model phân loại ảnh/category vật phẩm.
- Input: ảnh vật phẩm.
- Output: category suggestion + confidence.

Giai đoạn 2:

- Model semantic matching cho LOST/FOUND.
- Input: text + category + location + time + image embedding.
- Output: `modelMatchProbability`.

Giai đoạn 3:

- Image-to-image comparison.
- Input: ảnh vật phẩm của bài `LOST` và ảnh vật phẩm của bài `FOUND`.
- Output: `imageSimilarityScore`, các vùng ảnh giống nhau nếu model hỗ trợ, và lý do match ngắn gọn.

Giai đoạn 4:

- Hybrid scoring.
- Kết hợp tầng 1 với tầng 2:

```txt
finalScore =
  alpha * enrichedRuleBasedScore
+ beta * modelMatchProbability

finalPercent = round(finalScore * 100)
```

Trong đó `alpha + beta = 1`. `enrichedRuleBasedScore` là điểm tầng 1 sau khi đã chạy lại với metadata từ tầng 2. Ví dụ giai đoạn đầu có thể dùng `alpha = 0.7`, `beta = 0.3`; khi model ổn định hơn có thể tăng `beta`.

### AI Lens response đề xuất

Khi phân tích một ảnh vật phẩm:

```json
{
  "itemName": "tai nghe không dây",
  "categorySuggestion": "Thiết bị điện tử > Tai nghe",
  "description": "Hộp tai nghe màu trắng, kiểu dáng giống AirPods",
  "brand": "Apple",
  "visibleText": ["AirPods Pro"],
  "serialCandidates": ["A2698"],
  "colors": ["trắng"],
  "confidence": 0.86
}
```

Khi so sánh 2 ảnh `LOST` và `FOUND`:

```json
{
  "imageSimilarityScore": 0.82,
  "sameItemProbability": 0.76,
  "matchingSignals": ["cùng kiểu tai nghe", "cùng màu trắng", "logo Apple tương đồng"],
  "mismatchSignals": ["không đọc được serial ở ảnh LOST"],
  "modelVersion": "ai-lens-v1"
}
```

### Metrics đánh giá

Không chỉ nhìn accuracy. Nên đo:

- Precision: trong các match hệ thống gợi ý, bao nhiêu cái đúng.
- Recall: trong các match đúng thật, hệ thống tìm được bao nhiêu cái.
- F1-score: cân bằng precision và recall.
- Top-k accuracy: match đúng có nằm trong top 3/top 5 gợi ý không.
- False positive rate: tỷ lệ gợi ý sai nhưng điểm cao.

Với hệ thống Lost & Found, nên ưu tiên precision cao để tránh gợi ý sai quá nhiều và tránh trả nhầm đồ.

### Deploy và fallback

Khi có model riêng:

1. Deploy model thành inference service riêng.
2. API gọi model để lấy category suggestion, OCR/text, brand/logo, image similarity hoặc `modelMatchProbability`.
3. Sau khi nhận metadata tầng 2, API lưu metadata vào post/AI tags rồi trigger tầng 1 chạy lại để double-check.
4. Nếu model lỗi hoặc timeout, fallback về Google Vision/rule matching hiện tại.
5. Lưu `model_version` vào kết quả AI/matching để audit.
6. Chỉ bật model mới nếu metrics đạt ngưỡng và được admin approve.

## 4. Tầng 3 - Human Verification

Tầng 3 dùng để xác minh quyền sở hữu thật. Đây là tầng cuối cùng và quan trọng nhất trước khi accept claim hoặc bàn giao.

Thông tin claimant cần cung cấp:

- Mô tả chi tiết vật bị mất.
- Dấu hiệu riêng: vết trầy, sticker, màu, serial, hình nền, vật bên trong.
- Thời gian mất gần đúng.
- Vị trí mất gần đúng.
- Ảnh/bằng chứng nếu có.

Người kiểm tra cần làm:

1. So sánh mô tả bí mật với thông tin chủ bài đang giữ.
2. Kiểm tra evidence có liên quan thật không.
3. Kiểm tra timeline có hợp lý không.
4. So sánh với điểm gợi ý tầng 1 và tầng 2, nhưng không phụ thuộc hoàn toàn vào điểm.
5. Nếu thiếu thông tin, chuyển claim sang `NEED_MORE_INFO`.
6. Nếu claimant đã bổ sung evidence mới và hợp lệ, mới accept.
7. Nếu bằng chứng không khớp, reject kèm lý do.

Rule quan trọng:

- Điểm tầng 1 hoặc tầng 2 cao không đồng nghĩa được nhận đồ.
- Tầng 2 AI chỉ là trợ lý gợi ý, không được tự động accept claim.
- Claim `NEED_MORE_INFO` chỉ được accept khi có evidence mới sau yêu cầu bổ sung.
- Sau khi claim accepted mới được tạo lịch hẹn/bàn giao.
- Toàn bộ transition trạng thái claim nên đi qua Java Admin Service có row lock.

## 5. Checklist triển khai

- [ ] Tách rõ UI hiển thị điểm tầng 1, điểm tầng 2 và trạng thái kiểm tra tầng 3.
- [ ] Hiển thị breakdown tầng 1: text/category/location/time.
- [ ] Validate tổng matching weight tầng 1 bằng `1.0` hoặc normalize trước khi tính.
- [ ] Thêm admin action chạy lại matching thủ công.
- [ ] Thêm background queue cho matching khi dữ liệu lớn.
- [ ] Thêm form feedback match đúng/sai để phục vụ tầng 2.
- [ ] Thiết kế bảng lưu training samples/labels.
- [ ] Thiết kế bảng model registry.
- [ ] Làm pipeline export/anonymize dataset.
- [ ] Train model category/image đầu tiên.
- [ ] Train model semantic matching sau khi đủ labeled data.
- [ ] Train hoặc tích hợp model so sánh ảnh LOST/FOUND.
- [ ] Lưu metadata AI Lens: item name, category suggestion, OCR text, brand/logo, colors.
- [ ] Sau khi tầng 2 trả metadata, trigger tầng 1 chạy lại để double-check.
- [ ] Thêm inference endpoint và fallback.
- [ ] Lưu `ruleBasedScore`, `enrichedRuleBasedScore`, `imageSimilarityScore`, `modelMatchProbability`, `finalScore` và `model_version`.
- [ ] Thêm dashboard training/model metrics cho admin.
- [ ] Đảm bảo human verification tầng 3 vẫn là bước quyết định cuối cùng trước khi trả đồ.
