package com.example.campusbackend;

import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class TaskCompletionFlowTests {

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
    void completeTaskUpdatesBalanceAndSummary() throws Exception {
        User publisher = createUser("publisher001", "Publisher", new BigDecimal("10.00"));
        User runner = createUser("runner001", "Runner", new BigDecimal("5.50"));

        Task task = new Task();
        task.setTitle("Deliver Documents");
        task.setDescription("Deliver the documents to the library.");
        task.setReward(new BigDecimal("8.80"));
        task.setStatus("accepted");
        task.setAuthor("Publisher");
        task.setAuthorUsername("publisher001");
        task.setAssignee("runner001");
        Task savedTask = taskRepository.save(task);
        String publisherToken = jwtTokenService.generateToken(publisher);
        String runnerToken = jwtTokenService.generateToken(runner);

        mockMvc.perform(post("/api/tasks/{id}/complete", savedTask.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("completed"));

        Task completedTask = taskRepository.findById(savedTask.getId()).orElseThrow();
        User updatedRunner = userRepository.findByUsername("runner001").orElseThrow();

        assertThat(completedTask.getCompletedAt()).isNotNull();
        assertThat(updatedRunner.getBalance()).isEqualByComparingTo("14.30");

        mockMvc.perform(get("/api/users/summary/{username}", "runner001")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + runnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value(14.30))
                .andExpect(jsonPath("$.data.completedCount").value(1));

        mockMvc.perform(get("/api/users/summary/{username}", "publisher001")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedCount").value(1));
    }

    @Test
    void createTaskDeductsPublisherBalanceAndRejectsInsufficientBalance() throws Exception {
        User publisher = createUser("publisher002", "Publisher 2", new BigDecimal("6.00"));
        String publisherToken = jwtTokenService.generateToken(publisher);

        mockMvc.perform(post("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  \"title\": \"Pick up lunch\",
                                  \"description\": \"Take lunch to dormitory.\",
                                  \"reward\": 4.50,
                                  \"author\": \"Publisher 2\",
                                  \"authorUsername\": \"publisher002\"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.task.status").value("open"))
                .andExpect(jsonPath("$.data.task.authorUsername").value("publisher002"));

        User updatedPublisher = userRepository.findByUsername("publisher002").orElseThrow();
        assertThat(updatedPublisher.getBalance()).isEqualByComparingTo("1.50");
        assertThat(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc("publisher002")).hasSize(1);

        mockMvc.perform(post("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  \"title\": \"Buy coffee\",
                                  \"description\": \"Bring coffee to classroom.\",
                                  \"reward\": 3.00,
                                  \"author\": \"Publisher 2\",
                                  \"authorUsername\": \"publisher002\"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("余额不足"));
    }

    private User createUser(String username, String name, BigDecimal balance) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode("Secret123!"));
        user.setName(name);
        user.setRole(UserRole.USER);
        user.setBalance(balance);
        return userRepository.save(user);
    }
}
