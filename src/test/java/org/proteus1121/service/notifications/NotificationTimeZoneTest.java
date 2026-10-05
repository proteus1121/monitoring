package org.proteus1121.service.notifications;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.proteus1121.client.TelegramClient;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.entity.NotificationEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.NotificationChannel;
import org.proteus1121.model.enums.NotificationType;
import org.proteus1121.model.mapper.NotificationMapper;
import org.proteus1121.model.telegram.SendMessageRequest;
import org.proteus1121.repository.NotificationRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationTimeZoneTest {

    // 01:31:52 UTC
    private static final Instant OCCURRED = Instant.parse("2026-10-05T01:31:52.136Z");

    private UserRepository userRepository;
    private TelegramClient telegramClient;
    private TelegramNotificationService service;

    @BeforeEach
    void setUp() {
        NotificationRepository repository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        NotificationMapper mapper = mock(NotificationMapper.class);
        telegramClient = mock(TelegramClient.class);
        service = new TelegramNotificationService(repository, userRepository, mapper, telegramClient,
                mock(EmailSender.class), mock(TelegramPhotoSender.class));
        ReflectionTestUtils.setField(service, "defaultTimeZone", ZoneId.of("Europe/Kyiv"));

        NotificationEntity entity = new NotificationEntity();
        when(repository.findAllByUserId(7L)).thenReturn(List.of(entity));
        TelegramNotification recipient = new TelegramNotification();
        recipient.setChannel(NotificationChannel.TELEGRAM);
        recipient.setTelegramChatId("000000000");
        recipient.setType(NotificationType.CRITICAL);
        recipient.setTemplate("Час: {{timestamp}}");
        when(mapper.toTelegramNotification(entity)).thenReturn(recipient);
    }

    @Test
    void timeIsTheEventInTheRecipientsZone() {
        user("America/New_York");

        assertEquals("Час: 21:31:52 04.10.26", send());
    }

    @Test
    void theDefaultZoneUntilTheBrowserToldOne() {
        user(null);

        assertEquals("Час: 04:31:52 05.10.26", send());
    }

    private void user(String zone) {
        UserEntity user = new UserEntity();
        user.setId(7L);
        user.setTimeZone(zone);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
    }

    private String send() {
        DeviceUser recipient = new DeviceUser(1L, 7L, "tester", "Полум'я в кадрі", null);
        Device device = new Device();
        device.setName("Полум'я в кадрі");
        service.sendCriticalNotifications(Set.of(recipient), device, 1.0, null, null, OCCURRED);

        ArgumentCaptor<SendMessageRequest> sent = ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(telegramClient, timeout(2000)).sendMessage(sent.capture());
        return sent.getValue().getText();
    }
}
