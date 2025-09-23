# 🎫 Sistema de Registro de Invitados con Base de Datos

Sistema completo para gestionar invitados de eventos con importación de Excel, base de datos MySQL y aplicación móvil para registro de asistencia.

## 🚀 Características Principales

### 📊 **Gestión Completa de Invitados**
- **Importación de Excel** - Carga masiva de invitados desde archivo Excel
- **Base de datos MySQL** - Almacenamiento persistente y confiable
- **Registro de asistencia** - Control real de quién asistió al evento
- **Detección de duplicados** - Evita registros múltiples del mismo invitado
- **Panel de administración** - Interfaz web para gestionar el sistema

### 📱 **Aplicación Móvil Optimizada**
- **Escaneo QR continuo** - Registro rápido de múltiples invitados
- **Interfaz táctil** - Diseño optimizado para dispositivos móviles
- **Modo offline** - Funciona aunque falle la conexión
- **Feedback visual** - Confirmaciones claras con colores y animaciones
- **Alertas de duplicados** - Notifica si un invitado ya se registró

## 🛠️ Instalación y Configuración

### **1. Requisitos Previos**
```bash
# Instalar Node.js (versión 16 o superior)
# Descargar desde: https://nodejs.org/

# Instalar MySQL (versión 8.0 o superior)
# Descargar desde: https://dev.mysql.com/downloads/mysql/
```

### **2. Configurar Base de Datos**
```sql
-- Crear usuario para la aplicación (opcional pero recomendado)
CREATE USER 'guest_app'@'localhost' IDENTIFIED BY 'tu_password_seguro';
GRANT ALL PRIVILEGES ON guest_registration.* TO 'guest_app'@'localhost';
FLUSH PRIVILEGES;

-- La aplicación creará automáticamente la base de datos y tablas
```

### **3. Configurar Variables de Entorno**
```bash
# Renombrar config.env a .env y editar:
cp config.env .env

# Editar .env con tus datos:
DB_HOST=localhost
DB_USER=guest_app
DB_PASSWORD=tu_password_seguro
DB_NAME=guest_registration
PORT=3000
```

### **4. Instalar Dependencias**
```bash
# Instalar dependencias del servidor
npm install

# O usar el script incluido
npm run install-deps
```

### **5. Iniciar el Sistema**
```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

## 📋 Estructura de la Base de Datos

### **Tabla: guests**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- qr_code (VARCHAR(255), UNIQUE, NOT NULL) -- Código QR único del invitado
- name (VARCHAR(255), NOT NULL) -- Nombre completo
- email (VARCHAR(255)) -- Correo electrónico
- phone (VARCHAR(50)) -- Teléfono
- company (VARCHAR(255)) -- Empresa
- category (VARCHAR(100)) -- Categoría (VIP, General, Prensa, etc.)
- table_number (INT) -- Número de mesa asignada
- special_requirements (TEXT) -- Requerimientos especiales
- created_at (TIMESTAMP) -- Fecha de creación
- updated_at (TIMESTAMP) -- Fecha de actualización
```

### **Tabla: attendance**
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- guest_id (INT, FOREIGN KEY) -- Referencia al invitado
- qr_code (VARCHAR(255)) -- Código QR escaneado
- check_in_time (TIMESTAMP) -- Hora de registro de asistencia
- device_info (JSON) -- Información del dispositivo que registró
- location (VARCHAR(255)) -- Ubicación del registro
- notes (TEXT) -- Notas adicionales
```

## 📊 Formato del Archivo Excel

### **Columnas Requeridas:**

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| `qr_code` | Texto | ✅ **Sí** | Código QR único para cada invitado |
| `name` | Texto | ✅ **Sí** | Nombre completo del invitado |
| `email` | Texto | ❌ No | Correo electrónico |
| `phone` | Texto | ❌ No | Número de teléfono |
| `company` | Texto | ❌ No | Empresa u organización |
| `category` | Texto | ❌ No | Categoría (VIP, General, Prensa, etc.) |
| `table_number` | Número | ❌ No | Número de mesa asignada |
| `special_requirements` | Texto | ❌ No | Requerimientos especiales (dieta, accesibilidad, etc.) |

### **Ejemplo de Excel:**
```
qr_code    | name           | email              | company    | category | table_number
INV001     | Juan Pérez     | juan@email.com     | Empresa A  | VIP      | 1
INV002     | María García   | maria@email.com    | Empresa B  | General  | 5
INV003     | Carlos López   | carlos@email.com   | Prensa XYZ | Prensa   | 10
```

## 🌐 Endpoints de la API

### **Importación de Datos**
- `POST /api/import-excel` - Importar invitados desde Excel
- `GET /api/stats` - Obtener estadísticas del evento
- `GET /api/guests` - Listar invitados (con paginación)

### **Registro de Asistencia**
- `GET /api/guest/:qrCode` - Consultar información de un invitado
- `POST /api/check-in` - Registrar asistencia de un invitado

### **Páginas Web**
- `GET /` - Aplicación móvil para escaneo
- `GET /admin.html` - Panel de administración

## 📱 Uso del Sistema

### **1. Importar Lista de Invitados**
1. Acceder al panel de administración: `http://localhost:3000/admin.html`
2. Preparar archivo Excel con el formato requerido
3. Arrastrar archivo al área de carga o hacer clic para seleccionar
4. Hacer clic en "Importar Invitados"
5. Revisar logs y estadísticas de importación

### **2. Registrar Asistencia**
1. Acceder a la app móvil: `http://localhost:3000`
2. Hacer clic en "Iniciar Escáner"
3. Permitir acceso a la cámara
4. Apuntar la cámara al código QR del invitado
5. Ver confirmación de registro o alerta de duplicado

### **3. Monitorear Evento**
1. Usar panel de administración para ver estadísticas en tiempo real
2. Revisar lista de invitados y su estado de asistencia
3. Exportar datos para análisis posterior

## 🔧 Configuración Avanzada

### **Configuración de Producción**
```bash
# Variables de entorno para producción
NODE_ENV=production
PORT=80
DB_HOST=tu_servidor_mysql
DB_USER=usuario_produccion
DB_PASSWORD=password_seguro
```

### **Configuración de Seguridad**
- Cambiar passwords por defecto
- Usar HTTPS en producción
- Configurar firewall para MySQL
- Limitar acceso al panel de administración

### **Respaldo de Datos**
```bash
# Crear respaldo de la base de datos
mysqldump -u usuario -p guest_registration > backup_$(date +%Y%m%d).sql

# Restaurar respaldo
mysql -u usuario -p guest_registration < backup_20240101.sql
```

## 📊 Monitoreo y Análisis

### **Estadísticas Disponibles**
- Total de invitados registrados
- Número de asistentes confirmados
- Tasa de asistencia en tiempo real
- Asistencia por día/hora
- Distribución por categorías

### **Exportación de Datos**
- Exportar lista completa de invitados
- Exportar registros de asistencia
- Generar reportes personalizados

## 🆘 Solución de Problemas

### **Error de Conexión a MySQL**
```bash
# Verificar que MySQL esté ejecutándose
sudo systemctl status mysql

# Verificar conexión
mysql -u root -p -e "SELECT 1"
```

### **Error de Permisos de Archivo**
```bash
# Dar permisos a la carpeta de uploads
chmod 755 uploads/
```

### **Error de Importación de Excel**
- Verificar que las columnas tengan los nombres exactos
- Asegurar que `qr_code` y `name` no estén vacíos
- Verificar que el archivo sea .xlsx o .xls

## 🤝 Soporte y Contribuciones

Para reportar problemas o solicitar características:
1. Revisar la documentación completa
2. Verificar logs del servidor y navegador
3. Crear issue con información detallada

---

**¡Sistema listo para gestionar tu evento exitosamente!** 🎉
