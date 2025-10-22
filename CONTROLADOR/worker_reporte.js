// backend/worker_reporte.js

const { parentPort } = require('worker_threads');
const { stringify } = require('csv-stringify');
const db = require('./db');

// Escucha el mensaje del proceso principal (server.js)
parentPort.on('message', async (grupoId) => {
    try {
        const query = `
            SELECT
                a.id AS alumnoId,
                a.nombre,
                a.apellidoPaterno,
                a.apellidoMaterno,
                asistencias.fecha,
                asistencias.asistio
            FROM
                Alumnos a
            LEFT JOIN
                Asistencia asistencias ON a.id = asistencias.alumnoId
            WHERE
                a.grupoId = ?
            ORDER BY
                asistencias.fecha ASC;
        `;
        const [rows] = await db.query(query, [grupoId]);

        if (rows.length === 0) {
            parentPort.postMessage({ status: 'error', message: 'No hay datos de asistencia para este grupo.' });
            return;
        }

        const data = [
            ['ID Alumno', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Fecha', 'Asistió']
        ];
        rows.forEach(row => {
            data.push([
                row.alumnoId,
                row.nombre,
                row.apellidoPaterno,
                row.apellidoMaterno,
                row.fecha,
                row.asistio === 1 ? 'Sí' : 'No'
            ]);
        });

        stringify(data, (err, output) => {
            if (err) {
                parentPort.postMessage({ status: 'error', message: 'Error al generar el CSV.' });
                return;
            }
            // Envía los datos del reporte de vuelta al proceso principal
            parentPort.postMessage({ status: 'success', data: output });
        });

    } catch (error) {
        console.error('Error en worker_reporte:', error);
        parentPort.postMessage({ status: 'error', message: 'Error interno del servidor.' });
    }
});