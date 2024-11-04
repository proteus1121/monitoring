package org.proteus1121.model.request;

public class CreateDeviceRequest {
    private String name;
    private String type;
    private Integer criticalValue;
    private String webhookUrl;

    public CreateDeviceRequest() {
    }

    public CreateDeviceRequest(String name, String type, Integer criticalValue, String webhookUrl) {
        this.name = name;
        this.type = type;
        this.criticalValue = criticalValue;
        this.webhookUrl = webhookUrl;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Integer getCriticalValue() {
        return criticalValue;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }
}
