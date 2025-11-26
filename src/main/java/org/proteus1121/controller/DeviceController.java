package org.proteus1121.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.request.DeviceRequest;
import org.proteus1121.model.request.ShareDeviceRequest;
import org.proteus1121.model.request.UnshareDeviceRequest;
import org.proteus1121.service.DeviceService;
import org.proteus1121.service.UserDeviceService;
import org.proteus1121.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final UserDeviceService userDeviceService;
    private final DeviceMapper deviceMapper;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Device>> getAllDevices() {
        User principal = getCurrentUser();
        return ResponseEntity.ok(deviceService.getAllDevices(principal.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {
        Device device = deviceService.checkDevice(id, DeviceRole.VIEWER);
        return ResponseEntity.ok(device);
    }

    @PostMapping
    public ResponseEntity<Device> createDevice(@RequestBody DeviceRequest deviceRequest) {
        Device createdDevice = deviceService.createDevice(deviceMapper.toDevice(deviceRequest), getCurrentUser().getId());
        return ResponseEntity.ok(createdDevice);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Device> updateDevice(@PathVariable Long id, @RequestBody DeviceRequest deviceRequest) {
        Device device = deviceService.checkDevice(id, DeviceRole.EDITOR);

        deviceMapper.toDevice(deviceRequest, device);

        Device updatedDevice = deviceService.updateDevice(id, device);
        return ResponseEntity.ok(updatedDevice);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.checkDevice(id, DeviceRole.OWNER);

        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/share")
    public ResponseEntity<Device> shareDevice(@RequestBody ShareDeviceRequest deviceRequest) {
        Set<Device> devices = deviceRequest.getDeviceIds().stream()
                .map(id -> deviceService.checkDevice(id, DeviceRole.EDITOR))
                .collect(Collectors.toSet());

        if (devices.isEmpty()) {
            devices = new HashSet<>(deviceService.getAllDevices(getCurrentUser().getId()));
        }

        Long userId = userService.loadUserByUsername(deviceRequest.getUsername()).getId();
        devices.forEach(device -> userDeviceService.shareDevice(device.getId(), Map.of(userId, deviceRequest.getRole())));
        
        return ResponseEntity.ok().build();
    }

    @PutMapping("/unshare")
    public ResponseEntity<Device> unshareDevice(@RequestBody UnshareDeviceRequest request) {
        Set<Device> devices = request.getDeviceIds().stream()
                .map(id -> deviceService.checkDevice(id, DeviceRole.EDITOR))
                .collect(Collectors.toSet());

        if (devices.isEmpty()) {
            devices = new HashSet<>(deviceService.getAllDevices(getCurrentUser().getId()));
        }
        
        Long userId = userService.loadUserByUsername(request.getUsername()).getId();
        devices.forEach(device -> userDeviceService.unshareDevice(device.getId(), userId));

        return ResponseEntity.ok().build();
    }
}
