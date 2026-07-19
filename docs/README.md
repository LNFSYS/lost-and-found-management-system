# Documentation Index

Last updated: 2026-07-19

This folder is intentionally kept small. Use these files as the canonical documentation set for the thesis/demo.

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

## Requirements And Tracking

| File | Purpose |
| --- | --- |
| `Requirements and Business Rules/requirements.md` | Functional/non-functional requirements |
| `Requirements and Business Rules/business-rules.md` | Business rules |
| `Requirements and Business Rules/traceability-matrix.md` | BR/FR/NFR/UC traceability |
| `Checklist/master-dev-checklist.md` | Canonical UC assignment/status |
| `Checklist/pending-tasks.md` | Remaining work and backlog |
| `Checklist/release-checklist.md` | Pre-demo/pre-release technical and product checks |
| `Checklist/deep-research-report-19-07-2026.md` | Current three-lens architecture, backend, code-quality and readiness assessment |

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
