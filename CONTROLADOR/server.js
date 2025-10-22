const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Worker } = require('worker_threads');

const db = require('../MODELO/db.js');

const app = express();
const port = 3000;
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

// --- Rutas de la API (Completas y Restauradas) ---

app.post('/api/registro', (req, res) => {
    const { nombre, email, contrasena } = req.body;
    const hash = bcrypt.hashSync(contrasena, 10);
    const sql = 'INSERT INTO Maestros (nombre, email, contrasena) VALUES (?, ?, ?)';
    db.query(sql, [nombre, email, hash], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor.' });
        res.status(201).json({ message: 'Maestro registrado exitosamente.' });
    });
});

app.post('/api/login', (req, res) => {
    const { email, contrasena } = req.body;
    const sql = 'SELECT * FROM Maestros WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0 || !bcrypt.compareSync(contrasena, results[0].contrasena)) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }
        const maestro = results[0];
        const token = jwt.sign({ id: maestro.id, email: maestro.email }, secretKey, { expiresIn: '1h' });
        res.status(200).json({ token });
    });
});

app.get('/api/dashboard', verificarToken, (req, res) => {
    const maestroId = req.maestro.id;
    const sql = `
        SELECT g.id AS grupo_id, g.nombre AS grupo_nombre, 
               a.id AS alumno_id, a.nombre AS alumno_nombre, a.apellidoPaterno, a.apellidoMaterno
        FROM Grupos g LEFT JOIN Alumnos a ON g.id = a.grupo_id
        WHERE g.maestro_id = ? ORDER BY g.id, a.apellidoPaterno`;
    db.query(sql, [maestroId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los datos.' });
        const grupos = results.reduce((acc, row) => {
            acc[row.grupo_id] = acc[row.grupo_id] || { id: row.grupo_id, nombre: row.grupo_nombre, alumnos: [] };
            if (row.alumno_id) acc[row.grupo_id].alumnos.push({
                id: row.alumno_id, nombre: row.alumno_nombre,
                apellidoPaterno: row.apellidoPaterno, apellidoMaterno: row.apellidoMaterno
            });
            return acc;
        }, {});
        res.status(200).json({ grupos: Object.values(grupos) });
    });
});

app.post('/api/grupos', verificarToken, (req, res) => {
    const { nombre } = req.body;
    const maestroId = req.maestro.id;
    const sql = 'INSERT INTO Grupos (nombre, maestro_id) VALUES (?, ?)';
    db.query(sql, [nombre, maestroId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al agregar el grupo.' });
        res.status(201).json({ message: 'Grupo creado exitosamente.', id: result.insertId });
    });
});

app.delete('/api/grupos/:grupoId', verificarToken, (req, res) => {
    const { grupoId } = req.params;
    const maestroId = req.maestro.id;
    // Lógica para borrar en cascada (asistencias, alumnos, grupo)
    db.query('DELETE FROM Asistencia WHERE alumno_id IN (SELECT id FROM Alumnos WHERE grupo_id = ?)', [grupoId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar asistencias.' });
        db.query('DELETE FROM Alumnos WHERE grupo_id = ?', [grupoId], (err) => {
            if (err) return res.status(500).json({ message: 'Error al eliminar alumnos.' });
            db.query('DELETE FROM Grupos WHERE id = ? AND maestro_id = ?', [grupoId, maestroId], (err, result) => {
                if (err) return res.status(500).json({ message: 'Error al eliminar el grupo.' });
                res.status(200).json({ message: 'Grupo eliminado exitosamente.' });
            });
        });
    });
});

app.post('/api/alumnos', verificarToken, (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, grupoId } = req.body;
    const sql = 'INSERT INTO Alumnos (nombre, apellidoPaterno, apellidoMaterno, grupo_id) VALUES (?, ?, ?, ?)';
    db.query(sql, [nombre, apellidoPaterno, apellidoMaterno, grupoId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al agregar el alumno.' });
        res.status(201).json({ message: 'Alumno agregado exitosamente.', id: result.insertId });
    });
});

app.delete('/api/alumnos/:alumnoId', verificarToken, (req, res) => {
    const { alumnoId } = req.params;
    db.query('DELETE FROM Alumnos WHERE id = ?', [alumnoId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar alumno.' });
        res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
    });
});

app.post('/api/asistencia', verificarToken, (req, res) => {
    const asistencias = req.body.map(a => [a.alumnoId, new Date(), a.asistio]);
    const sql = 'INSERT INTO Asistencia (alumno_id, fecha, presente) VALUES ?';
    db.query(sql, [asistencias], (err) => {
        if (err) return res.status(500).json({ message: 'Error al registrar la asistencia.' });
        res.status(201).json({ message: 'Asistencia registrada exitosamente.' });
    });
});

app.put('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
    const { asistenciaId } = req.params;
    const { presente, justificante } = req.body;
    const sql = 'UPDATE Asistencia SET presente = ?, justificante = ? WHERE id = ?';
    db.query(sql, [presente, justificante, asistenciaId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al actualizar el registro.' });
        res.status(200).json({ message: 'Registro actualizado exitosamente.' });
    });
});

app.delete('/api/asistencia/:asistenciaId', verificarToken, (req, res) => {
    const { asistenciaId } = req.params;
    const sql = 'DELETE FROM Asistencia WHERE id = ?';
    db.query(sql, [asistenciaId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el registro.' });
        res.status(200).json({ message: 'Registro eliminado exitosamente.' });
    });
});

app.get('/api/calificaciones/:grupoId', verificarToken, (req, res) => {
    const { grupoId } = req.params;
    db.query('SELECT alumno_id, unidad, calificacion FROM Calificaciones WHERE grupo_id = ?', [grupoId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener calificaciones.' });
        res.status(200).json(results);
    });
});

app.post('/api/calificaciones', verificarToken, (req, res) => {
    const values = req.body.map(c => [c.alumno_id, c.grupo_id, c.unidad, c.calificacion]);
    const sql = `INSERT INTO Calificaciones (alumno_id, grupo_id, unidad, calificacion) VALUES ? ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion)`;
    db.query(sql, [values], (err) => {
        if (err) return res.status(500).json({ message: 'Error al guardar las calificaciones.' });
        res.status(200).json({ message: 'Calificaciones guardadas y actualizadas con éxito.' });
    });
});

app.get('/api/promedio-final/:grupoId', verificarToken, (req, res) => {
    const { grupoId } = req.params;
    const query = `
        SELECT a.id, a.nombre, a.apellidoPaterno, a.apellidoMaterno, AVG(c.calificacion) as promedio_final
        FROM Alumnos a LEFT JOIN Calificaciones c ON a.id = c.alumno_id
        WHERE a.grupo_id = ?
        GROUP BY a.id`;
    db.query(query, [grupoId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al calcular el promedio final.' });
        res.status(200).json(results);
    });
});

app.get('/api/historial/:grupoId', verificarToken, (req, res) => {
    const { grupoId } = req.params;
    const maestroId = req.maestro.id;
    const query = `
        SELECT al.nombre as alumno_nombre, al.apellidoPaterno, al.apellidoMaterno,
               DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha,
               a.presente, a.id as asistencia_id, a.justificante
        FROM alumnos AS al
        INNER JOIN grupos AS g ON al.grupo_id = g.id
        LEFT JOIN asistencia AS a ON al.id = a.alumno_id
        WHERE g.id = ? AND g.maestro_id = ?
        ORDER BY a.fecha DESC, al.apellidoPaterno, al.nombre;`;
    db.query(query, [grupoId, maestroId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor al obtener el historial.' });
        res.status(200).json(results);
    });
});

// --- RUTA CATCH-ALL ---
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../VISTA/login.html'));
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});