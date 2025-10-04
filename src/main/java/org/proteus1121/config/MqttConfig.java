package org.proteus1121.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.proteus1121.consumer.MeasurementConsumer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.messaging.MessageChannel;

import java.util.List;

@Configuration
public class MqttConfig {

    private static final String MQTT_CLIENT_ID = "consumerClient";

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory(@Value("${mqtt.broker.url}") String mqttBrokerUrl) {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        // Configure your MQTT broker URL and other settings here
        factory.setConnectionOptions(new MqttConnectOptions() {{
            setServerURIs(new String[] {mqttBrokerUrl});
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
    public MqttPahoMessageDrivenChannelAdapter mqttInbound(DefaultMqttPahoClientFactory mqttClientFactory, List<MeasurementConsumer> consumers) {
        String[] topics = consumers.stream()
                .map(MeasurementConsumer::getTopic)
                .toArray(String[]::new);
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(MQTT_CLIENT_ID, mqttClientFactory, topics);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }
}
