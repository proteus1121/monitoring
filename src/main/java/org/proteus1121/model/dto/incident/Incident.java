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
    private String description;
    private List<Device> devices;
    private Resolution status;
    private Severity severity;
    /**
     * A picture is attached (GET /incidents/{id}/image): the frame of a camera's flame alarm.
     */
    private boolean image;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime created;

}
