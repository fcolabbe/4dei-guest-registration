-- =====================================================
-- 🧹 RESET COMPLETO DE ATTENDANCE - Solo para Desarrollo/Testing
-- =====================================================
-- CUIDADO: Este script elimina TODOS los registros de asistencia
-- Solo usar en desarrollo o cuando se necesite empezar desde cero
-- =====================================================

USE guest_registration;

-- 1. Hacer backup de seguridad
CREATE TABLE attendance_backup_reset AS SELECT * FROM attendance;

-- 2. Mostrar estado actual
SELECT '=== ESTADO ANTES DEL RESET ===' as info;
SELECT COUNT(*) as total_guests FROM guests;
SELECT COUNT(*) as total_attendance_records FROM attendance;
SELECT COUNT(DISTINCT guest_id) as unique_attended_guests FROM attendance;

-- 3. Eliminar todos los registros de attendance
DELETE FROM attendance;

-- 4. Resetear AUTO_INCREMENT
ALTER TABLE attendance AUTO_INCREMENT = 1;

-- 5. Verificar estado después del reset
SELECT '=== ESTADO DESPUÉS DEL RESET ===' as info;
SELECT COUNT(*) as total_guests FROM guests;
SELECT COUNT(*) as total_attendance_records FROM attendance;
SELECT COUNT(DISTINCT guest_id) as unique_attended_guests FROM attendance;

-- 6. Verificar vista de estadísticas
SELECT '=== ESTADÍSTICAS ACTUALIZADAS ===' as info;
SELECT * FROM attendance_stats;

SELECT '=== RESET COMPLETADO ===' as info;
SELECT 'Todos los registros de asistencia han sido eliminados' as mensaje;
SELECT 'Backup creado en: attendance_backup_reset' as backup_info;
