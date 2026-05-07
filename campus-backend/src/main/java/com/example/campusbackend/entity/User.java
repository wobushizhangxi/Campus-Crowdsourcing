package com.example.campusbackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(length = 100)
    private String name;

    @Column(length = 120)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 50)
    private String campus;

    @Column(length = 255)
    private String address;

    @Column(length = 1000)
    private String bio;

    @Lob
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false, length = 40)
    private Set<AdminPermission> permissions = new LinkedHashSet<>();

    @Column(precision = 10, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean banned = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    @Column(length = 50)
    private String verificationCampus;

    @Column(length = 50)
    private String verificationStudentId;

    @Column(length = 500)
    private String verificationNote;

    private LocalDateTime verificationSubmittedAt;

    private LocalDateTime verificationReviewedAt;

    @Column(length = 50)
    private String verificationReviewer;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role == null ? UserRole.USER : role;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public boolean isBanned() {
        return banned;
    }

    public void setBanned(boolean banned) {
        this.banned = banned;
    }

    public Set<AdminPermission> getPermissions() {
        return permissions == null ? new LinkedHashSet<>() : permissions;
    }

    public void setPermissions(Set<AdminPermission> permissions) {
        this.permissions = permissions == null ? new LinkedHashSet<>() : new LinkedHashSet<>(permissions);
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus == null ? VerificationStatus.UNVERIFIED : verificationStatus;
    }

    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus == null ? VerificationStatus.UNVERIFIED : verificationStatus;
    }

    public String getVerificationCampus() {
        return verificationCampus;
    }

    public void setVerificationCampus(String verificationCampus) {
        this.verificationCampus = verificationCampus;
    }

    public String getVerificationStudentId() {
        return verificationStudentId;
    }

    public void setVerificationStudentId(String verificationStudentId) {
        this.verificationStudentId = verificationStudentId;
    }

    public String getVerificationNote() {
        return verificationNote;
    }

    public void setVerificationNote(String verificationNote) {
        this.verificationNote = verificationNote;
    }

    public LocalDateTime getVerificationSubmittedAt() {
        return verificationSubmittedAt;
    }

    public void setVerificationSubmittedAt(LocalDateTime verificationSubmittedAt) {
        this.verificationSubmittedAt = verificationSubmittedAt;
    }

    public LocalDateTime getVerificationReviewedAt() {
        return verificationReviewedAt;
    }

    public void setVerificationReviewedAt(LocalDateTime verificationReviewedAt) {
        this.verificationReviewedAt = verificationReviewedAt;
    }

    public String getVerificationReviewer() {
        return verificationReviewer;
    }

    public void setVerificationReviewer(String verificationReviewer) {
        this.verificationReviewer = verificationReviewer;
    }
}
