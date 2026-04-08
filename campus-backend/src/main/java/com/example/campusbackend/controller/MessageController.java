package com.example.campusbackend.controller;

import com.example.campusbackend.entity.Message;
import com.example.campusbackend.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @GetMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> getMessages(@PathVariable Long taskId) {
        List<Message> messages = messageRepository.findByTaskIdOrderByIdAsc(taskId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 200);
        body.put("message", "success");
        body.put("data", messages);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Message message) {
        Message savedMessage = messageRepository.save(message);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 200);
        body.put("message", "message sent");
        body.put("data", savedMessage);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}