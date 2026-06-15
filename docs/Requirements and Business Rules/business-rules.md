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

BR-18 - Location phải hợp lệ: Địa điểm cụ thể phải thuộc khu vực lớn đã chọn; vị trí chi tiết như phòng, lầu, góc hoặc mô tả thêm được nhập dạng text tự do trong bài đăng.

BR-19 - FOUND post cần nơi đang giữ đồ: Bài `FOUND` phải có thông tin nơi đang giữ đồ; người nhặt có thể chọn handover point active hoặc nhập khu vực lớn, địa điểm cụ thể và vị trí text đang tạm giữ.

BR-20 - LOST post cần thông tin xác minh: Bài `LOST` phải có mô tả xác minh quyền sở hữu như dấu hiệu riêng, serial, vết trầy, vật bên trong hoặc thông tin hóa đơn; giá trị này phải được hash.

BR-21 - Handover point phải tồn tại: `posts.handover_point_id` phải trỏ tới handover point tồn tại trong database.

BR-22 - Owner hoặc admin mới được sửa bài: Chỉ chủ bài viết hoặc `ADMIN` được update, close hoặc soft-delete bài.

BR-23 - Bài xóa mềm không hiển thị công khai: Bài có `deleted_at` không được xuất hiện trong public board.

BR-24 - Upload ảnh phải đúng định dạng: Ảnh upload phải thuộc định dạng được cấu hình như JPG, PNG hoặc WEBP.

BR-25 - Upload ảnh phải đúng dung lượng: Mỗi ảnh không được vượt quá giới hạn dung lượng trong public/admin config.

BR-26 - Số ảnh bài đăng bị giới hạn: Số ảnh của một bài không được vượt quá giới hạn cấu hình.

BR-26A - Ảnh đầu tiên là ảnh bìa: Ảnh đầu tiên trong `post_media` của bài đăng được dùng làm ảnh bìa trên community feed; các ảnh sau đóng vai trò bằng chứng bổ sung.

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

BR-41 - Lỗi matching không được phá luồng đăng bài: Nếu matching lỗi sau khi bài đã được lưu, request tạo/cập nhật bài không được fail toàn bộ; hệ thống phải log lỗi và trả response hợp lệ.

BR-42 - Matching dùng trọng số cấu hình: Text, category, location và time score phải dùng weight/threshold từ config.

BR-43 - Matching result phải được lưu: Kết quả matching đủ ngưỡng phải được lưu vào `match_results`.

BR-44 - Admin dashboard tách khỏi user UI: Giao diện admin phải dùng sidebar/dashboard, không dùng layout community feed.

BR-45 - User UI theo kiểu cộng đồng: Giao diện sinh viên/giảng viên ưu tiên feed, card bài viết, search/filter và tương tác thân thiện.

BR-46 - Admin được quản lý danh mục: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt item category. Danh mục chỉ có hai cấp là nhóm chính và danh mục cụ thể; không cho phép danh mục cụ thể chứa danh mục con khác.

BR-47 - Admin được quản lý location: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt khu vực lớn và địa điểm cụ thể; vị trí chi tiết do user nhập khi đăng tin. UI quản trị không yêu cầu admin nhập thứ tự hiển thị cho khu vực hoặc địa điểm cụ thể.

BR-48 - Admin được quản lý điểm bàn giao: `ADMIN` có thể tạo, sửa, ẩn hoặc kích hoạt handover point.

BR-49 - Admin được quản lý user: `ADMIN` có thể tạo user, đổi role và đổi trạng thái tài khoản.

BR-50 - Admin được xử lý report: `ADMIN` có thể review report và thực hiện action như warn, hide post, delete post, ban user hoặc unban user.

BR-51 - Xử lý report phải ghi moderation action: Khi admin xử lý report kèm action, hệ thống phải lưu moderation log.

BR-52 - Admin kiểm duyệt bài đăng trực tiếp: `ADMIN` có thể lọc bài đăng, xem chi tiết bài và chuyển trạng thái sang `OPEN`, `CLOSED`, `RESOLVED`, `HIDDEN` hoặc xóa mềm bài từ tab Kiểm duyệt.

BR-53 - Public config phục vụ validate: Web/mobile phải đọc public config để validate upload và form trước khi gửi request.

BR-54 - Config thay đổi cần lịch sử: Thay đổi cấu hình hệ thống phải có log lịch sử.

BR-55 - Appointment chỉ sau accepted claim: Return appointment chỉ được tạo sau khi claim đã `ACCEPTED` (planned).

BR-56 - Google OAuth chưa hoàn tất: Google OAuth được xem là planned, chưa tính là business rule đã implement.

BR-57 - Realtime chat chưa hoàn tất: Socket.IO chat và notification realtime là planned, chưa tính là hoàn tất.

BR-58 - Export báo cáo chưa hoàn tất: Export PDF/CSV là planned, chưa tính là hoàn tất.

BR-59 - Match điểm cao phải tạo thông báo: Khi `total_score` của cặp LOST/FOUND lớn hơn hoặc bằng `matching.notification_threshold`, hệ thống phải tạo notification `MATCH_FOUND` cho cả hai chủ bài, đánh dấu match đã thông báo và chuyển hai bài còn `OPEN` sang `MATCHED`.

BR-60 - Notification thuộc về từng user: Mỗi notification phải gắn với một `user_id`; user chỉ được xem, đánh dấu đã đọc hoặc đánh dấu tất cả đã đọc với notification của chính mình.

BR-61 - Media bài đăng phải phân loại rõ: Ảnh trong field `images` được lưu là `ITEM`, ảnh trong field `evidenceImages` được lưu là `EVIDENCE`; AI/Vision chỉ phân tích ảnh `ITEM`.

BR-62 - Kho đồ dùng trạng thái chuẩn: Item trong `warehouse_items` chỉ được dùng một trong các trạng thái `PENDING_APPROVAL`, `RECEIVED`, `STORED`, `CLAIMED`, `RETURNED`, `EXPIRED`, `DISPOSED`, `DONATED`, `TRANSFERRED` và khi xóa phải dùng soft delete.

BR-63 - Item trong kho chỉ liên kết bài FOUND: Nếu `warehouse_items.post_id` được cung cấp, bài liên kết phải là bài `FOUND`; không được tạo item kho từ bài `LOST`.

BR-64 - Gợi ý match phải trả về sau thao tác tạo nội dung: Sau khi tạo bài `LOST` hoặc upload ảnh vật phẩm cho bài `LOST`, nếu matching tìm được kết quả phù hợp thì API phải trả `matchSuggestions` để UI hiển thị ngay cho user.

BR-65 - Đồ lưu kho phải có thời hạn lưu giữ: Mỗi item trong kho phải có hạn lưu giữ theo loại đồ và mức độ giá trị; đồ thường mặc định 30-60 ngày, đồ giá trị cao tối thiểu 90 ngày, giấy tờ cá nhân/thẻ sinh viên phải được ưu tiên liên hệ hoặc chuyển bộ phận CTSV/bảo vệ theo quy định.

BR-66 - Đồ sắp quá hạn phải được cảnh báo: Hệ thống phải cảnh báo admin trước khi item quá hạn, mặc định 7 ngày trước hạn, và đánh dấu item quá hạn nếu hết thời gian lưu giữ mà chưa có người nhận.

BR-67 - Vòng đời item lưu kho phải có trạng thái rõ ràng: Item lưu kho trong phiên bản quản lý vòng đời đầy đủ phải dùng các trạng thái `PENDING_APPROVAL`, `STORED`, `CLAIMED`, `RETURNED`, `EXPIRED`, `DISPOSED`, `DONATED`, `TRANSFERRED`.

BR-68 - Item quá hạn phải xử lý theo loại đồ: Đồ giá trị thấp có thể thanh lý/hủy theo quy định; đồ còn dùng được có thể quyên góp; giấy tờ cá nhân phải chuyển bộ phận trường; đồ giá trị cao phải lập biên bản và có thể lưu thêm hoặc bàn giao bảo vệ/CTSV.

BR-69 - Xử lý item quá hạn phải có biên bản: Mỗi lần xử lý item quá hạn phải lưu lý do xử lý, người xử lý, ngày xử lý, trạng thái sau xử lý, ghi chú và ảnh minh chứng nếu cần.

BR-70 - Kho phải có quản lý sức chứa: Mỗi kho/điểm lưu giữ phải có sức chứa tối đa; khi đạt 80% hệ thống cảnh báo admin, khi đạt 100% hệ thống không cho chọn kho đó để nhận thêm item hoặc phải đề xuất kho khác.

BR-71 - Item đã xử lý cuối vòng đời không được claim/trả như item đang lưu: Item ở trạng thái `DISPOSED`, `DONATED` hoặc `TRANSFERRED` không được tạo claim/appointment/trả đồ như item `STORED`; mọi thao tác sau đó phải đi qua biên bản hoặc liên hệ bộ phận đã nhận chuyển giao.

BR-72 - Claim status transition chỉ có một owner: Sau khi Node API tạo claim ban đầu ở trạng thái `PENDING`, mọi transition trạng thái claim như `NEED_MORE_INFO`, `ACCEPTED`, `REJECTED`, `CANCELLED` phải đi qua Java Admin Service với row lock và kiểm tra trạng thái; Node API không được tự cập nhật `claims.status`.

BR-73 - Dữ liệu train AI phải có nhãn rõ ràng: Ảnh, tag, category và cặp LOST/FOUND chỉ được đưa vào dataset training khi có nhãn nguồn rõ ràng như AI suggestion đã được xác nhận, admin/staff label hoặc feedback user đã qua kiểm tra.

BR-74 - Dataset training phải ẩn danh: Trước khi export dataset, hệ thống phải loại bỏ hoặc ẩn danh email, số điện thoại, thông tin liên hệ, metadata nhạy cảm và nội dung không cần cho training.

BR-75 - Nhãn AI cần có kiểm duyệt con người: Nhãn category, object tag và match đúng/sai dùng cho training phải cho phép admin/staff review hoặc sửa trước khi được tính là dữ liệu chất lượng cao.

BR-76 - Model AI phải có version và metrics: Mỗi model được train phải lưu version, dataset snapshot, tham số training, metrics đánh giá và trạng thái triển khai.

BR-77 - Model AI mới cần đạt ngưỡng trước khi bật: Model mới chỉ được deploy khi đạt ngưỡng metrics tối thiểu và được admin approve; model chưa đạt chỉ được giữ ở trạng thái draft/archived.

BR-78 - AI inference phải có fallback: Nếu model riêng lỗi, timeout hoặc chưa bật, hệ thống phải fallback về Google Vision/rule matching hiện tại để không làm hỏng luồng đăng bài hoặc upload ảnh.

BR-79 - Feedback không được tự động quyết định trả đồ: Feedback match đúng/sai của user chỉ là tín hiệu cải thiện model, không được tự động accept claim, trả đồ hoặc thay đổi quyết định nghiệp vụ nhạy cảm.

BR-80 - AI chỉ hỗ trợ, không thay admin/user trong quyết định sở hữu: AI tags, category suggestion và matching score chỉ là gợi ý; claim và bàn giao vẫn phải theo bằng chứng, rule nghiệp vụ và thao tác xác nhận của người có quyền.

BR-81 - Xác minh claim theo 3 tầng: Hệ thống dùng tầng 1 rule-based matching để tính phần trăm giống nhau, tầng 2 trained AI model để cải thiện gợi ý khi có model được approve, và tầng 3 human verification để quyết định accept/reject claim; tầng 3 luôn là bước quyết định cuối cùng trước khi trả đồ.

BR-82 - Tầng 2 phải enrich và double-check tầng 1: Khi AI tầng 2 nhận diện ảnh hoặc so sánh ảnh `LOST`/`FOUND`, hệ thống phải lưu metadata như item name, mô tả, OCR/text, brand/logo, image similarity và model version; sau đó chạy lại tầng 1 với metadata đã enrich để double-check trước khi hiển thị hoặc thông báo match mạnh.
