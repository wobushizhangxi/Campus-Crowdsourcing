package com.example.campusbackend.repository;

import com.example.campusbackend.entity.PermissionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PermissionAuditLogRepository extends JpaRepository<PermissionAuditLog, Long> {

    List<PermissionAuditLog> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);

    List<PermissionAuditLog> findByActorUsernameAndActionOrderByCreatedAtDesc(String actorUsername, String action);

    List<PermissionAuditLog> findByActorUsernameOrderByCreatedAtDesc(String actorUsername);
}
