# Display Name Over Username Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make normal user-facing pages identify people by nickname instead of username, while preserving username-backed auth, ownership, unread, and admin confirmation logic.

**Architecture:** Keep `username` as the stable persisted identifier and add display-only response fields on top of existing task and message payloads. On the backend, enrich `Task` and `Message` objects with transient nickname fields using a shared `UserDisplayNameService`. On the frontend, route all human-facing identity rendering through one small utility so fallback rules stay consistent and username-based logic does not regress.

**Tech Stack:** Spring Boot 4, Spring Data JPA, MockMvc integration tests, React 19, Axios, Vite.

---

## File Structure

- Create: `campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java`
  - Shared backend helper for resolving `username -> display name`.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
  - Add batch username lookup for enrichment.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Task.java`
  - Add transient `assigneeName` for JSON serialization only.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Message.java`
  - Add transient `senderName` for JSON serialization only.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
  - Enrich task list/create/accept/complete responses with display fields.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
  - Enrich message fetch/send responses with display fields.
- Test: `campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java`
  - Add task payload display-name tests.
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`
  - Add message payload display-name tests.
- Create: `campus-frontend/src/utils/displayNames.js`
  - Centralize UI fallback rules for nickname vs username.
- Modify: `campus-frontend/src/App.jsx`
  - Keep task ownership checks username-first, with legacy fallback only when `authorUsername` is absent.
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
  - Make the header identity label nickname-first.
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
  - Remove username-first wording from the welcome card.
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`
  - Keep username only as an explicitly labeled account field.
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
  - Show task counterpart nickname instead of username.
- Modify: `campus-frontend/src/hooks/useChat.js`
  - Build conversation titles from display names while keeping unread/self logic on usernames.

### Task 1: Add backend task display fields and the shared display-name resolver

**Files:**
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Task.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java`

- [ ] **Step 1: Write the failing task payload tests**

```java
@Test
void taskListShowsAssigneeDisplayNameWithoutChangingIdentityFields() throws Exception {
    User publisher = createUser("publisher010", "Publisher Display", new BigDecimal("10.00"));
    User runner = createUser("runner010", "Runner Display", new BigDecimal("8.00"));

    Task task = new Task();
    task.setTitle("Deliver Documents");
    task.setDescription("Deliver the documents to the library.");
    task.setReward(new BigDecimal("8.80"));
    task.setStatus("accepted");
    task.setAuthorUsername("publisher010");
    task.setAuthor("Publisher Display");
    task.setAssignee("runner010");
    taskRepository.save(task);

    String token = jwtTokenService.generateToken(publisher);

    mockMvc.perform(get("/api/tasks")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].authorUsername").value("publisher010"))
            .andExpect(jsonPath("$[0].author").value("Publisher Display"))
            .andExpect(jsonPath("$[0].assignee").value("runner010"))
            .andExpect(jsonPath("$[0].assigneeName").value("Runner Display"));
}

@Test
void taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing() throws Exception {
    User publisher = createUser("publisher011", "Publisher Display", new BigDecimal("10.00"));

    Task task = new Task();
    task.setTitle("Legacy Task");
    task.setDescription("Legacy assignee without user row.");
    task.setReward(new BigDecimal("5.00"));
    task.setStatus("accepted");
    task.setAuthorUsername("publisher011");
    task.setAuthor("Publisher Display");
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

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests#taskListShowsAssigneeDisplayNameWithoutChangingIdentityFields,TaskCompletionFlowTests#taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing test`  
Expected: FAIL because `assigneeName` does not exist in task responses.

- [ ] **Step 3: Write the minimal backend implementation**

```java
// UserRepository.java
import java.util.Collection;
import java.util.List;

List<User> findAllByUsernameIn(Collection<String> usernames);
```

```java
// UserDisplayNameService.java
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

@GetMapping
public List<Task> getAllTasks() {
    return enrichTasks(taskRepository.findAll());
}

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

```java
// in createTask / acceptTask / completeTask responses
data.put("task", enrichTask(savedTask));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests#taskListShowsAssigneeDisplayNameWithoutChangingIdentityFields,TaskCompletionFlowTests#taskListFallsBackToStoredAssigneeUsernameWhenUserRowIsMissing test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/service/UserDisplayNameService.java campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java campus-backend/src/main/java/com/example/campusbackend/entity/Task.java campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java campus-backend/src/test/java/com/example/campusbackend/TaskCompletionFlowTests.java
git commit -m "feat: expose assignee display names in task payloads"
```

### Task 2: Add backend message display fields

**Files:**
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/Message.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
- Test: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write the failing message payload tests**

```java
@Autowired
private MessageRepository messageRepository;

@Test
void sendAndFetchMessagesReturnSenderDisplayNameAlongsideUsername() throws Exception {
    User publisher = createUser("publisherMsg", "Publisher Display", UserRole.USER, new BigDecimal("20.00"));
    User runner = createUser("runnerMsg", "Sender Display", UserRole.USER, new BigDecimal("20.00"));
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
            .andExpect(jsonPath("$.data.senderName").value("Sender Display"));

    mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].senderName").value("Sender Display"));
}

@Test
void messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing() throws Exception {
    User publisher = createUser("publisherLegacy", "Publisher Display", UserRole.USER, new BigDecimal("20.00"));
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

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests#sendAndFetchMessagesReturnSenderDisplayNameAlongsideUsername,SecuredBusinessFlowTests#messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing test`  
Expected: FAIL because `senderName` does not exist in message responses.

- [ ] **Step 3: Write the minimal backend implementation**

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

@GetMapping("/{taskId}")
public ResponseEntity<Map<String, Object>> getMessages(@PathVariable Long taskId, Authentication authentication) {
    User actor = currentUserService.requireCurrentUser(authentication);
    Task task = taskRepository.findById(taskId).orElse(null);
    if (task == null) {
        return buildResponse(HttpStatus.NOT_FOUND, "Task not found", null);
    }
    if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
        return buildResponse(HttpStatus.FORBIDDEN, "Forbidden", null);
    }

    return buildResponse(HttpStatus.OK, "Success", enrichMessages(messageRepository.findByTaskIdOrderByIdAsc(taskId)));
}

@PostMapping
public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Message request, Authentication authentication) {
    // keep existing validation and authorization logic
    Message savedMessage = messageRepository.save(message);
    return buildResponse(HttpStatus.CREATED, "Message sent", enrichMessage(savedMessage));
}

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

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests#sendAndFetchMessagesReturnSenderDisplayNameAlongsideUsername,SecuredBusinessFlowTests#messageFetchFallsBackToStoredUsernameWhenSenderUserRowIsMissing test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/entity/Message.java campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: expose sender display names in message payloads"
```

### Task 3: Add the frontend display-name utility and update top-level identity surfaces

**Files:**
- Create: `campus-frontend/src/utils/displayNames.js`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/layout/AppHeader.jsx`
- Modify: `campus-frontend/src/components/pages/HomeView.jsx`
- Modify: `campus-frontend/src/components/pages/ProfileView.jsx`

- [ ] **Step 1: Write the failing manual verification script**

```text
1. Log in with an account whose nickname differs from username.
2. On the home page, confirm the welcome card still foregrounds username wording today.
3. In the sticky header, confirm the label is still account-oriented even though the value is nickname text.
4. In personal center, confirm the hero subtitle still prints raw username without an explicit "account" label.
5. Confirm task ownership actions still work before any UI refactor.
```

- [ ] **Step 2: Run the current frontend build to establish the baseline**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 3: Write the minimal frontend implementation**

```javascript
// campus-frontend/src/utils/displayNames.js
const normalizeValue = (value) => (typeof value === 'string' ? value.trim() : '');

export const getCurrentUserDisplayName = (user, fallback = 'User') => {
  const nickname = normalizeValue(user?.name);
  const username = normalizeValue(user?.studentId);
  return nickname || username || fallback;
};

export const getTaskPublisherDisplayName = (task, fallback = 'Anonymous user') => {
  const nickname = normalizeValue(task?.author);
  const username = normalizeValue(task?.authorUsername);
  return nickname || username || fallback;
};

export const getTaskAssigneeDisplayName = (task, fallback = 'Unknown user') => {
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

<span className="block text-xs font-bold tracking-[0.2em] text-slate-400">Current User</span>
<span className="block max-w-[8rem] truncate text-sm font-semibold text-slate-700 sm:max-w-[11rem] lg:max-w-[14rem]">
  {displayName}
</span>
```

```jsx
// HomeView.jsx
import { getCurrentUserDisplayName, getTaskPublisherDisplayName } from '../../utils/displayNames';

<h2 className="mt-1 text-2xl font-bold">{getCurrentUserDisplayName(currentUser)}</h2>
<p className="mt-2 text-sm text-slate-300">
  Completed: {currentUser.completedCount}
</p>
<span>Publisher: {getTaskPublisherDisplayName(task)}</span>
```

```jsx
// ProfileView.jsx
import { getCurrentUserDisplayName } from '../../utils/displayNames';

<h2 className="mt-2 text-2xl font-bold">{getCurrentUserDisplayName(currentUser, 'Unnamed user')}</h2>
<p className="mt-2 text-sm text-slate-300">
  Account: {currentUser.studentId || '-'} | {currentUser.email || '-'}
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

### Task 4: Update history and chat flows to consume the new display fields

**Files:**
- Modify: `campus-frontend/src/components/pages/HistoryView.jsx`
- Modify: `campus-frontend/src/hooks/useChat.js`

- [ ] **Step 1: Write the failing manual verification script**

```text
1. Use one account as publisher and another as assignee, with nickname different from username.
2. Open history and confirm the counterpart line still shows username today.
3. Open messages and confirm the conversation title still uses username for publisher or assignee.
4. Change the assignee nickname through profile and confirm the title should follow nickname after the fix.
5. Confirm unread badges and "is me" detection still behave correctly after the display change.
```

- [ ] **Step 2: Run the current frontend build to establish the baseline**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 3: Write the minimal frontend implementation**

```jsx
// HistoryView.jsx
import { getTaskAssigneeDisplayName, getTaskPublisherDisplayName } from '../../utils/displayNames';

const counterpartValue = isAuthor
  ? getTaskAssigneeDisplayName(task, 'Unknown user')
  : getTaskPublisherDisplayName(task, 'Unknown user');
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
    return 'Conversation';
  }

  const isAuthor = isTaskOwnedByCurrentUser(task);
  return isAuthor
    ? `Assignee ${getTaskAssigneeDisplayName(task)}`.trim()
    : `Publisher ${getTaskPublisherDisplayName(task)}`.trim();
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

### Task 5: Full verification

**Files:**
- Verify only: no new files expected

- [ ] **Step 1: Run targeted backend suites**

Run (in `campus-backend`): `.\mvnw.cmd -Dtest=TaskCompletionFlowTests,SecuredBusinessFlowTests test`  
Expected: PASS.

- [ ] **Step 2: Run the full backend suite**

Run (in `campus-backend`): `.\mvnw.cmd test`  
Expected: PASS.

- [ ] **Step 3: Run the frontend production build**

Run (in `campus-frontend`): `npm.cmd run build`  
Expected: PASS.

- [ ] **Step 4: Execute the manual acceptance checklist**

```text
- Home, history, and conversation titles show nicknames first.
- Task publisher display continues to use task.author, with username fallback only when the display field is blank.
- Task assignee display uses task.assigneeName, with username fallback when the user row is missing.
- Message responses include senderName and keep senderUsername for identity logic.
- Header and profile hero show nickname as the primary identity; username appears only as an explicit account field.
- Admin list/detail still expose nickname plus username, and delete confirmation still requires exact username.
- Ownership checks, unread checks, and self-message detection still work after the display-name switch.
```

- [ ] **Step 5: Check worktree state**

```bash
git status --short
```

Expected: only implementation files remain modified. If docs drift during implementation, add a docs-only commit before merge.

## Self-Review

- Spec coverage: task assignee display, message sender display, primary nickname rendering, username-backed logic retention, and admin safety boundaries are all mapped to explicit tasks.
- Placeholder scan: no `TODO`, `TBD`, or "same as above" shortcuts remain; each task includes concrete files, commands, and code snippets.
- Type consistency: backend response fields are `assigneeName` and `senderName`; frontend uses those exact names and keeps `authorUsername`, `assignee`, and `senderUsername` for logic.
