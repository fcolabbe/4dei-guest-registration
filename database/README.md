# 🗄️ Instalación de Base de Datos - 4DEI Guest Registration

## 🚀 Instalación Rápida

### **✅ Opción 1: Script Automático (Recomendado)**
```bash
# Instalación segura compatible con todas las versiones de MySQL
./database/install.sh --safe
```

### **✅ Opción 2: Schema Seguro Manual**
```bash
mysql -u root -p < database/schema_safe.sql
```

## 🔧 Para el Error SQL Syntax

### **❌ Si ves este error:**
```
ERROR 1064 (42000) at line 195: You have an error in your SQL syntax; 
check the manual that corresponds to your MySQL server version for the 
right syntax to use near 'IF NOT EXISTS idx_guests_name_company...'
```

### **✅ Solución Inmediata:**
```bash
# Usar el schema compatible
mysql -u root -p < database/schema_safe.sql
```

## 📋 Scripts Disponibles

### **🚀 Instalación:**
- `install.sh` - Script automático con detección de versión
- `schema_safe.sql` - Schema compatible con MySQL 5.7+
- `schema.sql` - Schema original (requiere MySQL 8.0.23+)

### **💾 Mantenimiento:**
- `backup.sh` - Backup automatizado con compresión
- `restore.sh` - Restore interactivo con safety checks

### **📚 Documentación:**
- `README.md` - Esta guía
- `TROUBLESHOOTING.md` - Solución de problemas
- `DATABASE.md` - Documentación completa de BD

## 🔍 Verificación

### **Después de la instalación:**
```bash
# Verificar tablas creadas
mysql -u root -p guest_registration -e "SHOW TABLES;"

# Ver estadísticas
mysql -u root -p guest_registration -e "SELECT * FROM attendance_stats;"
```

## 🆘 Si tienes problemas

1. **📖 Lee:** `TROUBLESHOOTING.md`
2. **🔧 Usa:** `./database/install.sh --safe`
3. **📞 Reporta:** Issues en GitHub

---

**💡 El script `install.sh --safe` es compatible con todas las versiones de MySQL y detecta automáticamente tu configuración.**
