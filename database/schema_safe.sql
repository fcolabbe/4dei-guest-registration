-- =====================================================
-- 🗄️ ESQUEMA SEGURO DE BASE DE DATOS - 4DEI GUEST REGISTRATION
-- Compatible con MySQL 5.7+ y 8.0+
-- =====================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS guest_registration 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

USE guest_registration;

-- =====================================================
-- 📋 TABLA: guests
-- Almacena información de todos los invitados
-- =====================================================

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
    KEY idx_name (name),
    KEY idx_email (email),
    KEY idx_company (company)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- 📊 TABLA: attendance
-- Registra cada check-in de los invitados
-- =====================================================

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

-- =====================================================
-- 🎪 TABLA: events (Opcional - Para múltiples eventos)
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    location VARCHAR(255),
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    KEY idx_event_date (event_date),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- 🔧 ÍNDICES ADICIONALES (Creación segura)
-- =====================================================

-- Procedimiento para crear índices de forma segura
DELIMITER //

CREATE PROCEDURE CreateIndexIfNotExists(
    IN table_name VARCHAR(128),
    IN index_name VARCHAR(128), 
    IN index_columns VARCHAR(255)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = table_name 
    AND index_name = index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', index_name, ' ON ', table_name, ' (', index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ Índice creado: ', index_name) as result;
    ELSE
        SELECT CONCAT('⚠️ Índice ya existe: ', index_name) as result;
    END IF;
END //

DELIMITER ;

-- Crear índices adicionales de forma segura
CALL CreateIndexIfNotExists('guests', 'idx_guests_name_company', 'name, company');
CALL CreateIndexIfNotExists('attendance', 'idx_attendance_guest_time', 'guest_id, check_in_time');
CALL CreateIndexIfNotExists('guests', 'idx_guests_created_at', 'created_at');

-- Limpiar el procedimiento temporal
DROP PROCEDURE CreateIndexIfNotExists;

-- =====================================================
-- 🔍 VISTAS ÚTILES
-- =====================================================

-- Vista: Invitados con información de asistencia
CREATE OR REPLACE VIEW guest_attendance_view AS
SELECT 
    g.id,
    g.qr_code,
    g.name,
    g.email,
    g.phone,
    g.company,
    g.category,
    g.table_number,
    g.special_requirements,
    g.created_at as registered_at,
    CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as has_attended,
    a.check_in_time,
    a.location as check_in_location,
    a.device_info,
    a.notes as check_in_notes
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;

-- Vista: Estadísticas de asistencia
CREATE OR REPLACE VIEW attendance_stats AS
SELECT 
    COUNT(DISTINCT g.id) as total_guests,
    COUNT(DISTINCT a.guest_id) as attended_guests,
    COUNT(DISTINCT g.id) - COUNT(DISTINCT a.guest_id) as pending_guests,
    ROUND(
        (COUNT(DISTINCT a.guest_id) / COUNT(DISTINCT g.id)) * 100, 2
    ) as attendance_rate,
    COUNT(a.id) as total_checkins,
    DATE(NOW()) as stats_date
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;

-- =====================================================
-- 📊 PROCEDIMIENTOS ALMACENADOS
-- =====================================================

DELIMITER //

-- Procedimiento: Obtener estadísticas detalladas
CREATE PROCEDURE IF NOT EXISTS GetAttendanceStats()
BEGIN
    SELECT 
        total_guests,
        attended_guests,
        pending_guests,
        attendance_rate,
        total_checkins,
        stats_date
    FROM attendance_stats;
END //

-- Procedimiento: Check-in de invitado
CREATE PROCEDURE IF NOT EXISTS CheckInGuest(
    IN p_qr_code VARCHAR(255),
    IN p_device_info JSON,
    IN p_location VARCHAR(255),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_guest_id INT;
    DECLARE v_existing_count INT;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Buscar el invitado
    SELECT id INTO v_guest_id 
    FROM guests 
    WHERE qr_code = p_qr_code;
    
    -- Verificar si ya está registrado
    SELECT COUNT(*) INTO v_existing_count
    FROM attendance
    WHERE guest_id = v_guest_id;
    
    -- Si no existe el invitado
    IF v_guest_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Guest not found';
    END IF;
    
    -- Si ya está registrado
    IF v_existing_count > 0 THEN
        SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = 'Guest already checked in';
    END IF;
    
    -- Registrar check-in
    INSERT INTO attendance (guest_id, qr_code, device_info, location, notes)
    VALUES (v_guest_id, p_qr_code, p_device_info, p_location, p_notes);
    
    COMMIT;
    
    -- Retornar información del invitado
    SELECT 
        g.*,
        a.check_in_time,
        a.location as check_in_location
    FROM guests g
    JOIN attendance a ON g.id = a.guest_id
    WHERE g.id = v_guest_id
    ORDER BY a.check_in_time DESC
    LIMIT 1;
    
END //

DELIMITER ;

-- =====================================================
-- 📝 DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Insertar evento de ejemplo
INSERT IGNORE INTO events (id, name, description, event_date, location, status) 
VALUES (1, '4DEI Foro - Distrito de Emprendimiento e Innovación', 
        'Foro de emprendimiento e innovación', 
        CURDATE(), 
        'Centro de Eventos', 
        'active');

-- =====================================================
-- ✅ VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Mostrar tablas creadas
SELECT '📋 Tablas creadas:' as info;
SHOW TABLES;

-- Mostrar estadísticas iniciales
SELECT '📊 Estadísticas iniciales:' as info;
SELECT 'Installation completed successfully' as status;
SELECT COUNT(*) as total_guests FROM guests;
SELECT COUNT(*) as total_attendance FROM attendance;
SELECT COUNT(*) as total_events FROM events;

-- Mostrar índices creados
SELECT '🔧 Índices en guests:' as info;
SHOW INDEX FROM guests;

SELECT '🔧 Índices en attendance:' as info;
SHOW INDEX FROM attendance;
