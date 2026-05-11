# Content Safety: Task Reporting & Admin Moderation

## Goal
Allow users to report inappropriate tasks, and admins to review reports and remove offending content.

## Entities

### Report (new)
- id (Long, auto)
- taskId (Long)
- reporterUsername (String)
- reason (String)
- status (String): `pending`, `resolved_removed`, `resolved_ignored`
- adminNote (String)
- reviewedBy (String)
- createdAt (LocalDateTime)
- reviewedAt (LocalDateTime)

### Task (modified)
- TaskStatus enum: add `removed` value

## API

### POST /api/reports
Auth: authenticated, non-banned
Body: `{ taskId, reason }`
Validates: cannot report own task, cannot duplicate report for same task+user
Response: 201

### POST /api/admin/reports/{id}/resolve
Auth: admin
Body: `{ action: "remove"|"ignore", note: "..." }`
- remove: sets task status to `removed`, report to `resolved_removed`
- ignore: sets report to `resolved_ignored`

### GET /api/tasks modification
Filter out tasks with status `removed` from the public list (unless the requester is the author or admin)

## Frontend

### HomeView
- Report button on each task card (non-author users only)
- Click opens prompt for reason
- One report per user per task
- Removed tasks hidden from task hall

### AdminView
- New "举报处理" section listing pending reports
- Each item shows: task title, reporter, reason, time
- Actions: 下架 (remove) / 忽略 (ignore), both require note

## Files
| File | Change |
|---|---|
| Report.java | New entity |
| ReportRepository.java | New repository |
| ReportController.java | New controller |
| AdminController.java | Add resolve report endpoint |
| TaskController.java | Filter removed from task list |
| TaskStatus.java | Add removed |
| HomeView.jsx | Report button |
| AdminView.jsx | Report handling section |
| App.jsx | Report state/handlers |
