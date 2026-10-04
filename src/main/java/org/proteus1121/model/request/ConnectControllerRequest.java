package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * From the link on the board's setup page: who the board is and where to send the browser back.
 */
@Data
public class ConnectControllerRequest {

    // esp8266-86f876
    @NotBlank
    private String hardwareId;

    private String platform;

    private String firmwareVersion;

    // the board's page that stores the login: http://192.168.1.150/connect
    @NotBlank
    private String back;
}
