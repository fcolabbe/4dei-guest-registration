-- =====================================================
-- 🔍 DIAGNÓSTICO DE ESTADÍSTICAS - 4DEI Guest Registration
-- =====================================================

USE guest_registration;

-- 1. Estadísticas básicas de invitados
SELECT '=== ESTADÍSTICAS BÁSICAS ===' as info;
SELECT COUNT(*) as total_invitados FROM guests;
SELECT COUNT(DISTINCT guest_id) as total_con_checkin FROM attendance;
SELECT COUNT(*) as total_registros_attendance FROM attendance;

-- 2. Verificar duplicados en attendance
SELECT '=== VERIFICAR DUPLICADOS EN ATTENDANCE ===' as info;
SELECT guest_id, COUNT(*) as registros 
FROM attendance 
GROUP BY guest_id 
HAVING COUNT(*) > 1;

-- 3. Invitados con múltiples check-ins
SELECT '=== INVITADOS CON MÚLTIPLES CHECK-INS ===' as info;
SELECT g.name, g.qr_code, COUNT(a.id) as total_checkins,
       MIN(a.check_in_time) as primer_checkin,
       MAX(a.check_in_time) as ultimo_checkin
FROM guests g
JOIN attendance a ON g.id = a.guest_id
GROUP BY g.id, g.name, g.qr_code
HAVING COUNT(a.id) > 1
ORDER BY total_checkins DESC;

-- 4. Estadísticas usando la vista
SELECT '=== ESTADÍSTICAS DESDE VISTA ===' as info;
SELECT * FROM attendance_stats;

-- 5. Comparar con cálculo manual
SELECT '=== CÁLCULO MANUAL VS VISTA ===' as info;
SELECT 
    (SELECT COUNT(*) FROM guests) as manual_total_guests,
    (SELECT COUNT(DISTINCT guest_id) FROM attendance) as manual_attended,
    (SELECT COUNT(*) FROM guests) - (SELECT COUNT(DISTINCT guest_id) FROM attendance) as manual_pending,
    total_guests as vista_total,
    attended_guests as vista_attended,
    pending_guests as vista_pending
FROM attendance_stats;

-- 6. Verificar estructura de datos en attendance
SELECT '=== SAMPLE DE ATTENDANCE ===' as info;
SELECT a.*, g.name, g.qr_code 
FROM attendance a
JOIN guests g ON a.guest_id = g.id
ORDER BY a.check_in_time DESC
LIMIT 5;

-- 7. Buscar QR codes duplicados
SELECT '=== QR CODES DUPLICADOS ===' as info;
SELECT qr_code, COUNT(*) as cantidad
FROM guests
GROUP BY qr_code
HAVING COUNT(*) > 1;

-- 8. Verificar endpoint stats
SELECT '=== DATOS PARA ENDPOINT /api/stats ===' as info;
SELECT 
    COUNT(*) as total_guests,
    COUNT(DISTINCT a.guest_id) as attended_guests,
    COUNT(DISTINCT CASE WHEN a.guest_id IS NOT NULL THEN a.guest_id END) as today_attendance,
    ROUND((COUNT(DISTINCT a.guest_id) / COUNT(*)) * 100, 2) as attendance_rate
FROM guests g
LEFT JOIN attendance a ON g.id = a.guest_id;
