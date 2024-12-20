package org.proteus1121.controller;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.service.MetricService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
public class MetricController {
    
    private final MetricService metricService;
    
    @GetMapping
    public List<SensorData> getMetrics(@RequestParam("deviceId") Long deviceId,
                                       @RequestParam("start") LocalDateTime startTimestamp,
                                       @RequestParam("end") LocalDateTime endTimestamp) {
        return metricService.getMetrics(deviceId, startTimestamp, endTimestamp).stream()
                .toList();
    }
}
