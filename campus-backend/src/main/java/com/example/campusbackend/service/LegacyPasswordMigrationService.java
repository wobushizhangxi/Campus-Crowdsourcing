package com.example.campusbackend.service;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LegacyPasswordMigrationService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public LegacyPasswordMigrationService(
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    public boolean isHashed(String passwordValue) {
        return passwordValue != null && passwordValue.startsWith("$2");
    }

    public boolean matchesAndUpgrade(User user, String rawPassword) {
        if (user == null || rawPassword == null) {
            return false;
        }

        if (isHashed(user.getPassword())) {
            return passwordEncoder.matches(rawPassword, user.getPassword());
        }

        if (!rawPassword.equals(user.getPassword())) {
            return false;
        }

        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
        return true;
    }

    public int upgradeAllLegacyPasswords() {
        List<User> legacyUsers = userRepository.findAll().stream()
                .filter(user -> !isHashed(user.getPassword()))
                .toList();

        for (User legacyUser : legacyUsers) {
            legacyUser.setPassword(passwordEncoder.encode(legacyUser.getPassword()));
            userRepository.save(legacyUser);
        }

        return legacyUsers.size();
    }
}
