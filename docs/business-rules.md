# Business Rules

BR-01 - Yêu cầu OTP trước đăng ký: Người dùng phải yêu cầu và nhập đúng OTP email trước khi hệ thống tạo tài khoản.

BR-02 - Không tạo tài khoản chưa xác thực: User chỉ được lưu vào bảng `users` sau khi OTP đăng ký hợp lệ.

BR-03 - Email active không được đăng ký lại: Email đã thuộc tài khoản `ACTIVE` không thể dùng để đăng ký tài khoản mới.

BR-04 - Gán role khi đăng ký: Tài khoản đăng ký thành công luôn có role `USER` và một role đối tượng là `STUDENT` hoặc `LECTURER`.

BR-05 - Password phải được hash: Mật khẩu không được lưu raw, phải hash bằng bcrypt.

BR-06 - OTP có giới hạn: OTP có thời hạn sử dụng và giới hạn số lần nhập sai.

BR-07 - Chỉ tài khoản active được đăng nhập: User chỉ login được khi trạng thái tài khoản là `ACTIVE`.

BR-08 - Refresh token phải được rotate: Khi refresh token, token cũ bị revoke và token mới được phát hành.

BR-09 - Logout revoke refresh token: Khi logout, refresh token hiện tại phải bị revoke.

BR-10 - Reset password revoke session: Khi reset password thành công, toàn bộ refresh token còn active của user phải bị revoke.

BR-11 - Phân quyền theo role: Hệ thống phân quyền theo các role `USER`, `STUDENT`, `LECTURER`, `STAFF`, `ADMIN`.

BR-12 - Staff không được quản trị nhạy cảm: `STAFF` không được đổi role, khóa user, quản lý danh mục, khu vực, điểm bàn giao hoặc xử lý report trên Node Admin API.

BR-13 - Admin quản lý hệ thống: Chỉ `ADMIN` được quản lý user, role, category, location, handover point và report.

BR-14 - User phải đăng nhập để đăng bài: Người dùng phải có access token hợp lệ mới được tạo bài Lost/Found.

BR-15 - Bài đăng có hai loại: Bài đăng chỉ thuộc một trong hai loại `LOST` hoặc `FOUND`.

BR-16 - Bài đăng cần thông tin bắt buộc: Tiêu đề, mô tả và danh mục là bắt buộc khi tạo bài.

BR-17 - Thời gian mất/nhặt không ở tương lai: `lostFoundAt` không được lớn hơn thời điểm hiện tại.

BR-18 - Location phải hợp lệ: Địa điểm cụ thể phải thuộc khu vực lớn đã chọn; phòng/lầu/góc chi tiết trong bài đăng được nhập dạng text tự do, không dùng bảng `campus_rooms`.

BR-19 - FOUND post cần nơi đang giữ đồ: Bài `FOUND` phải có thông tin nơi đang giữ đồ; người nhặt có thể chọn handover point active hoặc nhập khu vực lớn, địa điểm cụ thể và vị trí text đang tạm giữ.

BR-20 - LOST post cần thông tin xác minh: Bài `LOST` phải có secret verification và giá trị này phải được hash.

BR-21 - Handover point phải tồn tại: `posts.handover_point_id` phải trỏ tới handover point tồn tại trong database.

BR-22 - Owner hoặc admin mới được sửa bài: Chỉ chủ bài viết hoặc `ADMIN` được update, close hoặc soft-delete bài.

BR-23 - Bài xóa mềm không hiển thị công khai: Bài có `deleted_at` không được xuất hiện trong public board.

BR-24 - Upload ảnh phải đúng định dạng: Ảnh upload phải thuộc định dạng được cấu hình như JPG, PNG hoặc WEBP.

BR-25 - Upload ảnh phải đúng dung lượng: Mỗi ảnh không được vượt quá giới hạn dung lượng trong public/admin config.

BR-26 - Số ảnh bài đăng bị giới hạn: Số ảnh của một bài không được vượt quá giới hạn cấu hình.

BR-27 - Claim chỉ áp dụng cho FOUND post: User chỉ được gửi claim cho bài đăng loại `FOUND`.

BR-28 - Owner không được claim bài của mình: Chủ bài `FOUND` không được gửi claim cho chính bài đó.

BR-29 - Claim chỉ tạo khi post còn mở: Chỉ được claim bài có trạng thái `OPEN` hoặc `MATCHED`.

BR-30 - Mỗi user chỉ claim một lần cho một post: Một user không được tạo nhiều claim cho cùng một bài đăng.

BR-31 - Chống claim trùng ở DB: Database phải có unique constraint cho `(post_id, claimant_id)`.

BR-32 - Claim cần thông tin sở hữu: Claim phải có mô tả bí mật, thời gian mất gần đúng hoặc vị trí mất gần đúng theo form hiện tại.

BR-33 - Quyền xem claim bị giới hạn: Claimant, chủ bài, `STAFF` hoặc `ADMIN` mới được xem claim nếu thỏa điều kiện endpoint.

BR-34 - Bằng chứng claim là private: Claim evidence không được hiển thị cho người không liên quan.

BR-35 - Claim có trạng thái rõ ràng: Claim chỉ thuộc một trong các trạng thái `PENDING`, `NEED_MORE_INFO`, `ACCEPTED`, `REJECTED`, `CANCELLED`.

BR-36 - Chỉ PENDING được yêu cầu bổ sung: Chỉ claim `PENDING` mới được chuyển sang `NEED_MORE_INFO`.

BR-37 - Accept/reject cần trạng thái hợp lệ: Chỉ claim `PENDING` hoặc `NEED_MORE_INFO` mới được accept/reject.

BR-38 - NEED_MORE_INFO cần evidence mới: Claim ở trạng thái `NEED_MORE_INFO` chỉ được accept nếu claimant đã upload evidence mới sau thời điểm yêu cầu bổ sung.

BR-39 - Claim transition phải có khóa ghi: Khi Java Admin Service đổi trạng thái claim, claim row phải được lock trong transaction để tránh race condition.

BR-40 - Claimant chỉ hủy claim đang pending: Claimant chỉ được cancel claim khi trạng thái còn `PENDING`.

BR-41 - Matching chạy bất đồng bộ: Matching không được block request tạo/cập nhật bài.

BR-42 - Matching dùng trọng số cấu hình: Text, category, location và time score phải dùng weight/threshold từ config.

BR-43 - Matching result phải được lưu: Kết quả matching đủ ngưỡng phải được lưu vào `match_results`.

BR-44 - Admin dashboard tách khỏi user UI: Giao diện admin phải dùng sidebar/dashboard, không dùng layout community feed.

BR-45 - User UI theo kiểu cộng đồng: Giao diện sinh viên/giảng viên ưu tiên feed, card bài viết, search/filter và tương tác thân thiện.

BR-46 - Admin được quản lý danh mục: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt item category.

BR-47 - Admin được quản lý location: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt khu vực lớn và địa điểm cụ thể; phòng học không quản lý bằng CRUD riêng.

BR-48 - Admin được quản lý điểm bàn giao: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt handover point.

BR-49 - Admin được quản lý user: `ADMIN` có thể tạo user, đổi role và đổi trạng thái tài khoản.

BR-50 - Admin được xử lý report: `ADMIN` có thể review report và thực hiện action như warn, hide post, delete post, ban user hoặc unban user.

BR-51 - Xử lý report phải ghi moderation action: Khi admin xử lý report kèm action, hệ thống phải lưu moderation log.

BR-52 - Admin kiểm duyệt bài đăng trực tiếp: `ADMIN` có thể lọc bài đăng và chuyển trạng thái sang `OPEN`, `CLOSED`, `RESOLVED`, `HIDDEN` hoặc xóa mềm bài từ tab Kiểm duyệt.

BR-53 - Public config phục vụ validate: Web/mobile phải đọc public config để validate upload và form trước khi gửi request.

BR-54 - Config thay đổi cần lịch sử: Thay đổi cấu hình hệ thống phải có log lịch sử.

BR-55 - Appointment chỉ sau accepted claim: Return appointment chỉ được tạo sau khi claim đã `ACCEPTED` (planned).

BR-56 - Google OAuth chưa hoàn tất: Google OAuth được xem là planned, chưa tính là business rule đã implement.

BR-57 - Realtime chat chưa hoàn tất: Socket.IO chat và notification realtime là planned, chưa tính là hoàn tất.

BR-58 - Export báo cáo chưa hoàn tất: Export PDF/CSV là planned, chưa tính là hoàn tất.
