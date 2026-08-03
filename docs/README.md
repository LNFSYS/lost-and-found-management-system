# Documentation Index

Last updated: 2026-08-02

This folder is intentionally kept small. Use these files as the canonical documentation set for the thesis/demo.

## Current Implementation Baseline

The current Web/Node MVP includes the original LOST/FOUND, claim, appointment, warehouse/handover and realtime flows plus the following hardening completed through migrations `026`-`033`:

- session-version invalidation, notification idempotency, operational indexes and migration checksum/lock integrity;
- reviewer-approved item-specific verification questions with bcrypt expected answers, version-pinned claim assignments and transaction-safe terminal-state locking;
- aggregate Campus LOST Radar with sourced events, sliding-window/baseline analysis, bounded thresholds, dedupe/cooldown, related public post summaries and Staff/Admin dispositions;
- Staff/Admin Visual Hunt using explicit camera/image/video-frame/batch input, Google Vision assisted metadata/OCR, ephemeral input handling, bounded candidate scoring and human feedback;
- independent feature flags, role/rate/privacy guards, operational metrics, synchronized OpenAPI/Swagger contracts and CI/E2E coverage.

Local verification on 2026-08-01 passed API/web builds, migration smoke with 36 records, 56 API tests with two opt-in MySQL tests skipped, verification/role E2E, and Playwright with 13 passed plus one credential-dependent login test skipped. Google Vision live behavior still depends on a valid API key, enabled Cloud Vision API and billing; otherwise the documented rule-based fallback remains active.

## Read First

| File | Purpose |
| --- | --- |
| `Overall/project-overview.md` | Main product and repository overview |
| `Overall/mvp-scope-and-future-work.md` | Scope boundary, safe wording, future work |
| `Overall/ai-training-roadmap.md` | Future AI training readiness, dataset, privacy, and service-boundary plan |
| `Overall/architecture.md` | Technical architecture, API groups, migrations |
| `Overall/node-java-service-boundary.md` | Node.js and Java ownership rules |
| `Overall/adr-001-node-java-write-ownership.md` | One-writer-per-flow architecture decision |
| `Overall/demo-release-runbook.md` | Secret, database, migration, test, and demo preparation |
| `Overall/deployment-and-rollback.md` | Container topology, health/metrics, deployment order, rollback and restore rules |
| `Overall/thesis-defense-guide-2026.md` | Defense script, demo flow, judge Q&A |
| `tutorial/ai-camera-radar-demo-guide.md` | Phone camera, image/video fallback, Radar and verification-question demo guide |

## Requirements And Tracking

| File | Purpose |
| --- | --- |
| `Requirements and Business Rules/requirements.md` | Functional/non-functional requirements |
| `Requirements and Business Rules/business-rules.md` | Business rules |
| `Requirements and Business Rules/traceability-matrix.md` | BR/FR/NFR/UC traceability |
| `Checklist/master-dev-checklist.md` | Canonical UC assignment/status |
| `Checklist/pending-tasks.md` | Remaining work and backlog |
| `Checklist/release-checklist.md` | Pre-demo/pre-release technical and product checks |
| `Checklist/implementation-report-2026-08-02.md` | Detailed implementation, files, endpoints, verification evidence, and remaining runtime work for commit `2c65c2a` |
| `Checklist/project-independent-reassessment-2026-07-27.md` | Current independent weighted reassessment with verified findings and fix priorities |
| `Checklist/deep-research-report-27-07-2026.md` | Earlier readiness snapshot retained for comparison with the independent reassessment |

## Archived Evidence

| Folder | Purpose |
| --- | --- |
| `Archive/2026-07-02/` | Initial product, QA, documentation and architecture audits |
| `Archive/2026-07-08/` | Bug/risk audit after the first MVP hardening pass |
| `Archive/2026-07-10/` | Completed deep-research change checklist |
| `Archive/2026-07-13/` | Independent and deep technical review snapshots |
| `Archive/2026-07-15/` | Previous readiness report retained for score/history comparison |

## Cleanup Policy

- Do not create another overview/checklist unless it replaces one of the canonical files above.
- Put one-time QA findings into `Archive/<date>/...` after they are converted into `Checklist/pending-tasks.md` or `Checklist/release-checklist.md`.
- Dated reports are immutable historical snapshots. Do not update their old findings after they are archived; record the new state in the current report/checklists instead.
- Put active bug triage into `Checklist/pending-tasks.md` or a dated archive after the issues are fixed or moved into the release checklist.
- Put future AI/mobile ideas into `Overall/mvp-scope-and-future-work.md` or `Checklist/pending-tasks.md`, not into separate claim-heavy documents.
- Do not describe mobile or custom AI training as current MVP unless implemented and verified.
- Keep dated audit reports as evidence during thesis defense, but do not use them as the primary reading path.

## Latest Implementation Evidence

- [Private assistance implementation report (2026-08-03)](Checklist/implementation-report-2026-08-03-private-assistance.md): AI-assisted draft, private FOUND, Private Proof Vault and Evidence Consistency Map.
- [User recovery tools implementation report (2026-08-03)](Checklist/implementation-report-2026-08-03-user-recovery-tools.md): Search Companion, Recovery Timeline and Finder Quick Scan, including security invariants and unresolved DB release gates.
- [Full project verification report (2026-08-03)](Checklist/implementation-report-2026-08-03-full-verification.md): source audit, complete command matrix, defects fixed, migration/E2E blockers and conditional release recommendation.
