package com.example.campusbackend.controller;

import com.example.campusbackend.entity.Task;
import com.example.campusbackend.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        task.setStatus("open");
        task.setAssignee(null);
        return taskRepository.save(task);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> acceptTask(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        Optional<Task> optionalTask = taskRepository.findById(id);
        if (optionalTask.isEmpty()) {
            return buildResponse(HttpStatus.NOT_FOUND, "task not found", null);
        }

        Task task = optionalTask.get();
        if ("completed".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "task already completed", null);
        }
        if (!"open".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "task cannot be accepted in current status", null);
        }

        String assignee = payload == null ? null : payload.get("assignee");
        if (assignee != null) {
            assignee = assignee.trim();
        }
        task.setAssignee(assignee == null || assignee.isEmpty() ? null : assignee);
        task.setStatus("accepted");

        Task savedTask = taskRepository.save(task);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task", savedTask);
        return buildResponse(HttpStatus.OK, "task accepted", data);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Map<String, Object>> completeTask(@PathVariable Long id) {
        Optional<Task> optionalTask = taskRepository.findById(id);
        if (optionalTask.isEmpty()) {
            return buildResponse(HttpStatus.NOT_FOUND, "task not found", null);
        }

        Task task = optionalTask.get();
        if ("completed".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "task already completed", null);
        }
        if ("open".equals(task.getStatus())) {
            return buildResponse(HttpStatus.CONFLICT, "task must be accepted before completion", null);
        }

        task.setStatus("completed");
        Task savedTask = taskRepository.save(task);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("task", savedTask);
        return buildResponse(HttpStatus.OK, "task completed", data);
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
}
