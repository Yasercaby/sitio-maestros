const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Worker } = require('worker_threads'); // Mantenemos Worker por si lo usas

// Importar la conexión a la base de datos (PostgreSQL)
// NO necesitamos require('mysql') aquí
const client = require('../MODELO/db.js'); // Cambiado a 'client' como en db.js

const app = express();
const port = process.env.PORT || 3000; // Puerto dinámico para Render
const secretKey = 'tu_clave_secreta_aqui';

app.use(express.static(path.join(__dirname, '../VISTA')));
app.use(bodyParser.json());
app.use(cors());

// --- Middleware para verificar el token JWT ---
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Token no proporcionado o con formato incorrecto.' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token no válido o expirado.' });
        }
        req.maestro = decoded;
        next();
    });
};

// --- RUTAS PARA SERVIR PÁGINAS HTML ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/registro.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/dashboard.html')));
app.get('/asistencia', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/asistencia.html')));
app.get('/calificaciones', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/calificaciones.html')));
app.get('/gestion', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/gestion.html')));
app.get('/historial', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/historial.html')));

// --- Rutas de la API (Usando 'client' de PostgreSQL) ---

// NOTA IMPORTANTE: Se cambió db.query por client.query
// La sintaxis de los placeholders (?) puede necesitar ajuste para PostgreSQL ($1, $2, etc.)

app.post('/api/registro', async (req, res) => { // Cambiado a async
    const { nombre, email, contrasena } = req.body;
    try {
        const hash = await bcrypt.hash(contrasena, 10); // bcrypt.hash es async
        // PostgreSQL usa $1, $2... en lugar de ?
        const sql = 'INSERT INTO Maestros (nombre, email, contrasena) VALUES ($1, $2, $3)';
        await client.query(sql, [nombre, email, hash]);
        res.status(201).json({ message: 'Maestro registrado exitosamente.' });
    } catch (err) {
        console.error("Error en registro:", err);
        // Manejar error de duplicado específico de PostgreSQL (código '23505')
        if (err.code === '23505') {
             return res.status(409).json({ message: 'El correo ya está registrado.' });
        }
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

app.post('/api/login', async (req, res) => { // Cambiado a async
    const { email, contrasena } = req.body;
    try {
        const sql = 'SELECT * FROM Maestros WHERE email = $1';
        const result = await client.query(sql, [email]); // Usar await
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }
        const maestro = result.rows[0];
        const match = await bcrypt.compare(contrasena, maestro.contrasena); // bcrypt.compare es async
        
        if (!match) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }
        const token = jwt.sign({ id: maestro.id, email: maestro.email }, secretKey, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

app.get('/api/dashboard', verificarToken, async (req, res) => { // Cambiado a async
    const maestroId = req.maestro.id;
    try {
        // Consulta adaptada para PostgreSQL
        const sql = `
            SELECT g.id AS grupo_id, g.nombre AS grupo_nombre, 
                   a.id AS alumno_id, a.nombre AS alumno_nombre, a."apellidoPaterno", a."apellidoMaterno" -- Nombres de columna entre comillas si usan mayúsculas
            FROM Grupos g LEFT JOIN Alumnos a ON g.id = a.grupo_id
            WHERE g.maestro_id = $1 ORDER BY g.id, a."apellidoPaterno"`; // Usar $1
        const result = await client.query(sql, [maestroId]);
        
        const grupos = result.rows.reduce((acc, row) => {
            acc[row.grupo_id] = acc[row.grupo_id] || { id: row.grupo_id, nombre: row.grupo_nombre, alumnos: [] };
            if (row.alumno_id) acc[row.grupo_id].alumnos.push({
                id: row.alumno_id, nombre: row.alumno_nombre,
                apellidoPaterno: row.apellidoPaterno, // Quitar comillas aquí si en JS usas camelCase
                apellidoMaterno: row.apellidoMaterno
            });
            return acc;
        }, {});
        res.status(200).json({ grupos: Object.values(grupos) });
    } catch (err) {
        console.error("Error en dashboard:", err);
        res.status(500).json({ message: 'Error al obtener los datos.' });
    }
});

// --- (Resto de las rutas API adaptadas a PostgreSQL) ---

app.post('/api/grupos', verificarToken, async (req, res) => {
    const { nombre } = req.body;
    const maestroId = req.maestro.id;
    try {
        const sql = 'INSERT INTO Grupos (nombre, maestro_id) VALUES ($1, $2) RETURNING id'; // RETURNING id para obtener el ID
        const result = await client.query(sql, [nombre, maestroId]);
        res.status(201).json({ message: 'Grupo creado exitosamente.', id: result.rows[0].id });
    } catch (err) {
        console.error("Error creando grupo:", err);
        res.status(500).json({ message: 'Error al agregar el grupo.' });
    }
});

app.delete('/api/grupos/:grupoId', verificarToken, async (req, res) => {
    const { grupoId } = req.params;
    const maestroId = req.maestro.id;
    // IMPORTANTE: En PostgreSQL es mejor usar transacciones para borrados en cascada
    try {
        await client.query('BEGIN'); // Iniciar transacción
        await client.query('DELETE FROM Asistencia WHERE alumno_id IN (SELECT id FROM Alumnos WHERE grupo_id = $1)', [grupoId]);
        await client.query('DELETE FROM Alumnos WHERE grupo_id = $1', [grupoId]);
        // Verificar que el grupo pertenece al maestro antes de borrar
        const result = await client.query('DELETE FROM Grupos WHERE id = $1 AND maestro_id = $2 RETURNING id', [grupoId, maestroId]);
        await client.query('COMMIT'); // Confirmar transacción
        if (result.rowCount === 0) {
            await client.query('ROLLBACK'); // Deshacer si el grupo no era del maestro (aunque ya se borraron alumnos/asistencia) - Mejorar lógica si es crítico
            return res.status(404).json({ message: 'Grupo no encontrado o no autorizado.' });
        }
        res.status(200).json({ message: 'Grupo eliminado exitosamente.' });
    } catch (err) {
        await client.query('ROLLBACK'); // Deshacer transacción en caso de error
        console.error("Error eliminando grupo:", err);
        res.status(500).json({ message: 'Error al eliminar el grupo.' });
    }
});


app.post('/api/alumnos', verificarToken, async (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, grupoId } = req.body;
     // Nombres de columna entre comillas si usan mayúsculas
    const sql = 'INSERT INTO Alumnos (nombre, "apellidoPaterno", "apellidoMaterno", grupo_id) VALUES ($1, $2, $3, $4) RETURNING id';
    try {
        const result = await client.query(sql, [nombre, apellidoPaterno, apellidoMaterno, grupoId]);
        res.status(201).json({ message: 'Alumno agregado exitosamente.', id: result.rows[0].id });
    } catch (err) {
         console.error("Error agregando alumno:", err);
        res.status(500).json({ message: 'Error al agregar el alumno.' });
    }
});

app.delete('/api/alumnos/:alumnoId', verificarToken, async (req, res) => {
    const { alumnoId } = req.params;
    try {
        await client.query('DELETE FROM Alumnos WHERE id = $1', [alumnoId]);
        res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
    } catch (err) {
        console.error("Error eliminando alumno:", err);
        res.status(500).json({ message: 'Error al eliminar alumno.' });
    }
});

// Ruta para pasar lista - Adaptada para PostgreSQL
app.post('/api/asistencia', verificarToken, async (req, res) => {
    const asistencias = req.body; // Array de objetos { alumnoId: x, asistio: y }
    if (!Array.isArray(asistencias) || asistencias.length === 0) {
        return res.status(400).json({ message: 'Datos de asistencia inválidos.' });
    }
    try {
        await client.query('BEGIN');
        // Usar un bucle para insertar cada registro individualmente es más compatible que INSERT masivo
        for (const asistencia of asistencias) {
            const sql = 'INSERT INTO Asistencia (alumno_id, fecha, presente) VALUES ($1, CURRENT_DATE, $2)';
            await client.query(sql, [asistencia.alumnoId, asistencia.asistio]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Asistencia registrada exitosamente.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error registrando asistencia:", err);
        res.status(500).json({ message: 'Error al registrar la asistencia.' });
    }
});


app.put('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => {
    const { asistenciaId } = req.params;
    const { presente, justificante } = req.body;
    const sql = 'UPDATE Asistencia SET presente = $1, justificante = $2 WHERE id = $3';
    try {
        await client.query(sql, [presente, justificante, asistenciaId]);
        res.status(200).json({ message: 'Registro actualizado exitosamente.' });
    } catch (err) {
        console.error("Error actualizando asistencia:", err);
        res.status(500).json({ message: 'Error al actualizar el registro.' });
    }
});

app.delete('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => {
    const { asistenciaId } = req.params;
    const sql = 'DELETE FROM Asistencia WHERE id = $1';
    try {
        await client.query(sql, [asistenciaId]);
        res.status(200).json({ message: 'Registro eliminado exitosamente.' });
    } catch (err) {
        console.error("Error eliminando asistencia:", err);
        res.status(500).json({ message: 'Error al eliminar el registro.' });
    }
});

app.get('/api/calificaciones/:grupoId', verificarToken, async (req, res) => {
    const { grupoId } = req.params;
    const sql = 'SELECT alumno_id, unidad, calificacion FROM Calificaciones WHERE grupo_id = $1';
    try {
        const result = await client.query(sql, [grupoId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error obteniendo calificaciones:", err);
        res.status(500).json({ message: 'Error al obtener calificaciones.' });
    }
});

// Ruta para guardar/actualizar calificaciones - Adaptada para PostgreSQL
app.post('/api/calificaciones', verificarToken, async (req, res) => {
    const calificaciones = req.body;
    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
        return res.status(400).json({ message: 'Datos de calificaciones inválidos.' });
    }
    try {
        await client.query('BEGIN');
        // Usar ON CONFLICT para insertar o actualizar
        for (const calif of calificaciones) {
            const sql = `
                INSERT INTO Calificaciones (alumno_id, grupo_id, unidad, calificacion) 
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (alumno_id, grupo_id, unidad) -- Asumiendo que esta es tu clave única
                DO UPDATE SET calificacion = EXCLUDED.calificacion;
            `;
            await client.query(sql, [calif.alumno_id, calif.grupo_id, calif.unidad, calif.calificacion]);
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'Calificaciones guardadas y actualizadas con éxito.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error guardando calificaciones:", err);
        res.status(500).json({ message: 'Error al guardar las calificaciones.' });
    }
});


app.get('/api/promedio-final/:grupoId', verificarToken, async (req, res) => {
    const { grupoId } = req.params;
     // Nombres de columna entre comillas si usan mayúsculas
    const query = `
        SELECT a.id, a.nombre, a."apellidoPaterno", a."apellidoMaterno", AVG(c.calificacion) as promedio_final
        FROM Alumnos a LEFT JOIN Calificaciones c ON a.id = c.alumno_id
        WHERE a.grupo_id = $1
        GROUP BY a.id, a.nombre, a."apellidoPaterno", a."apellidoMaterno"`; // Agrupar por todas las columnas no agregadas
    try {
        const result = await client.query(query, [grupoId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error calculando promedio:", err);
        res.status(500).json({ message: 'Error al calcular el promedio final.' });
    }
});

app.get('/api/historial/:grupoId', verificarToken, async (req, res) => {
    const { grupoId } = req.params;
    const maestroId = req.maestro.id;
    // Nombres de columna entre comillas si usan mayúsculas
    const query = `
        SELECT al.nombre as alumno_nombre, al."apellidoPaterno", al."apellidoMaterno",
               TO_CHAR(a.fecha, 'YYYY-MM-DD') as fecha, -- Usar TO_CHAR para formatear fecha
               a.presente, a.id as asistencia_id, a.justificante
        FROM alumnos AS al
        INNER JOIN grupos AS g ON al.grupo_id = g.id
        LEFT JOIN asistencia AS a ON al.id = a.alumno_id
        WHERE g.id = $1 AND g.maestro_id = $2
        ORDER BY a.fecha DESC, al."apellidoPaterno", al.nombre;`;
    try {
        const result = await client.query(query, [grupoId, maestroId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error obteniendo historial:", err);
        res.status(500).json({ message: 'Error en el servidor al obtener el historial.' });
    }
});


// --- RUTA CATCH-ALL ---
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../VISTA/login.html'));
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    console.log(`(El puerto real en Render puede ser diferente)`);
});