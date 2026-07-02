# Thesis Defense Guide 2026 - FPTU Lost & Found System

Last updated: 2026-06-30

## 1. Project Positioning

### Short Project Description

FPTU Lost & Found Management System is a web/backend MVP for managing the Lost & Found process inside FPT University Da Nang campus. The system supports LOST/FOUND posts, hybrid/rule-based matching with Google Vision assisted OCR/tags, claim evidence review confidence, appointment scheduling, warehouse/handover point management, realtime notifications/chat, and admin/staff dashboards.

Mobile support and custom AI training/MLOps are treated as future extensions, not the core deliverable of the current project.

### Project Scope

The project focuses on a campus pilot-ready MVP for the complete web/backend flow:

1. Users report lost or found items.
2. The system suggests similar items through matching.
3. Owners submit claims with evidence.
4. Staff/Admin review evidence and claim status.
5. Accepted claims proceed to appointment and handover.
6. Warehouse/handover points track item custody.
7. Notifications, realtime chat, and dashboards support operations.

### In Scope

- Web app for Student, Lecturer, Staff, and Admin.
- Node.js backend API, MySQL schema/migrations, auth and role guard.
- LOST/FOUND post creation, search, filter, detail, update/close/delete where allowed.
- Google Vision assisted OCR/tags when configured.
- Hybrid/rule-based matching using text, category, location, time, image tags, OCR/tag metadata, and score tiers.
- Claim submission with evidence and advisory review confidence support.
- Appointment, handover point, warehouse item, dashboard, notification, and realtime chat flows.
- Requirements, business rules, traceability, checklist, and QA/product audit documentation.

### Out Of Scope For Current MVP

- Completed native mobile app.
- Custom trained AI model.
- Production MLOps pipeline.
- Fully production-grade microservice deployment.
- Enterprise monitoring, backup, load testing, and complete audit/compliance hardening.

### Future Work

- Complete mobile app or strengthen responsive web as mobile-first.
- Add custom AI model only after enough labeled data exists.
- Add MLOps: dataset labeling, anonymization, model registry, evaluation, deployment, retraining.
- Add stronger production hardening: monitoring, logs, backup, e2e tests, load tests, role matrix tests.
- Improve realtime reconnect/offline hardening, config rollback UI, and richer analytics.

### Difference From Basic CRUD

This project is not only CRUD because it models a full real campus workflow: matching LOST/FOUND posts, private evidence verification, role-based claim decisions, appointment scheduling, item custody through warehouse/handover points, realtime communication, notifications, and operational dashboards.

## 2. Safer Wording

| Risky wording | Safer wording |
| --- | --- |
| AI training | Google Vision assisted OCR/tagging, future custom AI training |
| AI model | Hybrid/rule-based matching with image/OCR tag support |
| AI-powered system | AI-assisted Lost & Found MVP |
| Production-ready | MVP-ready, campus pilot-ready |
| Mobile app completed | Mobile extension planned / mobile prototype, verify in code |
| Complete microservices | Node.js core backend plus Java business-service extension, verify integration boundary |
| Automatic ownership decision | Evidence review confidence is advisory; staff/user decision is still required |
| Fully secure | Role-based access and JWT guards are implemented; production hardening remains future work |

## 3. Presentation Script 5-7 Minutes

Good morning teachers. Our project is FPTU Lost & Found Management System for FPT University Da Nang campus.

The problem we address is simple but common. Students and lecturers often lose items such as student cards, wallets, earphones, books, or chargers. In the current manual process, information is scattered across social media posts, chat groups, security desks, and personal messages. This makes it hard to search, hard to verify ownership, and hard for staff to track where an item is being stored.

Our target users are Student, Lecturer, Staff, and Admin. Students and lecturers mainly report lost or found items and submit claims. Staff focus on warehouse and handover operations. Admin manages users, categories, locations, moderation, reports, and system configuration.

Our solution is a web/backend MVP for the campus Lost & Found workflow. The core flow is: a user creates a LOST or FOUND post, the system suggests similar items, the owner submits a claim with evidence, staff or the post owner verifies the claim, then the system supports appointment scheduling, handover point selection, warehouse tracking, realtime notification, and dashboard monitoring.

Technically, the current MVP uses a React TypeScript web app, a Node.js API, MySQL database with migrations, JWT authentication, Socket.IO for realtime features, Cloudinary for media, and Google Vision assisted OCR/tags when configured. The matching is hybrid/rule-based. It uses text similarity, category, location, time, image tags, OCR/tag metadata, and score tiers. We do not claim that this is a custom trained AI model in the current version.

The key features are role-based access, LOST/FOUND post management, matching suggestions, claim evidence upload, review confidence support, appointment and handover, warehouse management, realtime chat/notification, and admin/staff dashboard.

In the demo, we will first log in as a user, create a lost post, then create a found post. Next, we show matching suggestions. After that, we submit a claim with evidence, review the claim as staff/admin, create an appointment, and show the handover/warehouse and dashboard views. If realtime is running, we also show notification or chat updates.

There are limitations. Mobile is planned as an extension and is not the main deliverable. Custom AI training and MLOps are also future work. The current system uses Google Vision assisted OCR/tags and rule-based matching. For production, we still need stronger monitoring, backup, load testing, full e2e coverage, and more detailed audit hardening.

In conclusion, our project delivers a realistic campus Lost & Found MVP, not just a CRUD app. It connects the complete workflow from reporting an item to verifying ownership and returning the item through staff-controlled handover and warehouse operations.

## 4. Demo Checklist

| Step | Demo action | What to say | Judge may ask | Safe answer |
| --- | --- | --- | --- | --- |
| 1 | Login as Student/Lecturer | This role can create posts, search, submit claims, and receive notifications. Google OAuth can be shown if credentials are configured. | How do you protect role access? | JWT and role guards are implemented; role/privacy smoke exists, but full role matrix tests still need expansion. |
| 2 | Create LOST post | LOST post includes description, location, time, contact, and private ownership details. | Why private evidence? | It helps verify ownership without exposing sensitive details publicly. |
| 3 | Create FOUND post | FOUND post records where the item is held or which handover point is used. | Who can create FOUND posts? | Users can report found items; Staff/Admin can manage storage and handover. |
| 4 | Show matching result | Matching compares text, category, location, time, image tags, OCR/tag metadata, and score tiers. | Is this AI? | It is hybrid/rule-based matching with Google Vision assisted OCR/tags, not a custom trained model. |
| 5 | Owner submits claim evidence | Claim requires ownership description and optional evidence images. | Can anyone claim anything? | Duplicate/self-claim and permission rules are guarded; evidence is reviewed before return. |
| 6 | Staff/Admin verifies claim | The system shows evidence and review confidence as decision support. | Does the system auto-approve? | No. Confidence is advisory; human review is still required. |
| 7 | Create appointment/handover | Accepted claim can proceed to appointment and return location. | Why appointment after claim? | It avoids handing items to unverified users and keeps custody traceable. |
| 8 | Warehouse/handover point | Staff tracks where the item is stored, retention, and item status. | What happens to overdue items? | The system supports policy-based retention and guarded overdue processing; proof forms can be extended. |
| 9 | Admin dashboard | Admin sees overview, moderation, reports, users, categories, locations, handover, warehouse. | Is Staff same as Admin? | No. Staff has narrower warehouse/handover-oriented access. |
| 10 | Realtime notification/chat | Socket.IO supports realtime notification/chat for claim coordination. | Is it reliable in production? | It is MVP-ready; production needs monitoring, reconnect testing, and load testing. |

## 5. Possible Judge Questions And Safe Answers

### Scope

1. Is the project too broad?  
No. The core deliverable is the web/backend MVP for campus Lost & Found. Mobile and custom AI training are future work.

2. What is the main completed flow?  
LOST/FOUND post, matching, claim evidence, verification, appointment, warehouse/handover, notification/realtime, dashboard.

3. Is this production-ready?  
It is MVP-ready or campus pilot-ready. Production hardening such as monitoring, backup, load testing, and wider e2e tests remains future work.

4. What is the strongest value of the project?  
It connects the real item return workflow, not just post listing.

### AI/OCR/Matching

5. Did you train your own AI model?  
No. Current implementation uses Google Vision assisted OCR/tags and hybrid/rule-based matching.

6. Why call it AI-assisted?  
Because Google Vision can extract labels/tags/OCR, but ownership decisions are still rule-based and human-reviewed.

7. How does matching work?  
It compares normalized text, category, location, time, image tags and OCR/tag metadata, then returns a tiered score, suggestions and explanation reasons.

8. Can matching be wrong?  
Yes. It is only a suggestion, so claim evidence and human verification are required.

9. What would custom AI add later?  
Image similarity, semantic matching, category prediction, and model evaluation based on labeled campus data.

### Security/Auth/Role

10. How do you authenticate users?  
The system uses email/password, OTP flows, JWT access tokens, refresh token handling, and role-based guards.

11. How are roles separated?  
Student/Lecturer use post and claim flows; Staff focuses on warehouse/handover; Admin manages configuration and governance.

12. Can users view private evidence?  
Only authorized users such as claimant, post owner, Staff/Admin should access claim evidence. This should be part of QA testing.

13. What happens when unauthorized users call admin APIs?  
Backend guards should return 401/403. Role matrix tests should be expanded.

### Database/Design

14. Why use MySQL?  
The domain has relational data: users, posts, claims, appointments, warehouse items, handover points, and logs.

15. How do you keep data integrity?  
By using migrations, foreign keys/constraints where available, enums/status fields, and service-level validation.

16. Why have migrations?  
They make setup repeatable for new machines and keep schema changes traceable.

### Node.js And Java Boundary

17. Why are there both Node.js and Java services?  
Because the team has both Node.js and Java specializations. Node.js is the current core web-facing backend for the MVP demo. Java/Spring Boot is a parallel business/admin extension for selected rule-heavy operations and future service split work.

18. Is it a complete microservice architecture?  
Not yet. It should not be presented as production microservices until service ownership, routing, deployment, and integration tests are fully defined.

19. Is there risk of duplicated business logic?  
Yes, if both services write the same state. The project documents Node as the current web MVP runtime owner and Java as a business-service extension. Before production, one writer per flow must be enforced and covered by integration tests.

20. How can two backend members work in parallel safely?
They work by domain boundary: Node owns the web-facing flow, auth, posts, media, matching, realtime, and current demo orchestration; Java works on selected business/admin extensions such as claim transition rules, handover/storage rules, configuration history, and future policy engine work.

### Testing

21. What tests are available?
Build/type checks pass, and there is a core e2e smoke script. Full automated coverage still needs expansion.

22. What test gaps remain?
Role matrix, claim race condition, warehouse lifecycle, realtime room isolation, blank DB migration, and load testing.

23. How did you verify demo readiness?
By running builds/type checks, reviewing core flow, cleaning wording, and documenting known gaps.

### Realtime/Notification

24. Why use Socket.IO?
Lost & Found benefits from realtime claim/chat/notification updates so users do not need to refresh manually.

25. What if realtime fails?
The MVP can still rely on persisted notifications/API refresh. Production should add reconnect and monitoring tests.

### Warehouse/Handover

26. Why include warehouse and handover?
Because real Lost & Found does not stop at matching; staff must know where the item is stored and when it is returned.

27. How do you prevent wrong handover?
By requiring accepted claim status, evidence review, appointment, and staff/user confirmation.

### Mobile/Future Work

28. Is the mobile app complete?
No. Mobile is planned/future scope. The current deliverable is the responsive web/backend MVP.

29. Why not finish mobile now?
The team prioritized completing the core web/backend workflow first because it is the main business process.

### Production Readiness

30. What is missing before real deployment?
Monitoring, backup, audit log hardening, rate limits, e2e coverage, load tests, security review, and operational runbook.

31. Would you deploy this to campus immediately?
As a pilot with controlled users and monitoring, yes after final environment checks. For full production, more hardening is needed.

## 6. Limitation And Future Work

The current limitation is not a weakness if explained correctly. The project intentionally focuses on the full web/backend campus flow first.

- Mobile app: planned extension, not current core.
- Custom AI training/MLOps: future work after enough labeled data exists.
- Matching: currently hybrid/rule-based/OCR-assisted with score tiers, not a self-trained ML model.
- Production hardening: needs monitoring, backup, load testing, better audit logs, and stronger e2e test coverage.
- Testing: role/privacy and migration smoke scripts exist; still needs broader warehouse lifecycle, claim race condition, realtime isolation, clean blank-DB, and load tests.
- Java/Node boundary: documented as Node core web API plus Java business-service extension; production microservices still require stricter routing and integration tests.

## 7. One-Liner If Judge Says The Scope Is Too Big

Nhóm em có nhiều module, nhưng core deliverable của nhóm là web/backend MVP cho quy trình Lost & Found campus. Các phần như mobile và custom AI training được đặt là hướng mở rộng, không phải phạm vi chính để đánh giá hoàn thành.

## 8. Slide Correction Checklist

| Slide | Should say | Should not say | Risk |
| --- | --- | --- | --- |
| Title | FPTU Lost & Found Management System - Campus Da Nang | Full production AI/mobile platform | Overclaim from first slide |
| Problem | Lost/found info is scattered, hard to verify and track | Everyone loses items every day without evidence | Weak or exaggerated problem |
| Current Process Pain Point | Manual posts/chat/security desk cause delay and poor traceability | Manual process is completely unusable | Judge may ask for proof |
| Objectives | Build web/backend MVP for campus lost-found workflow | Build everything: web, mobile, AI, microservices | Scope too wide |
| Scope | Web/backend core; mobile/custom AI are future work | Mobile and AI training completed | Easy to catch |
| Actors | Student, Lecturer, Staff, Admin | Too many undefined actor types | Confusing permissions |
| Core Workflow | LOST/FOUND -> matching -> claim -> verify -> appointment -> handover/warehouse | Direct auto-return based on AI | Safety issue |
| Architecture | React web, Node API, MySQL, Socket.IO, Cloudinary, Google Vision, Java extension | Fully production microservices | Boundary challenge |
| Database Overview | Main entities and relationships | Every column in detail | Too long, low value |
| Matching/OCR | Rule-based/hybrid matching with OCR/tag support | Custom trained AI model | False claim risk |
| Claim Verification | Evidence plus review confidence support, human decision required | System proves owner automatically | Legal/business risk |
| Warehouse/Handover | Tracks custody, handover points, policy retention/status | Fully automated campus logistics | Overclaim |
| Dashboard | Admin/Staff overview, reports, moderation, warehouse | Enterprise BI analytics | Overclaim |
| Demo Scenario | One clear happy path with prepared data | Random live exploration | Demo failure risk |
| Testing/QA | Build/type checks, smoke flow, QA audit, known gaps | Full coverage | Judge may ask test evidence |
| Limitation | Honest gaps: mobile, custom AI, production hardening | No limitation | Looks immature |
| Future Work | Mobile, custom AI after data, monitoring, e2e, load test | Everything will be done soon | Unrealistic |
| Conclusion | Campus MVP beyond CRUD with traceable item return workflow | Revolutionary AI platform | Inflated positioning |
