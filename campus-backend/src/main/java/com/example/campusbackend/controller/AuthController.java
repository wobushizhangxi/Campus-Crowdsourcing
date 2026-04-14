package com.example.campusbackend.controller;

import com.example.campusbackend.dto.AuthRequest;
import com.example.campusbackend.dto.AuthResponse;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.security.AppUserPrincipal;
import com.example.campusbackend.security.JwtTokenService;
import com.example.campusbackend.service.AdminPermissionService;
import com.example.campusbackend.service.LegacyPasswordMigrationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final LegacyPasswordMigrationService legacyPasswordMigrationService;
    private final AdminPermissionService adminPermissionService;

    public AuthController(
            UserRepository userRepository,
            TaskRepository taskRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            LegacyPasswordMigrationService legacyPasswordMigrationService,
            AdminPermissionService adminPermissionService
    ) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.legacyPasswordMigrationService = legacyPasswordMigrationService;
        this.adminPermissionService = adminPermissionService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody AuthRequest request) {
        String username = normalizeRequired(request.getUsername());
        String password = normalizeRequired(request.getPassword());
        if (username == null || password == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "用户名和密码不能为空", null);
        }
        if (userRepository.existsByUsername(username)) {
            return buildResponse(HttpStatus.CONFLICT, "用户名已存在", null);
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setName(defaultIfBlank(request.getName(), username));
        user.setEmail(normalizeOptional(request.getEmail()));
        user.setPhone(normalizeOptional(request.getPhone()));
        user.setCampus(defaultIfBlank(request.getCampus(), "主校区"));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBio(defaultIfBlank(request.getBio(), "这个人很低调，还没有填写个人简介。"));
        user.setRole(UserRole.USER);

        User savedUser = userRepository.save(user);
        return buildResponse(HttpStatus.CREATED, "注册成功", buildAuthResponse(savedUser));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest request) {
        String username = normalizeRequired(request.getUsername());
        String password = normalizeRequired(request.getPassword());
        if (username == null || password == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "用户名和密码不能为空", null);
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return buildResponse(HttpStatus.UNAUTHORIZED, "用户不存在", null);
        }
        if (!legacyPasswordMigrationService.matchesAndUpgrade(user, password)) {
            return buildResponse(HttpStatus.UNAUTHORIZED, "密码错误", null);
        }

        User refreshedUser = userRepository.findById(user.getId()).orElse(user);
        return buildResponse(HttpStatus.OK, "登录成功", buildAuthResponse(refreshedUser));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            return buildResponse(HttpStatus.UNAUTHORIZED, "请先登录", null);
        }

        return buildResponse(HttpStatus.OK, "成功", Map.of(
                "user", buildUserData(principal.user())
        ));
    }

    private AuthResponse buildAuthResponse(User user) {
        return new AuthResponse(
                jwtTokenService.generateToken(user),
                buildUserData(user)
        );
    }

    private Map<String, Object> buildUserData(User user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("name", user.getName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("campus", user.getCampus());
        data.put("address", user.getAddress());
        data.put("bio", user.getBio());
        data.put("balance", user.getBalance());
        data.put("banned", user.isBanned());
        data.put("role", user.getRole().name());
        data.put("permissions", adminPermissionService.toPermissionNames(user));
        data.put("completedCount", taskRepository.countCompletedTasksForUser(user.getUsername(), user.getName()));
        return data;
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

    private String normalizeRequired(String value) {
        return normalizeOptional(value);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultIfBlank(String value, String fallback) {
        String normalized = normalizeOptional(value);
        return normalized == null ? fallback : normalized;
    }
}
