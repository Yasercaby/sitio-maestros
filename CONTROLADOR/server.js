console.log("--- server.js: INICIANDO EJECUCIÓN ---");

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
    // Verificar el pool justo después de importarlo
    console.log("--- server.js: Módulos importados. Verificando pool importado:", typeof pool, "¿Tiene query?", typeof pool?.query === 'function');

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
        console.log("--- /api/registro: Petición ---");
        try {
            // Verificar pool OTRA VEZ justo antes de usarlo
            console.log("===> /api/registro: Verificando pool:", typeof pool, "¿Tiene query?", typeof pool?.query === 'function');
            if (typeof pool?.query !== 'function') {
                 // Si falla aquí, el objeto pool no es lo que esperamos
                 throw new Error("El objeto pool importado no tiene la función query.");
            }

            const hash = await bcrypt.hash(contrasena, 10);
            // Asegúrate que el nombre de tabla sea 'maestros' (minúscula)
            const sql = 'INSERT INTO maestros (nombre, email, contrasena) VALUES ($1, $2, $3)';
            await pool.query(sql, [nombre, email, hash]); // Usa pool.query
            res.status(201).json({ message: 'Maestro registrado exitosamente.' });
        } catch (err) {
             console.error("!!!!!!!! ERROR EN /api/registro !!!!!!!!");
             console.error(err); // Mostrar el error completo
             // Ajusta el manejo de errores según sea necesario
             if (err.code === '23505') { // Error de duplicado en PostgreSQL
                 return res.status(409).json({ message: 'El correo ya está registrado.' });
             }
             res.status(500).json({ message: 'Error en el servidor.' });
        }
    });

    // ... (RESTO DE TUS RUTAS API COMPLETAS AQUÍ, ASEGÚRATE QUE TODAS USEN pool.query) ...
     app.post('/api/login', async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.get('/api/dashboard', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     // ... Añade aquí el código completo para todas tus otras rutas API ...
     app.post('/api/grupos', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.delete('/api/grupos/:grupoId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.post('/api/alumnos', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.delete('/api/alumnos/:alumnoId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.post('/api/asistencia', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.put('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.delete('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.get('/api/calificaciones/:grupoId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.post('/api/calificaciones', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.get('/api/promedio-final/:grupoId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });
     app.get('/api/historial/:grupoId', verificarToken, async (req, res) => { try { /* ... usa pool.query ... */ } catch(e) { /*...*/ } });


    // --- RUTA CATCH-ALL ---
    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, '../VISTA/login.html'));
    });

    // Iniciar el servidor
    app.listen(port, () => {
        console.log(`--- server.js: Servidor escuchando en puerto ${port} --- ¡ÉXITO!`);
    });

} catch (initializationError) {
    console.error("!!!!!!!! ERROR CRÍTICO AL INICIAR server.js !!!!!!!!");
    console.error(initializationError);
    process.exit(1);
}