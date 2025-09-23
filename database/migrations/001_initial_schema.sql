-- =====================================================
-- 📋 MIGRACIÓN 001: Esquema inicial
-- Fecha: 2025-09-23
-- Descripción: Creación de tablas principales del sistema
-- =====================================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS guest_registration 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

USE guest_registration;

-- Tabla de invitados
CREATE TABLE IF NOT EXISTS guests (
    id INT NOT NULL AUTO_INCREMENT,
    qr_code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(255) DEFAULT NULL,
    company VARCHAR(255) DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    table_number INT DEFAULT NULL,
    special_requirements TEXT,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_qr_code (qr_code),
    KEY idx_qr_code (qr_code),
    KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla de asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id INT NOT NULL AUTO_INCREMENT,
    guest_id INT NOT NULL,
    qr_code VARCHAR(255) NOT NULL,
    check_in_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    device_info JSON DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    notes TEXT,
    
    PRIMARY KEY (id),
    KEY idx_guest_id (guest_id),
    KEY idx_qr_code (qr_code),
    KEY idx_check_in_time (check_in_time),
    
    CONSTRAINT fk_attendance_guest 
        FOREIGN KEY (guest_id) 
        REFERENCES guests(id) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertar registro de migración
INSERT IGNORE INTO migrations (version, description, applied_at) 
VALUES ('001', 'Initial schema creation', NOW());
