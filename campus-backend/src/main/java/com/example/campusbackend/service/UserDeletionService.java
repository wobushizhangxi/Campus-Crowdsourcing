package com.example.campusbackend.service;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.BalanceRecordRepository;
import com.example.campusbackend.repository.MessageRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.TaskReviewRepository;
import com.example.campusbackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserDeletionService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final MessageRepository messageRepository;
    private final BalanceRecordRepository balanceRecordRepository;
    private final TaskReviewRepository taskReviewRepository;

    public UserDeletionService(
            UserRepository userRepository,
            TaskRepository taskRepository,
            MessageRepository messageRepository,
            BalanceRecordRepository balanceRecordRepository,
            TaskReviewRepository taskReviewRepository
    ) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.messageRepository = messageRepository;
        this.balanceRecordRepository = balanceRecordRepository;
        this.taskReviewRepository = taskReviewRepository;
    }

    @Transactional
    public String deleteRegularUser(User target) {
        if (target.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "管理员账号不能被删除");
        }

        String placeholder = "deleted-user-" + target.getId();
        taskRepository.anonymizeAuthor(target.getUsername(), placeholder, "已注销用户");
        taskRepository.anonymizeAssignee(target.getUsername(), placeholder);
        messageRepository.anonymizeSender(target.getUsername(), placeholder);
        balanceRecordRepository.anonymizeUsername(target.getUsername(), placeholder);
        taskReviewRepository.anonymizeReviewer(target.getUsername(), placeholder);
        taskReviewRepository.anonymizeReviewee(target.getUsername(), placeholder);
        userRepository.delete(target);
        return placeholder;
    }
}
