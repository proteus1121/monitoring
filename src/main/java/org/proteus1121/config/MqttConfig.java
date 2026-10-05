package org.proteus1121.config;

import org.proteus1121.service.MqttAccountService;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
public class MqttConfig {

    private static final String MQTT_CLIENT_ID = "consumerClient";
    private static final String MQTT_PRODUCER_ID = "producerClient";
    private static final String MQTT_CAMERA_ID = "cameraClient";

    private static final String[] TOPICS = new String[]{
            "users/+/devices/+/measurements",
            "users/+/devices/+/raw",
            "users/+/controllers/+/hello",
            "users/+/controllers/+/scan-result",
            "users/+/controllers/+/update-status",
            "users/+/controllers/+/vision",
    };

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory(@Value("${mqtt.broker.url}") String mqttBrokerUrl,
                                                          @Value("${mqtt.broker.username:}") String username,
                                                          @Value("${mqtt.broker.password:}") String password,
                                                          // stores this login where the broker checks it, before connecting
                                                          MqttAccountService mqttAccountService) {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        // Configure your MQTT broker URL and other settings here
        factory.setConnectionOptions(new MqttConnectOptions() {{
            setServerURIs(new String[]{mqttBrokerUrl});
            setUserName(username);
            setPassword(password.toCharArray());
            setCleanSession(true);
            setAutomaticReconnect(true);
            setKeepAliveInterval(30);
        }});
        return factory;
    }

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageChannel mqttOutboundChannel(MessageHandler mqttOutbound) {
        DirectChannel dc = new DirectChannel();
        dc.subscribe(mqttOutbound);
        return dc;
    }

    @Bean
    public MqttPahoMessageDrivenChannelAdapter mqttInbound(DefaultMqttPahoClientFactory mqttClientFactory) {
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(MQTT_CLIENT_ID, mqttClientFactory, TOPICS);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @Bean
    public MessageChannel cameraFrameChannel() {
        return new DirectChannel();
    }

    /**
     * JPEG frames of ESP32-CAM boards (CameraFrameConsumer), live ones and the frame of an alarm: binary
     * payloads, and a client of their own so a stream of frames does not hold up the measurements.
     */
    @Bean
    public MqttPahoMessageDrivenChannelAdapter cameraFrameInbound(DefaultMqttPahoClientFactory mqttClientFactory) {
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(MQTT_CAMERA_ID,
                mqttClientFactory, "users/+/controllers/+/frame", "users/+/controllers/+/snapshot");
        DefaultPahoMessageConverter converter = new DefaultPahoMessageConverter();
        converter.setPayloadAsBytes(true);
        adapter.setConverter(converter);
        adapter.setQos(0);
        adapter.setOutputChannel(cameraFrameChannel());
        return adapter;
    }

    @Bean
    public MessageHandler mqttOutbound(DefaultMqttPahoClientFactory mqttClientFactory) {
        MqttPahoMessageHandler messageHandler = new MqttPahoMessageHandler(MQTT_PRODUCER_ID, mqttClientFactory);
        messageHandler.setAsync(true);
        return messageHandler;
    }
}
