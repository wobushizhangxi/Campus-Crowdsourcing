# Responsive Layout Design

Date: 2026-04-21
Scope: Rework the `campus-frontend` UI from a mobile-shell-first layout into a responsive web layout that remains usable on phones while adding tablet and desktop-appropriate navigation and page composition.

## 1. Goals

- Make the full frontend usable on phone, tablet, and desktop with reasonable information density and spacing.
- Keep the current mobile interaction model intact where it still works well.
- Replace the current desktop experience of "a widened phone shell" with a true web layout on larger screens.
- Unify normal pages and admin pages under one responsive application shell.
- Cover the full surface area in this pass: auth, home, orders, post task, messages, chat, profile, wallet, history, and admin.

## 2. Non-Goals

- No backend API changes.
- No changes to business rules, permission semantics, wallet logic, or task/message workflows.
- No conversion to a router-based architecture.
- No visual rebrand; the current visual language stays, but layout adapts by breakpoint.
- No introduction of a new test framework in this pass.

## 3. Current Problems

- The main authenticated app is constrained to `max-w-md`, which makes tablet and desktop look like a phone emulator rather than a web app.
- The bottom navigation is fixed to a mobile-width shell, so it feels misplaced on larger screens.
- Most pages stack cards in a single column even when a larger viewport could support side-by-side context.
- The admin page uses a separate outer shell, which creates inconsistent responsive behavior.
- The chat overlay is also constrained to a mobile width, so desktop conversation space is unnecessarily compressed.

## 4. Breakpoints And Navigation Model

### 4.1 Breakpoints

- Mobile: below Tailwind `md`
- Tablet: `md` through below `xl`
- Desktop: `xl` and above

These breakpoints match the design decisions already validated in discussion and align with the Tailwind defaults already used in the project.

### 4.2 Navigation Rules

- Mobile keeps the existing bottom navigation.
- Tablet and desktop hide the bottom navigation and show a left sidebar instead.
- The left sidebar contains the existing top-level destinations:
  - home
  - tasks
  - post
  - messages
  - profile
- The current page header remains in the content area and stays sticky.

### 4.3 App Shell Rules

- Replace the normal authenticated `max-w-md` shell with a responsive shell that can expand on larger screens.
- Use one shell for both normal pages and admin pages.
- Keep the current gradient/background treatment, but allow the container to grow to a wider desktop width.
- Reserve consistent space for:
  - sidebar on `md+`
  - sticky header inside the content pane
  - bottom navigation on mobile only

## 5. Functional Requirements

### 5.1 Mobile Behavior

- Mobile remains single-column for all main pages.
- Mobile keeps the existing bottom navigation and full-screen chat overlay behavior.
- Existing tap flows such as selecting a task, opening a chat, or opening wallet/history/admin continue to work without adding new complexity.

### 5.2 Tablet And Desktop Behavior

- Tablet and desktop switch to a sidebar-driven shell.
- Pages may use two-column or master-detail layouts where the content benefits from persistent context.
- Long lines, buttons, badges, and metadata rows must wrap rather than overflow horizontally.
- Floating or overlay UI should scale to larger widths when shown on larger screens.

### 5.3 Consistency Rules

- Admin uses the same shell, spacing, header, and background model as the rest of the app.
- Shared layout patterns should be reused rather than implemented separately in each page.
- Layout changes must not alter business actions such as accept task, complete task, send message, adjust balance, or delete user.

## 6. Page Layout Design

### 6.1 Auth Screen

- Keep the current two-panel concept on larger screens.
- Small screens stack branding and form vertically.
- Tablet/desktop keep a two-column split, but form width and panel spacing should be tuned so the form does not feel narrow inside a wide card.

### 6.2 Home

- Mobile:
  - welcome card
  - stats cards
  - task list
  - task detail as a dedicated in-page state, as it works today
- Tablet/Desktop:
  - summary content stays at the top
  - open task list becomes the primary column
  - selected task details stay visible in a secondary column instead of replacing the list view
- The selected-task detail panel should have an explicit empty state when nothing is selected.

### 6.3 Orders

- Mobile keeps the current single-column segmented layout.
- Tablet/Desktop use a primary list column plus a secondary context column.
- The secondary area shows selected task details when an order is actively selected.
- When no order is selected, the secondary area shows an empty or summary state rather than remaining blank.
- Task action buttons must still be easy to reach and must wrap safely on narrower widths.

### 6.4 Post Task

- Mobile remains a single-column form.
- Tablet/Desktop use a two-column form page:
  - left: task form
  - right: wallet balance, posting rules, and guidance
- This reduces wasted whitespace and keeps balance context visible while filling the form.

### 6.5 Messages

- Mobile keeps the current conversation list leading into the chat overlay.
- Tablet/Desktop turn `MessagesView` into a conversation workspace:
  - left: conversation list
  - right: conversation preview / active conversation panel
- The right side shows a placeholder empty state until a conversation is selected.

### 6.6 Chat

- Extract the reusable conversation content into a shared chat panel component or equivalent internal structure.
- Mobile continues using `ChatOverlay` as the main conversation surface.
- Tablet/Desktop keep chat overlays available for cross-page entry points, but the overlay becomes a wider centered panel rather than a `max-w-md` mobile sheet.
- Inline conversation rendering in the desktop messages page must reuse the same message list and composer behavior rather than duplicating message UI logic.

### 6.7 Profile

- Mobile remains stacked.
- Tablet/Desktop split into:
  - left: profile hero and quick actions
  - right: profile details or edit form
- In edit mode, form fields should move into a multi-column layout where space allows.

### 6.8 Wallet

- Mobile remains stacked.
- Tablet/Desktop split into:
  - left: balance records list
  - right: balance summary and explanatory cards
- Record metadata rows must wrap gracefully.

### 6.9 History

- Mobile remains stacked.
- Tablet/Desktop split into:
  - left: completed task history list
  - right: aggregate stats and supporting context

### 6.10 Admin

- Admin no longer uses a separate top-level shell branch.
- Admin stays within the shared authenticated shell and uses a wider content mode.
- The existing user-list plus detail-pane pattern stays, but responsive spacing and internal scrolling are refined for tablet and desktop.
- Desktop may continue to use nested split layouts where useful, but only inside the shared app shell.

## 7. Implementation Design

### 7.1 Shell-Level Changes

- `App.jsx` becomes the source of truth for breakpoint-aware shell behavior.
- Introduce a desktop/tablet sidebar component for `md+`.
- Keep `BottomNav` as a mobile-only component.
- Keep `AppHeader` in the content pane, but allow its action area and text to wrap appropriately.
- Replace the admin-only outer branch with a shared shell that supports normal-width and wide-width content modes.

### 7.2 Shared Layout Utilities

- Add a small set of reusable responsive wrappers rather than repeating ad hoc width classes across pages.
- Examples of reusable concepts:
  - page container width variants
  - split layout wrapper
  - secondary panel / empty state container

Exact helper names are an implementation detail, but the goal is to avoid re-encoding the same breakpoint logic in every page component.

### 7.3 Chat Refactor Boundary

- Do not rewrite `useChat`.
- Reuse the existing chat data, sending, unread, and scroll coordination logic.
- Extract only the rendering layer needed to support:
  - mobile overlay chat
  - desktop inline chat panel in messages
  - wider desktop overlay for cross-page chat entry

### 7.4 Verification Script Update

- The current `scripts/verify-layout-shell.mjs` encodes the old mobile-shell assumption.
- Update it so the failing checks describe the new target behavior before implementation.
- After implementation, keep it as a small regression check for the new shell rules.

## 8. Testing Strategy

### 8.1 Automated Checks

- `node scripts/verify-layout-shell.mjs`
- `npm run lint`
- `npm run build`

### 8.2 Manual Responsive Checks

Verify at least these viewport widths:

- 375px
- 768px
- 1024px
- 1440px

Verify these surfaces:

- auth
- home
- orders
- post task
- messages
- chat overlay
- profile
- wallet
- history
- admin

### 8.3 Specific Behaviors To Verify

- Mobile still shows the bottom navigation and does not show the sidebar.
- Tablet/Desktop show the sidebar and hide the bottom navigation.
- Home, messages, profile, wallet, history, and admin use multi-column layouts where designed.
- No key action button becomes unreachable due to wrapping, overflow, or nested scroll traps.
- Chat remains usable both from the messages page and from cross-page entry points.

## 9. Risks And Mitigations

- Risk: state handling for desktop messages becomes tangled with the overlay chat flow.
  - Mitigation: keep chat state in existing hooks and refactor only the rendering surface.
- Risk: admin regressions caused by removing its separate shell branch.
  - Mitigation: preserve admin page internals and change only the outer shell first.
- Risk: larger layouts create horizontal overflow in text-heavy cards.
  - Mitigation: explicitly design rows, badges, and action groups to wrap.
- Risk: multiple independently scrolling panes reduce usability.
  - Mitigation: limit internal scrolling to places that truly need it, such as long admin lists or chat message areas.

## 10. Acceptance Criteria

1. The authenticated app is no longer constrained to a mobile-width shell on tablet and desktop.
2. Mobile retains bottom navigation; tablet and desktop use a left sidebar instead.
3. Home, orders, post task, messages, profile, wallet, history, and admin all present reasonable layouts on phone, tablet, and desktop.
4. Messages supports a desktop-style list plus conversation workspace.
5. Chat overlays are wider and more appropriate on larger screens.
6. Admin uses the same responsive shell as the rest of the application.
7. The responsive change does not alter business logic or API behavior.
