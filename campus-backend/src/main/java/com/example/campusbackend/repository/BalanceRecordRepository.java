package com.example.campusbackend.repository;

import com.example.campusbackend.entity.BalanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BalanceRecordRepository extends JpaRepository<BalanceRecord, Long> {
    boolean existsByUsername(String username);

    List<BalanceRecord> findTop50ByUsernameOrderByCreatedAtDesc(String username);

    @Modifying
    @Query("""
            update BalanceRecord b
            set b.username = :placeholder
            where b.username = :username
            """)
    int anonymizeUsername(@Param("username") String username, @Param("placeholder") String placeholder);
}
