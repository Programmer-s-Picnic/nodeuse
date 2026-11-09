-- Run in the MySQL database configured by DB_NAME.
-- Classroom only: passwords are stored as plaintext by request.
-- Never use this for real accounts or reuse personal passwords.
CREATE TABLE IF NOT EXISTS `register` (
    username VARCHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- To verify registered users without displaying passwords:
-- SELECT username, name FROM `register`;
