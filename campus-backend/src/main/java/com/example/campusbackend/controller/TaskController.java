package com.example.campusbackend.controller;

import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.CurrentUserService;
import com.example.campusbackend.service.TaskAuthorizationService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
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

        task.setStatus("open");
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
    @Transactional
    public ResponseEntity<Map<String, Object>> completeTask(@PathVariable Long id, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "Account is banned", null);
        }
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }

        if ("completed".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "任务已完成", null);
        }
        if ("open".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "任务需先被接单后才能完成", null);
        }
        if (!taskAuthorizationService.canCompleteTask(actor, task)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        task.setStatus("completed");
        task.setCompletedAt(LocalDateTime.now());

        String assigneeUsername = normalizeValue(task.getAssignee());
        if (assigneeUsername != null) {
            User assigneeUser = userRepository.findByUsername(assigneeUsername).orElse(null);
            if (assigneeUser != null) {
                BigDecimal reward = normalizeMoney(task.getReward());
                BigDecimal currentBalance = normalizeMoney(assigneeUser.getBalance());
                BigDecimal nextBalance = currentBalance.add(reward);
                assigneeUser.setBalance(nextBalance);
                userRepository.save(assigneeUser);
                saveBalanceRecord(
                        assigneeUser.getUsername(),
                        reward,
                        nextBalance,
                        "task_income",
                        "任务收入到账",
                        task.getTitle(),
                        task.getId()
                );
            }
        }

        Task savedTask = taskRepository.save(task);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task", savedTask);
        return buildResponse(HttpStatus.OK, "任务已完成", data);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            HttpStatus status,
            String message,
            Map<String, Object> data
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        if (data != null) {
            body.put("data", data);
        }
        return ResponseEntity.status(status).body(body);
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
