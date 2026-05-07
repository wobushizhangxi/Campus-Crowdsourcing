package com.example.campusbackend.repository;

import com.example.campusbackend.entity.TaskCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskCategoryRepository extends JpaRepository<TaskCategory, Long> {
    boolean existsByNameIgnoreCase(String name);

    List<TaskCategory> findAllByOrderByCreatedAtAsc();

    Optional<TaskCategory> findByNameIgnoreCase(String name);
}
