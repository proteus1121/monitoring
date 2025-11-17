package org.proteus1121.model.dto.incident;

import lombok.Data;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.enums.Resolution;
import org.proteus1121.model.enums.Severity;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class Incident {

    private Long id;
    private String message;
    private List<Device> devices;
    private Resolution status;
    private Severity severity;
    private LocalDateTime created;

}
