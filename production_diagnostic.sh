#!/bin/bash

# =====================================================
# 🔍 DIAGNÓSTICO ESPECÍFICO DE PRODUCCIÓN
# Detecta inconsistencias entre local y producción
# =====================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 DIAGNÓSTICO DE PRODUCCIÓN - welcu.shortenqr.com${NC}"
echo -e "${YELLOW}================================================================${NC}"

# 1. Verificar PM2 y procesos
echo -e "\n${YELLOW}📋 PASO 1: Estado de PM2 y Procesos${NC}"
pm2 status
echo ""
pm2 logs 4dei-guest-registration --lines 10 --nostream

# 2. Verificar variables de entorno
echo -e "\n${YELLOW}🔧 PASO 2: Variables de Entorno${NC}"
echo "NODE_ENV: $NODE_ENV"
echo "PORT desde .env:"
grep "PORT=" .env 2>/dev/null || echo "❌ .env no encontrado"
echo "DB_USER desde .env:"
grep "DB_USER=" .env 2>/dev/null || echo "❌ DB_USER no encontrado"
echo "DB_NAME desde .env:"
grep "DB_NAME=" .env 2>/dev/null || echo "❌ DB_NAME no encontrado"

# 3. Probar conectividad local
echo -e "\n${YELLOW}🌐 PASO 3: Conectividad Local${NC}"
echo "Probando localhost:3009..."
curl -s -I "http://localhost:3009" | head -1 || echo "❌ Puerto 3009 no responde"

echo "Probando API stats local..."
curl -s "http://localhost:3009/api/stats" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ API Local: {data[\"stats\"][\"total_guests\"]} invitados, {data[\"stats\"][\"attended_guests\"]} asistieron')
except:
    print('❌ Error en API local')
" 2>/dev/null || echo "❌ API local no responde"

# 4. Probar conectividad externa
echo -e "\n${YELLOW}🌍 PASO 4: Conectividad Externa${NC}"
echo "Probando welcu.shortenqr.com..."
curl -s -I "https://welcu.shortenqr.com" | head -1 || echo "❌ Dominio no responde"

echo "Probando API stats externa..."
curl -s "https://welcu.shortenqr.com/api/stats" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ API Externa: {data[\"stats\"][\"total_guests\"]} invitados, {data[\"stats\"][\"attended_guests\"]} asistieron')
except:
    print('❌ Error en API externa')
" 2>/dev/null || echo "❌ API externa no responde"

# 5. Comparar respuestas
echo -e "\n${YELLOW}🔍 PASO 5: Comparación Detallada${NC}"
echo "=== RESPUESTA LOCAL ==="
curl -s "http://localhost:3009/api/stats" | python3 -m json.tool 2>/dev/null || echo "❌ Sin respuesta local"

echo -e "\n=== RESPUESTA EXTERNA ==="
curl -s "https://welcu.shortenqr.com/api/stats" | python3 -m json.tool 2>/dev/null || echo "❌ Sin respuesta externa"

# 6. Verificar Nginx
echo -e "\n${YELLOW}🔧 PASO 6: Configuración Nginx${NC}"
echo "Estado de Nginx:"
systemctl status nginx --no-pager -l | head -5

echo -e "\nConfiguraciones activas de welcu.shortenqr.com:"
ls -la /etc/nginx/sites-enabled/ | grep welcu || echo "❌ Configuración no encontrada"

echo -e "\nÚltimos logs de Nginx:"
tail -5 /var/log/nginx/access.log | grep welcu || echo "❌ Sin logs recientes"
tail -5 /var/log/nginx/error.log | grep welcu || echo "❌ Sin errores recientes"

# 7. Verificar base de datos
echo -e "\n${YELLOW}🗄️ PASO 7: Base de Datos${NC}"
echo "Probando conexión a MySQL..."
mysql -u welcu_user -pmibebe guest_registration -e "
SELECT 'Conexión OK' as status;
SELECT COUNT(*) as total_guests FROM guests;
SELECT COUNT(*) as total_attendance FROM attendance;
SELECT COUNT(DISTINCT guest_id) as unique_attended FROM attendance;
" 2>/dev/null || echo "❌ Error conectando a MySQL"

# 8. Verificar archivos del proyecto
echo -e "\n${YELLOW}📁 PASO 8: Archivos del Proyecto${NC}"
echo "Directorio actual: $(pwd)"
echo "Archivos principales:"
ls -la index.html server.js .env package.json 2>/dev/null

echo -e "\nÚltima actualización de archivos:"
ls -lt index.html server.js script.js | head -3

# 9. Verificar puertos en uso
echo -e "\n${YELLOW}🔌 PASO 9: Puertos en Uso${NC}"
echo "Procesos escuchando en puerto 3009:"
lsof -i :3009 2>/dev/null || echo "❌ Puerto 3009 no está en uso"

echo -e "\nProcesos escuchando en puerto 80/443:"
lsof -i :80 -i :443 2>/dev/null | head -5

# 10. Recomendaciones
echo -e "\n${GREEN}💡 RECOMENDACIONES:${NC}"
echo -e "${YELLOW}================================================================${NC}"

echo "1. Si hay diferencias entre APIs local/externa:"
echo "   - Verificar que PM2 esté ejecutando la versión correcta"
echo "   - Revisar configuración de Nginx"
echo "   - Verificar variables de entorno"

echo -e "\n2. Si la app móvil no muestra datos:"
echo "   - Verificar CORS en el servidor"
echo "   - Revisar logs de JavaScript en DevTools del móvil"
echo "   - Verificar que el frontend apunte al dominio correcto"

echo -e "\n3. Si hay datos inconsistentes:"
echo "   - Verificar que todas las instancias usen la misma base de datos"
echo "   - Revisar si hay múltiples aplicaciones ejecutándose"
echo "   - Verificar configuración de proxy en Nginx"

echo -e "\n${BLUE}🔧 Comandos de corrección rápida:${NC}"
echo "pm2 restart 4dei-guest-registration"
echo "systemctl reload nginx"
echo "mysql -u welcu_user -pmibebe guest_registration < database/schema_safe.sql"

echo -e "\n${GREEN}✅ Diagnóstico completado${NC}"
