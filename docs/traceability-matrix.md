# Traceability Matrix

Tài liệu này nối Business Rules (BR), Functional/Non-Functional Requirements (FR/NFR) và Use Cases (UC). Dùng file này để kiểm tra một rule nghiệp vụ đã được phản ánh trong yêu cầu và checklist triển khai hay chưa.

## Legend

| Field | Meaning |
| --- | --- |
| BR | Business rule trong [business-rules.md](business-rules.md). |
| Requirement | FR/NFR trong [requirements.md](requirements.md). |
| UC | Use case trong [dev-owned-usecase-checklist.md](dev-owned-usecase-checklist.md) hoặc overview. |
| Status | Trạng thái tổng hợp theo requirement liên quan. |

## BR ↔ FR/NFR ↔ UC

| BR | Requirement | UC | Status |
| --- | --- | --- | --- |
| BR-01 | FR-AUTH-01, FR-AUTH-02, NFR-AUTH-04 | UC-003, UC-004, UC-173 | Implemented |
| BR-02 | FR-AUTH-02 | UC-001, UC-004, UC-173 | Implemented |
| BR-03 | FR-AUTH-01, FR-AUTH-02 | UC-001, UC-173 | Implemented |
| BR-04 | FR-AUTH-03, FR-ROLE-01 | UC-175 | Implemented |
| BR-05 | NFR-AUTH-01 | UC-009 | Implemented |
| BR-06 | NFR-AUTH-04 | UC-003, UC-004, UC-174 | Implemented |
| BR-07 | FR-AUTH-04 | UC-005 | Implemented |
| BR-08 | FR-AUTH-05, NFR-AUTH-02 | UC-008 | Implemented |
| BR-09 | FR-AUTH-06 | UC-007 | Implemented |
| BR-10 | FR-AUTH-08, NFR-AUTH-03 | UC-174 | Implemented |
| BR-11 | FR-ROLE-01, FR-ROLE-02, FR-ROLE-03 | UC-010, UC-177 | Implemented |
| BR-12 | FR-ROLE-04, FR-ROLE-05, NFR-ROLE-01 | UC-177 | Implemented |
| BR-13 | FR-ROLE-04, FR-ADMIN-03..10 | UC-144, UC-145, UC-149, UC-150, UC-164, UC-165, UC-166, UC-177 | Implemented |
| BR-14 | FR-POST-01, FR-POST-02 | UC-016, UC-017 | Implemented |
| BR-15 | FR-POST-01, FR-POST-02 | UC-016, UC-017 | Implemented |
| BR-16 | FR-POST-03 | UC-018 | Implemented |
| BR-17 | FR-POST-04 | UC-020 | Implemented |
| BR-18 | FR-POST-05 | UC-019 | Implemented |
| BR-19 | FR-POST-06, FR-HANDOVER-01 | UC-017, UC-031 | Implemented |
| BR-20 | FR-POST-07, NFR-POST-01 | UC-021 | Implemented |
| BR-21 | NFR-POST-02, NFR-HANDOVER-01 | UC-031, UC-166 | Implemented |
| BR-22 | FR-POST-08, FR-POST-09, FR-POST-10, NFR-POST-03 | UC-022, UC-023, UC-024, UC-029 | Implemented |
| BR-23 | FR-POST-10, FR-BOARD-01 | UC-024, UC-027, UC-028 | Implemented |
| BR-24 | NFR-MEDIA-01 | UC-035 | Implemented |
| BR-25 | NFR-MEDIA-02, FR-CONFIG-02 | UC-036, UC-162 | Implemented |
| BR-26 | NFR-MEDIA-02, FR-CONFIG-02 | UC-036, UC-161 | Implemented |
| BR-27 | FR-CLAIM-01, FR-CLAIM-03 | UC-083 | Implemented |
| BR-28 | FR-CLAIM-02 | UC-083 | Implemented |
| BR-29 | FR-CLAIM-03 | UC-083 | Implemented |
| BR-30 | FR-CLAIM-04, NFR-CLAIM-01 | UC-176 | Implemented |
| BR-31 | NFR-CLAIM-01 | UC-176 | Implemented |
| BR-32 | FR-CLAIM-01, FR-CLAIM-06 | UC-084, UC-085, UC-086, UC-087, UC-088 | Implemented |
| BR-33 | FR-CLAIM-05, NFR-CLAIM-05 | UC-090, UC-091 | Implemented |
| BR-34 | FR-MEDIA-02, NFR-MEDIA-04, NFR-CLAIM-05 | UC-038, UC-046, UC-090, UC-091 | Implemented |
| BR-35 | NFR-CLAIM-02 | UC-096 | Implemented |
| BR-36 | FR-CLAIM-07 | UC-092 | Implemented |
| BR-37 | FR-CLAIM-08, FR-CLAIM-09, NFR-CLAIM-02 | UC-093, UC-094 | Implemented |
| BR-38 | NFR-CLAIM-04 | UC-093 | Implemented |
| BR-39 | NFR-CLAIM-03 | UC-093, UC-096 | Implemented |
| BR-40 | FR-CLAIM-10 | UC-095 | Implemented |
| BR-41 | NFR-MATCH-01 | UC-068, UC-069 | Implemented |
| BR-42 | NFR-MATCH-02, FR-CONFIG-03, FR-CONFIG-04 | UC-077, UC-167, UC-168 | Implemented |
| BR-43 | FR-MATCH-04 | UC-078 | Implemented |
| BR-44 | FR-ADMIN-01, NFR-ADMIN-01 | UC-151 | Implemented |
| BR-45 | FR-BOARD-02, NFR-BOARD-02 | UC-057 | Implemented |
| BR-46 | FR-ADMIN-03 | UC-164 | Implemented |
| BR-47 | FR-ADMIN-04, FR-ADMIN-05, FR-ADMIN-06 | UC-165 | Implemented |
| BR-48 | FR-ADMIN-07, FR-HANDOVER-02, FR-HANDOVER-03, FR-HANDOVER-04 | UC-098, UC-099, UC-100, UC-166 | Implemented |
| BR-49 | FR-ADMIN-08 | UC-144, UC-145 | Implemented |
| BR-50 | FR-REPORT-01..08, FR-ADMIN-09, FR-ADMIN-10 | UC-149, UC-150 | Implemented |
| BR-51 | NFR-REPORT-01, NFR-REPORT-03 | UC-150 | Implemented |
| BR-52 | FR-ADMIN-11, FR-POST-09, FR-POST-10 | UC-151 | Implemented |
| BR-53 | FR-CONFIG-01, NFR-CONFIG-01 | UC-172 | Implemented |
| BR-54 | FR-CONFIG-05, NFR-CONFIG-02 | UC-170 | Implemented |
| BR-55 | FR-APPT-01, FR-APPT-02, NFR-APPT-01 | UC-112 | Planned |
| BR-56 | FR-AUTH-12 | UC-006 | Planned |
| BR-57 | FR-CHAT-01..05, FR-NOTI-01..03 | UC-080, UC-097, UC-121, UC-128, UC-129 | Planned |
| BR-58 | FR-ADMIN-12 | UC-157 | Planned |

## Notes

- Các requirement có Status `Partial` hoặc `Planned` vẫn được trace để thể hiện phạm vi nhưng chưa được tính là hoàn thành.
- Appointment enum đã thống nhất dùng `ACCEPTED`.
- Với các dòng dạng `FR-ADMIN-03..10`, phạm vi bao gồm toàn bộ FR liên tiếp trong module tương ứng.
