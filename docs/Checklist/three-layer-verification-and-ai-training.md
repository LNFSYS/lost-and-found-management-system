# Three-Layer Verification and AI Training Guide

Last audit: 2026-06-29

This file describes the three-layer verification approach for the FPTU Lost & Found System. The goal is to use the system to provide smarter suggestions, while the final decision to return an item still requires evidence and confirmation from an authorized person.

## 1. Three-Layer Verification Objectives

The system should use three layers to reduce incorrect claims and minimize the risk of returning items to the wrong person:

- Layer 1 - Rule-Based Matching: the system automatically calculates the similarity percentage between a `LOST` post and a `FOUND` post using the current algorithm.
- Layer 2 - Trained AI Model: an AI model trained on real-world data to classify items, evaluate matches, and improve suggestion accuracy.
- Layer 3 - Human Verification: the claimant provides evidence; the post owner/staff/admin reviews it before accepting the claim and initiating handover.

General flow:

1. User creates a `LOST` or `FOUND` post.
2. Layer 1 runs rule-based matching between the new post and opposing open posts.
3. Layer 2, if a custom model exists, recognizes item images, extracts text/logo/brand, compares `LOST` and `FOUND` images, then produces a `modelMatchProbability`.
4. The system stores metadata from Layer 2 such as suggested category, image description, text/OCR, brand/logo, and image similarity.
5. The system re-runs Layer 1 one more time with AI-enriched data for double-checking.
6. The system combines the enriched Layer 1 score and the Layer 2 score to produce a `finalScore`.
7. If the score is high enough, the system saves `match_results`, displays suggestions, and optionally sends a notification.
8. The suspected owner submits a claim with a secret description/evidence.
9. Layer 3 reviews the evidence and requests additional information if needed.
10. Only when the evidence is valid does the claim get accepted and proceed to the appointment/handover flow.

## 2. Layer 1 - Similarity Percentage Algorithm

Layer 1 is the current algorithm in the codebase. This layer is not a self-trained AI model; it uses rules, TF-IDF, cosine similarity, category/location/time scores, and AI tags/OCR when available.

Layer 1 should run twice when Layer 2 is active:

- Pass 1: runs immediately after the user creates a post/uploads images to provide quick suggestions.
- Pass 2: re-runs after Layer 2 has generated metadata such as item name, category suggestion, OCR text, brand/logo, and image description. This pass uses richer data for double-checking results.

Layer 1 is based on 4 score components:

| Component | Meaning | Default weight |
| --- | --- | --- |
| Text score | Similarity of descriptions, titles, AI/OCR tags | 40% |
| Category score | Similarity of item categories | 30% |
| Location score | Proximity of lost/found locations | 20% |
| Time score | Proximity of lost/found times | 10% |

Weights are read from config:

- `matching.weight_text`, default `0.4`
- `matching.weight_category`, default `0.3`
- `matching.weight_location`, default `0.2`
- `matching.weight_time`, default `0.1`

Processing thresholds:

- `matching.threshold`, default `0.4`: below this threshold, the match is not saved.
- `matching.notification_threshold`, default `0.8`: at or above this threshold, a high-confidence match notification is sent.

### Layer 1 Formula

```txt
ruleBasedScore =
  weightText * textScore
+ weightCategory * categoryScore
+ weightLocation * locationScore
+ weightTime * timeScore

ruleBasedPercent = round(ruleBasedScore * 100)
```

Note: weights should sum to `1.0`. If admin weight adjustment is allowed in the future, validate or normalize before computing.

### Text score

Text score uses TF-IDF + cosine similarity:

1. Concatenate post text: title, description, category/location text, AI tags/OCR if available.
2. Normalize Vietnamese using `normalizeText`.
3. Tokenize by whitespace, discard tokens that are too short.
4. Compute TF-IDF vector for the source post and candidate posts.
5. Compute cosine similarity between the two vectors.

Result:

```txt
textScore ranges from 0.0 -> 1.0
```

Meaning:

- `1.0`: content is very similar.
- `0.5`: moderately similar.
- `0.0`: almost no matching information.

### Category score

```txt
If same specific category: 1.0
If same parent category or parent-child relationship: 0.5
If completely different categories: 0.0
If category is missing: 0.0
```

Examples:

- Both are `Headphones`: `1.0`
- One is `Electronics`, the other is `Headphones`: `0.5`
- One is `Wallet`, the other is `Headphones`: `0.0`

### Location score

```txt
If roomText/detailed location matches after normalization: 1.0
If same building: 0.7
If same area/zone: 0.4
If different area or missing data: 0.0
```

Examples:

- Both entered `Alpha 301`: `1.0`
- Both in `Alpha Building`: `0.7`
- Both in `Academic Buildings` zone: `0.4`
- One in parking lot, the other in cafeteria: `0.0`

### Time score

If time is missing from either post:

```txt
timeScore = 0.0
```

If the lost/found times are within 1 day of each other:

```txt
timeScore = 1.0
```

If more than 1 day apart:

```txt
timeScore = 1 / (1 + daysDiff / 7)
```

Examples:

| Time difference | Approximate time score |
| --- | --- |
| 0-1 day | 100% |
| 7 days | 50% |
| 14 days | 33% |
| 21 days | 25% |

### Layer 1 Scoring Example

A `LOST` post and a `FOUND` post have:

```txt
textScore = 0.70
categoryScore = 1.00
locationScore = 0.70
timeScore = 0.50
```

With default weights:

```txt
ruleBasedScore =
  0.4 * 0.70
+ 0.3 * 1.00
+ 0.2 * 0.70
+ 0.1 * 0.50
= 0.28 + 0.30 + 0.14 + 0.05
= 0.77

ruleBasedPercent = 77%
```

Conclusion:

- `77% >= 40%`: saved to `match_results`.
- `77% < 80%`: does not send a high-confidence notification per the default threshold.

## 3. Layer 2 - AI Model Training

Layer 2 is a custom AI model trained on system data. This layer is used to improve suggestion results from Layer 1 and does not automatically decide item returns.

Currently Layer 2 is planned. When no custom model is available, the system falls back to Layer 1.

### Data to Collect

Data sources:

- Item images from posts.
- Post titles/descriptions.
- User-selected categories.
- Existing AI tags/OCR.
- Matched LOST/FOUND pairs.
- Accepted/rejected claims.
- Correct/incorrect feedback from users/admins.

Required labels:

- `item_category`: correct item category.
- `object_tags`: descriptive item tags.
- `match_label`: whether the LOST/FOUND pair is a correct or incorrect match.
- `quality_label`: image quality — clear/blurry/duplicate/junk if needed.

### Dataset Cleaning and Security

Before training:

- Remove or anonymize emails, phone numbers, student IDs, and contact information.
- Do not include overly sensitive information in the dataset if not needed.
- Remove images that are not item photos.
- Remove spam samples or suspicious feedback.
- Version datasets to ensure training reproducibility.

### Models to Train

Phase 1:

- Image/category item classification model.
- Input: item image.
- Output: category suggestion + confidence.

Phase 2:

- Semantic matching model for LOST/FOUND.
- Input: text + category + location + time + image embedding.
- Output: `modelMatchProbability`.

Phase 3:

- Image-to-image comparison.
- Input: item image from the `LOST` post and item image from the `FOUND` post.
- Output: `imageSimilarityScore`, matching image regions if the model supports it, and a brief match reason.

Phase 4:

- Hybrid scoring.
- Combines Layer 1 with Layer 2:

```txt
finalScore =
  alpha * enrichedRuleBasedScore
+ beta * modelMatchProbability

finalPercent = round(finalScore * 100)
```

Where `alpha + beta = 1`. `enrichedRuleBasedScore` is the Layer 1 score after re-running with Layer 2 metadata. For example, early phases might use `alpha = 0.7`, `beta = 0.3`; as the model stabilizes, `beta` can be increased.

### Proposed AI Lens Response

When analyzing a single item image:

```json
{
  "itemName": "wireless headphones",
  "categorySuggestion": "Electronics > Headphones",
  "description": "White headphone case, AirPods-style design",
  "brand": "Apple",
  "visibleText": ["AirPods Pro"],
  "serialCandidates": ["A2698"],
  "colors": ["white"],
  "confidence": 0.86
}
```

When comparing 2 images from `LOST` and `FOUND`:

```json
{
  "imageSimilarityScore": 0.82,
  "sameItemProbability": 0.76,
  "matchingSignals": ["same headphone type", "same white color", "similar Apple logo"],
  "mismatchSignals": ["cannot read serial in LOST image"],
  "modelVersion": "ai-lens-v1"
}
```

### Evaluation Metrics

Do not look at accuracy alone. Measure:

- Precision: of the matches the system suggests, how many are correct.
- Recall: of the actual correct matches, how many the system found.
- F1-score: balance between precision and recall.
- Top-k accuracy: whether the correct match appears in the top 3/top 5 suggestions.
- False positive rate: rate of incorrect suggestions with high scores.

For a Lost & Found system, prioritize high precision to avoid too many incorrect suggestions and prevent returning items to the wrong person.

### Deploy and Fallback

When a custom model is available:

1. Deploy the model as a separate inference service.
2. API calls the model for category suggestion, OCR/text, brand/logo, image similarity, or `modelMatchProbability`.
3. After receiving Layer 2 metadata, the API saves metadata to post/AI tags then triggers Layer 1 to re-run for double-checking.
4. If the model fails or times out, fall back to Google Vision/current rule matching.
5. Save `model_version` in AI/matching results for audit.
6. Only activate a new model if metrics meet thresholds and admin approves.

## 4. Layer 3 - Human Verification

Layer 3 is used to verify actual ownership. This is the final and most important layer before accepting a claim or initiating handover.

Information the claimant needs to provide:

- Detailed description of the lost item.
- Distinguishing marks: scratches, stickers, color, serial number, wallpaper, contents inside.
- Approximate time of loss.
- Approximate location of loss.
- Photos/evidence if available.

What the reviewer needs to do:

1. Compare the secret description with information held by the post owner.
2. Check whether the evidence is genuinely relevant.
3. Check whether the timeline is reasonable.
4. Compare with Layer 1 and Layer 2 suggestion scores, but do not rely entirely on the scores.
5. If information is insufficient, transition the claim to `NEED_MORE_INFO`.
6. Only accept if the claimant has provided new and valid evidence.
7. If the evidence does not match, reject with a reason.

Important rules:

- A high Layer 1 or Layer 2 score does not mean the person gets their item back.
- Layer 2 AI is only a suggestion assistant; it must not automatically accept claims.
- A claim in `NEED_MORE_INFO` may only be accepted when new evidence is provided after the request.
- Appointments/handover may only be created after a claim is accepted.
- All claim state transitions should go through the Java Admin Service with row locks.

## 5. Implementation Checklist

| Status | Item | Note |
| --- | --- | --- |
| Done | Display Layer 1 match score and main breakdown | Web suggestion cards show overall score and text/category/location scores. Time score display can be improved later. |
| Done | Add admin action to re-run matching manually | Covered by matching re-run API and admin action. |
| Done | Ensure human verification in Layer 3 remains the final decision step before item return | Covered by business rules and claim/appointment guards. |
| Partial | Clearly separate Layer 1, Layer 2 and Layer 3 in UI | Claim verification percentage exists; custom Layer 2 model does not yet exist. |
| Partial | Validate or normalize matching weights | Config weights are read by matching logic; full admin weight UI/validation remains open. |
| Planned | Add background queue for matching when data is large | Kept in pending tasks. |
| Planned | Add match correct/incorrect feedback form to support Layer 2 | AI training backlog. |
| Planned | Design table for training samples/labels | AI training backlog. |
| Planned | Design model registry table | AI training backlog. |
| Planned | Build export/anonymize dataset pipeline | AI training backlog. |
| Planned | Train first category/image model | AI training backlog. |
| Planned | Train semantic matching model after sufficient labeled data | AI training backlog. |
| Planned | Train or integrate LOST/FOUND image comparison model | AI training backlog. |
| Planned | Save AI Lens metadata beyond current Vision tags/OCR | Item tags/OCR exist; custom AI Lens metadata remains planned. |
| Planned | After Layer 2 returns metadata, trigger Layer 1 re-run for double-checking | Depends on custom model. |
| Planned | Add inference endpoint and fallback | Custom model not implemented. |
| Planned | Save model scores and model version fields | Custom model not implemented. |
| Planned | Add training/model metrics dashboard for admin | AI training backlog. |
