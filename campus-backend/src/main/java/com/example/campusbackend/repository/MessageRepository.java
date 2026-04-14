package com.example.campusbackend.repository;

import com.example.campusbackend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByTaskIdOrderByIdAsc(Long taskId);

    @Modifying
    @Query("""
            update Message m
            set m.senderUsername = :placeholder
            where m.senderUsername = :username
            """)
    int anonymizeSender(@Param("username") String username, @Param("placeholder") String placeholder);
}
