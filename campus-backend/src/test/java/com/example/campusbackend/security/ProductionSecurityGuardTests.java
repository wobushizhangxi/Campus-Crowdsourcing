package com.example.campusbackend.security;

import com.example.campusbackend.config.ProductionSecurityGuard;
import com.example.campusbackend.config.SecurityProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionSecurityGuardTests {

    @Test
    void defaultProfileAllowsLocalDemoDefaults() {
        SecurityProperties properties = new SecurityProperties();
        properties.getAdmin().setUsername("admin001");
        properties.getAdmin().setPassword("Admin123!");

        assertThatCode(() -> new ProductionSecurityGuard(properties, new MockEnvironment()).run())
                .doesNotThrowAnyException();
    }

    @Test
    void productionProfileRejectsDefaultJwtSecret() {
        SecurityProperties properties = new SecurityProperties();
        properties.getAdmin().setUsername("admin001");
        properties.getAdmin().setPassword("StrongAdminPassword123!");

        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.profiles.active", "production");

        assertThatThrownBy(() -> new ProductionSecurityGuard(properties, environment).run())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_SECURITY_JWT_SECRET");
    }

    @Test
    void productionProfileRejectsDefaultDesktopAdminPassword() {
        SecurityProperties properties = new SecurityProperties();
        properties.getJwt().setSecret("a-production-secret-with-more-than-32-bytes");
        properties.getAdmin().setUsername("admin001");
        properties.getAdmin().setPassword("Admin123!");

        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.profiles.active", "prod");

        assertThatThrownBy(() -> new ProductionSecurityGuard(properties, environment).run())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_SECURITY_ADMIN_PASSWORD");
    }
}
