package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.enums.Period;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.service.MetricService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
@Tag(name = "Metrics", description = "Endpoints for retrieving and predicting sensor metrics")
public class MetricController {

    private final MetricService metricService;

    @GetMapping
    @Operation(summary = "Get metrics", description = "Retrieve sensor metrics for a device within a time range")
    public List<SensorData> getMetrics(@RequestParam("deviceId") Long deviceId,
                                       @RequestParam("start") LocalDateTime startTimestamp,
                                       @RequestParam("end") LocalDateTime endTimestamp,
                                       @RequestParam(value = "period", defaultValue = "LIVE") Period period) {
        return metricService.getMetrics(deviceId, startTimestamp, endTimestamp, period).stream()
                .toList();
    }

    @GetMapping("/predicted")
    @Operation(summary = "Get predicted metrics", description = "Retrieve predicted sensor metrics for a device within a time range")
    public List<SensorData> getMetricsPredicted(@RequestParam("deviceId") Long deviceId,
                                                @RequestParam("start") LocalDateTime startTimestamp,
                                                @RequestParam("end") LocalDateTime endTimestamp,
                                                @RequestParam(value = "period", defaultValue = "LIVE") Period period) {
        return metricService.getMetricsPredicted(deviceId, startTimestamp, endTimestamp, period).stream()
                .toList();
    }

    @PostMapping("/predict")
    @Operation(summary = "Predict metrics", description = "Trigger prediction for future metrics based on historical data")
    public void predictMetrics(@RequestParam("deviceId") Long deviceId,
                               @RequestParam("start") LocalDateTime startTimestamp) {
        metricService.predictMetrics(deviceId, startTimestamp);
    }
}
