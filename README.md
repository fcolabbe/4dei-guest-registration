# 🎫 Sistema de Registro de Invitados 4DEI Foro

Sistema completo de registro de asistencia para eventos con escaneo QR, desarrollado para el **4DEI Foro - Distrito de Emprendimiento e Innovación**.

## 🚀 Características Principales

### 📱 **Aplicación Móvil**
- **Escaneo QR en tiempo real** con cámara del dispositivo
- **Interfaz móvil-first** optimizada para uso en smartphones
- **Botón flotante de acceso rápido** para escaneo inmediato
- **Menú de navegación intuitivo** con 4 secciones principales
- **Check-in manual** para invitados sin código QR
- **Registro de nuevos invitados** in-situ
- **Estadísticas en tiempo real** del evento

### 🖥️ **Panel de Administración**
- **Importación masiva** desde archivos Excel
- **Lista completa de invitados** con filtros avanzados
- **Check-in/Check-out manual** desde el panel
- **Estadísticas detalladas** de asistencia
- **Descarga de tickets** integrada con Welcu

### 🔧 **Características Técnicas**
- **Base de datos MySQL** para persistencia de datos
- **API REST** con Node.js y Express
- **Detección de duplicados** con alertas visuales
- **Modo offline** para funcionamiento sin conexión
- **Integración webhook** con Make.com
- **Responsive design** para todos los dispositivos

## 🛠️ Instalación y Configuración

### **Prerrequisitos**
- Node.js 16+ 
- MySQL 8.0+
- Navegador moderno con soporte para cámara

### **1. Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/4dei-guest-registration.git
cd 4dei-guest-registration
```

### **2. Instalar dependencias**
```bash
npm install
```

### **3. Configurar base de datos**
```bash
# Instalar MySQL (macOS con Homebrew)
brew install mysql
brew services start mysql

# Crear base de datos
mysql -u root -p
CREATE DATABASE guest_registration;
```

### **4. Configurar variables de entorno**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar configuración
nano .env
```

**Configuración requerida en `.env`:**
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=guest_registration
PORT=3001
NODE_ENV=development
```

### **5. Iniciar el servidor**
```bash
# Modo desarrollo (con auto-restart)
npm run dev

# Modo producción
npm start
```

### **6. Acceder a las aplicaciones**
- **📱 App Móvil:** http://localhost:3001
- **🖥️ Panel Admin:** http://localhost:3001/admin.html

## 📋 Uso del Sistema

### **📱 Aplicación Móvil**

#### **Escaneo Rápido:**
1. Toca el **botón verde flotante** (FAB)
2. Permite acceso a la cámara
3. Apunta al código QR del invitado
4. ✅ Confirmación automática con vibración

#### **Check-in Manual:**
1. Ve a **"Check-in Manual"** en el menú
2. Busca por nombre, email o empresa
3. Toca **"Check-in"** en el resultado
4. ✅ Invitado registrado

#### **Nuevo Invitado:**
1. En "Check-in Manual" → **"Nuevo Invitado"**
2. Completa el formulario
3. Opción de **auto check-in**
4. ✅ Invitado creado y registrado

### **🖥️ Panel de Administración**

#### **Importar Excel:**
1. Prepara archivo Excel con columnas: `name`, `email`, `company`, `qr_code`
2. **"Importar Excel"** → Seleccionar archivo
3. Opción **"Reemplazar datos existentes"**
4. ✅ Invitados importados

#### **Gestionar Asistencia:**
- **Filtros:** Todos, Chequeados, Pendientes
- **Acciones:** Check-in manual, Marcar ausente
- **Búsqueda:** Por nombre, email, empresa

## 🗂️ Estructura del Proyecto

```
4dei-guest-registration/
├── 📱 Frontend (Aplicación Móvil)
│   ├── index.html          # Interfaz principal
│   ├── styles.css          # Estilos móvil-first
│   └── script.js           # Lógica de escaneo QR
│
├── 🖥️ Admin Panel
│   └── admin.html          # Panel de administración
│
├── 🖧 Backend
│   ├── server.js           # Servidor Node.js + Express
│   └── package.json        # Dependencias y scripts
│
├── 📊 Database
│   ├── guests table        # Información de invitados
│   └── attendance table    # Registros de asistencia
│
└── 📋 Documentación
    ├── README.md           # Este archivo
    ├── FIX_RESUMEN.md      # Historial de fixes
    └── README_SISTEMA.md   # Documentación técnica
```

## 🎨 Tecnologías Utilizadas

### **Frontend**
- **HTML5** - Estructura semántica
- **CSS3** - Diseño móvil-first con Grid/Flexbox
- **JavaScript ES6+** - Lógica de aplicación
- **jsQR** - Librería de escaneo QR
- **MediaDevices API** - Acceso a cámara

### **Backend**
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MySQL2** - Driver de base de datos
- **Multer** - Manejo de archivos
- **XLSX** - Procesamiento de Excel
- **CORS** - Manejo de peticiones cross-origin

### **Base de Datos**
- **MySQL 8.0** - Base de datos relacional
- **Tablas optimizadas** para consultas rápidas
- **Índices** en campos de búsqueda frecuente

## 🔌 Integraciones

### **Welcu (Tickets)**
- **URL Base:** `https://welcu.com/4dei/4dei-foro-distrito-de-emprendimiento-e-innovacion/tickets/`
- **Descarga directa** con código QR del invitado

### **Make.com (Webhook)**
- **Endpoint:** Configurable en `script.js`
- **Respaldo** para registros offline
- **Formato:** JSON con `qr_code`

## 📊 API Endpoints

### **Invitados**
- `GET /api/guests` - Listar invitados con filtros
- `POST /api/create-guest` - Crear nuevo invitado
- `POST /api/check-in` - Registrar check-in por QR
- `POST /api/manual-checkin` - Check-in manual por ID

### **Administración**
- `POST /api/import-excel` - Importar desde Excel
- `POST /api/mark-absent` - Marcar como ausente
- `GET /api/stats` - Estadísticas del evento
- `GET /api/attendance` - Registros de asistencia

## 🔧 Configuración Avanzada

### **Personalización de Marca**
```css
/* En styles.css - Cambiar colores principales */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea, #764ba2);
  --success-color: #4CAF50;
  --warning-color: #ff9800;
}
```

### **Configuración de Cámara**
```javascript
// En script.js - Ajustar resolución
this.stream = await navigator.mediaDevices.getUserMedia({ 
  video: { 
    facingMode: 'environment',
    width: { ideal: 640 },
    height: { ideal: 480 }
  } 
});
```

## 🐛 Troubleshooting

### **Errores Comunes**

#### **"Error de conexión MySQL"**
```bash
# Verificar que MySQL está corriendo
brew services list | grep mysql

# Reiniciar MySQL
brew services restart mysql

# Verificar credenciales en .env
```

#### **"Cámara no disponible"**
- Verificar permisos de cámara en el navegador
- Usar HTTPS en producción (requerido para cámara)
- Probar en diferentes navegadores

#### **"NaN horas en duplicados"**
✅ **SOLUCIONADO** - Ver `FIX_RESUMEN.md` para detalles

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

Desarrollado para **4DEI - Foro Distrito de Emprendimiento e Innovación**

---

## 🎯 Próximas Mejoras

- [ ] **Push notifications** para nuevos registros
- [ ] **Reportes PDF** exportables
- [ ] **Dashboard analytics** avanzado
- [ ] **Multi-idioma** (ES/EN)
- [ ] **Modo kiosco** para tablets
- [ ] **Integración calendario** para eventos múltiples

---

**¿Necesitas ayuda?** Abre un [issue](../../issues) en GitHub o contacta al equipo de desarrollo.

🚀 **¡Listo para registrar invitados!** 🎫