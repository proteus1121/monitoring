package org.proteus1121.model.dto.mqtt;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;

@Data
@AllArgsConstructor
public class Topic {

    private Long userId;
    private Long deviceId;
    private TopicType type;
    private ActionType action;
    /**
     * Hardware id of the board for users/{userId}/controllers/{hardwareId}/... topics.
     */
    private String hardwareId;

    public Topic(Long userId, Long deviceId, TopicType type, ActionType action) {
        this(userId, deviceId, type, action, null);
    }
}
