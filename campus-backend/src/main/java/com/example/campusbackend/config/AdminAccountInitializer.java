package com.example.campusbackend.config;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.UserRepository;
import com.example.campusbackend.service.LegacyPasswordMigrationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;
    private final LegacyPasswordMigrationService legacyPasswordMigrationService;

    public AdminAccountInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SecurityProperties securityProperties,
            LegacyPasswordMigrationService legacyPasswordMigrationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityProperties = securityProperties;
        this.legacyPasswordMigrationService = legacyPasswordMigrationService;
    }

    @Override
    public void run(String... args) {
        legacyPasswordMigrationService.upgradeAllLegacyPasswords();

        String username = normalize(securityProperties.getAdmin().getUsername());
        String password = securityProperties.getAdmin().getPassword();
        if (username == null || password == null || password.isBlank()) {
            return;
        }

        User admin = userRepository.findByUsername(username).orElseGet(User::new);
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setName(normalize(securityProperties.getAdmin().getName()));
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        userRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.ADMIN)
                .filter(user -> !username.equals(user.getUsername()))
                .forEach(user -> {
                    user.setRole(UserRole.USER);
                    user.setPermissions(null);
                    userRepository.save(user);
                });
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
