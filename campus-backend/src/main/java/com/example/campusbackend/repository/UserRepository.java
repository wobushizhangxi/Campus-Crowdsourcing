package com.example.campusbackend.repository;

import com.example.campusbackend.entity.VerificationStatus;
import com.example.campusbackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    List<User> findByVerificationStatusOrderByVerificationSubmittedAtAsc(VerificationStatus verificationStatus);
}
