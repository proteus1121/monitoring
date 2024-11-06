package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

import static org.springframework.security.core.userdetails.User.withUsername;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByName(username)
                .orElseThrow(() -> new UsernameNotFoundException("User "+username+" not found"));
        return withUsername(user.getName())
                .password(user.getPassword())
                // TODO: user roles
                .roles("USER")
                .build();
    }

    public void registerUser(String username, String password) {
        String encodedPassword = passwordEncoder.encode(password);
        UserEntity user = new UserEntity(username, encodedPassword);
        userRepository.save(user);
    }

    //todo: change to User
    public List<UserEntity> getUsers() {
        return userRepository.findAll();
    }
}
