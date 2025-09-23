# 🗄️ Documentación de Base de Datos - 4DEI Guest Registration

## 📋 Información General

- **🗂️ Base de datos:** `guest_registration`
- **🔧 Motor:** MySQL 8.0+
- **📊 Charset:** utf8mb4_0900_ai_ci
- **🏗️ Arquitectura:** Relacional con integridad referencial

## 📊 Estructura de Tablas

### 👥 **Tabla: `guests`**
Almacena información de todos los invitados registrados en el sistema.

```sql
CREATE TABLE guests (
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
);
```

#### **📝 Descripción de Campos:**

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | INT | ID único del invitado (PK) | `1505` |
| `qr_code` | VARCHAR(255) | Código QR único del invitado | `SUPGEE61` |
| `name` | VARCHAR(255) | Nombre completo del invitado | `"Alberth Arevalo"` |
| `email` | VARCHAR(255) | Email del invitado (opcional) | `"idarmis101@gmail.com"` |
| `phone` | VARCHAR(255) | Teléfono del invitado (opcional) | `"27.857.630-2"` |
| `company` | VARCHAR(255) | Empresa del invitado (opcional) | `"Delicias Beby Spa"` |
| `category` | VARCHAR(100) | Categoría de invitado | `"Asistente 4DEI"` |
| `table_number` | INT | Número de mesa asignada | `5` |
| `special_requirements` | TEXT | Requerimientos especiales | `"Coquimbo - La Serena"` |
| `created_at` | TIMESTAMP | Fecha de registro | `2025-09-23 19:45:55` |
| `updated_at` | TIMESTAMP | Fecha de última actualización | `2025-09-23 19:45:55` |

### 📊 **Tabla: `attendance`**
Registra cada check-in de los invitados en el evento.

```sql
CREATE TABLE attendance (
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
);
```

#### **📝 Descripción de Campos:**

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | INT | ID único del registro (PK) | `1` |
| `guest_id` | INT | ID del invitado (FK) | `1505` |
| `qr_code` | VARCHAR(255) | Código QR escaneado | `SUPGEE61` |
| `check_in_time` | TIMESTAMP | Fecha y hora del check-in | `2025-09-23 16:55:54` |
| `device_info` | JSON | Información del dispositivo | `{"type": "mobile", "source": "app"}` |
| `location` | VARCHAR(255) | Ubicación del check-in | `"Aplicación Móvil"` |
| `notes` | TEXT | Notas adicionales | `"Check-in desde app móvil"` |

### 🎪 **Tabla: `events`** (Opcional)
Para gestión de múltiples eventos.

```sql
CREATE TABLE events (
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
);
```

## 🔗 Relaciones

### **Relación Principal: `guests` → `attendance`**
- **Tipo:** Uno a Muchos (1:N)
- **Descripción:** Un invitado puede tener múltiples registros de asistencia
- **Clave foránea:** `attendance.guest_id` → `guests.id`
- **Integridad:** `ON DELETE CASCADE` (eliminar asistencias si se elimina el invitado)

```
guests (1) ←→ (N) attendance
   ↓                ↓
  id             guest_id
```

## 🔍 Vistas Útiles

### **Vista: `guest_attendance_view`**
Combina información de invitados con su estado de asistencia.

```sql
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
```

### **Vista: `attendance_stats`**
Proporciona estadísticas de asistencia en tiempo real.

```sql
CREATE OR REPLACE VIEW attendance_stats AS
SELECT 
    COUNT(DISTINCT g.id) as total_guests,
    COUNT(DISTINCT a.guest_id) as attended_guests,
    COUNT(DISTINCT g.id) - COUNT(DISTINCT a.guest_id) as pending_guests,
    ROUND((COUNT(DISTINCT a.guest_id) / COUNT(DISTINCT g.id)) * 100, 2) as attendance_rate,
    COUNT(a.id) as total_checkins,
    DATE(NOW()) as stats_date
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;
```

## 📊 Índices para Performance

### **Índices Principales:**
```sql
-- Tabla guests
PRIMARY KEY (id)
UNIQUE KEY uk_qr_code (qr_code)
KEY idx_qr_code (qr_code)
KEY idx_name (name)
KEY idx_email (email)
KEY idx_company (company)

-- Tabla attendance
PRIMARY KEY (id)
KEY idx_guest_id (guest_id)
KEY idx_qr_code (qr_code)
KEY idx_check_in_time (check_in_time)

-- Índices compuestos para consultas frecuentes
KEY idx_guests_name_company (name, company)
KEY idx_attendance_guest_time (guest_id, check_in_time)
```

## 🔧 Consultas Frecuentes

### **1. Obtener invitado con estado de asistencia:**
```sql
SELECT 
    g.*,
    CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as has_attended,
    a.check_in_time
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id
WHERE g.qr_code = 'SUPGEE61';
```

### **2. Estadísticas de asistencia:**
```sql
SELECT 
    COUNT(*) as total_invitados,
    COUNT(DISTINCT a.guest_id) as total_asistieron,
    COUNT(*) - COUNT(DISTINCT a.guest_id) as total_pendientes,
    ROUND((COUNT(DISTINCT a.guest_id) / COUNT(*)) * 100, 2) as porcentaje_asistencia
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;
```

### **3. Invitados por empresa:**
```sql
SELECT 
    company,
    COUNT(*) as total_invitados,
    COUNT(DISTINCT a.guest_id) as asistieron
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id
WHERE company IS NOT NULL
GROUP BY company
ORDER BY total_invitados DESC;
```

### **4. Check-ins por hora:**
```sql
SELECT 
    HOUR(check_in_time) as hora,
    COUNT(*) as checkins
FROM attendance
WHERE DATE(check_in_time) = CURDATE()
GROUP BY HOUR(check_in_time)
ORDER BY hora;
```

### **5. Buscar invitados:**
```sql
SELECT * FROM guests 
WHERE name LIKE '%Alberto%' 
   OR email LIKE '%alberto%' 
   OR company LIKE '%Alberto%'
LIMIT 10;
```

## 💾 Scripts de Mantenimiento

### **🔄 Backup Completo:**
```bash
./database/backup.sh
```

### **📥 Restore desde Backup:**
```bash
./database/restore.sh latest
# o
./database/restore.sh backup_20250923_143022.sql
```

### **🔧 Migración de Esquema:**
```bash
mysql -u root -p guest_registration < database/schema.sql
```

## 📈 Optimización y Performance

### **Configuraciones Recomendadas MySQL:**
```ini
# my.cnf
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
query_cache_size = 32M
tmp_table_size = 64M
max_heap_table_size = 64M
```

### **Monitoreo de Performance:**
```sql
-- Consultas lentas
SELECT * FROM information_schema.processlist 
WHERE time > 2;

-- Tamaño de tablas
SELECT 
    table_name,
    round(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = 'guest_registration';

-- Estadísticas de índices
SHOW INDEX FROM guests;
SHOW INDEX FROM attendance;
```

## 🔒 Seguridad

### **Usuario Específico para la Aplicación:**
```sql
-- Crear usuario con permisos limitados
CREATE USER 'guest_app'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_registration.* TO 'guest_app'@'localhost';
FLUSH PRIVILEGES;
```

### **Backup de Seguridad:**
```sql
-- Backup antes de cambios importantes
mysqldump -u root -p --single-transaction guest_registration > safety_backup.sql
```

## 📊 Estado Actual de la Base de Datos

### **Estadísticas (Septiembre 2025):**
- **👥 Total Invitados:** 524
- **✅ Total Asistencias:** 0 (sistema recién configurado)
- **📊 Tasa de Asistencia:** 0%

### **Ejemplos de Datos:**

#### **Invitados de Ejemplo:**
| ID | QR Code | Nombre | Empresa | Categoría |
|----|---------|--------|---------|-----------|
| 1505 | SUPGEE61 | Alberth Arevalo | Delicias Beby Spa | Asistente 4DEI |
| 1277 | S8X8JZO7 | Alberto Márquez | Agencia 4 Norte SPA | Asistente 4DEI |
| 1188 | SUD34F3T | Ale Pizarro | - | Asistente 4DEI |

## 🛠️ Troubleshooting

### **Problemas Comunes:**

#### **1. Error de Conexión:**
```bash
# Verificar MySQL corriendo
brew services list | grep mysql
brew services start mysql

# Probar conexión
mysql -u root -p -e "SELECT 'OK' as status;"
```

#### **2. Error de Permisos:**
```sql
-- Verificar permisos de usuario
SHOW GRANTS FOR 'root'@'localhost';

-- Resetear permisos si es necesario
FLUSH PRIVILEGES;
```

#### **3. Tabla Corrupta:**
```sql
-- Verificar integridad
CHECK TABLE guests;
CHECK TABLE attendance;

-- Reparar si es necesario
REPAIR TABLE guests;
REPAIR TABLE attendance;
```

#### **4. Performance Lenta:**
```sql
-- Analizar consultas
EXPLAIN SELECT * FROM guests WHERE name LIKE '%Alberto%';

-- Optimizar tablas
OPTIMIZE TABLE guests;
OPTIMIZE TABLE attendance;
```

## 🔄 Migraciones Futuras

### **Posibles Mejoras:**
- [ ] **Tabla de eventos** para múltiples eventos
- [ ] **Tabla de roles** para diferentes tipos de usuarios
- [ ] **Tabla de dispositivos** para tracking de dispositivos
- [ ] **Tabla de configuración** para settings del sistema
- [ ] **Particionado por fecha** para grandes volúmenes de datos

### **Ejemplo de Migración:**
```sql
-- Migración 002: Agregar campo de evento
ALTER TABLE guests ADD COLUMN event_id INT DEFAULT 1;
ALTER TABLE attendance ADD COLUMN event_id INT DEFAULT 1;

-- Crear índices
CREATE INDEX idx_guests_event ON guests(event_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);
```

---

## 📞 Soporte

Para problemas con la base de datos:
1. **🔍 Revisar logs:** `/var/log/mysql/error.log`
2. **📊 Verificar espacio:** `df -h`
3. **🔧 Ejecutar diagnósticos:** `mysqlcheck -u root -p --all-databases`
4. **💾 Hacer backup:** `./database/backup.sh`

**🗄️ Base de datos lista y optimizada para producción!** ✅
