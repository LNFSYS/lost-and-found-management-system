# Documentation Index

Last updated: 2026-07-02

This folder is intentionally kept small. Use these files as the canonical documentation set for the thesis/demo.

## Read First

| File | Purpose |
| --- | --- |
| `Overall/project-overview.md` | Main product and repository overview |
| `Overall/mvp-scope-and-future-work.md` | Scope boundary, safe wording, future work |
| `Overall/architecture.md` | Technical architecture, API groups, migrations |
| `Overall/node-java-service-boundary.md` | Node.js and Java ownership rules |
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

## Archived Evidence

| File | Purpose |
| --- | --- |
| `Archive/2026-07-02/business-product-qa-issue-audit.md` | Product/QA/business risk audit evidence |
| `Archive/2026-07-02/documentation-cleanup-audit-2026-07-02.md` | Dated documentation cleanup/audit report |
| `Archive/2026-07-02/project-architecture-code-review-2026-07-02.md` | Dated architecture/code review report |

## Cleanup Policy

- Do not create another overview/checklist unless it replaces one of the canonical files above.
- Put one-time QA findings into `Archive/<date>/...` after they are converted into `Checklist/pending-tasks.md` or `Checklist/release-checklist.md`.
- Put future AI/mobile ideas into `Overall/mvp-scope-and-future-work.md` or `Checklist/pending-tasks.md`, not into separate claim-heavy documents.
- Do not describe mobile or custom AI training as current MVP unless implemented and verified.
- Keep dated audit reports as evidence during thesis defense, but do not use them as the primary reading path.
