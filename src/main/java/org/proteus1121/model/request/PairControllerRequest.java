package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PairControllerRequest {

    /**
     * Code the board shows on its display and setup page.
     */
    @NotBlank
    private String code;
}
