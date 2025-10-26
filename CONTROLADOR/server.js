console.log("--- server.js: INICIANDO EJECUCIÓN ---");

try {
    const express = require('express');
    const bodyParser = require('body-parser');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const cors = require('cors');
    const path = require('path');
    const { Worker } = require('worker_threads'); // Mantener si usas el worker

    // Importar el pool directamente
    const pool = require('../MODELO/db.js');
    console.log("--- server.js: Módulos importados, incluyendo db.js ---");

    const app = express();
    const port = process.env.PORT || 3000;
    const secretKey = 'tu_clave_secreta_aqui';

    app.use(express.static(path.join(__dirname, '../VISTA')));
    app.use(bodyParser.json());
    app.use(cors());
    console.log("--- server.js: Middlewares configurados ---");

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
    console.log("--- server.js: Rutas HTML definidas ---");

    // --- Rutas de la API (Usando 'pool.query') ---

    app.post('/api/registro', async (req, res) => {
        const { nombre, email, contrasena } = req.body;
        try {
            const hash = await bcrypt.hash(contrasena, 10);
            // Asegúrate que el nombre de la tabla sea 'maestros' (minúscula) si así la creaste
            const sql = 'INSERT INTO maestros (nombre, email, contrasena) VALUES ($1, $2, $3)';
            await pool.query(sql, [nombre, email, hash]);
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
            // Asegúrate que el nombre de la tabla sea 'maestros' (minúscula)
            const sql = 'SELECT * FROM maestros WHERE email = $1';
            const result = await pool.query(sql, [email]);
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
             // Asegúrate que los nombres de tablas (grupos, alumnos) y columnas ("apellidoPaterno", etc.) coincidan
             const sql = `
                 SELECT g.id AS grupo_id, g.nombre AS grupo_nombre,
                        a.id AS alumno_id, a.nombre AS alumno_nombre, a."apellidoPaterno", a."apellidoMaterno"
                 FROM grupos g LEFT JOIN alumnos a ON g.id = a.grupo_id
                 WHERE g.maestro_id = $1 ORDER BY g.id, a."apellidoPaterno"`;
             const result = await pool.query(sql, [maestroId]);
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

     app.post('/api/grupos', verificarToken, async (req, res) => {
        const { nombre } = req.body;
        const maestroId = req.maestro.id;
        try {
            const sql = 'INSERT INTO grupos (nombre, maestro_id) VALUES ($1, $2) RETURNING id';
            const result = await pool.query(sql, [nombre, maestroId]);
            res.status(201).json({ message: 'Grupo creado exitosamente.', id: result.rows[0].id });
        } catch (err) {
            console.error("Error creando grupo:", err);
            res.status(500).json({ message: 'Error al agregar el grupo.' });
        }
     });

     app.delete('/api/grupos/:grupoId', verificarToken, async (req, res) => {
        const { grupoId } = req.params;
        const maestroId = req.maestro.id;
        try {
            await pool.query('BEGIN');
            // Asegúrate que los nombres de tablas sean correctos (calificaciones, asistencia, alumnos, grupos)
            await pool.query('DELETE FROM calificaciones WHERE grupo_id = $1', [grupoId]);
            await pool.query('DELETE FROM asistencia WHERE alumno_id IN (SELECT id FROM alumnos WHERE grupo_id = $1)', [grupoId]);
            await pool.query('DELETE FROM alumnos WHERE grupo_id = $1', [grupoId]);
            const result = await pool.query('DELETE FROM grupos WHERE id = $1 AND maestro_id = $2 RETURNING id', [grupoId, maestroId]);
            await pool.query('COMMIT');
            if (result.rowCount === 0) return res.status(404).json({ message: 'Grupo no encontrado o no autorizado.' });
            res.status(200).json({ message: 'Grupo eliminado exitosamente.' });
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error("Error eliminando grupo:", err);
            res.status(500).json({ message: 'Error al eliminar el grupo.' });
        }
     });

     app.post('/api/alumnos', verificarToken, async (req, res) => {
        const { nombre, apellidoPaterno, apellidoMaterno, grupoId } = req.body;
        // Asegúrate que el nombre de tabla (alumnos) y columnas ("apellidoPaterno", etc.) coincidan
        const sql = 'INSERT INTO alumnos (nombre, "apellidoPaterno", "apellidoMaterno", grupo_id) VALUES ($1, $2, $3, $4) RETURNING id';
        try {
            const result = await pool.query(sql, [nombre, apellidoPaterno, apellidoMaterno, grupoId]);
            res.status(201).json({ message: 'Alumno agregado exitosamente.', id: result.rows[0].id });
        } catch (err) {
             console.error("Error agregando alumno:", err);
            res.status(500).json({ message: 'Error al agregar el alumno.' });
        }
     });

     app.delete('/api/alumnos/:alumnoId', verificarToken, async (req, res) => {
         const { alumnoId } = req.params;
         try {
             // Asegúrate que el nombre de tabla sea 'alumnos'
             await pool.query('DELETE FROM alumnos WHERE id = $1', [alumnoId]);
             res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
         } catch (err) {
             console.error("Error eliminando alumno:", err);
             res.status(500).json({ message: 'Error al eliminar alumno.' });
         }
     });

     app.post('/api/asistencia', verificarToken, async (req, res) => {
        const asistencias = req.body;
        if (!Array.isArray(asistencias) || asistencias.length === 0) return res.status(400).json({ message: 'Datos inválidos.' });
        try {
            await pool.query('BEGIN');
            for (const asistencia of asistencias) {
                // Asegúrate que el nombre de tabla sea 'asistencia'
                const sql = 'INSERT INTO asistencia (alumno_id, fecha, presente) VALUES ($1, CURRENT_DATE, $2)';
                await pool.query(sql, [asistencia.alumnoId, asistencia.asistio]);
            }
            await pool.query('COMMIT');
            res.status(201).json({ message: 'Asistencia registrada.' });
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error("Error registrando asistencia:", err);
            res.status(500).json({ message: 'Error al registrar asistencia.' });
        }
     });

     app.put('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => {
        const { asistenciaId } = req.params;
        const { presente, justificante } = req.body;
        // Asegúrate que el nombre de tabla sea 'asistencia'
        const sql = 'UPDATE asistencia SET presente = $1, justificante = $2 WHERE id = $3';
        try {
            await pool.query(sql, [presente, justificante, asistenciaId]);
            res.status(200).json({ message: 'Registro actualizado.' });
        } catch (err) {
            console.error("Error actualizando asistencia:", err);
            res.status(500).json({ message: 'Error al actualizar.' });
        }
     });

     app.delete('/api/asistencia/:asistenciaId', verificarToken, async (req, res) => {
         const { asistenciaId } = req.params;
         // Asegúrate que el nombre de tabla sea 'asistencia'
         const sql = 'DELETE FROM asistencia WHERE id = $1';
         try {
             await pool.query(sql, [asistenciaId]);
             res.status(200).json({ message: 'Registro eliminado.' });
         } catch (err) {
             console.error("Error eliminando asistencia:", err);
             res.status(500).json({ message: 'Error al eliminar.' });
         }
     });

     app.get('/api/calificaciones/:grupoId', verificarToken, async (req, res) => {
        const { grupoId } = req.params;
        // Asegúrate que el nombre de tabla sea 'calificaciones'
        const sql = 'SELECT alumno_id, unidad, calificacion FROM calificaciones WHERE grupo_id = $1';
        try {
            const result = await pool.query(sql, [grupoId]);
            res.status(200).json(result.rows);
        } catch (err) {
            console.error("Error obteniendo calificaciones:", err);
            res.status(500).json({ message: 'Error al obtener calificaciones.' });
        }
     });

     app.post('/api/calificaciones', verificarToken, async (req, res) => {
        const calificaciones = req.body;
        if (!Array.isArray(calificaciones) || calificaciones.length === 0) return res.status(400).json({ message: 'Datos inválidos.' });
        try {
            await pool.query('BEGIN');
            for (const calif of calificaciones) {
                 // Asegúrate que el nombre de tabla sea 'calificaciones'
                const sql = `
                    INSERT INTO calificaciones (alumno_id, grupo_id, unidad, calificacion)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (alumno_id, grupo_id, unidad)
                    DO UPDATE SET calificacion = EXCLUDED.calificacion; `;
                await pool.query(sql, [calif.alumno_id, calif.grupo_id, calif.unidad, calif.calificacion]);
            }
            await pool.query('COMMIT');
            res.status(200).json({ message: 'Calificaciones guardadas.' });
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error("Error guardando calificaciones:", err);
            res.status(500).json({ message: 'Error al guardar calificaciones.' });
        }
     });

     app.get('/api/promedio-final/:grupoId', verificarToken, async (req, res) => {
         const { grupoId } = req.params;
         // Asegúrate que nombres de tablas (alumnos, calificaciones) y columnas ("apellidoPaterno") coincidan
         const query = `
             SELECT a.id, a.nombre, a."apellidoPaterno", a."apellidoMaterno", AVG(c.calificacion) as promedio_final
             FROM alumnos a LEFT JOIN calificaciones c ON a.id = c.alumno_id
             WHERE a.grupo_id = $1
             GROUP BY a.id, a.nombre, a."apellidoPaterno", a."apellidoMaterno"`;
         try {
             const result = await pool.query(query, [grupoId]);
             res.status(200).json(result.rows);
         } catch (err) {
             console.error("Error calculando promedio:", err);
             res.status(500).json({ message: 'Error al calcular promedio.' });
         }
     });

     app.get('/api/historial/:grupoId', verificarToken, async (req, res) => {
         const { grupoId } = req.params;
         const maestroId = req.maestro.id;
         // Asegúrate que nombres de tablas (alumnos, grupos, asistencia) y columnas ("apellidoPaterno") coincidan
         const query = `
             SELECT al.nombre as alumno_nombre, al."apellidoPaterno", al."apellidoMaterno",
                    TO_CHAR(a.fecha, 'YYYY-MM-DD') as fecha,
                    a.presente, a.id as asistencia_id, a.justificante
             FROM alumnos AS al
             INNER JOIN grupos AS g ON al.grupo_id = g.id
             LEFT JOIN asistencia AS a ON al.id = a.alumno_id
             WHERE g.id = $1 AND g.maestro_id = $2
             ORDER BY a.fecha DESC, al."apellidoPaterno", al.nombre;`;
         try {
             const result = await pool.query(query, [grupoId, maestroId]);
             res.status(200).json(result.rows);
         } catch (err) {
             console.error("Error obteniendo historial:", err);
             res.status(500).json({ message: 'Error al obtener historial.' });
         }
     });


    console.log("--- server.js: Rutas API definidas ---");

    // --- RUTA CATCH-ALL ---
    app.use((req, res) => {
        console.log("--- server.js: Ruta no encontrada (404) ---");
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