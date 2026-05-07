package com.example.campusbackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "task_reviews",
        uniqueConstraints = @UniqueConstraint(columnNames = {"taskId", "reviewerUsername", "reviewerRole"})
)
public class TaskReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long taskId;

    @Column(nullable = false, length = 50)
    private String reviewerUsername;

    @Column(nullable = false, length = 50)
    private String revieweeUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewerRole reviewerRole;

    @Column(nullable = false)
    private int rating;

    @Column(length = 1000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getReviewerUsername() {
        return reviewerUsername;
    }

    public void setReviewerUsername(String reviewerUsername) {
        this.reviewerUsername = reviewerUsername;
    }

    public String getRevieweeUsername() {
        return revieweeUsername;
    }

    public void setRevieweeUsername(String revieweeUsername) {
        this.revieweeUsername = revieweeUsername;
    }

    public ReviewerRole getReviewerRole() {
        return reviewerRole;
    }

    public void setReviewerRole(ReviewerRole reviewerRole) {
        this.reviewerRole = reviewerRole;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
