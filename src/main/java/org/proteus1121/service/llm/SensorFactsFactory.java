package org.proteus1121.service.llm;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Turns a device into the facts the language model gets: measurement, unit, module, board and pin.
 */
@Component
@RequiredArgsConstructor
public class SensorFactsFactory {

    private static final Map<DeviceType, String> UNITS = Map.of(
            DeviceType.TEMPERATURE, "°C",
            DeviceType.HUMIDITY, "%",
            DeviceType.PRESSURE, "hPa",
            DeviceType.LPG, "ppm",
            DeviceType.CH4, "ppm",
            DeviceType.SMOKE, "ppm",
            DeviceType.FLAME, "(1 = flame detected)",
            DeviceType.MOTION, "(1 = motion)",
            DeviceType.LIGHT, "(1 = light)",
            DeviceType.RELAY, "(1 = on)");

    private final ControllerRepository controllerRepository;

    public TextGenerationService.SensorFacts of(Device device) {
        String board = device.getControllerId() == null ? null
                : controllerRepository.findById(device.getControllerId()).map(c -> c.getName()).orElse(null);
        return new TextGenerationService.SensorFacts(
                device.getName(),
                device.getType() == null ? null : device.getType().name(),
                device.getType() == null ? null : UNITS.get(device.getType()),
                device.getSensorModel() == null ? null : device.getSensorModel().getLabel(),
                board,
                device.getPin() == null ? null : "GPIO" + device.getPin(),
                device.getLowerValue(),
                device.getCriticalValue());
    }

    public static String unit(DeviceType type) {
        return type == null ? "" : UNITS.getOrDefault(type, "");
    }
}
