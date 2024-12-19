package org.proteus1121.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.service.MetricService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
public class MetricController {
    
    private final MetricService metricService;
    
    @GetMapping
    public List<SensorData> getMetrics(@RequestParam("deviceId") Long deviceId,
                                       @RequestParam("start") String startTimestamp,
                                       @RequestParam("end") String endTimestamp) {
        Instant startInstant = Instant.parse(startTimestamp);
        Instant endInstant = Instant.parse(endTimestamp);

        // Convert to LocalDateTime
        LocalDateTime start = startInstant.atZone(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime end = endInstant.atZone(ZoneOffset.UTC).toLocalDateTime();
        return metricService.getMetrics(deviceId, start, end).stream()
                .toList();
    }
}
