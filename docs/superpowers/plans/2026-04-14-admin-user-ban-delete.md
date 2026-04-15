# Admin User Ban/Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin ban/unban and permanent delete for users, where banned users can still log in but cannot perform write operations, and deleted users keep anonymized history.

**Architecture:** Extend the existing admin/security flow in Spring Boot with a `banned` flag on `User`, write-guard checks in user-action controllers, and admin endpoints for ban/unban/delete. Permanent delete is transactional and rewrites history references to a deterministic placeholder (`deleted-user-{id}`) before deleting the user. Frontend admin page adds status display and action buttons that call the new APIs and refresh data.

**Tech Stack:** Spring Boot 4, Spring Security, Spring Data JPA, MockMvc tests, React + Axios + Vite.

---

## File Structure

- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/User.java`
  - Add persisted `banned` flag and accessor methods.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
  - Add ban/unban/delete endpoints and safety checks.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
  - Block banned users from create/accept/complete.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
  - Block banned users from sending messages.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java`
  - Block banned users from profile updates.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java`
  - Return `banned` in user payload.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/TaskRepository.java`
  - Add bulk rewrite queries for author/assignee.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/MessageRepository.java`
  - Add bulk rewrite query for sender.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/BalanceRecordRepository.java`
  - Add bulk rewrite query for username.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
  - Include `banned` field in admin summary/detail responses.
- Modify: `campus-frontend/src/components/pages/AdminView.jsx`
  - Add status badge, ban/unban button, delete button and confirmation input.
- Modify: `campus-frontend/src/App.jsx`
  - Add handlers for ban/unban/delete API calls.
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`
  - Add admin ban/unban/delete and banned-write protection integration tests.
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/UserSelfServiceTests.java`
  - Add banned profile update rejection test.

### Task 1: Add `banned` field and expose in API payloads

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/User.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write failing test for `banned` in auth/admin payload**

```java
@Test
void authAndAdminPayloadContainBannedFlag() throws Exception {
    String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
    User user = createUser("user100", "User 100", UserRole.USER, new BigDecimal("1.00"));
    user.setBanned(true);
    userRepository.save(user);

    String userToken = jwtTokenService.generateToken(user);

    mockMvc.perform(get("/api/auth/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.user.banned").value(true));

    mockMvc.perform(get("/api/admin/users/{id}", user.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.banned").value(true));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn -Dtest=SecuredBusinessFlowTests#authAndAdminPayloadContainBannedFlag test`  
Expected: FAIL because `banned` field is missing in payload or entity accessors.

- [ ] **Step 3: Implement minimal backend changes**

```java
// User.java
@Column(nullable = false)
private boolean banned = false;

public boolean isBanned() {
    return banned;
}

public void setBanned(boolean banned) {
    this.banned = banned;
}
```

```java
// AuthController.buildUserData
data.put("banned", user.isBanned());
```

```java
// AdminController.buildUserSummary
data.put("banned", user.isBanned());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn -Dtest=SecuredBusinessFlowTests#authAndAdminPayloadContainBannedFlag test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/entity/User.java campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: add banned flag to user payloads"
```

### Task 2: Add admin ban/unban endpoints with safety checks

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write failing tests for ban/unban**

```java
@Test
void adminCanBanAndUnbanNormalUser() throws Exception {
    String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
    User user = createUser("user200", "User 200", UserRole.USER, new BigDecimal("1.00"));

    mockMvc.perform(post("/api/admin/users/{id}/ban", user.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.banned").value(true));

    mockMvc.perform(post("/api/admin/users/{id}/unban", user.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.banned").value(false));
}

@Test
void adminCannotBanAdminRoleUser() throws Exception {
    String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
    User anotherAdmin = createUser("admin002", "Admin 2", UserRole.ADMIN, new BigDecimal("1.00"));

    mockMvc.perform(post("/api/admin/users/{id}/ban", anotherAdmin.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isForbidden());
}
```

- [ ] **Step 2: Run tests to verify failures**

Run: `mvn -Dtest=SecuredBusinessFlowTests#adminCanBanAndUnbanNormalUser,SecuredBusinessFlowTests#adminCannotBanAdminRoleUser test`  
Expected: FAIL with 404 (missing endpoints).

- [ ] **Step 3: Implement minimal endpoints**

```java
@PostMapping("/users/{id}/ban")
@Transactional
public ResponseEntity<Map<String, Object>> banUser(@PathVariable Long id, Authentication authentication) {
    requireViewUsersActor(authentication);
    User target = userRepository.findById(id).orElse(null);
    if (target == null) return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
    if (target.getRole() == UserRole.ADMIN) return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不可封禁", null);
    target.setBanned(true);
    User saved = userRepository.save(target);
    return buildResponse(HttpStatus.OK, "账号已封禁", buildUserSummary(saved));
}

@PostMapping("/users/{id}/unban")
@Transactional
public ResponseEntity<Map<String, Object>> unbanUser(@PathVariable Long id, Authentication authentication) {
    requireViewUsersActor(authentication);
    User target = userRepository.findById(id).orElse(null);
    if (target == null) return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
    if (target.getRole() == UserRole.ADMIN) return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不可解封", null);
    target.setBanned(false);
    User saved = userRepository.save(target);
    return buildResponse(HttpStatus.OK, "账号已解封", buildUserSummary(saved));
}
```

- [ ] **Step 4: Run tests to verify passes**

Run: `mvn -Dtest=SecuredBusinessFlowTests#adminCanBanAndUnbanNormalUser,SecuredBusinessFlowTests#adminCannotBanAdminRoleUser test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: add admin ban and unban endpoints"
```

### Task 3: Enforce banned-user write restrictions

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/UserSelfServiceTests.java`

- [ ] **Step 1: Write failing tests for banned user write denial**

```java
@Test
void bannedUserCanLoginButCannotCreateTaskOrSendMessage() throws Exception {
    User bannedUser = createUser("banned001", "Banned", UserRole.USER, new BigDecimal("20.00"));
    bannedUser.setBanned(true);
    userRepository.save(bannedUser);
    String token = jwtTokenService.generateToken(bannedUser);

    mockMvc.perform(post("/api/tasks")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"title":"x","description":"y","reward":1.00}
                            """))
            .andExpect(status().isForbidden());

    Task task = createAcceptedTask("banned001", "banned001");

    mockMvc.perform(post("/api/messages")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"taskId": %d, "text":"hello"}
                            """.formatted(task.getId())))
            .andExpect(status().isForbidden());
}
```

```java
@Test
void bannedUserCannotUpdateProfile() throws Exception {
    User user = createUser("banned002", "Banned 2", UserRole.USER, new BigDecimal("1.00"));
    user.setBanned(true);
    userRepository.save(user);
    String token = jwtTokenService.generateToken(user);

    mockMvc.perform(put("/api/users/profile")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"name":"newName"}
                            """))
            .andExpect(status().isForbidden());
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `mvn -Dtest=SecuredBusinessFlowTests#bannedUserCanLoginButCannotCreateTaskOrSendMessage,UserSelfServiceTests#bannedUserCannotUpdateProfile test`  
Expected: FAIL (currently writes are allowed).

- [ ] **Step 3: Implement minimal guard**

```java
// in each controller
private ResponseEntity<Map<String, Object>> forbiddenIfBanned(User actor) {
    if (actor != null && actor.isBanned()) {
        return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁，暂不可执行该操作", null);
    }
    return null;
}
```

```java
// TaskController: createTask / acceptTask / completeTask
User actor = currentUserService.requireCurrentUser(authentication);
ResponseEntity<Map<String, Object>> banned = forbiddenIfBanned(actor);
if (banned != null) return banned;
```

```java
// MessageController: sendMessage
User actor = currentUserService.requireCurrentUser(authentication);
ResponseEntity<Map<String, Object>> banned = forbiddenIfBanned(actor);
if (banned != null) return banned;
```

```java
// UserController: updateProfile / updateProfileById
User actor = currentUserService.requireCurrentUser(authentication);
ResponseEntity<Map<String, Object>> banned = forbiddenIfBanned(actor);
if (banned != null) return banned;
```

- [ ] **Step 4: Run tests to verify pass**

Run: `mvn -Dtest=SecuredBusinessFlowTests#bannedUserCanLoginButCannotCreateTaskOrSendMessage,UserSelfServiceTests#bannedUserCannotUpdateProfile test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java campus-backend/src/test/java/com/example/campusbackend/security/UserSelfServiceTests.java
git commit -m "feat: block banned users from write operations"
```

### Task 4: Implement permanent delete with history anonymization

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/TaskRepository.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/MessageRepository.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/BalanceRecordRepository.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write failing delete tests**

```java
@Test
void deleteUserAnonymizesHistoryAndRemovesAccount() throws Exception {
    String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
    User target = createUser("user300", "User 300", UserRole.USER, new BigDecimal("3.00"));
    Task task = createAcceptedTask("user300", "user300");

    mockMvc.perform(delete("/api/admin/users/{id}", target.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
            .andExpect(status().isOk());

    assertThat(userRepository.findById(target.getId())).isEmpty();
    Task reloaded = taskRepository.findById(task.getId()).orElseThrow();
    assertThat(reloaded.getAuthorUsername()).isEqualTo("deleted-user-" + target.getId());
    assertThat(reloaded.getAuthor()).isEqualTo("已注销用户");
    assertThat(reloaded.getAssignee()).isEqualTo("deleted-user-" + target.getId());
}

@Test
void adminCannotDeleteSelf() throws Exception {
    User admin = createUser("adminSelf", "Admin Self", UserRole.ADMIN, new BigDecimal("1.00"));
    String token = jwtTokenService.generateToken(admin);

    mockMvc.perform(delete("/api/admin/users/{id}", admin.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isForbidden());
}
```

- [ ] **Step 2: Run tests to verify fail**

Run: `mvn -Dtest=SecuredBusinessFlowTests#deleteUserAnonymizesHistoryAndRemovesAccount,SecuredBusinessFlowTests#adminCannotDeleteSelf test`  
Expected: FAIL (endpoint/rewrite logic missing).

- [ ] **Step 3: Implement repository rewrite queries + delete endpoint**

```java
// TaskRepository.java
@Modifying
@Query("update Task t set t.authorUsername = :placeholder, t.author = :display where t.authorUsername = :username")
int anonymizeAuthor(@Param("username") String username, @Param("placeholder") String placeholder, @Param("display") String display);

@Modifying
@Query("update Task t set t.assignee = :placeholder where t.assignee = :username")
int anonymizeAssignee(@Param("username") String username, @Param("placeholder") String placeholder);
```

```java
// MessageRepository.java
@Modifying
@Query("update Message m set m.senderUsername = :placeholder where m.senderUsername = :username")
int anonymizeSender(@Param("username") String username, @Param("placeholder") String placeholder);
```

```java
// BalanceRecordRepository.java
@Modifying
@Query("update BalanceRecord b set b.username = :placeholder where b.username = :username")
int anonymizeUsername(@Param("username") String username, @Param("placeholder") String placeholder);
```

```java
// AdminController.java
@DeleteMapping("/users/{id}")
@Transactional
public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id, Authentication authentication) {
    User actor = requireViewUsersActor(authentication);
    User target = userRepository.findById(id).orElse(null);
    if (target == null) return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
    if (actor.getId().equals(target.getId())) return buildResponse(HttpStatus.FORBIDDEN, "不能删除当前登录账号", null);
    if (target.getRole() == UserRole.ADMIN) return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不可删除", null);

    String placeholder = "deleted-user-" + target.getId();
    taskRepository.anonymizeAuthor(target.getUsername(), placeholder, "已注销用户");
    taskRepository.anonymizeAssignee(target.getUsername(), placeholder);
    messageRepository.anonymizeSender(target.getUsername(), placeholder);
    balanceRecordRepository.anonymizeUsername(target.getUsername(), placeholder);
    userRepository.delete(target);
    return buildResponse(HttpStatus.OK, "账号已删除", Map.of("id", id, "placeholder", placeholder));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `mvn -Dtest=SecuredBusinessFlowTests#deleteUserAnonymizesHistoryAndRemovesAccount,SecuredBusinessFlowTests#adminCannotDeleteSelf test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/repository/TaskRepository.java campus-backend/src/main/java/com/example/campusbackend/repository/MessageRepository.java campus-backend/src/main/java/com/example/campusbackend/repository/BalanceRecordRepository.java campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: add admin permanent delete with history anonymization"
```

### Task 5: Implement frontend admin actions (ban/unban/delete)

**Files:**
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/pages/AdminView.jsx`
- Modify: `campus-frontend/src/utils/adminPermissions.js` (only if new labels needed)

- [ ] **Step 1: Add failing UI behavior checks (manual test script)**

```text
1) Admin selects a user in AdminView.
2) Click “封禁” -> expect success prompt and status changes to “已封禁”.
3) Click “解封” -> expect success prompt and status returns to “正常”.
4) Click “永久删除” -> prompt asks for exact username; wrong input blocks request.
5) Correct input deletes user, refreshes list, and clears selected panel.
```

- [ ] **Step 2: Run current app and confirm missing behavior**

Run: `npm run dev`  
Expected: No ban/unban/delete buttons in admin detail panel.

- [ ] **Step 3: Implement minimal frontend changes**

```jsx
// App.jsx - handlers
const handleAdminBanToggle = async (user) => {
  const endpoint = user.banned ? `/api/admin/users/${user.id}/unban` : `/api/admin/users/${user.id}/ban`;
  const response = await apiPost(endpoint);
  const nextUser = response.data?.data || null;
  setAdminSelectedUser(nextUser);
  setAdminMessage(user.banned ? '账号已解封。' : '账号已封禁。');
  await loadAdminUsers(adminKeyword);
};

const handleAdminDeleteUser = async (user) => {
  const expected = user.username;
  const typed = window.prompt(`请输入用户名 ${expected} 以确认永久删除：`) || '';
  if (typed !== expected) {
    setAdminError('用户名确认不一致，已取消删除。');
    return;
  }
  await apiDelete(`/api/admin/users/${user.id}`);
  setAdminSelectedUser(null);
  setAdminMessage('账号已永久删除。');
  await loadAdminUsers(adminKeyword);
};
```

```jsx
// AdminView.jsx - selected user action buttons
<button type="button" onClick={() => onToggleBan(adminSelectedUser)} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
  {adminSelectedUser.banned ? '解封账号' : '封禁账号'}
</button>
<button type="button" onClick={() => onDeleteUser(adminSelectedUser)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
  永久删除
</button>
```

- [ ] **Step 4: Run frontend build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/src/App.jsx campus-frontend/src/components/pages/AdminView.jsx
git commit -m "feat: add admin ban/unban and delete actions in UI"
```

### Task 6: Full verification and docs sync

**Files:**
- Modify: `docs/superpowers/specs/2026-04-14-admin-user-ban-delete-design.md` (if implementation drift appears)

- [ ] **Step 1: Run backend targeted suites**

Run: `mvn -Dtest=SecuredBusinessFlowTests,UserSelfServiceTests test`  
Expected: PASS.

- [ ] **Step 2: Run backend full tests**

Run: `mvn test`  
Expected: PASS.

- [ ] **Step 3: Run frontend verification**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Manual acceptance checklist**

```text
- admin001 can ban/unban normal user
- banned user can login
- banned user cannot publish/accept/complete/send-message/update-profile
- admin001 can delete user with username confirmation
- deleted user history shows as “已注销用户”
- cannot delete self
- cannot ban/delete ADMIN role accounts
```

- [ ] **Step 5: Commit verification/docs updates**

```bash
git add docs/superpowers/specs/2026-04-14-admin-user-ban-delete-design.md
git commit -m "docs: align ban/delete spec with implementation details"
```

## Self-Review

- Spec coverage: ban/unban endpoints, write restriction behavior, permanent delete anonymization, self/admin safety constraints, frontend admin controls, and acceptance checks are all mapped to tasks.
- Placeholder scan: no `TODO/TBD`; each task includes concrete files, code snippets, and commands.
- Type consistency: `banned` is boolean across entity/API/UI; delete placeholder format is consistent as `deleted-user-{id}`.
