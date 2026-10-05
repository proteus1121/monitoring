package org.proteus1121.service.notifications;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.MessagingException;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Sends plain-text e-mails over SMTP (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM).
 * Without MAIL_HOST the channel is reported as not configured and nothing is sent.
 */
@Slf4j
@Component
public class EmailSender {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String host;
    private final String from;

    public EmailSender(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${spring.mail.host:}") String host,
                       @Value("${notifications.mail.from:}") String from) {
        this.mailSender = mailSender;
        this.host = host;
        this.from = from;
    }

    public boolean isConfigured() {
        return host != null && !host.isBlank() && mailSender.getIfAvailable() != null;
    }

    public void send(String to, String subject, String text) {
        if (!isConfigured()) {
            throw new IllegalStateException("E-mail is not configured on the server (MAIL_HOST)");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) {
            message.setFrom(from);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.getObject().send(message);
        log.info("E-mail '{}' sent to {}", subject, to);
    }

    /**
     * The same with a JPEG attached (the frame of a camera alarm).
     */
    public void send(String to, String subject, String text, byte[] jpeg, String fileName) {
        if (!isConfigured()) {
            throw new IllegalStateException("E-mail is not configured on the server (MAIL_HOST)");
        }
        JavaMailSender sender = mailSender.getObject();
        var message = sender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (from != null && !from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text);
            helper.addAttachment(fileName, new ByteArrayResource(jpeg), "image/jpeg");
        } catch (MessagingException e) {
            throw new IllegalStateException("Cannot build the e-mail: " + e.getMessage(), e);
        }
        sender.send(message);
        log.info("E-mail '{}' with {} sent to {}", subject, fileName, to);
    }
}
