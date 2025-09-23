#!/bin/bash

# =====================================================
# 🔍 VERIFICACIÓN DE CONFIGURACIÓN NGINX
# Detecta problemas de proxy y routing
# =====================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 VERIFICACIÓN NGINX - welcu.shortenqr.com${NC}"
echo -e "${YELLOW}=================================================${NC}"

# 1. Verificar configuración activa
echo -e "\n${YELLOW}📋 Configuración Activa${NC}"
if [ -f "/etc/nginx/sites-enabled/welcu.shortenqr.com" ]; then
    echo "✅ Configuración encontrada: /etc/nginx/sites-enabled/welcu.shortenqr.com"
    
    echo -e "\n${BLUE}Configuración actual:${NC}"
    cat /etc/nginx/sites-enabled/welcu.shortenqr.com | grep -A 5 -B 5 "location /api/"
    
    echo -e "\n${BLUE}Puerto de proxy:${NC}"
    grep -n "proxy_pass.*localhost" /etc/nginx/sites-enabled/welcu.shortenqr.com || echo "❌ No se encontró proxy_pass"
    
else
    echo "❌ Configuración no encontrada"
fi

# 2. Verificar sintaxis
echo -e "\n${YELLOW}🔧 Sintaxis de Nginx${NC}"
nginx -t

# 3. Verificar proceso
echo -e "\n${YELLOW}🔄 Estado del Proceso${NC}"
systemctl status nginx --no-pager | head -5

# 4. Verificar logs recientes
echo -e "\n${YELLOW}📋 Logs Recientes${NC}"
echo "=== ACCESS LOG ==="
tail -10 /var/log/nginx/access.log | grep -E "(welcu|api)" || echo "❌ No hay logs recientes"

echo -e "\n=== ERROR LOG ==="
tail -10 /var/log/nginx/error.log | grep -E "(welcu|api)" || echo "✅ No hay errores recientes"

# 5. Probar conectividad interna
echo -e "\n${YELLOW}🌐 Conectividad Interna${NC}"
echo "Probando puerto 3009 local..."
curl -s -I "http://localhost:3009" | head -1 || echo "❌ Puerto 3009 no responde"

echo "Probando API local..."
curl -s "http://localhost:3009/api/stats" >/dev/null && echo "✅ API local responde" || echo "❌ API local no responde"

# 6. Generar configuración correcta
echo -e "\n${GREEN}💡 CONFIGURACIÓN CORRECTA SUGERIDA:${NC}"
echo -e "${YELLOW}=================================================${NC}"

cat << 'EOF'
server {
    server_name welcu.shortenqr.com www.welcu.shortenqr.com;

    # API Backend - Aplicación 4DEI Guest Registration
    location /api/ {
        proxy_pass http://localhost:3009/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Headers para evitar caché en APIs
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Archivos estáticos de la aplicación
    location ~* \.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        root /root/4dei-guest-registration;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Panel de administración
    location /admin.html {
        root /root/4dei-guest-registration;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Aplicación móvil principal (index.html)
    location / {
        root /root/4dei-guest-registration;
        try_files $uri $uri/ /index.html;
        
        # Headers para prevenir caché en la app móvil
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Certificados SSL existentes
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/welcu.shortenqr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/welcu.shortenqr.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = welcu.shortenqr.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name welcu.shortenqr.com www.welcu.shortenqr.com;
    return 404;
}
EOF

echo -e "\n${BLUE}🔧 Comandos para aplicar:${NC}"
echo "1. Hacer backup: cp /etc/nginx/sites-available/welcu.shortenqr.com /etc/nginx/sites-available/welcu.shortenqr.com.backup"
echo "2. Aplicar nueva configuración (copiar el bloque de arriba)"
echo "3. Probar: nginx -t"
echo "4. Recargar: systemctl reload nginx"
echo "5. Verificar: curl -I https://welcu.shortenqr.com/api/stats"
