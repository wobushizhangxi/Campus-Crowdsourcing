package com.example.campusbackend.config;

import com.example.campusbackend.entity.Message;
import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.repository.MessageRepository;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Configuration
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class DemoDataInitializer {

    @Bean
    CommandLineRunner seedDemoData(
            UserRepository userRepository,
            TaskRepository taskRepository,
            MessageRepository messageRepository
    ) {
        return args -> {
            User publisher = null;
            User runner = null;

            if (userRepository.count() == 0) {
                publisher = createUser(
                        userRepository,
                        "20240001",
                        "123456",
                        "演示发布者",
                        "publisher@example.com",
                        new BigDecimal("20.00")
                );
                runner = createUser(
                        userRepository,
                        "20240002",
                        "123456",
                        "演示接单者",
                        "runner@example.com",
                        new BigDecimal("12.50")
                );
            }

            if (publisher == null) {
                publisher = userRepository.findByUsername("20240001").orElse(null);
            }
            if (runner == null) {
                runner = userRepository.findByUsername("20240002").orElse(null);
            }

            if (taskRepository.count() == 0) {
                Task packageTask = createTask(
                        taskRepository,
                        "帮忙取快递",
                        "从校园驿站取一个包裹，并送到 6 号宿舍楼 101 室。",
                        new BigDecimal("5.00"),
                        "open",
                        publisher == null ? "20240001" : publisher.getUsername(),
                        publisher == null ? "演示发布者" : publisher.getName(),
                        null
                );

                Task printTask = createTask(
                        taskRepository,
                        "打印课程报告",
                        "帮忙打印 20 页课程报告，并在图书馆门口交接。",
                        new BigDecimal("3.50"),
                        "accepted",
                        publisher == null ? "20240001" : publisher.getUsername(),
                        publisher == null ? "演示发布者" : publisher.getName(),
                        runner == null ? "20240002" : runner.getUsername()
                );

                createTask(
                        taskRepository,
                        "帮忙带晚饭",
                        "18:30 前从东区食堂带一份晚饭到 3 号宿舍楼 402 室。",
                        new BigDecimal("8.00"),
                        "completed",
                        publisher == null ? "20240001" : publisher.getUsername(),
                        publisher == null ? "演示发布者" : publisher.getName(),
                        runner == null ? "20240002" : runner.getUsername()
                );

                if (messageRepository.count() == 0 && printTask.getId() != null) {
                    messageRepository.save(createMessage(
                            printTask.getId(),
                            publisher == null ? "20240001" : publisher.getUsername(),
                            "请帮我双面打印。"
                    ));
                    messageRepository.save(createMessage(
                            printTask.getId(),
                            runner == null ? "20240002" : runner.getUsername(),
                            "收到，我会在 20 分钟内送到。"
                    ));
                }
            }
        };
    }

    private User createUser(
            UserRepository userRepository,
            String username,
            String password,
            String name,
            String email,
            BigDecimal balance
    ) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setName(name);
        user.setEmail(email);
        user.setCampus("主校区");
        user.setAddress("宿舍区");
        user.setBio("这是用于桌面打包演示的测试账号。");
        user.setBalance(balance);
        return userRepository.save(user);
    }

    private Task createTask(
            TaskRepository taskRepository,
            String title,
            String description,
            BigDecimal reward,
            String status,
            String authorUsername,
            String author,
            String assignee
    ) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setReward(reward);
        task.setStatus(status);
        task.setAuthorUsername(authorUsername);
        task.setAuthor(author);
        task.setAssignee(assignee);
        if ("completed".equals(status)) {
            task.setCompletedAt(LocalDateTime.now().minusHours(6));
        }
        return taskRepository.save(task);
    }

    private Message createMessage(Long taskId, String senderUsername, String text) {
        Message message = new Message();
        message.setTaskId(taskId);
        message.setSenderUsername(senderUsername);
        message.setText(text);
        return message;
    }
}
