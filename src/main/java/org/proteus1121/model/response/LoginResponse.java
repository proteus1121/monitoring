package org.proteus1121.model.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private Long userId;
    private String name;
    @JsonProperty("SESSION")
    private String sessionId;
    /**
     * Zone the notifications use, null until the site sent one (only from /users/me).
     */
    private String timeZone;

    public LoginResponse(Long userId, String name, String sessionId) {
        this(userId, name, sessionId, null);
    }
}
