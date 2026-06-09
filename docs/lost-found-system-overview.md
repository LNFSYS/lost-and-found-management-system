# HỆ THỐNG QUẢN LÝ TÌM KIẾM ĐỒ THẤT LẠC TẠI FPT UNIVERSITY ĐÀ NẴNG
## LOST & FOUND MANAGEMENT SYSTEM FOR FPT UNIVERSITY DA NANG CAMPUS — ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHIỆP

---

> **Trường:** FPT University — Campus Đà Nẵng  
> **Sinh viên thực hiện:** Võ Chiêu Quân, Phạm Nguyễn Anh Khoa, Trần Nguyễn Phong, Trương Quang Đạt, Trần Thế Lượng  
> **Giảng viên hướng dẫn:** Nguyễn Thị Anh Đào  
> **Học kỳ / Năm học:** FA26 / 2026

---

## MỤC LỤC

1. [Giới thiệu và đặt vấn đề](#1-giới-thiệu-và-đặt-vấn-đề)
2. [Mục tiêu hệ thống](#2-mục-tiêu-hệ-thống)
3. [Phạm vi và đối tượng sử dụng](#3-phạm-vi-và-đối-tượng-sử-dụng)
4. [Phân tích yêu cầu hệ thống](#4-phân-tích-yêu-cầu-hệ-thống)
5. [Chức năng chính](#5-chức-năng-chính)
6. [Tính năng nâng cao và AI](#6-tính-năng-nâng-cao-và-ai)
7. [Kiến trúc hệ thống](#7-kiến-trúc-hệ-thống)
8. [Thiết kế cơ sở dữ liệu](#8-thiết-kế-cơ-sở-dữ-liệu)
9. [Thuật toán Matching — Điểm kỹ thuật cốt lõi](#9-thuật-toán-matching--điểm-kỹ-thuật-cốt-lõi)
10. [Luồng hoạt động hệ thống](#10-luồng-hoạt-động-hệ-thống)
11. [Công nghệ sử dụng](#11-công-nghệ-sử-dụng)
12. [Kế hoạch thực hiện](#12-kế-hoạch-thực-hiện)
13. [Rủi ro và giải pháp](#13-rủi-ro-và-giải-pháp)
14. [Kết luận và hướng phát triển](#14-kết-luận-và-hướng-phát-triển)
15. [Use Case chi tiết và phân công công việc](#15-use-case-chi-tiết-và-phân-công-công-việc)

---

## 1. Giới thiệu và đặt vấn đề

### 1.1 Bối cảnh

Trong môi trường đại học với hàng nghìn sinh viên, giảng viên và nhân viên di chuyển mỗi ngày, việc thất lạc đồ vật cá nhân là vấn đề diễn ra rất phổ biến. Các vật dụng thường bị mất bao gồm: thẻ sinh viên, ví, điện thoại, chìa khóa, laptop, balo, tài liệu học tập và nhiều vật dụng khác.

Hiện tại, hầu hết các trường đại học tại Việt Nam chưa có một hệ thống tập trung và hiệu quả để xử lý vấn đề này. Các giải pháp phổ biến hiện tại đều tồn tại nhiều hạn chế nghiêm trọng:

| Phương thức hiện tại | Hạn chế |
|---|---|
| Đăng lên group Facebook | Thông tin trôi nhanh, khó tìm lại, không có cơ chế xác minh |
| Nhờ bảo vệ giữ hộ | Không có hệ thống quản lý, dễ thất lạc thêm |
| Dán tờ thông báo | Tốn công, phạm vi tiếp cận hạn chế |
| Truyền miệng | Hiệu quả thấp, phụ thuộc may rủi |

### 1.2 Vấn đề cần giải quyết

Từ thực trạng trên, hệ thống cần giải quyết các bài toán cốt lõi:

1. **Bài toán kết nối:** Người mất đồ và người nhặt được đồ khó tìm thấy nhau trong thời gian ngắn
2. **Bài toán xác minh:** Không có cơ chế đảm bảo đồ được trả đúng chủ nhân
3. **Bài toán tự động hóa:** Việc khớp thông tin (matching) hiện hoàn toàn thủ công, tốn thời gian
4. **Bài toán quản trị:** Nhà trường không có dữ liệu để cải thiện an ninh và hạ tầng

### 1.3 Giải pháp đề xuất

Dự án đề xuất xây dựng **Lost & Found Management System for FPT University Đà Nẵng** — một hệ thống quản lý đồ thất lạc gồm **website, mobile application và backend API dùng chung**, tích hợp các tính năng AI nhẹ để:
- Kết nối người mất đồ và người nhặt được đồ trên cùng một nền tảng tập trung
- Tự động gợi ý khớp bài đăng (Matching) dựa trên nội dung mô tả, danh mục, vị trí và thời gian
- Hỗ trợ nhận diện hình ảnh, OCR và gợi ý tag/danh mục đồ vật thông qua Google Cloud Vision API
- Xác minh danh tính, xác minh quyền sở hữu trước khi trao trả đồ bằng Evidence-based Claim Form
- Quản lý điểm tiếp nhận/trả đồ tập trung trong campus như quầy bảo vệ, thư viện, phòng CTSV hoặc lễ tân
- Hỗ trợ đặt lịch hẹn trả đồ sau khi Claim được chấp nhận
- Cung cấp cấu hình hệ thống cho Admin như chính sách đăng ký email, thời hạn bài đăng, ngưỡng matching, giới hạn đăng bài và danh mục/khu vực campus
- Cung cấp thống kê, báo cáo và công cụ kiểm duyệt cho ban quản lý nhà trường

---

## 2. Mục tiêu hệ thống

### 2.1 Mục tiêu tổng quát

Xây dựng một hệ thống quản lý đồ thất lạc hoàn chỉnh cho FPT University Đà Nẵng, bao gồm website, mobile application và backend API dùng chung. Hệ thống có khả năng triển khai thực tế trong môi trường đại học, ứng dụng kỹ thuật xử lý văn bản, matching tự động và nhận diện hình ảnh để nâng cao hiệu quả tìm kiếm, xác minh và trao trả đồ thất lạc.

### 2.2 Mục tiêu cụ thể

- **Mục tiêu 1:** Xây dựng website và mobile application cho phép đăng bài, tìm kiếm, lọc và quản lý đồ thất lạc với đầy đủ tính năng CRUD và phân quyền người dùng
- **Mục tiêu 2:** Xây dựng hệ thống RESTful API dùng chung cho cả Web và Mobile client
- **Mục tiêu 3:** Triển khai thuật toán Matching tự động sử dụng TF-IDF + Cosine Similarity kết hợp scoring đa tiêu chí
- **Mục tiêu 4:** Tích hợp Google Cloud Vision API để hỗ trợ OCR, nhận diện hình ảnh và gợi ý danh mục đồ vật
- **Mục tiêu 5:** Xây dựng hệ thống chat real-time và thông báo tự động bằng WebSocket/Socket.IO
- **Mục tiêu 6:** Triển khai cơ chế Claim Verification để xác minh quyền sở hữu đồ vật trước khi bàn giao
- **Mục tiêu 7:** Cung cấp dashboard thống kê trực quan cho quản trị viên (Admin)
- **Mục tiêu 8:** Tích hợp Cloudinary để upload, lưu trữ, quản lý và hiển thị ảnh cho bài đăng, claim evidence, chat và avatar người dùng
- **Mục tiêu 9:** Xây dựng chức năng Campus Lost Item Handover Point để quản lý điểm tiếp nhận, lưu giữ và bàn giao đồ thất lạc trong campus
- **Mục tiêu 10:** Xây dựng chức năng Item Return Appointment để người dùng đặt lịch, đổi lịch, hủy lịch và xác nhận buổi trao trả đồ
- **Mục tiêu 11:** Nâng cấp Claim Verification thành Evidence-based Claim Form, cho phép người nhận đồ cung cấp bằng chứng sở hữu rõ ràng
- **Mục tiêu 12:** Xây dựng Admin Configuration để quản trị viên cấu hình rule hệ thống mà không cần sửa code

---

## 3. Phạm vi và đối tượng sử dụng

### 3.1 Đối tượng người dùng

```
┌─────────────────────────────────────────────────┐
│              NGƯỜI DÙNG HỆ THỐNG                │
├──────────────┬──────────────────┬───────────────┤
│   SINH VIÊN  │   GIẢNG VIÊN    │   NHÂN VIÊN   │
│              │                  │               │
│  - Đăng ký   │  - Đăng ký      │  - Đăng ký   │
│    bằng email│    bằng email    │    bằng email │
│    trường    │    trường        │    trường     │
└──────────────┴──────────────────┴───────────────┘
                          │
                ┌─────────┴─────────┐
                │   QUẢN TRỊ VIÊN   │
                │      (Admin)      │
                │                   │
                │  - Kiểm duyệt    │
                │  - Quản lý users │
                │  - Xem thống kê  │
                └───────────────────┘
```

### 3.2 Phạm vi địa lý

Hệ thống được xây dựng trong phạm vi **FPT University — Campus Đà Nẵng**. Dữ liệu vị trí trong hệ thống được tổ chức theo cấu trúc phân cấp để phù hợp với môi trường trường học:
- **Cấp độ 1 — Khu vực:** Khu học tập, thư viện, căng-tin, sân trường, bãi xe, ký túc xá...
- **Cấp độ 2 — Tòa nhà:** Các tòa nhà/khu chức năng trong campus
- **Cấp độ 3 — Phòng/Tầng/Vị trí cụ thể:** Phòng học, tầng, quầy bảo vệ, khu vực gửi đồ...

### 3.3 Phạm vi chức năng

**Nằm trong phạm vi đồ án:**
- Website application cho người dùng và quản trị viên
- Mobile application bằng React Native cho các chức năng người dùng chính
- Hệ thống RESTful API dùng chung cho Web và Mobile client
- Quản lý bài đăng LOST / FOUND
- Matching tự động bằng TF-IDF, Cosine Similarity và scoring đa tiêu chí
- Chat và thông báo real-time bằng WebSocket/Socket.IO
- Hệ thống Claim + xác minh quyền sở hữu
- Dashboard thống kê Admin
- Nhận diện hình ảnh, OCR và gợi ý tag bằng Google Cloud Vision API
- Upload và lưu trữ ảnh bằng Cloudinary cho bài đăng, bằng chứng claim, chat và avatar
- Campus Lost Item Handover Point: quản lý điểm tiếp nhận/trả đồ tập trung trong campus
- Item Return Appointment: tạo, xác nhận, đổi lịch, hủy lịch và nhắc lịch trao trả đồ
- Evidence-based Claim Form: cung cấp bằng chứng sở hữu bằng văn bản, ảnh và thông tin thời gian/vị trí
- Admin Configuration: cấu hình chính sách đăng ký email, thời hạn bài đăng, giới hạn đăng bài/ngày, danh mục, khu vực, ngưỡng matching và rule thông báo
- Hệ thống điểm uy tín (Reputation Score)

**Không nằm trong phạm vi (hướng mở rộng tương lai):**
- Ứng dụng native riêng biệt viết bằng Swift/Kotlin
- Tích hợp camera an ninh trực tiếp
- Thanh toán phí dịch vụ
- Mô hình SaaS mở rộng cho nhiều trường đại học

---

## 4. Phân tích yêu cầu hệ thống

### 4.1 Yêu cầu chức năng (Functional Requirements)

| Mã | Yêu cầu | Mức độ ưu tiên |
|---|---|---|
| FR-01 | Đăng ký / Đăng nhập bằng email hợp lệ bất kỳ | Cao |
| FR-02 | Xác thực và phân quyền bằng JWT theo vai trò User/Admin | Cao |
| FR-03 | Tạo bài đăng LOST với ảnh, mô tả, vị trí, thời gian | Cao |
| FR-04 | Tạo bài đăng FOUND với ảnh, mô tả, vị trí, thời gian | Cao |
| FR-05 | Tìm kiếm toàn văn bản và lọc bài đăng đa tiêu chí | Cao |
| FR-06 | Matching tự động và gợi ý bài đăng liên quan | Cao |
| FR-07 | Gửi yêu cầu Claim kèm thông tin xác minh | Cao |
| FR-08 | Chấp nhận / Từ chối Claim | Cao |
| FR-09 | Chat real-time giữa hai bên bằng Socket.IO | Trung bình |
| FR-10 | Gửi thông báo khi có Matching mới, Claim mới hoặc tin nhắn mới | Trung bình |
| FR-11 | Nhận diện loại đồ vật, OCR và gợi ý tag từ hình ảnh | Trung bình |
| FR-12 | Hệ thống điểm uy tín người dùng | Trung bình |
| FR-13 | Dashboard thống kê cho Admin | Trung bình |
| FR-14 | Quản lý và kiểm duyệt bài đăng (Admin) | Cao |
| FR-15 | Báo cáo vi phạm | Thấp |
| FR-16 | Hỗ trợ giao diện Web và Mobile dùng chung backend API | Cao |
| FR-17 | Upload, lưu trữ, xóa và quản lý ảnh qua Cloudinary | Cao |
| FR-18 | Quản lý điểm tiếp nhận/trả đồ tập trung trong campus | Cao |
| FR-19 | Gán bài FOUND hoặc đồ đang lưu giữ với một handover point cụ thể | Cao |
| FR-20 | Đặt lịch hẹn trao trả đồ sau khi Claim được chấp nhận | Cao |
| FR-21 | Gửi nhắc lịch hẹn trước thời gian trao trả | Trung bình |
| FR-22 | Claim bằng form bằng chứng gồm mô tả bí mật, ảnh chứng minh, thời gian/vị trí mất gần đúng | Cao |
| FR-23 | Người giữ đồ hoặc Admin xem xét bằng chứng Claim và từ chối kèm lý do | Cao |
| FR-24 | Admin cấu hình rule hệ thống như chính sách đăng ký email, thời hạn bài đăng, giới hạn đăng bài/ngày, danh mục, campus location, ngưỡng matching và rule thông báo | Cao |
| FR-25 | Lưu lịch sử thay đổi cấu hình hệ thống | Trung bình |

### 4.2 Yêu cầu phi chức năng (Non-Functional Requirements)

| Loại | Yêu cầu |
|---|---|
| **Hiệu năng** | Thời gian phản hồi API < 500ms; Matching tính toán < 2 giây |
| **Bảo mật** | JWT Authentication; email hợp lệ bất kỳ được đăng ký; xác minh email qua OTP; mã hóa mật khẩu bcrypt |
| **Khả dụng** | Uptime > 99% trong giờ học; hỗ trợ ít nhất 200 người dùng đồng thời |
| **Mở rộng** | Kiến trúc Layered / RESTful cho phép mở rộng module dễ dàng |
| **Khả năng dùng** | Giao diện responsive, hỗ trợ desktop và mobile browser |
| **Dữ liệu** | MySQL có quan hệ và ràng buộc chặt chẽ; lưu ảnh trên cloud storage; backup database định kỳ |

---

## 5. Chức năng chính

### 5.1 Xác thực và phân quyền

**Đăng ký tài khoản:**
- Chấp nhận email hợp lệ bất kỳ, không bắt buộc domain trường
- Xác minh email qua OTP (One-Time Password)
- Thông tin hồ sơ: Tên, MSSV/mã nhân viên, ảnh đại diện, số điện thoại (tùy chọn)

**Đăng nhập:**
- Đăng nhập bằng email + mật khẩu
- Hỗ trợ đăng nhập bằng Google (OAuth2) với email hợp lệ bất kỳ
- JWT token với refresh token (access token hết hạn sau 1 giờ)

**Phân quyền:**

```
ROLE_USER    → Toàn bộ chức năng người dùng thông thường
ROLE_ADMIN   → Quản lý toàn bộ hệ thống + dashboard
```

---

### 5.2 Quản lý bài đăng

**Tạo bài đăng LOST (Báo mất đồ):**

```
Trường bắt buộc:
  ├── Tiêu đề (tối đa 100 ký tự)
  ├── Mô tả chi tiết (đặc điểm nhận dạng, màu sắc, nhãn hiệu...)
  ├── Danh mục (Category): Điện tử / Giấy tờ / Phụ kiện / Quần áo / Khác
  ├── Vị trí mất (Khu vực → Tòa nhà → Phòng)
  └── Thời gian mất (date + time)

Trường tùy chọn:
  ├── Hình ảnh (tối đa 5 ảnh, tự động nhận diện danh mục)
  ├── Thông tin liên hệ muốn hiển thị công khai
  └── Thông tin xác minh bí mật (không hiển thị công khai — dùng để xác minh Claim)
```

**Tạo bài đăng FOUND (Đăng đồ nhặt được):**

```
Trường bắt buộc:
  ├── Tiêu đề
  ├── Mô tả chi tiết (mô tả những gì nhìn thấy)
  ├── Danh mục
  ├── Vị trí nhặt được
  ├── Thời gian nhặt được
  └── Nơi đang giữ đồ (vị trí hiện tại của vật)

Trường tùy chọn:
  └── Hình ảnh (tối đa 5 ảnh)
```

**Trạng thái bài đăng:**

```
OPEN ──────► MATCHED ──────► RESOLVED
  │                               │
  │                               │
  └───────► EXPIRED (sau 30 ngày không giải quyết)
  │
  └───────► CLOSED (người dùng tự đóng)
```

---

### 5.3 Tìm kiếm và lọc

**Full-text Search:**
- Tìm kiếm theo từ khóa trong tiêu đề + mô tả
- Hỗ trợ tiếng Việt (có dấu và không dấu đều tìm được)
- Gợi ý từ khóa (autocomplete)

**Bộ lọc đa tiêu chí:**

```
Loại bài:    [LOST] [FOUND] [Tất cả]
Danh mục:    [Điện tử] [Giấy tờ] [Phụ kiện] [Quần áo] [Khác]
Khu vực:     [Dropdown theo khu vực trường]
Thời gian:   [Hôm nay] [7 ngày] [30 ngày] [Tùy chỉnh]
Trạng thái:  [OPEN] [MATCHED] [RESOLVED]
Sắp xếp:     [Mới nhất] [Điểm khớp cao nhất] [Gần vị trí của tôi]
```

---

### 5.4 Hệ thống Matching tự động ⭐

*(Xem chi tiết thuật toán tại mục 9)*

Khi một bài LOST hoặc FOUND được đăng mới, hệ thống **tự động** chạy thuật toán Matching để tìm các bài có khả năng liên quan, sau đó:
1. Hiển thị danh sách "Bài đăng có thể liên quan" trên giao diện
2. Gửi thông báo email + in-app đến người dùng liên quan nếu điểm khớp > ngưỡng cấu hình (mặc định 60%)

---

### 5.5 Hệ thống Claim (Yêu cầu nhận lại đồ)

**Quy trình Claim:**

```
Bước 1 — Người mất gửi Claim:
  └── Điền thông tin xác minh: đặc điểm riêng của đồ (màu sắc bên trong ví,
      dữ liệu trên thiết bị, vết trầy xước đặc biệt, v.v.)
  
Bước 2 — Người nhặt xem xét:
  ├── Xem thông tin xác minh
  ├── Chấp nhận → Thỏa thuận thời gian/địa điểm trao trả qua Chat
  └── Từ chối → Người mất được thông báo và có thể gửi Claim khác
  
Bước 3 — Hoàn tất:
  └── Cả hai bên xác nhận đã trao trả → Trạng thái chuyển sang RESOLVED
      → Cả hai nhận điểm uy tín
```

**Bảo vệ thông tin xác minh:**
- Thông tin xác minh trong Claim chỉ được hiển thị cho người đăng bài FOUND
- Không lưu trữ công khai, được mã hóa trong database

---

### 5.6 Chat real-time

- **Kênh chat** được tự động tạo khi một Claim được chấp nhận
- Sử dụng **WebSocket/Socket.IO** trong Node.js backend để xử lý giao tiếp thời gian thực
- Web client dùng **Socket.IO Client**; mobile client dùng **Socket.IO Client** trong React Native
- Tính năng:
  - Gửi tin nhắn văn bản
  - Gửi hình ảnh
  - Trạng thái đã đọc (seen)
  - Thông báo realtime (badge số lượng tin nhắn chưa đọc)
- Lịch sử chat được lưu trữ trong MySQL và có thể truy cập lại

---

### 5.7 Hệ thống thông báo

| Sự kiện | Kênh thông báo |
|---|---|
| Có bài FOUND khớp với bài LOST của bạn | Email + In-app |
| Có người gửi Claim cho bài FOUND của bạn | Email + In-app |
| Claim của bạn được chấp nhận / từ chối | Email + In-app |
| Có tin nhắn mới trong Chat | In-app realtime (Socket.IO) |
| Bài đăng sắp hết hạn (còn 3 ngày) | Email |
| Đồ vật của bạn đã được trả thành công | Email + In-app |

---

### 5.8 Hệ thống điểm uy tín (Reputation Score)

Mỗi người dùng có một **Reputation Score** (thang 0–100) được tính dựa trên hành vi:

| Hành động | Điểm thay đổi |
|---|---|
| Trả lại đồ thành công (xác nhận RESOLVED) | +10 điểm |
| Claim thành công (nhận lại được đồ) | +5 điểm |
| Bị từ chối Claim vì thông tin sai | -2 điểm |
| Bài đăng bị Admin xóa do vi phạm | -10 điểm |
| Được đánh giá 5 sao sau trao trả | +3 điểm |
| Không phản hồi Claim trong 48 giờ | -1 điểm |

**Cấp bậc uy tín:**

```
Mới (0–19)   → Chưa có lịch sử giao dịch
Đáng tin (20–49)  → Đã thực hiện một số giao dịch
Uy tín (50–79)  → Được cộng đồng tin tưởng
Xuất sắc (80–100) → Nhận huy hiệu vàng, ưu tiên hiển thị
```


---

### 5.9 Upload và quản lý ảnh bằng Cloudinary

Hệ thống sử dụng **Cloudinary** để lưu trữ ảnh thay vì lưu trực tiếp trong server. Cách này giúp giảm tải backend, dễ hiển thị ảnh trên Web/Mobile và phù hợp với môi trường deploy Render/Vercel.

**Loại ảnh cần hỗ trợ:**
- Ảnh bài đăng LOST/FOUND
- Ảnh bằng chứng trong Evidence-based Claim Form
- Ảnh gửi trong chat
- Ảnh đại diện người dùng
- Ảnh minh chứng do Admin/Staff tải lên khi nhận đồ tại handover point

**Luồng upload ảnh:**

```
User chọn ảnh trên Web/Mobile
        │
        ▼
Frontend gọi API lấy upload signature hoặc upload endpoint
        │
        ▼
Ảnh được upload lên Cloudinary
        │
        ▼
Cloudinary trả về secure_url, public_id, format, size
        │
        ▼
Backend lưu metadata ảnh vào MySQL
        │
        ▼
Web/Mobile dùng secure_url để hiển thị ảnh
```

**Yêu cầu xử lý ảnh:**
- Kiểm tra định dạng: JPG, JPEG, PNG, WEBP
- Giới hạn dung lượng ảnh theo cấu hình Admin
- Tạo thumbnail/optimized image để hiển thị danh sách bài đăng
- Lưu `public_id` để có thể xóa ảnh trên Cloudinary khi bài đăng bị xóa
- Không hiển thị ảnh bằng chứng Claim ra public
- Ảnh bài đăng có thể được gửi sang Google Cloud Vision API để nhận diện danh mục, OCR và gợi ý tag

---

### 5.10 Campus Lost Item Handover Point

Campus Lost Item Handover Point là chức năng quản lý các điểm tiếp nhận, lưu giữ và bàn giao đồ thất lạc trong khuôn viên FPT University Đà Nẵng, ví dụ: quầy bảo vệ, thư viện, phòng CTSV, lễ tân hoặc khu vực hỗ trợ sinh viên.

**Mục đích:**
- Giúp người nhặt đồ gửi đồ về nơi chính thức thay vì tự giữ lâu
- Giúp người mất đồ biết chính xác nơi đang lưu giữ đồ
- Giúp Admin/Staff quản lý danh sách đồ đang chờ nhận
- Tăng tính thực tế và phù hợp với quy trình vận hành của trường

**Luồng chính:**

```
Người dùng tạo bài FOUND
        │
        ▼
Chọn nơi đang giữ đồ hoặc chọn gửi về handover point
        │
        ▼
Admin/Staff xác nhận đã nhận đồ tại điểm tiếp nhận
        │
        ▼
Hệ thống cập nhật trạng thái lưu giữ và vị trí hiện tại của đồ
        │
        ▼
Người mất đồ sau khi Claim thành công đến đúng điểm để nhận lại đồ
        │
        ▼
Admin/Staff xác nhận đã bàn giao đồ
```

**Trạng thái lưu giữ đề xuất:**

```
NOT_STORED        → Người nhặt đang giữ đồ
PENDING_HANDOVER  → Đang chờ gửi tới điểm tiếp nhận
STORED_AT_POINT   → Đồ đã được lưu tại điểm tiếp nhận
PICKUP_SCHEDULED  → Đã có lịch hẹn nhận đồ
RETURNED          → Đã trả cho chủ sở hữu
UNCLAIMED         → Quá hạn chưa có người nhận
```

---

### 5.11 Item Return Appointment

Item Return Appointment cho phép người mất đồ và người nhặt đồ/Staff đặt lịch trao trả sau khi Claim được chấp nhận. Chức năng này giúp quá trình trả đồ rõ ràng, có thời gian, địa điểm và trạng thái xác nhận.

**Điều kiện tạo lịch hẹn:**
- Claim phải ở trạng thái `ACCEPTED`
- Bài đăng chưa ở trạng thái `RESOLVED`
- Người tạo lịch phải là người gửi Claim, người đăng FOUND, Staff hoặc Admin liên quan

**Luồng chính:**

```
Claim được chấp nhận
        │
        ▼
Một bên đề xuất thời gian và địa điểm trả đồ
        │
        ▼
Bên còn lại chấp nhận, từ chối hoặc đề xuất lại
        │
        ▼
Hệ thống gửi notification/email nhắc lịch
        │
        ▼
Hai bên gặp nhau hoặc đến handover point để nhận đồ
        │
        ▼
Hai bên hoặc Staff xác nhận hoàn tất
        │
        ▼
Bài đăng chuyển sang RESOLVED và cập nhật Reputation Score
```

**Trạng thái lịch hẹn:**

```
PROPOSED → ACCEPTED → COMPLETED
    │          │
    │          ├── RESCHEDULED
    │          └── CANCELLED
    └── REJECTED
```

---

### 5.12 Evidence-based Claim Form

Evidence-based Claim Form là phiên bản chi tiết hơn của Claim Verification. Người muốn nhận lại đồ phải cung cấp bằng chứng sở hữu rõ ràng để giảm nguy cơ nhận nhầm hoặc giả mạo.

**Thông tin trong form Claim:**
- Mô tả đặc điểm bí mật của đồ vật
- Thời gian mất gần đúng
- Vị trí mất gần đúng
- Ảnh chứng minh quyền sở hữu, ví dụ ảnh cũ của món đồ, hóa đơn, ảnh thẻ, ảnh phụ kiện đi kèm
- Ghi chú bổ sung cho người giữ đồ hoặc Admin

**Nguyên tắc bảo mật:**
- Bằng chứng Claim không hiển thị công khai
- Chỉ người đăng bài FOUND, Staff/Admin được phân quyền mới được xem
- Ảnh bằng chứng lưu trên Cloudinary nhưng URL chỉ được lưu và truy cập qua API có kiểm tra quyền
- Người từ chối Claim phải nhập lý do để tránh xử lý cảm tính

**Kết quả xử lý Claim:**

```
PENDING       → Đang chờ xem xét
NEED_MORE_INFO → Cần bổ sung bằng chứng
ACCEPTED      → Được chấp nhận, có thể tạo lịch hẹn trả đồ
REJECTED      → Bị từ chối kèm lý do
CANCELLED     → Người gửi tự hủy Claim
```

---

### 5.13 Admin Configuration Management

Admin Configuration Management cho phép Admin cấu hình các rule quan trọng của hệ thống mà không cần sửa code hoặc deploy lại backend.

**Nhóm cấu hình chính:**

| Nhóm cấu hình | Ví dụ |
|---|---|
| Email policy | Chấp nhận email hợp lệ bất kỳ, không bắt buộc domain trường |
| Post rule | Thời hạn bài đăng, số bài tối đa/ngày, số ảnh tối đa/bài |
| Matching rule | Ngưỡng điểm hiển thị, ngưỡng gửi thông báo, trọng số text/category/location/time |
| Category | Danh mục đồ vật, nhóm cha/con |
| Campus location | Khu vực, tòa nhà, phòng/tầng, handover point |
| Notification rule | Bật/tắt email, in-app, realtime, digest |
| Upload rule | Dung lượng ảnh tối đa, định dạng ảnh cho phép, folder Cloudinary |

**Yêu cầu quản trị:**
- Chỉ Admin được thay đổi cấu hình
- Lưu lịch sử thay đổi cấu hình gồm người thay đổi, thời điểm, giá trị cũ và giá trị mới
- Các cấu hình quan trọng như chính sách đăng ký email, matching threshold, post expiration phải được backend sử dụng trực tiếp
- Web/Mobile có thể đọc một số cấu hình public như danh mục, khu vực, giới hạn upload để validate trước khi gửi request

---

## 6. Tính năng nâng cao và AI

### 6.1 Nhận diện hình ảnh tự động (Image Classification) ⭐

Khi người dùng upload ảnh đồ vật, hệ thống tự động lưu ảnh lên **Cloudinary**, sau đó backend sử dụng URL ảnh để phân tích bằng Google Cloud Vision API.

Quy trình xử lý ảnh:
1. Upload ảnh lên Cloudinary và lưu metadata gồm `secure_url`, `public_id`, `format`, `size`, `folder`, `owner_type`
2. Gọi **Google Cloud Vision API** (hoặc model ResNet được fine-tune nhẹ) để nhận diện nội dung ảnh
3. Ánh xạ kết quả nhận diện sang các danh mục hệ thống (Điện tử, Giấy tờ, v.v.)
4. Tự động điền sẵn trường "Danh mục" — người dùng chỉ cần xác nhận hoặc điều chỉnh
5. Trích xuất các **tag** mô tả vật (ví dụ: "màu đen", "leather", "Apple logo") và gợi ý thêm vào mô tả

**Lợi ích:** Giảm thiểu lỗi phân loại của người dùng, cải thiện chất lượng dữ liệu cho Matching.

---

### 6.2 Thống kê và trực quan hóa (Admin Dashboard) ⭐

Admin có giao diện dashboard với các biểu đồ:

**Tổng quan:**
- Tổng số bài đăng LOST / FOUND theo tuần/tháng
- Tỷ lệ giải quyết thành công (RESOLVED / tổng OPEN)
- Số người dùng mới đăng ký theo thời gian

**Heatmap khu vực:**
- Bản đồ nhiệt (heatmap) của khuôn viên trường hiển thị khu vực có tần suất mất đồ cao
- Giúp ban quản lý nhà trường xác định điểm cần tăng cường an ninh hoặc camera

**Phân tích danh mục:**
- Biểu đồ tròn: Loại đồ vật bị mất nhiều nhất
- Biểu đồ cột: So sánh tỷ lệ tìm lại được theo từng danh mục

**Thống kê người dùng:**
- Bảng xếp hạng top người dùng uy tín cao nhất
- Danh sách người dùng có hành vi đáng ngờ (nhiều lần bị báo cáo)

---

### 6.3 Gửi thông báo thông minh (Smart Notification)

Thay vì gửi thông báo thô, hệ thống phân tích:
- Nếu điểm Matching > 80%: Gửi email ngay lập tức với tiêu đề "Tìm thấy đồ của bạn?!"
- Nếu điểm Matching từ 50–80%: Gộp vào digest email hàng ngày
- Nếu điểm Matching < 50%: Chỉ hiển thị trên giao diện, không gửi email (tránh spam)

---

### 6.4 Xác minh danh tính qua email

- Người dùng có thể đăng ký bằng email hợp lệ bất kỳ; hệ thống không dùng danh sách domain cố định
- Nếu người dùng muốn hiển thị thông tin liên hệ công khai, phải xác minh SĐT qua OTP (tùy chọn)
- Điều này tạo rào cản cho hành vi giả mạo hoặc lừa đảo

---

### 6.5 Cơ chế chống spam và kiểm duyệt

**Tự động:**
- Rate limiting: Tối đa 5 bài đăng mới mỗi ngày / người dùng
- Phát hiện bài đăng trùng lặp: So sánh nội dung bài mới với bài cũ, cảnh báo nếu > 80% giống nhau
- Lọc từ ngữ không phù hợp trong mô tả

**Thủ công (Admin):**
- Hệ thống báo cáo: Người dùng có thể báo cáo bài đăng vi phạm
- Admin review queue: Danh sách bài đăng bị báo cáo chờ xem xét
- Hành động Admin: Cảnh báo, ẩn bài, xóa bài, khóa tài khoản

---

## 7. Kiến trúc hệ thống

### 7.1 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT LAYER                                  │
│                                                                             │
│  Web Front-end: React + TypeScript + Vite + TailwindCSS                      │
│  Mobile Front-end: React Native + TypeScript                                 │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ HTTPS / REST API / Socket.IO
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                              BACKEND LAYER                                   │
│                                                                             │
│  Node.js + Express.js + TypeScript                                           │
│  - RESTful APIs dùng chung cho Web và Mobile                                 │
│  - Socket.IO cho chat và notification realtime                               │
│  - Xử lý AI services, OCR/image recognition, matching task, async task        │
│  - JWT, bcryptjs, Zod, cors, helmet, express-rate-limit, morgan, dotenv       │
│                                                                             │
│  Java + Spring Boot Extension                                                │
│  - RESTful API extension cho core business logic                             │
│  - Spring Security + JWT                                                     │
│  - JPA/Hibernate, Jakarta Validation                                         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                                DATA LAYER                                    │
│                                                                             │
│  MySQL relational database                                                   │
│  - Thiết kế chuẩn hóa                                                        │
│  - Primary key, foreign key, unique constraint, index, data constraint        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
│                                                                             │
│  Google Cloud Vision API: OCR + image recognition                            │
│  Cloudinary: upload, tối ưu, lưu trữ và xóa ảnh theo public_id               │
│  Email service: gửi thông báo                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Mô hình backend hybrid

Hệ thống sử dụng mô hình **hybrid backend** để vừa phù hợp với yêu cầu thực tế, vừa thể hiện năng lực kỹ thuật của nhóm:

| Thành phần | Vai trò chính |
|---|---|
| **Node.js + Express.js + TypeScript** | Xử lý RESTful API chính, realtime chat/notification bằng Socket.IO, AI service, matching task và các tác vụ bất đồng bộ |
| **Java + Spring Boot** | Mở rộng backend cho các module core business logic, API có cấu trúc chặt chẽ, bảo mật bằng Spring Security + JWT, thao tác database qua JPA/Hibernate |
| **MySQL** | Lưu trữ dữ liệu quan hệ, bảo đảm ràng buộc giữa người dùng, bài đăng, claim, matching result, chat message và reputation log |

### 7.3 Kiến trúc triển khai

```
Web Front-end (Vercel)
        │
        ├──────────────► Node.js Backend (Render)
        │                    │
Mobile App                   ├──► MySQL Database
        │                    ├──► Google Cloud Vision API
        └──────────────► Spring Boot Extension (Render)
```

- **Vercel** dùng để triển khai Web Front-end.
- **Render** dùng để triển khai Node.js backend và Spring Boot service.
- **GitHub** dùng để quản lý source code và tích hợp quy trình build/deploy tự động.

### 7.4 Luồng dữ liệu Socket.IO

```
Client A                  Node.js Socket.IO Server                  Client B
   │                                  │                                │
   │──── CONNECT ────────────────────►│                                │
   │◄─── CONNECTED ───────────────────│                                │
   │                                  │◄──────────── CONNECT ──────────│
   │                                  │──────────── CONNECTED ────────►│
   │                                  │                                │
   │── emit("chat:send") ───────────►│                                │
   │                                  │── emit("chat:newMessage") ───►│
   │                                  │                                │
   │◄──────── emit("notification") ───│── emit("notification") ──────►│
```

---

## 8. Thiết kế cơ sở dữ liệu

### 8.1 Sơ đồ thực thể (ERD — tóm tắt)

```
USER ──────────── POST (1:N)
  │                │
  │                ├──────── POST_IMAGE / MEDIA_ASSET (1:N)
  │                ├──────── TAG (N:M)
  │                ├──────── CATEGORY (N:1)
  │                └──────── HANDOVER_POINT (N:1, optional)
  │
  ├──── CLAIM (N:M qua bảng CLAIM)
  │       │
  │       ├──── CLAIM_EVIDENCE (1:N)
  │       ├──── RETURN_APPOINTMENT (1:N)
  │       └──── CHAT_MESSAGE (1:N)
  │
  └──── REPUTATION_LOG (1:N)

MATCHING_RESULT ── POST_LOST (N:1)
                └─ POST_FOUND (N:1)

ADMIN ───────── SYSTEM_CONFIGURATION (1:N)
ADMIN ───────── CONFIG_CHANGE_LOG (1:N)
HANDOVER_POINT ─ STORAGE_LOG (1:N)
```

### 8.2 Mô tả bảng chính

**Bảng `users`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | Auto increment |
| email | VARCHAR(255) UNIQUE | Email đăng ký |
| password_hash | VARCHAR(255) | BCrypt |
| full_name | VARCHAR(100) | |
| student_id | VARCHAR(20) | MSSV/mã nhân viên |
| role | ENUM | USER, ADMIN |
| reputation_score | INT | 0–100, default 0 |
| is_verified | BOOLEAN | Xác minh email |
| created_at | TIMESTAMP | |
| is_active | BOOLEAN | Khóa/mở tài khoản |

**Bảng `posts`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK | Người đăng |
| type | ENUM | LOST, FOUND |
| title | VARCHAR(200) | |
| description | TEXT | |
| category_id | INT FK | |
| location_area | VARCHAR(100) | Khu vực |
| location_building | VARCHAR(50) | Tòa nhà |
| location_room | VARCHAR(50) | Phòng |
| incident_time | DATETIME | Thời gian mất/nhặt |
| status | ENUM | OPEN, MATCHED, RESOLVED, EXPIRED, CLOSED |
| secret_verification | TEXT | Encrypted — dùng xác minh Claim |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | created_at + 30 ngày |

**Bảng `matching_results`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| lost_post_id | BIGINT FK | |
| found_post_id | BIGINT FK | |
| total_score | FLOAT | 0.0 – 1.0 |
| text_score | FLOAT | Điểm từ TF-IDF |
| category_score | FLOAT | Điểm từ category |
| location_score | FLOAT | Điểm từ vị trí |
| time_score | FLOAT | Điểm từ thời gian |
| is_notified | BOOLEAN | Đã gửi thông báo chưa |
| created_at | TIMESTAMP | |

**Bảng `claims`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| claimant_id | BIGINT FK | Người gửi Claim |
| post_id | BIGINT FK | Bài FOUND bị Claim |
| verification_info | TEXT | Encrypted |
| status | ENUM | PENDING, ACCEPTED, REJECTED |
| created_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | |

**Bảng `chat_messages`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| claim_id | BIGINT FK | Thuộc Claim nào |
| sender_id | BIGINT FK | |
| content | TEXT | |
| message_type | ENUM | TEXT, IMAGE |
| is_read | BOOLEAN | |
| sent_at | TIMESTAMP | |

**Bảng `media_assets`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| owner_type | ENUM | USER_AVATAR, POST_IMAGE, CLAIM_EVIDENCE, CHAT_IMAGE, HANDOVER_PROOF |
| owner_id | BIGINT | ID của entity sở hữu ảnh |
| cloudinary_public_id | VARCHAR(255) | Dùng để xóa/cập nhật ảnh trên Cloudinary |
| secure_url | VARCHAR(500) | URL HTTPS để hiển thị ảnh |
| thumbnail_url | VARCHAR(500) | URL ảnh tối ưu/thumbnail |
| file_format | VARCHAR(20) | JPG, PNG, WEBP... |
| file_size | BIGINT | Dung lượng ảnh |
| uploaded_by | BIGINT FK | Người upload |
| created_at | TIMESTAMP | |

**Bảng `handover_points`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(150) | Tên điểm tiếp nhận, ví dụ: Quầy bảo vệ |
| area | VARCHAR(100) | Khu vực |
| building | VARCHAR(100) | Tòa nhà |
| room | VARCHAR(100) | Phòng/quầy/tầng |
| contact_phone | VARCHAR(20) | SĐT liên hệ nếu có |
| working_hours | VARCHAR(255) | Giờ làm việc |
| is_active | BOOLEAN | Có đang sử dụng không |
| created_at | TIMESTAMP | |

**Bảng `item_storage_logs`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| post_id | BIGINT FK | Bài FOUND hoặc bài liên quan |
| handover_point_id | BIGINT FK | Điểm đang lưu giữ |
| status | ENUM | PENDING_HANDOVER, STORED_AT_POINT, PICKUP_SCHEDULED, RETURNED, UNCLAIMED |
| received_by | BIGINT FK | Staff/Admin xác nhận nhận đồ |
| note | TEXT | Ghi chú lưu kho/bàn giao |
| created_at | TIMESTAMP | |

**Bảng `claim_evidences`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| claim_id | BIGINT FK | Thuộc Claim nào |
| evidence_type | ENUM | SECRET_DETAIL, IMAGE, LOST_TIME, LOST_LOCATION, DOCUMENT, OTHER |
| evidence_text | TEXT | Nội dung bằng chứng |
| media_asset_id | BIGINT FK NULL | Ảnh bằng chứng nếu có |
| is_sensitive | BOOLEAN | Không hiển thị public |
| created_at | TIMESTAMP | |

**Bảng `return_appointments`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| claim_id | BIGINT FK | Claim đã được chấp nhận |
| proposer_id | BIGINT FK | Người đề xuất lịch |
| appointment_time | DATETIME | Thời gian hẹn |
| location_type | ENUM | HANDOVER_POINT, CUSTOM_LOCATION |
| handover_point_id | BIGINT FK NULL | Nếu nhận tại điểm tiếp nhận |
| custom_location | VARCHAR(255) | Nếu nhận tại vị trí tự thỏa thuận |
| status | ENUM | PROPOSED, ACCEPTED, REJECTED, RESCHEDULED, CANCELLED, COMPLETED |
| note | TEXT | Ghi chú |
| created_at | TIMESTAMP | |

**Bảng `system_configurations`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| config_key | VARCHAR(100) UNIQUE | Ví dụ: MATCHING_THRESHOLD_HIGH |
| config_value | TEXT | Giá trị cấu hình |
| value_type | ENUM | STRING, NUMBER, BOOLEAN, JSON |
| description | TEXT | Mô tả ý nghĩa cấu hình |
| updated_by | BIGINT FK | Admin cập nhật |
| updated_at | TIMESTAMP | |

**Bảng `config_change_logs`:**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK | |
| config_key | VARCHAR(100) | Key bị thay đổi |
| old_value | TEXT | Giá trị cũ |
| new_value | TEXT | Giá trị mới |
| changed_by | BIGINT FK | Admin thực hiện |
| changed_at | TIMESTAMP | |

---

## 9. Thuật toán Matching — Điểm kỹ thuật cốt lõi

### 9.1 Tổng quan

Thuật toán Matching là điểm **kỹ thuật quan trọng nhất** phân biệt hệ thống này với một CRUD thông thường. Mục tiêu là tính toán điểm tương đồng tổng hợp giữa một bài LOST và một bài FOUND dựa trên 4 tiêu chí.

### 9.2 Công thức tổng hợp

```
TotalScore = w1 × TextScore + w2 × CategoryScore + w3 × LocationScore + w4 × TimeScore

Trong đó trọng số mặc định:
  w1 = 0.50  (Text similarity — quan trọng nhất)
  w2 = 0.25  (Category match)
  w3 = 0.15  (Location proximity)
  w4 = 0.10  (Time proximity)
```

*(Trọng số có thể cấu hình qua Admin Panel)*

---

### 9.3 TextScore — TF-IDF + Cosine Similarity

**Bước 1: Tiền xử lý văn bản (Preprocessing)**

```python
def preprocess(text):
    text = remove_accents_optional(text)   # Chuẩn hóa tiếng Việt
    text = text.lower()                     # Chuyển thường
    text = remove_special_chars(text)       # Xóa ký tự đặc biệt
    tokens = tokenize_vi(text)              # Tách từ (dùng VnCoreNLP hoặc underthesea)
    tokens = remove_stopwords(tokens)       # Loại bỏ từ dừng tiếng Việt
    return tokens
```

**Bước 2: Tính TF-IDF**

```
TF(t, d)    = (số lần từ t xuất hiện trong tài liệu d) / (tổng số từ trong d)

IDF(t)      = log(N / df(t)) + 1
              Trong đó N = tổng số bài đăng, df(t) = số bài đăng chứa từ t

TF-IDF(t,d) = TF(t,d) × IDF(t)
```

**Bước 3: Tính Cosine Similarity**

```
           Σ (TF-IDF(t, lost) × TF-IDF(t, found))
Cosine = ─────────────────────────────────────────────────────────
          √(Σ TF-IDF²(t, lost)) × √(Σ TF-IDF²(t, found))

Kết quả: TextScore ∈ [0, 1]
```

**Ví dụ minh họa:**

```
Bài LOST:  "Mất ví da màu nâu, bên trong có thẻ sinh viên và tiền mặt"
Bài FOUND: "Nhặt được ví màu nâu, có thẻ sinh viên bên trong"

Từ khóa trùng: "ví", "nâu", "thẻ sinh viên", "bên trong"
→ TextScore ≈ 0.82 (rất cao)
```

---

### 9.4 CategoryScore — Khớp danh mục

```
CategoryScore = 1.0   nếu category của LOST == category của FOUND
CategoryScore = 0.5   nếu cùng nhóm cha (ví dụ: "Điện tử" và "Phụ kiện điện tử")
CategoryScore = 0.0   nếu hoàn toàn khác nhau
```

---

### 9.5 LocationScore — Khoảng cách địa lý

Vì đây là không gian trong khuôn viên trường (không cần tọa độ GPS chính xác), mô hình hóa bằng cây phân cấp:

```
LocationScore = 1.0   nếu cùng phòng
LocationScore = 0.8   nếu cùng tòa nhà
LocationScore = 0.5   nếu cùng khu vực
LocationScore = 0.2   nếu cùng khuôn viên trường
LocationScore = 0.0   nếu khác địa điểm hoàn toàn
```

---

### 9.6 TimeScore — Khoảng cách thời gian

```
Δt = |time_lost - time_found|   (đơn vị: giờ)

TimeScore = e^(-Δt / 72)

Ý nghĩa:
  Δt = 0 giờ   → TimeScore = 1.00
  Δt = 24 giờ  → TimeScore = 0.72
  Δt = 72 giờ  → TimeScore = 0.37
  Δt = 168 giờ → TimeScore = 0.10
```

*(Hàm mũ phân rã — thời gian càng xa, điểm càng giảm theo dạng hàm mũ)*

---

### 9.7 Chiến lược tính toán

**Trigger:** Matching được chạy khi:
- Một bài mới được đăng → So sánh với tất cả bài trái chiều (LOST↔FOUND) đang OPEN
- Người dùng cập nhật bài đăng quan trọng như mô tả, danh mục, vị trí hoặc thời gian
- Admin bấm "Re-run Matching" trên Admin Panel

**Tối ưu hiệu năng:**
- TF-IDF matrix được tính sẵn và cập nhật incremental để tránh tính lại toàn bộ dữ liệu
- Node.js backend xử lý matching như một tác vụ bất đồng bộ sau khi bài đăng được tạo/cập nhật
- Kết quả matching được lưu vào bảng `matching_results` trong MySQL để Web và Mobile client có thể dùng chung
- Các tác vụ định kỳ có thể được triển khai bằng cron job trong Node.js hoặc scheduled task ở Spring Boot extension nếu module được chuyển sang Java

**Ngưỡng hiển thị:**

```
TotalScore >= 0.80  → Hiển thị với badge "Khớp cao"
TotalScore >= 0.60  → Hiển thị với badge "Có thể khớp"
TotalScore >= 0.40  → Hiển thị trong danh sách "Liên quan"
TotalScore <  0.40  → Không hiển thị
```

---

## 10. Luồng hoạt động hệ thống

### 10.1 Luồng chính (Happy Path)

```
[Người dùng A — mất đồ]
        │
        ▼
1. Đăng ký / Đăng nhập bằng email hợp lệ
        │
        ▼
2. Tạo bài đăng LOST (tiêu đề, mô tả, ảnh, vị trí, thời gian)
   + Điền thông tin xác minh bí mật
        │
        ▼
3. Hệ thống chạy Matching tự động
   → Tìm thấy bài FOUND của người dùng B có TotalScore = 0.78
        │
        ▼
4. Gửi thông báo cho A: "Tìm thấy bài đăng có thể liên quan!"
        │
        ▼
5. A xem bài FOUND của B, quyết định gửi Claim
   → Điền đặc điểm nhận dạng bí mật của đồ vật
        │
        ▼
[Người dùng B — nhặt được đồ]
        │
        ▼
6. B nhận thông báo có Claim mới
   → Xem thông tin xác minh của A
   → Kiểm tra đồ vật đang giữ
   → Chấp nhận Claim
        │
        ▼
7. Kênh Chat tự động mở giữa A và B
   → Thỏa thuận địa điểm, thời gian trao trả
        │
        ▼
8. Hai bên gặp nhau, trao trả đồ
   → Cả hai xác nhận "Đã hoàn tất" trên hệ thống
        │
        ▼
9. Bài đăng chuyển sang RESOLVED
   → A và B đều nhận điểm uy tín
   → Thống kê Admin được cập nhật
```

### 10.2 Luồng khi Claim bị từ chối

```
A gửi Claim → B xem và Từ chối
    │
    ▼
A nhận thông báo "Claim bị từ chối"
    │
    ▼
A có thể:
    ├── Gửi thêm thông tin và Claim lại
    ├── Tìm bài FOUND khác có thể khớp
    └── Chờ thêm bài FOUND mới
```

---

## 11. Công nghệ sử dụng

Phần công nghệ được thiết kế theo hướng **Web + Mobile + Shared RESTful APIs**, đúng với định hướng hệ thống hỗ trợ cả website application và mobile application.

### 11.1 Front-end Web

| Công nghệ | Mục đích | Lý do chọn |
|---|---|---|
| **React** | Xây dựng giao diện web | Phù hợp SPA, cộng đồng lớn, dễ phát triển component |
| **TypeScript** | Tăng an toàn kiểu dữ liệu | Giảm lỗi khi phát triển dự án lớn |
| **Vite** | Build tool cho front-end | Khởi động nhanh, build nhẹ, phù hợp React hiện đại |
| **TailwindCSS** | Thiết kế giao diện responsive | Tạo UI nhanh, dễ thống nhất style toàn hệ thống |
| **React Router DOM** | Điều hướng trang | Quản lý route cho User/Admin dashboard |
| **Axios** | Gọi RESTful API | Dễ cấu hình interceptor cho JWT token |
| **TanStack Query** | Quản lý server state | Cache dữ liệu API, refetch, loading/error state tốt |
| **Socket.IO Client** | Kết nối realtime | Nhận tin nhắn chat và notification realtime |
| **React Hook Form** | Quản lý form | Tối ưu form đăng bài, đăng nhập, claim verification |
| **Recharts** | Biểu đồ thống kê | Phù hợp dashboard Admin |

### 11.2 Front-end Mobile

| Công nghệ | Mục đích | Lý do chọn |
|---|---|---|
| **React Native** | Xây dựng mobile application | Dùng chung tư duy React, phù hợp phát triển nhanh app Android/iOS |
| **TypeScript** | Tăng an toàn kiểu dữ liệu | Đồng bộ convention với Web front-end |
| **Axios** | Gọi RESTful API | Dùng chung API với Web client |
| **Socket.IO Client** | Realtime chat/notification | Đồng bộ realtime với Web client |
| **React Navigation** | Điều hướng màn hình mobile | Phù hợp cấu trúc mobile app nhiều màn hình |
| **React Hook Form** | Quản lý form mobile | Giảm lỗi nhập liệu khi tạo bài, claim, cập nhật hồ sơ |

### 11.3 Back-end chính — Node.js

| Công nghệ | Mục đích | Lý do chọn |
|---|---|---|
| **Node.js** | Runtime backend chính | Phù hợp API realtime, xử lý bất đồng bộ tốt |
| **Express.js** | Xây dựng RESTful APIs | Nhẹ, dễ tổ chức route/controller/middleware |
| **TypeScript** | Chuẩn hóa code backend | Giảm lỗi logic và dễ bảo trì |
| **Socket.IO** | Chat và notification realtime | Hỗ trợ WebSocket, reconnect, room, event-based communication |
| **JWT** | Authentication/Authorization | Stateless, phù hợp Web và Mobile |
| **bcryptjs** | Hash mật khẩu | Không lưu mật khẩu plain text |
| **Zod** | Validate input data | Kiểm tra dữ liệu request rõ ràng, giảm lỗi backend |
| **Google Cloud Vision API** | OCR và image recognition | Nhận diện danh mục, tag và thông tin từ ảnh đồ vật |
| **Cloudinary SDK** | Upload và quản lý ảnh | Lưu ảnh bài đăng, claim evidence, chat image, avatar; trả về secure_url/public_id để hiển thị và xóa ảnh |
| **cors** | Cấu hình cross-origin | Cho phép Web/Mobile gọi API an toàn |
| **helmet** | HTTP security headers | Tăng bảo mật API |
| **express-rate-limit** | Rate limiting, chống spam | Giới hạn request, hạn chế spam bài đăng/claim |
| **morgan** | Request logging | Hỗ trợ debug và theo dõi API |
| **dotenv** | Quản lý biến môi trường | Bảo vệ config, API key, database URL |

### 11.4 Back-end mở rộng — Java/Spring Boot

| Công nghệ | Mục đích | Lý do chọn |
|---|---|---|
| **Java** | Ngôn ngữ backend extension | Phù hợp module nghiệp vụ lớn, cấu trúc chặt chẽ |
| **Spring Boot** | RESTful API development | Framework mạnh, dễ xây dựng service theo chuẩn enterprise |
| **Spring Security + JWT** | Xác thực và phân quyền | Bảo mật tốt, phù hợp role-based access control |
| **JPA / Hibernate** | ORM và tương tác database | Làm việc tốt với MySQL, giảm boilerplate SQL |
| **Jakarta Validation** | Validate dữ liệu | Chuẩn hóa validation ở tầng DTO/request |
| **Maven / Gradle** | Quản lý dependency, build project | Phù hợp hệ sinh thái Java/Spring Boot |

### 11.5 Database

| Công nghệ | Mục đích | Lý do chọn |
|---|---|---|
| **MySQL** | Hệ quản trị cơ sở dữ liệu quan hệ | Dữ liệu có nhiều quan hệ chặt chẽ: users, posts, claims, matching results, chat messages, reputation logs |
| **Normalized schema design** | Thiết kế dữ liệu chuẩn hóa | Giảm trùng lặp dữ liệu, bảo đảm tính toàn vẹn |
| **Primary key, foreign key, unique constraint, index** | Ràng buộc và tối ưu truy vấn | Đảm bảo liên kết dữ liệu rõ ràng và hỗ trợ tìm kiếm nhanh |

### 11.6 Version Control, CI/CD và Deployment

| Công nghệ / Nền tảng | Mục đích | Lý do chọn |
|---|---|---|
| **GitHub** | Quản lý source code và teamwork | Dễ phân nhánh, review code, quản lý issue/task |
| **GitHub Actions / automated build** | Tự động build/deploy | Giảm lỗi khi deploy thủ công |
| **Vercel** | Deploy Web Front-end | Phù hợp React/Vite, deploy nhanh |
| **Render** | Deploy Node.js và Spring Boot backend | Hỗ trợ web service, dễ kết nối GitHub |
| **Cloudinary** | Lưu trữ media online | Phù hợp upload ảnh từ Web/Mobile, tối ưu ảnh, dễ tích hợp với backend |
| **Swagger / OpenAPI** | Tài liệu hóa API | Giúp Web/Mobile tích hợp API dễ hơn |

### 11.7 Tóm tắt vai trò công nghệ trong hệ thống

| Lớp hệ thống | Công nghệ chính |
|---|---|
| Web client | React, TypeScript, Vite, TailwindCSS, React Router DOM, Axios, TanStack Query, Socket.IO Client, React Hook Form, Recharts |
| Mobile client | React Native, TypeScript, Axios, Socket.IO Client, React Navigation, React Hook Form |
| Backend realtime/AI/API | Node.js, Express.js, TypeScript, Socket.IO, JWT, bcryptjs, Zod, Google Cloud Vision API, Cloudinary SDK |
| Backend extension | Java, Spring Boot, Spring Security + JWT, JPA/Hibernate, Jakarta Validation |
| Database | MySQL |
| Deployment | Vercel, Render, GitHub CI/CD |

---

## 12. Kế hoạch thực hiện

| Tuần | Nội dung công việc | Deliverable |
|---|---|---|
| 1–2 | Phân tích yêu cầu, xác định phạm vi Web/Mobile, thiết kế Use Case, ERD và API contract | Requirement specification, Use Case list, ERD draft, API draft |
| 3–4 | Cài đặt môi trường, thiết lập GitHub, cấu trúc React/Vite, React Native, Node.js/Express/TypeScript | Project skeleton, coding convention, repository structure |
| 5–6 | Xây dựng Auth module: đăng ký, đăng nhập, JWT, bcryptjs, phân quyền User/Admin | Auth API, login/register UI Web/Mobile |
| 7–8 | Xây dựng Post module: LOST/FOUND CRUD, Cloudinary upload, tìm kiếm, lọc bài đăng | Post API, Cloudinary media API, Web/Mobile post screens |
| 9–10 | Xây dựng Matching Engine: TF-IDF, Cosine Similarity, scoring theo category/location/time | Matching API, matching result table, demo matching |
| 11 | Tích hợp Google Cloud Vision API để OCR, nhận diện ảnh, gợi ý tag/danh mục | Image recognition API, auto category/tag suggestion |
| 12 | Xây dựng Evidence-based Claim Form, claim evidence upload, trạng thái claim, xác minh quyền sở hữu | Claim API, evidence API, claim flow UI |
| 13 | Xây dựng chat và notification realtime bằng Socket.IO, hỗ trợ gửi ảnh chat qua Cloudinary | Chat room, message, realtime notification |
| 14 | Xây dựng Campus Handover Point và Item Return Appointment | Handover API/UI, appointment API/UI, reminder notification |
| 15 | Xây dựng Admin Dashboard và Admin Configuration bằng Spring Boot extension | Spring Boot Admin/Config API, dashboard charts, JPA/Hibernate integration |
| 16 | Testing, fix bug, bảo mật API, rate limiting, validate bằng Zod/Jakarta Validation | Test report, bug list, security checklist |
| 17 | Deploy Web lên Vercel, backend lên Render, kiểm thử tích hợp Web/Mobile/API | Deployment link, integrated demo |
| 18 | Hoàn thiện báo cáo, slide, kịch bản demo và chuẩn bị bảo vệ | Final report, slide, demo script |

---

## 13. Rủi ro và giải pháp

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| Phạm vi gồm cả Web, Mobile, AI, Handover Point, Appointment và Admin Configuration khiến khối lượng công việc lớn | Cao | Ưu tiên core flow trước: Auth, Post, Matching, Claim, Cloudinary upload; các module mở rộng chia theo sprint và dùng API contract rõ ràng |
| Hybrid backend Node.js + Spring Boot làm tăng độ phức tạp tích hợp | Trung bình | Tách rõ trách nhiệm từng service, thống nhất API contract, dùng Swagger/OpenAPI để tài liệu hóa |
| Thuật toán Matching cho kết quả kém do dữ liệu ít | Trung bình | Seed dữ liệu mẫu; điều chỉnh trọng số; đánh giá bằng các case LOST/FOUND thực tế; có thể mở rộng Sentence Embedding sau |
| Google Cloud Vision API phát sinh chi phí hoặc lỗi quota | Trung bình | Giới hạn số lần upload/gọi API; cache kết quả nhận diện; fallback về phân loại thủ công |
| Cloudinary upload lỗi, ảnh quá nặng hoặc public_id bị mất | Trung bình | Validate file trước khi upload, lưu metadata ảnh trong MySQL, giới hạn dung lượng, xử lý rollback khi upload DB thất bại |
| Socket.IO gặp lỗi kết nối trên một số mạng | Thấp | Cấu hình reconnect, timeout, fallback polling mặc định của Socket.IO |
| Người dùng nhập sai thông tin gây matching kém | Cao | Validation chặt bằng React Hook Form, Zod/Jakarta Validation; gợi ý tag/danh mục từ ảnh |
| Lộ thông tin xác minh Claim | Thấp | Phân quyền nghiêm ngặt, không hiển thị public, mã hóa thông tin nhạy cảm nếu cần |
| Deploy nhiều thành phần Web/Mobile/Backend khó kiểm soát | Trung bình | Dùng GitHub, automated build, biến môi trường rõ ràng, checklist deploy Vercel/Render |
| Thiếu người dùng thực tế để test | Trung bình | Demo bằng dữ liệu giả gần thực tế; phỏng vấn/survey sinh viên; đề xuất pilot tại campus sau bảo vệ |

---

## 14. Kết luận và hướng phát triển

### 14.1 Kết luận

Hệ thống **Lost & Found Management System for FPT University Đà Nẵng** giải quyết một vấn đề thực tế trong môi trường học đường: người mất đồ và người nhặt được đồ khó tìm thấy nhau, thiếu cơ chế xác minh và thiếu hệ thống quản lý tập trung.

Đồ án không chỉ dừng ở mức CRUD thông thường mà kết hợp nhiều thành phần kỹ thuật có giá trị:

- **Web application** bằng React, TypeScript, Vite và TailwindCSS
- **Mobile application** bằng React Native và TypeScript
- **Shared RESTful APIs** phục vụ đồng thời Web và Mobile client
- **Backend Node.js/Express/TypeScript** cho API, realtime, AI service và tác vụ bất đồng bộ
- **Backend extension Java/Spring Boot** cho các module nghiệp vụ có cấu trúc chặt chẽ
- **Bảo mật** bằng JWT, bcryptjs, Spring Security, validation và rate limiting
- **Thuật toán cốt lõi** TF-IDF + Cosine Similarity cho bài toán Matching
- **Tích hợp AI nhẹ** qua Google Cloud Vision API để OCR, nhận diện hình ảnh và gợi ý tag/danh mục
- **Upload và quản lý ảnh** bằng Cloudinary cho bài đăng, bằng chứng Claim, chat và avatar
- **Quy trình trả đồ thực tế** với Campus Handover Point và Item Return Appointment
- **Claim Verification nâng cao** bằng Evidence-based Claim Form
- **Admin Configuration** cho phép quản trị viên điều chỉnh rule hệ thống linh hoạt
- **Real-time communication** bằng WebSocket/Socket.IO
- **Trực quan hóa dữ liệu** bằng Recharts phục vụ Admin Dashboard
- **Triển khai thực tế** với Vercel, Render, GitHub và quy trình build/deploy tự động

Với phạm vi triển khai tại FPT University Đà Nẵng, hệ thống có tính thực tiễn cao, có khả năng demo rõ ràng trước hội đồng và có thể mở rộng thành một giải pháp quản lý đồ thất lạc áp dụng cho nhiều trường đại học trong tương lai.

### 14.2 Hướng phát triển tương lai

1. **Mở rộng mobile app** với push notification, camera scan và tối ưu trải nghiệm upload ảnh
2. **Sentence Embedding** sử dụng mô hình đa ngôn ngữ để Matching ngữ nghĩa chính xác hơn TF-IDF truyền thống
3. **Tích hợp camera an ninh** để hỗ trợ phát hiện đồ vật bị bỏ quên và gợi ý tạo bài FOUND
4. **Mở rộng đa campus / đa trường** theo mô hình SaaS
5. **Tích hợp chatbot** hỗ trợ người dùng tìm bài đăng, hỏi quy trình nhận lại đồ và tra cứu FAQ
6. **Gamification** như huy hiệu, bảng xếp hạng và phần thưởng cho người dùng trả lại đồ uy tín


---

## 15. Use Case chi tiết và phân công công việc

Phần này liệt kê Use Case ở mức chi tiết để nhóm dễ tách task, tạo issue trên GitHub và phân công cho 5 dev. Trong báo cáo chính thức, nhóm có thể chọn khoảng 25–35 Use Case chính để đưa vào Use Case Diagram; danh sách chi tiết bên dưới dùng cho quản lý công việc và đặc tả module.

Lưu ý: mục 15.2 là danh sách UC tổng quát theo module; mục 15.3 bên dưới là phần phân công UC theo tên từng dev: Trần Thế Lượng, Võ Chiêu Quân, Trương Quang Đạt, Phạm Nguyễn Anh Khoa và Trần Nguyễn Phong.

### 15.1 Actor của hệ thống

| Actor | Mô tả |
|---|---|
| Guest | Người chưa đăng nhập, có thể xem trang public và đăng ký/đăng nhập |
| User | Sinh viên, giảng viên hoặc nhân viên dùng hệ thống |
| Finder | Người nhặt được đồ, thường tạo bài FOUND hoặc xử lý Claim |
| Claimant | Người mất đồ, gửi Claim để nhận lại đồ |
| Admin | Quản trị viên hệ thống, kiểm duyệt, cấu hình, xem dashboard |
| Staff | Nhân sự tại điểm tiếp nhận/trả đồ như bảo vệ, thư viện, CTSV, lễ tân |
| System | Tác vụ tự động: matching, notification, hết hạn bài, tính điểm uy tín |
| External Service | Cloudinary, Google Cloud Vision API, Email service |

---

### 15.2 Danh sách Use Case chi tiết

#### A. Authentication, Authorization và User Profile

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-001 | Đăng ký tài khoản bằng email | Guest | Cao |
| UC-002 | Kiểm tra định dạng email hợp lệ, không bắt buộc domain trường | System | Cao |
| UC-003 | Gửi OTP xác minh email | System | Cao |
| UC-004 | Xác minh OTP email | Guest/User | Cao |
| UC-005 | Đăng nhập bằng email và mật khẩu | User/Admin/Staff | Cao |
| UC-006 | Đăng nhập bằng Google với email hợp lệ bất kỳ | User | Trung bình |
| UC-007 | Đăng xuất | User/Admin/Staff | Cao |
| UC-008 | Refresh access token | System | Cao |
| UC-009 | Mã hóa mật khẩu bằng bcryptjs | System | Cao |
| UC-010 | Phân quyền theo role User/Admin/Staff | System/Admin | Cao |
| UC-011 | Xem thông tin cá nhân | User | Cao |
| UC-012 | Cập nhật thông tin cá nhân | User | Cao |
| UC-013 | Upload ảnh đại diện lên Cloudinary | User | Trung bình |
| UC-014 | Xem lịch sử hoạt động cá nhân | User | Trung bình |
| UC-015 | Xem điểm uy tín cá nhân | User | Trung bình |

#### B. LOST/FOUND Post Management

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-016 | Tạo bài đăng LOST | User | Cao |
| UC-017 | Tạo bài đăng FOUND | User/Finder/Staff | Cao |
| UC-018 | Nhập thông tin tiêu đề, mô tả, danh mục | User | Cao |
| UC-019 | Chọn vị trí mất/nhặt theo khu vực, tòa nhà, phòng | User | Cao |
| UC-020 | Nhập thời gian mất/nhặt đồ | User | Cao |
| UC-021 | Nhập thông tin xác minh bí mật cho bài LOST | User | Cao |
| UC-022 | Cập nhật bài đăng LOST/FOUND | User | Cao |
| UC-023 | Đóng bài đăng | User | Cao |
| UC-024 | Xóa mềm bài đăng | User/Admin | Cao |
| UC-025 | Xem chi tiết bài đăng | User/Admin/Staff | Cao |
| UC-026 | Xem danh sách bài đăng của tôi | User | Cao |
| UC-027 | Xem danh sách bài LOST public | Guest/User | Trung bình |
| UC-028 | Xem danh sách bài FOUND public | Guest/User | Trung bình |
| UC-029 | Cập nhật trạng thái OPEN/MATCHED/RESOLVED/CLOSED | System/User/Admin | Cao |
| UC-030 | Tự động chuyển bài quá hạn sang EXPIRED | System | Trung bình |
| UC-031 | Gắn bài FOUND với điểm tiếp nhận/trả đồ | Finder/Staff | Cao |
| UC-032 | Hiển thị vị trí đang giữ đồ | User | Cao |

#### C. Cloudinary Image Upload và Media Management

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-033 | Chọn ảnh từ Web để upload | User/Admin/Staff | Cao |
| UC-034 | Chọn ảnh từ Mobile để upload | User | Cao |
| UC-035 | Validate định dạng ảnh JPG/PNG/WEBP | System | Cao |
| UC-036 | Validate dung lượng ảnh theo cấu hình Admin | System | Cao |
| UC-037 | Upload ảnh bài đăng lên Cloudinary | User/System | Cao |
| UC-038 | Upload ảnh bằng chứng Claim lên Cloudinary | Claimant/System | Cao |
| UC-039 | Upload ảnh chat lên Cloudinary | User/System | Trung bình |
| UC-040 | Upload ảnh avatar lên Cloudinary | User/System | Trung bình |
| UC-041 | Lưu `secure_url` và `public_id` vào MySQL | System | Cao |
| UC-042 | Tạo thumbnail/optimized image cho danh sách bài đăng | System | Trung bình |
| UC-043 | Hiển thị ảnh từ Cloudinary trên Web | User/Admin | Cao |
| UC-044 | Hiển thị ảnh từ Cloudinary trên Mobile | User | Cao |
| UC-045 | Xóa ảnh khỏi Cloudinary bằng public_id | System/Admin | Trung bình |
| UC-046 | Ẩn ảnh bằng chứng Claim khỏi public view | System | Cao |
| UC-047 | Gửi URL ảnh sang Google Cloud Vision API để phân tích | System | Trung bình |

#### D. Search, Filter và Public Board

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-048 | Tìm kiếm bài đăng theo từ khóa | Guest/User | Cao |
| UC-049 | Tìm kiếm tiếng Việt có dấu/không dấu | User | Trung bình |
| UC-050 | Lọc theo loại LOST/FOUND | User | Cao |
| UC-051 | Lọc theo danh mục | User | Cao |
| UC-052 | Lọc theo khu vực/tòa nhà/phòng | User | Cao |
| UC-053 | Lọc theo thời gian | User | Cao |
| UC-054 | Lọc theo trạng thái bài đăng | User/Admin | Trung bình |
| UC-055 | Sắp xếp theo mới nhất | User | Cao |
| UC-056 | Sắp xếp theo điểm khớp cao nhất | User | Trung bình |
| UC-057 | Xem Public Lost & Found Board | Guest/User | Trung bình |
| UC-058 | Chia sẻ link bài đăng | User | Thấp |

#### E. AI Image Recognition, OCR và Auto Tag

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-059 | Gọi Google Cloud Vision API phân tích ảnh | System | Trung bình |
| UC-060 | Nhận diện loại đồ vật từ ảnh | System | Trung bình |
| UC-061 | OCR trích xuất chữ trong ảnh | System | Trung bình |
| UC-062 | Gợi ý tag từ kết quả Vision API | System | Trung bình |
| UC-063 | Gợi ý danh mục đồ vật | System | Trung bình |
| UC-064 | Người dùng xác nhận hoặc chỉnh danh mục AI gợi ý | User | Trung bình |
| UC-065 | Lưu tag AI vào database | System | Trung bình |
| UC-066 | Dùng tag AI để cải thiện Matching | System | Trung bình |
| UC-067 | Fallback về nhập thủ công nếu AI lỗi/quota | System/User | Trung bình |

#### F. Automatic Matching Engine

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-068 | Trigger matching khi tạo bài mới | System | Cao |
| UC-069 | Trigger matching khi cập nhật mô tả/danh mục/vị trí/thời gian | System | Cao |
| UC-070 | Tiền xử lý văn bản tiếng Việt | System | Cao |
| UC-071 | Tính TF-IDF vector | System | Cao |
| UC-072 | Tính Cosine Similarity | System | Cao |
| UC-073 | Tính TextScore | System | Cao |
| UC-074 | Tính CategoryScore | System | Cao |
| UC-075 | Tính LocationScore | System | Cao |
| UC-076 | Tính TimeScore | System | Cao |
| UC-077 | Tính TotalScore | System | Cao |
| UC-078 | Lưu matching result vào MySQL | System | Cao |
| UC-079 | Hiển thị bài đăng có thể liên quan | User | Cao |
| UC-080 | Gửi thông báo khi matching vượt ngưỡng | System | Cao |
| UC-081 | Admin re-run matching thủ công | Admin | Trung bình |
| UC-082 | Áp dụng trọng số matching từ Admin Configuration | System | Cao |

#### G. Evidence-based Claim Form

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-083 | Gửi Claim cho bài FOUND | Claimant | Cao |
| UC-084 | Nhập mô tả đặc điểm bí mật của đồ | Claimant | Cao |
| UC-085 | Nhập thời gian mất gần đúng | Claimant | Cao |
| UC-086 | Nhập vị trí mất gần đúng | Claimant | Cao |
| UC-087 | Upload ảnh chứng minh quyền sở hữu qua Cloudinary | Claimant | Cao |
| UC-088 | Thêm tài liệu/hóa đơn/ảnh cũ làm bằng chứng | Claimant | Trung bình |
| UC-089 | Lưu claim evidence vào database | System | Cao |
| UC-090 | Ẩn evidence khỏi người không liên quan | System | Cao |
| UC-091 | Người giữ đồ xem bằng chứng Claim | Finder/Staff/Admin | Cao |
| UC-092 | Yêu cầu người Claim bổ sung thông tin | Finder/Staff/Admin | Trung bình |
| UC-093 | Chấp nhận Claim | Finder/Staff/Admin | Cao |
| UC-094 | Từ chối Claim kèm lý do | Finder/Staff/Admin | Cao |
| UC-095 | Người gửi Claim hủy Claim | Claimant | Trung bình |
| UC-096 | Cập nhật trạng thái PENDING/NEED_MORE_INFO/ACCEPTED/REJECTED/CANCELLED | System | Cao |
| UC-097 | Tạo chat room sau khi Claim được chấp nhận | System | Cao |

#### H. Campus Lost Item Handover Point

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-098 | Admin tạo điểm tiếp nhận/trả đồ | Admin | Cao |
| UC-099 | Admin cập nhật thông tin điểm tiếp nhận | Admin | Cao |
| UC-100 | Admin bật/tắt điểm tiếp nhận | Admin | Trung bình |
| UC-101 | User xem danh sách điểm tiếp nhận | User | Cao |
| UC-102 | Finder chọn điểm sẽ gửi đồ khi tạo bài FOUND | Finder | Cao |
| UC-103 | Staff xác nhận đã nhận đồ tại điểm tiếp nhận | Staff/Admin | Cao |
| UC-104 | Staff cập nhật trạng thái STORED_AT_POINT | Staff/Admin | Cao |
| UC-105 | User xem nơi đang lưu giữ đồ | User | Cao |
| UC-106 | Staff ghi chú tình trạng đồ khi tiếp nhận | Staff/Admin | Trung bình |
| UC-107 | Staff upload ảnh minh chứng nhận đồ lên Cloudinary | Staff/Admin | Trung bình |
| UC-108 | Staff xác nhận đã bàn giao đồ | Staff/Admin | Cao |
| UC-109 | System cập nhật storage log | System | Cao |
| UC-110 | Admin xem danh sách đồ đang lưu giữ/chưa nhận | Admin/Staff | Cao |
| UC-111 | System đánh dấu đồ quá hạn chưa nhận | System | Trung bình |

#### I. Item Return Appointment

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-112 | Tạo lịch hẹn trả đồ sau khi Claim accepted | User/Staff | Cao |
| UC-113 | Đề xuất thời gian trả đồ | User/Staff | Cao |
| UC-114 | Đề xuất địa điểm trả đồ | User/Staff | Cao |
| UC-115 | Chọn handover point làm nơi nhận đồ | User/Staff | Cao |
| UC-116 | Chọn custom location nếu tự thỏa thuận | User | Trung bình |
| UC-117 | Chấp nhận lịch hẹn | User/Staff | Cao |
| UC-118 | Từ chối lịch hẹn | User/Staff | Trung bình |
| UC-119 | Đổi lịch hẹn | User/Staff | Cao |
| UC-120 | Hủy lịch hẹn | User/Staff | Trung bình |
| UC-121 | Gửi notification/email nhắc lịch | System | Trung bình |
| UC-122 | Xác nhận lịch hẹn đã hoàn tất | User/Staff | Cao |
| UC-123 | Cập nhật bài đăng sang RESOLVED sau khi hoàn tất | System | Cao |

#### J. Chat và Realtime Notification

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-124 | Kết nối Socket.IO | User/System | Cao |
| UC-125 | Join room theo claim/chat room | User/System | Cao |
| UC-126 | Gửi tin nhắn văn bản | User | Cao |
| UC-127 | Nhận tin nhắn realtime | User | Cao |
| UC-128 | Gửi ảnh trong chat qua Cloudinary | User | Trung bình |
| UC-129 | Lưu lịch sử chat vào MySQL | System | Cao |
| UC-130 | Hiển thị trạng thái đã đọc | User/System | Trung bình |
| UC-131 | Gửi notification khi có tin nhắn mới | System | Cao |
| UC-132 | Gửi notification khi có Claim mới | System | Cao |
| UC-133 | Gửi notification khi Claim accepted/rejected | System | Cao |
| UC-134 | Gửi notification khi có matching mới | System | Cao |
| UC-135 | Gửi smart notification theo điểm matching | System | Trung bình |

#### K. Reputation Score và Feedback

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-136 | Cộng điểm khi trả đồ thành công | System | Trung bình |
| UC-137 | Cộng điểm khi Claim thành công | System | Trung bình |
| UC-138 | Trừ điểm khi Claim sai/bị từ chối nhiều lần | System | Trung bình |
| UC-139 | Trừ điểm khi bài bị xóa do vi phạm | System | Trung bình |
| UC-140 | Xem lịch sử thay đổi điểm uy tín | User/Admin | Trung bình |
| UC-141 | Hiển thị cấp bậc uy tín | User/Admin | Trung bình |
| UC-142 | Gửi đánh giá sau khi trả đồ | User | Thấp |
| UC-143 | Admin xem feedback xấu | Admin | Thấp |

#### L. Admin Moderation và Dashboard

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-144 | Admin xem danh sách user | Admin | Cao |
| UC-145 | Admin khóa/mở khóa tài khoản | Admin | Cao |
| UC-146 | Admin xem danh sách bài đăng | Admin | Cao |
| UC-147 | Admin ẩn/xóa bài vi phạm | Admin | Cao |
| UC-148 | User báo cáo bài vi phạm | User | Trung bình |
| UC-149 | Admin xem danh sách report | Admin | Cao |
| UC-150 | Admin xử lý report | Admin | Cao |
| UC-151 | Admin xem dashboard tổng quan | Admin | Cao |
| UC-152 | Thống kê số bài LOST/FOUND theo thời gian | Admin | Cao |
| UC-153 | Thống kê tỷ lệ trả đồ thành công | Admin | Cao |
| UC-154 | Thống kê danh mục đồ bị mất nhiều nhất | Admin | Trung bình |
| UC-155 | Thống kê khu vực hay mất đồ | Admin | Trung bình |
| UC-156 | Xem top người dùng uy tín | Admin | Trung bình |
| UC-157 | Xuất báo cáo thống kê | Admin | Trung bình |

#### M. Admin Configuration Management

| Mã UC | Use Case | Actor | Mức ưu tiên |
|---|---|---|---|
| UC-158 | Cấu hình chính sách đăng ký email | Admin | Cao |
| UC-159 | Cấu hình thời hạn bài đăng | Admin | Cao |
| UC-160 | Cấu hình số bài tối đa mỗi ngày | Admin | Cao |
| UC-161 | Cấu hình số ảnh tối đa mỗi bài đăng | Admin | Cao |
| UC-162 | Cấu hình dung lượng ảnh tối đa | Admin | Cao |
| UC-163 | Cấu hình định dạng ảnh cho phép | Admin | Trung bình |
| UC-164 | Cấu hình danh mục đồ vật | Admin | Cao |
| UC-165 | Cấu hình khu vực/tòa nhà/phòng trong campus | Admin | Cao |
| UC-166 | Cấu hình handover point | Admin | Cao |
| UC-167 | Cấu hình matching threshold | Admin | Cao |
| UC-168 | Cấu hình trọng số Text/Category/Location/Time | Admin | Cao |
| UC-169 | Cấu hình rule gửi notification/email | Admin | Trung bình |
| UC-170 | Xem lịch sử thay đổi cấu hình | Admin | Trung bình |
| UC-171 | Rollback cấu hình về giá trị trước đó | Admin | Thấp |
| UC-172 | Web/Mobile đọc public configuration để validate form | System | Cao |

---

### 15.3 Phân công Use Case theo tên thành viên

Phần này phân công trực tiếp theo 5 thành viên trong nhóm. Nguyên tắc chính là mỗi thành viên có một phạm vi rõ ràng, tránh chồng chéo trách nhiệm. Đặc biệt, **Trần Thế Lượng chỉ chuyên toàn bộ phần Java/Spring Boot**, không làm React, React Native hoặc Node.js chính.

| Thành viên | Vai trò chính | Công nghệ chính | Phạm vi chính |
|---|---|---|---|
| Trần Thế Lượng | Java/Spring Boot Developer | Java, Spring Boot, Spring Security, JPA/Hibernate, Jakarta Validation, MySQL, Scheduled Task | Java service, Admin Configuration, Admin Dashboard API, Reputation, Handover business, Appointment business validation, Scheduled task |
| Võ Chiêu Quân | Node.js Backend Lead | Node.js, Express.js, TypeScript, JWT, bcryptjs, Zod, MySQL, Cloudinary SDK | Auth API, Post API, Cloudinary, Search/Filter, Claim API base, Chat persistence, Shared API contract |
| Trương Quang Đạt | AI / Matching / Realtime Developer | Node.js, TypeScript, Google Cloud Vision API, TF-IDF, Cosine Similarity, Socket.IO | AI OCR/Image Recognition, Matching Engine, Socket.IO realtime, Notification, Smart notification |
| Phạm Nguyễn Anh Khoa | Mobile Developer | React Native, TypeScript, React Navigation, React Hook Form, Axios, Socket.IO Client | Mobile app, mobile post flow, mobile claim flow, mobile handover/appointment, mobile chat/notification |
| Trần Nguyễn Phong | Web Front-end Developer | React, TypeScript, Vite, TailwindCSS, TanStack Query, Recharts, Socket.IO Client | Web UI, Admin UI, Post UI, Claim UI, Dashboard UI, Configuration UI |

---

#### DEV 1 — Trần Thế Lượng — Java / Spring Boot Developer

**Số lượng UC phụ trách:** khoảng 55 UC  
**Vai trò:** chuyên toàn bộ Java/Spring Boot service.  
**Công nghệ:** Spring Boot, Spring Security, JPA/Hibernate, Jakarta Validation, MySQL, Scheduled Task, Swagger/OpenAPI.

**Lưu ý chỉnh sửa quan trọng:**
- Java không dùng `bcryptjs`; nếu có xử lý hash password trong Java thì dùng `BCryptPasswordEncoder` của Spring Security.
- Refresh token chính do Node.js Auth API quản lý. Java service chỉ verify JWT để bảo vệ các API thuộc Spring Boot extension.
- Scheduled task expire bài đăng/quá hạn nên đặt ở Java để phần Java có vai trò rõ ràng và dễ bảo vệ.

##### A. Java Security Extension

| UC | Task cụ thể |
|---|---|
| UC-002 | Kiểm tra định dạng email hợp lệ theo chính sách đăng ký email; không bắt buộc domain trường. |
| UC-008 | Verify JWT token cho các API thuộc Spring Boot extension; không làm refresh token chính. |
| UC-009 | Mã hóa mật khẩu bằng `BCryptPasswordEncoder` nếu module Java cần xử lý user credential. |
| UC-010 | Phân quyền API Java theo role User/Admin/Staff bằng Spring Security. |

##### B. Claim Business Validation

| UC | Task cụ thể |
|---|---|
| UC-089 | Lưu claim evidence vào DB, validate liên kết `claim_id` và `post_id`. |
| UC-090 | Ẩn evidence khỏi người không liên quan, kiểm tra quyền truy cập bằng Spring Security. |
| UC-091 | Cho người giữ đồ xem bằng chứng Claim nếu có quyền hợp lệ. |
| UC-092 | Yêu cầu người Claim bổ sung thông tin, chuyển trạng thái `NEED_MORE_INFO`. |
| UC-093 | Chấp nhận Claim, validate trạng thái hợp lệ trước khi cập nhật DB. |
| UC-094 | Từ chối Claim kèm lý do, bắt buộc nhập `reason` trước khi reject. |
| UC-095 | Cho người gửi Claim tự hủy, chỉ cho hủy khi Claim đang `PENDING`. |
| UC-096 | Quản lý trạng thái Claim: `PENDING`, `NEED_MORE_INFO`, `ACCEPTED`, `REJECTED`, `CANCELLED`. |

##### C. Handover Point Business

| UC | Task cụ thể |
|---|---|
| UC-098 | Admin tạo điểm tiếp nhận/trả đồ, lưu tên, địa điểm, giờ hoạt động. |
| UC-099 | Admin cập nhật thông tin điểm tiếp nhận. |
| UC-100 | Admin bật/tắt điểm tiếp nhận bằng trạng thái `is_active`. |
| UC-103 | Staff xác nhận đã nhận đồ tại điểm tiếp nhận. |
| UC-104 | Staff cập nhật trạng thái `STORED_AT_POINT`. |
| UC-106 | Staff ghi chú tình trạng đồ khi tiếp nhận. |
| UC-108 | Staff xác nhận đã bàn giao đồ cho người nhận. |
| UC-109 | System cập nhật storage log, ghi nhận ai nhận, thời gian, trạng thái. |
| UC-111 | System đánh dấu đồ quá hạn chưa nhận bằng scheduled task. |

##### D. Appointment Business Validation

| UC | Task cụ thể |
|---|---|
| UC-112 | Tạo lịch hẹn trả đồ, chỉ cho phép khi Claim đã `ACCEPTED`. |
| UC-113 | Đề xuất thời gian trả đồ, validate không trùng lịch cũ hoặc thời gian không hợp lệ. |
| UC-114 | Đề xuất địa điểm trả đồ, liên kết handover point hoặc custom location. |
| UC-115 | Chọn handover point làm nơi nhận đồ, kiểm tra điểm đang hoạt động. |
| UC-117 | Chấp nhận lịch hẹn, cập nhật trạng thái `CONFIRMED` hoặc `ACCEPTED`. |
| UC-118 | Từ chối lịch hẹn kèm lý do. |
| UC-119 | Đổi lịch hẹn, tạo đề xuất mới và chờ xác nhận bên kia. |
| UC-120 | Hủy lịch hẹn, ghi lý do và tạo notification cho hai bên. |
| UC-122 | Xác nhận lịch hẹn đã hoàn tất, kiểm tra quyền xác nhận của các bên. |
| UC-123 | Cập nhật bài đăng sang `RESOLVED` sau khi appointment hoàn tất hợp lệ. |

##### E. Reputation Service

| UC | Task cụ thể |
|---|---|
| UC-136 | Cộng điểm khi trả đồ thành công, ghi `reputation_log`. |
| UC-137 | Cộng điểm khi Claim thành công. |
| UC-138 | Trừ điểm khi Claim sai hoặc bị từ chối nhiều lần. |
| UC-139 | Trừ điểm khi bài bị Admin xóa do vi phạm. |
| UC-141 | Tính và cập nhật cấp bậc uy tín: Mới, Đáng tin, Uy tín, Xuất sắc. |
| UC-143 | Admin xem feedback xấu, lọc danh sách và gắn cờ user nếu cần. |

##### F. Admin Moderation & Dashboard

| UC | Task cụ thể |
|---|---|
| UC-144 | Admin xem danh sách user, hỗ trợ phân trang, lọc, tìm kiếm. |
| UC-145 | Admin khóa/mở khóa tài khoản. |
| UC-146 | Admin xem danh sách bài đăng, lọc theo loại, trạng thái, thời gian. |
| UC-147 | Admin ẩn/xóa bài vi phạm, ghi log hành động. |
| UC-149 | Admin xem danh sách report trong queue chờ xử lý. |
| UC-150 | Admin xử lý report: cảnh báo, ẩn bài, ban user. |
| UC-151 | Admin xem dashboard tổng quan. |
| UC-152 | Thống kê số bài LOST/FOUND theo tuần/tháng. |
| UC-153 | Thống kê tỷ lệ trả đồ thành công `RESOLVED / tổng OPEN`. |
| UC-154 | Thống kê danh mục đồ bị mất nhiều nhất. |
| UC-155 | Thống kê khu vực hay mất đồ, cung cấp dữ liệu cho heatmap. |
| UC-156 | Xem top người dùng uy tín cao nhất. |
| UC-157 | Xuất báo cáo thống kê dạng PDF/CSV. |

##### G. Admin Configuration

| UC | Task cụ thể |
|---|---|
| UC-158 | Cấu hình chính sách đăng ký email, không dùng danh sách domain cố định. |
| UC-159 | Cấu hình thời hạn bài đăng; Java scheduled task tự expire sau N ngày. |
| UC-160 | Cấu hình số bài tối đa mỗi ngày/user. |
| UC-161 | Cấu hình số ảnh tối đa mỗi bài đăng. |
| UC-162 | Cấu hình dung lượng ảnh tối đa. |
| UC-163 | Cấu hình định dạng ảnh cho phép: JPG, PNG, WEBP. |
| UC-164 | Cấu hình danh mục đồ vật: thêm/sửa/xóa category. |
| UC-165 | Cấu hình khu vực/tòa nhà/phòng trong campus. |
| UC-166 | Cấu hình handover point, liên kết campus location. |
| UC-167 | Cấu hình matching threshold, gồm ngưỡng hiển thị và gửi notification. |
| UC-168 | Cấu hình trọng số Text/Category/Location/Time cho matching. |
| UC-169 | Cấu hình rule gửi notification/email. |
| UC-170 | Xem lịch sử thay đổi cấu hình: key, old value, new value, admin, time. |
| UC-171 | Rollback cấu hình về giá trị trước đó. |

**Deliverable của Trần Thế Lượng:**
- `lnfs-java-admin-service` Spring Boot project.
- API Admin Configuration, Admin Moderation, Report, Reputation, Handover, Appointment validation.
- Spring Security + JWT filter cho Java API.
- JPA Entity, Repository, Service, Controller, DTO, Mapper, Exception Handler.
- Swagger/OpenAPI cho Java service.

---

#### DEV 2 — Võ Chiêu Quân — Node.js Backend Lead

**Số lượng UC phụ trách:** khoảng 55 UC  
**Vai trò:** backend chính, API contract, Auth, Post, Cloudinary, Search, Claim API base và Chat persistence.  
**Công nghệ:** Node.js, Express.js, TypeScript, JWT, bcryptjs, Zod, MySQL, Cloudinary SDK, Swagger/OpenAPI.

##### A. Auth API

| UC | Task cụ thể |
|---|---|
| UC-001 | API đăng ký tài khoản, nhận request, validate email hợp lệ, hash password, lưu user. |
| UC-003 | Gửi OTP xác minh email, tạo mã OTP và gửi qua email service. |
| UC-004 | Xác minh OTP email, so khớp mã và đánh dấu `is_verified`. |
| UC-005 | Đăng nhập email + mật khẩu, dùng bcrypt verify, cấp JWT access token và refresh token. |
| UC-006 | Đăng nhập Google OAuth2 với email hợp lệ bất kỳ và cấp JWT. |
| UC-007 | Đăng xuất, blacklist token hoặc xóa refresh token. |
| UC-008 | Refresh access token chính của hệ thống, verify refresh token và cấp access token mới. |
| UC-011 | API xem thông tin cá nhân theo JWT. |
| UC-012 | API cập nhật thông tin cá nhân, validate và lưu DB. |
| UC-013 | API upload ảnh đại diện lên Cloudinary, lưu `secure_url` vào users. |
| UC-014 | API xem lịch sử hoạt động cá nhân, join posts, claims, reputation_log. |
| UC-015 | API xem điểm uy tín cá nhân, trả score, level, log gần nhất. |

##### B. Post API

| UC | Task cụ thể |
|---|---|
| UC-016 | API tạo bài LOST, validate DTO bằng Zod, lưu posts và tags. |
| UC-017 | API tạo bài FOUND, validate DTO, lưu posts và handover point ref. |
| UC-018 | Validate tiêu đề, mô tả, danh mục khi tạo/cập nhật bài. |
| UC-019 | Validate và lưu vị trí phân cấp khu vực → tòa → phòng. |
| UC-020 | Validate và lưu thời gian mất/nhặt đồ. |
| UC-021 | Lưu thông tin xác minh bí mật cho bài LOST, encrypt trước khi lưu. |
| UC-022 | API cập nhật bài đăng, kiểm tra owner, trigger re-matching nếu cần. |
| UC-023 | API đóng bài, chuyển trạng thái `CLOSED`. |
| UC-024 | API xóa mềm bài đăng, chỉ owner/admin được xóa. |
| UC-025 | API xem chi tiết bài đăng, trả post, images, tags, matching. |
| UC-026 | API xem danh sách bài đăng của tôi, lọc theo type/status. |
| UC-027 | API xem danh sách bài LOST public, phân trang. |
| UC-028 | API xem danh sách bài FOUND public, phân trang. |
| UC-029 | API cập nhật trạng thái bài: `OPEN`, `MATCHED`, `RESOLVED`, `CLOSED`. |
| UC-030 | Cung cấp API cập nhật trạng thái bài đăng; scheduled expire chính do Java service thực hiện. |
| UC-031 | API gắn bài FOUND với handover point, lưu `handover_point_id`. |
| UC-032 | API hiển thị vị trí đang giữ đồ, join handover_points. |

##### C. Cloudinary Media API

| UC | Task cụ thể |
|---|---|
| UC-035 | Middleware validate định dạng ảnh JPG/PNG/WEBP trước upload. |
| UC-036 | Middleware validate dung lượng ảnh theo config từ Admin. |
| UC-037 | Upload ảnh bài đăng lên Cloudinary, lưu metadata vào media_assets. |
| UC-038 | Upload ảnh bằng chứng Claim lên Cloudinary, folder riêng, URL private hoặc restricted access. |
| UC-039 | Upload ảnh chat lên Cloudinary, trả `secure_url` cho Socket.IO emit. |
| UC-040 | Upload avatar lên Cloudinary, xóa ảnh cũ bằng `public_id` nếu có. |
| UC-041 | Lưu `secure_url` và `public_id` vào bảng media_assets. |
| UC-042 | Tạo thumbnail/optimized image cho danh sách bài đăng qua Cloudinary transform. |
| UC-045 | Xóa ảnh khỏi Cloudinary bằng public_id khi bài/claim bị xóa. |
| UC-046 | Ẩn URL ảnh bằng chứng Claim, chỉ trả URL khi có quyền truy cập. |
| UC-047 | Gửi URL ảnh sang Google Cloud Vision API sau khi upload thành công. |

##### D. Search & Filter API

| UC | Task cụ thể |
|---|---|
| UC-048 | API tìm kiếm bài đăng theo từ khóa bằng full-text MySQL hoặc LIKE. |
| UC-049 | Xử lý tìm kiếm tiếng Việt có dấu/không dấu bằng normalize trước query. |
| UC-050 | Filter theo loại LOST/FOUND. |
| UC-051 | Filter theo danh mục, lấy danh sách category từ config. |
| UC-052 | Filter theo khu vực/tòa nhà/phòng. |
| UC-053 | Filter theo khoảng thời gian. |
| UC-054 | Filter theo trạng thái bài đăng. |
| UC-055 | Sắp xếp theo mới nhất bằng `ORDER BY created_at DESC`. |
| UC-056 | Sắp xếp theo điểm khớp cao nhất, join matching_results. |
| UC-057 | API Public Lost & Found Board, không cần auth, trả bài đang OPEN. |
| UC-058 | API tạo shareable link cho bài đăng. |

##### E. Claim API Base & Chat Persistence

| UC | Task cụ thể |
|---|---|
| UC-083 | API gửi Claim cho bài FOUND, validate claimant không phải owner. |
| UC-084 | API nhận và lưu mô tả đặc điểm bí mật của đồ. |
| UC-085 | API nhận và lưu thời gian mất gần đúng trong Claim. |
| UC-086 | API nhận và lưu vị trí mất gần đúng trong Claim. |
| UC-087 | API nhận URL ảnh chứng minh từ Cloudinary upload, lưu claim_evidences. |
| UC-088 | API nhận tài liệu/hóa đơn/ảnh cũ bổ sung, lưu thêm evidence. |
| UC-097 | Tự động tạo chat room sau khi Claim được `ACCEPTED`. |
| UC-128 | API upload ảnh chat qua Cloudinary, trả URL cho Socket.IO. |
| UC-129 | API lưu lịch sử chat vào MySQL theo `claim_id`. |
| UC-148 | API báo cáo bài vi phạm, lưu report và notify Admin queue. |
| UC-172 | API public configuration, trả category, location, upload limit cho Web/Mobile validate. |

**Deliverable của Võ Chiêu Quân:**
- Node.js/Express backend chính.
- API contract dùng chung cho Web/Mobile/Java.
- Auth, Post, Cloudinary, Search, Claim base APIs.
- Swagger/OpenAPI tài liệu hóa API.

---

#### DEV 3 — Trương Quang Đạt — AI / Matching / Realtime Developer

**Số lượng UC phụ trách:** khoảng 45 UC  
**Vai trò:** phụ trách điểm kỹ thuật nổi bật: AI, OCR, Matching Engine, Socket.IO realtime và Notification.  
**Công nghệ:** Node.js, TypeScript, Google Cloud Vision API, TF-IDF, Cosine Similarity, Socket.IO, Email service.

##### A. AI Image Recognition & OCR

| UC | Task cụ thể |
|---|---|
| UC-059 | Gọi Google Cloud Vision API với URL ảnh từ Cloudinary. |
| UC-060 | Nhận diện loại đồ vật từ label detection kết quả Vision. |
| UC-061 | OCR trích xuất chữ trong ảnh, đọc nhãn, thẻ, giấy tờ. |
| UC-062 | Gợi ý tag từ kết quả Vision: màu sắc, thương hiệu, chất liệu. |
| UC-063 | Gợi ý danh mục đồ vật, ánh xạ Vision label sang category hệ thống. |
| UC-065 | Lưu tag AI vào bảng tags và liên kết với `post_id`. |
| UC-066 | Dùng tag AI cải thiện vector TF-IDF cho Matching. |
| UC-067 | Fallback về nhập thủ công nếu Vision API lỗi hoặc hết quota. |

##### B. Matching Engine

| UC | Task cụ thể |
|---|---|
| UC-068 | Trigger matching bất đồng bộ khi bài mới được tạo. |
| UC-069 | Trigger re-matching khi bài được cập nhật mô tả/danh mục/vị trí/thời gian. |
| UC-070 | Tiền xử lý văn bản tiếng Việt: lowercase, tách từ, bỏ stopword. |
| UC-071 | Tính TF-IDF vector cho từng bài đăng, cập nhật incremental matrix. |
| UC-072 | Tính Cosine Similarity giữa cặp LOST–FOUND. |
| UC-073 | Tính TextScore từ Cosine Similarity. |
| UC-074 | Tính CategoryScore theo khớp chính xác/cùng nhóm/khác hoàn toàn. |
| UC-075 | Tính LocationScore theo cây phân cấp phòng → tòa → khu vực → campus. |
| UC-076 | Tính TimeScore bằng hàm mũ phân rã `e^(-Δt/72)`. |
| UC-077 | Tính TotalScore tổng hợp từ 4 thành phần theo trọng số. |
| UC-078 | Lưu matching result vào bảng matching_results. |
| UC-080 | Gửi notification khi matching vượt ngưỡng cấu hình. |
| UC-081 | Admin re-run matching thủ công cho một bài đăng cụ thể. |
| UC-082 | Đọc trọng số matching từ Admin Configuration và áp dụng vào TotalScore. |

##### C. Socket.IO Chat Realtime

| UC | Task cụ thể |
|---|---|
| UC-124 | Dựng Socket.IO server, cấu hình namespace, CORS, auth middleware. |
| UC-125 | Xử lý join room theo claim_id, mỗi Claim có một chat room riêng. |
| UC-126 | Xử lý emit gửi tin nhắn văn bản, lưu DB và broadcast đến room. |
| UC-127 | Xử lý nhận tin nhắn realtime, emit đến đúng room/socket. |
| UC-130 | Xử lý seen event, cập nhật `is_read`, emit seen status. |

##### D. Notification và các API hỗ trợ realtime

| UC | Task cụ thể |
|---|---|
| UC-101 | API xem danh sách điểm tiếp nhận đang hoạt động. |
| UC-102 | API cho Finder chọn handover point khi tạo bài FOUND. |
| UC-105 | API xem nơi đang lưu giữ đồ, join handover_points và storage_log. |
| UC-107 | API upload ảnh minh chứng nhận đồ tại handover point lên Cloudinary. |
| UC-110 | API xem danh sách đồ đang lưu giữ/chưa nhận tại handover points. |
| UC-116 | API tạo custom location cho appointment nếu không dùng handover point. |
| UC-121 | Gửi notification/email nhắc lịch hẹn trước giờ trả đồ. |
| UC-131 | Gửi in-app notification realtime khi có tin nhắn mới. |
| UC-132 | Gửi in-app + email notification khi có Claim mới gửi đến bài FOUND. |
| UC-133 | Gửi in-app + email notification khi Claim accepted/rejected. |
| UC-134 | Gửi in-app + email notification khi có matching mới. |
| UC-135 | Smart notification theo điểm: >80% gửi ngay, 50–80% digest email, <50% chỉ in-app. |
| UC-140 | API xem lịch sử thay đổi điểm uy tín, trả reputation_log theo user. |
| UC-142 | API gửi đánh giá sau khi trả đồ, lưu feedback, trigger reputation update. |

**Deliverable của Trương Quang Đạt:**
- Google Vision/OCR service.
- Matching Engine hoàn chỉnh.
- Socket.IO server.
- Notification service.
- Smart notification rule.

---

#### DEV 4 — Phạm Nguyễn Anh Khoa — Mobile Developer

**Số lượng UC phụ trách:** khoảng 70 UC màn hình mobile  
**Vai trò:** phụ trách toàn bộ mobile app cho User/Finder/Claimant.  
**Công nghệ:** React Native, TypeScript, React Navigation, React Hook Form, Axios, Socket.IO Client.

##### A. Auth & Profile Mobile

| UC | Task cụ thể |
|---|---|
| UC-001 | Màn hình đăng ký, nhập email hợp lệ, mật khẩu, tên, MSSV. |
| UC-004 | Màn hình nhập OTP xác minh email. |
| UC-005 | Màn hình đăng nhập email + mật khẩu. |
| UC-007 | Xử lý đăng xuất, xóa JWT lưu trên thiết bị. |
| UC-011 | Màn hình xem thông tin cá nhân, điểm uy tín, cấp bậc. |
| UC-012 | Màn hình chỉnh sửa thông tin cá nhân. |
| UC-013 | Chọn ảnh từ thiết bị, upload avatar, preview trước khi lưu. |
| UC-015 | Hiển thị điểm uy tín, cấp bậc và progress bar. |

##### B. Post Mobile

| UC | Task cụ thể |
|---|---|
| UC-016 | Màn hình tạo bài LOST, form đầy đủ bằng React Hook Form. |
| UC-017 | Màn hình tạo bài FOUND, form đầy đủ, chọn handover point. |
| UC-018 | Validate tiêu đề, mô tả, danh mục phía client. |
| UC-019 | Picker chọn vị trí phân cấp khu vực → tòa → phòng. |
| UC-020 | DateTimePicker chọn thời gian mất/nhặt. |
| UC-021 | Form nhập thông tin xác minh bí mật cho bài LOST. |
| UC-022 | Màn hình chỉnh sửa bài đăng. |
| UC-023 | Xử lý đóng bài bằng confirm dialog. |
| UC-025 | Màn hình chi tiết bài đăng, ảnh carousel, thông tin, nút Claim. |
| UC-026 | Màn hình bài đăng của tôi, tab LOST/FOUND, filter trạng thái. |
| UC-027 | Màn hình danh sách bài LOST public. |
| UC-028 | Màn hình danh sách bài FOUND public. |
| UC-031 | Picker chọn handover point khi tạo bài FOUND mobile. |
| UC-032 | Hiển thị nơi đang giữ đồ trên màn hình chi tiết. |

##### C. Upload ảnh Mobile

| UC | Task cụ thể |
|---|---|
| UC-034 | Chọn ảnh từ camera hoặc gallery trên thiết bị. |
| UC-035 | Validate định dạng ảnh trên client trước khi gửi. |
| UC-036 | Validate dung lượng ảnh theo public config. |
| UC-037 | Gọi API upload ảnh bài đăng, hiển thị progress. |
| UC-038 | Gọi API upload ảnh bằng chứng Claim. |
| UC-039 | Gọi API upload ảnh chat, hiển thị thumbnail trước khi gửi. |
| UC-043 | Hiển thị ảnh từ Cloudinary URL trên mobile, lazy load. |
| UC-044 | Hiển thị ảnh từ Cloudinary trên danh sách và chi tiết. |

##### D. Search & Matching Mobile

| UC | Task cụ thể |
|---|---|
| UC-048 | Màn hình tìm kiếm, thanh search, kết quả realtime. |
| UC-050 | Filter loại LOST/FOUND trên mobile. |
| UC-051 | Filter danh mục trên mobile. |
| UC-052 | Filter khu vực trên mobile. |
| UC-053 | Filter thời gian trên mobile. |
| UC-055 | Sắp xếp mới nhất / điểm khớp cao nhất. |
| UC-064 | Nhận gợi ý danh mục từ AI sau khi upload ảnh, cho confirm/chỉnh sửa. |
| UC-079 | Hiển thị danh sách bài đăng có thể liên quan với badge Khớp cao / Có thể khớp. |

##### E. Evidence Claim Mobile

| UC | Task cụ thể |
|---|---|
| UC-083 | Màn hình gửi Claim từ chi tiết bài FOUND. |
| UC-084 | Form nhập mô tả đặc điểm bí mật của đồ. |
| UC-085 | DateTimePicker nhập thời gian mất gần đúng. |
| UC-086 | Picker nhập vị trí mất gần đúng. |
| UC-087 | Upload ảnh chứng minh quyền sở hữu trong Claim form. |
| UC-088 | Upload thêm tài liệu/hóa đơn/ảnh cũ bổ sung. |
| UC-091 | Màn hình xem bằng chứng Claim nhận được cho Finder mobile. |
| UC-093 | Xử lý chấp nhận Claim bằng confirm dialog. |
| UC-094 | Xử lý từ chối Claim, bắt buộc nhập lý do từ chối. |
| UC-095 | Xử lý hủy Claim bằng confirm dialog. |

##### F. Handover & Appointment Mobile

| UC | Task cụ thể |
|---|---|
| UC-101 | Màn hình danh sách handover point. |
| UC-102 | Picker chọn handover point khi tạo bài FOUND. |
| UC-105 | Hiển thị nơi đang giữ đồ trên màn hình bài FOUND. |
| UC-112 | Màn hình tạo lịch hẹn trả đồ. |
| UC-113 | DateTimePicker đề xuất thời gian trả đồ. |
| UC-114 | Picker đề xuất địa điểm trả đồ. |
| UC-115 | Chọn handover point làm nơi nhận đồ. |
| UC-116 | Nhập custom location nếu tự thỏa thuận. |
| UC-117 | Xử lý chấp nhận lịch hẹn. |
| UC-119 | Màn hình đổi lịch hẹn. |
| UC-120 | Xử lý hủy lịch hẹn. |
| UC-122 | Xác nhận lịch hẹn đã hoàn tất trên mobile. |

##### G. Chat & Notification Mobile

| UC | Task cụ thể |
|---|---|
| UC-124 | Kết nối Socket.IO client trên mobile, auto reconnect. |
| UC-125 | Join room khi vào màn hình chat của claim. |
| UC-126 | Gửi tin nhắn văn bản trong chat. |
| UC-127 | Nhận tin nhắn realtime, cập nhật UI ngay lập tức. |
| UC-128 | Gửi ảnh trong chat, chọn từ gallery, upload rồi emit. |
| UC-130 | Hiển thị seen status trong chat. |
| UC-131 | Badge đếm tin nhắn chưa đọc trên tab bar. |
| UC-132 | Hiển thị notification khi có Claim mới. |
| UC-133 | Hiển thị notification khi Claim accepted/rejected. |
| UC-134 | Hiển thị notification khi có matching mới. |
| UC-136 | Hiển thị điểm uy tín tăng/giảm sau sự kiện. |
| UC-140 | Màn hình lịch sử điểm uy tín. |
| UC-141 | Hiển thị cấp bậc uy tín bằng badge và mô tả cấp. |
| UC-142 | Màn hình gửi đánh giá sau khi trả đồ thành công. |

**Deliverable của Phạm Nguyễn Anh Khoa:**
- Mobile app React Native.
- Mobile Auth/Post/Search/Claim/Handover/Appointment/Chat/Notification screens.
- Mobile API integration.

---

#### DEV 5 — Trần Nguyễn Phong — Web Front-end Developer

**Số lượng UC phụ trách:** khoảng 90 UC trang web  
**Vai trò:** phụ trách toàn bộ Web UI cho User/Admin.  
**Công nghệ:** React, TypeScript, Vite, TailwindCSS, TanStack Query, React Hook Form, Recharts, Socket.IO Client.

##### A. Auth & Profile Web

| UC | Task cụ thể |
|---|---|
| UC-001 | Trang đăng ký, React Hook Form, validate định dạng email realtime. |
| UC-004 | Trang nhập OTP xác minh email. |
| UC-005 | Trang đăng nhập email + mật khẩu. |
| UC-006 | Nút đăng nhập Google OAuth2, redirect flow. |
| UC-007 | Xử lý đăng xuất, xóa token, redirect về home. |
| UC-011 | Trang hồ sơ cá nhân, điểm uy tín, cấp bậc, lịch sử. |
| UC-012 | Trang chỉnh sửa thông tin cá nhân. |
| UC-013 | Upload avatar, drag & drop hoặc chọn file, preview. |
| UC-014 | Trang lịch sử hoạt động cá nhân. |
| UC-015 | Widget điểm uy tín, cấp bậc và progress bar. |

##### B. Post Web

| UC | Task cụ thể |
|---|---|
| UC-016 | Trang tạo bài LOST, form đầy đủ, drag & drop ảnh. |
| UC-017 | Trang tạo bài FOUND, form đầy đủ, chọn handover point. |
| UC-018 | Validate tiêu đề, mô tả, danh mục phía client. |
| UC-019 | Dropdown chọn vị trí phân cấp khu vực → tòa → phòng. |
| UC-020 | DateTimePicker chọn thời gian mất/nhặt. |
| UC-021 | Form nhập thông tin xác minh bí mật cho bài LOST. |
| UC-022 | Trang chỉnh sửa bài đăng. |
| UC-023 | Xử lý đóng bài bằng confirm modal. |
| UC-024 | Xử lý xóa bài bằng confirm modal. |
| UC-025 | Trang chi tiết bài đăng: gallery ảnh, matching suggestion, nút Claim. |
| UC-026 | Trang bài đăng của tôi: tab LOST/FOUND, filter status. |
| UC-027 | Trang Public Board danh sách bài LOST. |
| UC-028 | Trang Public Board danh sách bài FOUND. |
| UC-031 | Dropdown chọn handover point khi tạo bài FOUND. |
| UC-032 | Hiển thị nơi đang giữ đồ trên chi tiết bài. |

##### C. Upload ảnh Web

| UC | Task cụ thể |
|---|---|
| UC-033 | Chọn ảnh từ máy tính, input file, multi-select. |
| UC-035 | Validate định dạng ảnh trên client. |
| UC-036 | Validate dung lượng ảnh theo public config. |
| UC-037 | Upload ảnh bài đăng, progress bar, preview, xóa trước submit. |
| UC-038 | Upload ảnh bằng chứng Claim. |
| UC-039 | Upload ảnh chat, preview thumbnail trước gửi. |
| UC-043 | Hiển thị ảnh từ Cloudinary URL, lazy load, lightbox. |

##### D. Search, Filter & Matching Web

| UC | Task cụ thể |
|---|---|
| UC-048 | Trang tìm kiếm, thanh search, autocomplete gợi ý. |
| UC-049 | Xử lý tìm kiếm tiếng Việt có dấu/không dấu. |
| UC-050 | Filter loại LOST/FOUND bằng toggle button. |
| UC-051 | Filter danh mục bằng multi-select dropdown. |
| UC-052 | Filter khu vực/tòa nhà/phòng bằng cascading dropdown. |
| UC-053 | Filter thời gian bằng date range picker. |
| UC-054 | Filter trạng thái bài đăng. |
| UC-055 | Sắp xếp theo mới nhất. |
| UC-056 | Sắp xếp theo điểm khớp cao nhất. |
| UC-057 | Trang Public Lost & Found Board, hiển thị không cần đăng nhập. |
| UC-058 | Nút copy/share link bài đăng. |
| UC-064 | Hiển thị gợi ý AI danh mục sau upload ảnh, cho confirm/chỉnh sửa. |
| UC-079 | Section “Bài đăng có thể liên quan” với badge Khớp cao/Có thể khớp/Liên quan. |

##### E. Evidence Claim Web

| UC | Task cụ thể |
|---|---|
| UC-083 | Trang gửi Claim, form Evidence-based từ trang chi tiết FOUND. |
| UC-084 | Textarea nhập mô tả đặc điểm bí mật. |
| UC-085 | DateTimePicker nhập thời gian mất gần đúng. |
| UC-086 | Dropdown nhập vị trí mất gần đúng. |
| UC-087 | Upload ảnh chứng minh quyền sở hữu trong Claim form. |
| UC-088 | Upload tài liệu/hóa đơn/ảnh cũ bổ sung. |
| UC-091 | Trang xem bằng chứng Claim nhận được, dành cho Finder web. |
| UC-092 | UI yêu cầu bổ sung thông tin, gửi request `NEED_MORE_INFO`. |
| UC-093 | Nút chấp nhận Claim bằng confirm modal. |
| UC-094 | Nút từ chối Claim, modal nhập lý do bắt buộc. |
| UC-095 | Nút hủy Claim dành cho người gửi. |

##### F. Handover & Appointment Web

| UC | Task cụ thể |
|---|---|
| UC-101 | Trang danh sách handover point: địa điểm, giờ hoạt động. |
| UC-102 | Dropdown chọn handover point khi tạo bài FOUND. |
| UC-105 | Hiển thị nơi đang giữ đồ trên trang chi tiết bài FOUND. |
| UC-110 | Trang Admin xem danh sách đồ đang lưu giữ/chưa nhận. |
| UC-112 | Trang tạo lịch hẹn trả đồ sau Claim accepted. |
| UC-113 | DateTimePicker đề xuất thời gian trả đồ. |
| UC-114 | Dropdown đề xuất địa điểm trả đồ. |
| UC-115 | Chọn handover point làm nơi nhận đồ. |
| UC-116 | Nhập custom location. |
| UC-117 | Nút chấp nhận lịch hẹn. |
| UC-118 | Nút từ chối lịch hẹn kèm lý do. |
| UC-119 | Trang đổi lịch hẹn. |
| UC-120 | Nút hủy lịch hẹn bằng confirm modal. |
| UC-122 | Nút xác nhận lịch hẹn hoàn tất. |

##### G. Chat & Notification Web

| UC | Task cụ thể |
|---|---|
| UC-124 | Kết nối Socket.IO client web. |
| UC-125 | Join room khi mở chat của claim. |
| UC-126 | Giao diện chat: bubble tin nhắn, input gửi. |
| UC-127 | Nhận tin nhắn realtime, cập nhật UI. |
| UC-128 | Upload và gửi ảnh trong chat. |
| UC-130 | Hiển thị seen status trong chat. |
| UC-131 | Badge đếm notification chưa đọc trên navbar. |
| UC-132 | Toast notification khi có Claim mới. |
| UC-133 | Toast notification khi Claim accepted/rejected. |
| UC-134 | Toast notification khi có matching mới. |
| UC-140 | Trang lịch sử điểm uy tín. |
| UC-141 | Widget cấp bậc uy tín: badge, mô tả, progress. |
| UC-142 | Form gửi đánh giá sau khi trả đồ thành công. |
| UC-148 | Nút báo cáo bài vi phạm, modal nhập lý do. |

##### H. Admin Dashboard & Config Web

| UC | Task cụ thể |
|---|---|
| UC-144 | Trang Admin quản lý user: bảng, lọc, tìm kiếm, khóa/mở. |
| UC-145 | Nút khóa/mở khóa tài khoản user. |
| UC-146 | Trang Admin quản lý bài đăng: bảng, lọc, phân trang. |
| UC-147 | Nút ẩn/xóa bài vi phạm bằng confirm modal. |
| UC-149 | Trang Admin review queue báo cáo vi phạm. |
| UC-150 | UI xử lý report: cảnh báo / ẩn bài / ban user. |
| UC-151 | Admin Dashboard tổng quan: metric cards + biểu đồ Recharts. |
| UC-152 | Biểu đồ cột số bài LOST/FOUND theo tuần/tháng. |
| UC-153 | Biểu đồ tỷ lệ trả đồ thành công. |
| UC-154 | Biểu đồ tròn danh mục đồ bị mất nhiều nhất. |
| UC-155 | Heatmap khu vực hay mất đồ. |
| UC-156 | Bảng xếp hạng top user uy tín. |
| UC-157 | Nút xuất báo cáo, download PDF/CSV. |
| UC-158 | Trang Admin Config: cấu hình chính sách đăng ký email. |
| UC-159 | Config thời hạn bài đăng bằng input số ngày. |
| UC-160 | Config số bài tối đa/ngày. |
| UC-161 | Config số ảnh tối đa/bài. |
| UC-162 | Config dung lượng ảnh tối đa. |
| UC-163 | Config định dạng ảnh cho phép. |
| UC-164 | Trang quản lý danh mục: thêm/sửa/xóa category. |
| UC-165 | Trang quản lý campus location: khu vực, tòa, phòng. |
| UC-166 | Trang quản lý handover point: tạo/sửa/bật/tắt. |
| UC-167 | Config matching threshold bằng slider điểm hiển thị. |
| UC-168 | Config trọng số matching bằng slider 4 thành phần. |
| UC-169 | Config rule notification/email bằng toggle bật/tắt từng kênh. |
| UC-170 | Trang lịch sử thay đổi config: key/old/new/admin/time. |
| UC-171 | Nút rollback cấu hình về giá trị trước. |
| UC-172 | Đọc public config để pre-validate form upload/category/location. |

**Deliverable của Trần Nguyễn Phong:**
- Web User UI.
- Web Admin UI.
- Dashboard Recharts.
- Admin Configuration UI.
- Socket.IO client integration cho Web.

---

### 15.4 Bảng tổng hợp phân công theo tên thành viên

| Thành viên | Vai trò | Số UC ước tính | Nhóm UC chính |
|---|---|---:|---|
| Trần Thế Lượng | Java/Spring Boot Developer | ~55 | Security extension, Claim business, Handover, Appointment, Reputation, Admin, Config, Scheduled task |
| Võ Chiêu Quân | Node.js Backend Lead | ~55 | Auth, User, Post, Cloudinary, Search, Claim API base, Chat persistence, Public config |
| Trương Quang Đạt | AI/Matching/Realtime Developer | ~45 | Google Vision, OCR, Auto Tag, TF-IDF, Cosine, Socket.IO, Notification |
| Phạm Nguyễn Anh Khoa | Mobile Developer | ~70 | Mobile Auth, Post, Upload, Search, Claim, Handover, Appointment, Chat, Notification |
| Trần Nguyễn Phong | Web Front-end Developer | ~90 | Web User UI, Web Admin UI, Dashboard, Config UI, Claim UI, Chat UI |

---

### 15.5 Thứ tự ưu tiên triển khai

| Sprint | Mục tiêu | Thành viên chính |
|---|---|---|
| Sprint 1 | Repository, coding convention, database core, API contract, Web/Mobile skeleton, Java skeleton | Võ Chiêu Quân, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa, Trần Thế Lượng |
| Sprint 2 | Auth, User Profile, Cloudinary upload base, Post CRUD | Võ Chiêu Quân, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa |
| Sprint 3 | Search/Filter, Google Vision, AI tag, Matching Engine | Võ Chiêu Quân, Trương Quang Đạt, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa |
| Sprint 4 | Evidence-based Claim Form, Claim state, claim evidence image | Võ Chiêu Quân, Trần Thế Lượng, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa |
| Sprint 5 | Campus Handover Point, Item Return Appointment | Trần Thế Lượng, Võ Chiêu Quân, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa |
| Sprint 6 | Socket.IO Chat, Notification, Appointment Reminder | Trương Quang Đạt, Võ Chiêu Quân, Trần Nguyễn Phong, Phạm Nguyễn Anh Khoa |
| Sprint 7 | Admin Dashboard, Admin Configuration, Report, Reputation | Trần Thế Lượng, Trần Nguyễn Phong, Võ Chiêu Quân |
| Sprint 8 | Testing, bug fixing, deploy Vercel/Render, demo script, report | Cả nhóm |

---

### 15.6 Quy tắc tránh trùng việc

1. **Võ Chiêu Quân** là owner API contract chính; Web/Mobile không tự đặt field hoặc response tùy ý.
2. **Trần Thế Lượng** là owner toàn bộ Java/Spring Boot; Java không bị kéo sang UI hoặc Node.js CRUD thường.
3. **Trương Quang Đạt** là owner AI/Matching/Realtime; không bị kéo sang làm UI hoặc CRUD thường.
4. **Trần Nguyễn Phong** làm Web UI, **Phạm Nguyễn Anh Khoa** làm Mobile UI; tránh cùng sửa một client.
5. Cloudinary upload phải đi qua cùng một quy chuẩn metadata `media_assets` để bài đăng, claim, chat và avatar dùng thống nhất.
6. Admin Configuration phải được Node.js và AI/Matching service đọc lại để áp dụng thật, không chỉ làm UI giả.
7. Handover Point và Appointment phải liên kết với Claim/Post status để luồng nghiệp vụ có ý nghĩa.
8. Refresh token chính do Node.js Auth API quản lý; Java service chỉ verify JWT cho các API extension.
9. Scheduled task hết hạn bài/quá hạn nhận đồ nên để Java xử lý để phần Java có nghiệp vụ rõ ràng.
10. Mọi API quan trọng phải có Swagger/OpenAPI để Web, Mobile, Node.js và Java tích hợp thống nhất.

---

*Đề cương được lập ngày: ___/___/20___*  
*Chữ ký sinh viên: ___________________*  
*Chữ ký GVHD: ______________________*
