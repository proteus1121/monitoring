package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ControllerRequest {

    @NotBlank
    @Size(max = 255)
    private String name;
}
