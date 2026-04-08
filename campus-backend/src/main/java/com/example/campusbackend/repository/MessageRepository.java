package com.example.campusbackend.repository;

import com.example.campusbackend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    // 根据任务 ID 获取这个订单下的所有聊天记录，按 ID (时间) 升序排列
    List<Message> findByTaskIdOrderByIdAsc(Long taskId);
}