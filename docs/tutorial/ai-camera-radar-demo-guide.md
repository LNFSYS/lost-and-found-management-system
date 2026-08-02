# Hướng dẫn demo AI-assisted Operations

Last updated: 2026-08-02

Tài liệu này hướng dẫn demo ba công cụ AI-assisted trên Web. Không cần ứng dụng mobile native và không cần camera rời.

## 1. Cách dùng điện thoại làm camera

`getUserMedia()` chỉ hoạt động trong secure context. `localhost` được chấp nhận trên chính máy tính, nhưng địa chỉ LAN dạng `http://192.168.x.x:5173` thường không được trình duyệt điện thoại cấp camera.

Quy trình đề xuất:

1. Chạy API và Web bằng `npm run dev`.
2. Đặt `FRONTEND_URL`, `SOCKET_CORS_ORIGIN` và URL API theo HTTPS origin dùng để demo; không sửa hoặc commit secret thật.
3. Dùng một secure tunnel HTTPS trỏ tới Web, đồng thời bảo đảm Web gọi được API qua HTTPS tương ứng.
4. Mở URL HTTPS bằng Chrome trên Android hoặc Safari trên iPhone.
5. Đăng nhập Staff/Admin, mở bảng vận hành và chọn `Visual Hunt`.
6. Bấm `Mở camera`; trình duyệt chỉ hỏi quyền sau thao tác này.
7. Hướng camera vào một vật rồi bấm chụp/phân tích. Hệ thống không stream liên tục 30-60 FPS.
8. Tắt camera sau khi quét và kiểm tra đèn/chỉ báo camera của trình duyệt đã dừng.

Không đưa tunnel URL chứa token, API key hoặc mật khẩu vào slide. Thu hồi tunnel sau buổi demo.

### Google Vision trước khi test live

Visual Hunt vẫn nhận ảnh và trả response khi provider chưa sẵn sàng, nhưng lúc đó chỉ dùng metadata/filter fallback. Muốn demo OCR/tag thật cần kiểm tra đủ các điều kiện sau:

1. `GOOGLE_VISION_API_KEY` được đặt trong `.env` cục bộ và không commit.
2. API key thuộc đúng Google Cloud project đang dùng.
3. `Cloud Vision API` đã được enable trong project đó.
4. Project đã liên kết Billing Account. Google có thể trả `403`, `PERMISSION_DENIED`, `BILLING_DISABLED` dù key hợp lệ nếu billing chưa bật.
5. API restriction của key cho phép `Cloud Vision API`. Đây là key dùng từ Node backend, không phải browser key; HTTP referrer restriction có thể làm request server-side bị từ chối.
6. Sau khi đổi API/billing/restriction, đợi vài phút rồi khởi động lại API.

Adapter chỉ log HTTP status, provider status, reason và thông báo đã giới hạn độ dài; API key được redact. Các reason thường gặp:

- `BILLING_DISABLED`: liên kết billing với project;
- `SERVICE_DISABLED`: enable Cloud Vision API;
- lỗi key restriction: cho phép Cloud Vision API và dùng application restriction phù hợp với backend;
- `NOT_CONFIGURED`: biến môi trường chưa có hoặc vẫn là placeholder.

Không đưa API key vào lệnh terminal, ảnh chụp, log, slide hoặc Git. Nếu provider vẫn lỗi, dùng upload ảnh/video fallback và nói rõ đây là rule-based fallback.

## 2. Fallback bắt buộc khi camera không hoạt động

Chuẩn bị trước ba nguồn test không chứa người hoặc dữ liệu nhạy cảm:

- 2-5 ảnh JPG/PNG/WEBP của các vật trên kệ kho;
- một video ngắn quay sẵn, trong đó vật nằm rõ ở giữa khung hình;
- một ảnh có chữ/logo an toàn để minh họa OCR/tag.

Trong Visual Hunt:

1. Dùng `Tải ảnh` để phân tích một ảnh.
2. Dùng `Tải video` và chọn khung hình cần phân tích; video không được gửi liên tục lên server.
3. Dùng batch upload tối đa năm ảnh khi cần quét nhiều góc.
4. Mở candidate card để xem phần trăm và các tín hiệu tương đồng.
5. Staff có thể đánh dấu `candidate` hoặc `không liên quan`; thao tác này chỉ lưu feedback, không đổi trạng thái LOST/FOUND.

Nếu Google Vision không được cấu hình hoặc tạm lỗi, endpoint dùng metadata/filter fallback. Khi bảo vệ, cần nói rõ đây là fallback rule-based, không phải inference hình ảnh đầy đủ.

Khi log có `socket_adapter_ready` với `mode=single-process` và `reason=redis-unavailable`, local MVP một API instance vẫn hoạt động bình thường. Chỉ deployment nhiều API instance mới bắt buộc cấu hình Redis để chia sẻ Socket.IO adapter và distributed rate-limit state.

## 3. Demo câu hỏi xác minh

1. Người đăng FOUND hoặc Staff mở bài FOUND.
2. Yêu cầu hệ thống gợi ý câu hỏi dựa trên loại vật phẩm và metadata riêng.
3. Kiểm tra câu hỏi không tiết lộ thông tin đã công khai trong bài.
4. Nhập đáp án kỳ vọng và duyệt câu hỏi. Database chỉ lưu bcrypt hash của đáp án.
5. Claimant tạo claim và trả lời câu hỏi mà không thấy đáp án kỳ vọng hoặc kết quả đúng/sai.
6. Reviewer xem `Mức hỗ trợ xác thực`; đây chỉ là tín hiệu hỗ trợ, người có thẩm quyền vẫn quyết định.

Không nói: “AI xác nhận đây là chủ sở hữu”.

Nên nói: “Hệ thống tạo câu hỏi theo ngữ cảnh và cung cấp review confidence; quyết định cuối thuộc về người nhặt hoặc Staff.”

## 4. Demo Campus Lost Event Radar

1. Admin nhập một campus event có thời gian, khu vực và nguồn tham chiếu thật hoặc mã bulletin demo rõ ràng.
2. Chạy phân tích dữ liệu LOST trong khoảng thời gian đó.
3. Mở alert để xem khu vực, category, số lượng, baseline ratio, severity và lý do.
4. Staff/Admin acknowledge, resolve hoặc dismiss với lý do.
5. Cho thấy cảnh báo lặp trong cooldown không tạo spam; một episode mới sau cooldown vẫn có thể mở lại.

Radar hiện là phân tích thống kê theo sliding window và baseline 28 ngày. Hệ thống không tự kết luận “do mưa” hoặc “do sự kiện”; mối liên hệ chỉ được trình bày khi Admin đã nhập nguồn dữ liệu tương ứng.

## 5. Privacy checklist trước demo

- [ ] Ảnh/video test không có khuôn mặt, thẻ thật, số điện thoại, email hoặc hóa đơn thật.
- [ ] Không có raw frame/video được lưu sau Visual Hunt scan.
- [ ] Không có raw Cloudinary/storage URL trong response cho người không có quyền.
- [ ] Claimant không thấy expected answer hoặc tín hiệu đúng/sai từng lần thử.
- [ ] Radar chỉ hiển thị aggregate và dữ liệu bài mà Staff có quyền xem qua flow chuẩn.
- [ ] Ba feature flag có thể tắt riêng khi provider hoặc demo environment không ổn định.

## 6. Câu nói an toàn với judge

> Ba công cụ này là AI-assisted decision support. Câu hỏi xác minh dùng template theo ngữ cảnh và metadata; Radar dùng thống kê sliding-window/baseline; Visual Hunt dùng Google Vision OCR/tag kết hợp rule-based similarity. Nhóm không tuyên bố custom-trained model, exact-instance recognition hoặc tự động xác nhận quyền sở hữu.

## 7. Giới hạn hiện tại

- Candidate được trình bày bằng card, chưa có bounding box ổn định trên vật thể.
- Visual Hunt chưa dùng embedding model riêng và không nhận diện đúng một instance cụ thể.
- Radar hiện phân tích bài LOST, chưa có weather/calendar adapter tự động.
- Automated browser test đã kiểm tra camera bị từ chối và batch-image fallback; fake-device video và kiểm thử trên thiết bị thật vẫn cần rehearsal trước ngày bảo vệ.
