package org.proteus1121.model.ml;
import org.proteus1121.model.enums.DeviceType;
import java.util.List;
import java.util.Map;
public record AnomalyContext(
    Long deviceId,
    String deviceName,
    DeviceType deviceType,
    String locationId,
    Map<DeviceType, Double> latestValues,
    Map<String, Double> engineeredFeatures,
    List<DeviceType> missingSensors
) {}
