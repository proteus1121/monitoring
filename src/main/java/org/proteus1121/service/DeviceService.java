package org.proteus1121.service;

import org.proteus1121.model.dto.device.ControlDevice;
import org.proteus1121.model.dto.device.Device;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeviceService {
    
    public Device getDeviceById(Long id) {
        return null;
    }
    
    public Device createDevice(ControlDevice device) {
        return null;
    }
    
    public Device updateDevice(Long id, ControlDevice device) {
        return null;
    }
    
    public void deleteDevice(Long id) {
    }

    public ResponseEntity<List<Device>> getAllDevices() {
        return null;
    }
}
