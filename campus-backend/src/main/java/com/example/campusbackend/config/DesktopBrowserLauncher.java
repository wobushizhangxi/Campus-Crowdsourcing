package com.example.campusbackend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.awt.Desktop;
import java.io.IOException;
import java.net.URI;

@Component
public class DesktopBrowserLauncher {

    private static final Logger log = LoggerFactory.getLogger(DesktopBrowserLauncher.class);

    @Value("${app.open-browser:true}")
    private boolean openBrowser;

    @Value("${server.port:8080}")
    private int serverPort;

    @EventListener(ApplicationReadyEvent.class)
    public void openHomePage() {
        if (!openBrowser) {
            return;
        }

        if (!Desktop.isDesktopSupported() || !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            log.info("Desktop browsing is not supported in this environment.");
            return;
        }

        try {
            Desktop.getDesktop().browse(URI.create("http://localhost:" + serverPort + "/"));
        } catch (IOException ex) {
            log.warn("Failed to open the application in the default browser.", ex);
        }
    }
}
