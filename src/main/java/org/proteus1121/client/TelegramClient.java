package org.proteus1121.client;

import org.proteus1121.model.telegram.SendMessageRequest;
import org.proteus1121.model.telegram.TelegramMessageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "telegramClient",
        url = "${telegram.api.base-url}"
)
public interface TelegramClient {

    @PostMapping(value = "/sendMessage", consumes = "application/json")
    TelegramMessageResponse sendMessage(@RequestBody SendMessageRequest request);

}