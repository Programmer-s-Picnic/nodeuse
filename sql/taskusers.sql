-- NodeUse student login demonstration. Run once in your existing MySQL database.
-- WARNING: plaintext passwords are explicitly for a classroom demonstration.
-- Do not use real or reused passwords. Upgrade to password hashing before public use.
CREATE TABLE IF NOT EXISTS taskusers (
    username VARCHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
