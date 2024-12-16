package org.proteus1121.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.request.DeviceRequest;
import org.proteus1121.service.DeviceService;
import org.springframework.boot.actuate.endpoint.SecurityContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final DeviceMapper deviceMapper;

    @GetMapping
    public ResponseEntity<List<Device>> getAllDevices() {
        User principal = getCurrentUser();
        return ResponseEntity.ok(deviceService.getAllDevices(principal.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {
        Device device = checkDevice(id);
        return ResponseEntity.ok(device);
    }

    @PostMapping
    public ResponseEntity<Device> createDevice(@RequestBody DeviceRequest deviceRequest) {
        Device createdDevice = deviceService.createDevice(deviceMapper.toDevice(deviceRequest), getCurrentUser().getId());
        return ResponseEntity.ok(createdDevice);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Device> updateDevice(@PathVariable Long id, @RequestBody DeviceRequest deviceRequest) {
        checkDevice(id);

        Device updatedDevice = deviceService.updateDevice(id, deviceMapper.toDevice(deviceRequest));
        return ResponseEntity.ok(updatedDevice);
    }

    private Device checkDevice(Long id) {
        Device device = deviceService.getDeviceById(id);
        if (!Objects.equals(device.getUserId(), getCurrentUser().getId())) {
            //TODO: exception handling
            throw new RuntimeException("Device " + id + " belong to another user");
        }
        
        return device;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        checkDevice(id);

        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }
}
