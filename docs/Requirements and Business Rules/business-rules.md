# Business Rules

Last audit: 2026-06-29

Business rules are grouped by major business area and trace back to the canonical 100-UC set in `docs/Checklist/master-dev-checklist.md`. Each UC has exactly one primary owner.

| BR | Business Rule | UC coverage | Status |
| --- | --- | --- | --- |
| BR-01 | Registration must go through a valid email OTP; active emails cannot re-register; new users receive the `USER` role plus an audience role of `STUDENT` or `LECTURER`. | UC-031, UC-032 | Implemented |
| BR-02 | Passwords, refresh tokens, OTPs, and password resets must be handled securely: hashed, rotated/revoked, time-limited, and sessions revoked when necessary. | UC-033, UC-034, UC-035, UC-036 | Implemented |
| BR-03 | Users may only log in when their account is `ACTIVE`; APIs requiring authentication must validate JWT and role permissions. | UC-001, UC-002, UC-033, UC-062 | Implemented |
| BR-04 | `STAFF` has lower privileges than `ADMIN`; staff focuses on warehouse/handover operations and must not access sensitive admin functions. | UC-002, UC-059, UC-060, UC-062, UC-063, UC-066 | Partial |
| BR-05 | The public board must display only valid public posts that are not soft-deleted or hidden, and must support search/filter/sort/pagination. | UC-044, UC-046, UC-047 | Implemented |
| BR-06 | Users must be logged in to create/edit/close/delete posts; each post belongs to exactly one type: `LOST` or `FOUND`. | UC-040, UC-041, UC-042, UC-043 | Implemented |
| BR-07 | Posts require title, description, category, contact info, a non-future incident time, and a valid location. | UC-040, UC-041 | Implemented |
| BR-08 | `LOST` posts should include ownership verification details; `FOUND` posts must specify where the item is currently held or an active handover point. | UC-040, UC-041, UC-055, UC-058 | Implemented |
| BR-09 | Media uploads must conform to format/size/count limits; item images and private evidence images must be clearly separated. | UC-048, UC-049, UC-050, UC-051, UC-087 | Partial |
| BR-10 | Claim evidence, private media, contact info, chat rooms, and notifications must only be visible to authorized users. | UC-049, UC-054, UC-078, UC-079, UC-083 | Partial |
| BR-11 | AI Vision/OCR/matching and evidence scoring serve only as suggestions; they must not automatically determine ownership or authorize item returns. | UC-070, UC-076, UC-089, UC-090, UC-092 | Partial |
| BR-12 | Matching must run after create/update/upload, use configurable weights/thresholds, save match results, explain match reasons, and must not fail the post creation flow if matching errors occur. Background queue processing is still a scalability backlog item. | UC-068, UC-069, UC-070, UC-071, UC-072, UC-073, UC-076 | Implemented |
| BR-13 | Matches should be checked on login/web open and at a reasonable interval such as 10 minutes; dismissed popups must not immediately reopen. | UC-073, UC-074, UC-083 | Implemented |
| BR-14 | Claims apply only to eligible `FOUND` posts; owners cannot claim their own posts; each user may claim a given post only once. | UC-052, UC-053 | Implemented |
| BR-15 | Claim transitions must follow valid state rules and use locks/audit to prevent race conditions. | UC-003, UC-004, UC-005, UC-006, UC-007 | Implemented |
| BR-16 | Evidence verification must compare claim evidence, descriptions, time, location, AI/OCR signals, and matching data before showing an ownership confidence percentage. | UC-089, UC-090, UC-092 | Implemented |
| BR-17 | Handover points must exist, have active status, map markers, and stored-item counts so users/admins can clearly locate them. | UC-008, UC-009, UC-010, UC-055, UC-056, UC-057, UC-058 | Implemented |
| BR-18 | Warehouse items may only be linked to valid found-item flows; all important status changes must use standard enums and write storage logs. | UC-011, UC-012, UC-013, UC-014, UC-015, UC-059, UC-060 | Implemented |
| BR-19 | Each warehouse item must have a retention deadline; overdue items require policy-based eligibility checks before disposal or donation. | UC-016, UC-017, UC-061 | Partial |
| BR-20 | Overdue items must be processed through explicit orders or batches: disposal order, donation batch, transfer, or extension depending on campus policy. | UC-018, UC-019, UC-020 | Partial |
| BR-21 | Appointments may only proceed after a valid claim decision, with controlled create/accept/reject/reschedule/cancel/complete states. | UC-021, UC-022, UC-023, UC-024 | Implemented |
| BR-22 | Socket.IO must authenticate via JWT, isolate rooms by claim, and not leak events to unrelated users. | UC-077, UC-078, UC-079 | Implemented |
| BR-23 | Realtime chat opens only for users involved in a valid claim; text/media URL messages must be saved and broadcast to the correct room. Full unread badge and direct chat file upload remain partial. | UC-079, UC-080, UC-081, UC-082 | Partial |
| BR-24 | Realtime notifications belong to individual users and may cover matching, chat, claims, appointments, and warehouse alerts. | UC-020, UC-073, UC-083 | Partial |
| BR-25 | Admins manage users, roles, categories, campus locations, handover points, moderation, reports, dashboard metrics, export, and configuration. | UC-056, UC-063, UC-064, UC-065, UC-066, UC-067, UC-084, UC-085 | Partial |
| BR-26 | Reputation changes only after valid business events and is visible to users through score/history; feedback and reputation must not automatically determine item returns. Feedback collection remains planned. | UC-025, UC-039 | Partial |
| BR-27 | AI training data must be collected, labeled, anonymized, trained, evaluated, and versioned before any custom model is trusted. | UC-026, UC-027, UC-028, UC-029, UC-030 | Planned |
| BR-28 | The mobile app must share auth, validation, privacy, handover, appointment, chat, and notification contracts with the web/backend. | UC-093, UC-094, UC-095, UC-096, UC-097, UC-098, UC-099, UC-100 | Planned |
| BR-29 | Demo data must include accounts and data sufficient for core demo purposes but must not contain real sensitive information. | UC-031, UC-032, UC-040, UC-041, UC-059 | Implemented |
| BR-30 | Testing/hardening must cover claim transitions, warehouse lifecycle, matching thresholds, realtime room isolation, evidence privacy, and migration from a blank DB. | UC-007, UC-015, UC-054, UC-071, UC-078, UC-089 | Partial |

## Notes

- The canonical UC set currently has exactly 100 UCs: `UC-001` through `UC-100`.
- Do not assign UCs to Tran Nguyen Phong as he has left the team.
- If a minor rule arises, add it to an existing BR group instead of creating a new micro-UC.
