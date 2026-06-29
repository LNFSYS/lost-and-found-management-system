# Pending Task Checklist

Last audit: 2026-06-29

## Current Audit Summary

| Metric | Count |
| --- | ---: |
| Completed checklist items | 60 |
| Open checklist items | 61 |

Open work is concentrated in Google OAuth/auth ownership, advanced AI category selection, direct chat file upload, thumbnail optimization, Java evidence ownership guard, background matching queue, smart notification tiers, configurable warehouse retention/disposition proof, chat unread badge, full web config UI, feedback/negative-feedback review, mobile app, AI training/MLOps, and automated hardening tests.


## Auth / Account

- [ ] Add Google OAuth login.
- [ ] Decide clearly whether Node or Java owns auth extensions.
- [ ] If Java needs its own auth, add email/password/token validation compatible with Node.

## User Post / Community Feed

- [x] Add cron job to transition expired posts to `EXPIRED`.
- [x] Build post edit screen for users.
- [x] Build close post button for users.
- [x] Build soft-delete post button for users.
- [x] Build violation report from user side.
- [ ] Complete AI suggested category selection/editing.
- [x] Add gallery/lightbox for post images.
- [ ] Consider category multi-select if advanced search is needed.
- [x] Review index/query plans for feed with large datasets.

## Media

- [ ] Allow image upload in chat.
- [ ] Create thumbnail/optimized images if needed.
- [x] Allow claim to upload multiple evidence files.

## Claim / Evidence

- [x] Build UI to view claim evidence for authorized users.
- [x] Build UI to request additional claim information.
- [x] Build accept claim modal.
- [x] Build reject claim modal with reason.
- [x] Build cancel claim button for claimant.
- [ ] If Java manages evidence, add claim/post relationship guard.

## Matching / Notification

- [ ] Move heavy matching to background queue.
- [x] Add admin manual re-run matching feature.
- [x] Add realtime toast when a good match is found.
- [x] Add notification when a new claim is submitted.
- [x] Add notification when claim is accepted/rejected.
- [ ] Add smart notification by score tier or digest.

## Handover / Warehouse

- [x] Add job to mark overdue warehouse items.
- [ ] Add configurable retention period by item type/value.
- [x] Alert for items nearing expiry.
- [x] Build overdue item management screen.
- [ ] Build overdue item disposition report form.
- [x] Allow overdue processing: dispose, donate, transfer, extend.
- [x] Add warehouse capacity management.
- [x] Alert when warehouse reaches 80% capacity.
- [x] Block selecting a full warehouse or suggest alternatives.
- [ ] Add handover/proof image upload.
- [x] Build API/UI to view current storage location more clearly.

## Appointment

- [x] Create appointment after claim is accepted.
- [x] Block appointment creation if claim is not accepted.
- [x] Validate appointment time.
- [x] Prevent scheduling conflicts at the same handover point.
- [x] Allow selecting a handover point as the return location.
- [x] Allow entering a custom meeting location.
- [x] Allow accepting an appointment.
- [x] Allow rejecting an appointment with reason.
- [x] Allow rescheduling an appointment.
- [x] Allow canceling an appointment.
- [x] Allow marking appointment as completed.
- [x] After completion, update post to `RESOLVED` if appropriate.
- [x] Send appointment reminder via notification.

## Chat / Realtime

- [x] Create chat room after claim is accepted.
- [x] Set up Socket.IO server with auth/CORS.
- [x] Allow related users to join room by claim.
- [x] Send text messages in realtime.
- [x] Save messages to DB.
- [x] Receive realtime messages on web.
- [x] Build chat bubble UI.
- [x] Send image URL messages in chat.
- [x] Display seen/read status.
- [ ] Add realtime unread badge for messages.

## Admin Dashboard / Report / Config

- [x] Add chart for LOST/FOUND posts over time.
- [x] Add chart for successful return rate.
- [x] Add chart by category.
- [x] Add heatmap for high-loss areas.
- [x] Add top trusted users table.
- [x] Export report as CSV.
- [ ] Build full config page on web.
- [ ] Add config rollback.
- [ ] Add UI for post expiration configuration.
- [ ] Add UI for matching threshold configuration.
- [ ] Add UI for matching weight adjustment.
- [ ] Add UI for notification/email rule configuration.
- [ ] Complete config history page if deeper operations are needed.

## Reputation / Feedback

- [x] Add points after successful item return.
- [x] Add points after successful claim.
- [x] Deduct points after multiple incorrect claims.
- [x] Deduct points when a post is deleted by admin for violation.
- [x] Calculate reputation level.
- [x] Build reputation history page.
- [ ] Build feedback form after item return.
- [ ] Build admin screen to review negative feedback and flag users.

## Mobile App

- [ ] Build mobile auth: register, OTP, login, logout.
- [ ] Build mobile profile/edit profile/avatar.
- [ ] Build mobile LOST/FOUND feed.
- [ ] Build mobile create LOST/FOUND post.
- [ ] Build mobile image upload from camera/gallery.
- [ ] Build mobile search/filter/sort.
- [ ] Build mobile claim and evidence upload.
- [ ] Build mobile handover point list.
- [ ] Build mobile appointment flow.
- [ ] Build mobile realtime chat.
- [ ] Build mobile notification.
- [ ] Store mobile token using secure storage.
- [ ] Add retry/offline handling for mobile.

## AI Model Training / MLOps

- [ ] Collect training data from posts, images, AI tags, matches, and feedback.
- [ ] Build admin tool for labeling category/tag/match correct/incorrect.
- [ ] Build dataset export pipeline.
- [ ] Clean and anonymize dataset before training.
- [ ] Train image/category classification model.
- [ ] Train or fine-tune semantic matching model.
- [ ] Add AI Lens for item name recognition, image description, OCR/text, brand/logo.
- [ ] Add direct image comparison between LOST and FOUND.
- [ ] After AI returns metadata, re-run rule-based matching for double-check.
- [ ] Evaluate model with precision/recall/F1/top-k.
- [ ] Save model version, dataset snapshot, and training metadata.
- [ ] Add model status registry: draft, approved, deployed.
- [ ] Deploy inference endpoint for custom model.
- [ ] Fallback to Google Vision/rule matching when custom model fails.
- [ ] Build dashboard for tracking dataset/training/model metrics.
- [ ] Record correct/incorrect feedback for retraining.
- [ ] Filter spam/dirty feedback before adding to dataset.

## Testing / Hardening

- [ ] Write e2e test for OTP registration, login, post creation, claim.
- [ ] Write tests for admin CRUD of categories/areas/handover/users/reports.
- [ ] Write tests for claim transition and race condition.
- [ ] Write tests for warehouse lifecycle.
- [ ] Write tests for appointment when implemented.
- [ ] Write tests for notification/matching threshold.
- [ ] Standardize demo seed data.
- [ ] Verify migration from blank DB.
- [x] Verify full build before submission.
