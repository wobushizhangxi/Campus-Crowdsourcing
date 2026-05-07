package com.example.campusbackend.security;

import com.example.campusbackend.entity.BalanceRecord;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.BalanceRecordRepository;
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
import java.time.LocalDateTime;

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
class UserSelfServiceTests {

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
    void currentUserCanLoadOwnDataButCannotAccessOthersOrRecharge() throws Exception {
        User alice = createUser("alice001", "Alice", UserRole.USER, new BigDecimal("12.50"));
        User bob = createUser("bob001", "Bob", UserRole.USER, new BigDecimal("33.00"));
        User admin = createUser("admin001", "Admin", UserRole.ADMIN, new BigDecimal("0"));
        saveBalanceRecord("alice001", "task_income", new BigDecimal("12.50"), new BigDecimal("12.50"));
        saveBalanceRecord("bob001", "admin_adjustment", new BigDecimal("33.00"), new BigDecimal("33.00"));

        String aliceToken = jwtTokenService.generateToken(alice);
        String adminToken = jwtTokenService.generateToken(admin);

        mockMvc.perform(get("/api/users/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("alice001"));

        mockMvc.perform(get("/api/users/balance/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("alice001"))
                .andExpect(jsonPath("$.data.records[0].type").value("task_income"));

        mockMvc.perform(get("/api/users/balance/{username}", bob.getUsername())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/users/summary/{username}", bob.getUsername())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/users/balance/{username}", bob.getUsername())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("bob001"));

        mockMvc.perform(post("/api/users/balance/recharge")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "alice001",
                                  "amount": "10.00"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void profileUpdateOnlyAppliesToAuthenticatedUser() throws Exception {
        User alice = createUser("alice002", "Alice 2", UserRole.USER, new BigDecimal("5.00"));
        User bob = createUser("bob002", "Bob 2", UserRole.USER, new BigDecimal("9.00"));
        String aliceToken = jwtTokenService.generateToken(alice);

        mockMvc.perform(put("/api/users/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "hacker001",
                                  "name": "Alice Updated",
                                  "email": "alice@example.com",
                                  "phone": "13800000000",
                                  "campus": "north-campus",
                                  "address": "Dorm 3",
                                  "bio": "Updated bio"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("alice002"))
                .andExpect(jsonPath("$.data.name").value("Alice Updated"))
                .andExpect(jsonPath("$.data.email").value("alice@example.com"));

        mockMvc.perform(put("/api/users/{id}/profile", bob.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Should Not Work"
                                }
                                """))
                .andExpect(status().isForbidden());

        User updatedAlice = userRepository.findByUsername("alice002").orElseThrow();
        assertThat(updatedAlice.getName()).isEqualTo("Alice Updated");
        assertThat(updatedAlice.getUsername()).isEqualTo("alice002");
    }

    @Test
    void bannedUserCannotUpdateProfile() throws Exception {
        User user = createUser("banned002", "Banned 2", UserRole.USER, new BigDecimal("1.00"));
        user.setBanned(true);
        userRepository.save(user);
        String token = jwtTokenService.generateToken(user);

        mockMvc.perform(put("/api/users/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "newName"
                                }
                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void currentUserCanUpdateAvatarAndReadItFromProfile() throws Exception {
        User alice = createUser("aliceAvatar", "Alice Avatar", UserRole.USER, new BigDecimal("3.00"));
        String avatarDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        String aliceToken = jwtTokenService.generateToken(alice);

        mockMvc.perform(put("/api/users/avatar")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "avatarDataUrl": "%s"
                                }
                                """.formatted(avatarDataUrl)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value(avatarDataUrl));

        mockMvc.perform(get("/api/users/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value(avatarDataUrl));
    }

    @Test
    void currentUserCanDeleteOwnAccountAndAnonymizeHistory() throws Exception {
        User alice = createUser("alice003", "Alice 3", UserRole.USER, new BigDecimal("7.00"));
        Task task = new Task();
        task.setTitle("Pick up package");
        task.setDescription("Dorm gate");
        task.setStatus("open");
        task.setAuthor("Alice 3");
        task.setAuthorUsername("alice003");
        task.setReward(new BigDecimal("5.00"));
        Task savedTask = taskRepository.save(task);
        saveBalanceRecord("alice003", "task_publish", new BigDecimal("-5.00"), new BigDecimal("7.00"));

        String aliceToken = jwtTokenService.generateToken(alice);

        mockMvc.perform(delete("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.placeholder").value("deleted-user-" + alice.getId()));

        assertThat(userRepository.findByUsername("alice003")).isEmpty();
        Task anonymizedTask = taskRepository.findById(savedTask.getId()).orElseThrow();
        assertThat(anonymizedTask.getAuthorUsername()).isEqualTo("deleted-user-" + alice.getId());
        assertThat(anonymizedTask.getAuthor()).isEqualTo("已注销用户");
        assertThat(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc("deleted-user-" + alice.getId()))
                .hasSize(1);
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

    private void saveBalanceRecord(String username, String type, BigDecimal amount, BigDecimal balanceAfter) {
        BalanceRecord record = new BalanceRecord();
        record.setUsername(username);
        record.setType(type);
        record.setTitle(type);
        record.setDescription(type);
        record.setAmount(amount);
        record.setBalanceAfter(balanceAfter);
        record.setCreatedAt(LocalDateTime.now());
        balanceRecordRepository.save(record);
    }
}
