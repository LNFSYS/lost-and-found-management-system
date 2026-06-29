# QA Test Session Report — 2026-06-29

**Tester:** Senior QA Engineer (AI Agent)
**Date:** June 29, 2026
**Environment:** Local Development (Windows 11)
**Target URL (API):** http://localhost:3001
**Target URL (Web):** http://localhost:5173
**Database:** MySQL `fptu_lost_found` (localhost:3306)

---

## 1. Executive Summary

This test session focuses on verifying the backend business rules (via automated E2E script) and checking the responsiveness and structural layout of the web frontend (via Playwright automated visual checking).

A critical layout issue was identified and successfully resolved:
- **Status:** **100% PASS** after visual layout corrections.
- **E2E Core Flow:** **PASS** (100% API success on posting, matching, and claim validation).
- **Desktop Layout Check:** **PASS**.
- **Mobile Layout Check:** **PASS** (originally failed due to horizontal overflow, now resolved).

---

## 2. Test Execution & Verification

### 2.1 Database & Connectivity Check
- **Command Run:** `npm run check:db`
- **Result:** **SUCCESS**
- **Output:** Connected to MySQL `localhost:3306/fptu_lost_found`

### 2.2 E2E Core Business Flow Smoke Test
- **Command Run:** `$env:E2E_EMAIL="adminlnf@gmail.com"; $env:E2E_PASSWORD="Password123!"; npm run e2e:core`
- **Result:** **SUCCESS**
- **Output:**
  ```text
  Core smoke passed. LOST=6cc0e7c6-3730-4cac-ba44-7238f9fea756 FOUND=8c62fd89-9144-4b51-b41a-ef3f93d58cdf CLAIM=072cb3c2-9e93-4c15-ae6c-0afbcf8c6903
  ```
- **Business Logic Verified:**
  1. Login for both Admin and Student accounts is operational.
  2. A new `LOST` post can be created with necessary custom fields (`secretVerification`, `customLocation`).
  3. A new `FOUND` post can be created correctly.
  4. Automatic matching calculations are completed and successfully saved to the `match_results` table in the database.
  5. Claims can be submitted for FOUND posts by another user (verifying double-claim check and owner-self-claim prevention guard rules).
  6. Attempting to schedule an appointment for a non-accepted claim fails with `Conflict (409)` as expected.

### 2.3 Automated Visual & Layout Responsiveness Checks
- **Command Run:** `npm run visual-check` (inside `apps/web`)
- **First Run Result:** **FAILED**
  - *Error:* `Layout check failed for mobile`
  - *Details:* `{"shell":{"width":390,"height":5308.40625},"toolbar":{"width":458.046875,"height":59},"topbar":{"width":0,"height":0},"overflowX":true}`
  - *Diagnosis:* Two elements caused horizontal layout overflow (`overflowX = true`):
    1. The top header `.community-shell .sidebar` forced `.brand` (logo) and `.nav-list` (navigation links) into a single row, pushing `.guest-auth-actions` off-screen.
    2. The feed page `.feed-top-actions` (toolbar with filters, search bar, and item type buttons) exceeded the viewport width, causing layout breakage on mobile.

---

## 3. Bug Fixes & Code Improvements

The following layout and responsiveness issues were fixed in [styles.css](file:///f:/ky9/fptu-lost-found-system/apps/web/src/styles.css):

### 3.1 Resolving Mobile Header Layout Overflow
- **Issue:** The logo and nav links pushed auth buttons off-screen. Additionally, having navigation links in the header on mobile is redundant because the layout already features a dedicated `.mobile-bottom-nav`.
- **Fix:**
  - Hid the top navigation list `.community-shell .nav-list` on mobile viewports (`max-width: 820px`).
  - Hid the brand text label next to the brand logo block, leaving only the recognizable brand mark (`.brand > span:not(.brand-mark) { display: none; }`).
- **Result:** Header size was reduced, fitting all elements (logo and login buttons) neatly into the 390px viewport width.

### 3.2 Making Feed Filter Toolbar Responsive
- **Issue:** The search and category filter button row was too wide.
- **Fix:** Added media queries for `.feed-top-actions` under `(max-width: 620px)` to stack the search bar, filter button, and tabs vertically (`flex-direction: column`).
- **Result:** The elements wrap elegantly, and the three item type tabs ("Tất cả", "Đồ Nhặt Được", "Đồ Đánh Rơi") display in a neat grid.

---

## 4. Final Visual Regression Status
After applying the layout improvements, `npm run visual-check` was executed again:
- **Second Run Result:** **SUCCESS (PASS)**
  - *Output:*
    ```text
    desktop: app layout ok
    mobile: app layout ok
    ```
- **Screenshots Saved:**
  - Desktop View: `apps/web/test-results/app-desktop.png`
  - Mobile View: `apps/web/test-results/app-mobile.png`

---

## 5. Manual Matching Flow & Admin Dashboard Verification

Following the initial layout fixes, an end-to-end manual verification was conducted using a browser automation subagent:

### 5.1 Step-by-Step Test Sequence & Results

1. **Sign-In (User 1 - Finder):** Logged in to a student account (`vochieuquan@gmail.com`).
2. **Post FOUND Item:** Created a found item post:
   - **Title:** "Vi da ca sau mau nau"
   - **Description:** "Nhat duoc chiec vi da ca sau mau nau tai toa Alpha, ben trong co mot it tien va the sinh vien."
   - **Category:** "Túi ví & phụ kiện"
   - **Location:** "Khu vực: Tòa nhà Alpha, phòng A101"
   - **Status:** Post created successfully.
3. **Sign-In (User 2 - Loser):** Logged out and signed in with a different student account (`quanhan968@gmail.com`).
4. **Post LOST Item:** Created a highly matching lost item post:
   - **Title:** "Vi da ca sau mau nau"
   - **Description:** "Toi danh roi chiec vi da ca sau mau nau gan Alpha, ben trong co the sinh vien mang ten quanhan."
   - **Category:** "Túi ví & phụ kiện"
   - **Location:** "Khu vực: Tòa nhà Alpha, phòng A101"
   - **Secret Verification:** "Vi co logo ca sau o goc duoi ben phai"
   - **Status:** Post created successfully.
5. **Real-time Match Suggestion Dialog:**
   - **Observation:** Immediately upon post creation, the frontend rendered a **Matching Tự động** (Auto-Matching Suggestion) modal dialog.
   - **Details:** The modal correctly suggested the FOUND post as an **82% match** (Text: 81%, Category: 100%, Location: 100%).
   - **Action:** Clicking "Xem bài" correctly displayed the matched item details and allowed the user to claim it.
   - **Screenshot:** ![Matching Suggestion Modal](/C:/Users/ADMIN/.gemini/antigravity-ide/brain/2bc18cb3-b8bb-413e-83d8-212e280592db/matching_suggestion_modal_1782723195820.png)
6. **Sign-In (Admin):** Logged out and signed in as `adminlnf@gmail.com`.
7. **Admin Dashboard Views:**
   - Opened the Admin Dashboard.
   - Verified that total posts count (11 posts), processing status, and user count (7 users) were correctly aggregated in the metrics cards.
   - Navigated and verified rendering across all admin sub-tabs: Dashboard, Moderation, Categories, Areas, Handover Points, Inventory, Users, Reports.
   - **Screenshot:** ![Admin Dashboard Moderation](/C:/Users/ADMIN/.gemini/antigravity-ide/brain/2bc18cb3-b8bb-413e-83d8-212e280592db/admin_moderation_tab_1782723307278.png)

---

## 6. Next Steps & Recommendations

1. **Verify Backend Jobs:** Add tests for background worker jobs (e.g. overdue warehouse item automatic status transitions).
2. **Expand Seed Data:** Seed accounts with diverse student names and departments to test matching notification flows more realistically.
3. **Socket.IO Chat Verification:** Write automated test scripts for real-time WebSocket messaging and seen/unread status updates.
