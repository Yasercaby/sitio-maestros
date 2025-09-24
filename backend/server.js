const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { stringify } = require('csv-stringify');
const db = require('./db');

const app = express();
const port = 3000;
const secretKey = 'tu_clave_secreta_aqui';

// Middleware para servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware para procesar JSON y permitir CORS
app.use(bodyParser.json());
app.use(cors());

// Middleware para verificar el token JWT
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token no proporcionado.' });
    }
    
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token no válido.' });
        }
        req.maestro = decoded;
        next();
    });
};

// --- Rutas de la API ---

// Ruta de Registro de Maestros
app.post('/api/registro', (req, res) => {
    const { nombre, email, contrasena } = req.body;
    
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(contrasena, salt);

    const sql = 'INSERT INTO Maestros (nombre, email, contrasena) VALUES (?, ?, ?)';
    db.query(sql, [nombre, email, hash], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'El correo ya está registrado.' });
            }
            return res.status(500).json({ message: 'Error en el servidor.' });
        }
        res.status(201).json({ message: 'Maestro registrado exitosamente.' });
    });
});

// Ruta de Inicio de Sesión
app.post('/api/login', (req, res) => {
    const { email, contrasena } = req.body;
    
    const sql = 'SELECT * FROM Maestros WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor.' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        const maestro = results[0];

        const match = bcrypt.compareSync(contrasena, maestro.contrasena);
        if (!match) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        const token = jwt.sign(
            { id: maestro.id, email: maestro.email }, 
            secretKey,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token: token, message: 'Inicio de sesión exitoso.' });
    });
});

// Ruta Protegida: Dashboard del Maestro
app.get('/api/dashboard', verificarToken, (req, res) => {
    const maestroId = req.maestro.id;

    const sql = `
        SELECT 
            Grupos.id AS grupo_id, 
            Grupos.nombre AS grupo_nombre, 
            Alumnos.id AS alumno_id, 
            Alumnos.nombre AS alumno_nombre,
            Alumnos.apellidoPaterno,
            Alumnos.apellidoMaterno
        FROM Grupos
        LEFT JOIN Alumnos ON Grupos.id = Alumnos.grupo_id
        WHERE Grupos.maestro_id = ?
        ORDER BY grupo_id, Alumnos.apellidoPaterno, Alumnos.apellidoMaterno, Alumnos.nombre;
    `;
    
    db.query(sql, [maestroId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error al obtener los datos.' });
        }
        const grupos = {};
        results.forEach(row => {
            if (!grupos[row.grupo_id]) {
                grupos[row.grupo_id] = {
                    id: row.grupo_id,
                    nombre: row.grupo_nombre,
                    alumnos: []
                };
            }
            if (row.alumno_id) {
                grupos[row.grupo_id].alumnos.push({
                    id: row.alumno_id,
                    nombre: row.alumno_nombre,
                    apellidoPaterno: row.apellidoPaterno,
                    apellidoMaterno: row.apellidoMaterno
                });
            }
        });
        res.status(200).json({ grupos: Object.values(grupos) });
    });
});

// Ruta para agregar un nuevo grupo
app.post('/api/grupos', verificarToken, (req, res) => {
    const { nombre } = req.body;
    const maestroId = req.maestro.id;

    const sql = 'INSERT INTO Grupos (nombre, maestro_id) VALUES (?, ?)';
    db.query(sql, [nombre, maestroId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al agregar el grupo.' });
        }
        res.status(201).json({ message: 'Grupo creado exitosamente.', id: result.insertId });
    });
});

// Ruta para agregar un nuevo alumno a un grupo
app.post('/api/alumnos', verificarToken, (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, grupoId } = req.body;
    const maestroId = req.maestro.id;

    const checkSql = 'SELECT * FROM Grupos WHERE id = ? AND maestro_id = ?';
    db.query(checkSql, [grupoId, maestroId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ message: 'Acceso denegado. El grupo no es suyo.' });
        }

        const insertSql = 'INSERT INTO Alumnos (nombre, apellidoPaterno, apellidoMaterno, grupo_id) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [nombre, apellidoPaterno, apellidoMaterno, grupoId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error al agregar el alumno.' });
            }
            res.status(201).json({ message: 'Alumno agregado exitosamente.', id: result.insertId });
        });
    });
});

// Ruta para pasar lista
app.post('/api/asistencia', verificarToken, (req, res) => {
    const { asistencias } = req.body;
    
    if (!asistencias || asistencias.length === 0) {
        return res.status(400).json({ message: 'No se proporcionaron datos de asistencia.' });
    }

    const values = asistencias.map(a => [a.alumnoId, new Date(), a.asistio]);
    const sql = 'INSERT INTO Asistencia (alumno_id, fecha, presente) VALUES ?';

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error('Error al registrar asistencia:', err);
            return res.status(500).json({ message: 'Error al registrar la asistencia.' });
        }
        res.status(201).json({ message: 'Asistencia registrada exitosamente.' });
    });
});

// Ruta para ver el historial de asistencia de un grupo
app.get('/api/historial/:grupoId', verificarToken, (req, res) => {
    const grupoId = req.params.grupoId;
    const query = `
        SELECT
            al.nombre as alumno_nombre,
            al.apellidoPaterno,
            al.apellidoMaterno,
            DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha,
            a.presente as presente,
            a.id as asistencia_id,
            a.justificante
        FROM
            alumnos al
        INNER JOIN
            grupos g ON al.grupo_id = g.id
        LEFT JOIN
            asistencia a ON al.id = a.alumno_id
        WHERE
            g.id = ?
        ORDER BY
            a.fecha DESC, al.nombre;
    `;
    db.query(query, [grupoId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor al obtener el historial.' });
        }
        res.status(200).json(results);
    });
});

// Ruta para eliminar un registro de asistencia
app.delete('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
    const asistenciaId = req.params.asistenciaId;
    const sql = 'DELETE FROM Asistencia WHERE id = ?';
    db.query(sql, [asistenciaId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al eliminar el registro.' });
        }
        res.status(200).json({ message: 'Registro eliminado exitosamente.' });
    });
});

// Ruta para actualizar un registro de asistencia con justificación
app.put('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
    const asistenciaId = req.params.asistenciaId;
    const { presente, justificante } = req.body;
    const sql = 'UPDATE Asistencia SET presente = ?, justificante = ? WHERE id = ?';
    db.query(sql, [presente, justificante, asistenciaId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al actualizar el registro.' });
        }
        res.status(200).json({ message: 'Registro actualizado exitosamente.' });
    });
});

// Ruta para eliminar un alumno
app.delete('/api/alumnos/:alumnoId', verificarToken, (req, res) => {
    const alumnoId = req.params.alumnoId;
    const sql = 'DELETE FROM Alumnos WHERE id = ?';
    db.query(sql, [alumnoId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al eliminar el alumno.' });
        }
        res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
    });
});

// Ruta para eliminar un grupo
app.delete('/api/grupos/:grupoId', verificarToken, (req, res) => {
    const grupoId = req.params.grupoId;
    const maestroId = req.maestro.id;

    // 1. Eliminar asistencias de los alumnos del grupo
    const sqlDeleteAsistencias = 'DELETE A FROM Asistencia A INNER JOIN Alumnos Al ON A.alumno_id = Al.id WHERE Al.grupo_id = ?';
    db.query(sqlDeleteAsistencias, [grupoId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error al eliminar asistencias.' });
        }

        // 2. Eliminar los alumnos del grupo
        const sqlDeleteAlumnos = 'DELETE FROM Alumnos WHERE grupo_id = ?';
        db.query(sqlDeleteAlumnos, [grupoId], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error al eliminar alumnos.' });
            }

            // 3. Eliminar el grupo
            const sqlDeleteGrupo = 'DELETE FROM Grupos WHERE id = ? AND maestro_id = ?';
            db.query(sqlDeleteGrupo, [grupoId, maestroId], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Error al eliminar el grupo.' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Grupo no encontrado o no autorizado.' });
                }
                res.status(200).json({ message: 'Grupo eliminado exitosamente.' });
            });
        });
    });
});

// Ruta para obtener reportes de asistencia por grupo
app.get('/api/reporte/:grupoId', verificarToken, (req, res) => {
    const grupoId = req.params.grupoId;
    const query = `
        SELECT
            al.nombre as alumno_nombre,
            al.apellidoPaterno,
            al.apellidoMaterno,
            DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha,
            a.presente
        FROM
            alumnos al
        INNER JOIN
            grupos g ON al.grupo_id = g.id
        LEFT JOIN
            asistencia a ON al.id = a.alumno_id
        WHERE
            al.grupo_id = ?
        ORDER BY
            al.apellidoPaterno, al.apellidoMaterno, al.nombre, a.fecha;
    `;
    db.query(query, [grupoId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor al generar el reporte.' });
        }
        
        const alumnosUnicos = [...new Set(results.map(r => r.apellidoPaterno + ' ' + r.apellidoMaterno + ', ' + r.nombre))];
        const fechasUnicas = [...new Set(results.map(r => r.fecha))].sort();

        const reporteEnTabla = [];
        
        const headers = ['Alumno', ...fechasUnicas, 'Calificación'];
        reporteEnTabla.push(headers);
        
        alumnosUnicos.forEach(alumno => {
            const filaAlumno = [alumno];
            fechasUnicas.forEach(fecha => {
                const asistencia = results.find(r => (r.apellidoPaterno + ' ' + r.apellidoMaterno + ', ' + r.nombre) === alumno && r.fecha === fecha);
                filaAlumno.push(asistencia ? (asistencia.presente ? '✔' : '❌') : ' ');
            });
            filaAlumno.push(''); 
            reporteEnTabla.push(filaAlumno);
        });

        const bom = '\ufeff'; 

        stringify(reporteEnTabla, (err, csvString) => {
            if (err) {
                return res.status(500).json({ message: 'Error al generar el archivo CSV.' });
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_grupo_${grupoId}.csv`);
            res.send(bom + csvString);
        });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});