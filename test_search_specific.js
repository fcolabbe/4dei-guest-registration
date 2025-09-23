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

async function testSpecificSearch() {
    let db;
    
    try {
        console.log('🔍 DIAGNÓSTICO DE BÚSQUEDA ESPECÍFICA');
        console.log('=====================================');
        
        db = await mysql.createConnection(dbConfig);
        
        const testEmail = 'idarmis101@gmail.com';
        console.log(`\n📧 Buscando: ${testEmail}`);
        
        // 1. Búsqueda exacta por email
        console.log('\n1. 🎯 Búsqueda EXACTA por email:');
        const [exactEmail] = await db.execute(
            'SELECT * FROM guests WHERE email = ?',
            [testEmail]
        );
        console.log(`   Resultados: ${exactEmail.length}`);
        if (exactEmail.length > 0) {
            console.log(`   ✅ Encontrado: ${exactEmail[0].name} - ${exactEmail[0].email}`);
        }
        
        // 2. Búsqueda con LIKE (como en el endpoint)
        console.log('\n2. 🔍 Búsqueda con LIKE (como endpoint actual):');
        const [likeEmail] = await db.execute(
            "SELECT * FROM guests WHERE email LIKE ?",
            [`%${testEmail}%`]
        );
        console.log(`   Resultados: ${likeEmail.length}`);
        if (likeEmail.length > 0) {
            console.log(`   ✅ Encontrado: ${likeEmail[0].name} - ${likeEmail[0].email}`);
        }
        
        // 3. Búsqueda con el query completo del endpoint
        console.log('\n3. 📋 Búsqueda con query completo del endpoint:');
        const searchTerm = testEmail.replace(/'/g, "''");
        const [fullQuery] = await db.query(`
            SELECT g.*, 
                   CASE WHEN a.guest_id IS NOT NULL THEN 1 ELSE 0 END as has_attended,
                   MAX(a.check_in_time) as last_check_in
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
            WHERE (g.name LIKE '%${searchTerm}%' OR g.email LIKE '%${searchTerm}%' OR g.company LIKE '%${searchTerm}%')
            GROUP BY g.id
            LIMIT 10
        `);
        console.log(`   Resultados: ${fullQuery.length}`);
        if (fullQuery.length > 0) {
            fullQuery.forEach(guest => {
                console.log(`   ✅ ${guest.name} - ${guest.email} - ${guest.company || 'Sin empresa'}`);
            });
        }
        
        // 4. Verificar si hay problemas de encoding
        console.log('\n4. 🔤 Verificar encoding del email:');
        const [allEmails] = await db.execute(
            "SELECT email, HEX(email) as hex_email FROM guests WHERE email LIKE ? LIMIT 5",
            [`%idarmis%`]
        );
        console.log(`   Emails similares encontrados: ${allEmails.length}`);
        allEmails.forEach(row => {
            console.log(`   📧 "${row.email}" - HEX: ${row.hex_email}`);
        });
        
        // 5. Buscar por partes del email
        console.log('\n5. 🔍 Búsqueda por partes:');
        const [partialSearch] = await db.execute(
            "SELECT name, email FROM guests WHERE email LIKE ? OR email LIKE ? OR email LIKE ?",
            ['%idarmis%', '%101%', '%gmail%']
        );
        console.log(`   Resultados parciales: ${partialSearch.length}`);
        partialSearch.forEach(guest => {
            console.log(`   📧 ${guest.name} - ${guest.email}`);
        });
        
        // 6. Verificar espacios en blanco o caracteres especiales
        console.log('\n6. 🧹 Verificar espacios y caracteres especiales:');
        const [trimmedSearch] = await db.execute(
            "SELECT name, email, LENGTH(email) as email_length FROM guests WHERE TRIM(email) = ?",
            [testEmail]
        );
        console.log(`   Resultados con TRIM: ${trimmedSearch.length}`);
        if (trimmedSearch.length > 0) {
            console.log(`   ✅ ${trimmedSearch[0].name} - "${trimmedSearch[0].email}" (${trimmedSearch[0].email_length} chars)`);
        }
        
    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// Función para probar el endpoint directamente
async function testEndpoint() {
    console.log('\n🌐 PRUEBA DEL ENDPOINT /api/guests');
    console.log('===================================');
    
    const testEmail = 'idarmis101@gmail.com';
    
    try {
        // Simular la petición que hace el admin
        const url = `http://localhost:3009/api/guests?search=${encodeURIComponent(testEmail)}&limit=10`;
        console.log(`📡 URL: ${url}`);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log(`📊 Respuesta del endpoint:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Guests found: ${result.guests ? result.guests.length : 0}`);
        
        if (result.guests && result.guests.length > 0) {
            result.guests.forEach(guest => {
                console.log(`   ✅ ${guest.name} - ${guest.email}`);
            });
        } else {
            console.log('   ❌ No se encontraron invitados');
        }
        
    } catch (error) {
        console.error('❌ Error probando endpoint:', error.message);
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'endpoint') {
        testEndpoint();
    } else {
        testSpecificSearch();
    }
}

module.exports = { testSpecificSearch, testEndpoint };
