# Marketplace Core Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build方案 B: task lifecycle, review/credit, and campus verification for the existing campus marketplace.

**Architecture:** Keep the existing Spring Boot + React single app. Move task lifecycle and wallet settlement out of controller code into focused services, add small JPA entities/repositories for reviews, and extend user verification fields directly on `User`. Frontend stays in the current single-app state model and updates existing pages instead of introducing routing.

**Tech Stack:** Spring Boot, Spring MVC, Spring Security JWT, Spring Data JPA, MySQL/H2 tests, React 19, Vite, Tailwind CSS, Axios.

---

## File Map

- Modify `campus-backend/src/main/java/com/example/campusbackend/entity/Task.java`: add lifecycle, location, submission, cancellation, dispute fields.
- Create `campus-backend/src/main/java/com/example/campusbackend/entity/TaskStatus.java`: canonical task status values with legacy string mapping.
- Create `campus-backend/src/main/java/com/example/campusbackend/entity/TaskReview.java`: persisted task review.
- Create `campus-backend/src/main/java/com/example/campusbackend/entity/ReviewerRole.java`: publisher/assignee review role.
- Create `campus-backend/src/main/java/com/example/campusbackend/entity/VerificationStatus.java`: user campus verification state.
- Modify `campus-backend/src/main/java/com/example/campusbackend/entity/User.java`: add verification fields.
- Modify `campus-backend/src/main/java/com/example/campusbackend/repository/TaskRepository.java`: add status/dispute queries and review summary helpers.
- Create `campus-backend/src/main/java/com/example/campusbackend/repository/TaskReviewRepository.java`: review lookup and aggregation.
- Create `campus-backend/src/main/java/com/example/campusbackend/dto/TaskActionRequest.java`: note/reason payload for submit/reject/cancel/dispute/resolve.
- Create `campus-backend/src/main/java/com/example/campusbackend/dto/TaskReviewRequest.java`: review payload.
- Create `campus-backend/src/main/java/com/example/campusbackend/dto/VerificationRequest.java`: campus verification payload.
- Create `campus-backend/src/main/java/com/example/campusbackend/service/TaskLifecycleService.java`: state transitions and wallet settlement.
- Create `campus-backend/src/main/java/com/example/campusbackend/service/UserSummaryService.java`: shared user payload including ratings and verification.
- Modify `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`: delegate transitions and expose review APIs.
- Modify `campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java`: use summary service and add verification/review APIs.
- Modify `campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java`: use summary service.
- Modify `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`: add verification review and dispute resolution APIs.
- Test `campus-backend/src/test/java/com/example/campusbackend/MarketplaceCoreUpgradeTests.java`: lifecycle, settlement, reviews, verification.
- Modify `campus-frontend/src/App.jsx`: wire new actions and admin data.
- Modify `campus-frontend/src/components/pages/HomeView.jsx`: show new task metadata and publisher trust signals.
- Modify `campus-frontend/src/components/pages/PostTaskView.jsx`: collect category/campus/location/deadline.
- Modify `campus-frontend/src/components/pages/OrdersView.jsx`: show lifecycle actions and review forms.
- Modify `campus-frontend/src/components/pages/ProfileView.jsx`: show trust summary and verification form.
- Modify `campus-frontend/src/components/pages/AdminView.jsx`: add verification and dispute sections.
- Modify `campus-frontend/src/utils/formatters.js`: task status and verification formatting helpers.
- Modify `campus-frontend/src/utils/user.js`: map backend trust/verification fields.

## Task 1: Backend Lifecycle Tests

**Files:**
- Create: `campus-backend/src/test/java/com/example/campusbackend/MarketplaceCoreUpgradeTests.java`

- [ ] **Step 1: Write failing lifecycle tests**

Create tests for:

```java
@Test
void acceptedTaskMustBeSubmittedBeforePublisherApproval() throws Exception {
    // publisher, runner, accepted task
    // POST /api/tasks/{id}/complete should no longer be the primary path; new flow is submit then approve.
    // POST /api/tasks/{id}/submit by runner returns submitted.
    // POST /api/tasks/{id}/approve by publisher returns completed and runner balance increases once.
}

@Test
void openTaskCancelRefundsPublisher() throws Exception {
    // publisher with task already pre-deducted
    // POST /api/tasks/{id}/cancel by publisher returns cancelled and refund record exists.
}

@Test
void disputedTaskCanBeResolvedByAdminToRefundOrComplete() throws Exception {
    // accepted task -> dispute -> admin resolve refund -> cancelled, publisher refunded
    // accepted task -> dispute -> admin resolve complete -> completed, runner paid
}
```

- [ ] **Step 2: Verify tests fail**

Run: `cd campus-backend; .\mvnw.cmd -Dtest=MarketplaceCoreUpgradeTests test`

Expected: compilation or 404 failures because new endpoints and fields do not exist yet.

## Task 2: Backend Task Status And Lifecycle

**Files:**
- Create: `TaskStatus.java`, `TaskActionRequest.java`, `TaskLifecycleService.java`
- Modify: `Task.java`, `TaskRepository.java`, `TaskController.java`, `AdminController.java`

- [ ] **Step 1: Add canonical status model**

Create `TaskStatus` with `OPEN`, `ACCEPTED`, `SUBMITTED`, `COMPLETED`, `CANCELLED`, `DISPUTED`, plus `fromStoredValue(String)` and `storedValue()` methods returning lowercase API-compatible values.

- [ ] **Step 2: Extend task fields**

Add category, campus, location, deadline/submission/cancel/dispute/resolve timestamps and notes to `Task`.

- [ ] **Step 3: Implement lifecycle service**

Implement transactional methods:

```java
Task submit(Long id, User actor, String note)
Task approve(Long id, User actor)
Task reject(Long id, User actor, String reason)
Task cancel(Long id, User actor, String reason)
Task dispute(Long id, User actor, String reason)
Task resolve(Long id, User actor, String resolution, String note)
```

Use single settlement helpers for refund and payout to prevent duplicate settlement.

- [ ] **Step 4: Wire endpoints**

Add:

```text
POST /api/tasks/{id}/submit
POST /api/tasks/{id}/approve
POST /api/tasks/{id}/reject
POST /api/tasks/{id}/cancel
POST /api/tasks/{id}/dispute
POST /api/admin/tasks/{id}/resolve
```

- [ ] **Step 5: Verify lifecycle tests pass**

Run: `cd campus-backend; .\mvnw.cmd -Dtest=MarketplaceCoreUpgradeTests test`

Expected: lifecycle tests pass.

## Task 3: Backend Reviews

**Files:**
- Create: `TaskReview.java`, `ReviewerRole.java`, `TaskReviewRepository.java`, `TaskReviewRequest.java`
- Modify: `TaskController.java`, `UserController.java`, `UserSummaryService.java`
- Test: `MarketplaceCoreUpgradeTests.java`

- [ ] **Step 1: Write failing review tests**

Add tests:

```java
@Test
void completedTaskCanBeReviewedOnceByEachSide() throws Exception {
    // completed task
    // publisher reviews runner
    // duplicate publisher review returns 409
    // runner reviews publisher
    // user summary exposes averageRating and reviewCount
}
```

- [ ] **Step 2: Verify review test fails**

Run: `cd campus-backend; .\mvnw.cmd -Dtest=MarketplaceCoreUpgradeTests test`

Expected: missing review APIs.

- [ ] **Step 3: Implement review entity and repository**

Persist one review per `(taskId, reviewerUsername, reviewerRole)`.

- [ ] **Step 4: Add review APIs**

Add:

```text
GET /api/tasks/{id}/reviews
POST /api/tasks/{id}/reviews
GET /api/users/{username}/reviews
```

- [ ] **Step 5: Add trust fields to summaries**

Return `averageRating`, `reviewCount`, `completedAsPublisherCount`, `completedAsAssigneeCount`, and `verificationStatus`.

- [ ] **Step 6: Verify review tests pass**

Run: `cd campus-backend; .\mvnw.cmd -Dtest=MarketplaceCoreUpgradeTests test`

Expected: review tests pass.

## Task 4: Backend Verification

**Files:**
- Create: `VerificationStatus.java`, `VerificationRequest.java`
- Modify: `User.java`, `UserController.java`, `AdminController.java`, `UserSummaryService.java`
- Test: `MarketplaceCoreUpgradeTests.java`

- [ ] **Step 1: Write failing verification tests**

Add tests:

```java
@Test
void userCanSubmitVerificationAndAdminCanApproveOrReject() throws Exception {
    // user submits campus/student id/note -> PENDING
    // admin lists pending applications
    // admin approves -> VERIFIED
    // rejected path stores review note
}
```

- [ ] **Step 2: Verify verification test fails**

Run: `cd campus-backend; .\mvnw.cmd -Dtest=MarketplaceCoreUpgradeTests test`

Expected: missing verification APIs.

- [ ] **Step 3: Add user verification fields and APIs**

Add:

```text
GET /api/users/verification/me
POST /api/users/verification/me
GET /api/admin/verifications
POST /api/admin/verifications/{userId}/approve
POST /api/admin/verifications/{userId}/reject
```

- [ ] **Step 4: Verify backend test suite**

Run: `cd campus-backend; .\mvnw.cmd test`

Expected: all backend tests pass.

## Task 5: Frontend Integration

**Files:**
- Modify: `campus-frontend/src/App.jsx`
- Modify: `HomeView.jsx`, `PostTaskView.jsx`, `OrdersView.jsx`, `ProfileView.jsx`, `AdminView.jsx`
- Modify: `campus-frontend/src/utils/formatters.js`, `campus-frontend/src/utils/user.js`

- [ ] **Step 1: Add frontend formatting helpers**

Add task status labels, verification badges, rating formatting, and category defaults.

- [ ] **Step 2: Update post task form**

Collect category, campus, location, deadline and submit them with existing title/description/reward.

- [ ] **Step 3: Update task cards**

Display status, category, campus, location, deadline, rating, and verification status where available.

- [ ] **Step 4: Update orders actions**

Add buttons/forms for submit, approve, reject, cancel, dispute, and review based on actor role and status.

- [ ] **Step 5: Update profile**

Show rating/review counts, verification status, and verification submission form.

- [ ] **Step 6: Update admin**

Show pending verifications and disputed tasks, with approve/reject/resolve actions.

- [ ] **Step 7: Verify frontend**

Run:

```powershell
cd campus-frontend
npm run lint
npm run build
```

Expected: both commands pass.

## Task 6: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run backend tests**

Run: `cd campus-backend; .\mvnw.cmd test`

Expected: all tests pass.

- [ ] **Step 2: Run frontend checks**

Run: `cd campus-frontend; npm run lint; npm run build`

Expected: lint and build pass.

- [ ] **Step 3: Check working tree**

Run: `git status --short`

Expected: only intentional source, test, and docs changes plus pre-existing untracked logs remain.

