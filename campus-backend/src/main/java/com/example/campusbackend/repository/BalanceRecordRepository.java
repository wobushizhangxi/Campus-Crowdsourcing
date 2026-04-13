package com.example.campusbackend.repository;

import com.example.campusbackend.entity.BalanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BalanceRecordRepository extends JpaRepository<BalanceRecord, Long> {
    boolean existsByUsername(String username);

    List<BalanceRecord> findTop50ByUsernameOrderByCreatedAtDesc(String username);
}
