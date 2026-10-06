package org.proteus1121.controller;

import org.proteus1121.model.response.metric.LatestReading;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.enums.Period;
import org.proteus1121.model.response.metric.PredictedSensorData;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.service.MetricService;
import org.proteus1121.service.DeviceService;
import org.proteus1121.service.forecast.ForecastService;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.response.metric.ForecastResult;
import org.proteus1121.util.SensorCleaner;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
@Tag(name = "Metrics", description = "Endpoints for retrieving and predicting sensor metrics")
public class MetricController {

    private final MetricService metricService;
    private final ForecastService forecastService;
    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "Get metrics", description = "Retrieve sensor metrics for a device within a time range")
    public List<SensorData> getMetrics(@RequestParam("deviceId") Long deviceId,
                                       @RequestParam("start") LocalDateTime startTimestamp,
                                       @RequestParam("end") LocalDateTime endTimestamp,
                                       @RequestParam(value = "period", defaultValue = "LIVE") Period period) {
        List<SensorData> metrics = metricService.getMetrics(deviceId, startTimestamp, endTimestamp, period, false).stream()
                .toList();

        var isStrange = SensorCleaner.lowOrSentinel(
                0.1,
                metrics.stream().map(SensorData::getValue).toList(),
                1e-9
        );

        return SensorCleaner.removeSandwichedRuns(metrics, isStrange);
    }

    @GetMapping("/latest")
    @Operation(summary = "Get latest readings", description = "The most recent value of every device of the current user")
    public List<LatestReading> getLatestReadings() {
        return metricService.getLatestReadings(getCurrentUser().getId());
    }

    @GetMapping("/predicted")
    @Operation(summary = "Get predicted metrics", description = "Forecast points of a device within a time range, every point tagged with the model that made it")
    public List<PredictedSensorData> getMetricsPredicted(@RequestParam("deviceId") Long deviceId,
                                                         @RequestParam("start") LocalDateTime startTimestamp,
                                                         @RequestParam("end") LocalDateTime endTimestamp,
                                                         @RequestParam(value = "period", defaultValue = "LIVE") Period period) {
        return metricService.getMetricsPredicted(deviceId, startTimestamp, endTimestamp, period);
    }

    @PostMapping("/predict")
    @Operation(summary = "Run forecast", description = "Fits every forecast model configured for the device and replaces their forecasts")
    public List<ForecastResult> predictMetrics(@RequestParam("deviceId") Long deviceId) {
        deviceService.checkDevice(deviceId, DeviceRole.EDITOR);
        return forecastService.run(deviceId);
    }
}
