# Display Name Over Username Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ordinary user-facing pages identify people by nickname instead of username while preserving username-backed identity logic and admin safety flows.

**Architecture:** Keep `username` as the persisted identity field and add display-only fields to API payloads. On the backend, enrich `Task` and `Message` responses with transient nickname fields using a shared username-to-display-name resolver. On the frontend, centralize fallback rules in one utility and update page rendering to consume nickname fields while keeping ownership, unread, and delete-confirmation logic on usernames.

**Tech Stack:** Spring Boot 4, Spring Data JPA, MockMvc integration tests, React 19, Axios, Vite.

---

## File Structure

- Create: `campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java`
  - Shared backend helper that resolves `username -> display name` with safe fallback to username.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
  - Add batch lookup for usernames used by task/message enrichment.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Task.java`
  - Add transient `assigneeName` field for API serialization without changing persistence.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Message.java`
  - Add transient `senderName` field for API serialization without changing persistence.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
  - Enrich task list/create/accept/complete responses with display fields while leaving identity fields intact.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
  - Enrich message fetch/send responses with `senderName`.
- Test: `campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java`
  - Add task payload tests for `assigneeName` and fallback behavior.
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`
  - Add message payload tests for `senderName` and fallback behavior.
- Create: `campus-frontend/src/utils/displayNames.js`
  - Single place for frontend nickname fallback rules.
- Modify: `campus-frontend/src/App.jsx`
  - Tighten ownership fallback to prefer username-backed checks only.
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
  - Show nickname as the primary identity label.
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
  - Remove username-first wording from the welcome card.
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
  - Show task counterpart nickname instead of username.
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`
  - Keep username only as a labeled account field, not the hero identity.
- Modify: `campus-frontend/src/hooks/useChat.js`
  - Build conversation titles from nickname display fields and keep unread/self logic on usernames.

### Task 1: Add backend display-name resolver infrastructure

**Files:**
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Task.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Message.java`

- [ ] **Step 1: Add the failing test dependency points**

Update the types first so the next tasks can write tests against real response fields:

```java
// Task.java
import jakarta.persistence.Transient;

@Transient
private String assigneeName;

public String getAssigneeName() {
    return assigneeName;
}

public void setAssigneeName(String assigneeName) {
    this.assigneeName = assigneeName;
}
```

```java
// Message.java
import jakarta.persistence.Transient;

@Transient
private String senderName;

public String getSenderName() {
    return senderName;
}

public void setSenderName(String senderName) {
    this.senderName = senderName;
}
```

- [ ] **Step 2: Write the minimal shared resolver**

```java
package com.example.campusbackend.service;

import com.example.campusbackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;

@Service
public class UserDisplayNameService {

    private final UserRepository userRepository;

    public UserDisplayNameService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Map<String, String> resolveDisplayNames(Collection<String> usernames) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String username : usernames) {
            String value = normalize(username);
            if (value != null) {
                normalized.add(value);
            }
        }

        Map<String, String> displayNames = new LinkedHashMap<>();
        if (normalized.isEmpty()) {
            return displayNames;
        }

        userRepository.findAllByUsernameIn(normalized).forEach(user ->
                displayNames.put(user.getUsername(), defaultIfBlank(user.getName(), user.getUsername()))
        );
        return displayNames;
    }

    public String resolveDisplayName(String username, Map<String, String> displayNames) {
        String normalized = normalize(username);
        if (normalized == null) {
            return null;
        }

        return displayNames.getOrDefault(normalized, normalized);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultIfBlank(String value, String fallback) {
        String normalized = normalize(value);
        return normalized == null ? fallback : normalized;
    }
}
```

```java
// UserRepository.java
import java.util.Collection;
import java.util.List;

List<User> findAllByUsernameIn(Collection<String> usernames);
```

- [ ] **Step 3: Compile the backend to verify the new fields and service are wired correctly**

Run (in `campus-backend`): `.\mvnw.cmd -DskipTests=true test`  
Expected: PASS. The build should succeed with the new transient fields and repository method available for later tasks.

- [ ] **Step 4: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java campus-backend/src/main/java/com/example/campusbackend/entity/Task.java campus-backend/src/main/java/com/example/campusbackend/entity/Message.java
git commit -m "feat: add display name resolver infrastructure"
```

### Task 2: Enrich task payloads with `assigneeName`

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java`

- [ ] **Step 1: Write the failing task payload tests**

```java
@Test
void taskListShowsAssigneeNicknameWithoutChangingIdentityFields() throws Exception {
    User publisher = createUser("publisher010", "发布者昵称", new BigDecimal("10.00"));
    User runner = createUser("runner010", "接单昵称", new BigDecimal("8.00"));

    Task task = new Task();
    task.setTitle("Deliver Documents");
    task.setDescription("Deliver the documents to the library.");
    task.setReward(new BigDecimal("8.80"));
    task.setStatus("accepted");
    task.setAuthorUsername("publisher010");
    task.setAuthor("发布者昵称");
    task.setAssignee("runner010");
    taskRepository.save(task);

    String token = jwtTokenService.generateToken(publisher);

    mockMvc.perform(get("/api/tasks")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].authorUsername").value("publisher010"))
            .andExpect(jsonPath("$[0].author").value("发布者昵称"))
            .andExpect(jsonPath("$[0].assignee").value("runner010"))
            .andExpect(jsonPath("$[0].assigneeName").value("接单昵称"));
}

@Test
void taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing() throws Exception {
    User publisher = createUser("publisher011", "发布者昵称", new BigDecimal("10.00"));

    Task task = new Task();
    task.setTitle("Legacy Task");
    task.setDescription("Legacy assignee without user row.");
    task.setReward(new BigDecimal("5.00"));
    task.setStatus("accepted");
    task.setAuthorUsername("publisher011");
    task.setAuthor("发布者昵称");
    task.setAssignee("deleted-user-99");
    taskRepository.save(task);

    String token = jwtTokenService.generateToken(publisher);

    mockMvc.perform(get("/api/tasks")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].assignee").value("deleted-user-99"))
            .andExpect(jsonPath("$[0].assigneeName").value("deleted-user-99"));
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests#taskListShowsAssigneeNicknameWithoutChangingIdentityFields,TaskCompletionFlowTests#taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing test`  
Expected: FAIL because `assigneeName` is not being populated yet.

- [ ] **Step 3: Implement minimal task enrichment**

```java
// TaskController.java
private final UserDisplayNameService userDisplayNameService;

public TaskController(
        TaskRepository taskRepository,
        UserRepository userRepository,
        BalanceRecordRepository balanceRecordRepository,
        CurrentUserService currentUserService,
        TaskAuthorizationService taskAuthorizationService,
        UserDisplayNameService userDisplayNameService
) {
    this.taskRepository = taskRepository;
    this.userRepository = userRepository;
    this.balanceRecordRepository = balanceRecordRepository;
    this.currentUserService = currentUserService;
    this.taskAuthorizationService = taskAuthorizationService;
    this.userDisplayNameService = userDisplayNameService;
}
```

```java
@GetMapping
public List<Task> getAllTasks() {
    return enrichTasks(taskRepository.findAll());
}
```

```java
// in createTask / acceptTask / completeTask
data.put("task", enrichTask(savedTask));
```

```java
private List<Task> enrichTasks(List<Task> tasks) {
    Map<String, String> displayNames = userDisplayNameService.resolveDisplayNames(
            tasks.stream()
                    .flatMap(task -> java.util.stream.Stream.of(task.getAuthorUsername(), task.getAssignee()))
                    .toList()
    );

    tasks.forEach(task -> enrichTask(task, displayNames));
    return tasks;
}

private Task enrichTask(Task task) {
    Map<String, String> displayNames = userDisplayNameService.resolveDisplayNames(
            java.util.List.of(task.getAuthorUsername(), task.getAssignee())
    );
    return enrichTask(task, displayNames);
}

private Task enrichTask(Task task, Map<String, String> displayNames) {
    if (task == null) {
        return null;
    }

    if (normalizeValue(task.getAuthor()) == null) {
        task.setAuthor(userDisplayNameService.resolveDisplayName(task.getAuthorUsername(), displayNames));
    }
    task.setAssigneeName(userDisplayNameService.resolveDisplayName(task.getAssignee(), displayNames));
    return task;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests#taskListShowsAssigneeNicknameWithoutChangingIdentityFields,TaskCompletionFlowTests#taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java
git commit -m "feat: expose assignee display names in task payloads"
```

### Task 3: Enrich message payloads with `senderName`

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write the failing message payload tests**

```java
@Autowired
private MessageRepository messageRepository;

@Test
void sendAndFetchMessagesReturnSenderNicknameAlongsideUsername() throws Exception {
    User publisher = createUser("publisherMsg", "发布者昵称", UserRole.USER, new BigDecimal("20.00"));
    User runner = createUser("runnerMsg", "发送者昵称", UserRole.USER, new BigDecimal("20.00"));
    Task task = createAcceptedTask("publisherMsg", "runnerMsg");
    String runnerToken = jwtTokenService.generateToken(runner);

    mockMvc.perform(post("/api/messages")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "taskId": %d,
                              "text": "On my way"
                            }
                            """.formatted(task.getId())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.senderUsername").value("runnerMsg"))
            .andExpect(jsonPath("$.data.senderName").value("发送者昵称"));

    mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].senderName").value("发送者昵称"));
}

@Test
void messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing() throws Exception {
    User publisher = createUser("publisherLegacy", "发布者昵称", UserRole.USER, new BigDecimal("20.00"));
    Task task = createAcceptedTask("publisherLegacy", "publisherLegacy");

    Message message = new Message();
    message.setTaskId(task.getId());
    message.setSenderUsername("deleted-user-77");
    message.setText("Legacy message");
    messageRepository.save(message);

    String token = jwtTokenService.generateToken(publisher);

    mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].senderUsername").value("deleted-user-77"))
            .andExpect(jsonPath("$.data[0].senderName").value("deleted-user-77"));
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests#sendAndFetchMessagesReturnSenderNicknameAlongsideUsername,SecuredBusinessFlowTests#messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing test`  
Expected: FAIL because `senderName` is not being populated.

- [ ] **Step 3: Implement minimal message enrichment**

```java
// MessageController.java
private final UserDisplayNameService userDisplayNameService;

public MessageController(
        MessageRepository messageRepository,
        TaskRepository taskRepository,
        CurrentUserService currentUserService,
        TaskAuthorizationService taskAuthorizationService,
        UserDisplayNameService userDisplayNameService
) {
    this.messageRepository = messageRepository;
    this.taskRepository = taskRepository;
    this.currentUserService = currentUserService;
    this.taskAuthorizationService = taskAuthorizationService;
    this.userDisplayNameService = userDisplayNameService;
}
```

```java
@GetMapping("/{taskId}")
public ResponseEntity<Map<String, Object>> getMessages(@PathVariable Long taskId, Authentication authentication) {
    User actor = currentUserService.requireCurrentUser(authentication);
    Task task = taskRepository.findById(taskId).orElse(null);
    if (task == null) {
        return buildResponse(HttpStatus.NOT_FOUND, "浠诲姟涓嶅瓨鍦�", null);
    }
    if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
        return buildResponse(HttpStatus.FORBIDDEN, "鏃犳潈闄�", null);
    }

    List<Message> messages = messageRepository.findByTaskIdOrderByIdAsc(taskId);
    return buildResponse(HttpStatus.OK, "鎴愬姛", enrichMessages(messages));
}
```

```java
@PostMapping
public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Message request, Authentication authentication) {
    // existing validation unchanged
    Message savedMessage = messageRepository.save(message);
    return buildResponse(HttpStatus.CREATED, "娑堟伅鍙戦€佹垚鍔�", enrichMessage(savedMessage));
}
```

```java
private List<Message> enrichMessages(List<Message> messages) {
    Map<String, String> displayNames = userDisplayNameService.resolveDisplayNames(
            messages.stream().map(Message::getSenderUsername).toList()
    );
    messages.forEach(message -> enrichMessage(message, displayNames));
    return messages;
}

private Message enrichMessage(Message message) {
    Map<String, String> displayNames = userDisplayNameService.resolveDisplayNames(
            java.util.List.of(message.getSenderUsername())
    );
    return enrichMessage(message, displayNames);
}

private Message enrichMessage(Message message, Map<String, String> displayNames) {
    if (message == null) {
        return null;
    }
    message.setSenderName(userDisplayNameService.resolveDisplayName(message.getSenderUsername(), displayNames));
    return message;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests#sendAndFetchMessagesReturnSenderNicknameAlongsideUsername,SecuredBusinessFlowTests#messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: expose sender display names in message payloads"
```

### Task 4: Add a frontend display-name utility and update top-level identity surfaces

**Files:**
- Create: `campus-frontend/src/utils/displayNames.js`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`

- [ ] **Step 1: Write the failing UI verification script**

```text
1. Log in with an account whose nickname differs from username.
2. Open the home page and confirm the welcome card still includes a username-first identity line.
3. Open the sticky header and confirm the label still says “账号” while rendering nickname text.
4. Open personal center and confirm the hero subtitle shows raw username without an explicit account label.
5. Confirm task ownership actions still work after login; this behavior must not regress.
```

- [ ] **Step 2: Run the current frontend build and capture the baseline**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS. Build should succeed before any UI changes, confirming the next failures are behavioral, not compile-time.

- [ ] **Step 3: Implement the shared display-name utility and consume it**

```javascript
// campus-frontend/src/utils/displayNames.js
const normalizeValue = (value) => (typeof value === 'string' ? value.trim() : '');

export const getCurrentUserDisplayName = (user, fallback = '用户') => {
  const nickname = normalizeValue(user?.name);
  const username = normalizeValue(user?.studentId);
  return nickname || username || fallback;
};

export const getTaskPublisherDisplayName = (task, fallback = '匿名用户') => {
  const nickname = normalizeValue(task?.author);
  const username = normalizeValue(task?.authorUsername);
  return nickname || username || fallback;
};

export const getTaskAssigneeDisplayName = (task, fallback = '未知用户') => {
  const nickname = normalizeValue(task?.assigneeName);
  const username = normalizeValue(task?.assignee);
  return nickname || username || fallback;
};
```

```jsx
// App.jsx
const isTaskOwnedByCurrentUser = (task) =>
  task?.authorUsername === currentUser.studentId
  || (!task?.authorUsername && task?.author === currentUser.name);
```

```jsx
// AppHeader.jsx
import { getCurrentUserDisplayName } from '../../utils/displayNames';

const displayName = getCurrentUserDisplayName(currentUser);

<span className="block text-xs font-bold tracking-[0.2em] text-slate-400">当前用户</span>
<span className="block max-w-[8rem] truncate text-sm font-semibold text-slate-700 sm:max-w-[11rem] lg:max-w-[14rem]">
  {displayName}
</span>
```

```jsx
// HomeView.jsx
import { getCurrentUserDisplayName, getTaskPublisherDisplayName } from '../../utils/displayNames';

<h2 className="mt-1 text-2xl font-bold">{getCurrentUserDisplayName(currentUser)}</h2>
<p className="mt-2 text-sm text-slate-300">
  已完成：{currentUser.completedCount}
</p>
<span>发布者：{getTaskPublisherDisplayName(task)}</span>
```

```jsx
// ProfileView.jsx
import { getCurrentUserDisplayName } from '../../utils/displayNames';

<h2 className="mt-2 text-2xl font-bold">{getCurrentUserDisplayName(currentUser, '未命名用户')}</h2>
<p className="mt-2 text-sm text-slate-300">
  账号：{currentUser.studentId || '暂无账号'} | {currentUser.email || '暂无邮箱'}
</p>
```

- [ ] **Step 4: Run the frontend build to verify it passes**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/src/utils/displayNames.js campus-frontend/src/App.jsx campus-frontend/src/components/layout/AppHeader.jsx campus-frontend/src/components/pages/HomeView.jsx campus-frontend/src/components/pages/ProfileView.jsx
git commit -m "feat: use display names on primary identity surfaces"
```

### Task 5: Update history and chat flows to consume the new display fields

**Files:**
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
- Modify: `campus-frontend/src/hooks/useChat.js`

- [ ] **Step 1: Write the failing UI verification script**

```text
1. Use one account as publisher and another as assignee, each with nickname different from username.
2. Open 历史记录 and confirm the counterpart line still shows username today.
3. Open 消息中心 and confirm the conversation title still uses username for 发布者/接单人.
4. Open the same chat after changing the assignee nickname in the database or profile; the title should follow nickname after the fix.
5. Confirm unread badges and “is me” detection still behave correctly after the display change.
```

- [ ] **Step 2: Run the current frontend build to verify the baseline**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 3: Implement minimal rendering changes**

```jsx
// HistoryView.jsx
import { getTaskAssigneeDisplayName, getTaskPublisherDisplayName } from '../../utils/displayNames';

const counterpartValue = isAuthor
  ? getTaskAssigneeDisplayName(task, '未知用户')
  : getTaskPublisherDisplayName(task, '未知用户');
```

```javascript
// useChat.js
import {
  getCurrentUserDisplayName,
  getTaskAssigneeDisplayName,
  getTaskPublisherDisplayName,
} from '../utils/displayNames';

const getConversationTitle = useCallback((task) => {
  if (!task) {
    return '会话';
  }

  const isAuthor = isTaskOwnedByCurrentUser(task);
  return isAuthor
    ? `接单人 ${getTaskAssigneeDisplayName(task)}`.trim()
    : `发布者 ${getTaskPublisherDisplayName(task)}`.trim();
}, [isTaskOwnedByCurrentUser]);
```

```javascript
// useChat.js optimistic message
{
  id: tempId,
  senderUsername: currentUser.studentId,
  senderName: getCurrentUserDisplayName(currentUser),
  text,
  createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  pending: true,
}
```

- [ ] **Step 4: Run the frontend build to verify it passes**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/src/components/pages/HistoryView.jsx campus-frontend/src/hooks/useChat.js
git commit -m "feat: use display names in history and chat flows"
```

### Task 6: Full verification

**Files:**
- Verify only: no new files expected

- [ ] **Step 1: Run targeted backend suites**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests,SecuredBusinessFlowTests test`  
Expected: PASS.

- [ ] **Step 2: Run the full backend test suite**

Run (in `campus-backend`): `.\mvnw.cmd test`  
Expected: PASS.

- [ ] **Step 3: Run the frontend production build**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 4: Execute the manual acceptance checklist**

```text
- 普通用户首页、历史记录、消息会话标题优先显示昵称
- 发布者显示继续使用 task.author，不回退成用户名除非昵称缺失
- 接单人显示使用 task.assigneeName，用户不存在时回退为 task.assignee
- 消息接口返回 senderName，用户不存在时回退为 senderUsername
- 个人中心顶部以昵称为主，用户名只在明确的“账号”字段里出现
- 管理页仍然能看到 昵称 + 用户名，删除确认仍要求输入用户名
- 任务归属判断、会话未读判断、自己的消息判断没有因为昵称切换而出错
```

- [ ] **Step 5: Commit final verification notes if any docs changed**

```bash
git status --short
```

Expected: only implementation files remain modified. If any spec or plan drift must be documented, add and commit those docs before merging.

## Self-Review

- Spec coverage: backend task/message display fields, frontend nickname rendering, username-backed logic retention, admin dual-display safety, and fallback handling are all mapped to tasks.
- Placeholder scan: no `TODO`, `TBD`, or “similar to above” shortcuts remain; each task contains concrete files, commands, and code snippets.
- Type consistency: backend response fields are `assigneeName` and `senderName`; frontend uses those exact property names and keeps `authorUsername`, `assignee`, and `senderUsername` for logic.
