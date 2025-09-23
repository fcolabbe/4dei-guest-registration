const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'welcu_user',
    password: process.env.DB_PASSWORD || 'mibebe',
    database: process.env.DB_NAME || 'guest_registration',
    charset: 'utf8mb4'
};

async function diagnoseCurrentIssue() {
    let db;
    
    try {
        console.log('🔍 DIAGNÓSTICO ESPECÍFICO - Problema de Estadísticas');
        console.log('================================================================');
        
        db = await mysql.createConnection(dbConfig);
        
        // 1. Verificar datos básicos
        console.log('\n1. 📊 DATOS BÁSICOS:');
        const [totalGuests] = await db.execute('SELECT COUNT(*) as count FROM guests');
        const [totalAttendance] = await db.execute('SELECT COUNT(*) as count FROM attendance');
        const [uniqueAttended] = await db.execute('SELECT COUNT(DISTINCT guest_id) as count FROM attendance');
        
        console.log(`   👥 Total invitados en guests: ${totalGuests[0].count}`);
        console.log(`   📋 Total registros en attendance: ${totalAttendance[0].count}`);
        console.log(`   ✅ Invitados únicos con check-in: ${uniqueAttended[0].count}`);
        
        // 2. Verificar QR específico
        console.log('\n2. 🔍 VERIFICAR QR ESPECÍFICO (SUPGEE61):');
        const [guestSupgee] = await db.execute('SELECT * FROM guests WHERE qr_code = ?', ['SUPGEE61']);
        
        if (guestSupgee.length > 0) {
            const guest = guestSupgee[0];
            console.log(`   ✅ Invitado encontrado: ${guest.name} (ID: ${guest.id})`);
            
            const [attendanceSupgee] = await db.execute('SELECT * FROM attendance WHERE guest_id = ?', [guest.id]);
            console.log(`   📋 Registros de asistencia: ${attendanceSupgee.length}`);
            
            if (attendanceSupgee.length > 0) {
                attendanceSupgee.forEach((att, index) => {
                    console.log(`      ${index + 1}. Check-in: ${att.check_in_time} - Ubicación: ${att.location}`);
                });
            }
        } else {
            console.log('   ❌ QR SUPGEE61 no encontrado en guests');
            
            // Buscar QRs similares
            const [similarQrs] = await db.execute('SELECT qr_code FROM guests WHERE qr_code LIKE ?', ['%SUPGEE%']);
            if (similarQrs.length > 0) {
                console.log('   🔍 QRs similares encontrados:');
                similarQrs.forEach(qr => console.log(`      - ${qr.qr_code}`));
            }
        }
        
        // 3. Probar endpoint simulado
        console.log('\n3. 🧪 SIMULACIÓN ENDPOINT /api/stats:');
        const [todayAttendance] = await db.execute(`
            SELECT COUNT(DISTINCT guest_id) as count 
            FROM attendance 
            WHERE DATE(check_in_time) = CURDATE()
        `);
        
        const simulatedStats = {
            total_guests: totalGuests[0].count,
            attended_guests: uniqueAttended[0].count,
            today_attendance: todayAttendance[0].count,
            attendance_rate: totalGuests[0].count > 0 ? 
                ((uniqueAttended[0].count / totalGuests[0].count) * 100).toFixed(2) : "0.00"
        };
        
        console.log('   📊 Estadísticas que debería devolver la API:');
        console.log(JSON.stringify(simulatedStats, null, 4));
        
        // 4. Verificar posibles problemas
        console.log('\n4. 🚨 VERIFICAR PROBLEMAS POTENCIALES:');
        
        // Verificar caracteres especiales en QR codes
        const [specialChars] = await db.execute(`
            SELECT qr_code, LENGTH(qr_code) as length, HEX(qr_code) as hex_value
            FROM guests 
            WHERE qr_code REGEXP '[^A-Za-z0-9]'
            LIMIT 5
        `);
        
        if (specialChars.length > 0) {
            console.log('   ⚠️  QR codes con caracteres especiales:');
            specialChars.forEach(qr => {
                console.log(`      - "${qr.qr_code}" (${qr.length} chars) - HEX: ${qr.hex_value}`);
            });
        } else {
            console.log('   ✅ No hay QR codes con caracteres especiales');
        }
        
        // Verificar duplicados
        const [duplicateQrs] = await db.execute(`
            SELECT qr_code, COUNT(*) as cantidad
            FROM guests
            GROUP BY qr_code
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateQrs.length > 0) {
            console.log(`   ⚠️  ${duplicateQrs.length} QR codes duplicados encontrados`);
        } else {
            console.log('   ✅ No hay QR codes duplicados');
        }
        
        // 5. Verificar vista
        console.log('\n5. 📈 VERIFICAR VISTA attendance_stats:');
        try {
            const [viewStats] = await db.execute('SELECT * FROM attendance_stats');
            if (viewStats.length > 0) {
                console.log('   📊 Vista attendance_stats:');
                console.log(JSON.stringify(viewStats[0], null, 4));
            }
        } catch (error) {
            console.log('   ❌ Error accediendo a vista:', error.message);
        }
        
        console.log('\n🎯 RECOMENDACIONES:');
        
        if (uniqueAttended[0].count === 0 && totalGuests[0].count > 0) {
            console.log('🚨 PROBLEMA PRINCIPAL: 0 asistencias registradas');
            console.log('   💡 Posibles causas:');
            console.log('      - Error en INSERT INTO attendance (parámetros undefined)');
            console.log('      - Problemas de permisos en base de datos');
            console.log('      - Transacciones no committeadas');
            console.log('   🔧 Soluciones:');
            console.log('      1. Verificar logs del servidor: pm2 logs 4dei-guest-registration');
            console.log('      2. Probar check-in manualmente después del fix');
            console.log('      3. Verificar permisos de welcu_user en tabla attendance');
        }
        
        if (totalAttendance[0].count !== uniqueAttended[0].count) {
            console.log('⚠️  Hay registros duplicados en attendance');
            console.log('   🔧 Ejecutar: node fix_stats_issues.js clean');
        }
        
    } catch (error) {
        console.error('❌ Error durante diagnóstico:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// Función para probar check-in
async function testCheckIn(qrCode = 'SUPGEE61') {
    let db;
    
    try {
        console.log(`\n🧪 PRUEBA DE CHECK-IN MANUAL: ${qrCode}`);
        console.log('================================');
        
        db = await mysql.createConnection(dbConfig);
        
        // 1. Buscar invitado
        const [guests] = await db.execute('SELECT * FROM guests WHERE qr_code = ?', [qrCode]);
        
        if (guests.length === 0) {
            console.log('❌ Invitado no encontrado');
            return;
        }
        
        const guest = guests[0];
        console.log(`✅ Invitado encontrado: ${guest.name} (ID: ${guest.id})`);
        
        // 2. Verificar si ya tiene asistencia
        const [existing] = await db.execute('SELECT * FROM attendance WHERE guest_id = ?', [guest.id]);
        
        if (existing.length > 0) {
            console.log(`⚠️  Ya tiene ${existing.length} registro(s) de asistencia`);
            return;
        }
        
        // 3. Insertar asistencia de prueba
        const deviceInfo = '{"type": "test", "source": "diagnostic_script"}';
        const location = 'Test location';
        const notes = 'Test check-in from diagnostic script';
        
        await db.execute(
            'INSERT INTO attendance (guest_id, qr_code, device_info, location, notes) VALUES (?, ?, ?, ?, ?)',
            [guest.id, qrCode, deviceInfo, location, notes]
        );
        
        console.log('✅ Check-in de prueba registrado exitosamente');
        
        // 4. Verificar estadísticas actualizadas
        const [newStats] = await db.execute('SELECT COUNT(DISTINCT guest_id) as attended FROM attendance');
        console.log(`📊 Nuevas estadísticas: ${newStats[0].attended} invitados con check-in`);
        
    } catch (error) {
        console.error('❌ Error en prueba de check-in:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const action = process.argv[2];
    const qrCode = process.argv[3];
    
    if (action === 'test-checkin') {
        testCheckIn(qrCode);
    } else {
        diagnoseCurrentIssue();
    }
}

module.exports = { diagnoseCurrentIssue, testCheckIn };
