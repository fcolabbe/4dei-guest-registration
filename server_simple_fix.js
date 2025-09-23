// 🚨 CORRECCIÓN URGENTE - Endpoint /api/guests colgado
// Versión ultra-simplificada para solucionar el problema inmediatamente

app.get('/api/guests', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const attendanceFilter = req.query.attendance || 'all';
        
        console.log(`🔍 API /api/guests - Search: "${search}", Filter: ${attendanceFilter}, Page: ${page}`);
        
        // VERSIÓN ULTRA-SIMPLE - UNA SOLA CONSULTA
        let baseQuery = `
            SELECT DISTINCT g.id, g.name, g.email, g.company, g.phone, g.category, 
                   g.table_number, g.special_requirements, g.qr_code, 
                   g.created_at, g.updated_at,
                   CASE WHEN a.guest_id IS NOT NULL THEN 1 ELSE 0 END as has_attended,
                   a.check_in_time as last_check_in
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
        `;
        
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
        
        // Agregar WHERE si hay condiciones
        if (whereConditions.length > 0) {
            baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        
        baseQuery += ` ORDER BY g.name LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
        
        console.log(`📋 Query: ${baseQuery}`);
        console.log(`📋 Params:`, queryParams);
        
        // Ejecutar consulta única
        const [guests] = await db.execute(baseQuery, queryParams);
        
        // Contar total - versión simple
        let countQuery = `
            SELECT COUNT(DISTINCT g.id) as total 
            FROM guests g
            LEFT JOIN attendance a ON g.id = a.guest_id
        `;
        
        let countParams = [];
        if (search && search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (whereConditions.length > 0) {
            countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        
        const [totalResult] = await db.execute(countQuery, countParams);
        const total = totalResult[0].total;
        
        console.log(`✅ Found ${guests.length} guests, total: ${total}`);
        
        res.json({
            success: true,
            guests: guests,
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
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// INSTRUCCIONES:
// 1. Reemplazar el endpoint actual con este código
// 2. Reiniciar PM2 inmediatamente
// 3. Probar: curl -s "https://welcu.shortenqr.com/api/guests?search=idarmis&limit=5"
