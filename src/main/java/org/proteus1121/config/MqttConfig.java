package org.proteus1121.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
public class MqttConfig {

    private static final String MQTT_CLIENT_ID = "consumerClient";
    private static final String MQTT_PRODUCER_ID = "producerClient";

    private static final String[] TOPICS = new String[]{
            "users/+/devices/+/measurements"
    };

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory(@Value("${mqtt.broker.url}") String mqttBrokerUrl) {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        // Configure your MQTT broker URL and other settings here
        factory.setConnectionOptions(new MqttConnectOptions() {{
            setServerURIs(new String[]{mqttBrokerUrl});
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
    public MessageHandler mqttOutbound(DefaultMqttPahoClientFactory mqttClientFactory) {
        MqttPahoMessageHandler messageHandler = new MqttPahoMessageHandler(MQTT_PRODUCER_ID, mqttClientFactory);
        messageHandler.setAsync(true);
        return messageHandler;
    }
}
