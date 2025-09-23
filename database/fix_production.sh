#!/bin/bash

# =====================================================
# 🔧 FIX PARA PROBLEMAS DE PRODUCCIÓN
# Soluciona inconsistencias en estadísticas y detección de invitados
# =====================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_USER="welcu_user"
DB_PASSWORD="mibebe"
DB_NAME="guest_registration"

echo -e "${BLUE}🔧 FIX DE PROBLEMAS DE PRODUCCIÓN - 4DEI Guest Registration${NC}"
echo -e "${YELLOW}================================================================${NC}"

# 1. Diagnóstico completo
echo -e "\n${YELLOW}📊 PASO 1: Diagnóstico de la base de datos${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SELECT '=== ESTADÍSTICAS ACTUALES ===' as info;
SELECT COUNT(*) as total_invitados FROM guests;
SELECT COUNT(DISTINCT guest_id) as invitados_con_checkin FROM attendance;
SELECT COUNT(*) as total_registros_attendance FROM attendance;

SELECT '=== DUPLICADOS EN ATTENDANCE ===' as info;
SELECT guest_id, COUNT(*) as registros 
FROM attendance 
GROUP BY guest_id 
HAVING COUNT(*) > 1;

SELECT '=== QR CODES DUPLICADOS ===' as info;
SELECT qr_code, COUNT(*) as cantidad
FROM guests
GROUP BY qr_code
HAVING COUNT(*) > 1;
EOF

# 2. Hacer backup de seguridad
echo -e "\n${YELLOW}💾 PASO 2: Backup de seguridad${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > "backup_before_fix_$TIMESTAMP.sql"
echo -e "${GREEN}✅ Backup creado: backup_before_fix_$TIMESTAMP.sql${NC}"

# 3. Limpiar duplicados en attendance
echo -e "\n${YELLOW}🧹 PASO 3: Limpiar duplicados en attendance${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
-- Crear tabla de backup
CREATE TABLE attendance_backup AS SELECT * FROM attendance;

-- Eliminar duplicados manteniendo el más reciente
DELETE a1 FROM attendance a1
INNER JOIN attendance a2 
WHERE a1.id < a2.id 
AND a1.guest_id = a2.guest_id;

-- Verificar resultado
SELECT 'Duplicados restantes:' as info;
SELECT guest_id, COUNT(*) as registros 
FROM attendance 
GROUP BY guest_id 
HAVING COUNT(*) > 1;
EOF

# 4. Recrear vista de estadísticas
echo -e "\n${YELLOW}📈 PASO 4: Recrear vista de estadísticas${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
-- Eliminar vista existente
DROP VIEW IF EXISTS attendance_stats;

-- Recrear vista con cálculos correctos
CREATE VIEW attendance_stats AS
SELECT 
    COUNT(DISTINCT g.id) as total_guests,
    COUNT(DISTINCT a.guest_id) as attended_guests,
    COUNT(DISTINCT g.id) - COUNT(DISTINCT a.guest_id) as pending_guests,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT g.id) > 0 
            THEN (COUNT(DISTINCT a.guest_id) / COUNT(DISTINCT g.id)) * 100 
            ELSE 0 
        END, 2
    ) as attendance_rate,
    COUNT(a.id) as total_checkins,
    DATE(NOW()) as stats_date
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;

-- Verificar vista
SELECT 'Vista recreada:' as info;
SELECT * FROM attendance_stats;
EOF

# 5. Optimizar índices para búsquedas de QR
echo -e "\n${YELLOW}🚀 PASO 5: Optimizar índices${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
-- Verificar índices existentes
SHOW INDEX FROM guests WHERE Column_name = 'qr_code';

-- Crear índice optimizado si no existe
CREATE INDEX IF NOT EXISTS idx_qr_code_optimized ON guests(qr_code);

-- Optimizar tabla
OPTIMIZE TABLE guests;
OPTIMIZE TABLE attendance;
EOF

# 6. Probar funcionalidad de búsqueda
echo -e "\n${YELLOW}🔍 PASO 6: Probar búsqueda de invitados${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SELECT 'Probando búsqueda de QR codes:' as info;

-- Obtener algunos QR codes de ejemplo
SELECT qr_code, name, 
       (SELECT COUNT(*) FROM attendance WHERE guest_id = g.id) as tiene_checkin
FROM guests g 
ORDER BY RAND() 
LIMIT 5;
EOF

# 7. Verificar endpoint de estadísticas
echo -e "\n${YELLOW}📡 PASO 7: Verificar endpoint de estadísticas${NC}"
if command -v curl &> /dev/null; then
    echo "Probando endpoint /api/stats..."
    curl -s "http://localhost:3009/api/stats" | python3 -m json.tool 2>/dev/null || echo "Endpoint no disponible o JSON inválido"
else
    echo "curl no disponible, saltando prueba de endpoint"
fi

# 8. Estadísticas finales
echo -e "\n${YELLOW}📊 PASO 8: Estadísticas finales${NC}"
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SELECT '=== ESTADÍSTICAS DESPUÉS DEL FIX ===' as info;

-- Estadísticas básicas
SELECT 
    'Básicas' as tipo,
    COUNT(*) as total_invitados,
    (SELECT COUNT(DISTINCT guest_id) FROM attendance) as con_checkin,
    COUNT(*) - (SELECT COUNT(DISTINCT guest_id) FROM attendance) as pendientes
FROM guests;

-- Desde la vista
SELECT 
    'Vista' as tipo,
    total_guests as total_invitados,
    attended_guests as con_checkin,
    pending_guests as pendientes
FROM attendance_stats;

-- Para el endpoint
SELECT 
    'Endpoint' as tipo,
    COUNT(*) as total_guests,
    (SELECT COUNT(DISTINCT guest_id) FROM attendance) as attended_guests,
    (SELECT COUNT(DISTINCT guest_id) FROM attendance WHERE DATE(check_in_time) = CURDATE()) as today_attendance,
    ROUND((SELECT COUNT(DISTINCT guest_id) FROM attendance) / COUNT(*) * 100, 2) as attendance_rate
FROM guests;
EOF

echo -e "\n${GREEN}🎉 FIX COMPLETADO${NC}"
echo -e "${YELLOW}📋 Acciones realizadas:${NC}"
echo -e "   ✅ Backup de seguridad creado"
echo -e "   ✅ Duplicados en attendance eliminados"
echo -e "   ✅ Vista de estadísticas recreada"
echo -e "   ✅ Índices optimizados"
echo -e "   ✅ Tablas optimizadas"

echo -e "\n${YELLOW}🔄 Próximos pasos:${NC}"
echo -e "   1. Reiniciar la aplicación: pm2 restart 4dei-guest-registration"
echo -e "   2. Limpiar caché del navegador (Ctrl+F5)"
echo -e "   3. Probar check-in con un QR code conocido"
echo -e "   4. Verificar estadísticas en app móvil y panel admin"

echo -e "\n${BLUE}📞 Si persisten problemas:${NC}"
echo -e "   - Revisar logs: pm2 logs 4dei-guest-registration"
echo -e "   - Verificar conexión DB: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME"
echo -e "   - Ejecutar diagnóstico: node fix_stats_issues.js"
