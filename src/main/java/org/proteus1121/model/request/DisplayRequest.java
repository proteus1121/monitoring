package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DisplayModel;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class DisplayRequest {

    @NotNull
    private DisplayModel model;

    /**
     * GPIO numbers in the order of the model's pin names.
     */
    private List<Integer> pins = new ArrayList<>();

    private boolean flip;
}
