package org.proteus1121.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Sign-in with Google / GitHub. A provider is enabled only when both its client id and secret are set.
 */
@Data
@Component
@ConfigurationProperties(prefix = "sso")
public class SsoProperties {

    /**
     * Public URL of the backend, used for the OAuth callback (…/login/oauth2/code/{provider}).
     * "{baseUrl}" takes it from the request.
     */
    private String baseUrl = "{baseUrl}";

    /**
     * Where the browser is sent after signing in (or failing to).
     */
    private String frontendUrl = "http://localhost:3000";

    private Client google = new Client();
    private Client github = new Client();

    @Data
    public static class Client {
        private String clientId;
        private String clientSecret;

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
        }
    }
}
