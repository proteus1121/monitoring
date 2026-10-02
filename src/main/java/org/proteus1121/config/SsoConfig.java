package org.proteus1121.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.SsoProperties;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.service.UserService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Sign-in through Google and GitHub. After the provider confirms the user, the session gets the same
 * {@link User} principal as after a password login, so the rest of the API does not know the difference.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SsoConfig implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    public static final String GOOGLE = "google";
    public static final String GITHUB = "github";

    private final SsoProperties properties;
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public List<String> enabledProviders() {
        List<String> providers = new ArrayList<>();
        if (properties.getGoogle().isConfigured()) providers.add(GOOGLE);
        if (properties.getGithub().isConfigured()) providers.add(GITHUB);
        return providers;
    }

    /**
     * Null when no provider is configured (e.g. local run without secrets).
     */
    public ClientRegistrationRepository clientRegistrationRepository() {
        String redirectUri = properties.getBaseUrl() + "/login/oauth2/code/{registrationId}";
        List<ClientRegistration> registrations = new ArrayList<>();
        if (properties.getGoogle().isConfigured()) {
            registrations.add(CommonOAuth2Provider.GOOGLE.getBuilder(GOOGLE)
                    .clientId(properties.getGoogle().getClientId())
                    .clientSecret(properties.getGoogle().getClientSecret())
                    .redirectUri(redirectUri)
                    .build());
        }
        if (properties.getGithub().isConfigured()) {
            registrations.add(CommonOAuth2Provider.GITHUB.getBuilder(GITHUB)
                    .clientId(properties.getGithub().getClientId())
                    .clientSecret(properties.getGithub().getClientSecret())
                    .redirectUri(redirectUri)
                    .build());
        }
        return registrations.isEmpty() ? null : new InMemoryClientRegistrationRepository(registrations);
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        String provider = token.getAuthorizedClientRegistrationId();
        OAuth2User oauthUser = token.getPrincipal();

        String subject;
        String preferredName;
        if (GITHUB.equals(provider)) {
            subject = String.valueOf((Object) oauthUser.getAttribute("id"));
            preferredName = oauthUser.getAttribute("login");
        } else {
            subject = oauthUser.getAttribute("sub");
            preferredName = oauthUser.getAttribute("email");
        }

        User user = userService.findOrCreateSsoUser(provider, subject, preferredName);
        log.info("User {} signed in with {}", user.getUsername(), provider);

        // replace the OAuth token with the regular principal the API expects
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        response.sendRedirect(properties.getFrontendUrl() + "/dashboard/overview");
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        log.warn("SSO sign-in failed: {}", exception.getMessage());
        response.sendRedirect(properties.getFrontendUrl() + "/auth/login?sso_error=1");
    }
}
