# Admin Delete Task Design

**Goal:** Allow admins to delete any task/post from the home page task list, with cascade cleanup of related data.

## Backend

### `DELETE /api/admin/tasks/{id}` in AdminController

- Auth: `requireAdminAccessActor(authentication)`
- Transactional: yes
- Logic:
  1. Look up task by id → 404 if not found
  2. Delete all TaskReview rows where taskId matches
  3. Delete all Message rows where taskId matches
  4. Clear relatedTaskId on BalanceRecord rows (set null, keep the record)
  5. Delete the task itself
- Response: `{ code: 200, message: "帖子已删除" }`

### New Repository Methods

- `TaskReviewRepository.deleteByTaskId(Long taskId)` — Modifying query
- `MessageRepository.deleteByTaskId(Long taskId)` — Modifying query
- `BalanceRecordRepository.clearRelatedTaskId(Long taskId)` — Modifying query, sets relatedTaskId to null

## Frontend

### App.jsx

- New `handleAdminDeleteTask(taskId)` handler:
  - `window.confirm("确定永久删除该帖子吗？")` 
  - `apiDelete(/api/admin/tasks/${taskId})`
  - Refresh tasks list on success

### HomeView.jsx

- New props: `currentUser`, `onAdminDeleteTask`
- When `currentUser?.role === 'ADMIN'`, render delete button (red, trash/delete icon) on each task card
- Delete button calls `onAdminDeleteTask(task.id)`

## Files Changed

| File | Change |
|---|---|
| `AdminController.java` | Add `deleteTask` endpoint |
| `TaskReviewRepository.java` | Add `deleteByTaskId` |
| `MessageRepository.java` | Add `deleteByTaskId` |
| `BalanceRecordRepository.java` | Add `clearRelatedTaskId` |
| `App.jsx` | Add `handleAdminDeleteTask`, pass to HomeView |
| `HomeView.jsx` | Accept new props, render admin delete button |
