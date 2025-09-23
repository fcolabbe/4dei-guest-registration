# 🚀 Guía de Despliegue - Sistema 4DEI Guest Registration

## 📋 Información del Repositorio

- **🌐 GitHub:** https://github.com/fcolabbe/4dei-guest-registration
- **📱 Demo Local:** http://localhost:3001
- **🖥️ Admin Panel:** http://localhost:3001/admin.html

## ⚡ Inicio Rápido

### **1. Clonar y Setup**
```bash
# Clonar repositorio
git clone https://github.com/fcolabbe/4dei-guest-registration.git
cd 4dei-guest-registration

# Instalar dependencias
npm install

# Configurar entorno
cp env.example .env
# Editar .env con tus credenciales MySQL
```

### **2. Base de Datos**
```bash
# MySQL (macOS)
brew install mysql
brew services start mysql

# Crear base de datos
mysql -u root -p -e "CREATE DATABASE guest_registration;"
```

### **3. Iniciar Aplicación**
```bash
# Desarrollo (auto-restart)
npm run dev

# Producción
npm start
```

## 🌐 Despliegue en Producción

### **Heroku**
```bash
# Instalar Heroku CLI
npm install -g heroku

# Login y crear app
heroku login
heroku create 4dei-guest-registration

# Configurar MySQL (ClearDB)
heroku addons:create cleardb:ignite

# Variables de entorno
heroku config:set NODE_ENV=production
heroku config:set PORT=80

# Deploy
git push heroku main
```

### **DigitalOcean/AWS/VPS**
```bash
# En el servidor
git clone https://github.com/fcolabbe/4dei-guest-registration.git
cd 4dei-guest-registration

# Instalar dependencias
npm install --production

# Configurar PM2 (process manager)
npm install -g pm2
pm2 start server.js --name "4dei-guest-registration"
pm2 startup
pm2 save

# Nginx (proxy reverso)
sudo apt install nginx
# Configurar /etc/nginx/sites-available/4dei-guest-registration
```

## 🔧 Variables de Entorno

```env
# Base de datos
DB_HOST=tu-host-mysql
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=guest_registration

# Servidor
PORT=3001
NODE_ENV=production

# SSL (producción)
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
```

## 📊 Monitoreo

### **Logs**
```bash
# PM2 logs
pm2 logs 4dei-guest-registration

# Logs específicos
pm2 logs 4dei-guest-registration --lines 100
```

### **Métricas**
```bash
# Estado de la aplicación
pm2 status

# Monitoreo en tiempo real
pm2 monit
```

## 🔒 Seguridad

### **HTTPS (Producción)**
```javascript
// En server.js para HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

https.createServer(options, app).listen(443, () => {
  console.log('🔒 HTTPS Server running on port 443');
});
```

### **Configuración Nginx**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔄 Actualizaciones

### **Deploy Automático**
```bash
# Script de deploy
#!/bin/bash
cd /path/to/4dei-guest-registration
git pull origin main
npm install --production
pm2 restart 4dei-guest-registration
```

### **GitHub Actions (CI/CD)**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@server 'cd /path/to/app && ./deploy.sh'
```

## 📱 PWA (Progressive Web App)

### **Manifest.json**
```json
{
  "name": "4DEI Guest Registration",
  "short_name": "4DEI Guests",
  "description": "Sistema de registro de invitados con QR",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#764ba2",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🛠️ Mantenimiento

### **Backup Base de Datos**
```bash
# Backup diario
mysqldump -u user -p guest_registration > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u user -p guest_registration < backup_20250923.sql
```

### **Limpieza de Logs**
```bash
# Rotar logs PM2
pm2 flush

# Limpiar logs antiguos
find /var/log -name "*.log" -mtime +30 -delete
```

## 🆘 Troubleshooting

### **Errores Comunes**
```bash
# Puerto ocupado
lsof -ti:3001 | xargs kill -9

# Permisos de archivos
sudo chown -R www-data:www-data /path/to/app

# Reiniciar servicios
sudo systemctl restart nginx
pm2 restart all
```

### **Debug Modo Producción**
```bash
# Variables de debug
DEBUG=* node server.js

# Logs detallados
NODE_ENV=development npm start
```

---

## ✅ Checklist de Despliegue

- [ ] ✅ Repositorio clonado
- [ ] ✅ Dependencias instaladas
- [ ] ✅ Base de datos configurada
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Aplicación funcionando localmente
- [ ] 🌐 HTTPS configurado (producción)
- [ ] 🔒 Firewall configurado
- [ ] 📊 Monitoreo activo
- [ ] 💾 Backup automatizado
- [ ] 🔄 CI/CD configurado

**🎉 ¡Listo para producción!** 🚀
