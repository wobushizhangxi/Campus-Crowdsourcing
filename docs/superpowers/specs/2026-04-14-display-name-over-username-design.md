# Display Name Over Username Design

Date: 2026-04-14
Scope: Replace username-facing UI with nickname-facing UI for normal user flows, while keeping usernames as the internal account identifier.

## 1. Goals

- Show `name` (nickname) instead of `username` in normal user-facing pages.
- Keep `username` for login, permission checks, ownership checks, and destructive admin confirmations.
- Eliminate remaining places where task assignee or message sender are shown as usernames because the API does not provide nickname data.

## 2. Non-Goals

- No change to authentication credentials or login form behavior.
- No change to database identity semantics: `username` remains the stable account identifier.
- No migration of persisted task/message ownership fields from username to nickname.
- No redesign of admin safety flows such as delete confirmation by exact username.

## 3. Functional Requirements

### 3.1 Normal User-Facing Display

- Home, orders, history, task detail, message list, chat title, and chat message sender display must prefer nickname.
- If nickname is missing, the UI may fall back to username or an existing placeholder string.
- Personal center may still show username as an account field, but it must not be the primary identity label in the header or profile hero area.

### 3.2 Admin Display

- Admin list/detail should continue showing both nickname and username.
- Nickname should remain the primary visual label.
- Username must remain visible anywhere admins need precise account identification.

### 3.3 Identity Safety

- Ownership logic must continue to use username-backed fields, not nickname strings.
- Delete confirmation must continue requiring the exact username.
- Search behavior in admin tools can continue matching username and nickname.

## 4. Current Gaps

- `Task.author` already acts as the publisher display name, but `Task.assignee` still stores and returns username only.
- `Message.senderUsername` is the only sender identity returned by the message API.
- Frontend history and chat title rendering therefore expose usernames even though nickname data exists in `users`.

## 5. API Design

### 5.1 Tasks

Task payloads should expose both:

- identity fields for logic:
  - `authorUsername`
  - `assignee`
- display fields for UI:
  - `author` (existing publisher nickname/display name)
  - `assigneeName` (new assignee nickname/display name)

Rules:

- `author` continues to fall back to username when the publisher name is blank.
- `assigneeName` is resolved from the assignee user record when the assignee still exists.
- If the assignee user record does not exist, `assigneeName` falls back to the stored assignee username or existing anonymized placeholder.

### 5.2 Messages

Message payloads should expose both:

- `senderUsername` for identity and unread/self-message logic.
- `senderName` for UI display.

Rules:

- `senderName` is resolved from the sender user record when possible.
- If the sender no longer exists, `senderName` falls back to the stored sender username or existing anonymized placeholder.

### 5.3 Backward Compatibility

- Existing username fields remain in responses so current authorization and comparison logic does not break.
- Frontend can roll forward incrementally by preferring nickname fields and falling back to existing username fields.

## 6. Backend Design

### 6.1 Task Response Shaping

- Do not repurpose `Task.assignee` to store nickname.
- Add response shaping in the task list/create/accept/complete API paths so serialized task data includes `assigneeName`.
- `authorUsername` and `assignee` remain unchanged and continue storing usernames.

### 6.2 Message Response Shaping

- Do not change persisted `messages.senderUsername`.
- Add response shaping in message fetch/send APIs so serialized message data includes `senderName`.

### 6.3 Shared Display Name Resolution

- Add a small backend helper for `username -> display name`.
- Resolution policy:
  - use user `name` when present;
  - otherwise use `username`;
  - if the user row is gone, keep the stored username/anonymized placeholder.

This avoids duplicating lookup/fallback logic across task and message controllers.

## 7. Frontend Design

### 7.1 Rendering Rules

- Prefer `task.author` for publisher display.
- Prefer `task.assigneeName` for assignee display while keeping `task.assignee` for logic.
- Prefer `message.senderName` for sender display while keeping `message.senderUsername` for self/unread comparisons.
- Prefer `currentUser.name` in headers and hero cards; keep `currentUser.studentId` only where explicitly labeled as account/username.

### 7.2 Screens To Update

- `HomeView`
  - remove username from the welcome identity line or demote it to an account field only if still needed.
  - keep task publisher display on nickname.
- `OrdersView`
  - if any counterpart identity is shown on order cards, it must use nickname fields rather than usernames.
- `HistoryView`
  - replace counterpart username display with `task.assigneeName` or `task.author`.
- `MessagesView` and chat title generation
  - show counterpart nickname instead of username.
- `ChatOverlay`
  - message bubble ownership still uses `senderUsername === currentUser.studentId`.
  - visible sender labels, if any are added or already exist indirectly through titles, use nickname.
- `AppHeader` and `ProfileView`
  - primary identity remains nickname.
  - username stays available only as a labeled account field.
- `AdminView`
  - keep `nickname | username | role` style dual display where needed.

### 7.3 Fallback Strategy

- Never render blank identity text.
- Fallback order for display:
  - nickname/display field
  - username field
  - existing placeholder copy such as `未命名用户` or `已注销用户`

## 8. Testing Strategy

### 8.1 Backend

- Task API returns `assigneeName` when assignee exists.
- Task API falls back safely when assignee user record is missing.
- Message API returns `senderName` when sender exists.
- Message API falls back safely when sender user record is missing.
- Existing username fields still exist in payloads used by authorization logic.

### 8.2 Frontend

- History page shows counterpart nickname instead of username.
- Message list/chat title shows nickname instead of username.
- Home/header/profile still show nickname as primary identity.
- Admin delete confirmation still requires exact username input.

## 9. Risks And Mitigations

- Risk: changing logic checks from username to nickname by accident.
  - Mitigation: keep logic fields unchanged and only add display fields.
- Risk: old/anonymized records have no matching user row.
  - Mitigation: explicit fallback to stored username/placeholder when lookup fails.
- Risk: partial frontend adoption leaves some username leaks.
  - Mitigation: audit all identity render points and switch them to the new display fields in one pass.

## 10. Acceptance Criteria

1. Normal user pages no longer identify people primarily by username when a nickname exists.
2. Task assignees and message senders are shown by nickname in UI.
3. Username-based ownership, unread-state, and authorization logic still behave exactly as before.
4. Admin pages still expose usernames where precise account identification is required.
5. Permanent delete confirmation still requires the exact username and is unchanged.
