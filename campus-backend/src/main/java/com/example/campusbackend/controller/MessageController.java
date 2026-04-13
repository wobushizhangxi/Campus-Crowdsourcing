package com.example.campusbackend.controller;

import com.example.campusbackend.entity.Message;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.MessageRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.service.CurrentUserService;
import com.example.campusbackend.service.TaskAuthorizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private TaskAuthorizationService taskAuthorizationService;

    @GetMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> getMessages(@PathVariable Long taskId, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }
        if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }

        List<Message> messages = messageRepository.findByTaskIdOrderByIdAsc(taskId);
        return buildResponse(HttpStatus.OK, "成功", messages);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Message request, Authentication authentication) {
        User actor = currentUserService.requireCurrentUser(authentication);
        Long taskId = request.getTaskId();
        if (taskId == null) {
            return buildResponse(HttpStatus.BAD_REQUEST, "缺少任务ID", null);
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return buildResponse(HttpStatus.NOT_FOUND, "任务不存在", null);
        }
        if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
            return buildResponse(HttpStatus.FORBIDDEN, "无权限", null);
        }
        if (request.getText() == null || request.getText().trim().isEmpty()) {
            return buildResponse(HttpStatus.BAD_REQUEST, "消息内容不能为空", null);
        }

        Message message = new Message();
        message.setTaskId(taskId);
        message.setText(request.getText().trim());
        message.setSenderUsername(actor.getUsername());

        Message savedMessage = messageRepository.save(message);
        return buildResponse(HttpStatus.CREATED, "消息发送成功", savedMessage);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        if (data != null) {
            body.put("data", data);
        }
        return ResponseEntity.status(status).body(body);
    }
}
