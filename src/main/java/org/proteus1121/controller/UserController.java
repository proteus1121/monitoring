package org.proteus1121.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.proteus1121.model.dto.user.User;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();

    @GetMapping
    // todo: make it secured
    public List<User> getUsers() {
        return userService.getUsers();
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable("id") Long id) {
        return userService.getUser(id);
    }
    
    @PostMapping("/register")
    public void createUser(@RequestBody UserRequest userRequest) {
        userService.registerUser(userRequest.getName(), userRequest.getPassword());
    }

    @PostMapping(value = "/login")
    public LoginResponse login(@RequestParam("username") String username,
                               @RequestParam("password") String password,
                               HttpServletRequest request,
                               HttpServletResponse response) {
        if (StringUtils.isAnyBlank(username, password)) {
            //TODO: exception handling
            throw new RuntimeException("Username and password params could be not empty");
        }

        Authentication authentication = authenticationManager
                .authenticate(new UsernamePasswordAuthenticationToken(username, password));

        SecurityContext context = SecurityContextHolder.getContext();
        context.setAuthentication(authentication);

        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        
        User principal = (User) authentication.getPrincipal();
        return new LoginResponse(principal.getId(), principal.getUsername(),
                RequestContextHolder.currentRequestAttributes().getSessionId());
    }
}
