CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;

-- Drop table if it exists
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS sensor_data;

-- Create the users table
CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       password VARCHAR(255) NOT NULL
);

CREATE TABLE devices (
                         id BIGINT AUTO_INCREMENT PRIMARY KEY,
                         name VARCHAR(255) NOT NULL,
                         description VARCHAR(255) NULL,
                         critical_value DOUBLE NULL,
                         type VARCHAR(50) NULL,
                         delay BIGINT NULL,
                         status ENUM('OK', 'WARNING', 'CRITICAL', 'OFFLINE') DEFAULT 'OFFLINE',
                         last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_devices (
                              user_id   BIGINT NOT NULL,
                              device_id BIGINT NOT NULL,
                              PRIMARY KEY (user_id, device_id),
                              CONSTRAINT fk_ud_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
                              CONSTRAINT fk_ud_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE sensor_data (
                             id BIGINT AUTO_INCREMENT PRIMARY KEY,
                             device_id BIGINT NOT NULL,
                             timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                             value DECIMAL(10, 2) NULL,
                             CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE incidents (
                           id BIGINT AUTO_INCREMENT PRIMARY KEY,
                           timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                           message VARCHAR(255) NOT NULL,
                           severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL
);

CREATE TABLE incident_devices (
                                  inc_id BIGINT NOT NULL,
                                  dev_id BIGINT NOT NULL,
                                  CONSTRAINT fk_inc_dev_device FOREIGN KEY (dev_id) REFERENCES devices(id),
                                  CONSTRAINT fk_inc_dev_incidents FOREIGN KEY (inc_id) REFERENCES incidents(id)
);

CREATE TABLE SESSION (
                         PRIMARY_ID CHAR(36) NOT NULL,
                         SESSION_ID CHAR(36) NOT NULL,
                         CREATION_TIME BIGINT NOT NULL,
                         LAST_ACCESS_TIME BIGINT NOT NULL,
                         MAX_INACTIVE_INTERVAL INT NOT NULL,
                         EXPIRY_TIME BIGINT NOT NULL,
                         PRINCIPAL_NAME VARCHAR(100),
                         CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC;

CREATE UNIQUE INDEX SESSION_IX1 ON SESSION (SESSION_ID);
CREATE INDEX SESSION_IX2 ON SESSION (EXPIRY_TIME);
CREATE INDEX SESSION_IX3 ON SESSION (PRINCIPAL_NAME);

CREATE TABLE SESSION_ATTRIBUTES (
                                    SESSION_PRIMARY_ID CHAR(36) NOT NULL,
                                    ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
                                    ATTRIBUTE_BYTES BLOB NOT NULL,
                                    CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
                                    CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES SESSION(PRIMARY_ID) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC;

create table persistent_logins (username varchar(64) not null,
                                series varchar(64) primary key,
                                token varchar(64) not null,
                                last_used timestamp not null);

CREATE TABLE notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY,
                            user_id BIGINT NOT NULL,
                            telegram_chat_id VARCHAR(64) NOT NULL,
                            type ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,
                            template TEXT NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

ALTER TABLE notifications ADD INDEX idx_notifications_user_id (user_id);

-- Insert sample data with bcrypt-hashed passwords
INSERT INTO users (name, password) VALUES ('Artem', '$2a$12$VcngKA3zL9DUcBJD7vBoautPX3fO84xm0JIucatVr3MA1XZI9rdn.');

INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Temperature Sensor', 35.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'LPG', 50.0, 'WARNING');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Humidity Sensor', 60.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'CH4', 100.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Smoke', 100.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Flame', 100.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Light', 100.0, 'OK');

INSERT INTO `notifications` (`id`, `user_id`, `telegram_chat_id`, `template`, `type`) VALUES (NULL, '1', '392872938', '🚨 Critical Incident Notification\r\n\r\nDear %{username}, \r\nYour sensor **{{device_name}}** has reported a critical value:\r\n\r\n- **Current Value:** {{current_value}}\r\n- **Min Threshold:** {{lower_value}}\r\n- **Max Threshold:** {{critical_value}}\r\n- **Status:** CRITICAL\r\n\r\n📍 **Device Location:** {{device_location}}  \r\n🕒 **Timestamp:** {{timestamp}}\r\n', 'CRITICAL');