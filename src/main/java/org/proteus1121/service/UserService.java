package org.proteus1121.service;

import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.mapper.UserMapper;
import org.proteus1121.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    private final DeviceService deviceService;
    private final UserDeviceService userDeviceService;

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

    /**
     * Returns the account bound to the SSO identity, creating it on first sign-in. The preferred name
     * (email / GitHub login) gets a numeric suffix when it is already taken by another account.
     */
    public User findOrCreateSsoUser(String provider, String subject, String preferredName) {
        UserEntity user = userRepository.findByAuthProviderAndAuthSubject(provider, subject)
                .orElseGet(() -> {
                    String base = StringUtils.defaultIfBlank(preferredName, provider + "-" + subject);
                    String name = base;
                    for (int i = 2; userRepository.findByName(name).isPresent(); i++) {
                        name = base + "-" + i;
                    }
                    // nobody knows this password, the account can only be used through SSO
                    UserEntity created = new UserEntity(name, passwordEncoder.encode(UUID.randomUUID().toString()));
                    created.setAuthProvider(provider);
                    created.setAuthSubject(subject);
                    return userRepository.save(created);
                });
        return new User(user.getId(), user.getName(), user.getPassword(), List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    public List<User> getUsers() {
        return userRepository.findAll().stream()
                .map((UserEntity userEntity) -> userMapper.toUser(userEntity, List.of(new SimpleGrantedAuthority("ROLE_USER"))))
                .collect(toList());
    }

    /**
     * Zone of the user's notifications, null when the site has not sent one yet.
     */
    public String getTimeZone(Long userId) {
        return userRepository.findById(userId).map(UserEntity::getTimeZone).orElse(null);
    }

    public void setTimeZone(Long userId, String timeZone) {
        try {
            ZoneId.of(timeZone);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown time zone " + timeZone);
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + userId + " not found"));
        user.setTimeZone(timeZone);
        userRepository.save(user);
    }

    public User getUser(Long id) {
        return userRepository.findById(id)
                .map((UserEntity userEntity) -> userMapper.toUser(userEntity, List.of(new SimpleGrantedAuthority("ROLE_USER"))))
                //todo: throw custom exception 404
                .orElseThrow(() -> new IllegalArgumentException("User " + id + " not found"));
    }

    public Map<String, List<DeviceUser>> getSharedDevices(User user) {
        Long userId = user.getId();
        return deviceService.getAllDevices(userId).stream()
                .flatMap(device -> {
                    Set<DeviceUser> associations = deviceService.getUsersByDeviceId(device.getId());
                    return (associations == null ? Stream.<DeviceUser>empty() : associations.stream())
                            .map(ud -> Map.entry(
                                    ud.getUsername(),
                                    ud)
                            );
                })
                .collect(Collectors.groupingBy(
                        Map.Entry::getKey,
                        Collectors.mapping(
                                Map.Entry::getValue,
                                Collectors.toList()
                        )
                ));
    }
}
