// Versión simplificada y robusta del endpoint /api/guests
// Para reemplazar la versión problemática

app.get('/api/guests', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const attendanceFilter = req.query.attendance || 'all';
        
        console.log(`🔍 API /api/guests - Search: "${search}", Filter: ${attendanceFilter}, Page: ${page}`);
        
        // Construir la consulta base sin subconsultas complejas
        let baseQuery = `
            SELECT DISTINCT g.id, g.name, g.email, g.company, g.phone, g.category, 
                   g.table_number, g.special_requirements, g.qr_code, g.created_at, g.updated_at
            FROM guests g
        `;
        
        let countQuery = `
            SELECT COUNT(DISTINCT g.id) as total
            FROM guests g
        `;
        
        // Agregar JOIN solo si necesitamos filtrar por asistencia
        if (attendanceFilter !== 'all') {
            baseQuery += ` LEFT JOIN attendance a ON g.id = a.guest_id`;
            countQuery += ` LEFT JOIN attendance a ON g.id = a.guest_id`;
        }
        
        // Construir condiciones WHERE
        let whereConditions = [];
        let queryParams = [];
        
        // Filtro de búsqueda
        if (search && search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            whereConditions.push('(g.name LIKE ? OR g.email LIKE ? OR g.company LIKE ?)');
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        // Filtro de asistencia
        if (attendanceFilter === 'attended') {
            whereConditions.push('a.guest_id IS NOT NULL');
        } else if (attendanceFilter === 'pending') {
            whereConditions.push('a.guest_id IS NULL');
        }
        
        // Agregar WHERE clause si hay condiciones
        if (whereConditions.length > 0) {
            const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
            baseQuery += whereClause;
            countQuery += whereClause;
        }
        
        // Completar la consulta principal
        baseQuery += ` ORDER BY g.name LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
        
        console.log(`📋 Query: ${baseQuery}`);
        console.log(`📋 Params:`, queryParams);
        
        // Ejecutar consulta principal
        const [guests] = await db.execute(baseQuery, queryParams);
        
        // Obtener información de asistencia para cada invitado
        const guestsWithAttendance = [];
        for (const guest of guests) {
            const [attendanceInfo] = await db.execute(
                'SELECT MAX(check_in_time) as last_check_in FROM attendance WHERE guest_id = ?',
                [guest.id]
            );
            
            guestsWithAttendance.push({
                ...guest,
                has_attended: attendanceInfo[0].last_check_in ? 1 : 0,
                last_check_in: attendanceInfo[0].last_check_in
            });
        }
        
        // Ejecutar consulta de conteo (sin LIMIT/OFFSET)
        const countParams = queryParams.slice(0, -2);
        const [totalResult] = await db.execute(countQuery, countParams);
        const total = totalResult[0].total;
        
        console.log(`📊 Found ${guestsWithAttendance.length} guests, total: ${total}`);
        
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
        console.error('❌ Error listando invitados:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error listando invitados',
            error: error.message,
            debug: {
                search: req.query.search || '',
                attendanceFilter: req.query.attendance || 'all',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            }
        });
    }
});
