package org.proteus1121.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import java.io.IOException;

public class SecurityContextLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityContextLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpSession session = httpRequest.getSession(false); // Get the current session (do not create if it doesn't exist)

            if (session != null) {
                // Log session information
                Object securityContext = session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
                if (securityContext != null) {
                    logger.info("SecurityContext found in session: {}", securityContext);
                } else {
                    logger.warn("No SecurityContext found in session.");
                }
            } else {
                logger.warn("No session found.");
            }
        } else {
            logger.warn("Request is not an instance of HttpServletRequest.");
        }

        chain.doFilter(request, response);
    }
}
