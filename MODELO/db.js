// Importar Pool en lugar de Client
const { Pool } = require('pg');
console.log("db.js: Cargando módulo pg..."); // Log inicial

// La URL de la base de datos se leerá de una variable de entorno
const dbUrl = process.env.DATABASE_URL;
console.log("db.js: DATABASE_URL:", dbUrl ? "Encontrada" : "NO ENCONTRADA");

// Configuración de la conexión para el Pool
let connectionConfig;
if (dbUrl) {
    connectionConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
    console.log("db.js: Usando config de Render/Railway con SSL.");
} else {
    // Config local (no se usará en deploy)
    connectionConfig = { host: 'localhost', user: 'postgres', password: 'tu_password_local', database: 'sitios_maestros', port: 5432 };
    console.log("db.js: Usando config local.");
}

// Crear una instancia del Pool
let pool;
try {
    pool = new Pool(connectionConfig);
    console.log("db.js: Instancia de Pool CREADA.");
    // Verificar si tiene query AHORA MISMO
    console.log("db.js: ¿Pool tiene query al crearse?", typeof pool.query === 'function');

    pool.on('error', (err) => {
        console.error('!!!!!!!! ERROR EN POOL POSTGRESQL !!!!!!!!', err);
    });

} catch (error) {
    console.error("!!!!!!!! ERROR CRÍTICO AL CREAR POOL EN db.js !!!!!!!!");
    console.error(error);
    throw error; // Detener si falla la creación del Pool
}