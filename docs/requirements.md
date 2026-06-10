# Functional and Non-Functional Requirements

Tài liệu này mô tả Functional Requirements (FR) và Non-Functional Requirements (NFR) theo từng module của FPTU Lost & Found System.

## Legend

| Field | Meaning |
| --- | --- |
| Priority `P0` | Bắt buộc cho MVP/demo core flow. Thiếu là chặn luồng chính. |
| Priority `P1` | Quan trọng cho bản hoàn thiện gần nhất, nhưng chưa chặn MVP. |
| Priority `P2` | Mở rộng, nâng cấp hoặc future scope. |
| Status `Implemented` | Đã có trong code hiện tại. |
| Status `Partial` | Đã có một phần, còn thiếu luồng hoặc cần hardening. |
| Status `Planned` | Chưa implement đầy đủ. |

## Module Map

| Module | Scope |
| --- | --- |
| AUTH | Đăng ký, OTP, đăng nhập, token, quên mật khẩu, hồ sơ. |
| ROLE | Role, authorization, phân quyền Admin/Staff/User. |
| BOARD | Public board và community feed cho sinh viên/giảng viên. |
| POST | Tạo, cập nhật, trạng thái và rule của bài LOST/FOUND. |
| MEDIA | Upload ảnh bài đăng, evidence, avatar. |
| AI/MATCH | Google Vision, OCR, matching lost/found. |
| CLAIM | Claim đồ, evidence, state transition. |
| HANDOVER | Điểm bàn giao, lưu giữ, trả đồ, storage log. |
| ADMIN | Dashboard, kiểm duyệt bài đăng và CRUD quản trị. |
| REPORT | Report vi phạm và moderation action. |
| CONFIG | Public/admin config và lịch sử thay đổi. |
| APPT | Return appointment sau claim accepted. |
| CHAT/NOTI | Chat realtime và notification. |
| MOBILE | Mobile application flows. |

## 1. AUTH - Authentication and Account Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AUTH-01 | User có thể yêu cầu OTP đăng ký bằng email trước khi tạo tài khoản. | P0 | Implemented |
| FR-AUTH-02 | Hệ thống chỉ tạo tài khoản khi OTP đăng ký hợp lệ. | P0 | Implemented |
| FR-AUTH-03 | Khi đăng ký, user phải chọn role đối tượng `STUDENT` hoặc `LECTURER`. | P0 | Implemented |
| FR-AUTH-04 | User có thể đăng nhập bằng email và password. | P0 | Implemented |
| FR-AUTH-05 | User có thể refresh access token bằng refresh token hợp lệ. | P0 | Implemented |
| FR-AUTH-06 | User có thể logout và revoke refresh token hiện tại. | P0 | Implemented |
| FR-AUTH-07 | User có thể yêu cầu OTP quên mật khẩu qua email. | P0 | Implemented |
| FR-AUTH-08 | User có thể reset password bằng OTP hợp lệ. | P0 | Implemented |
| FR-AUTH-09 | User có thể xem profile hiện tại. | P1 | Implemented |
| FR-AUTH-10 | User có thể cập nhật họ tên, mã sinh viên/giảng viên và số điện thoại. | P1 | Implemented |
| FR-AUTH-11 | User có thể upload avatar. | P1 | Implemented |
| FR-AUTH-12 | User có thể đăng nhập bằng Google OAuth. | P2 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-AUTH-01 | Password phải hash bằng bcrypt, không lưu raw password. | P0 | Implemented |
| NFR-AUTH-02 | Refresh token phải lưu dạng hash và rotate khi refresh. | P0 | Implemented |
| NFR-AUTH-03 | Reset password phải revoke toàn bộ active refresh token của user. | P0 | Implemented |
| NFR-AUTH-04 | OTP phải có thời hạn và giới hạn số lần nhập sai. | P0 | Implemented |
| NFR-AUTH-05 | Auth API phải trả lỗi có cấu trúc `{ success, error/message }`. | P1 | Implemented |
| NFR-AUTH-06 | Nếu SMTP chưa cấu hình trong development, hệ thống không crash và có thể log OTP dev. | P1 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-AUTH-01 | Given email hợp lệ và chưa thuộc tài khoản active, when user bấm nhận OTP, then hệ thống tạo OTP còn hạn và gửi email hoặc log dev OTP nếu SMTP thiếu. |
| FR-AUTH-02 | Given OTP hợp lệ, when user submit form đăng ký, then hệ thống tạo user, hash password, gán role audience và không cần bước verify OTP riêng sau đăng ký. |
| FR-AUTH-04 | Given email/password đúng và user `ACTIVE`, when login, then hệ thống trả access token, refresh token và thông tin roles. |
| FR-AUTH-08 | Given reset OTP hợp lệ, when user đổi mật khẩu, then password mới được hash và mọi refresh token cũ bị revoke. |

## 2. ROLE - Role and Authorization Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-ROLE-01 | Hệ thống hỗ trợ `USER`, `STUDENT`, `LECTURER`, `STAFF`, `ADMIN`. | P0 | Implemented |
| FR-ROLE-02 | API cần đăng nhập phải kiểm tra JWT access token. | P0 | Implemented |
| FR-ROLE-03 | API admin phải yêu cầu role phù hợp. | P0 | Implemented |
| FR-ROLE-04 | Chỉ `ADMIN` được quản lý user, role, category, location, handover point và report. | P0 | Implemented |
| FR-ROLE-05 | `STAFF` chỉ được truy cập phần overview/operation được phép, không được gọi API quản trị nhạy cảm. | P0 | Implemented |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-ROLE-01 | Quyền `STAFF` phải thấp hơn `ADMIN` theo nguyên tắc least privilege. | P0 | Implemented |
| NFR-ROLE-02 | Node API và Java Admin Service phải đọc role từ JWT theo cùng format. | P0 | Implemented |
| NFR-ROLE-03 | Khi thiếu quyền, API phải trả 403 rõ ràng. | P1 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-ROLE-04 | Given user role `STAFF`, when gọi endpoint đổi role/khóa user/CRUD category/location/report action, then API trả 403. |
| FR-ROLE-04 | Given user role `ADMIN`, when gọi endpoint quản trị nhạy cảm với payload hợp lệ, then API xử lý thành công và ghi dữ liệu đúng. |

## 3. BOARD - Public Board and Community UI Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-BOARD-01 | Người dùng có thể xem danh sách bài Lost & Found công khai không cần đăng nhập. | P0 | Implemented |
| FR-BOARD-02 | User UI hiển thị dạng community feed/card, tách khỏi dashboard admin. | P0 | Implemented |
| FR-BOARD-03 | User có thể tìm kiếm bài theo từ khóa. | P0 | Implemented |
| FR-BOARD-04 | User có thể lọc theo loại bài, danh mục, khu vực, trạng thái và thời gian. | P0 | Implemented |
| FR-BOARD-05 | User có thể sắp xếp theo mới nhất hoặc điểm match cao nhất. | P1 | Implemented |
| FR-BOARD-06 | User có thể mở chi tiết bài, xem mô tả, vị trí, ảnh, AI tags và match. | P0 | Implemented |
| FR-BOARD-07 | User có thể copy/share link bài đăng. | P1 | Implemented |
| FR-BOARD-08 | Card trong community feed hiển thị ảnh upload đầu tiên làm ảnh bìa; nếu bài chưa có ảnh thì dùng trạng thái minh họa mặc định. | P1 | Implemented |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-BOARD-01 | Public board phải hoạt động tốt trên desktop và mobile. | P0 | Implemented |
| NFR-BOARD-02 | User UI ưu tiên thao tác nhanh: search, filter, card, CTA đăng tin. | P0 | Implemented |
| NFR-BOARD-03 | Control chính phải dùng button/input/select semantic. | P1 | Implemented |
| NFR-BOARD-04 | Danh sách bài phải phân trang để tránh tải quá nhiều dữ liệu. | P0 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-BOARD-01 | Given chưa đăng nhập, when mở public board, then user vẫn thấy danh sách bài public và bộ lọc cơ bản. |
| FR-BOARD-03/04 | Given keyword/filter hợp lệ, when user áp dụng tìm kiếm/lọc, then danh sách chỉ trả bài phù hợp và vẫn phân trang. |
| FR-BOARD-02 | Given user role sinh viên/giảng viên, when vào giao diện chính, then UI là feed/card, không phải bảng CRUD của admin. |
| FR-BOARD-08 | Given bài đăng có nhiều ảnh, when bài xuất hiện ở feed, then ảnh upload đầu tiên được dùng làm ảnh bìa của card. |

## 4. POST - Lost/Found Post Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-POST-01 | User đăng nhập có thể tạo bài mất đồ `LOST`. | P0 | Implemented |
| FR-POST-02 | User đăng nhập có thể tạo bài nhặt được đồ `FOUND`. | P0 | Implemented |
| FR-POST-03 | Bài đăng phải có title, description và category. | P0 | Implemented |
| FR-POST-04 | Thời gian mất/nhặt không được nằm trong tương lai. | P0 | Implemented |
| FR-POST-05 | Địa điểm cụ thể phải thuộc khu vực lớn; phòng/lầu/góc chi tiết được nhập dạng text tự do trong bài đăng. | P0 | Implemented |
| FR-POST-06 | Bài `FOUND` phải có nơi đang giữ đồ: handover point active hoặc khu vực lớn/địa điểm cụ thể/vị trí text người nhặt đang tạm giữ. | P0 | Implemented |
| FR-POST-07 | Bài `LOST` phải có mô tả xác minh quyền sở hữu, ví dụ dấu hiệu riêng, serial, vết trầy, vật bên trong hoặc thông tin hóa đơn. | P0 | Implemented |
| FR-POST-08 | Owner hoặc admin có thể cập nhật bài. | P0 | Implemented |
| FR-POST-09 | Owner hoặc admin có thể cập nhật trạng thái bài. | P0 | Implemented |
| FR-POST-10 | Owner hoặc admin có thể xóa mềm bài. | P0 | Implemented |
| FR-POST-11 | Cron job chuyển bài quá hạn sang `EXPIRED`. | P1 | Planned |
| FR-POST-12 | Bài đăng phải có thông tin liên hệ do người đăng cung cấp. | P0 | Implemented |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-POST-01 | Secret verification phải được hash, không lưu raw value. | P0 | Implemented |
| NFR-POST-02 | `handover_point_id` phải được bảo vệ bằng foreign key. | P0 | Implemented |
| NFR-POST-03 | Chỉ owner hoặc admin mới được sửa/xóa bài. | P0 | Implemented |
| NFR-POST-04 | Post list cần index/filter phù hợp theo status, type, category, location, time. | P1 | Partial |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-POST-01 | Given user đã login và nhập đủ field bắt buộc, when tạo `LOST`, then bài được lưu với secret verification đã hash. |
| FR-POST-02/06 | Given user tạo `FOUND`, when không chọn handover point, then vẫn hợp lệ nếu có thông tin khu vực lớn/địa điểm cụ thể/vị trí text đang tạm giữ đồ. |
| FR-POST-05 | Given địa điểm cụ thể không thuộc khu vực lớn đã chọn, when submit bài, then API trả validation error. |
| FR-POST-12 | Given thiếu thông tin liên hệ, when submit bài, then API trả validation error. |
| FR-POST-08/10 | Given user không phải owner/admin, when sửa hoặc xóa bài, then API trả 403. |

## 5. MEDIA - Media Upload Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-MEDIA-01 | User có thể upload nhiều ảnh cho bài đăng. | P0 | Implemented |
| FR-MEDIA-02 | Claimant có thể upload ảnh bằng chứng claim. | P0 | Implemented |
| FR-MEDIA-03 | User có thể upload avatar cá nhân. | P1 | Implemented |
| FR-MEDIA-04 | Khi upload avatar mới, asset cũ có thể bị xóa khỏi Cloudinary. | P1 | Implemented |
| FR-MEDIA-05 | Owner/admin có thể xóa media của bài. | P1 | Implemented |
| FR-MEDIA-06 | User có thể upload ảnh trong chat. | P2 | Planned |
| FR-MEDIA-07 | Ảnh đầu tiên của `post_media` được dùng làm ảnh bìa trong danh sách bài cộng đồng. | P1 | Implemented |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-MEDIA-01 | File upload phải đúng định dạng được cấu hình. | P0 | Implemented |
| NFR-MEDIA-02 | File upload phải đúng giới hạn dung lượng được cấu hình. | P0 | Implemented |
| NFR-MEDIA-03 | Nếu Cloudinary chưa cấu hình, API phải trả lỗi có cấu trúc thay vì crash. | P1 | Implemented |
| NFR-MEDIA-04 | Claim evidence phải lưu private và chỉ trả URL cho user có quyền. | P0 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-MEDIA-01/02 | Given file đúng format/size, when upload, then hệ thống lưu secure URL/public id và gắn đúng post hoặc claim. |
| FR-MEDIA-01/02 | Given file sai format hoặc quá size, when upload, then API trả validation error và không lưu media. |
| FR-MEDIA-02 | Given user không liên quan claim, when request evidence URL, then API từ chối truy cập. |

## 6. AI/MATCH - AI Recognition and Matching Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-AI-01 | Hệ thống gửi ảnh tới Google Vision để lấy labels/OCR nếu có cấu hình. | P1 | Implemented |
| FR-AI-02 | AI tags phải được lưu gắn với post. | P1 | Implemented |
| FR-MATCH-01 | Hệ thống chạy matching sau khi tạo bài mới. | P0 | Implemented |
| FR-MATCH-02 | Hệ thống chạy lại matching sau khi cập nhật bài. | P0 | Implemented |
| FR-MATCH-03 | Hệ thống tính text, category, location, time và total score. | P0 | Implemented |
| FR-MATCH-04 | Kết quả đạt threshold phải được lưu. | P0 | Implemented |
| FR-MATCH-05 | Hệ thống gửi notification khi có match tốt. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-AI-01 | Nếu Google Vision lỗi hoặc thiếu API key, upload ảnh vẫn tiếp tục. | P1 | Implemented |
| NFR-MATCH-01 | Matching không được block request tạo/cập nhật bài. | P0 | Implemented |
| NFR-MATCH-02 | Threshold và weights phải đọc từ config. | P0 | Implemented |
| NFR-MATCH-03 | Matching nên chuyển sang background queue khi dữ liệu lớn. | P1 | Planned |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-MATCH-01/02 | Given bài được tạo/cập nhật, when request hoàn tất, then matching được enqueue/chạy bất đồng bộ và không làm request bị chậm theo toàn bộ dataset. |
| FR-MATCH-03/04 | Given cặp LOST/FOUND đủ ngưỡng, when matching chạy, then `match_results` lưu score thành phần và total score. |

## 7. CLAIM - Claim and Evidence Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-CLAIM-01 | User có thể gửi claim cho bài `FOUND`. | P0 | Implemented |
| FR-CLAIM-02 | Owner không được claim bài của chính mình. | P0 | Implemented |
| FR-CLAIM-03 | Chỉ bài `OPEN` hoặc `MATCHED` mới được claim. | P0 | Implemented |
| FR-CLAIM-04 | Một user chỉ được claim một lần cho cùng một post. | P0 | Implemented |
| FR-CLAIM-05 | Claimant, chủ bài, staff/admin có quyền mới xem được claim. | P0 | Implemented |
| FR-CLAIM-06 | Claimant có thể upload bằng chứng sở hữu. | P0 | Implemented |
| FR-CLAIM-07 | Staff/admin có thể yêu cầu claimant bổ sung thông tin. | P0 | Implemented |
| FR-CLAIM-08 | Staff/admin có thể accept claim khi trạng thái hợp lệ. | P0 | Implemented |
| FR-CLAIM-09 | Staff/admin có thể reject claim với lý do. | P0 | Implemented |
| FR-CLAIM-10 | Claimant có thể cancel claim khi còn `PENDING`. | P0 | Implemented |
| FR-CLAIM-11 | Hệ thống tạo chat room sau khi claim accepted. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-CLAIM-01 | Duplicate claim phải bị chặn ở service và database unique key. | P0 | Implemented |
| NFR-CLAIM-02 | Claim transition phải kiểm tra trạng thái trước khi ghi. | P0 | Implemented |
| NFR-CLAIM-03 | Java claim transition phải lock row khi ghi. | P0 | Implemented |
| NFR-CLAIM-04 | Claim `NEED_MORE_INFO` chỉ được accept khi có evidence mới. | P0 | Implemented |
| NFR-CLAIM-05 | Evidence không được lộ cho user không liên quan. | P0 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-CLAIM-01/04 | Given user đã claim post A, when claim lại cùng post, then API trả lỗi duplicate và DB unique key bảo vệ dữ liệu. |
| FR-CLAIM-07/08 | Given claim `NEED_MORE_INFO`, when admin accept mà claimant chưa upload evidence mới, then API từ chối transition. |
| FR-CLAIM-08/09 | Given hai request admin xử lý cùng claim, when ghi trạng thái, then Java service lock row và chỉ một transition hợp lệ được commit. |
| FR-CLAIM-10 | Given claim không còn `PENDING`, when claimant cancel, then API từ chối. |

## 8. HANDOVER - Handover Point and Storage Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-HANDOVER-01 | User có thể xem danh sách điểm bàn giao active. | P0 | Implemented |
| FR-HANDOVER-02 | Admin có thể tạo điểm bàn giao. | P0 | Implemented |
| FR-HANDOVER-03 | Admin có thể cập nhật điểm bàn giao. | P0 | Implemented |
| FR-HANDOVER-04 | Admin có thể bật/tắt điểm bàn giao. | P0 | Implemented |
| FR-HANDOVER-05 | Staff/admin có thể xác nhận đã nhận đồ tại điểm bàn giao. | P0 | Implemented |
| FR-HANDOVER-06 | Staff/admin có thể cập nhật trạng thái lưu giữ đồ. | P1 | Partial |
| FR-HANDOVER-07 | Staff/admin có thể xác nhận đã trả đồ. | P0 | Implemented |
| FR-HANDOVER-08 | Admin/staff có thể xem danh sách đồ đang lưu giữ/chưa nhận. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-HANDOVER-01 | Handover point liên kết location phải dùng id hợp lệ. | P0 | Implemented |
| NFR-HANDOVER-02 | Mỗi thao tác nhận/lưu/trả đồ phải có storage log. | P0 | Implemented |
| NFR-HANDOVER-03 | CRUD điểm bàn giao trên Node Admin API chỉ dành cho `ADMIN`. | P0 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-HANDOVER-02/03/04 | Given user role `ADMIN`, when tạo/sửa/bật tắt handover point với dữ liệu hợp lệ, then dữ liệu được lưu và phản ánh ở public config/list active. |
| FR-HANDOVER-05/07 | Given staff/admin xác nhận nhận hoặc trả đồ, when action thành công, then hệ thống ghi storage log với actor, thời gian và trạng thái. |

## 9. ADMIN - Admin Dashboard and CRUD Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-ADMIN-01 | Admin UI có sidebar gồm Dashboard, Kiểm duyệt, Danh mục, Khu vực, Bàn giao, Người dùng, Báo cáo. | P0 | Implemented |
| FR-ADMIN-02 | Admin dashboard hiển thị metric tổng quan. | P0 | Implemented |
| FR-ADMIN-03 | Admin có thể tạo, sửa, ẩn/kích hoạt danh mục theo hai cấp dễ hiểu: nhóm chính và danh mục cụ thể. | P0 | Implemented |
| FR-ADMIN-04 | Admin có thể tạo, sửa, ẩn/kích hoạt khu vực; form UI không yêu cầu nhập thứ tự hiển thị. | P0 | Implemented |
| FR-ADMIN-05 | Admin có thể tạo, sửa, ẩn/kích hoạt địa điểm cụ thể thuộc khu vực lớn; form UI không yêu cầu nhập thứ tự hiển thị. | P0 | Implemented |
| FR-ADMIN-06 | Admin không quản lý phòng bằng CRUD riêng; phòng được nhập text khi user đăng tin. | P0 | Implemented |
| FR-ADMIN-07 | Admin có thể tạo, sửa, ẩn/kích hoạt điểm bàn giao. | P0 | Implemented |
| FR-ADMIN-08 | Admin có thể tạo user, đổi status và đổi role. | P0 | Implemented |
| FR-ADMIN-09 | Admin có thể xem report queue. | P0 | Implemented |
| FR-ADMIN-10 | Admin có thể xử lý report bằng warn/hide/delete/ban/unban. | P0 | Implemented |
| FR-ADMIN-11 | Admin có tab kiểm duyệt bài đăng với filter theo loại, trạng thái, từ khóa, xem chi tiết bài và các action hoàn thành/đóng/mở lại/ẩn/xóa mềm. | P1 | Implemented |
| FR-ADMIN-12 | Admin có thể export thống kê PDF/CSV. | P2 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-ADMIN-01 | Admin UI phải tách rõ với community user UI. | P0 | Implemented |
| NFR-ADMIN-02 | API quản trị nhạy cảm chỉ cho `ADMIN`. | P0 | Implemented |
| NFR-ADMIN-03 | Admin UI ưu tiên bảng, form, nút sửa, nút kích hoạt/ẩn và trạng thái rõ ràng. | P1 | Implemented |
| NFR-ADMIN-04 | Admin UI không được tràn ngang trên màn hình nhỏ. | P1 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-ADMIN-01 | Given admin đăng nhập, when mở `/admin`, then sidebar hiển thị đủ Dashboard, Kiểm duyệt, Danh mục, Khu vực, Bàn giao, Người dùng, Báo cáo. |
| FR-ADMIN-03/04/05/07 | Given payload hợp lệ, when admin tạo/sửa/ẩn/kích hoạt master data, then API lưu DB và UI refresh danh sách. |
| FR-ADMIN-03 | Given admin tạo hoặc sửa danh mục, when chọn nhóm hiển thị, then hệ thống chỉ cho phép nhóm chính hoặc danh mục cụ thể nằm trực tiếp trong nhóm chính, không cho lồng nhiều tầng. |
| FR-ADMIN-06 | Given admin mở tab Khu vực, when xem form quản trị, then không có form CRUD phòng; user nhập phòng/lầu/góc chi tiết trong form đăng tin. |
| FR-ADMIN-08 | Given admin đổi role/status user, when action thành công, then user_roles hoặc account status được cập nhật đúng. |
| FR-ADMIN-10 | Given admin xử lý report với action, when submit, then report chuyển trạng thái reviewed và moderation action được ghi. |
| FR-ADMIN-11 | Given admin mở tab Kiểm duyệt, when lọc và chọn action trên bài đăng, then hệ thống cập nhật trạng thái hoặc xóa mềm bài và refresh danh sách. |
| FR-ADMIN-11 | Given admin cần xem đủ ngữ cảnh bài viết, when bấm xem chi tiết ở dòng kiểm duyệt, then drawer chi tiết bài hiển thị mô tả, ảnh, liên hệ, AI tags và matching. |

## 10. REPORT - Report and Moderation Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-REPORT-01 | Admin có thể xem danh sách report. | P0 | Implemented |
| FR-REPORT-02 | Admin có thể đánh dấu report là đã xử lý. | P0 | Implemented |
| FR-REPORT-03 | Admin có thể bỏ qua report không hợp lệ. | P1 | Implemented |
| FR-REPORT-04 | Admin có thể ghi moderation action cảnh báo user. | P0 | Implemented |
| FR-REPORT-05 | Admin có thể ẩn bài vi phạm. | P0 | Implemented |
| FR-REPORT-06 | Admin có thể xóa mềm bài vi phạm. | P0 | Implemented |
| FR-REPORT-07 | Admin có thể khóa user vi phạm. | P0 | Implemented |
| FR-REPORT-08 | Admin có thể mở khóa user. | P1 | Implemented |
| FR-REPORT-09 | User gửi report vi phạm từ UI. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-REPORT-01 | Mỗi moderation action phải được lưu vào `moderation_actions`. | P0 | Implemented |
| NFR-REPORT-02 | Chỉ `ADMIN` được xử lý report. | P0 | Implemented |
| NFR-REPORT-03 | Report phải lưu reporter, target, reviewer và thời điểm xử lý. | P0 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-REPORT-02/04/05/06/07 | Given admin xử lý report với action hợp lệ, when submit, then report có reviewer/reviewed_at và action tương ứng được áp dụng. |
| FR-REPORT-05/06 | Given action hide/delete post, when xử lý thành công, then bài không còn xuất hiện trên public board. |

## 11. CONFIG - Configuration Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-CONFIG-01 | Web/mobile có thể đọc public config. | P0 | Implemented |
| FR-CONFIG-02 | Admin có thể cấu hình số ảnh, size và định dạng ảnh. | P0 | Implemented |
| FR-CONFIG-03 | Admin có thể cấu hình threshold matching. | P1 | Implemented |
| FR-CONFIG-04 | Admin có thể cấu hình text/category/location/time weights. | P1 | Implemented |
| FR-CONFIG-05 | Admin có thể xem lịch sử thay đổi config. | P1 | Implemented |
| FR-CONFIG-06 | Admin có thể rollback config về giá trị cũ. | P2 | Planned |
| FR-CONFIG-07 | Web có trang chỉnh config đầy đủ. | P2 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-CONFIG-01 | Client và server nên dùng config để validate thay vì hard-code. | P0 | Implemented |
| NFR-CONFIG-02 | Mọi thay đổi config cần ghi lịch sử. | P1 | Implemented |
| NFR-CONFIG-03 | Nếu config thiếu, server phải có default hợp lý. | P1 | Implemented |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-CONFIG-01/02 | Given admin thay đổi image config, when client đọc public config, then client nhận giới hạn mới để validate upload/form. |
| FR-CONFIG-05 | Given config được cập nhật, when xem history, then có actor, key, giá trị cũ/mới và thời điểm thay đổi. |

## 12. APPT - Appointment Module

Appointment status enum thống nhất: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`, `RESCHEDULED`.

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-APPT-01 | User có thể tạo lịch hẹn trả đồ sau khi claim accepted. | P1 | Planned |
| FR-APPT-02 | Appointment chỉ được tạo nếu claim đã `ACCEPTED`. | P1 | Planned |
| FR-APPT-03 | Người nhận có thể accept lịch hẹn và chuyển status thành `ACCEPTED`. | P1 | Planned |
| FR-APPT-04 | Người nhận có thể từ chối lịch hẹn với lý do. | P1 | Planned |
| FR-APPT-05 | User có thể đề xuất lịch mới. | P1 | Planned |
| FR-APPT-06 | Staff/admin có thể xác nhận hoàn tất lịch hẹn. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-APPT-01 | Appointment phải kiểm tra trạng thái claim và trạng thái lịch trước khi ghi. | P1 | Planned |
| NFR-APPT-02 | Hệ thống nên tránh trùng lịch tại cùng điểm bàn giao. | P1 | Planned |
| NFR-APPT-03 | Appointment cần hỗ trợ notification/email reminder. | P2 | Planned |

### Core Acceptance Criteria

| FR | Acceptance Criteria |
| --- | --- |
| FR-APPT-01/02 | Given claim chưa `ACCEPTED`, when user tạo appointment, then API từ chối. |
| FR-APPT-03 | Given appointment `PENDING`, when người nhận accept, then status chuyển thành `ACCEPTED`. |
| FR-APPT-06 | Given appointment đã hoàn tất bàn giao, when staff/admin complete, then appointment thành `COMPLETED` và post liên quan có thể chuyển `RESOLVED`. |

## 13. CHAT/NOTI - Chat and Notification Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-CHAT-01 | Hệ thống tạo phòng chat khi claim accepted. | P1 | Planned |
| FR-CHAT-02 | User liên quan có thể join room theo claim. | P1 | Planned |
| FR-CHAT-03 | User có thể gửi tin nhắn văn bản. | P1 | Planned |
| FR-CHAT-04 | User có thể gửi ảnh trong chat. | P2 | Planned |
| FR-CHAT-05 | Hệ thống hiển thị trạng thái đã xem. | P2 | Planned |
| FR-NOTI-01 | Chủ bài nhận thông báo khi có claim mới. | P1 | Planned |
| FR-NOTI-02 | Claimant nhận thông báo khi claim accepted/rejected. | P1 | Planned |
| FR-NOTI-03 | User nhận thông báo khi có match tốt. | P1 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-CHAT-01 | Chat nên dùng Socket.IO hoặc cơ chế realtime tương đương. | P1 | Planned |
| NFR-CHAT-02 | Chỉ user liên quan đến claim mới được join chat room. | P1 | Planned |
| NFR-NOTI-01 | Notification quan trọng nên có fallback qua email nếu realtime không online. | P2 | Planned |

## 14. MOBILE - Mobile App Module

### Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-MOBILE-01 | Mobile app có màn đăng ký, OTP, login và profile. | P2 | Planned |
| FR-MOBILE-02 | Mobile app có màn tạo bài, danh sách bài và chi tiết bài. | P2 | Planned |
| FR-MOBILE-03 | Mobile app có form gửi claim và upload evidence. | P2 | Planned |
| FR-MOBILE-04 | Mobile app có danh sách điểm bàn giao và appointment flow. | P2 | Planned |
| FR-MOBILE-05 | Mobile app có chat realtime và notification. | P2 | Planned |

### Non-Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-MOBILE-01 | Mobile app phải tối ưu thao tác chạm, camera/gallery và điều hướng tab. | P2 | Planned |
| NFR-MOBILE-02 | Mobile app nên xử lý mất mạng và retry request phù hợp. | P2 | Planned |
| NFR-MOBILE-03 | Mobile token phải lưu trong secure storage, không lưu plain trong AsyncStorage nếu có lựa chọn tốt hơn. | P2 | Planned |
