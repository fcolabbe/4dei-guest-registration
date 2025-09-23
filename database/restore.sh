#!/bin/bash

# =====================================================
# 🔄 SCRIPT DE RESTORE - 4DEI GUEST REGISTRATION DB
# =====================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DB_NAME="guest_registration"
DB_USER="root"
DB_PASSWORD="test123"  # Cambiar por tu password
BACKUP_DIR="./backups"

echo -e "${BLUE}🔄 SCRIPT DE RESTORE - 4DEI Guest Registration${NC}"
echo -e "${YELLOW}================================================${NC}"

# Función para mostrar ayuda
show_help() {
    echo -e "\n${YELLOW}📖 Uso:${NC}"
    echo -e "   $0 [archivo_backup.sql]"
    echo -e "\n${YELLOW}📖 Ejemplos:${NC}"
    echo -e "   $0                                    # Mostrar backups disponibles"
    echo -e "   $0 backup_20230923_143022.sql        # Restaurar backup específico"
    echo -e "   $0 latest                            # Restaurar el backup más reciente"
    echo -e "\n${YELLOW}📁 Directorio de backups: $BACKUP_DIR${NC}"
}

# Función para listar backups disponibles
list_backups() {
    echo -e "\n${YELLOW}📁 Backups disponibles:${NC}"
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        ls -lht $BACKUP_DIR/*.sql* 2>/dev/null | head -10
    else
        echo -e "${RED}❌ No se encontraron backups en $BACKUP_DIR${NC}"
        echo -e "${YELLOW}💡 Ejecuta primero: ./database/backup.sh${NC}"
    fi
}

# Función para verificar conexión MySQL
check_mysql_connection() {
    echo -e "${YELLOW}🔍 Verificando conexión a MySQL...${NC}"
    mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT 'Connection OK' as status;" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: No se puede conectar a MySQL${NC}"
        echo -e "${YELLOW}💡 Verifica:${NC}"
        echo -e "   - MySQL está corriendo: brew services list | grep mysql"
        echo -e "   - Credenciales correctas en el script"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Conexión MySQL exitosa${NC}"
}

# Función para restaurar backup
restore_backup() {
    local backup_file=$1
    
    # Verificar si el archivo existe
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Error: Archivo no encontrado: $backup_file${NC}"
        return 1
    fi
    
    # Verificar si es archivo comprimido
    if [[ $backup_file == *.gz ]]; then
        echo -e "${YELLOW}🗜️  Descomprimiendo archivo...${NC}"
        gunzip -k "$backup_file"
        backup_file="${backup_file%.gz}"
    fi
    
    # Hacer backup de seguridad antes de restaurar
    echo -e "${YELLOW}💾 Creando backup de seguridad antes de restaurar...${NC}"
    SAFETY_BACKUP="$BACKUP_DIR/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
    mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > "$SAFETY_BACKUP" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup de seguridad creado: $SAFETY_BACKUP${NC}"
    else
        echo -e "${YELLOW}⚠️  Advertencia: No se pudo crear backup de seguridad${NC}"
    fi
    
    # Mostrar estadísticas actuales
    echo -e "\n${YELLOW}📊 Estadísticas actuales de la BD:${NC}"
    mysql -u $DB_USER -p$DB_PASSWORD -e "
    USE $DB_NAME;
    SELECT 'Invitados' as Tabla, COUNT(*) as Registros FROM guests
    UNION ALL
    SELECT 'Asistencia', COUNT(*) FROM attendance;
    " 2>/dev/null
    
    # Confirmar restauración
    echo -e "\n${RED}⚠️  ADVERTENCIA: Esta operación REEMPLAZARÁ todos los datos actuales${NC}"
    read -p "¿Continuar con la restauración? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Restauración cancelada${NC}"
        return 1
    fi
    
    # Realizar restauración
    echo -e "\n${YELLOW}🔄 Restaurando base de datos...${NC}"
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$backup_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Restauración completada exitosamente${NC}"
        
        # Mostrar estadísticas después de la restauración
        echo -e "\n${YELLOW}📊 Estadísticas después de la restauración:${NC}"
        mysql -u $DB_USER -p$DB_PASSWORD -e "
        USE $DB_NAME;
        SELECT 'Invitados' as Tabla, COUNT(*) as Registros FROM guests
        UNION ALL
        SELECT 'Asistencia', COUNT(*) FROM attendance;
        " 2>/dev/null
        
    else
        echo -e "${RED}❌ Error durante la restauración${NC}"
        echo -e "${YELLOW}💡 Puedes restaurar el backup de seguridad:${NC}"
        echo -e "   mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < $SAFETY_BACKUP"
        return 1
    fi
}

# Función para encontrar el backup más reciente
get_latest_backup() {
    if [ -d "$BACKUP_DIR" ]; then
        ls -t $BACKUP_DIR/guest_registration_backup_*.sql* 2>/dev/null | head -1
    fi
}

# =====================================================
# LÓGICA PRINCIPAL
# =====================================================

# Verificar conexión MySQL
check_mysql_connection

# Procesar argumentos
if [ $# -eq 0 ]; then
    # Sin argumentos: mostrar backups disponibles
    list_backups
    show_help
    
elif [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    # Mostrar ayuda
    show_help
    
elif [ "$1" = "latest" ]; then
    # Restaurar backup más reciente
    latest_backup=$(get_latest_backup)
    if [ -n "$latest_backup" ]; then
        echo -e "${YELLOW}🔄 Restaurando backup más reciente: $(basename $latest_backup)${NC}"
        restore_backup "$latest_backup"
    else
        echo -e "${RED}❌ No se encontraron backups${NC}"
        list_backups
    fi
    
else
    # Restaurar archivo específico
    backup_file="$1"
    
    # Si no incluye la ruta, buscar en directorio de backups
    if [[ "$backup_file" != */* ]]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    echo -e "${YELLOW}🔄 Restaurando: $(basename $backup_file)${NC}"
    restore_backup "$backup_file"
fi

echo -e "\n${BLUE}🎉 Script de restore completado${NC}"
