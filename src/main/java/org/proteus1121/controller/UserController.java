package org.proteus1121.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;

    @GetMapping
    public List<UserEntity> getUsers() {
        return userService.getUsers();
    }
}
