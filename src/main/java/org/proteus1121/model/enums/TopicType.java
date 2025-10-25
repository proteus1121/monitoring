package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Optional;

@Getter
@RequiredArgsConstructor
public enum TopicType {

    MEASUREMENTS("measurements"),
    CONFIGURATION("configuration");

    private final String value;

    public static Optional<TopicType> parse(String type) {
        if (type == null || type.isBlank()) {
            return Optional.empty();
        }

        return Arrays.stream(TopicType.values())
                .filter(topicType -> topicType.getValue().equalsIgnoreCase(type))
                .findFirst();
    }
}
