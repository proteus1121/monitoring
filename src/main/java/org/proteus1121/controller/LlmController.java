package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.request.DeviceRequest;
import org.proteus1121.service.llm.DeviceDescriptionService;
import org.proteus1121.service.llm.TextGenerationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/llm")
@RequiredArgsConstructor
@Tag(name = "Text generation", description = "Descriptions written by the language model")
public class LlmController {

    private final TextGenerationService textGeneration;
    private final DeviceDescriptionService deviceDescriptions;
    private final DeviceMapper deviceMapper;

    @GetMapping("/status")
    @Operation(summary = "Whether text generation is configured")
    public Map<String, Object> getLlmStatus() {
        Map<String, Object> status = new java.util.HashMap<>();
        status.put("enabled", textGeneration.isEnabled());
        status.put("model", textGeneration.model());
        status.put("lastError", textGeneration.lastError());
        return status;
    }

    @PostMapping("/device-description")
    @Operation(summary = "Describe a device", description = "Writes a short description from the device form values (not saved)")
    public Map<String, String> describeDevice(@RequestBody DeviceRequest request) {
        if (!textGeneration.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Text generation is not configured");
        }
        Device device = deviceMapper.toDevice(request);
        device.setControllerId(request.getControllerId());
        return deviceDescriptions.describe(device)
                .map(text -> Map.of("text", text))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The model did not answer, try again"));
    }
}
