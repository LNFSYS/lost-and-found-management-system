# AI Training Roadmap

Last updated: 2026-07-08

## Positioning

The current MVP does not include a production custom-trained AI model.

Current implemented capability:

- Google Vision assisted OCR/tags when configured.
- Rule-based/hybrid matching using text, category, location, time, image tags, OCR-like terms, score tiers, and explanation reasons.
- Training-data foundation for match feedback, suggestion impressions, persisted score explanations, and redacted JSONL export.
- Evidence review confidence as advisory decision support.

Safe thesis wording:

> The current system uses Google Vision OCR/tag extraction and rule-based/hybrid scoring to rank possible matches. A future training pipeline may be introduced after enough explicit, consent-safe, staff-reviewed match feedback is collected.

Do not say:

- The system has a production custom-trained AI model.
- The system uses machine learning to find the true owner.
- AI automatically improves from feedback.
- OCR evidence is anonymized, unless redaction is implemented and verified.
- Java is a required production AI microservice.

## Ordered Work Plan

### 1. Data Engineering Foundation

Goal: make future training data possible without training a model yet.

Available data sources:

- Posts: title, description, type, status, category, location, lost/found time, lifecycle timestamps.
- Media: item/evidence images, Cloudinary metadata, `media_kind`.
- AI metadata: Google Vision labels, objects, OCR tokens.
- Matching: LOST/FOUND pair scores and score tiers.
- Claims: evidence, claim status, review confidence, state logs.
- Appointments and warehouse outcomes: accepted returns, completed handovers, stored/returned/disposed/donated/transferred outcomes.

Recommended future dataset tables or export views:

| Dataset | Purpose |
| --- | --- |
| `training_post_snapshot` | Sanitized post text, type, category path, coarse location, timestamps |
| `training_media_snapshot` | Media metadata, Vision tags, redacted OCR, optional approved image pointer |
| `training_match_pair` | LOST/FOUND candidate pairs, rule scores, labels, matcher version |
| `training_claim_outcome` | Claim decision, evidence count/type, review confidence, appointment result |
| `training_warehouse_outcome` | Custody lifecycle and final return/disposition outcome |
| `label_events` | Staff/user labels such as `MATCH`, `NON_MATCH`, `UNCERTAIN` |

Labeling rules:

- Positive labels should come from accepted claims plus completed appointment/return outcome.
- Rejected claims can be negatives only when the rejection reason is clear.
- Expired/disposed items without claim are weak negatives, not ground truth.
- Clicks/views are not labels by themselves; they are interaction signals.

Privacy controls:

- Hash user/post/claim IDs with salted HMAC in training exports.
- Exclude names, emails, student codes, phone numbers, contact info, secret answers, and raw claim descriptions by default.
- Redact OCR before export, especially student IDs, phone numbers, names, card numbers, QR codes, invoices, serials, and private notes.
- Keep private evidence images in restricted storage; train on derived/redacted features unless explicit approval exists.

Split strategy:

- Use time-based train/validation/test splits.
- Keep all rows sharing a post, claim, user, or warehouse item in the same split.
- Stratify by category, location, item value class, and outcome.

## 2. AI/ML Training Plan

Training should start with lightweight, explainable models only after the data foundation exists.

Recommended progression:

1. Rule-based baseline, already implemented.
2. TF-IDF/BM25 retrieval baseline.
3. Calibrated logistic regression ranker over exported match features. Initial training script is implemented as `npm run train:match-model`.
4. Learning-to-rank model after enough explicit feedback exists.
5. Text/image embedding reranker.
6. Multimodal fine-tuning only after a large, clean, consent-safe dataset exists.

Matching features:

- Normalized title/description token overlap.
- TF-IDF/BM25 similarity.
- Category exact/parent similarity.
- Area/building/room/custom-location similarity.
- Lost/found time distance.
- Vision label/object tag overlap.
- OCR/serial/brand/private identifier overlap.
- Existing score caps and penalties.

Evidence confidence features:

- Claim text overlap with post text.
- Approximate location/time consistency.
- Evidence OCR overlap.
- Presence of private signals such as serial, receipt, prior photo detail, scratch/accessory description.
- Related LOST post match score.
- Evidence count/type.

The output must stay advisory:

- `LOW`
- `MEDIUM`
- `HIGH_REVIEW`
- `STRONG_REVIEW`

No score may automatically approve ownership or release an item.

Minimum dataset gates before supervised training:

| Gate | Minimum |
| --- | ---: |
| Real resolved LOST/FOUND pairs | 1,000+ |
| Candidate pair judgments | 5,000+ |
| Match impressions including ignored/rejected suggestions | 10,000+ |
| Examples per major category | 500+ |
| Positive matches per high-volume category | 100+ |
| Hard negatives per high-volume category | 300+ |

Evaluation metrics:

- `precision@1`: target at least 80% before showing as strong suggestion.
- `precision@3`: target at least 70% before broad user-facing suggestions.
- `recall@5`: target at least 75% so valid matches are not missed.
- Calibration: an 80% confidence bucket should be correct around 80% of the time.
- False positive rate must be treated as higher cost than false negative rate because wrong return is serious.
- Staff override rate, appeal/reversal rate, and rejection agreement should be tracked for evidence confidence.

### Small Model Training Workflow

Use this only after `match_feedback` contains real labels from users, Staff, or Admin.

1. Apply the latest schema:

   ```bash
   npm run migrate:api
   ```

2. Collect labels through the match feedback API:

   ```http
   POST /api/posts/:postId/matches/:matchId/feedback
   ```

   Positive label:

   ```json
   { "label": "TRUE_MATCH", "note": "Confirmed after review" }
   ```

   Negative labels:

   ```json
   { "label": "FALSE_MATCH" }
   { "label": "DUPLICATE" }
   { "label": "INSUFFICIENT_EVIDENCE" }
   ```

   `UNCERTAIN` is stored for audit but ignored during supervised training.

3. Export redacted training data:

   ```bash
   npm run export:training-data
   ```

   Optional:

   ```bash
   TRAINING_DATA_PATH=training-exports/match-training-example.jsonl npm run train:match-model
   ```

4. Train the baseline logistic regression reranker:

   ```bash
   npm run train:match-model
   ```

   The script writes:

   ```text
   apps/api-node/model-artifacts/match-ranker-logreg.json
   ```

   The artifact contains feature names, normalization values, weights, recommended threshold, validation metrics, and rule-baseline comparison.

5. Minimum practical data for a first demo model:

   - 20+ labeled rows for a technical smoke test.
   - 100-300 labeled rows with both positive and negative examples for a meaningful thesis demo.
   - 1,000+ resolved pairs before claiming strong real-world performance.

This model is a small trained reranker, not a custom deep AI model. It should be presented as an experimental baseline that compares against the rule-based matching score.

## 3. Backend And Service Boundary

Node.js remains the source of truth and online product owner.

| Area | Owner |
| --- | --- |
| Posts, media, claims, warehouse, notifications | Node API |
| Current rule-based/hybrid matching | Node API |
| Match feedback capture | Node API |
| Match explanation persistence | Node API |
| Suggestion impressions | Node API |
| Dataset export source | Node API DB and export jobs |
| Future training orchestration/admin labeling | Java/Spring Boot extension or separate AI service |
| Future online inference | Optional internal inference service called by Node |

Near-term DB/API additions before any training:

- `match_feedback`: explicit user/staff/admin labels for candidate pairs. Implemented as `match_feedback`.
- `match_explanations`: persisted score breakdown, matcher version, penalties, and explanation. Implemented inside `match_results.explanation_json`.
- `suggestion_impressions`: which suggestions were shown, clicked, dismissed, claimed, or ignored. Implemented as `match_suggestion_impressions`.
- `media_analysis`: structured provider output, redacted OCR, labels/objects, processing version.
- `evidence_metadata`: claim evidence OCR/type/confidence/review status.
- `export_job`: versioned, access-controlled dataset export with checksum and redaction policy version.

Future inference pattern:

1. Rule-based candidate generation remains default.
2. ML ranker only reranks top candidates.
3. Inference runs in shadow mode first.
4. Node falls back to rule-based ranking on timeout/error/low confidence.
5. Rollout modes: disabled, shadow, admin-only review, percentage rollout, full rollout.

Do not present this as production microservices until contracts, deployment, monitoring, rollback, and one-writer-per-flow rules are verified.

## 4. Security And Privacy Guardrails

Must-have guardrails:

- Explicit consent or clear policy basis before using reports/images/OCR for training.
- Data minimization for exports.
- Redaction before export.
- Role-based access for evidence, OCR, feedback, exports, model registry, and training jobs.
- Encryption at rest and in transit for media, OCR, exports, and model artifacts.
- Audit logs for export creation, download, access, deletion, model promotion, and inference rollout.
- Dataset and model retention policy.
- Immutable dataset manifests with schema version, source date range, redaction version, feature definitions, and label meaning.
- Human-in-the-loop final ownership approval.
- Clear separation between candidate ranking and ownership verification.

Known risks:

- OCR can capture student IDs, phone numbers, names, cards, QR codes, invoices, and private notes.
- Photos may reveal people, rooms, devices, serials, or EXIF metadata.
- Match feedback can expose relationships between users, LOST reports, FOUND reports, claims, and outcomes.
- Exported training datasets create a second sensitive data copy.
- User feedback can be noisy or intentionally poisoned.
- Rare items, timestamps, and locations may re-identify users even after removing names.

## 5. Implement Now Without Training

These tasks improve future AI readiness without claiming custom AI training:

- Add match feedback capture for `true_match`, `false_match`, `uncertain`, `duplicate`, and `insufficient_evidence`. Implemented for match pairs.
- Persist `image_score`, `ocr_score`, matched OCR tokens, matched image tags, penalties, explanation JSON, and matcher version. Implemented for current match results.
- Log suggestion impressions and interactions. Initial `SHOWN` logging is implemented; click/dismiss/claim-start UI hooks remain future work.
- Export redacted JSONL training data. Implemented through `npm --workspace apps/api-node run export:training-data`.
- Train a small logistic regression match reranker from exported labeled data. Implemented through `npm --workspace apps/api-node run train:match-model`; requires enough real labels.
- Store claim evidence OCR in structured fields instead of only embedding it into descriptions.
- Add OCR PII redaction before analytics/export.
- Add offline evaluation scripts over historical match candidates.
- Add admin/staff label review UI later.
- Keep all current matching and evidence confidence outputs advisory.

## 6. Slide And Defense Wording

Use:

- "AI-assisted OCR and visual tagging using Google Vision."
- "Rule-based/hybrid matching with configurable score tiers."
- "Future ML ranker after enough labeled campus data exists."
- "Human review remains required before returning an item."
- "Node.js remains the MVP source of truth; Java can support future training/admin workflows."

Avoid:

- "Custom AI model is trained."
- "AI finds the owner."
- "AI verifies ownership."
- "Production MLOps pipeline."
- "Automatic learning from user feedback."
- "OCR evidence is anonymized."

One-liner:

> The current MVP is AI-assisted, not AI-trained: it uses Google Vision OCR/tags and rule-based matching today, while the training roadmap defines the data, privacy, labeling, and evaluation steps required before a responsible custom model can be built.
