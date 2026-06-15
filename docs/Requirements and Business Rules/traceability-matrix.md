# Traceability Matrix

Tài liệu này nối Business Rules (BR), Functional/Non-Functional Requirements (FR/NFR) và Use Cases (UC). Dùng file này để kiểm tra một rule nghiệp vụ đã được phản ánh trong yêu cầu và checklist triển khai hay chưa.

## Legend

| Field | Meaning |
| --- | --- |
| BR | Business rule trong [business-rules.md](business-rules.md). |
| Requirement | FR/NFR trong [requirements.md](requirements.md). |
| UC | Use case trong [master-dev-checklist.md](../master-dev-checklist.md) hoặc overview. |
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
| BR-26A | FR-MEDIA-07, FR-BOARD-08 | UC-027, UC-035 | Implemented |
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
| BR-57 | FR-CHAT-01..05, FR-NOTI-01, FR-NOTI-02, NFR-NOTI-01 | UC-097, UC-121, UC-128, UC-129, UC-131, UC-132, UC-133 | Planned |
| BR-58 | FR-ADMIN-12 | UC-157 | Planned |
| BR-59 | FR-MATCH-05, FR-NOTI-03, NFR-MATCH-02 | UC-080, UC-134 | Implemented |
| BR-60 | FR-NOTI-04, NFR-NOTI-02 | UC-134 | Implemented |
| BR-61 | FR-MEDIA-08, NFR-MEDIA-05 | UC-035, UC-036 | Implemented |
| BR-62 | FR-HANDOVER-08, FR-HANDOVER-09, FR-ADMIN-13 | UC-110 | Implemented |
| BR-63 | FR-HANDOVER-09, NFR-HANDOVER-04 | UC-110 | Implemented |
| BR-64 | FR-MATCH-06 | UC-078, UC-079 | Implemented |
| BR-65 | FR-HANDOVER-10 | UC-178, UC-179 | Planned |
| BR-66 | FR-HANDOVER-11 | UC-111, UC-180 | Planned |
| BR-67 | FR-HANDOVER-12 | UC-178 | Partial |
| BR-68 | FR-HANDOVER-13 | UC-178 | Planned |
| BR-69 | FR-HANDOVER-14, NFR-HANDOVER-05 | UC-181 | Planned |
| BR-70 | FR-HANDOVER-15, FR-HANDOVER-16, NFR-HANDOVER-06 | UC-182, UC-183 | Planned |
| BR-71 | FR-HANDOVER-12, FR-HANDOVER-13 | UC-178, UC-181 | Planned |
| BR-72 | NFR-CLAIM-02, NFR-CLAIM-03, NFR-CLAIM-06 | UC-096 | Implemented |
| BR-73 | FR-AITRAIN-01, FR-AITRAIN-02, NFR-AITRAIN-05 | UC-186, UC-187, UC-195 | Planned |
| BR-74 | FR-AITRAIN-03, NFR-AITRAIN-01 | UC-188 | Planned |
| BR-75 | FR-AITRAIN-02, FR-AITRAIN-09 | UC-187, UC-194 | Planned |
| BR-76 | FR-AITRAIN-06, FR-AITRAIN-07, NFR-AITRAIN-02 | UC-191, UC-192 | Planned |
| BR-77 | FR-AITRAIN-06, FR-AITRAIN-07, NFR-AITRAIN-03 | UC-191, UC-192 | Planned |
| BR-78 | FR-AITRAIN-08, NFR-AITRAIN-04 | UC-193 | Planned |
| BR-79 | FR-AITRAIN-10, NFR-AITRAIN-05 | UC-195 | Planned |
| BR-80 | FR-AI-01, FR-AI-02, FR-MATCH-03, FR-AITRAIN-08 | UC-064, UC-078, UC-193 | Partial |
| BR-81 | FR-AITRAIN-11, NFR-AITRAIN-06, FR-CLAIM-08, FR-CLAIM-09 | UC-093, UC-094, UC-186..193 | Partial |
| BR-82 | FR-AITRAIN-12, FR-AITRAIN-13, NFR-AITRAIN-07, FR-MATCH-01, FR-MATCH-02 | UC-069, UC-189, UC-190, UC-193 | Planned |

## Notes

- Các requirement có Status `Partial` hoặc `Planned` vẫn được trace để thể hiện phạm vi nhưng chưa được tính là hoàn thành.
- Appointment enum đã thống nhất dùng `ACCEPTED`.
- Với các dòng dạng `FR-ADMIN-03..10`, phạm vi bao gồm toàn bộ FR liên tiếp trong module tương ứng.
