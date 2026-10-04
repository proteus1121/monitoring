package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.proteus1121.model.enums.DisplayLanguage;

@Data
public class DisplayLanguageRequest {

    @NotNull
    private DisplayLanguage language;
}
