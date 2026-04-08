package com.example.campusbackend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long taskId;            // 关联的任务ID
    private String senderUsername;  // 发送人的学号/用户名
    private String text;            // 消息内容
    private String createdAt;       // 格式化后的时间，方便前端直接显示

    public Message() {
        // 初始化时自动生成 14:30 这种格式的时间
        this.createdAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}