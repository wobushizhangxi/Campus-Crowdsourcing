package com.example.campusbackend.auth;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

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
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void registerStoresHashedPasswordAndDefaultUserRole() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "20249999",
                                  "password": "Secret123!",
                                  "name": "New User",
                                  "email": "new@example.com"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.username").value("20249999"))
                .andExpect(jsonPath("$.data.user.role").value("USER"))
                .andExpect(jsonPath("$.data.token").isString());

        User savedUser = userRepository.findByUsername("20249999").orElseThrow();
        assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
        assertThat(savedUser.getPassword()).startsWith("$2");
    }

    @Test
    void loginReturnsJwtAndUpgradesLegacyPlaintextPassword() throws Exception {
        User legacyUser = new User();
        legacyUser.setUsername("legacy001");
        legacyUser.setPassword("123456");
        legacyUser.setName("Legacy User");
        legacyUser.setRole(UserRole.USER);
        userRepository.save(legacyUser);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "legacy001",
                                  "password": "123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.username").value("legacy001"));

        User updatedUser = userRepository.findByUsername("legacy001").orElseThrow();
        assertThat(updatedUser.getPassword()).startsWith("$2");
    }

    @Test
    void meReturnsCurrentUserForBearerToken() throws Exception {
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "viewer001",
                                  "password": "Secret123!",
                                  "name": "Viewer",
                                  "email": "viewer@example.com"
                                }
                                """))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String jwt = JsonPath.read(response, "$.data.token");

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.username").value("viewer001"));
    }

    @Test
    void loginFailureMessagesAreLocalizedInChinese() throws Exception {
        User legacyUser = new User();
        legacyUser.setUsername("legacy002");
        legacyUser.setPassword("123456");
        legacyUser.setName("Legacy User 2");
        legacyUser.setRole(UserRole.USER);
        userRepository.save(legacyUser);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "legacy002",
                                  "password": "wrong-password"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("密码错误"));
    }
}
