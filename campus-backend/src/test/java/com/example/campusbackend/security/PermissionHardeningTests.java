package com.example.campusbackend.security;

import com.example.campusbackend.entity.AdminPermission;
import com.example.campusbackend.entity.PermissionAuditLog;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.PermissionAuditLogRepository;
import com.example.campusbackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
class PermissionHardeningTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionAuditLogRepository permissionAuditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String subAdminToken;
    private User subAdmin;

    @BeforeEach
    void setUp() throws Exception {
        permissionAuditLogRepository.deleteAll();
        userRepository.findByUsername("sub-admin").ifPresent(userRepository::delete);
        userRepository.findByUsername("target-user").ifPresent(userRepository::delete);
        userRepository.findByUsername("delegated-user").ifPresent(userRepository::delete);

        adminToken = TestAuthHelper.obtainToken(mockMvc, "admin001", "Admin123!");

        subAdmin = new User();
        subAdmin.setUsername("sub-admin");
        subAdmin.setPassword(passwordEncoder.encode("SubAdmin123!"));
        subAdmin.setName("Sub Admin");
        subAdmin.setRole(UserRole.USER);
        subAdmin.setPermissions(Set.of(AdminPermission.ADMIN_ACCESS, AdminPermission.USER_VIEW,
                AdminPermission.PERMISSION_GRANT));
        userRepository.save(subAdmin);
        subAdminToken = TestAuthHelper.obtainToken(mockMvc, "sub-admin", "SubAdmin123!");
    }

    @Test
    void subAdminCannotGrantPermissionTheyDoNotPossess() throws Exception {
        User target = createTargetUser();

        String body = "{\"permissions\": [\"ADMIN_ACCESS\", \"USER_VIEW\", \"BALANCE_ADJUST\"]}";
        mockMvc.perform(put("/api/admin/users/" + target.getId() + "/permissions")
                        .header("Authorization", "Bearer " + subAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("BALANCE_ADJUST")));
    }

    @Test
    void subAdminCannotRevokeOwnAdminAccess() throws Exception {
        String body = "{\"permissions\": [\"USER_VIEW\"]}";
        mockMvc.perform(put("/api/admin/users/" + subAdmin.getId() + "/permissions")
                        .header("Authorization", "Bearer " + subAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void subAdminCannotRevokeOwnPermissionGrant() throws Exception {
        String body = "{\"permissions\": [\"ADMIN_ACCESS\", \"USER_VIEW\"]}";
        mockMvc.perform(put("/api/admin/users/" + subAdmin.getId() + "/permissions")
                        .header("Authorization", "Bearer " + subAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanGrantPermissionsAndAuditLogIsCreated() throws Exception {
        User target = createTargetUser();

        String body = "{\"permissions\": [\"ADMIN_ACCESS\", \"USER_VIEW\"]}";
        mockMvc.perform(put("/api/admin/users/" + target.getId() + "/permissions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        User updated = userRepository.findById(target.getId()).orElseThrow();
        assertThat(updated.getPermissions()).contains(AdminPermission.ADMIN_ACCESS, AdminPermission.USER_VIEW);

        var logs = permissionAuditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(target.getId());
        assertThat(logs).isNotEmpty();
        assertThat(logs.get(0).getActorUsername()).isEqualTo("admin001");
        assertThat(logs.get(0).getAction()).isEqualTo("GRANT");
    }

    @Test
    void revokingPermissionCreatesRevokeAuditLog() throws Exception {
        User target = createTargetUser();
        target.setPermissions(Set.of(AdminPermission.ADMIN_ACCESS));
        userRepository.save(target);

        String body = "{\"permissions\": []}";
        mockMvc.perform(put("/api/admin/users/" + target.getId() + "/permissions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        var logs = permissionAuditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(target.getId());
        assertThat(logs).isNotEmpty();
        PermissionAuditLog revokeLog = logs.stream()
                .filter(log -> "REVOKE".equals(log.getAction()))
                .findFirst().orElse(null);
        assertThat(revokeLog).isNotNull();
        assertThat(revokeLog.getPermission()).isEqualTo(AdminPermission.ADMIN_ACCESS);
    }

    @Test
    void cascadeRevokeWhenPermissionGrantIsRemoved() throws Exception {
        User delegated = new User();
        delegated.setUsername("delegated-user");
        delegated.setPassword(passwordEncoder.encode("Delegated123!"));
        delegated.setName("Delegated User");
        delegated.setRole(UserRole.USER);
        delegated.setPermissions(Set.of(AdminPermission.ADMIN_ACCESS, AdminPermission.USER_VIEW));
        userRepository.save(delegated);

        PermissionAuditLog grantLog = new PermissionAuditLog();
        grantLog.setActorUsername("sub-admin");
        grantLog.setTargetUserId(delegated.getId());
        grantLog.setTargetUsername(delegated.getUsername());
        grantLog.setPermission(AdminPermission.ADMIN_ACCESS);
        grantLog.setAction("GRANT");
        permissionAuditLogRepository.save(grantLog);

        String body = "{\"permissions\": [\"ADMIN_ACCESS\", \"USER_VIEW\"]}";
        mockMvc.perform(put("/api/admin/users/" + subAdmin.getId() + "/permissions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        User updatedDelegated = userRepository.findById(delegated.getId()).orElseThrow();
        assertThat(updatedDelegated.getPermissions()).doesNotContain(AdminPermission.ADMIN_ACCESS);
    }

    @Test
    void grantOptionCheckAllowsPermissionGrantorPossesses() throws Exception {
        User target = createTargetUser();

        String body = "{\"permissions\": [\"ADMIN_ACCESS\"]}";
        mockMvc.perform(put("/api/admin/users/" + target.getId() + "/permissions")
                        .header("Authorization", "Bearer " + subAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    private User createTargetUser() {
        User target = new User();
        target.setUsername("target-user");
        target.setPassword(passwordEncoder.encode("Target123!"));
        target.setName("Target User");
        target.setRole(UserRole.USER);
        return userRepository.save(target);
    }
}
