console.log("--- server.js (MySQL Local): INICIANDO EJECUCIÓN ---");

try {
    const express = require('express');
    const bodyParser = require('body-parser');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const cors = require('cors');
    const path = require('path');
    const { stringify } = require('csv-stringify');
    const { Worker } = require('worker_threads');

    // Importar la conexión MySQL directamente desde db.js
    const db = require('../MODELO/db.js'); // db ahora es la conexión MySQL
    console.log("--- server.js (MySQL Local): Módulos importados, incluyendo db.js (MySQL). ---");

    const app = express();
    const port = 3000; // Puerto estándar para local
    const secretKey = 'tu_clave_secreta_aqui'; // Considera usar variables de entorno

    // Middlewares esenciales
    app.use(express.static(path.join(__dirname, '../VISTA'))); // Servir archivos estáticos desde VISTA
    app.use(bodyParser.json()); // Para entender peticiones JSON
    app.use(cors()); // Para permitir peticiones desde el frontend
    console.log("--- server.js (MySQL Local): Middlewares configurados ---");

    // --- Middleware para verificar el token JWT ---
    const verificarToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        // Verificar si el header existe y empieza con 'Bearer '
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!token) {
            return res.status(403).json({ message: 'Acceso denegado: Token no proporcionado o inválido.' });
        }
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                // Token expirado o firma inválida
                return res.status(401).json({ message: 'Acceso denegado: Token inválido o expirado.' });
            }
            req.maestro = decoded; // Añadir info del maestro al request
            next(); // Continuar a la ruta protegida
        });
    };

    // --- RUTAS PARA SERVIR PÁGINAS HTML ---
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/index.html'))); // <-- Corregido para apuntar a index.html
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
    app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/registro.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/dashboard.html')));
    app.get('/asistencia', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/asistencia.html')));
    app.get('/calificaciones', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/calificaciones.html')));
    app.get('/gestion', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/gestion.html')));
    app.get('/historial', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/historial.html')));
    app.get('/reporte-faltas', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/reporte-faltas.html')));
    console.log("--- server.js (MySQL Local): Rutas HTML definidas ---");

    // --- Rutas de la API (Usando 'db.query' con MySQL y '?') ---

    // REGISTRO de nuevo maestro
    app.post('/api/registro', (req, res) => {
        const { nombre, email, contrasena } = req.body;
        if (!nombre || !email || !contrasena) return res.status(400).json({ message: 'Faltan datos.' });
        try {
            const hash = bcrypt.hashSync(contrasena, 10);
            const sql = 'INSERT INTO Maestros (nombre, email, contrasena) VALUES (?, ?, ?)';
            db.query(sql, [nombre, email, hash], (err, result) => {
                if (err) {
                    console.error("Error en /api/registro:", err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: 'El correo ya está registrado.' });
                    }
                    return res.status(500).json({ message: 'Error en el servidor durante el registro.' });
                }
                res.status(201).json({ message: 'Maestro registrado exitosamente. Ahora puedes iniciar sesión.' });
            });
        } catch (bcryptError) {
            console.error("Error en bcrypt:", bcryptError);
            res.status(500).json({ message: 'Error interno al procesar contraseña.' });
        }
    });

    // LOGIN de maestro
    app.post('/api/login', (req, res) => {
        const { email, contrasena } = req.body;
        if (!email || !contrasena) return res.status(400).json({ message: 'Faltan datos.' });
        try {
            const sql = 'SELECT * FROM Maestros WHERE email = ?';
            db.query(sql, [email], (err, results) => {
                if (err) {
                    console.error("Error en /api/login DB query:", err);
                    return res.status(500).json({ message: 'Error consultando la base de datos.' });
                }
                if (results.length === 0) {
                    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
                }
                const maestro = results[0];
                const match = bcrypt.compareSync(contrasena, maestro.contrasena);
                if (!match) {
                    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
                }
                const token = jwt.sign({ id: maestro.id, email: maestro.email }, secretKey, { expiresIn: '1h' });
                res.status(200).json({ token }); // Enviar solo el token
            });
        } catch (error) {
             console.error("Error inesperado en /api/login:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
    });

    // OBTENER DATOS PARA EL DASHBOARD
     app.get('/api/dashboard', verificarToken, (req, res) => {
         const maestroId = req.maestro.id;
         try {
             const sql = `SELECT g.id AS grupo_id, g.nombre AS grupo_nombre, a.id AS alumno_id, a.nombre AS alumno_nombre, a.apellidoPaterno, a.apellidoMaterno FROM Grupos g LEFT JOIN Alumnos a ON g.id = a.grupo_id WHERE g.maestro_id = ? ORDER BY g.nombre, a.apellidoPaterno, a.nombre`;
             db.query(sql, [maestroId], (err, results) => {
                 if (err) {
                     console.error("Error en /api/dashboard DB query:", err);
                     return res.status(500).json({ message: 'Error al obtener datos del dashboard.' });
                 }
                 const grupos = results.reduce((acc, row) => {
                     acc[row.grupo_id] = acc[row.grupo_id] || { id: row.grupo_id, nombre: row.grupo_nombre, alumnos: [] };
                     if (row.alumno_id) {
                         acc[row.grupo_id].alumnos.push({
                             id: row.alumno_id, nombre: row.alumno_nombre,
                             apellidoPaterno: row.apellidoPaterno,
                             apellidoMaterno: row.apellidoMaterno
                         });
                     }
                     return acc;
                 }, {});
                 res.status(200).json({ grupos: Object.values(grupos) });
             });
         } catch(error) {
              console.error("Error inesperado en /api/dashboard:", error);
              res.status(500).json({ message: 'Error interno inesperado.' });
         }
     });

    // CREAR UN NUEVO GRUPO
     app.post('/api/grupos', verificarToken, (req, res) => {
        const { nombre } = req.body;
        const maestroId = req.maestro.id;
        if (!nombre) return res.status(400).json({ message: 'El nombre del grupo es requerido.' });
        try {
            const sql = 'INSERT INTO Grupos (nombre, maestro_id) VALUES (?, ?)';
            db.query(sql, [nombre, maestroId], (err, result) => {
                if (err) {
                    console.error("Error en /api/grupos POST:", err);
                    return res.status(500).json({ message: 'Error al crear el grupo.' });
                }
                res.status(201).json({ message: 'Grupo creado exitosamente.', id: result.insertId });
            });
        } catch (error) {
             console.error("Error inesperado en /api/grupos POST:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // ELIMINAR UN GRUPO
     app.delete('/api/grupos/:grupoId', verificarToken, (req, res) => {
        const { grupoId } = req.params;
        const maestroId = req.maestro.id;
        try {
            const checkSql = 'SELECT id FROM Grupos WHERE id = ? AND maestro_id = ?';
            db.query(checkSql, [grupoId, maestroId], (err, results) => {
                if (err) return res.status(500).json({ message: 'Error verificando grupo.' });
                if (results.length === 0) return res.status(404).json({ message: 'Grupo no encontrado o no autorizado.' });

                // Asumiendo ON DELETE CASCADE configurado en MySQL
                const deleteSql = 'DELETE FROM Grupos WHERE id = ?';
                db.query(deleteSql, [grupoId], (deleteErr, deleteResult) => {
                    if (deleteErr) {
                         console.error("Error en /api/grupos DELETE:", deleteErr);
                         return res.status(500).json({ message: 'Error al eliminar el grupo.' });
                    }
                    res.status(200).json({ message: 'Grupo eliminado exitosamente.' });
                });
            });
        } catch (error) {
            console.error("Error inesperado en /api/grupos DELETE:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // AGREGAR UN NUEVO ALUMNO
     app.post('/api/alumnos', verificarToken, (req, res) => {
        const { nombre, apellidoPaterno, apellidoMaterno, grupoId } = req.body;
        const maestroId = req.maestro.id;
        if (!nombre || !grupoId) return res.status(400).json({ message: 'Nombre y grupo son requeridos.' });
        try {
             const checkGroupSql = 'SELECT id FROM Grupos WHERE id = ? AND maestro_id = ?';
             db.query(checkGroupSql, [grupoId, maestroId], (checkErr, checkResults) => {
                  if (checkErr) return res.status(500).json({ message: 'Error verificando grupo.' });
                  if (checkResults.length === 0) return res.status(403).json({ message: 'No tienes permiso para este grupo.' });

                  const insertSql = 'INSERT INTO Alumnos (nombre, apellidoPaterno, apellidoMaterno, grupo_id) VALUES (?, ?, ?, ?)';
                  db.query(insertSql, [nombre, apellidoPaterno || null, apellidoMaterno || null, grupoId], (err, result) => {
                       if (err) {
                           console.error("Error en /api/alumnos POST:", err);
                           return res.status(500).json({ message: 'Error al agregar el alumno.' });
                       }
                       res.status(201).json({ message: 'Alumno agregado exitosamente.', id: result.insertId });
                  });
             });
        } catch (error) {
            console.error("Error inesperado en /api/alumnos POST:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // ELIMINAR UN ALUMNO
     app.delete('/api/alumnos/:alumnoId', verificarToken, (req, res) => {
         const { alumnoId } = req.params;
         const maestroId = req.maestro.id;
         try {
             const checkSql = `SELECT a.id FROM Alumnos a JOIN Grupos g ON a.grupo_id = g.id WHERE a.id = ? AND g.maestro_id = ?`;
             db.query(checkSql, [alumnoId, maestroId], (checkErr, checkResults) => {
                 if (checkErr) return res.status(500).json({ message: 'Error verificando alumno.' });
                 if (checkResults.length === 0) return res.status(404).json({ message: 'Alumno no encontrado o no pertenece a tus grupos.' });

                 const deleteSql = 'DELETE FROM Alumnos WHERE id = ?';
                 db.query(deleteSql, [alumnoId], (err, result) => {
                      if (err) {
                           console.error("Error en /api/alumnos DELETE:", err);
                           return res.status(500).json({ message: 'Error al eliminar alumno.' });
                      }
                      res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
                 });
             });
         } catch (error) {
            console.error("Error inesperado en /api/alumnos DELETE:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // REGISTRAR ASISTENCIA
     app.post('/api/asistencia', verificarToken, (req, res) => {
        const asistencias = req.body;
        if (!Array.isArray(asistencias) || asistencias.length === 0) return res.status(400).json({ message: 'Datos inválidos.' });
        try {
            const values = asistencias.map(a => [a.alumnoId, new Date(), a.asistio]);
            const sql = 'INSERT INTO Asistencia (alumno_id, fecha, presente) VALUES ?';
            db.query(sql, [values], (err, result) => {
                if (err) {
                    console.error("Error en /api/asistencia POST:", err);
                    return res.status(500).json({ message: 'Error al registrar asistencia.' });
                }
                res.status(201).json({ message: 'Asistencia registrada.' });
            });
        } catch (error) {
            console.error("Error inesperado en /api/asistencia POST:", error);
            res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // ACTUALIZAR ASISTENCIA
     app.put('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
        const { asistenciaId } = req.params;
        const { presente, justificante } = req.body;
        if (typeof presente === 'undefined' || (presente !== 1 && presente !== 0 && typeof presente !== 'boolean')) {
             return res.status(400).json({ message: 'Estado "presente" inválido.' });
        }
        try {
             const sql = 'UPDATE Asistencia SET presente = ?, justificante = ? WHERE id = ?';
             db.query(sql, [presente, justificante || null, asistenciaId], (err, result) => {
                if (err) {
                    console.error("Error en /api/asistencia PUT:", err);
                    return res.status(500).json({ message: 'Error al actualizar.' });
                }
                 if (result.affectedRows === 0) {
                      return res.status(404).json({ message: 'Registro no encontrado.' });
                 }
                res.status(200).json({ message: 'Registro actualizado.' });
             });
        } catch (error) {
            console.error("Error inesperado en /api/asistencia PUT:", error);
            res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // ELIMINAR ASISTENCIA
     app.delete('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
          const { asistenciaId } = req.params;
          try {
               const sql = 'DELETE FROM Asistencia WHERE id = ?';
               db.query(sql, [asistenciaId], (err, result) => {
                   if (err) {
                        console.error("Error en /api/asistencia DELETE:", err);
                        return res.status(500).json({ message: 'Error al eliminar.' });
                   }
                    if (result.affectedRows === 0) {
                         return res.status(404).json({ message: 'Registro no encontrado.' });
                   }
                    res.status(200).json({ message: 'Registro eliminado.' });
                 });
          } catch (error) {
               console.error("Error inesperado en /api/asistencia DELETE:", error);
               res.status(500).json({ message: 'Error interno inesperado.' });
         }
     });

    // OBTENER CALIFICACIONES
     app.get('/api/calificaciones/:grupoId', verificarToken, (req, res) => {
        const { grupoId } = req.params;
        const maestroId = req.maestro.id;
        try {
             const checkSql = 'SELECT id FROM Grupos WHERE id = ? AND maestro_id = ?';
             db.query(checkSql, [grupoId, maestroId], (checkErr, checkRes) => {
                if(checkErr || checkRes.length === 0) return res.status(403).json({ message: 'Acceso denegado.' });

                const sql = 'SELECT alumno_id, unidad, calificacion FROM Calificaciones WHERE grupo_id = ?';
                db.query(sql, [grupoId], (err, results) => {
                    if (err) {
                         console.error("Error en /api/calificaciones GET:", err);
                         return res.status(500).json({ message: 'Error al obtener calificaciones.' });
                    }
                    res.status(200).json(results);
                });
             });
        } catch (error) {
            console.error("Error inesperado en /api/calificaciones GET:", error);
            res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // GUARDAR O ACTUALIZAR CALIFICACIONES
     app.post('/api/calificaciones', verificarToken, (req, res) => {
        const calificaciones = req.body;
        if (!Array.isArray(calificaciones) || calificaciones.length === 0) return res.status(400).json({ message: 'Datos inválidos.' });
        try {
            const values = calificaciones.map(c => [c.alumno_id, c.grupo_id, c.unidad, c.calificacion]);
            const sql = `INSERT INTO Calificaciones (alumno_id, grupo_id, unidad, calificacion) VALUES ? ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion)`;
            db.query(sql, [values], (err, result) => {
                if (err) {
                    console.error("Error en /api/calificaciones POST:", err);
                    return res.status(500).json({ message: 'Error al guardar calificaciones.' });
                }
                res.status(200).json({ message: 'Calificaciones guardadas/actualizadas.' });
            });
        } catch (error) {
             console.error("Error inesperado en /api/calificaciones POST:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // CALCULAR PROMEDIO FINAL
     app.get('/api/promedio-final/:grupoId', verificarToken, (req, res) => {
         const { grupoId } = req.params;
         const maestroId = req.maestro.id;
         try {
             const checkSql = 'SELECT id FROM Grupos WHERE id = ? AND maestro_id = ?';
             db.query(checkSql, [grupoId, maestroId], (checkErr, checkRes) => {
                if(checkErr || checkRes.length === 0) return res.status(403).json({ message: 'Acceso denegado.' });

                const query = `SELECT a.id, a.nombre, a.apellidoPaterno, a.apellidoMaterno, COALESCE(AVG(c.calificacion), 0) as promedio_final FROM Alumnos a LEFT JOIN Calificaciones c ON a.id = c.alumno_id AND c.grupo_id = ? WHERE a.grupo_id = ? GROUP BY a.id, a.nombre, a.apellidoPaterno, a.apellidoMaterno ORDER BY a.apellidoPaterno, a.nombre`;
                db.query(query, [grupoId, grupoId], (err, results) => { // Pasar grupoId dos veces
                     if (err) {
                         console.error("Error en /api/promedio-final:", err);
                         return res.status(500).json({ message: 'Error al calcular promedio.' });
                     }
                     res.status(200).json(results);
                });
             });
         } catch (error) {
              console.error("Error inesperado en /api/promedio-final:", error);
              res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // OBTENER HISTORIAL
     app.get('/api/historial/:grupoId', verificarToken, (req, res) => {
         const { grupoId } = req.params;
         const maestroId = req.maestro.id;
         try {
             const query = `SELECT al.nombre as alumno_nombre, al.apellidoPaterno, al.apellidoMaterno, DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha, a.presente, a.id as asistencia_id, a.justificante FROM Alumnos AS al INNER JOIN Grupos AS g ON al.grupo_id = g.id LEFT JOIN Asistencia AS a ON al.id = a.alumno_id WHERE g.id = ? AND g.maestro_id = ? ORDER BY a.fecha DESC, al.apellidoPaterno, al.nombre;`;
             db.query(query, [grupoId, maestroId], (err, results) => {
                 if (err) {
                     console.error("Error en /api/historial:", err);
                     return res.status(500).json({ message: 'Error al obtener historial.' });
                 }
                 res.status(200).json(results);
             });
         } catch (error) {
             console.error("Error inesperado en /api/historial:", error);
             res.status(500).json({ message: 'Error interno inesperado.' });
        }
     });

    // RUTA PARA REPORTE DE FALTAS (LÓGICA DE SECCIONES)
    app.get('/api/reporte-faltas', verificarToken, (req, res) => {
        const { grupoId, rango } = req.query;
        const maestroId = req.maestro.id;

        if (!grupoId || !rango) {
            return res.status(400).json({ message: 'Faltan parámetros grupoId o rango.' });
        }

        let dateConditionSql;
        switch (rango) {
            case '1-semana':
                dateConditionSql = 'ASIS.fecha BETWEEN (CURDATE() - INTERVAL 7 DAY) AND CURDATE()';
                break;
            case '1-mes':
                dateConditionSql = 'ASIS.fecha BETWEEN (CURDATE() - INTERVAL 1 MONTH) AND (CURDATE() - INTERVAL 8 DAY)';
                break;
             case '3-meses':
                dateConditionSql = 'ASIS.fecha BETWEEN (CURDATE() - INTERVAL 3 MONTH) AND (CURDATE() - INTERVAL 1 MONTH - INTERVAL 1 DAY)';
                break;
            case '6-meses':
                dateConditionSql = 'ASIS.fecha BETWEEN (CURDATE() - INTERVAL 6 MONTH) AND (CURDATE() - INTERVAL 3 MONTH - INTERVAL 1 DAY)';
                break;
            case '1-anio':
                dateConditionSql = 'ASIS.fecha BETWEEN (CURDATE() - INTERVAL 1 YEAR) AND (CURDATE() - INTERVAL 6 MONTH - INTERVAL 1 DAY)';
                break;
            default:
                return res.status(400).json({ message: 'Rango no válido.' });
        }

        const query = `
            SELECT A.nombre, A.apellidoPaterno, A.apellidoMaterno, COUNT(ASIS.id) AS total_faltas 
            FROM Alumnos AS A 
            JOIN Asistencia AS ASIS ON A.id = ASIS.alumno_id 
            JOIN Grupos AS G ON A.grupo_id = G.id 
            WHERE A.grupo_id = ? 
            AND G.maestro_id = ? 
            AND ASIS.presente = 0 
            AND (${dateConditionSql}) 
            GROUP BY A.id, A.nombre, A.apellidoPaterno, A.apellidoMaterno 
            ORDER BY total_faltas DESC, A.apellidoPaterno, A.apellidoMaterno, A.nombre;
        `;

        db.query(query, [grupoId, maestroId], (err, results) => {
            if (err) {
                console.error("Error en /api/reporte-faltas GET:", err);
                return res.status(500).json({ message: 'Error al obtener el reporte de faltas.' });
            }
           res.status(200).json(results);
        });
    });

    // --- ¡NUEVO SCRIPT PARA CREAR 2500 ASISTENCIAS! ---
    app.get('/api/crear-asistencias-lote', verificarToken, (req, res) => {
        const maestroId = req.maestro.id;
        console.log(`--- /api/crear-asistencias-lote: Iniciando para maestroId ${maestroId} ---`);

        // --- PASO 1: Buscar TODOS los alumnos de este maestro ---
        const sqlAlumnos = `
            SELECT a.id FROM Alumnos a 
            JOIN Grupos g ON a.grupo_id = g.id 
            WHERE g.maestro_id = ?;
        `;
        
        db.query(sqlAlumnos, [maestroId], (err, alumnos) => {
            if (err) {
                console.error("Error en /crear-asistencias-lote (Paso 1 - Alumnos):", err);
                return res.status(500).json({ message: 'Error buscando alumnos.' });
            }

            if (alumnos.length === 0) {
                console.log("--- No se encontraron alumnos para este maestro. ---");
                return res.status(404).json({ message: 'No se encontraron alumnos para este maestro. Crea alumnos primero.' });
            }

            console.log(`--- Encontrados ${alumnos.length} alumnos. Generando ~${alumnos.length * 5} registros... ---`);

            // --- PASO 2: Preparar las 5 fechas de prueba (una para cada filtro) ---
            const hoy = new Date();
            const fechasPrueba = [
                new Date(new Date().setDate(hoy.getDate() - 3)),    // "1-semana"
                new Date(new Date().setDate(hoy.getDate() - 15)),   // "1-mes"
                new Date(new Date().setMonth(hoy.getMonth() - 2)),  // "3-meses"
                new Date(new Date().setMonth(hoy.getMonth() - 4)),  // "6-meses"
                new Date(new Date().setMonth(hoy.getMonth() - 8))   // "1-anio"
            ];

            // --- PASO 3: Generar el lote de ~2500 asistencias ---
            const asistenciasParaCrear = [];
            
            alumnos.forEach(alumno => {
                const alumno_id = alumno.id;
                
                fechasPrueba.forEach(fecha => {
                    // 90% de probabilidad de asistencia (1), 10% de falta (0)
                    const presente = Math.random() < 0.9 ? 1 : 0;
                    asistenciasParaCrear.push([alumno_id, fecha, presente]);
                });
            });

            // --- PASO 4: Insertar todos los registros de golpe ---
            const sqlInsert = 'INSERT INTO Asistencia (alumno_id, fecha, presente) VALUES ?';
            
            db.query(sqlInsert, [asistenciasParaCrear], (errInsert, resultInsert) => {
                if (errInsert) {
                    console.error("Error en /crear-asistencias-lote (Paso 4 - Insert):", errInsert);
                    return res.status(500).json({ message: 'Error insertando los registros de asistencia.' });
                }

                console.log(`--- ¡ÉXITO! ${resultInsert.affectedRows} registros de asistencia creados. ---`);
                res.status(201).json({
                    message: `¡ÉXITO! Se crearon ${resultInsert.affectedRows} registros de asistencia para tus ${alumnos.length} alumnos.`,
                });
            });
        });
    });
    // --- FIN DEL NUEVO SCRIPT ---


    console.log("--- server.js (MySQL Local): Rutas API definidas ---");


    // --- RUTA CATCH-ALL ---
    app.use((req, res) => {
         console.log(`--- server.js (MySQL Local): Ruta no encontrada (404) - ${req.method} ${req.originalUrl} ---`);
         res.status(404).sendFile(path.join(__dirname, '../VISTA/login.html'));
    });

    // --- MANEJADOR DE ERRORES GENERAL ---
     app.use((err, req, res, next) => {
        console.error("!!!!!!!! ERROR NO CAPTURADO EN RUTA !!!!!!!!");
        console.error(err.stack);
        res.status(500).json({ message: 'Error interno del servidor inesperado.' });
    });


    // Iniciar el servidor
    app.listen(port, () => {
         console.log(`--- server.js (MySQL Local): Servidor escuchando en puerto ${port} --- ¡ÉXITO!`);
    });

} catch (initializationError) {
    console.error("!!!!!!!! ERROR CRÍTICO AL INICIAR server.js !!!!!!!!");
    console.error(initializationError);
    process.exit(1);
}