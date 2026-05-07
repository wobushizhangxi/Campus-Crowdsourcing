package com.example.campusbackend;

import com.example.campusbackend.entity.AdminPermission;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.entity.VerificationStatus;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.security.JwtTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class MarketplaceCoreUpgradeTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private BalanceRecordRepository balanceRecordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenService jwtTokenService;

    @BeforeEach
    void cleanUp() {
        balanceRecordRepository.deleteAll();
        taskRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void acceptedTaskMustBeSubmittedBeforePublisherApproval() throws Exception {
        User publisher = createUser("publisher001", "Publisher", UserRole.USER, new BigDecimal("11.20"));
        User runner = createUser("runner001", "Runner", UserRole.USER, new BigDecimal("5.50"));
        Task task = createTask("accepted", "publisher001", "Publisher", "runner001", new BigDecimal("8.80"));

        String publisherToken = jwtTokenService.generateToken(publisher);
        String runnerToken = jwtTokenService.generateToken(runner);

        mockMvc.perform(post("/api/tasks/{id}/approve", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("任务需先由接单人提交完成"));

        mockMvc.perform(post("/api/tasks/{id}/submit", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "note": "资料已送达图书馆前台。"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("submitted"))
                .andExpect(jsonPath("$.data.task.submissionNote").value("资料已送达图书馆前台。"));

        mockMvc.perform(post("/api/tasks/{id}/approve", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("completed"));

        User updatedRunner = userRepository.findByUsername("runner001").orElseThrow();
        assertThat(updatedRunner.getBalance()).isEqualByComparingTo("14.30");

        mockMvc.perform(post("/api/tasks/{id}/approve", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());

        User runnerAfterDuplicateAttempt = userRepository.findByUsername("runner001").orElseThrow();
        assertThat(runnerAfterDuplicateAttempt.getBalance()).isEqualByComparingTo("14.30");
    }

    @Test
    void openTaskCancelRefundsPublisher() throws Exception {
        User publisher = createUser("publisher002", "Publisher 2", UserRole.USER, new BigDecimal("11.20"));
        Task task = createTask("open", "publisher002", "Publisher 2", null, new BigDecimal("8.80"));
        String publisherToken = jwtTokenService.generateToken(publisher);

        mockMvc.perform(post("/api/tasks/{id}/cancel", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "临时不需要了"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("cancelled"))
                .andExpect(jsonPath("$.data.task.cancelReason").value("临时不需要了"));

        User updatedPublisher = userRepository.findByUsername("publisher002").orElseThrow();
        assertThat(updatedPublisher.getBalance()).isEqualByComparingTo("20.00");
        assertThat(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc("publisher002"))
                .anySatisfy(record -> {
                    assertThat(record.getType()).isEqualTo("task_refund");
                    assertThat(record.getAmount()).isEqualByComparingTo("8.80");
                });
    }

    @Test
    void disputedTaskCanBeResolvedByAdminToRefundOrComplete() throws Exception {
        User publisher = createUser("publisher003", "Publisher 3", UserRole.USER, new BigDecimal("11.20"));
        User runner = createUser("runner003", "Runner 3", UserRole.USER, new BigDecimal("5.50"));
        User admin = createUser("admin003", "Admin 3", UserRole.ADMIN, BigDecimal.ZERO);
        Task refundTask = createTask("accepted", "publisher003", "Publisher 3", "runner003", new BigDecimal("8.80"));
        Task payoutTask = createTask("accepted", "publisher003", "Publisher 3", "runner003", new BigDecimal("4.00"));

        String publisherToken = jwtTokenService.generateToken(publisher);
        String adminToken = jwtTokenService.generateToken(admin);

        mockMvc.perform(post("/api/tasks/{id}/dispute", refundTask.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "接单人无法完成"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("disputed"));

        mockMvc.perform(post("/api/admin/tasks/{id}/resolve", refundTask.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolution": "refund",
                                  "note": "双方协商退款"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("cancelled"));

        mockMvc.perform(post("/api/tasks/{id}/dispute", payoutTask.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "需要管理员确认"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("disputed"));

        mockMvc.perform(post("/api/admin/tasks/{id}/resolve", payoutTask.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolution": "complete",
                                  "note": "确认接单人已完成"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("completed"));

        User updatedPublisher = userRepository.findByUsername("publisher003").orElseThrow();
        User updatedRunner = userRepository.findByUsername("runner003").orElseThrow();
        assertThat(updatedPublisher.getBalance()).isEqualByComparingTo("20.00");
        assertThat(updatedRunner.getBalance()).isEqualByComparingTo("9.50");
    }

    @Test
    void delegatedAdminAccessCanResolveDisputedTask() throws Exception {
        User publisher = createUser("publisher006", "Publisher 6", UserRole.USER, new BigDecimal("11.20"));
        createUser("runner006", "Runner 6", UserRole.USER, new BigDecimal("5.50"));
        User delegate = createUser("delegate006", "Delegate 6", UserRole.USER, BigDecimal.ZERO);
        delegate.setPermissions(Set.of(AdminPermission.ADMIN_ACCESS));
        userRepository.save(delegate);
        Task task = createTask("accepted", "publisher006", "Publisher 6", "runner006", new BigDecimal("8.80"));

        String publisherToken = jwtTokenService.generateToken(publisher);
        String delegateToken = jwtTokenService.generateToken(delegate);

        mockMvc.perform(post("/api/tasks/{id}/dispute", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "需要后台介入"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("disputed"));

        mockMvc.perform(post("/api/admin/tasks/{id}/resolve", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolution": "refund",
                                  "note": "授权后台账号裁定退款"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("cancelled"));
    }

    @Test
    void completedTaskCanBeReviewedOnceByEachSide() throws Exception {
        User publisher = createUser("publisher004", "Publisher 4", UserRole.USER, new BigDecimal("10.00"));
        User runner = createUser("runner004", "Runner 4", UserRole.USER, new BigDecimal("10.00"));
        Task task = createTask("completed", "publisher004", "Publisher 4", "runner004", new BigDecimal("6.00"));

        String publisherToken = jwtTokenService.generateToken(publisher);
        String runnerToken = jwtTokenService.generateToken(runner);

        mockMvc.perform(post("/api/tasks/{id}/reviews", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rating": 5,
                                  "content": "沟通顺畅，完成很快。"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.review.revieweeUsername").value("runner004"))
                .andExpect(jsonPath("$.data.review.rating").value(5));

        mockMvc.perform(post("/api/tasks/{id}/reviews", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rating": 4,
                                  "content": "重复评价"
                                }
                                """))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/tasks/{id}/reviews", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rating": 4,
                                  "content": "需求清楚，结算及时。"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.review.revieweeUsername").value("publisher004"))
                .andExpect(jsonPath("$.data.review.rating").value(4));

        mockMvc.perform(get("/api/tasks/{id}/reviews", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));

        mockMvc.perform(get("/api/users/summary/{username}", "runner004")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.averageRating").value(5.0))
                .andExpect(jsonPath("$.data.reviewCount").value(1));

        mockMvc.perform(get("/api/users/summary/{username}", "publisher004")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.averageRating").value(4.0))
                .andExpect(jsonPath("$.data.reviewCount").value(1));
    }

    @Test
    void userCanSubmitVerificationAndAdminCanApproveOrReject() throws Exception {
        User alice = createUser("alice005", "Alice 5", UserRole.USER, BigDecimal.ZERO);
        User bob = createUser("bob005", "Bob 5", UserRole.USER, BigDecimal.ZERO);
        User admin = createUser("admin005", "Admin 5", UserRole.ADMIN, BigDecimal.ZERO);
        String aliceToken = jwtTokenService.generateToken(alice);
        String bobToken = jwtTokenService.generateToken(bob);
        String adminToken = jwtTokenService.generateToken(admin);

        mockMvc.perform(post("/api/users/verification/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "campus": "主校区",
                                  "studentId": "20260001",
                                  "note": "学生证信息与账号一致。"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.verificationCampus").value("主校区"));

        mockMvc.perform(get("/api/admin/verifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("alice005"))
                .andExpect(jsonPath("$.data[0].verificationStatus").value("PENDING"));

        mockMvc.perform(post("/api/admin/verifications/{userId}/approve", alice.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "note": "信息匹配"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.data.verificationReviewer").value("admin005"));

        mockMvc.perform(post("/api/users/verification/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "campus": "主校区",
                                  "studentId": "20260002",
                                  "note": "申请认证。"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"));

        mockMvc.perform(post("/api/admin/verifications/{userId}/reject", bob.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "note": "学号信息不完整"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.verificationNote").value("学号信息不完整"));
    }

    @Test
    void taskListIncludesAuthorAndAssigneeVerificationSummary() throws Exception {
        User publisher = createUser("publisher007", "Publisher 7", UserRole.USER, BigDecimal.ZERO);
        publisher.setVerificationStatus(VerificationStatus.VERIFIED);
        userRepository.save(publisher);
        User runner = createUser("runner007", "Runner 7", UserRole.USER, BigDecimal.ZERO);
        runner.setVerificationStatus(VerificationStatus.PENDING);
        userRepository.save(runner);
        createTask("accepted", "publisher007", "Publisher 7", "runner007", new BigDecimal("6.00"));
        String publisherToken = jwtTokenService.generateToken(publisher);

        mockMvc.perform(get("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].authorVerificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$[0].assigneeVerificationStatus").value("PENDING"));
    }

    @Test
    void verificationAuthorizationRulesAreEnforced() throws Exception {
        User applicant = createUser("alice008", "Alice 8", UserRole.USER, BigDecimal.ZERO);
        applicant.setVerificationStatus(VerificationStatus.PENDING);
        userRepository.save(applicant);
        User ordinaryUser = createUser("bob008", "Bob 8", UserRole.USER, BigDecimal.ZERO);
        User bannedUser = createUser("banned008", "Banned 8", UserRole.USER, BigDecimal.ZERO);
        bannedUser.setBanned(true);
        userRepository.save(bannedUser);

        String ordinaryToken = jwtTokenService.generateToken(ordinaryUser);
        String bannedToken = jwtTokenService.generateToken(bannedUser);

        mockMvc.perform(post("/api/admin/verifications/{userId}/approve", applicant.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ordinaryToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "note": "try approve"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/verifications/{userId}/reject", applicant.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtTokenService.generateToken(createUser("admin008", "Admin 8", UserRole.ADMIN, BigDecimal.ZERO)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "note": " "
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/users/verification/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bannedToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "campus": "主校区",
                                  "studentId": "20260008"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void taskListMarksWhetherCurrentUserAlreadyReviewedCompletedTask() throws Exception {
        User publisher = createUser("publisher009", "Publisher 9", UserRole.USER, BigDecimal.ZERO);
        createUser("runner009", "Runner 9", UserRole.USER, BigDecimal.ZERO);
        Task task = createTask("completed", "publisher009", "Publisher 9", "runner009", new BigDecimal("6.00"));
        String publisherToken = jwtTokenService.generateToken(publisher);

        mockMvc.perform(post("/api/tasks/{id}/reviews", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rating": 5,
                                  "content": "well done"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].currentUserReviewSubmitted").value(true));
    }

    @Test
    void adminCanManageTaskCategoriesButCannotDeleteReferencedCategory() throws Exception {
        User admin = createUser("admin010", "Admin 10", UserRole.ADMIN, BigDecimal.ZERO);
        User user = createUser("user010", "User 10", UserRole.USER, BigDecimal.ZERO);
        String adminToken = jwtTokenService.generateToken(admin);
        String userToken = jwtTokenService.generateToken(user);

        String createdCategoryLocation = mockMvc.perform(post("/api/admin/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "代办"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("代办"))
                .andReturn()
                .getResponse()
                .getHeader("Location");

        Long categoryId = Long.valueOf(createdCategoryLocation.substring(createdCategoryLocation.lastIndexOf('/') + 1));

        mockMvc.perform(get("/api/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("代办"));

        mockMvc.perform(put("/api/admin/categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "校园跑腿"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("校园跑腿"));

        Task task = createTask("open", "user010", "User 10", null, new BigDecimal("3.00"));
        task.setCategory("校园跑腿");
        taskRepository.save(task);

        mockMvc.perform(delete("/api/admin/categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict());
    }

    private User createUser(String username, String name, UserRole role, BigDecimal balance) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode("Secret123!"));
        user.setName(name);
        user.setRole(role);
        user.setBalance(balance);
        return userRepository.save(user);
    }

    private Task createTask(String status, String authorUsername, String author, String assignee, BigDecimal reward) {
        Task task = new Task();
        task.setTitle("Deliver Documents");
        task.setDescription("Deliver the documents to the library.");
        task.setReward(reward);
        task.setStatus(status);
        task.setAuthorUsername(authorUsername);
        task.setAuthor(author);
        task.setAssignee(assignee);
        return taskRepository.save(task);
    }
}
