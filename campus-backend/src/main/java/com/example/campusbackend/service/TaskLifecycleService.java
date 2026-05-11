package com.example.campusbackend.service;

import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.TaskStatus;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TaskLifecycleService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final BalanceRecordRepository balanceRecordRepository;
    private final TaskAuthorizationService taskAuthorizationService;

    public TaskLifecycleService(
            TaskRepository taskRepository,
            UserRepository userRepository,
            BalanceRecordRepository balanceRecordRepository,
            TaskAuthorizationService taskAuthorizationService
    ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.balanceRecordRepository = balanceRecordRepository;
        this.taskAuthorizationService = taskAuthorizationService;
    }

    @Transactional
    public Task submit(Long id, User actor, String note) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        requireStatus(task, TaskStatus.ACCEPTED, "当前状态下无法提交完成");
        if (!actor.getUsername().equals(task.getAssignee())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        task.setStatus(TaskStatus.SUBMITTED.storedValue());
        task.setSubmittedAt(LocalDateTime.now());
        task.setSubmissionNote(normalizeOptional(note));
        return taskRepository.save(task);
    }

    @Transactional
    public Task approve(Long id, User actor) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        TaskStatus status = TaskStatus.fromStoredValue(task.getStatus());
        if (status == TaskStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "任务需先由接单人提交完成");
        }
        requireStatus(task, TaskStatus.SUBMITTED, "当前状态下无法验收");
        requirePublisherOrAdmin(actor, task);

        completeAndPayout(task, "task_income", "任务收入到账", task.getTitle());
        return taskRepository.save(task);
    }

    @Transactional
    public Task reject(Long id, User actor, String reason) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        requireStatus(task, TaskStatus.SUBMITTED, "当前状态下无法驳回");
        requirePublisherOrAdmin(actor, task);
        String normalizedReason = requireText(reason, "驳回原因不能为空");

        task.setStatus(TaskStatus.ACCEPTED.storedValue());
        task.setRejectedAt(LocalDateTime.now());
        task.setRejectionReason(normalizedReason);
        return taskRepository.save(task);
    }

    @Transactional
    public Task cancel(Long id, User actor, String reason) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        requireStatus(task, TaskStatus.OPEN, "只有待接单任务可以直接取消");
        requirePublisherOrAdmin(actor, task);

        task.setStatus(TaskStatus.CANCELLED.storedValue());
        task.setCancelledAt(LocalDateTime.now());
        task.setCancelReason(requireText(reason, "取消原因不能为空"));
        refundPublisher(task, "task_refund", "任务取消退款", task.getTitle());
        return taskRepository.save(task);
    }

    @Transactional
    public Task dispute(Long id, User actor, String reason) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        TaskStatus status = TaskStatus.fromStoredValue(task.getStatus());
        if (status != TaskStatus.ACCEPTED && status != TaskStatus.SUBMITTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "当前状态下无法发起纠纷");
        }
        if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }

        task.setStatus(TaskStatus.DISPUTED.storedValue());
        task.setDisputeReason(requireText(reason, "纠纷原因不能为空"));
        return taskRepository.save(task);
    }

    @Transactional
    public Task resolve(Long id, User actor, String resolution, String note) {
        requireActiveUser(actor);
        Task task = requireTask(id);
        requireStatus(task, TaskStatus.DISPUTED, "只有纠纷任务可以处理");
        String normalizedResolution = requireText(resolution, "处理结果不能为空").toLowerCase();
        String normalizedNote = requireText(note, "处理说明不能为空");
        task.setResolvedAt(LocalDateTime.now());
        task.setResolutionNote(normalizedNote);

        if ("refund".equals(normalizedResolution)) {
            task.setStatus(TaskStatus.CANCELLED.storedValue());
            task.setCancelledAt(LocalDateTime.now());
            refundPublisher(task, "task_dispute_refund", "纠纷退款", normalizedNote);
            return taskRepository.save(task);
        }

        if ("complete".equals(normalizedResolution)) {
            completeAndPayout(task, "task_dispute_income", "纠纷结算收入", normalizedNote);
            return taskRepository.save(task);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "处理结果必须为退款或结算");
    }

    private Task requireTask(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "任务不存在"));
    }

    private void requireActiveUser(User actor) {
        if (actor.isBanned()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "账号已被封禁");
        }
    }

    private void requireStatus(Task task, TaskStatus requiredStatus, String message) {
        TaskStatus status = TaskStatus.fromStoredValue(task.getStatus());
        if (status != requiredStatus) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    private void requirePublisherOrAdmin(User actor, Task task) {
        if (!taskAuthorizationService.canCompleteTask(actor, task)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权限");
        }
    }

    private void completeAndPayout(Task task, String recordType, String recordTitle, String recordDescription) {
        TaskStatus currentStatus = TaskStatus.fromStoredValue(task.getStatus());
        if (currentStatus == TaskStatus.COMPLETED || currentStatus == TaskStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "任务已结束");
        }

        String assigneeUsername = normalizeOptional(task.getAssignee());
        if (assigneeUsername != null) {
            User assignee = userRepository.findByUsername(assigneeUsername).orElse(null);
            if (assignee != null) {
                BigDecimal reward = normalizeMoney(task.getReward());
                BigDecimal nextBalance = normalizeMoney(assignee.getBalance()).add(reward);
                assignee.setBalance(nextBalance);
                userRepository.save(assignee);
                saveBalanceRecord(assignee.getUsername(), reward, nextBalance, recordType, recordTitle, recordDescription, task.getId());
            }
        }

        task.setStatus(TaskStatus.COMPLETED.storedValue());
        task.setCompletedAt(LocalDateTime.now());
    }

    private void refundPublisher(Task task, String recordType, String recordTitle, String recordDescription) {
        String publisherUsername = normalizeOptional(task.getAuthorUsername());
        if (publisherUsername == null) {
            return;
        }

        User publisher = userRepository.findByUsername(publisherUsername).orElse(null);
        if (publisher == null) {
            return;
        }

        BigDecimal reward = normalizeMoney(task.getReward());
        BigDecimal nextBalance = normalizeMoney(publisher.getBalance()).add(reward);
        publisher.setBalance(nextBalance);
        userRepository.save(publisher);
        saveBalanceRecord(publisher.getUsername(), reward, nextBalance, recordType, recordTitle, recordDescription, task.getId());
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

    private BigDecimal normalizeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String requireText(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }
}
