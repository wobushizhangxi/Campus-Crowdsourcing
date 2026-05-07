package com.example.campusbackend.entity;

public enum TaskStatus {
    OPEN("open"),
    ACCEPTED("accepted"),
    SUBMITTED("submitted"),
    COMPLETED("completed"),
    CANCELLED("cancelled"),
    DISPUTED("disputed");

    private final String storedValue;

    TaskStatus(String storedValue) {
        this.storedValue = storedValue;
    }

    public String storedValue() {
        return storedValue;
    }

    public static TaskStatus fromStoredValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return OPEN;
        }

        String normalized = value.trim().toLowerCase();
        for (TaskStatus status : values()) {
            if (status.storedValue.equals(normalized) || status.name().equalsIgnoreCase(normalized)) {
                return status;
            }
        }

        return OPEN;
    }
}
