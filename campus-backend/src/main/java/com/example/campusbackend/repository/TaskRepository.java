package com.example.campusbackend.repository;

import com.example.campusbackend.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAuthor(String author);

    @Query("""
            select count(t) from Task t
            where t.status = 'completed'
            and (
                t.authorUsername = :username
                or t.assignee = :username
                or (t.authorUsername is null and t.author = :displayName)
            )
            """)
    long countCompletedTasksForUser(@Param("username") String username, @Param("displayName") String displayName);

    long countByStatusAndAuthorUsername(String status, String authorUsername);

    long countByStatusAndAssignee(String status, String assignee);

    boolean existsByCategoryIgnoreCase(String category);

    @Query("""
            select coalesce(sum(t.reward), 0) from Task t
            where t.status = 'completed'
            and t.assignee = :username
            """)
    BigDecimal sumCompletedRewardsForAssignee(@Param("username") String username);

    @Query("""
            select coalesce(sum(t.reward), 0) from Task t
            where t.authorUsername = :username
               or (t.authorUsername is null and t.author = :displayName)
            """)
    BigDecimal sumRewardsForPublishedTasks(@Param("username") String username, @Param("displayName") String displayName);

    @Modifying
    @Query("""
            update Task t
            set t.authorUsername = :placeholder,
                t.author = :displayName
            where t.authorUsername = :username
            """)
    int anonymizeAuthor(@Param("username") String username, @Param("placeholder") String placeholder, @Param("displayName") String displayName);

    @Modifying
    @Query("""
            update Task t
            set t.assignee = :placeholder
            where t.assignee = :username
            """)
    int anonymizeAssignee(@Param("username") String username, @Param("placeholder") String placeholder);
}
