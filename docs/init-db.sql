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
                         user_id BIGINT NOT NULL,
                         name VARCHAR(255) NOT NULL,
                         description VARCHAR(255) NULL,
                         critical_value DOUBLE NULL,
                         status ENUM('OK', 'WARNING', 'CRITICAL', 'OFFLINE') DEFAULT 'OFFLINE',
                         last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sensor_data (
                             id BIGINT AUTO_INCREMENT PRIMARY KEY,
                             device_id BIGINT NOT NULL,
                             timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                             value DECIMAL(10, 2) NULL,
                             CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- Insert sample data with bcrypt-hashed passwords
INSERT INTO users (name, password) VALUES ('Alice', '$2a$10$D9GUVkDgwXQ/pRe6Y.c0OeONyZRR5sg/Hud7gVp/N.XEVL3gyXLyK');
INSERT INTO users (name, password) VALUES ('Bob', '$2a$10$E7jwqH3y9bD1zPIk4u8lduLC14cBAvk1u9FZ3uyb/QjWGHt9OuJ1m');
INSERT INTO users (name, password) VALUES ('Charlie', '$2a$10$F3G4Tpkl5Hu0ePxXZ6mXOOhZ3wFYIcqZ7E1.a8Pz2D7b6oC9nOn4G');

INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Temperature Sensor', 75.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (1, 'Pressure Sensor', 50.0, 'WARNING');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (2, 'Humidity Sensor', 60.0, 'OK');
INSERT INTO devices (user_id, name, critical_value, status) VALUES (3, 'CO2 Sensor', 100.0, 'CRITICAL');