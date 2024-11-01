CREATE DATABASE IF NOT EXISTS monitoring;
USE monitoring;

-- Drop table if it exists
DROP TABLE IF EXISTS users;

-- Create the users table
CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       password VARCHAR(255) NOT NULL  -- Add password column
);

-- Insert sample data with bcrypt-hashed passwords
INSERT INTO users (name, password) VALUES ('Alice', '$2a$10$D9GUVkDgwXQ/pRe6Y.c0OeONyZRR5sg/Hud7gVp/N.XEVL3gyXLyK');
INSERT INTO users (name, password) VALUES ('Bob', '$2a$10$E7jwqH3y9bD1zPIk4u8lduLC14cBAvk1u9FZ3uyb/QjWGHt9OuJ1m');
INSERT INTO users (name, password) VALUES ('Charlie', '$2a$10$F3G4Tpkl5Hu0ePxXZ6mXOOhZ3wFYIcqZ7E1.a8Pz2D7b6oC9nOn4G');
