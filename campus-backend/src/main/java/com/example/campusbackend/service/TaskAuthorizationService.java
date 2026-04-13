package com.example.campusbackend.service;

import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import org.springframework.stereotype.Service;

@Service
public class TaskAuthorizationService {

    public boolean canAccessTaskConversation(User actor, Task task) {
        return actor.getRole() == UserRole.ADMIN
                || actor.getUsername().equals(task.getAuthorUsername())
                || actor.getUsername().equals(task.getAssignee());
    }

    public boolean canCompleteTask(User actor, Task task) {
        return actor.getRole() == UserRole.ADMIN
                || actor.getUsername().equals(task.getAuthorUsername());
    }
}
