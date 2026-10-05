package org.proteus1121.mqtt.consumer.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.service.CameraService;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * JPEG frames of ESP32-CAM boards on users/{userId}/controllers/{hardwareId}/frame. Binary, so they have an MQTT
 * client and channel of their own (MqttConfig) instead of going through the text consumers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CameraFrameConsumer {

    static final Pattern FRAME_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/controllers/(?<hardwareId>[A-Za-z0-9_-]{1,64})/frame$");

    private final CameraService cameraService;

    @ServiceActivator(inputChannel = "cameraFrameChannel")
    public void handleFrame(Message<?> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        Matcher m = topic == null ? null : FRAME_TOPIC_PATTERN.matcher(topic);
        if (m == null || !m.matches() || !(message.getPayload() instanceof byte[] jpeg)) {
            log.warn("Ignoring a camera frame on {}", topic);
            return;
        }
        cameraService.handleFrame(Long.parseLong(m.group("userId")), m.group("hardwareId"), jpeg);
    }
}
