package com.example.campusbackend.security;

import com.example.campusbackend.config.AdminAccountInitializer;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.LegacyPasswordMigrationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.security.admin.username=admin001",
        "app.security.admin.password=Admin123!",
        "app.security.admin.name=平台管理员",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class SecurityBootstrapTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminAccountInitializer adminAccountInitializer;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LegacyPasswordMigrationService legacyPasswordMigrationService;

    @Test
    void anonymousUserCannotLoadTasks() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousUserCanLoadFrontendEntry() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousUserCanLoadTaskCategories() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk());
    }

    @Test
    void androidWebViewCanPreflightAuthRequests() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "capacitor://localhost")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET,POST,PUT,PATCH,DELETE,OPTIONS"));
    }

    @Test
    void startupCreatesAdminAccountWithHashedPasswordAndRoleField() {
        User admin = userRepository.findByUsername("admin001").orElseThrow();

        assertThat(admin.getPassword()).startsWith("$2");
        assertThat(Arrays.stream(User.class.getDeclaredFields()).map(Field::getName))
                .contains("role");
    }

    @Test
    void configuredAdminRemainsAdminAndOtherLegacyAdminsAreDemoted() throws Exception {
        User legacyAdmin = new User();
        legacyAdmin.setUsername("legacy-admin");
        legacyAdmin.setPassword(passwordEncoder.encode("Secret123!"));
        legacyAdmin.setName("Legacy Admin");
        legacyAdmin.setRole(UserRole.ADMIN);
        userRepository.save(legacyAdmin);

        adminAccountInitializer.run();

        assertThat(userRepository.findByUsername("admin001").orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(userRepository.findByUsername("legacy-admin").orElseThrow().getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void startupMigratesLegacyPlaintextPasswordsToHashes() {
        User legacyUser = new User();
        legacyUser.setUsername("legacy-plain");
        legacyUser.setPassword("123456");
        legacyUser.setName("Legacy Plain");
        legacyUser.setRole(UserRole.USER);
        userRepository.save(legacyUser);

        adminAccountInitializer.run();

        User migratedUser = userRepository.findByUsername("legacy-plain").orElseThrow();
        assertThat(legacyPasswordMigrationService.isHashed(migratedUser.getPassword())).isTrue();
    }
}
