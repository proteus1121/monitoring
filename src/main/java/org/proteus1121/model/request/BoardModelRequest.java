package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.proteus1121.model.enums.BoardModel;

@Data
public class BoardModelRequest {

    @NotNull
    private BoardModel boardModel;
}
