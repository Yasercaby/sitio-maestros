// MODELO/db.js (Versión corregida y mejorada)

const mysql = require('mysql');
console.log("--- db.js (MySQL Local): Cargando módulo mysql ---");

// Configuración para tu base de datos MySQL local en XAMPP
const poolConfig = {
    connectionLimit: 10, // Número de conexiones que el pool puede manejar
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sitio_maestros' // <--- ¡AQUÍ ESTÁ EL ERROR!
    // Reemplaza 'TU_BASE_DE_DATOS_CORRECTA' con el nombre que ves en phpMyAdmin.
};

// Crear un "Pool" de conexiones en lugar de una sola conexión
// Un Pool es más robusto: maneja reconexiones y conexiones múltiples
const pool = mysql.createPool(poolConfig);

// Intentamos hacer una consulta simple para verificar que todo funciona
// pool.query maneja la conexión y la liberación automáticamente
pool.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('!!!!!!!! ERROR AL CONECTAR A MYSQL LOCAL !!!!!!!!');
        console.error('Verifica que XAMPP/MySQL estén activos y el nombre de la DB sea correcto.');
        console.error('Error:', err.code);
        // No salimos del proceso, solo mostramos el error.
        // El pool intentará reconectar en la siguiente consulta.
    } else {
        console.log('--- db.js (MySQL Local): Conexión al Pool de MySQL exitosa ---');
    }
});

// Exportamos el pool. Ahora, en lugar de connection.query(), usarás pool.query()
console.log("--- db.js (MySQL Local): Exportando POOL de conexión... ---");
module.exports = pool;