# Admin User Ban And Delete Design

Date: 2026-04-14
Scope: Add admin features for banning/unbanning users and permanently deleting users while preserving historical task/message records.

## 1. Goals

- Allow `admin001` (and accounts with admin capabilities) to ban or unban normal users.
- Banned users can still log in, but cannot perform user-side write operations.
- Allow permanent user deletion with history retained and anonymized as "已注销用户".

## 2. Non-Goals

- No account recovery after permanent deletion.
- No full audit center redesign.
- No change to existing auth model (JWT flow remains).

## 3. Functional Requirements

### 3.1 Ban/Unban

- Add a user flag `banned` (boolean, default `false`).
- `banned=true` means:
  - login allowed;
  - read-only behavior for user-side features;
  - deny writes such as: publish/accept/complete task, send message, update profile.
- `banned=false` restores write capabilities immediately.

### 3.2 Permanent Delete

- Admin can permanently delete a normal user account.
- Before deleting the user row:
  - rewrite historical references to a deterministic placeholder username (for example `deleted-user-{id}`);
  - rewrite display name fields to `已注销用户` where applicable.
- Delete user row after reference rewrite in one transaction.

### 3.3 Safety Constraints

- Admin cannot delete own account.
- Admin cannot ban/unban/delete users whose role is `ADMIN`.
- Return clear error messages for forbidden operations.

## 4. API Design

Base: `/api/admin`

- `POST /users/{id}/ban`
  - Permission: admin panel access + user management permission.
  - Effect: set `banned=true`.

- `POST /users/{id}/unban`
  - Permission: same as ban.
  - Effect: set `banned=false`.

- `DELETE /users/{id}`
  - Permission: admin panel access + user management permission.
  - Effect: anonymize history references, then delete user row.

All endpoints follow existing response envelope:
- `code`
- `message`
- `data` (optional)

## 5. Data Model Changes

### 5.1 Users

- Add `banned` field to `users` table via JPA schema update:
  - type: boolean
  - default: false
  - exposed in admin user summary/detail payloads.

### 5.2 Historical Reference Rewrite On Delete

For target user:
- `tasks.authorUsername` -> placeholder if matches user.username
- `tasks.author` -> `已注销用户` for rewritten author records
- `tasks.assignee` -> placeholder if matches user.username
- `messages.senderUsername` -> placeholder if matches user.username
- `balance_records.username` -> placeholder if matches user.username

All rewrites and user deletion execute in one transaction.

## 6. Backend Behavior Enforcement

### 6.1 Ban Check For User-Side Writes

At write endpoints, guard current user with a shared check:
- `TaskController`: create/accept/complete
- `MessageController`: send message
- `UserController`: update profile

If banned: return `403` with message similar to `账号已被封禁，暂不可执行该操作`.

### 6.2 Admin Controller Additions

- Add ban/unban/delete handlers.
- Reuse existing permission gate patterns in `AdminController`.
- Reuse existing response style and error handling.

## 7. Frontend Design

### 7.1 AdminView

For selected user:
- show status chip: `正常` / `已封禁`.
- add button: `封禁` or `解封` depending on current status.
- add danger button: `永久删除`.

### 7.2 Confirmation UX

- Permanent delete requires confirmation input equal to target `username`.
- On success:
  - refresh admin user list;
  - clear selected user if deleted;
  - show success feedback.

### 7.3 Banned User UX

- User can log in.
- User-side write failures show backend message through existing error toast/alert path.

## 8. Testing Strategy

### 8.1 Backend

- Ban endpoint sets `banned=true`.
- Unban endpoint sets `banned=false`.
- Banned user can login but cannot call protected write endpoints.
- Delete endpoint rewrites references and deletes user row.
- Cannot ban/delete admin users; cannot delete self.

### 8.2 Frontend

- Admin can trigger ban/unban and sees status updates.
- Admin delete flow enforces username confirmation.
- Deleted user disappears from admin list after refresh.
- Banned user action attempts display proper error message.

## 9. Risks And Mitigations

- Risk: orphan/inconsistent references on delete.
  - Mitigation: single transaction for rewrite + delete.
- Risk: missed write endpoint.
  - Mitigation: central banned-check helper and targeted test coverage.
- Risk: accidental destructive admin action.
  - Mitigation: two-step confirmation requiring exact username.

## 10. Acceptance Criteria

1. `admin001` can ban and unban normal users.
2. Banned users can login but cannot publish/accept/complete tasks, send messages, or edit profile.
3. `admin001` can permanently delete a normal user after explicit confirmation.
4. Historical tasks/messages remain visible and mapped to `已注销用户`.
5. Admin self-delete and admin-target ban/delete are rejected with clear errors.
