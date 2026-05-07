package com.example.campusbackend;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class DesktopProfileConfigurationTests {

    @Test
    void desktopProfileUsesEmbeddedFileDatabase() throws IOException {
        Properties properties = new Properties();

        try (InputStream inputStream = Files.newInputStream(Path.of("src/main/resources/application-desktop.properties"))) {
            assertThat(inputStream).isNotNull();
            properties.load(inputStream);
        }

        assertThat(properties.getProperty("spring.datasource.driver-class-name")).isEqualTo("org.h2.Driver");
        assertThat(properties.getProperty("spring.datasource.url"))
                .startsWith("jdbc:h2:file:${user.home}/AppData/Local/CampusCrowdPlatform/data/campus");
        assertThat(properties.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("update");
        assertThat(properties.getProperty("app.security.admin.username")).isEqualTo("${APP_SECURITY_ADMIN_USERNAME:admin001}");
        assertThat(properties.getProperty("app.security.admin.password")).isEqualTo("${APP_SECURITY_ADMIN_PASSWORD:Admin123!}");
    }
}
