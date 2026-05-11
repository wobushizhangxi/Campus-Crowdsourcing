package com.example.campusbackend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class ProductionSecurityGuard implements ApplicationRunner {

    private static final String DEFAULT_JWT_SECRET = "change-me-in-production-jwt-secret-2026";
    private static final String DEFAULT_DESKTOP_ADMIN_PASSWORD = "Admin123!";

    private final SecurityProperties securityProperties;
    private final Environment environment;

    public ProductionSecurityGuard(SecurityProperties securityProperties, Environment environment) {
        this.securityProperties = securityProperties;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isProductionProfile()) {
            return;
        }

        requireProductionSecret(
                securityProperties.getJwt().getSecret(),
                DEFAULT_JWT_SECRET,
                "APP_SECURITY_JWT_SECRET"
        );
        requireProductionSecret(
                securityProperties.getAdmin().getPassword(),
                DEFAULT_DESKTOP_ADMIN_PASSWORD,
                "APP_SECURITY_ADMIN_PASSWORD"
        );
    }

    public void run() {
        run(null);
    }

    private boolean isProductionProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
    }

    private void requireProductionSecret(String value, String disallowedDefault, String environmentVariableName) {
        String normalizedValue = normalize(value);
        if (normalizedValue == null || normalizedValue.length() < 32 || disallowedDefault.equals(normalizedValue)) {
            throw new IllegalStateException(
                    environmentVariableName + " must be configured with a non-default value for production."
            );
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
