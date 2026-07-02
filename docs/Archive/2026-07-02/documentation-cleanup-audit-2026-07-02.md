# Documentation Cleanup Audit - 2026-07-02

## Purpose

This audit keeps the project documentation clear enough for thesis defense and future maintenance. It does not change source code and does not claim unfinished scope as current MVP.

## Canonical Documentation Set

| File | Decision | Reason |
| --- | --- | --- |
| `README.md` | Keep | Fast repository entry point for new team members and judges |
| `docs/README.md` | Keep | Canonical documentation index and cleanup policy |
| `docs/Overall/project-overview.md` | Keep | Main product/repository overview and demo positioning |
| `docs/Overall/mvp-scope-and-future-work.md` | Keep | Source of truth for current MVP scope, out-of-scope items and safe wording |
| `docs/Overall/architecture.md` | Keep | Technical architecture, API groups, migration overview and integration flow |
| `docs/Overall/node-java-service-boundary.md` | Keep | Source of truth for Node.js core API vs Java extension boundary |
| `docs/Overall/thesis-defense-guide-2026.md` | Keep | Defense script, demo checklist, judge Q&A and slide guidance |
| `docs/Requirements and Business Rules/requirements.md` | Keep | Functional/non-functional requirements and status |
| `docs/Requirements and Business Rules/business-rules.md` | Keep | Business policy and rule status |
| `docs/Requirements and Business Rules/traceability-matrix.md` | Keep | BR/FR/NFR/UC traceability |
| `docs/Checklist/master-dev-checklist.md` | Keep | Canonical 100-UC assignment/status checklist |
| `docs/Checklist/pending-tasks.md` | Keep | Active backlog and future work tracker |
| `docs/Archive/2026-07-02/business-product-qa-issue-audit.md` | Archived | Product/business/QA risk audit evidence |
| `docs/Checklist/release-checklist.md` | Keep | Pre-demo/pre-release checks |
| `docs/Archive/2026-07-02/project-architecture-code-review-2026-07-02.md` | Archived | Point-in-time architecture/code review evidence |
| `docs/Archive/2026-07-02/documentation-cleanup-audit-2026-07-02.md` | Archived | This cleanup report |

## README Files

| File | Decision | Notes |
| --- | --- | --- |
| `apps/api-node/README.md` | Keep | Node API setup/reference. Updated to remove stale “Google OAuth/realtime planned” wording. |
| `apps/java-admin-service/README.md` | Keep | Java extension positioning. Keep linked to `node-java-service-boundary.md`. |
| `apps/mobile/README.md` | Keep | Future mobile scope only. Updated to avoid mandatory FPT email wording. |

## Duplicate Content Policy

- `docs/Overall/mvp-scope-and-future-work.md` is the source of truth for scope and safe wording.
- `docs/Overall/node-java-service-boundary.md` is the source of truth for Node.js vs Java ownership.
- `docs/Requirements and Business Rules/requirements.md` and `business-rules.md` are the source of truth for FR/NFR/BR status.
- `docs/Checklist/master-dev-checklist.md` is the source of truth for UC ownership/status.
- Dated audit files should not be edited into general overviews. They provide evidence and context only.

## Content Cleaned In This Pass

- Updated matching documentation from the old text/category/location/time-only description to tiered matching with text, category, location, time, image tags and OCR/serial-like signals.
- Updated score tier behavior: weak candidate, suggestion, notification and high-confidence advisory.
- Removed wording that implied high score automatically marks ownership or returns an item.
- Updated evidence wording from system verification to advisory review confidence.
- Updated warehouse wording to policy-based retention: documents/cards, electronics/high-value items, general items and perishable/hygiene/unsafe items.
- Updated overdue processing wording to mention active claim/appointment guards.
- Removed stale README wording that said Google OAuth and realtime chat were only planned.
- Removed mandatory FPT email wording from mobile future scope.

## Files Not Deleted

No documentation files were deleted in this pass. The docs folder is already small and each file has a different role. Deleting dated audits or checklists would remove useful thesis evidence. If the team wants a smaller final submission package, archive dated audit files after defense slides are finalized.

## Recommended Archive Candidates After Defense

These files are useful now, but can be moved to `docs/Checklist/archive/` after the defense if the team wants a cleaner long-term repo:

- `docs/Archive/2026-07-02/project-architecture-code-review-2026-07-02.md`
- `docs/Archive/2026-07-02/documentation-cleanup-audit-2026-07-02.md`

## Remaining Documentation Gaps

- Add screenshots or short GIFs for the demo flow if slides need stronger visual evidence.
- Add exact Aiven/shared database runbook once the final shared DB policy is decided.
- Add proof-image/disposition form documentation after that feature is implemented.
- Add test evidence links after role/core/warehouse/matching e2e tests are run successfully.
- Add Java SSL/Aiven notes if Java will be demonstrated against the shared cloud database.

## Verify In Code Before Slide Claims

- Public hidden-post visibility and evidence media privacy are still listed as risks in the architecture/code review audit.
- Java handover schema compatibility and Aiven SSL readiness should be verified before claiming Java demo integration.
- Realtime Socket.IO is MVP-ready for one Node instance; clustered production realtime remains future work.
- Matching is rule-based/hybrid with Google Vision assisted OCR/tags. Do not call it a custom trained AI model.
- Mobile is future work unless the React Native flows are completed and tested.
