package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActionType {
    
    REQUEST("request"),
    DATA("");
    
    private final String value;

    public static ActionType parse(String actionStr) {
        if (actionStr == null || actionStr.isBlank()) {
            return DATA;
        }

        for (ActionType action : ActionType.values()) {
            if (action.getValue().equalsIgnoreCase(actionStr)) {
                return action;
            }
        }

        return DATA;
    }
}
