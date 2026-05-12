package com.example.campusbackend.service;

import com.example.campusbackend.entity.AdminPermission;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AdminPermissionService {

    public boolean canAccessAdminPanel(User user) {
        return hasPermission(user, AdminPermission.ADMIN_ACCESS);
    }

    public boolean canViewUsers(User user) {
        return hasPermission(user, AdminPermission.USER_VIEW);
    }

    public boolean canAdjustBalance(User user) {
        return hasPermission(user, AdminPermission.BALANCE_ADJUST);
    }

    public boolean canGrantPermissions(User user) {
        return hasPermission(user, AdminPermission.PERMISSION_GRANT);
    }

    public boolean hasPermission(User user, AdminPermission permission) {
        if (user == null || permission == null) {
            return false;
        }
        return user.getRole() == UserRole.ADMIN || user.getPermissions().contains(permission);
    }

    public boolean canGrantPermission(User actor, AdminPermission permission) {
        if (actor == null || permission == null) {
            return false;
        }
        return actor.getRole() == UserRole.ADMIN || hasPermission(actor, permission);
    }

    public Set<AdminPermission> normalizePermissions(Collection<String> rawPermissions) {
        Set<AdminPermission> permissions = new LinkedHashSet<>();
        if (rawPermissions == null) {
            return permissions;
        }
        for (String rawPermission : rawPermissions) {
            if (rawPermission == null || rawPermission.trim().isEmpty()) {
                continue;
            }
            permissions.add(AdminPermission.valueOf(rawPermission.trim().toUpperCase(Locale.ROOT)));
        }
        return permissions;
    }

    public List<String> toPermissionNames(User user) {
        return user.getPermissions().stream()
                .map(AdminPermission::name)
                .sorted(Comparator.naturalOrder())
                .toList();
    }
}
