package com.example.campusbackend.controller;

import com.example.campusbackend.entity.Report;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.ReportRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUserService;

    public ReportController(
            ReportRepository reportRepository,
            TaskRepository taskRepository,
            CurrentUserService currentUserService
    ) {
        this.reportRepository = reportRepository;
        this.taskRepository = taskRepository;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReport(@RequestBody Map<String, Object> request, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }

        Long taskId = request.get("taskId") instanceof Integer
                ? ((Integer) request.get("taskId")).longValue()
                : (Long) request.get("taskId");
        String reason = request.get("reason") == null ? "" : request.get("reason").toString().trim();

        if (taskId == null || reason.isEmpty()) {
            return buildResponse(HttpStatus.BAD_REQUEST, "缺少任务ID或举报原因", null);
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }

        if (actor.getUsername().equals(task.getAuthorUsername())) {
            return buildResponse(HttpStatus.CONFLICT, "不能举报自己的任务", null);
        }

        if (reportRepository.existsByTaskIdAndReporterUsername(taskId, actor.getUsername())) {
            return buildResponse(HttpStatus.CONFLICT, "已举报过该任务", null);
        }

        Report report = new Report();
        report.setTaskId(taskId);
        report.setReporterUsername(actor.getUsername());
        report.setReason(reason);

        Report saved = reportRepository.save(report);
        return buildResponse(HttpStatus.CREATED, "举报已提交", saved);
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
