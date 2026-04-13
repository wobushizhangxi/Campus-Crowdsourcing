package com.example.campusbackend.dto;

public class BalanceAdjustmentRequest {
    private String amount;
    private String reason;

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
