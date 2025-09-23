#!/bin/bash

# =====================================================
# 🚀 SCRIPT DE INSTALACIÓN - 4DEI GUEST REGISTRATION DB
# Compatible con MySQL 5.7+ y 8.0+
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 INSTALADOR DE BASE DE DATOS - 4DEI Guest Registration${NC}"
echo -e "${YELLOW}========================================================${NC}"

# Función para mostrar ayuda
show_help() {
    echo -e "\n${YELLOW}📖 Uso:${NC}"
    echo -e "   $0 [opciones]"
    echo -e "\n${YELLOW}📖 Opciones:${NC}"
    echo -e "   -u, --user USER     Usuario de MySQL (default: root)"
    echo -e "   -p, --password PASS Password de MySQL (se solicitará si no se proporciona)"
    echo -e "   -d, --database DB   Nombre de la base de datos (default: guest_registration)"
    echo -e "   -s, --safe          Usar schema seguro (recomendado para producción)"
    echo -e "   -h, --help          Mostrar esta ayuda"
    echo -e "\n${YELLOW}📖 Ejemplos:${NC}"
    echo -e "   $0                           # Instalación básica"
    echo -e "   $0 --safe                    # Instalación segura"
    echo -e "   $0 -u myuser -d mydb         # Usuario y BD personalizados"
}

# Función para verificar versión de MySQL
check_mysql_version() {
    echo -e "${YELLOW}🔍 Verificando versión de MySQL...${NC}"
    
    local version=$(mysql --version 2>/dev/null | grep -oP 'mysql\s+Ver\s+\K[0-9]+\.[0-9]+' | head -1)
    
    if [ -z "$version" ]; then
        echo -e "${RED}❌ No se pudo determinar la versión de MySQL${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ MySQL versión detectada: $version${NC}"
    
    # Verificar compatibilidad
    local major=$(echo $version | cut -d. -f1)
    local minor=$(echo $version | cut -d. -f2)
    
    if [ "$major" -lt 5 ] || ([ "$major" -eq 5 ] && [ "$minor" -lt 7 ]); then
        echo -e "${RED}⚠️ Advertencia: MySQL $version puede no ser completamente compatible${NC}"
        echo -e "${YELLOW}💡 Se recomienda MySQL 5.7+ o 8.0+${NC}"
        read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    return 0
}

# Función para verificar conexión MySQL
check_mysql_connection() {
    echo -e "${YELLOW}🔍 Verificando conexión a MySQL...${NC}"
    
    if [ -n "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 'Connection OK' as status;" > /dev/null 2>&1
    else
        mysql -u "$DB_USER" -p -e "SELECT 'Connection OK' as status;" > /dev/null 2>&1
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: No se puede conectar a MySQL${NC}"
        echo -e "${YELLOW}💡 Verifica:${NC}"
        echo -e "   - MySQL está corriendo: systemctl status mysql (Linux) o brew services list | grep mysql (macOS)"
        echo -e "   - Credenciales correctas"
        echo -e "   - Usuario tiene permisos para crear bases de datos"
        return 1
    fi
    
    echo -e "${GREEN}✅ Conexión MySQL exitosa${NC}"
    return 0
}

# Función para crear base de datos
create_database() {
    echo -e "${YELLOW}🗄️ Creando base de datos '$DB_NAME'...${NC}"
    
    local cmd="CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
    
    if [ -n "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "$cmd"
    else
        mysql -u "$DB_USER" -p -e "$cmd"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Base de datos '$DB_NAME' creada/verificada${NC}"
        return 0
    else
        echo -e "${RED}❌ Error creando base de datos${NC}"
        return 1
    fi
}

# Función para ejecutar schema
execute_schema() {
    local schema_file="$1"
    
    echo -e "${YELLOW}📋 Ejecutando schema: $(basename $schema_file)${NC}"
    
    if [ ! -f "$schema_file" ]; then
        echo -e "${RED}❌ Archivo de schema no encontrado: $schema_file${NC}"
        return 1
    fi
    
    if [ -n "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" -p"$DB_PASSWORD" < "$schema_file"
    else
        mysql -u "$DB_USER" -p < "$schema_file"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema ejecutado exitosamente${NC}"
        return 0
    else
        echo -e "${RED}❌ Error ejecutando schema${NC}"
        return 1
    fi
}

# Función para mostrar estadísticas finales
show_final_stats() {
    echo -e "\n${YELLOW}📊 Verificando instalación...${NC}"
    
    local stats_query="
    USE $DB_NAME;
    SELECT '📋 Tablas' as Tipo, COUNT(*) as Cantidad FROM information_schema.tables WHERE table_schema = '$DB_NAME'
    UNION ALL
    SELECT '👥 Invitados', COUNT(*) FROM guests
    UNION ALL  
    SELECT '📊 Asistencias', COUNT(*) FROM attendance
    UNION ALL
    SELECT '🎪 Eventos', COUNT(*) FROM events;
    "
    
    if [ -n "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "$stats_query" 2>/dev/null
    else
        mysql -u "$DB_USER" -p -e "$stats_query" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Instalación verificada exitosamente${NC}"
    else
        echo -e "${YELLOW}⚠️ No se pudieron obtener estadísticas (pero la instalación puede estar correcta)${NC}"
    fi
}

# =====================================================
# PROCESAMIENTO DE ARGUMENTOS
# =====================================================

USE_SAFE_SCHEMA=false
DB_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -p|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -s|--safe)
            USE_SAFE_SCHEMA=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opción desconocida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# =====================================================
# EJECUCIÓN PRINCIPAL
# =====================================================

echo -e "${YELLOW}⚙️ Configuración:${NC}"
echo -e "   Usuario: $DB_USER"
echo -e "   Base de datos: $DB_NAME"
echo -e "   Schema seguro: $([ "$USE_SAFE_SCHEMA" = true ] && echo 'Sí' || echo 'No')"
echo

# Verificar versión de MySQL
if ! check_mysql_version; then
    exit 1
fi

# Verificar conexión
if ! check_mysql_connection; then
    exit 1
fi

# Crear base de datos
if ! create_database; then
    exit 1
fi

# Seleccionar archivo de schema
if [ "$USE_SAFE_SCHEMA" = true ]; then
    SCHEMA_FILE="$SCRIPT_DIR/schema_safe.sql"
else
    SCHEMA_FILE="$SCRIPT_DIR/schema.sql"
fi

# Ejecutar schema
if ! execute_schema "$SCHEMA_FILE"; then
    echo -e "${RED}❌ Instalación falló${NC}"
    exit 1
fi

# Mostrar estadísticas finales
show_final_stats

echo -e "\n${GREEN}🎉 ¡Instalación completada exitosamente!${NC}"
echo -e "${YELLOW}🔧 Próximos pasos:${NC}"
echo -e "   1. Configurar archivo .env con las credenciales"
echo -e "   2. Importar datos de invitados si es necesario"
echo -e "   3. Iniciar la aplicación: npm run dev"
echo -e "\n${YELLOW}📁 Archivos útiles:${NC}"
echo -e "   - Backup: ./database/backup.sh"
echo -e "   - Restore: ./database/restore.sh"
echo -e "   - Documentación: DATABASE.md"

echo -e "\n${BLUE}🎯 Base de datos lista para usar!${NC}"
