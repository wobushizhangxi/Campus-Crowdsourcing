package com.example.campusbackend.repository;

import com.example.campusbackend.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatusOrderByCreatedAtAsc(String status);
    boolean existsByTaskIdAndReporterUsername(Long taskId, String reporterUsername);
}
