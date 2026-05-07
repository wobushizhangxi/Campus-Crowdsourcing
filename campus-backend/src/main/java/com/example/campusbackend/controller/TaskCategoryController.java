package com.example.campusbackend.controller;

import com.example.campusbackend.dto.TaskCategoryRequest;
import com.example.campusbackend.entity.TaskCategory;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.TaskCategoryRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.service.AdminPermissionService;
import com.example.campusbackend.service.CurrentUserService;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TaskCategoryController {
    private final TaskCategoryRepository taskCategoryRepository;
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUserService;
    private final AdminPermissionService adminPermissionService;

    public TaskCategoryController(
            TaskCategoryRepository taskCategoryRepository,
            TaskRepository taskRepository,
            CurrentUserService currentUserService,
            AdminPermissionService adminPermissionService
    ) {
        this.taskCategoryRepository = taskCategoryRepository;
        this.taskRepository = taskRepository;
        this.currentUserService = currentUserService;
        this.adminPermissionService = adminPermissionService;
    }

    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> listCategories() {
        return buildResponse(HttpStatus.OK, "Success", taskCategoryRepository.findAllByOrderByCreatedAtAsc());
    }

    @PostMapping("/admin/categories")
    @Transactional
    public ResponseEntity<Map<String, Object>> createCategory(
            @RequestBody TaskCategoryRequest request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        String name = normalizeName(request == null ? null : request.getName());
        if (name == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Category name is required", null);
        }
        if (taskCategoryRepository.existsByNameIgnoreCase(name)) {
            return buildResponse(HttpStatus.CONFLICT, "Category already exists", null);
        }

        TaskCategory category = new TaskCategory();
        category.setName(name);
        TaskCategory savedCategory = taskCategoryRepository.save(category);
        return ResponseEntity
                .created(URI.create("/api/admin/categories/" + savedCategory.getId()))
                .body(buildBody(HttpStatus.CREATED, "Category created", savedCategory));
    }

    @PutMapping("/admin/categories/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateCategory(
            @PathVariable Long id,
            @RequestBody TaskCategoryRequest request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        TaskCategory category = taskCategoryRepository.findById(id).orElse(null);
        if (category == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "Category not found", null);
        }
        String name = normalizeName(request == null ? null : request.getName());
        if (name == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "Category name is required", null);
        }
        TaskCategory existing = taskCategoryRepository.findByNameIgnoreCase(name).orElse(null);
        if (existing != null && !existing.getId().equals(id)) {
            return buildResponse(HttpStatus.CONFLICT, "Category already exists", null);
        }

        category.setName(name);
        return buildResponse(HttpStatus.OK, "Category updated", taskCategoryRepository.save(category));
    }

    @DeleteMapping("/admin/categories/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable Long id, Authentication authentication) {
        requireAdmin(authentication);
        TaskCategory category = taskCategoryRepository.findById(id).orElse(null);
        if (category == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "Category not found", null);
        }
        if (taskRepository.existsByCategoryIgnoreCase(category.getName())) {
            return buildResponse(HttpStatus.CONFLICT, "Category is used by existing tasks", null);
        }

        taskCategoryRepository.delete(category);
        return buildResponse(HttpStatus.OK, "Category deleted", Map.of("id", id));
    }

    private User requireAdmin(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (!adminPermissionService.canAccessAdminPanel(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return actor;
    }

    private String normalizeName(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, Object data) {
        return ResponseEntity.status(status).body(buildBody(status, message, data));
    }

    private Map<String, Object> buildBody(HttpStatus status, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        if (data != null) {
            body.put("data", data);
        }
        return body;
    }
}
