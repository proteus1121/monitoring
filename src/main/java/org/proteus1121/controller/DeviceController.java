package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
import java.util.Set;
import java.util.stream.Collectors;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
@Tag(name = "Device Management", description = "Operations related to devices")
public class DeviceController {

    private final DeviceService deviceService;
    private final UserDeviceService userDeviceService;
    private final DeviceMapper deviceMapper;
    private final UserService userService;

    @GetMapping
    @Operation(summary = "Get all devices for current user", description = "Returns a list of devices owned or shared with the current user")
    public ResponseEntity<List<Device>> getAllDevices() {
        User principal = getCurrentUser();
        return ResponseEntity.ok(deviceService.getAllDevices(principal.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get device by ID", description = "Retrieve a specific device by its ID")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {
        Device device = deviceService.checkDevice(id, DeviceRole.VIEWER);
        return ResponseEntity.ok(device);
    }

    @PostMapping
    @Operation(summary = "Create a new device", description = "Creates a new device for the current user")
    public ResponseEntity<Device> createDevice(@Valid @RequestBody DeviceRequest deviceRequest) {
        Device device = deviceMapper.toDevice(deviceRequest);
        Device createdDevice = deviceService.createDevice(device, getCurrentUser().getId());
        return ResponseEntity.ok(createdDevice);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing device", description = "Updates the details of an existing device")
    public ResponseEntity<Device> updateDevice(@PathVariable Long id, @Valid @RequestBody DeviceRequest deviceRequest) {
        Device device = deviceService.checkDevice(id, DeviceRole.EDITOR);

        deviceMapper.toDevice(deviceRequest, device);

        Device updatedDevice = deviceService.updateDevice(id, device);
        return ResponseEntity.ok(updatedDevice);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a device", description = "Deletes a device owned by the current user")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.checkDevice(id, DeviceRole.OWNER);

        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/share")
    @Operation(summary = "Share devices with a user", description = "Shares one or more devices with another user and assigns a role")
    public ResponseEntity<Device> shareDevice(@Valid @RequestBody ShareDeviceRequest deviceRequest) {
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
    @Operation(summary = "Unshare devices from a user", description = "Removes sharing of one or more devices from a user")
    public ResponseEntity<Device> unshareDevice(@Valid @RequestBody UnshareDeviceRequest request) {
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
