#!/bin/bash

# =====================================================
# 💾 SCRIPT DE BACKUP - 4DEI GUEST REGISTRATION DB
# =====================================================

# Configuración
DB_NAME="guest_registration"
DB_USER="root"
DB_PASSWORD="test123"  # Cambiar por tu password
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/guest_registration_backup_$DATE.sql"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗄️  Iniciando backup de base de datos...${NC}"

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

# Verificar conexión a MySQL
echo -e "${YELLOW}🔍 Verificando conexión a MySQL...${NC}"
mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SELECT 'Connection OK' as status;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: No se puede conectar a MySQL${NC}"
    echo -e "${YELLOW}💡 Verifica:${NC}"
    echo -e "   - MySQL está corriendo: brew services list | grep mysql"
    echo -e "   - Credenciales correctas en el script"
    echo -e "   - Base de datos existe: mysql -u $DB_USER -p -e 'SHOW DATABASES;'"
    exit 1
fi

echo -e "${GREEN}✅ Conexión MySQL exitosa${NC}"

# Realizar backup completo
echo -e "${YELLOW}💾 Creando backup completo...${NC}"
mysqldump -u $DB_USER -p$DB_PASSWORD \
    --routines \
    --triggers \
    --single-transaction \
    --lock-tables=false \
    --add-drop-table \
    --complete-insert \
    $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado exitosamente: $BACKUP_FILE${NC}"
    
    # Mostrar tamaño del archivo
    SIZE=$(ls -lh $BACKUP_FILE | awk '{print $5}')
    echo -e "${GREEN}📊 Tamaño del backup: $SIZE${NC}"
    
    # Comprimir backup
    echo -e "${YELLOW}🗜️  Comprimiendo backup...${NC}"
    gzip $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup comprimido: $BACKUP_FILE.gz${NC}"
        COMPRESSED_SIZE=$(ls -lh $BACKUP_FILE.gz | awk '{print $5}')
        echo -e "${GREEN}📊 Tamaño comprimido: $COMPRESSED_SIZE${NC}"
    else
        echo -e "${YELLOW}⚠️  Advertencia: No se pudo comprimir el backup${NC}"
    fi
    
else
    echo -e "${RED}❌ Error creando backup${NC}"
    exit 1
fi

# Backup solo de datos (sin estructura)
DATA_BACKUP_FILE="$BACKUP_DIR/guest_registration_data_$DATE.sql"
echo -e "${YELLOW}📊 Creando backup solo de datos...${NC}"
mysqldump -u $DB_USER -p$DB_PASSWORD \
    --no-create-info \
    --complete-insert \
    $DB_NAME > $DATA_BACKUP_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup de datos creado: $DATA_BACKUP_FILE${NC}"
    gzip $DATA_BACKUP_FILE
else
    echo -e "${YELLOW}⚠️  Advertencia: No se pudo crear backup de datos${NC}"
fi

# Mostrar estadísticas de la base de datos
echo -e "\n${YELLOW}📊 Estadísticas de la base de datos:${NC}"
mysql -u $DB_USER -p$DB_PASSWORD -e "
USE $DB_NAME;
SELECT 'Invitados totales' as Metric, COUNT(*) as Value FROM guests
UNION ALL
SELECT 'Registros de asistencia', COUNT(*) FROM attendance
UNION ALL
SELECT 'Invitados con check-in', COUNT(DISTINCT guest_id) FROM attendance;
"

# Limpiar backups antiguos (mantener últimos 7 días)
echo -e "\n${YELLOW}🧹 Limpiando backups antiguos (>7 días)...${NC}"
find $BACKUP_DIR -name "guest_registration_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "guest_registration_data_*.sql.gz" -mtime +7 -delete

echo -e "\n${GREEN}🎉 Backup completado exitosamente!${NC}"
echo -e "${YELLOW}📁 Archivos de backup en: $BACKUP_DIR${NC}"
ls -la $BACKUP_DIR/*$DATE*

echo -e "\n${YELLOW}💡 Para restaurar el backup:${NC}"
echo -e "   gunzip $BACKUP_FILE.gz"
echo -e "   mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < $BACKUP_FILE"
