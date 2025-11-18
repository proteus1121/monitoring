package org.proteus1121.model.dto.incident;

import com.fasterxml.jackson.annotation.JsonFormat;
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
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime created;

}
