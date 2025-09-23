# 🔧 Solución a Problemas de Producción

## 🚨 **Problemas Identificados:**

1. **📊 Estadísticas inconsistentes** entre app móvil, web y panel admin
2. **🔍 Detección incorrecta de invitados** - no encuentra QR existentes
3. **📱 App móvil no muestra estadísticas** en la sección correspondiente
4. **🖥️ Panel admin muestra datos correctos** pero web/móvil no

## ✅ **Soluciones Implementadas:**

### **🔧 Archivos de Diagnóstico y Fix:**
- `debug_stats.sql` - Consultas de diagnóstico completo
- `fix_stats_issues.js` - Script Node.js para diagnóstico automatizado
- `database/fix_production.sh` - Script completo de corrección
- `PRODUCTION_FIX.md` - Esta guía

## 🚀 **Pasos para Solucionar en tu Servidor:**

### **1. Actualizar el Código desde GitHub:**
```bash
cd ~/4dei-guest-registration
git pull origin main
```

### **2. Ejecutar Diagnóstico Completo:**
```bash
# Opción A: Script automatizado (recomendado)
./database/fix_production.sh

# Opción B: Diagnóstico con Node.js
node fix_stats_issues.js

# Opción C: Diagnóstico manual SQL
mysql -u welcu_user -pmibebe guest_registration < debug_stats.sql
```

### **3. Limpiar Duplicados (si existen):**
```bash
# Solo si el diagnóstico encuentra duplicados
node fix_stats_issues.js clean
```

### **4. Reiniciar la Aplicación:**
```bash
pm2 restart 4dei-guest-registration
pm2 logs 4dei-guest-registration --lines 20
```

### **5. Verificar Funcionamiento:**
```bash
# Probar endpoint de estadísticas
curl -s "http://localhost:3009/api/stats" | python3 -m json.tool

# Probar búsqueda de invitado
curl -X POST -H "Content-Type: application/json" \
  -d '{"qr_code":"SUPGEE61"}' \
  http://localhost:3009/api/check-in
```

## 🔍 **Diagnóstico Manual de Problemas:**

### **Problema 1: Estadísticas Inconsistentes**

**Causa:** Registros duplicados en la tabla `attendance` o vista mal calculada.

**Verificar:**
```sql
-- Contar duplicados
SELECT guest_id, COUNT(*) as registros 
FROM attendance 
GROUP BY guest_id 
HAVING COUNT(*) > 1;

-- Comparar cálculos
SELECT 
  (SELECT COUNT(*) FROM guests) as total_guests,
  (SELECT COUNT(DISTINCT guest_id) FROM attendance) as attended_guests;
```

**Solución:**
```sql
-- Limpiar duplicados
DELETE a1 FROM attendance a1
INNER JOIN attendance a2 
WHERE a1.id < a2.id 
AND a1.guest_id = a2.guest_id;
```

### **Problema 2: QR No Encontrado**

**Causa:** Problemas de encoding, espacios en blanco, o índices no optimizados.

**Verificar:**
```sql
-- Buscar QR específico
SELECT * FROM guests WHERE qr_code = 'TU_QR_CODE';

-- Verificar espacios o caracteres especiales
SELECT qr_code, LENGTH(qr_code), HEX(qr_code) 
FROM guests 
WHERE qr_code LIKE '%SUPGEE61%';
```

**Solución:**
```sql
-- Limpiar espacios en blanco
UPDATE guests SET qr_code = TRIM(qr_code) WHERE qr_code != TRIM(qr_code);

-- Optimizar índice
OPTIMIZE TABLE guests;
```

### **Problema 3: App Móvil Sin Estadísticas**

**Causa:** 
- Endpoint `/api/stats` no responde correctamente
- JavaScript no puede encontrar elementos DOM
- Problemas de CORS o conectividad

**Verificar en Consola del Navegador:**
```javascript
// Abrir DevTools (F12) y ejecutar:
fetch('/api/stats')
  .then(r => r.json())
  .then(data => console.log('Stats:', data));

// Verificar elementos DOM
console.log('totalGuests:', document.getElementById('totalGuests'));
console.log('attendedGuests:', document.getElementById('attendedGuests'));
```

## 📋 **Checklist de Verificación Post-Fix:**

### **✅ Base de Datos:**
- [ ] No hay duplicados en `attendance`
- [ ] Vista `attendance_stats` funciona correctamente
- [ ] Búsqueda de QR codes es rápida y precisa
- [ ] Índices optimizados

### **✅ Backend (API):**
- [ ] Endpoint `/api/stats` responde correctamente
- [ ] Endpoint `/api/check-in` encuentra invitados existentes
- [ ] Logs sin errores: `pm2 logs 4dei-guest-registration`

### **✅ Frontend:**
- [ ] App móvil muestra estadísticas correctas
- [ ] Panel admin muestra datos consistentes
- [ ] Check-in funciona sin crear duplicados
- [ ] Detección de duplicados funciona correctamente

## 🧪 **Pruebas de Funcionamiento:**

### **1. Probar Estadísticas:**
```bash
# Debe mostrar números consistentes
curl -s "http://localhost:3009/api/stats"
```

### **2. Probar Check-in:**
```bash
# Usar un QR code real de tu base de datos
curl -X POST -H "Content-Type: application/json" \
  -d '{"qr_code":"SUPGEE61", "device_info":"{\"test\":true}", "location":"Test"}' \
  http://localhost:3009/api/check-in
```

### **3. Probar Detección de Duplicados:**
```bash
# Ejecutar el mismo check-in dos veces - debe detectar duplicado
curl -X POST -H "Content-Type: application/json" \
  -d '{"qr_code":"SUPGEE61", "device_info":"{\"test\":true}", "location":"Test"}' \
  http://localhost:3009/api/check-in
```

## 🔧 **Configuraciones Adicionales:**

### **Nginx (si aplica):**
```nginx
# Asegurar que no hay caché en las APIs
location /api/ {
    proxy_pass http://localhost:3009/api/;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

### **PM2 (optimización):**
```bash
# Aumentar memoria si es necesario
pm2 restart 4dei-guest-registration --max-memory-restart 512M

# Habilitar logs detallados
pm2 restart 4dei-guest-registration --log-date-format="YYYY-MM-DD HH:mm:ss Z"
```

## 📞 **Si Los Problemas Persisten:**

### **1. Verificar Logs Detallados:**
```bash
# Logs de aplicación
pm2 logs 4dei-guest-registration --lines 50

# Logs de Nginx (si aplica)
sudo tail -f /var/log/nginx/error.log

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### **2. Reinicio Completo:**
```bash
# Reiniciar todos los servicios
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mysql
```

### **3. Verificar Conectividad:**
```bash
# Probar conexión a base de datos
mysql -u welcu_user -pmibebe guest_registration -e "SELECT 'OK' as status;"

# Probar aplicación localmente
curl -I http://localhost:3009
```

## 🎯 **Resultado Esperado:**

Después del fix:
- ✅ **Estadísticas consistentes** en todas las interfaces
- ✅ **Detección correcta** de invitados existentes
- ✅ **App móvil funcional** con estadísticas en tiempo real
- ✅ **Sin duplicados** en registros de asistencia
- ✅ **Performance optimizada** para búsquedas QR

---

**💡 Tip:** Siempre ejecuta `./database/fix_production.sh` después de cualquier cambio importante en la base de datos para asegurar consistencia.
