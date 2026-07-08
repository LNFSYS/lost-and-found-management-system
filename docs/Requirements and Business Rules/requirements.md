# Functional and Non-Functional Requirements

Last audit: 2026-07-08

This document uses the canonical 100-UC set from `docs/Checklist/master-dev-checklist.md`. Each UC has exactly one primary owner and the set is grouped by current team member assignment: TL, VQ, QD, and AK.

## Legend

| Field | Meaning |
| --- | --- |
| Priority `P0` | Required for MVP/demo core flow |
| Priority `P1` | Important for the nearest complete release |
| Priority `P2` | Extension or future scope |
| Status `Implemented` | Already present in the repo |
| Status `Partial` | Partially implemented; missing flow/UI/hardening |
| Status `Planned` | Not yet fully implemented |

## Functional Requirements

| ID | Requirement | UC coverage | Priority | Status |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | The system must support OTP registration with any valid user email, account creation, audience role selection, blocking re-registration of active emails, and user activation. FPT/edu email is not mandatory because students may not receive a campus email account. | UC-031, UC-032 | P0 | Implemented |
| FR-AUTH-02 | The system must support login, token refresh, logout, forgot/reset password, profile, avatar, activity, and reputation APIs. | UC-033, UC-034, UC-035, UC-036, UC-037, UC-038, UC-039 | P0 | Implemented |
| FR-ROLE-01 | APIs must enforce role-based access for USER/STUDENT/LECTURER/STAFF/ADMIN; STAFF has lower privileges than ADMIN. | UC-001, UC-002, UC-062 | P0 | Implemented |
| FR-BOARD-01 | The public board must support listing, search, filter, sort, pagination, detail view, share link, and Vietnamese text search. | UC-044, UC-046, UC-047, UC-069 | P0 | Implemented |
| FR-POST-01 | Logged-in users must be able to create/update/close/soft-delete LOST/FOUND posts with valid required data. | UC-040, UC-041, UC-042, UC-043 | P0 | Implemented |
| FR-MEDIA-01 | The system must upload, validate, store, display, and delete item images, evidence images, and avatars. | UC-038, UC-048, UC-049, UC-050, UC-087 | P0 | Implemented for MVP |
| FR-AI-01 | The system must call Vision/OCR, store AI tags, suggest categories, and provide AI metadata for matching. | UC-086, UC-087, UC-088, UC-091 | P1 | Partial |
| FR-AI-02 | Future custom AI work should prepare a training pipeline with collection, labeling, anonymization, training, evaluation, and versioning before any custom model is claimed. Current repo has a data/export and lightweight local reranker foundation, not production custom AI. | UC-026, UC-027, UC-028, UC-029, UC-030 | P2 | Partial foundation |
| FR-MATCH-01 | The system must run matching after create/update/upload, compute tiered scores, include image/OCR signals, save results, return suggestions, explain match reasons, and allow manual re-run. Background queue processing remains a hardening backlog item. | UC-068, UC-069, UC-070, UC-071, UC-072, UC-074, UC-075, UC-076 | P0 | Implemented |
| FR-NOTI-01 | The system must send matching notifications and support realtime notifications for chat, claims, and appointments; polling is only a fallback. | UC-073, UC-074, UC-083, UC-020 | P1 | Partial |
| FR-CLAIM-01 | Claimants must be able to submit claims for FOUND posts with ownership descriptions/evidence, and the system must prevent duplicate claims. | UC-049, UC-052, UC-053 | P0 | Implemented |
| FR-CLAIM-02 | The system must guard claim/evidence view permissions and handle request-info/accept/reject/cancel transitions based on valid states. | UC-003, UC-004, UC-005, UC-006, UC-007, UC-054 | P0 | Implemented |
| FR-CLAIM-03 | The system must analyze uploaded claim evidence, calculate an advisory review confidence percentage, and show that percentage to the finder/staff reviewer without automatically approving ownership. | UC-089, UC-090, UC-092 | P1 | Implemented |
| FR-HANDOVER-01 | Users must be able to view/select handover points; admins must manage handover points, campus map images, marker coordinates, and stored-item counts. | UC-008, UC-009, UC-010, UC-055, UC-056, UC-057, UC-058 | P0 | Implemented |
| FR-WAREHOUSE-01 | Staff/Admin must manage warehouse items, status changes, receive/store/return operations, storage logs, and policy-based retention deadlines. | UC-011, UC-012, UC-013, UC-014, UC-015, UC-059, UC-060, UC-061 | P0 | Implemented |
| FR-WAREHOUSE-02 | The system must handle overdue warehouse items, create disposal orders, create donation batches, transfer eligible items, block processing while claims/appointments are active, and alert staff/admin. Proof documents/forms remain a hardening task. | UC-016, UC-017, UC-018, UC-019, UC-020 | P1 | Partial |
| FR-APPT-01 | The system must support creating, accepting, rejecting, rescheduling/canceling, completing return appointments after valid claim decisions, and attaching a handover/return proof image to accepted or completed appointments. | UC-021, UC-022, UC-023, UC-024 | P1 | Implemented |
| FR-RT-01 | The system must have a Socket.IO server with JWT auth, claim rooms, realtime messaging, chat images, seen/unread status, and realtime notifications. | UC-077, UC-078, UC-079, UC-080, UC-081, UC-082, UC-083 | P1 | Partial |
| FR-ADMIN-01 | Admin/Staff APIs and web UI must support users, categories, locations, moderation, reports, dashboard overview/charts, CSV statistics export, system configuration, and config history. Config rollback and deeper analytics remain backlog. | UC-063, UC-064, UC-065, UC-066, UC-067, UC-084, UC-085 | P1 | Partial |
| FR-REP-01 | The system must compute reputation scores after valid business events, expose reputation score/history data to users, collect feedback after completed return appointments, and let Admin/Staff review negative return feedback. | UC-025, UC-039 | P2 | Implemented |
| FR-DEMO-01 | The system must have seed/demo data and demo accounts sufficient for presenting the core flow, plus migration smoke verification for a fresh database. | UC-031, UC-032, UC-040, UC-041, UC-059 | P1 | Implemented |
| FR-MOBILE-01 | Expo mobile MVP should cover auth/profile, board/post/upload/search, claim/handover/appointment/chat/notification, while native push/offline/device hardening remains backlog. | UC-093, UC-094, UC-095, UC-096, UC-097, UC-098, UC-099, UC-100 | P2 | Partial |

## Non-Functional Requirements

| ID | Requirement | UC coverage | Priority | Status |
| --- | --- | --- | --- | --- |
| NFR-SEC-01 | Passwords, refresh tokens, OTPs, and secret verification values must be hashed or protected; raw sensitive data must not be stored unnecessarily. | UC-031, UC-032, UC-033, UC-034, UC-035, UC-040, UC-049 | P0 | Implemented |
| NFR-SEC-02 | APIs requiring auth must validate JWT; missing permissions must return clear 401/403 responses; sensitive auth/post/claim/upload APIs must have basic rate limits. | UC-001, UC-002, UC-054, UC-062, UC-078 | P0 | Implemented |
| NFR-PRIV-01 | Claim evidence, contact info, private media, chat rooms, and notifications must only be returned to authorized users; public post contact info must be masked by default. | UC-049, UC-054, UC-079, UC-083, UC-089 | P0 | Implemented for MVP; production privacy policy remains future hardening |
| NFR-DATA-01 | Foreign keys and critical state fields for posts, claims, handover, warehouse, appointments, and chat must maintain data integrity. | UC-007, UC-015, UC-052, UC-059, UC-071, UC-079 | P0 | Implemented |
| NFR-PERF-01 | Board/search/matching/warehouse/notification queries must have indexes, pagination, and query plans suitable for real campus usage. | UC-046, UC-047, UC-068, UC-072, UC-084 | P0 | Partial |
| NFR-RT-01 | Socket realtime must have auth, reconnect, room isolation, unread state, and must not leak events between claim rooms. | UC-077, UC-078, UC-079, UC-080, UC-082, UC-083 | P1 | Partial |
| NFR-AI-01 | AI/matching/evidence scoring serves only as decision support; it must not automatically approve claims, verify ownership, or return items. | UC-070, UC-076, UC-089, UC-090, UC-092 | P0 | Implemented |
| NFR-AUDIT-01 | Sensitive operations such as claim transitions, role/status changes, warehouse processing, configuration, and evidence review must have log/audit trails. Moderation/export depth remains hardening. | UC-003, UC-004, UC-005, UC-006, UC-015, UC-066, UC-085 | P1 | Partial |

## Notes

- The canonical UC set currently has exactly 100 UCs: `UC-001` through `UC-100`.
- Do not create UCs above `UC-100` unless the master checklist is intentionally re-baselined.
- Do not assign UCs to Tran Nguyen Phong as he has left the team.
- Current MVP wording should use "Google Vision assisted OCR/tags" and "rule-based/hybrid matching", not "custom trained AI model".
