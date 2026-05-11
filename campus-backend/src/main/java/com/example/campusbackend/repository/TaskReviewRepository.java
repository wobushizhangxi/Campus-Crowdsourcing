package com.example.campusbackend.repository;

import com.example.campusbackend.entity.ReviewerRole;
import com.example.campusbackend.entity.TaskReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskReviewRepository extends JpaRepository<TaskReview, Long> {
    boolean existsByTaskIdAndReviewerUsernameAndReviewerRole(Long taskId, String reviewerUsername, ReviewerRole reviewerRole);

    List<TaskReview> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    List<TaskReview> findByRevieweeUsernameOrderByCreatedAtDesc(String revieweeUsername);

    long countByRevieweeUsername(String revieweeUsername);

    @Query("select coalesce(avg(r.rating), 0) from TaskReview r where r.revieweeUsername = :username")
    double averageRatingForUser(@Param("username") String username);

    @Modifying
    @Query("""
            update TaskReview r
            set r.reviewerUsername = :placeholder
            where r.reviewerUsername = :username
            """)
    int anonymizeReviewer(@Param("username") String username, @Param("placeholder") String placeholder);

    @Modifying
    @Query("""
            update TaskReview r
            set r.revieweeUsername = :placeholder
            where r.revieweeUsername = :username
            """)
    int anonymizeReviewee(@Param("username") String username, @Param("placeholder") String placeholder);

    @Modifying
    @Query("delete from TaskReview r where r.taskId = :taskId")
    int deleteByTaskId(@Param("taskId") Long taskId);
}
