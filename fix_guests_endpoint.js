// 🔧 CORRECCIÓN CRÍTICA para el endpoint /api/guests
// Reemplaza la versión que está causando error 500

// Endpoint para listar invitados - VERSIÓN CORREGIDA Y SIMPLIFICADA
app.get('/api/guests', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const attendanceFilter = req.query.attendance || 'all';
        
        console.log(`🔍 API /api/guests - Search: "${search}", Filter: ${attendanceFilter}, Page: ${page}`);
        
        // ============================================
        // VERSIÓN SIMPLIFICADA SIN SUBCONSULTAS COMPLEJAS
        // ============================================
        
        let whereConditions = [];
        let queryParams = [];
        
        // Filtro de búsqueda
        if (search && search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            whereConditions.push('(g.name LIKE ? OR g.email LIKE ? OR g.company LIKE ?)');
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        // Construir la consulta principal
        let mainQuery = `
            SELECT g.id, g.name, g.email, g.company, g.phone, g.category, 
                   g.table_number, g.special_requirements, g.qr_code, 
                   g.created_at, g.updated_at
            FROM guests g
        `;
        
        // Agregar filtros de asistencia si es necesario
        if (attendanceFilter === 'attended') {
            mainQuery += ` WHERE EXISTS (SELECT 1 FROM attendance a WHERE a.guest_id = g.id)`;
            if (whereConditions.length > 0) {
                mainQuery += ` AND ${whereConditions.join(' AND ')}`;
            }
        } else if (attendanceFilter === 'pending') {
            mainQuery += ` WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.guest_id = g.id)`;
            if (whereConditions.length > 0) {
                mainQuery += ` AND ${whereConditions.join(' AND ')}`;
            }
        } else {
            // attendanceFilter === 'all'
            if (whereConditions.length > 0) {
                mainQuery += ` WHERE ${whereConditions.join(' AND ')}`;
            }
        }
        
        mainQuery += ` ORDER BY g.name LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
        
        console.log(`📋 Main Query: ${mainQuery}`);
        console.log(`📋 Params:`, queryParams);
        
        // Ejecutar consulta principal
        const [guests] = await db.execute(mainQuery, queryParams);
        
        // Obtener información de asistencia para cada invitado
        const guestsWithAttendance = [];
        for (const guest of guests) {
            // Consulta simple para obtener la última asistencia
            const [attendance] = await db.execute(
                `SELECT MAX(check_in_time) as last_check_in 
                 FROM attendance 
                 WHERE guest_id = ?`,
                [guest.id]
            );
            
            const lastCheckIn = attendance[0]?.last_check_in || null;
            
            guestsWithAttendance.push({
                ...guest,
                has_attended: lastCheckIn ? 1 : 0,
                last_check_in: lastCheckIn
            });
        }
        
        // Consulta de conteo (sin LIMIT/OFFSET)
        let countQuery = `SELECT COUNT(*) as total FROM guests g`;
        let countParams = [];
        
        // Aplicar los mismos filtros para el conteo
        if (search && search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (attendanceFilter === 'attended') {
            countQuery += ` WHERE EXISTS (SELECT 1 FROM attendance a WHERE a.guest_id = g.id)`;
            if (search && search.trim()) {
                countQuery += ` AND (g.name LIKE ? OR g.email LIKE ? OR g.company LIKE ?)`;
            }
        } else if (attendanceFilter === 'pending') {
            countQuery += ` WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.guest_id = g.id)`;
            if (search && search.trim()) {
                countQuery += ` AND (g.name LIKE ? OR g.email LIKE ? OR g.company LIKE ?)`;
            }
        } else {
            // attendanceFilter === 'all'
            if (search && search.trim()) {
                countQuery += ` WHERE (g.name LIKE ? OR g.email LIKE ? OR g.company LIKE ?)`;
            }
        }
        
        console.log(`📊 Count Query: ${countQuery}`);
        console.log(`📊 Count Params:`, countParams);
        
        const [totalResult] = await db.execute(countQuery, countParams);
        const total = totalResult[0].total;
        
        console.log(`✅ Found ${guestsWithAttendance.length} guests, total: ${total}`);
        
        // Respuesta exitosa
        res.json({
            success: true,
            guests: guestsWithAttendance,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                currentPage: page,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR CRÍTICO en /api/guests:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Request params:', {
            search: req.query.search,
            attendance: req.query.attendance,
            page: req.query.page,
            limit: req.query.limit
        });
        
        // Respuesta de error detallada
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al buscar invitados',
            error: error.message,
            timestamp: new Date().toISOString(),
            debug: {
                search: req.query.search || '',
                attendanceFilter: req.query.attendance || 'all',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                errorType: error.constructor.name
            }
        });
    }
});

// INSTRUCCIONES DE REEMPLAZO:
// 1. Localizar el endpoint app.get('/api/guests', ...) en server.js
// 2. Reemplazar todo el contenido con este código
// 3. Reiniciar PM2: pm2 restart 4dei-guest-registration
// 4. Probar: https://welcu.shortenqr.com/debug_admin_search.html
