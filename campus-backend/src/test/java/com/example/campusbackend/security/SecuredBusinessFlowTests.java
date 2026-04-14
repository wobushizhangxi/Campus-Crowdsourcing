package com.example.campusbackend.security;

import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
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

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.assertj.core.api.Assertions.assertThat;
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
class SecuredBusinessFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenService jwtTokenService;

    @BeforeEach
    void cleanUp() {
        taskRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createTaskUsesAuthenticatedPublisherInsteadOfPayloadUsername() throws Exception {
        String publisherToken = registerAndIssueToken("publisher001", "Publisher", UserRole.USER);

        mockMvc.perform(post("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Pick up lunch",
                                  "description": "Take lunch to dormitory.",
                                  "reward": 4.50,
                                  "authorUsername": "forged-user",
                                  "author": "Forged Name"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.task.authorUsername").value("publisher001"));

        Task savedTask = taskRepository.findAll().get(0);
        assertThat(savedTask.getAuthorUsername()).isEqualTo("publisher001");
    }

    @Test
    void normalUserCannotAdjustBalanceButAdminCan() throws Exception {
        String userToken = registerAndIssueToken("runner001", "Runner", UserRole.USER);
        String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
        User runner = userRepository.findByUsername("runner001").orElseThrow();
        runner.setBalance(BigDecimal.ZERO);
        userRepository.save(runner);

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", runner.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", runner.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value(10.00));
    }

    @Test
    void adminCanGrantScopedPermissionsToDelegateUser() throws Exception {
        String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
        String delegateToken = registerAndIssueToken("delegate001", "Delegate", UserRole.USER);
        User delegate = userRepository.findByUsername("delegate001").orElseThrow();
        delegate.setBalance(BigDecimal.ZERO);
        userRepository.save(delegate);

        mockMvc.perform(get("/api/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/users/{id}/permissions", delegate.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "permissions": ["ADMIN_ACCESS", "USER_VIEW"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissions").value(containsInAnyOrder("ADMIN_ACCESS", "USER_VIEW")));

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.permissions").value(containsInAnyOrder("ADMIN_ACCESS", "USER_VIEW")));

        mockMvc.perform(get("/api/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", delegate.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/users/{id}/permissions", delegate.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "permissions": ["ADMIN_ACCESS", "USER_VIEW", "BALANCE_ADJUST"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissions").value(containsInAnyOrder("ADMIN_ACCESS", "USER_VIEW", "BALANCE_ADJUST")));

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", delegate.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + delegateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value(10.00));
    }

    @Test
    void nonParticipantCannotReadTaskMessages() throws Exception {
        String publisherToken = registerAndIssueToken("publisher002", "Publisher 2", UserRole.USER);
        String strangerToken = registerAndIssueToken("stranger001", "Stranger", UserRole.USER);
        Task task = createAcceptedTask("publisher002", "publisher002");

        mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + strangerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk());
    }

    @Test
    void authAndAdminPayloadContainBannedFlag() throws Exception {
        String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
        User user = createUser("user100", "User 100", UserRole.USER, new BigDecimal("1.00"));
        user.setBanned(true);
        userRepository.save(user);
        String userToken = jwtTokenService.generateToken(user);

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.banned").value(true));

        mockMvc.perform(get("/api/admin/users/{id}", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.banned").value(true));
    }

    @Test
    void adminCanBanAndUnbanNormalUser() throws Exception {
        String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
        User user = createUser("user200", "User 200", UserRole.USER, new BigDecimal("1.00"));

        mockMvc.perform(post("/api/admin/users/{id}/ban", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.banned").value(true));

        mockMvc.perform(post("/api/admin/users/{id}/unban", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.banned").value(false));
    }

    @Test
    void adminCannotBanAdminRoleUser() throws Exception {
        String adminToken = registerAndIssueToken("admin001", "Admin", UserRole.ADMIN);
        User anotherAdmin = createUser("admin002", "Admin 2", UserRole.ADMIN, new BigDecimal("1.00"));

        mockMvc.perform(post("/api/admin/users/{id}/ban", anotherAdmin.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    private String registerAndIssueToken(String username, String name, UserRole role) {
        User savedUser = createUser(username, name, role, new BigDecimal("20.00"));
        return jwtTokenService.generateToken(savedUser);
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

    private Task createAcceptedTask(String authorUsername, String assigneeUsername) {
        Task task = new Task();
        task.setTitle("Deliver Documents");
        task.setDescription("Deliver the documents to the library.");
        task.setReward(new BigDecimal("8.80"));
        task.setStatus("accepted");
        task.setAuthorUsername(authorUsername);
        task.setAuthor(authorUsername);
        task.setAssignee(assigneeUsername);
        return taskRepository.save(task);
    }
}
