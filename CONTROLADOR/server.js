console.log("--- server.js: INICIANDO EJECUCIÓN ---"); // <-- ÚNICO ESPÍA

try {
    const express = require('express');
    const bodyParser = require('body-parser');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const cors = require('cors');
    const path = require('path');
    const { Worker } = require('worker_threads');

    // Importar el pool directamente
    const pool = require('../MODELO/db.js');

    const app = express();
    const port = process.env.PORT || 3000;
    const secretKey = 'tu_clave_secreta_aqui';

    app.use(express.static(path.join(__dirname, '../VISTA')));
    app.use(bodyParser.json());
    app.use(cors());

    // --- Middleware verificarToken ---
    const verificarToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(403).json({ message: 'Token incorrecto.' });
        const token = authHeader.split(' ')[1];
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) return res.status(401).json({ message: 'Token inválido.' });
            req.maestro = decoded;
            next();
        });
    };

    // --- RUTAS HTML ---
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
    app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/registro.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/dashboard.html')));
    app.get('/asistencia', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/asistencia.html')));
    app.get('/calificaciones', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/calificaciones.html')));
    app.get('/gestion', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/gestion.html')));
    app.get('/historial', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/historial.html')));

    // --- Rutas de la API (Usando 'pool.query') ---

    app.post('/api/registro', async (req, res) => {
        const { nombre, email, contrasena } = req.body;
        try {
            const hash = await bcrypt.hash(contrasena, 10);
            const sql = 'INSERT INTO maestros (nombre, email, contrasena) VALUES ($1, $2, $3)';
            await pool.query(sql, [nombre, email, hash]); // Usa pool.query
            res.status(201).json({ message: 'Maestro registrado exitosamente.' });
        } catch (err) {
             console.error("Error en registro:", err);
             if (err.code === '23505') { // Error de duplicado en PostgreSQL
                 return res.status(409).json({ message: 'El correo ya está registrado.' });
             }
             res.status(500).json({ message: 'Error en el servidor.' });
        }
    });

    app.post('/api/login', async (req, res) => {
        const { email, contrasena } = req.body;
        try {
            const sql = 'SELECT * FROM maestros WHERE email = $1';
            const result = await pool.query(sql, [email]); // Usa pool.query
            if (result.rows.length === 0) throw new Error('Auth failed');
            const maestro = result.rows[0];
            const match = await bcrypt.compare(contrasena, maestro.contrasena);
            if (!match) throw new Error('Auth failed');
            const token = jwt.sign({ id: maestro.id, email: maestro.email }, secretKey, { expiresIn: '1h' });
            res.status(200).json({ token });
        } catch (err) { res.status(401).json({ message: 'Correo o contraseña incorrectos.' }); }
    });

     app.get('/api/dashboard', verificarToken, async (req, res) => {
         const maestroId = req.maestro.id;
         try {
             // Asegúrate que los nombres de tablas y columnas coincidan (minúsculas o con "")
             const sql = `
                 SELECT g.id AS grupo_id, g.nombre AS grupo_nombre,
                        a.id AS alumno_id, a.nombre AS alumno_nombre, a."apellidoPaterno", a."apellidoMaterno"
                 FROM grupos g LEFT JOIN alumnos a ON g.id = a.grupo_id
                 WHERE g.maestro_id = $1 ORDER BY g.id, a."apellidoPaterno"`;
             const result = await pool.query(sql, [maestroId]); // Usa pool.query
             const grupos = result.rows.reduce((acc, row) => {
                acc[row.grupo_id] = acc[row.grupo_id] || { id: row.grupo_id, nombre: row.grupo_nombre, alumnos: [] };
                if (row.alumno_id) acc[row.grupo_id].alumnos.push({
                    id: row.alumno_id, nombre: row.alumno_nombre,
                    apellidoPaterno: row.apellidoPaterno, // Ajusta si usas comillas en la tabla
                    apellidoMaterno: row.apellidoMaterno
                });
                return acc;
            }, {});
             res.status(200).json({ grupos: Object.values(grupos) });
         } catch (err) {
             console.error("Error en dashboard:", err);
             res.status(500).json({ message: 'Error al obtener datos.' });
         }
     });

    // ... (ASEGÚRATE DE REVISAR Y ADAPTAR TODAS LAS DEMÁS RUTAS API para usar pool.query y nombres de tabla/columna correctos) ...
     app.post('/api/grupos', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.delete('/api/grupos/:grupoId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.post('/api/alumnos', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.delete('/api/alumnos/:alumnoId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.post('/api/asistencia', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.put('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.delete('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.get('/api/calificaciones/:grupoId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.post('/api/calificaciones', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.get('/api/promedio-final/:grupoId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });
     app.get('/api/historial/:grupoId', verificarToken, async (req, res) => { /* ... usa pool.query ... */ });


    // --- RUTA CATCH-ALL ---
    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, '../VISTA/login.html'));
    });

    // Iniciar el servidor
    app.listen(port, () => {
        console.log(`Servidor escuchando en puerto ${port}`); // Mensaje simple
    });

} catch (initializationError) {
    // --- ESPÍA DE ERRORES DE INICIO ---
    console.error("!!!!!!!! ERROR CRÍTICO AL INICIAR server.js !!!!!!!!");
    console.error(initializationError);
    process.exit(1); // Forzar salida si hay error al inicio
}

