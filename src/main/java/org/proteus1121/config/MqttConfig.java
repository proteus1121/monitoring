package org.proteus1121.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;

@Configuration
public class MqttConfig {

    private static final String MQTT_BROKER_URL = "tcp://localhost:1883";  // Mosquitto broker
    private static final String MQTT_CLIENT_ID = "spring-app-client";
    private static final String MQTT_TOPIC = "thermometer/temperature";

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        // Configure your MQTT broker URL and other settings here
        factory.setConnectionOptions(new MqttConnectOptions() {{
            setServerURIs(new String[] {MQTT_BROKER_URL});
            setCleanSession(true);
        }});
        return factory;
    }

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

//    @Bean
//    @ServiceActivator(inputChannel = "mqttInputChannel")
//    public MessageHandler messageHandler() {
//        return message -> {
//            String payload = message.getPayload().toString();
//            String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
//
//            if (MQTT_TOPIC.equals(topic)) {
//                System.out.println("Received temperature: " + payload);
//                // Add any additional processing logic here
//            }
//        };
//    }

//    @Bean
//    public MqttPahoMessageHandler mqttInbound() {
//        // Create and configure the MQTT message handler
//        MqttPahoMessageHandler mqttPahoMessageHandler = new MqttPahoMessageHandler("tcp://localhost:1883", "clientId");
//        mqttPahoMessageHandler.setAsync(true);
//        mqttPahoMessageHandler.setConverter(mappingJackson2MessageConverter());
//        return mqttPahoMessageHandler;
//    }

    @Bean
    public MessageConverter mappingJackson2MessageConverter() {
        // Set up Jackson message converter for JSON deserialization
        return new MappingJackson2MessageConverter();
    }
}
