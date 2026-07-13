# ADR-001: Quyền Ghi Dữ Liệu Giữa Node.js Và Java

- Trạng thái: Accepted
- Ngày quyết định: 2026-07-10
- Phạm vi: MVP web/backend và Java business extension

## Bối Cảnh

Node.js và Java/Spring Boot cùng đọc schema MySQL. Một số nghiệp vụ như duyệt claim, điểm bàn giao và cấu hình đã có implementation ở cả hai service. Nếu hai service cùng ghi một trạng thái trong một deployment, hệ thống có thể áp dụng hai bộ validation khác nhau, ghi log trùng hoặc gây race condition.

## Quyết Định

1. Node.js là runtime owner mặc định của toàn bộ core demo flow: auth, post, media/OCR, matching, claim/evidence, appointment, warehouse/handover, notification/realtime và dashboard.
2. Java là business extension. Các endpoint ghi của Java bị khóa mặc định bằng `JAVA_WRITES_ENABLED=false`; chỉ bật khi team chủ động chuyển quyền sở hữu một flow khỏi Node.
3. Mỗi flow chỉ có một writer trong một deployment. Không để web gọi xen kẽ Node và Java cho cùng một state machine.
4. Node migrations là schema source of truth. Hibernate giữ `ddl-auto=none`.
5. Khi chuyển một flow sang Java, team phải có contract test cho JWT, role, trạng thái hợp lệ, audit và rollback; đồng thời gateway/frontend phải ngừng gọi endpoint ghi tương ứng của Node.
6. Scheduled jobs của Node dùng MySQL named lock. Không bật job Java chạm cùng trạng thái nếu chưa chuyển ownership.

## Ownership Hiện Tại

| Flow | Writer hiện tại | Java hiện tại |
| --- | --- | --- |
| Auth, user, post, media, OCR, matching | Node.js | Chỉ đọc/JWT verification khi cần |
| Claim create/evidence/decision | Node.js | Extension minh họa transaction và pessimistic lock |
| Appointment | Node.js | Future extension |
| Handover/warehouse | Node.js | Extension cho rule-heavy operations |
| Config/history | Node.js | Extension có typed config/history |
| Realtime/notification/scheduled matching | Node.js | Không sở hữu |

## Hệ Quả

- Demo chính chạy ổn với một API owner.
- Java vẫn có đóng góp kỹ thuật rõ nhưng không bị mô tả quá thành production microservices.
- Việc chuyển owner trong tương lai cần adapter/gateway và integration test, không chỉ đổi URL trên frontend.

## Cách Trình Bày Khi Bảo Vệ

> Node.js là core API của MVP. Java/Spring Boot là business extension cho các nghiệp vụ cần transaction và locking. Nhóm áp dụng one-writer-per-flow; hiện web demo dùng Node làm writer, còn việc tách hẳn flow sang Java là bước tích hợp tiếp theo trước khi gọi là production microservices.
