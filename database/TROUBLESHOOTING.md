# 🔧 Troubleshooting - Base de Datos MySQL

## 🚨 Error SQL Syntax: "CREATE INDEX IF NOT EXISTS"

### **❌ Error Reportado:**
```
ERROR 1064 (42000) at line 195: You have an error in your SQL syntax; 
check the manual that corresponds to your MySQL server version for the 
right syntax to use near 'IF NOT EXISTS idx_guests_name_company ON guests(name, company)' at line 1
```

### **🔍 Causa:**
La sintaxis `CREATE INDEX IF NOT EXISTS` no está soportada en versiones anteriores de MySQL (< 8.0.23).

### **✅ Soluciones:**

#### **Opción 1: Usar Schema Seguro (Recomendado)**
```bash
# Usar el schema compatible con versiones anteriores
mysql -u root -p < database/schema_safe.sql
```

#### **Opción 2: Usar Script de Instalación**
```bash
# Script automatizado que detecta la versión de MySQL
./database/install.sh --safe
```

#### **Opción 3: Instalación Manual**
```bash
# 1. Crear base de datos
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS guest_registration CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

# 2. Crear tablas básicas (sin índices problemáticos)
mysql -u root -p guest_registration << 'EOF'
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
EOF

# 3. Crear índices adicionales manualmente (opcional)
mysql -u root -p guest_registration -e "
CREATE INDEX idx_guests_name_company ON guests(name, company);
CREATE INDEX idx_attendance_guest_time ON attendance(guest_id, check_in_time);
CREATE INDEX idx_guests_created_at ON guests(created_at);
" 2>/dev/null || echo "Algunos índices ya existen (normal)"
```

## 🔧 Otros Problemas Comunes

### **🚨 Error: "Table already exists"**
```bash
# Si las tablas ya existen, usar:
mysql -u root -p guest_registration < database/schema_safe.sql
# El script maneja tablas existentes automáticamente
```

### **🚨 Error: "Access denied"**
```bash
# Verificar permisos del usuario
mysql -u root -p -e "SHOW GRANTS FOR 'root'@'localhost';"

# Si es necesario, crear usuario específico:
mysql -u root -p -e "
CREATE USER IF NOT EXISTS 'guest_app'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON guest_registration.* TO 'guest_app'@'localhost';
FLUSH PRIVILEGES;
"
```

### **🚨 Error: "Unknown collation"**
```bash
# Para versiones muy antiguas de MySQL, usar:
mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS guest_registration 
CHARACTER SET utf8 COLLATE utf8_general_ci;
"
```

### **🚨 Error: "JSON column not supported"**
```bash
# Para MySQL < 5.7, cambiar device_info de JSON a TEXT:
mysql -u root -p guest_registration -e "
ALTER TABLE attendance MODIFY device_info TEXT;
"
```

## 🔍 Diagnóstico del Sistema

### **Verificar Versión de MySQL:**
```bash
mysql --version
mysql -u root -p -e "SELECT VERSION();"
```

### **Verificar Estado de MySQL:**
```bash
# Ubuntu/Debian
sudo systemctl status mysql

# CentOS/RHEL
sudo systemctl status mysqld

# macOS
brew services list | grep mysql
```

### **Verificar Configuración:**
```bash
# Ver configuración actual
mysql -u root -p -e "SHOW VARIABLES LIKE 'character_set%';"
mysql -u root -p -e "SHOW VARIABLES LIKE 'collation%';"
```

### **Verificar Tablas Creadas:**
```bash
mysql -u root -p guest_registration -e "
SHOW TABLES;
DESCRIBE guests;
DESCRIBE attendance;
SHOW INDEX FROM guests;
"
```

## 🚀 Scripts de Instalación Disponibles

### **1. Script Automático (Recomendado):**
```bash
./database/install.sh --safe
```

### **2. Schema Seguro:**
```bash
mysql -u root -p < database/schema_safe.sql
```

### **3. Schema Original (Solo MySQL 8.0.23+):**
```bash
mysql -u root -p < database/schema.sql
```

## 📊 Verificación Post-Instalación

### **Verificar Estructura:**
```bash
mysql -u root -p guest_registration -e "
SELECT 'Tablas creadas:' as info;
SHOW TABLES;

SELECT 'Estructura guests:' as info;
DESCRIBE guests;

SELECT 'Estructura attendance:' as info; 
DESCRIBE attendance;

SELECT 'Índices guests:' as info;
SHOW INDEX FROM guests;

SELECT 'Estadísticas iniciales:' as info;
SELECT COUNT(*) as total_guests FROM guests;
SELECT COUNT(*) as total_attendance FROM attendance;
"
```

### **Probar Funcionalidad Básica:**
```bash
# Insertar invitado de prueba
mysql -u root -p guest_registration -e "
INSERT INTO guests (qr_code, name, email, company, category) 
VALUES ('TEST001', 'Usuario Prueba', 'test@example.com', 'Test Company', 'Test');

SELECT 'Invitado de prueba creado:' as info;
SELECT * FROM guests WHERE qr_code = 'TEST001';
"
```

## 🆘 Soporte Adicional

### **Logs de MySQL:**
```bash
# Ubuntu/Debian
sudo tail -f /var/log/mysql/error.log

# CentOS/RHEL  
sudo tail -f /var/log/mysqld.log

# macOS (Homebrew)
tail -f /opt/homebrew/var/mysql/*.err
```

### **Reiniciar MySQL:**
```bash
# Ubuntu/Debian
sudo systemctl restart mysql

# CentOS/RHEL
sudo systemctl restart mysqld

# macOS
brew services restart mysql
```

### **Verificar Espacio en Disco:**
```bash
df -h
du -sh /var/lib/mysql/  # Linux
du -sh /opt/homebrew/var/mysql/  # macOS
```

## 📞 Contacto

Si el problema persiste:

1. **📋 Recopilar información:**
   ```bash
   mysql --version > debug_info.txt
   mysql -u root -p -e "SELECT VERSION(); SHOW VARIABLES LIKE 'sql_mode';" >> debug_info.txt
   ```

2. **🔍 Revisar logs** de MySQL

3. **📧 Reportar issue** en GitHub con la información recopilada

---

**💡 Tip:** Siempre usa `./database/install.sh --safe` para instalaciones en producción, ya que es compatible con todas las versiones de MySQL.
