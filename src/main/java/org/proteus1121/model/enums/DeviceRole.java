package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeviceRole {

    OWNER(3),
    EDITOR(2),
    VIEWER(1);

    private final int priority;
}
