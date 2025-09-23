const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos desde la raíz

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `guests_${timestamp}_${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'guest_registration',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Debug: mostrar configuración cargada
console.log('🔧 Configuración de BD cargada:', {
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password ? '***' : '(vacía)',
    database: dbConfig.database
});

let db;

// Inicializar conexión a la base de datos
async function initializeDatabase() {
    try {
        db = mysql.createPool(dbConfig);
        
        // Crear base de datos si no existe
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();
        
        // Crear tablas
        await createTables();
        
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

// Crear tablas necesarias
async function createTables() {
    const createGuestsTable = `
        CREATE TABLE IF NOT EXISTS guests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            qr_code VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            company VARCHAR(255),
            category VARCHAR(100),
            table_number INT,
            special_requirements TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_qr_code (qr_code),
            INDEX idx_name (name)
        )
    `;
    
    const createAttendanceTable = `
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guest_id INT NOT NULL,
            qr_code VARCHAR(255) NOT NULL,
            check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            device_info JSON,
            location VARCHAR(255),
            notes TEXT,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
            INDEX idx_guest_id (guest_id),
            INDEX idx_qr_code (qr_code),
            INDEX idx_check_in_time (check_in_time)
        )
    `;
    
    const createEventsTable = `
        CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATE,
            location VARCHAR(255),
            max_guests INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    `;
    
    await db.execute(createGuestsTable);
    await db.execute(createAttendanceTable);
    await db.execute(createEventsTable);
    
    console.log('✅ Tablas creadas correctamente');
}

// ENDPOINTS DE LA API

// Endpoint principal - servir la aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para importar Excel
app.post('/api/import-excel', upload.single('excelFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se subió ningún archivo'
            });
        }
        
        const replaceData = req.body.replaceData === 'true';
        console.log('📁 Procesando archivo:', req.file.filename, replaceData ? '(reemplazando datos)' : '(agregando datos)');
        
        // Leer archivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El archivo Excel está vacío'
            });
        }
        
        // Validar y procesar datos
        const processedGuests = [];
        const errors = [];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2; // +2 porque Excel empieza en 1 y tiene header
            
            // Validar campos requeridos (adaptado a la estructura real)
            if (!row.Código || !row.Nombre) {
                errors.push(`Fila ${rowNum}: Código y Nombre son obligatorios`);
                continue;
            }
            
            // Construir nombre completo
            const fullName = `${String(row.Nombre).trim()} ${row.Apellido ? String(row.Apellido).trim() : ''}`.trim();
            
            processedGuests.push({
                qr_code: String(row.Código).trim(),
                name: fullName,
                email: row['E-mail'] ? String(row['E-mail']).trim() : null,
                phone: row['Número de identificación'] ? String(row['Número de identificación']).trim() : null,
                company: row['Nombre de empresa'] ? String(row['Nombre de empresa']).trim() : null,
                category: 'Asistente 4DEI',
                table_number: null,
                special_requirements: row.Región && row.Comuna ? `${row.Región} - ${row.Comuna}` : null
            });
        }
        
        if (errors.length > 0 && processedGuests.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Errores en el archivo Excel',
                errors: errors
            });
        }
        
        // Si se solicita reemplazar datos, eliminar todos los invitados existentes
        let deletedCount = 0;
        if (replaceData) {
            console.log('🗑️ Eliminando datos existentes...');
            
            // Eliminar asistencias primero (por clave foránea)
            await db.query('DELETE FROM attendance');
            
            // Eliminar invitados
            const [deleteResult] = await db.query('DELETE FROM guests');
            deletedCount = deleteResult.affectedRows || 0;
            
            console.log(`✅ Eliminados ${deletedCount} invitados existentes`);
        }

        // Insertar invitados en la base de datos
        let insertedCount = 0;
        let duplicateCount = 0;
        const insertErrors = [];
        
        for (const guest of processedGuests) {
            try {
                await db.execute(
                    `INSERT INTO guests (qr_code, name, email, phone, company, category, table_number, special_requirements) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [guest.qr_code, guest.name, guest.email, guest.phone, guest.company, guest.category, guest.table_number, guest.special_requirements]
                );
                insertedCount++;
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    duplicateCount++;
                } else {
                    insertErrors.push(`Error insertando ${guest.name}: ${error.message}`);
                }
            }
        }
        
        // Eliminar archivo temporal
        fs.unlinkSync(req.file.path);
        
        res.json({
            success: true,
            message: 'Importación completada',
            stats: {
                total_processed: data.length,
                inserted: insertedCount,
                duplicates: duplicateCount,
                deleted: deletedCount,
                errors: errors.length + insertErrors.length
            },
            errors: [...errors, ...insertErrors]
        });
        
        console.log(`✅ Importación completada: ${insertedCount} insertados, ${duplicateCount} duplicados`);
        
    } catch (error) {
        console.error('❌ Error importando Excel:', error);
        
        // Limpiar archivo si existe
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Error procesando el archivo Excel',
            error: error.message
        });
    }
});

// Endpoint para consultar invitado por QR
app.get('/api/guest/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;
        
        // Buscar invitado
        const [guests] = await db.execute(
            'SELECT * FROM guests WHERE qr_code = ?',
            [qrCode]
        );
        
        if (guests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invitado no encontrado'
            });
        }
        
        const guest = guests[0];
        
        // Verificar si ya registró asistencia
        const [attendance] = await db.execute(
            'SELECT * FROM attendance WHERE guest_id = ? ORDER BY check_in_time DESC LIMIT 1',
            [guest.id]
        );
        
        const hasAttended = attendance.length > 0;
        
        res.json({
            success: true,
            guest: {
                id: guest.id,
                qr_code: guest.qr_code,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                company: guest.company,
                category: guest.category,
                table_number: guest.table_number,
                special_requirements: guest.special_requirements,
                has_attended: hasAttended,
                last_check_in: hasAttended ? attendance[0].check_in_time : null
            }
        });
        
    } catch (error) {
        console.error('❌ Error consultando invitado:', error);
        res.status(500).json({
            success: false,
            message: 'Error consultando invitado',
            error: error.message
        });
    }
});

// Endpoint para registrar asistencia
app.post('/api/check-in', async (req, res) => {
    try {
        const { qr_code, device_info, location, notes } = req.body;
        
        if (!qr_code) {
            return res.status(400).json({
                success: false,
                message: 'QR Code es requerido'
            });
        }
        
        // Buscar invitado
        const [guests] = await db.execute(
            'SELECT * FROM guests WHERE qr_code = ?',
            [qr_code]
        );
        
        if (guests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invitado no encontrado en la base de datos'
            });
        }
        
        const guest = guests[0];
        
        // Verificar si ya registró asistencia
        const [existingAttendance] = await db.execute(
            'SELECT * FROM attendance WHERE guest_id = ?',
            [guest.id]
        );
        
        if (existingAttendance.length > 0) {
            return res.json({
                success: true,
                message: `Bienvenido ${guest.name}`,
                guest: {
                    id: guest.id,
                    name: guest.name,
                    email: guest.email,
                    company: guest.company,
                    category: guest.category,
                    table_number: guest.table_number,
                    special_requirements: guest.special_requirements,
                    has_attended: true,
                    check_in_time: existingAttendance[0].check_in_time,
                    first_check_in: existingAttendance[0].check_in_time,
                    last_check_in: existingAttendance[0].check_in_time,
                    is_duplicate: true
                }
            });
        }
        
        // Registrar nueva asistencia
        await db.execute(
            'INSERT INTO attendance (guest_id, qr_code, device_info, location, notes) VALUES (?, ?, ?, ?, ?)',
            [guest.id, qr_code, JSON.stringify(device_info), location, notes]
        );
        
        res.json({
            success: true,
            message: `Bienvenido ${guest.name}`,
            guest: {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                company: guest.company,
                category: guest.category,
                table_number: guest.table_number,
                special_requirements: guest.special_requirements,
                has_attended: true,
                check_in_time: new Date(),
                is_duplicate: false
            }
        });
        
        console.log(`✅ Check-in registrado: ${guest.name} (${qr_code})`);
        
    } catch (error) {
        console.error('❌ Error registrando check-in:', error);
        res.status(500).json({
            success: false,
            message: 'Error registrando asistencia',
            error: error.message
        });
    }
});

// Endpoint para marcar como ausente
app.post('/api/mark-absent', async (req, res) => {
    try {
        const { guest_id } = req.body;
        
        if (!guest_id) {
            return res.status(400).json({
                success: false,
                message: 'ID del invitado es requerido'
            });
        }
        
        // Eliminar registro de asistencia si existe
        const deleteQuery = `DELETE FROM attendance WHERE guest_id = ${guest_id}`;
        await db.query(deleteQuery);
        
        console.log(`✅ Invitado marcado como ausente: ID ${guest_id}`);
        
        res.json({
            success: true,
            message: 'Invitado marcado como ausente correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error marcando como ausente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Endpoint para check-in manual
app.post('/api/manual-checkin', async (req, res) => {
    try {
        const { guest_id } = req.body;
        
        if (!guest_id) {
            return res.status(400).json({
                success: false,
                message: 'ID del invitado es requerido'
            });
        }
        
        // Verificar si el invitado existe y si ya está registrado en una sola consulta
        const checkQuery = `
            SELECT g.*, 
                   CASE WHEN a.guest_id IS NOT NULL THEN 1 ELSE 0 END as has_attended
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
            WHERE g.id = ${guest_id}
        `;
        const [checkResult] = await db.query(checkQuery);
        
        if (checkResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invitado no encontrado'
            });
        }
        
        if (checkResult[0].has_attended) {
            return res.status(400).json({
                success: false,
                message: 'El invitado ya está registrado como asistente'
            });
        }
        
        const guest = checkResult[0];
        
        // Registrar asistencia
        const insertQuery = `INSERT INTO attendance (guest_id, qr_code, check_in_time, device_info, location, notes) VALUES (${guest_id}, '${guest.qr_code}', NOW(), '{"type": "manual", "source": "admin_panel"}', 'Panel administrativo', 'Registrado manualmente por recepcionista')`;
        await db.query(insertQuery);
        
        console.log(`✅ Check-in manual registrado: ${guest.name} (ID: ${guest_id})`);
        
        res.json({
            success: true,
            message: 'Check-in registrado correctamente',
            guest: guest
        });
        
    } catch (error) {
        console.error('❌ Error en check-in manual:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            debug: error.message
        });
    }
});

// Endpoint para crear nuevo invitado
app.post('/api/create-guest', async (req, res) => {
    try {
        const { name, email, company, phone, auto_checkin } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre es obligatorio'
            });
        }
        
        // Generar código QR único
        const qr_code = 'MANUAL_' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        // Insertar nuevo invitado
        const insertGuestQuery = `INSERT INTO guests (qr_code, name, email, phone, company, category, special_requirements, created_at, updated_at) VALUES ('${qr_code}', '${name.trim().replace(/'/g, "''")}', ${email ? `'${email.replace(/'/g, "''")}'` : 'NULL'}, ${phone ? `'${phone.replace(/'/g, "''")}'` : 'NULL'}, ${company ? `'${company.replace(/'/g, "''")}'` : 'NULL'}, 'Registro In Situ', 'Registrado en el evento', NOW(), NOW())`;
        const [result] = await db.query(insertGuestQuery);
        
        const guestId = result.insertId;
        
        // Si se solicita auto check-in, registrar asistencia automáticamente
        if (auto_checkin) {
            const insertAttendanceQuery = `INSERT INTO attendance (guest_id, qr_code, check_in_time, device_info, location, notes) VALUES (${guestId}, '${qr_code}', NOW(), '{"type": "new_guest", "source": "admin_panel"}', 'Panel administrativo', 'Registrado y chequeado automáticamente')`;
            await db.query(insertAttendanceQuery);
        }
        
        console.log(`✅ Nuevo invitado creado: ${name} (${qr_code}) ${auto_checkin ? '- Auto check-in' : ''}`);
        
        res.json({
            success: true,
            message: `Invitado ${auto_checkin ? 'creado y registrado' : 'creado'} correctamente`,
            guest: {
                id: guestId,
                qr_code,
                name: name.trim(),
                email: email || null,
                phone: phone || null,
                company: company || null,
                category: 'Registro In Situ',
                has_attended: auto_checkin ? 1 : 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando invitado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Endpoint para obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const [totalGuests] = await db.execute('SELECT COUNT(*) as count FROM guests');
        const [attendedGuests] = await db.execute('SELECT COUNT(DISTINCT guest_id) as count FROM attendance');
        const [todayAttendance] = await db.execute(
            'SELECT COUNT(DISTINCT guest_id) as count FROM attendance WHERE DATE(check_in_time) = CURDATE()'
        );
        
        res.json({
            success: true,
            stats: {
                total_guests: totalGuests[0].count,
                attended_guests: attendedGuests[0].count,
                today_attendance: todayAttendance[0].count,
                attendance_rate: totalGuests[0].count > 0 ? 
                    ((attendedGuests[0].count / totalGuests[0].count) * 100).toFixed(2) : 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas',
            error: error.message
        });
    }
});

// Endpoint para listar invitados
app.get('/api/guests', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const attendanceFilter = req.query.attendance || 'all';
        
        // Construir consulta SQL con filtros
        let whereConditions = [];
        
        // Filtro de búsqueda
        if (search && search.trim()) {
            const searchTerm = search.replace(/'/g, "''"); // Escapar comillas simples
            whereConditions.push(`(g.name LIKE '%${searchTerm}%' OR g.email LIKE '%${searchTerm}%' OR g.company LIKE '%${searchTerm}%')`);
        }
        
        // Filtro de asistencia
        if (attendanceFilter === 'attended') {
            whereConditions.push('a.guest_id IS NOT NULL');
        } else if (attendanceFilter === 'pending') {
            whereConditions.push('a.guest_id IS NULL');
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const query = `
            SELECT g.*, 
                   CASE WHEN a.guest_id IS NOT NULL THEN 1 ELSE 0 END as has_attended,
                   a.check_in_time as last_check_in
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
            ${whereClause}
            ORDER BY g.name 
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        const [guests] = await db.query(query);
        
        // Contar total para paginación con los mismos filtros
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
            ${whereClause}
        `;
        
        const [totalResult] = await db.query(countQuery);
        const total = totalResult[0].total;
        
        res.json({
            success: true,
            guests: guests,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando invitados:', error);
        res.status(500).json({
            success: false,
            message: 'Error listando invitados',
            error: error.message
        });
    }
});

// Manejo de errores
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande (máximo 10MB)'
            });
        }
    }
    
    console.error('❌ Error no manejado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Inicializar servidor
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log(`📊 Panel de administración: http://localhost:${PORT}/admin.html`);
        console.log(`📱 Aplicación móvil: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
