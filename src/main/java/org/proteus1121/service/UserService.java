package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.mapper.UserMapper;
import org.proteus1121.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

import static java.util.stream.Collectors.toList;
import static org.springframework.security.core.userdetails.User.withUsername;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public User loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByName(username)
                .orElseThrow(() -> new UsernameNotFoundException("User " + username + " not found"));

        return new User(user.getId(), user.getName(), user.getPassword(), List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    public void registerUser(String username, String password) {
        userRepository.findByName(username).ifPresent(user -> {
            throw new IllegalArgumentException("User " + username + " already exists");
        });
        String encodedPassword = passwordEncoder.encode(password);
        UserEntity user = new UserEntity(username, encodedPassword);
        userRepository.save(user);
    }

    public List<User> getUsers() {
        return userRepository.findAll().stream()
                .map((UserEntity userEntity) -> userMapper.toUser(userEntity, List.of(new SimpleGrantedAuthority("ROLE_USER"))))
                .collect(toList());
    }

    public User getUser(Long id) {
        return userRepository.findById(id)
                .map((UserEntity userEntity) -> userMapper.toUser(userEntity, List.of(new SimpleGrantedAuthority("ROLE_USER"))))
                //todo: throw custom exception 404
                .orElseThrow(() -> new IllegalArgumentException("User " + id + " not found"));
    }
}
