package com.example.campusbackend.controller;

import com.example.campusbackend.dto.AuthRequest;
import com.example.campusbackend.dto.AvatarRequest;
import com.example.campusbackend.dto.VerificationRequest;
import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.entity.VerificationStatus;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskReviewRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.CurrentUserService;
import com.example.campusbackend.service.AdminPermissionService;
import com.example.campusbackend.service.UserDeletionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private static final String DEFAULT_CAMPUS = "主校区";
    private static final String DEFAULT_BIO = "这个人很低调，还没有填写个人简介。";

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final TaskReviewRepository taskReviewRepository;
    private final BalanceRecordRepository balanceRecordRepository;
    private final CurrentUserService currentUserService;
    private final AdminPermissionService adminPermissionService;
    private final UserDeletionService userDeletionService;

    public UserController(
            UserRepository userRepository,
            TaskRepository taskRepository,
            TaskReviewRepository taskReviewRepository,
            BalanceRecordRepository balanceRecordRepository,
            CurrentUserService currentUserService,
            AdminPermissionService adminPermissionService,
            UserDeletionService userDeletionService
    ) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.taskReviewRepository = taskReviewRepository;
        this.balanceRecordRepository = balanceRecordRepository;
        this.currentUserService = currentUserService;
        this.adminPermissionService = adminPermissionService;
        this.userDeletionService = userDeletionService;
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getCurrentProfile(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        return buildResponse(HttpStatus.OK, "成功", buildUserData(actor));
    }

    @GetMapping("/summary/{username}")
    public ResponseEntity<Map<String, Object>> getUserSummary(@PathVariable String username, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        User target = userRepository.findByUsername(normalizeRequired(username)).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (!canAccessUser(actor, target)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        return buildResponse(HttpStatus.OK, "成功", buildUserData(target));
    }

    @GetMapping("/{username}/reviews")
    public ResponseEntity<Map<String, Object>> getUserReviews(@PathVariable String username, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        User target = userRepository.findByUsername(normalizeRequired(username)).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (!canAccessUser(actor, target)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        return buildResponse(HttpStatus.OK, "成功", Map.of(
                "reviews", taskReviewRepository.findByRevieweeUsernameOrderByCreatedAtDesc(target.getUsername())
        ));
    }

    @GetMapping("/balance/me")
    public ResponseEntity<Map<String, Object>> getOwnBalance(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        return buildResponse(HttpStatus.OK, "成功", buildBalanceData(actor));
    }

    @GetMapping("/balance/{username}")
    public ResponseEntity<Map<String, Object>> getBalanceDetails(@PathVariable String username, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        User target = userRepository.findByUsername(normalizeRequired(username)).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (!canAccessUser(actor, target)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        return buildResponse(HttpStatus.OK, "成功", buildBalanceData(target));
    }

    @PostMapping("/balance/recharge")
    public ResponseEntity<Map<String, Object>> rechargeBalance() {
        return buildResponse(HttpStatus.FORBIDDEN, "公开充值已关闭", null);
    }

    @GetMapping("/verification/me")
    public ResponseEntity<Map<String, Object>> getOwnVerification(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        return buildResponse(HttpStatus.OK, "成功", buildUserData(actor));
    }

    @PostMapping("/verification/me")
    public ResponseEntity<Map<String, Object>> submitOwnVerification(
            Authentication authentication,
            @RequestBody VerificationRequest request
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }
        String campus = normalizeRequired(request == null ? null : request.getCampus());
        String studentId = normalizeRequired(request == null ? null : request.getStudentId());
        if (campus == null || studentId == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "校区和学号不能为空", null);
        }

        actor.setVerificationStatus(VerificationStatus.PENDING);
        actor.setVerificationCampus(campus);
        actor.setVerificationStudentId(studentId);
        actor.setVerificationNote(normalizeOptional(request.getNote()));
        actor.setVerificationSubmittedAt(LocalDateTime.now());
        actor.setVerificationReviewedAt(null);
        actor.setVerificationReviewer(null);

        User savedUser = userRepository.save(actor);
        return buildResponse(HttpStatus.OK, "认证申请已提交", buildUserData(savedUser));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<Map<String, Object>> updateProfileById(
            @PathVariable Long id,
            @RequestBody AuthRequest request,
            Authentication authentication
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "用户不存在", null);
        }
        if (!actor.getId().equals(target.getId())) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        return updateUserProfile(target, request);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(Authentication authentication, @RequestBody AuthRequest request) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }
        return updateUserProfile(actor, request);
    }

    @PutMapping("/avatar")
    public ResponseEntity<Map<String, Object>> updateAvatar(
            Authentication authentication,
            @RequestBody AvatarRequest request
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }

        String avatarDataUrl = normalizeAvatarDataUrl(request == null ? null : request.getAvatarDataUrl());
        if (avatarDataUrl == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "头像图片不正确", null);
        }

        actor.setAvatarUrl(avatarDataUrl);
        User savedUser = userRepository.save(actor);
        return buildResponse(HttpStatus.OK, "头像已更新", buildUserData(savedUser));
    }

    @PostMapping("/avatar/upload")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ) {
        User actor = currentUserService.requireCurrentUser(authentication);
        if (actor.isBanned()) {
            return buildResponse(HttpStatus.FORBIDDEN, "账号已被封禁", null);
        }

        if (file == null || file.isEmpty()) {
            return buildResponse(HttpStatus.BAD_REQUEST, "请选择头像文件", null);
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            return buildResponse(HttpStatus.BAD_REQUEST, "仅支持图片格式", null);
        }

        try {
            Path avatarsDir = Paths.get("avatars");
            Files.createDirectories(avatarsDir);

            // Resize to 256x256 JPEG using Thumbnailator
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
            if (original == null) {
                return buildResponse(HttpStatus.BAD_REQUEST, "无法解析图片", null);
            }

            BufferedImage resized = net.coobird.thumbnailator.Thumbnails.of(original)
                    .size(256, 256)
                    .outputFormat("JPEG")
                    .outputQuality(0.85)
                    .asBufferedImage();

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(resized, "JPEG", output);
            byte[] resizedBytes = output.toByteArray();

            String filename = actor.getUsername() + ".jpg";
            Path filePath = avatarsDir.resolve(filename);
            Files.copy(new ByteArrayInputStream(resizedBytes), filePath, StandardCopyOption.REPLACE_EXISTING);

            String avatarUrl = "/avatars/" + filename;
            actor.setAvatarUrl(avatarUrl);
            User savedUser = userRepository.save(actor);

            return buildResponse(HttpStatus.OK, "头像上传成功", buildUserData(savedUser));
        } catch (IOException e) {
            return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "头像处理失败", null);
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, Object>> deleteOwnAccount(Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        try {
            String placeholder = userDeletionService.deleteRegularUser(actor);
            return buildResponse(HttpStatus.OK, "账号已注销", Map.of("id", actor.getId(), "placeholder", placeholder));
        } catch (ResponseStatusException error) {
            return buildResponse(
                    HttpStatus.valueOf(error.getStatusCode().value()),
                    error.getReason() == null ? error.getMessage() : error.getReason(),
                    null
            );
        }
    }

    private ResponseEntity<Map<String, Object>> updateUserProfile(User user, AuthRequest request) {
        String newName = normalizeRequired(request.getName());
        if (newName == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "昵称不能为空", null);
        }

        user.setName(newName);
        user.setEmail(normalizeOptional(request.getEmail()));
        user.setPhone(normalizeOptional(request.getPhone()));
        user.setCampus(defaultIfBlank(request.getCampus(), DEFAULT_CAMPUS));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBio(defaultIfBlank(request.getBio(), DEFAULT_BIO));

        User savedUser = userRepository.save(user);
        return buildResponse(HttpStatus.OK, "资料已更新", buildUserData(savedUser));
    }

    private boolean canAccessUser(User actor, User target) {
        return actor.getRole() == UserRole.ADMIN || actor.getUsername().equals(target.getUsername());
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

    private String normalizeAvatarDataUrl(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null || normalized.length() > 500_000) {
            return null;
        }
        if (!normalized.matches("^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\\r\\n]+$")) {
            return null;
        }
        return normalized;
    }

    private Map<String, Object> buildBalanceData(User user) {
        User normalizedUser = reconcileLegacyBalanceIfNeeded(user);
        Map<String, Object> data = buildUserData(normalizedUser);
        data.put("records", buildBalanceRecordsData(
                balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc(normalizedUser.getUsername())
        ));
        return data;
    }

    private Map<String, Object> buildUserData(User user) {
        User normalizedUser = reconcileLegacyBalanceIfNeeded(user);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", normalizedUser.getId());
        data.put("username", normalizedUser.getUsername());
        data.put("name", normalizedUser.getName());
        data.put("email", normalizedUser.getEmail());
        data.put("phone", normalizedUser.getPhone());
        data.put("campus", normalizedUser.getCampus());
        data.put("address", normalizedUser.getAddress());
        data.put("bio", normalizedUser.getBio());
        data.put("avatarUrl", normalizedUser.getAvatarUrl());
        data.put("balance", normalizedUser.getBalance());
        data.put("role", normalizedUser.getRole().name());
        data.put("permissions", adminPermissionService.toPermissionNames(normalizedUser));
        data.put("completedCount", taskRepository.countCompletedTasksForUser(normalizedUser.getUsername(), normalizedUser.getName()));
        data.put("completedAsPublisherCount", taskRepository.countByStatusAndAuthorUsername("completed", normalizedUser.getUsername()));
        data.put("completedAsAssigneeCount", taskRepository.countByStatusAndAssignee("completed", normalizedUser.getUsername()));
        data.put("averageRating", taskReviewRepository.averageRatingForUser(normalizedUser.getUsername()));
        data.put("reviewCount", taskReviewRepository.countByRevieweeUsername(normalizedUser.getUsername()));
        data.put("verificationStatus", normalizedUser.getVerificationStatus().name());
        data.put("verificationCampus", normalizedUser.getVerificationCampus());
        data.put("verificationStudentId", normalizedUser.getVerificationStudentId());
        data.put("verificationNote", normalizedUser.getVerificationNote());
        data.put("verificationSubmittedAt", normalizedUser.getVerificationSubmittedAt());
        data.put("verificationReviewedAt", normalizedUser.getVerificationReviewedAt());
        data.put("verificationReviewer", normalizedUser.getVerificationReviewer());
        return data;
    }

    private List<Map<String, Object>> buildBalanceRecordsData(List<BalanceRecord> records) {
        List<Map<String, Object>> data = new ArrayList<>();

        for (BalanceRecord record : records) {
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
            data.add(item);
        }

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

    private User reconcileLegacyBalanceIfNeeded(User user) {
        if (user == null) {
            return null;
        }

        BigDecimal currentBalance = user.getBalance() == null ? BigDecimal.ZERO : user.getBalance();
        if (currentBalance.compareTo(BigDecimal.ZERO) != 0 || balanceRecordRepository.existsByUsername(user.getUsername())) {
            return user;
        }

        BigDecimal publishedRewards = normalizeMoney(taskRepository.sumRewardsForPublishedTasks(user.getUsername(), user.getName()));
        BigDecimal completedIncome = normalizeMoney(taskRepository.sumCompletedRewardsForAssignee(user.getUsername()));
        BigDecimal reconciledBalance = completedIncome.subtract(publishedRewards);

        if (reconciledBalance.compareTo(BigDecimal.ZERO) == 0) {
            return user;
        }

        BigDecimal runningBalance = BigDecimal.ZERO;
        if (publishedRewards.compareTo(BigDecimal.ZERO) > 0) {
            runningBalance = runningBalance.subtract(publishedRewards);
            saveBalanceRecord(
                    user.getUsername(),
                    publishedRewards.negate(),
                    runningBalance,
                    "legacy_publish_reconcile",
                    "历史发布任务补录",
                    "根据历史发布任务自动生成",
                    null
            );
        }

        if (completedIncome.compareTo(BigDecimal.ZERO) > 0) {
            runningBalance = runningBalance.add(completedIncome);
            saveBalanceRecord(
                    user.getUsername(),
                    completedIncome,
                    runningBalance,
                    "legacy_income_reconcile",
                    "历史任务收入补录",
                    "根据历史完成任务自动生成",
                    null
            );
        }

        user.setBalance(runningBalance);
        return userRepository.save(user);
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
