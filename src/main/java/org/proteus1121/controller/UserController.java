package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.request.LoginRequest;
import org.proteus1121.model.request.UserRequest;
import org.proteus1121.model.response.LoginResponse;
import org.proteus1121.service.UserService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.List;
import java.util.Map;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/users")
@Tag(name = "Users", description = "Operations related to user management")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();

    @GetMapping
    @Operation(summary = "Get all users", description = "Returns a list of all registered users")
    public Map<String, List<DeviceUser>> getUsers() {
        User principal = getCurrentUser();
        return userService.getSharedDevices(principal.getId());
    }
    
    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user with username and password")
    public void createUser(@RequestBody UserRequest userRequest) {
        userService.registerUser(userRequest.getUsername(), userRequest.getPassword());
    }

    @PostMapping(value = "/login")
    @Operation(summary = "Login user", description = "Authenticates a user and returns session details")
    public LoginResponse login(@RequestBody LoginRequest loginRequest,
                               HttpServletRequest request,
                               HttpServletResponse response) {
        if (StringUtils.isAnyBlank(loginRequest.getUsername(), loginRequest.getPassword())) {
            //TODO: exception handling
            throw new RuntimeException("Username and password params could be not empty");
        }

        Authentication authentication = authenticationManager
                .authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContext context = SecurityContextHolder.getContext();
        context.setAuthentication(authentication);

        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        
        User principal = (User) authentication.getPrincipal();
        return new LoginResponse(principal.getId(), principal.getUsername(),
                RequestContextHolder.currentRequestAttributes().getSessionId());
    }

    @GetMapping("/me")
    @Operation(summary = "Get the current user", description = "Returns the details of the currently authenticated user")
    public LoginResponse getUser() {
        User principal = getCurrentUser();
        return new LoginResponse(principal.getId(), principal.getUsername(),
                RequestContextHolder.currentRequestAttributes().getSessionId());
    }
}
