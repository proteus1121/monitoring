package org.proteus1121.model.ml;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.enums.DeviceType;
import java.util.List;
import java.util.Map;
public record IncidentContext(
    Device device,
    Map<DeviceType, Double> latestValues,
    Map<String, Double> engineeredFeatures,
    double probability,
    List<String> topContributors,
    List<DeviceType> missingSensors
) {}
