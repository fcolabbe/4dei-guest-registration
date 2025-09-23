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

async function diagnoseAndFix() {
    let db;
    
    try {
        console.log('🔍 Conectando a la base de datos...');
        db = await mysql.createConnection(dbConfig);
        
        console.log('✅ Conexión exitosa');
        console.log('\n=== 📊 DIAGNÓSTICO DE ESTADÍSTICAS ===\n');
        
        // 1. Estadísticas básicas
        console.log('1. 📋 Estadísticas básicas:');
        const [totalGuests] = await db.execute('SELECT COUNT(*) as count FROM guests');
        const [attendedGuests] = await db.execute('SELECT COUNT(DISTINCT guest_id) as count FROM attendance');
        const [totalAttendanceRecords] = await db.execute('SELECT COUNT(*) as count FROM attendance');
        
        console.log(`   👥 Total invitados: ${totalGuests[0].count}`);
        console.log(`   ✅ Invitados con check-in: ${attendedGuests[0].count}`);
        console.log(`   📊 Total registros attendance: ${totalAttendanceRecords[0].count}`);
        console.log(`   ⏳ Pendientes: ${totalGuests[0].count - attendedGuests[0].count}`);
        
        // 2. Verificar duplicados en attendance
        console.log('\n2. 🔍 Verificar duplicados en attendance:');
        const [duplicates] = await db.execute(`
            SELECT guest_id, COUNT(*) as registros 
            FROM attendance 
            GROUP BY guest_id 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.length > 0) {
            console.log(`   ⚠️  Encontrados ${duplicates.length} invitados con múltiples check-ins:`);
            duplicates.forEach(dup => {
                console.log(`      - Guest ID ${dup.guest_id}: ${dup.registros} registros`);
            });
        } else {
            console.log('   ✅ No hay duplicados en attendance');
        }
        
        // 3. Verificar QR codes duplicados
        console.log('\n3. 🔍 Verificar QR codes duplicados:');
        const [qrDuplicates] = await db.execute(`
            SELECT qr_code, COUNT(*) as cantidad
            FROM guests
            GROUP BY qr_code
            HAVING COUNT(*) > 1
        `);
        
        if (qrDuplicates.length > 0) {
            console.log(`   ⚠️  Encontrados ${qrDuplicates.length} QR codes duplicados:`);
            qrDuplicates.forEach(dup => {
                console.log(`      - QR Code ${dup.qr_code}: ${dup.cantidad} veces`);
            });
        } else {
            console.log('   ✅ No hay QR codes duplicados');
        }
        
        // 4. Probar endpoint stats manualmente
        console.log('\n4. 🧪 Simulación del endpoint /api/stats:');
        const [todayAttendance] = await db.execute(`
            SELECT COUNT(DISTINCT guest_id) as count 
            FROM attendance 
            WHERE DATE(check_in_time) = CURDATE()
        `);
        
        const stats = {
            total_guests: totalGuests[0].count,
            attended_guests: attendedGuests[0].count,
            today_attendance: todayAttendance[0].count,
            attendance_rate: totalGuests[0].count > 0 ? 
                ((attendedGuests[0].count / totalGuests[0].count) * 100).toFixed(2) : 0
        };
        
        console.log('   📊 Estadísticas calculadas:');
        console.log(`      - total_guests: ${stats.total_guests}`);
        console.log(`      - attended_guests: ${stats.attended_guests}`);
        console.log(`      - today_attendance: ${stats.today_attendance}`);
        console.log(`      - attendance_rate: ${stats.attendance_rate}%`);
        
        // 5. Verificar vista attendance_stats
        console.log('\n5. 📈 Verificar vista attendance_stats:');
        try {
            const [viewStats] = await db.execute('SELECT * FROM attendance_stats');
            if (viewStats.length > 0) {
                const view = viewStats[0];
                console.log('   📊 Vista attendance_stats:');
                console.log(`      - total_guests: ${view.total_guests}`);
                console.log(`      - attended_guests: ${view.attended_guests}`);
                console.log(`      - pending_guests: ${view.pending_guests}`);
                console.log(`      - attendance_rate: ${view.attendance_rate}%`);
                
                // Comparar con cálculo manual
                if (view.total_guests !== stats.total_guests || 
                    view.attended_guests !== stats.attended_guests) {
                    console.log('   ⚠️  Inconsistencia entre vista y cálculo manual');
                } else {
                    console.log('   ✅ Vista consistente con cálculo manual');
                }
            }
        } catch (error) {
            console.log('   ❌ Error accediendo a la vista:', error.message);
        }
        
        // 6. Probar búsqueda de invitado específico
        console.log('\n6. 🔍 Probar búsqueda de invitado (ejemplo):');
        const [sampleGuests] = await db.execute('SELECT qr_code, name FROM guests LIMIT 3');
        
        if (sampleGuests.length > 0) {
            for (const sampleGuest of sampleGuests) {
                const [found] = await db.execute(
                    'SELECT * FROM guests WHERE qr_code = ?',
                    [sampleGuest.qr_code]
                );
                
                const [hasAttendance] = await db.execute(
                    'SELECT COUNT(*) as count FROM attendance WHERE guest_id = ?',
                    [found[0]?.id]
                );
                
                console.log(`   🎫 QR: ${sampleGuest.qr_code} - ${sampleGuest.name}`);
                console.log(`      - Encontrado en guests: ${found.length > 0 ? '✅' : '❌'}`);
                console.log(`      - Tiene attendance: ${hasAttendance[0].count > 0 ? '✅' : '❌'}`);
            }
        }
        
        console.log('\n=== 🔧 RECOMENDACIONES ===\n');
        
        // Recomendaciones basadas en el diagnóstico
        if (duplicates.length > 0) {
            console.log('🚨 PROBLEMA: Invitados con múltiples check-ins');
            console.log('   💡 Solución: Limpiar registros duplicados en attendance');
            console.log('   🔧 Comando: DELETE a1 FROM attendance a1 INNER JOIN attendance a2 WHERE a1.id > a2.id AND a1.guest_id = a2.guest_id;');
        }
        
        if (qrDuplicates.length > 0) {
            console.log('🚨 PROBLEMA: QR codes duplicados en guests');
            console.log('   💡 Solución: Revisar importación de datos');
        }
        
        console.log('✅ VERIFICACIONES ADICIONALES:');
        console.log('   1. Verificar que la app móvil use el endpoint correcto (/api/stats)');
        console.log('   2. Verificar que el frontend actualice las estadísticas después de check-in');
        console.log('   3. Verificar que no haya caché en el navegador');
        
    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// Función para limpiar duplicados
async function cleanDuplicates() {
    let db;
    
    try {
        console.log('🧹 Iniciando limpieza de duplicados...');
        db = await mysql.createConnection(dbConfig);
        
        // Hacer backup antes de limpiar
        console.log('💾 Creando backup de seguridad...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await db.execute(`
            CREATE TABLE attendance_backup_${timestamp.substring(0, 19)} 
            AS SELECT * FROM attendance
        `);
        
        // Limpiar duplicados manteniendo el registro más reciente
        const [result] = await db.execute(`
            DELETE a1 FROM attendance a1
            INNER JOIN attendance a2 
            WHERE a1.id < a2.id 
            AND a1.guest_id = a2.guest_id
        `);
        
        console.log(`✅ Eliminados ${result.affectedRows} registros duplicados`);
        
        // Verificar resultado
        const [remaining] = await db.execute(`
            SELECT guest_id, COUNT(*) as registros 
            FROM attendance 
            GROUP BY guest_id 
            HAVING COUNT(*) > 1
        `);
        
        if (remaining.length === 0) {
            console.log('✅ Limpieza completada - No quedan duplicados');
        } else {
            console.log(`⚠️  Aún quedan ${remaining.length} duplicados`);
        }
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'clean') {
        cleanDuplicates();
    } else {
        diagnoseAndFix();
    }
}

module.exports = { diagnoseAndFix, cleanDuplicates };
