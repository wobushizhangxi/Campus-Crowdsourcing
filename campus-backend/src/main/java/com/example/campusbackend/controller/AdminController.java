package com.example.campusbackend.controller;

import com.example.campusbackend.dto.BalanceAdjustmentRequest;
import com.example.campusbackend.dto.PermissionUpdateRequest;
import com.example.campusbackend.dto.TaskActionRequest;
import com.example.campusbackend.dto.VerificationRequest;
import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.entity.VerificationStatus;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.MessageRepository;
import com.example.campusbackend.repository.TaskReviewRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.AdminPermissionService;
import com.example.campusbackend.service.CurrentUserService;
import com.example.campusbackend.service.TaskLifecycleService;
import com.example.campusbackend.service.UserDeletionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final BalanceRecordRepository balanceRecordRepository;
    private final TaskRepository taskRepository;
    private final TaskReviewRepository taskReviewRepository;
    private final MessageRepository messageRepository;
    private final CurrentUserService currentUserService;
    private final AdminPermissionService adminPermissionService;
    private final TaskLifecycleService taskLifecycleService;
    private final UserDeletionService userDeletionService;

    public AdminController(
            UserRepository userRepository,
            BalanceRecordRepository balanceRecordRepository,
            TaskRepository taskRepository,
            TaskReviewRepository taskReviewRepository,
            MessageRepository messageRepository,
            CurrentUserService currentUserService,
            AdminPermissionService adminPermissionService,
            TaskLifecycleService taskLifecycleService,
            UserDeletionService userDeletionService
    ) {
        this.userRepository = userRepository;
        this.balanceRecordRepository = balanceRecordRepository;
        this.taskRepository = taskRepository;
        this.taskReviewRepository = taskReviewRepository;
        this.messageRepository = messageRepository;
        this.currentUserService = currentUserService;
        this.adminPermissionService = adminPermissionService;
        this.taskLifecycleService = taskLifecycleService;
        this.userDeletionService = userDeletionService;
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(defaultValue = "") String keyword,
            Authentication authentication
    ) {
        requireViewUsersActor(authentication);
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .filter(user -> normalizedKeyword.isEmpty()
                        || user.getUsername().toLowerCase().contains(normalizedKeyword)
                        || (user.getName() != null && user.getName().toLowerCase().contains(normalizedKeyword)))
                .sorted(Comparator.comparing(User::getUsername))
                .map(this::buildUserSummary)
                .toList();
        return buildResponse(HttpStatus.OK, "成功", users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable Long id, Authentication authentication) {
        requireViewUsersActor(authentication);
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }

        Map<String, Object> data = buildUserSummary(user);
        data.put("records", buildBalanceRecordsData(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc(user.getUsername())));
        return buildResponse(HttpStatus.OK, "成功", data);
    }

    @PostMapping("/users/{id}/balance-adjustments")
    @Transactional
    public ResponseEntity<Map<String, Object>> adjustBalance(
            @PathVariable Long id,
            @RequestBody BalanceAdjustmentRequest request,
            Authentication authentication
    ) {
        User actor = requireAdjustBalanceActor(authentication);
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(String.valueOf(request.getAmount()));
        } catch (Exception error) {
            return buildResponse(HttpStatus.BAD_REQUEST, "金额格式不正确", null);
        }

        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            return buildResponse(HttpStatus.BAD_REQUEST, "调整原因不能为空", null);
        }

        BigDecimal currentBalance = user.getBalance() == null ? BigDecimal.ZERO : user.getBalance();
        BigDecimal nextBalance = currentBalance.add(amount);
        if (nextBalance.compareTo(BigDecimal.ZERO) < 0) {
            return buildResponse(HttpStatus.CONFLICT, "余额不能为负数", null);
        }

        user.setBalance(nextBalance);
        userRepository.save(user);
        saveBalanceRecord(user.getUsername(), amount, nextBalance, request.getReason().trim(), actor.getUsername());

        Map<String, Object> data = buildUserSummary(user);
        data.put("records", buildBalanceRecordsData(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc(user.getUsername())));
        return buildResponse(HttpStatus.OK, "余额已调整", data);
    }

    @PostMapping("/users/{id}/permissions")
    @Transactional
    public ResponseEntity<Map<String, Object>> updatePermissionsWithPost(
            @PathVariable Long id,
            @RequestBody PermissionUpdateRequest request,
            Authentication authentication
    ) {
        return updatePermissions(id, request, authentication);
    }

    @PutMapping("/users/{id}/permissions")
    @Transactional
    public ResponseEntity<Map<String, Object>> updatePermissions(
            @PathVariable Long id,
            @RequestBody PermissionUpdateRequest request,
            Authentication authentication
    ) {
        requirePermissionGrantActor(authentication);
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }

        try {
            user.setPermissions(adminPermissionService.normalizePermissions(request.getPermissions()));
        } catch (IllegalArgumentException error) {
            return buildResponse(HttpStatus.BAD_REQUEST, "权限配置不正确", null);
        }

        User savedUser = userRepository.save(user);
        Map<String, Object> data = buildUserSummary(savedUser);
        data.put("records", buildBalanceRecordsData(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc(savedUser.getUsername())));
        return buildResponse(HttpStatus.OK, "权限已更新", data);
    }

    @PostMapping("/users/{id}/ban")
    @Transactional
    public ResponseEntity<Map<String, Object>> banUser(@PathVariable Long id, Authentication authentication) {
        requireViewUsersActor(authentication);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (target.getRole() == UserRole.ADMIN) {
            return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不能被封禁", null);
        }

        target.setBanned(true);
        User saved = userRepository.save(target);
        return buildResponse(HttpStatus.OK, "账号已封禁", buildUserSummary(saved));
    }

    @PostMapping("/users/{id}/unban")
    @Transactional
    public ResponseEntity<Map<String, Object>> unbanUser(@PathVariable Long id, Authentication authentication) {
        requireViewUsersActor(authentication);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (target.getRole() == UserRole.ADMIN) {
            return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不能执行解封操作", null);
        }

        target.setBanned(false);
        User saved = userRepository.save(target);
        return buildResponse(HttpStatus.OK, "账号已解封", buildUserSummary(saved));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id, Authentication authentication) {
        User actor = requireViewUsersActor(authentication);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (actor.getId().equals(target.getId())) {
            return buildResponse(HttpStatus.FORBIDDEN, "不能删除当前登录账号", null);
        }
        if (target.getRole() == UserRole.ADMIN) {
            return buildResponse(HttpStatus.FORBIDDEN, "管理员账号不能被删除", null);
        }

        String placeholder = userDeletionService.deleteRegularUser(target);

        return buildResponse(HttpStatus.OK, "账号已删除", Map.of("id", id, "placeholder", placeholder));
    }

    @PostMapping("/tasks/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolveDisputedTask(
            @PathVariable Long id,
            @RequestBody(required = false) TaskActionRequest request,
            Authentication authentication
    ) {
        User actor = requireAdminAccessActor(authentication);
        try {
            Task task = taskLifecycleService.resolve(
                    id,
                    actor,
                    request == null ? null : request.getResolution(),
                    request == null ? null : request.getNote()
            );
            return buildResponse(HttpStatus.OK, "纠纷任务已处理", Map.of("task", task));
        } catch (ResponseStatusException error) {
            return buildResponse(
                    HttpStatus.valueOf(error.getStatusCode().value()),
                    error.getReason() == null ? error.getMessage() : error.getReason(),
                    null
            );
        }
    }

    @DeleteMapping("/tasks/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteTask(@PathVariable Long id, Authentication authentication) {
        requireAdminAccessActor(authentication);
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "帖子不存在", null);
        }

        taskReviewRepository.deleteByTaskId(id);
        messageRepository.deleteByTaskId(id);
        balanceRecordRepository.clearRelatedTaskId(id);
        taskRepository.delete(task);

        return buildResponse(HttpStatus.OK, "帖子已删除", Map.of("id", id));
    }

    @GetMapping("/verifications")
    public ResponseEntity<Map<String, Object>> listPendingVerifications(Authentication authentication) {
        requireAdminAccessActor(authentication);
        List<Map<String, Object>> users = userRepository
                .findByVerificationStatusOrderByVerificationSubmittedAtAsc(VerificationStatus.PENDING)
                .stream()
                .map(this::buildUserSummary)
                .toList();
        return buildResponse(HttpStatus.OK, "成功", users);
    }

    @PostMapping("/verifications/{userId}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> approveVerification(
            @PathVariable Long userId,
            @RequestBody(required = false) VerificationRequest request,
            Authentication authentication
    ) {
        User actor = requireAdminAccessActor(authentication);
        User target = userRepository.findById(userId).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }

        target.setVerificationStatus(VerificationStatus.VERIFIED);
        target.setVerificationNote(normalizeOptional(request == null ? null : request.getNote()));
        target.setVerificationReviewedAt(LocalDateTime.now());
        target.setVerificationReviewer(actor.getUsername());
        User saved = userRepository.save(target);
        return buildResponse(HttpStatus.OK, "认证申请已通过", buildUserSummary(saved));
    }

    @PostMapping("/verifications/{userId}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> rejectVerification(
            @PathVariable Long userId,
            @RequestBody(required = false) VerificationRequest request,
            Authentication authentication
    ) {
        User actor = requireAdminAccessActor(authentication);
        User target = userRepository.findById(userId).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }

        String note = normalizeOptional(request == null ? null : request.getNote());
        if (note == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "驳回原因不能为空", null);
        }

        target.setVerificationStatus(VerificationStatus.REJECTED);
        target.setVerificationNote(note);
        target.setVerificationReviewedAt(LocalDateTime.now());
        target.setVerificationReviewer(actor.getUsername());
        User saved = userRepository.save(target);
        return buildResponse(HttpStatus.OK, "认证申请已驳回", buildUserSummary(saved));
    }

    private Map<String, Object> buildUserSummary(User user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("name", user.getName());
        data.put("role", user.getRole().name());
        data.put("permissions", adminPermissionService.toPermissionNames(user));
        data.put("balance", user.getBalance());
        data.put("banned", user.isBanned());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("avatarUrl", user.getAvatarUrl());
        data.put("completedAsPublisherCount", taskRepository.countByStatusAndAuthorUsername("completed", user.getUsername()));
        data.put("completedAsAssigneeCount", taskRepository.countByStatusAndAssignee("completed", user.getUsername()));
        data.put("averageRating", taskReviewRepository.averageRatingForUser(user.getUsername()));
        data.put("reviewCount", taskReviewRepository.countByRevieweeUsername(user.getUsername()));
        data.put("verificationStatus", user.getVerificationStatus().name());
        data.put("verificationCampus", user.getVerificationCampus());
        data.put("verificationStudentId", user.getVerificationStudentId());
        data.put("verificationNote", user.getVerificationNote());
        data.put("verificationSubmittedAt", user.getVerificationSubmittedAt());
        data.put("verificationReviewedAt", user.getVerificationReviewedAt());
        data.put("verificationReviewer", user.getVerificationReviewer());
        return data;
    }

    private List<Map<String, Object>> buildBalanceRecordsData(List<BalanceRecord> records) {
        return records.stream().map(record -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", record.getId());
            item.put("username", record.getUsername());
            item.put("amount", record.getAmount());
            item.put("balanceAfter", record.getBalanceAfter());
            item.put("type", record.getType());
            item.put("title", record.getTitle());
            item.put("description", record.getDescription());
            item.put("relatedTaskId", record.getRelatedTaskId());
            item.put("createdAt", record.getCreatedAt());
            return item;
        }).toList();
    }

    private void saveBalanceRecord(String username, BigDecimal amount, BigDecimal balanceAfter, String reason, String actorUsername) {
        BalanceRecord balanceRecord = new BalanceRecord();
        balanceRecord.setUsername(username);
        balanceRecord.setAmount(amount);
        balanceRecord.setBalanceAfter(balanceAfter);
        balanceRecord.setType("admin_adjustment");
        balanceRecord.setTitle("管理员余额调整");
        balanceRecord.setDescription("操作人：" + actorUsername + "；原因：" + reason);
        balanceRecord.setCreatedAt(LocalDateTime.now());
        balanceRecordRepository.save(balanceRecord);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User requireAdminAccessActor(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (!adminPermissionService.canAccessAdminPanel(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "没有权限执行此操作");
        }
        return actor;
    }

    private User requireViewUsersActor(Authentication authentication) {
        User actor = requireAdminAccessActor(authentication);
        if (!adminPermissionService.canViewUsers(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "没有权限执行此操作");
        }
        return actor;
    }

    private User requireAdjustBalanceActor(Authentication authentication) {
        User actor = requireAdminAccessActor(authentication);
        if (!adminPermissionService.canAdjustBalance(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "没有权限执行此操作");
        }
        return actor;
    }

    private User requirePermissionGrantActor(Authentication authentication) {
        User actor = requireAdminAccessActor(authentication);
        if (!adminPermissionService.canGrantPermissions(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "没有权限执行此操作");
        }
        return actor;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        if (data != null) {
            body.put("data", data);
        }
        return ResponseEntity.status(status).body(body);
    }
}
