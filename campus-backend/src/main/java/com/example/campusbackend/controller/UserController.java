package com.example.campusbackend.controller;

import com.example.campusbackend.dto.AuthRequest;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private static final String DEFAULT_CAMPUS = "main-campus";
    private static final String DEFAULT_BIO = "This user has not set a bio yet.";

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody AuthRequest request) {
        String username = normalizeRequired(request.getUsername());
        String password = normalizeRequired(request.getPassword());

        if (username == null || password == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "username and password are required", null);
        }

        if (userRepository.existsByUsername(username)) {
            return buildResponse(HttpStatus.CONFLICT, "username already exists", null);
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setName(defaultIfBlank(request.getName(), username));
        user.setEmail(normalizeOptional(request.getEmail()));
        user.setPhone(normalizeOptional(request.getPhone()));
        user.setCampus(defaultIfBlank(request.getCampus(), DEFAULT_CAMPUS));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBio(defaultIfBlank(request.getBio(), DEFAULT_BIO));

        User savedUser = userRepository.save(user);
        return buildResponse(HttpStatus.CREATED, "register success", buildUserData(savedUser));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest request) {
        String username = normalizeRequired(request.getUsername());
        String password = normalizeRequired(request.getPassword());

        if (username == null || password == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "username and password are required", null);
        }

        Optional<User> userOptional = userRepository.findByUsername(username);
        if (userOptional.isEmpty()) {
            return buildResponse(HttpStatus.UNAUTHORIZED, "user not registered", null);
        }

        User user = userOptional.get();
        if (!user.getPassword().equals(password)) {
            return buildResponse(HttpStatus.UNAUTHORIZED, "password incorrect", null);
        }

        return buildResponse(HttpStatus.OK, "login success", buildUserData(user));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<Map<String, Object>> updateProfileById(
            @PathVariable Long id,
            @RequestBody AuthRequest request
    ) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return buildResponse(HttpStatus.NOT_FOUND, "user not found", null);
        }

        return updateUserProfile(userOptional.get(), request);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfileByUsername(@RequestBody AuthRequest request) {
        String username = normalizeRequired(request.getUsername());
        if (username == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "username is required", null);
        }

        Optional<User> userOptional = userRepository.findByUsername(username);
        if (userOptional.isEmpty()) {
            return buildResponse(HttpStatus.NOT_FOUND, "user not found", null);
        }

        return updateUserProfile(userOptional.get(), request);
    }

    private ResponseEntity<Map<String, Object>> updateUserProfile(User user, AuthRequest request) {
        String newUsername = normalizeRequired(request.getUsername());
        if (newUsername == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "username is required", null);
        }

        if (!newUsername.equals(user.getUsername()) && userRepository.existsByUsername(newUsername)) {
            return buildResponse(HttpStatus.CONFLICT, "username already exists", null);
        }

        String newName = normalizeRequired(request.getName());
        if (newName == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "name is required", null);
        }

        user.setUsername(newUsername);
        user.setName(newName);
        user.setEmail(normalizeOptional(request.getEmail()));
        user.setPhone(normalizeOptional(request.getPhone()));
        user.setCampus(defaultIfBlank(request.getCampus(), DEFAULT_CAMPUS));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBio(defaultIfBlank(request.getBio(), DEFAULT_BIO));

        User savedUser = userRepository.save(user);
        return buildResponse(HttpStatus.OK, "profile updated", buildUserData(savedUser));
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
        return data;
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
