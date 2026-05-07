package com.example.campusbackend.controller;

import com.example.campusbackend.dto.TaskActionRequest;
import com.example.campusbackend.dto.TaskReviewRequest;
import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.ReviewerRole;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.TaskReview;
import com.example.campusbackend.entity.TaskStatus;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.TaskReviewRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.CurrentUserService;
import com.example.campusbackend.service.TaskAuthorizationService;
import com.example.campusbackend.service.TaskLifecycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BalanceRecordRepository balanceRecordRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private TaskAuthorizationService taskAuthorizationService;

    @Autowired
    private TaskLifecycleService taskLifecycleService;

    @Autowired
    private TaskReviewRepository taskReviewRepository;

    @GetMapping
    public List<Map<String, Object>> getAllTasks(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        Map<String, User> usersByUsername = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getUsername, user -> user, (first, second) -> first));
        return taskRepository.findAll().stream()
                .map(task -> buildTaskData(task, usersByUsername, actor))
                .toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createTask(@RequestBody Task task, Authentication authentication) {
        User publisher = currentUserService.requireCurrentUser(authentication);
        if (publisher.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "Account is banned", null);
        }
        BigDecimal reward = normalizeMoney(task.getReward());
        if (reward.compareTo(BigDecimal.ZERO) <= 0) {
            return buildResponse(HttpStatus.BAD_REQUEST, "悬赏金额必须大于0", null);
        }

        BigDecimal currentBalance = normalizeMoney(publisher.getBalance());
        if (currentBalance.compareTo(reward) < 0) {
            return buildResponse(HttpStatus.CONFLICT, "余额不足", null);
        }

        BigDecimal nextBalance = currentBalance.subtract(reward);
        publisher.setBalance(nextBalance);
        userRepository.save(publisher);

        task.setStatus(TaskStatus.OPEN.storedValue());
        task.setAssignee(null);
        task.setCompletedAt(null);
        task.setAuthorUsername(publisher.getUsername());
        task.setAuthor(normalizeValue(publisher.getName()) == null ? publisher.getUsername() : publisher.getName());
        Task savedTask = taskRepository.save(task);

        saveBalanceRecord(
                publisher.getUsername(),
                reward.negate(),
                nextBalance,
                "task_publish",
                "发布任务预扣",
                savedTask.getTitle(),
                savedTask.getId()
        );

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task", savedTask);
        data.put("balance", nextBalance);
        return buildResponse(HttpStatus.CREATED, "任务发布成功", data);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> acceptTask(@PathVariable Long id, Authentication authentication) {
        User assigneeUser = currentUserService.requireCurrentUser(authentication);
        if (assigneeUser.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "Account is banned", null);
        }
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }

        if ("completed".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "任务已完成", null);
        }
        if (!"open".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "当前状态下无法接单", null);
        }

        task.setAssignee(assigneeUser.getUsername());
        task.setStatus("accepted");

        Task savedTask = taskRepository.save(task);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task", savedTask);
        return buildResponse(HttpStatus.OK, "接单成功", data);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Map<String, Object>> completeTask(@PathVariable Long id, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.approve(id, actor);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务已完成", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Map<String, Object>> submitTask(
            @PathVariable Long id,
            @RequestBody(required = false) TaskActionRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.submit(id, actor, request == null ? null : request.getNote());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务已提交完成", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveTask(@PathVariable Long id, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.approve(id, actor);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务验收通过", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectTask(
            @PathVariable Long id,
            @RequestBody(required = false) TaskActionRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.reject(id, actor, request == null ? null : request.getReason());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务已驳回", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelTask(
            @PathVariable Long id,
            @RequestBody(required = false) TaskActionRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.cancel(id, actor, request == null ? null : request.getReason());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务已取消", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @PostMapping("/{id}/dispute")
    public ResponseEntity<Map<String, Object>> disputeTask(
            @PathVariable Long id,
            @RequestBody(required = false) TaskActionRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            Task savedTask = taskLifecycleService.dispute(id, actor, request == null ? null : request.getReason());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("task", savedTask);
            return buildResponse(HttpStatus.OK, "任务已进入纠纷", data);
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getTaskReviews(@PathVariable Long id, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }
        if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        return buildResponse(HttpStatus.OK, "成功", taskReviewRepository.findByTaskIdOrderByCreatedAtAsc(id));
    }

    @PostMapping("/{id}/reviews")
    @Transactional
    public ResponseEntity<Map<String, Object>> createTaskReview(
            @PathVariable Long id,
            @RequestBody TaskReviewRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "Account is banned", null);
        }

        try {
            TaskReview review = buildReview(id, request, actor);
            TaskReview savedReview = taskReviewRepository.save(review);
            return buildResponse(HttpStatus.CREATED, "评价已提交", Map.of("review", savedReview));
        } catch (ResponseStatusException error) {
            return buildResponse(error);
        }
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            HttpStatus status,
            String message,
            Object data
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        if (data != null) {
            body.put("data", data);
        }
        return ResponseEntity.status(status).body(body);
    }

    private Map<String, Object> buildTaskData(Task task, Map<String, User> usersByUsername, User actor) {
        User author = usersByUsername.get(task.getAuthorUsername());
        User assignee = usersByUsername.get(task.getAssignee());
        boolean currentUserReviewSubmitted = hasCurrentUserReviewed(task, actor);
        boolean currentUserCanReview = TaskStatus.fromStoredValue(task.getStatus()) == TaskStatus.COMPLETED
                && currentUserReviewRole(task, actor) != null
                && !currentUserReviewSubmitted;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", task.getId());
        data.put("title", task.getTitle());
        data.put("description", task.getDescription());
        data.put("reward", task.getReward());
        data.put("status", task.getStatus());
        data.put("category", task.getCategory());
        data.put("campus", task.getCampus());
        data.put("location", task.getLocation());
        data.put("author", task.getAuthor());
        data.put("authorUsername", task.getAuthorUsername());
        data.put("authorVerificationStatus", verificationStatusName(author));
        data.put("authorAvatarUrl", author == null ? null : author.getAvatarUrl());
        data.put("assignee", task.getAssignee());
        data.put("assigneeVerificationStatus", verificationStatusName(assignee));
        data.put("assigneeAvatarUrl", assignee == null ? null : assignee.getAvatarUrl());
        data.put("deadlineAt", task.getDeadlineAt());
        data.put("submittedAt", task.getSubmittedAt());
        data.put("submissionNote", task.getSubmissionNote());
        data.put("rejectedAt", task.getRejectedAt());
        data.put("rejectionReason", task.getRejectionReason());
        data.put("cancelledAt", task.getCancelledAt());
        data.put("cancelReason", task.getCancelReason());
        data.put("disputeReason", task.getDisputeReason());
        data.put("resolvedAt", task.getResolvedAt());
        data.put("resolutionNote", task.getResolutionNote());
        data.put("completedAt", task.getCompletedAt());
        data.put("currentUserReviewSubmitted", currentUserReviewSubmitted);
        data.put("currentUserCanReview", currentUserCanReview);
        return data;
    }

    private String verificationStatusName(User user) {
        return user == null ? "UNVERIFIED" : user.getVerificationStatus().name();
    }

    private boolean hasCurrentUserReviewed(Task task, User actor) {
        ReviewerRole reviewerRole = currentUserReviewRole(task, actor);
        return reviewerRole != null
                && taskReviewRepository.existsByTaskIdAndReviewerUsernameAndReviewerRole(
                task.getId(),
                actor.getUsername(),
                reviewerRole
        );
    }

    private ReviewerRole currentUserReviewRole(Task task, User actor) {
        if (actor == null || task == null) {
            return null;
        }
        if (actor.getUsername().equals(task.getAuthorUsername())) {
            return ReviewerRole.PUBLISHER;
        }
        if (actor.getUsername().equals(task.getAssignee())) {
            return ReviewerRole.ASSIGNEE;
        }
        return null;
    }

    private TaskReview buildReview(Long taskId, TaskReviewRequest request, User actor) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "任务不存在"));
        if (TaskStatus.fromStoredValue(task.getStatus()) != TaskStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "只有已完成任务可以评价");
        }
        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "评分必须在1到5之间");
        }

        ReviewerRole reviewerRole;
        String revieweeUsername;
        if (actor.getUsername().equals(task.getAuthorUsername())) {
            reviewerRole = ReviewerRole.PUBLISHER;
            revieweeUsername = normalizeValue(task.getAssignee());
        } else if (actor.getUsername().equals(task.getAssignee())) {
            reviewerRole = ReviewerRole.ASSIGNEE;
            revieweeUsername = normalizeValue(task.getAuthorUsername());
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        if (revieweeUsername == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "评价对象不存在");
        }
        if (taskReviewRepository.existsByTaskIdAndReviewerUsernameAndReviewerRole(taskId, actor.getUsername(), reviewerRole)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "不能重复评价");
        }

        TaskReview review = new TaskReview();
        review.setTaskId(taskId);
        review.setReviewerUsername(actor.getUsername());
        review.setRevieweeUsername(revieweeUsername);
        review.setReviewerRole(reviewerRole);
        review.setRating(request.getRating());
        review.setContent(normalizeValue(request.getContent()));
        review.setCreatedAt(LocalDateTime.now());
        return review;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(ResponseStatusException error) {
        HttpStatus status = HttpStatus.valueOf(error.getStatusCode().value());
        return buildResponse(status, error.getReason() == null ? error.getMessage() : error.getReason(), null);
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private void saveBalanceRecord(
            String username,
            BigDecimal amount,
            BigDecimal balanceAfter,
            String type,
            String title,
            String description,
            Long relatedTaskId
    ) {
        BalanceRecord balanceRecord = new BalanceRecord();
        balanceRecord.setUsername(username);
        balanceRecord.setAmount(amount);
        balanceRecord.setBalanceAfter(balanceAfter);
        balanceRecord.setType(type);
        balanceRecord.setTitle(title);
        balanceRecord.setDescription(description);
        balanceRecord.setRelatedTaskId(relatedTaskId);
        balanceRecord.setCreatedAt(LocalDateTime.now());
        balanceRecordRepository.save(balanceRecord);
    }
}
