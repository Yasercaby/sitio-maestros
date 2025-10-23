console.log("db.js: Cargando el módulo..."); // <-- Espía 1

// Importar Pool en lugar de Client
const { Pool } = require('pg');

// La URL de la base de datos se leerá de una variable de entorno en Render
const dbUrl = process.env.DATABASE_URL;
console.log("db.js: DATABASE_URL leída:", dbUrl ? "Encontrada" : "NO ENCONTRADA - ¿Está configurada en Render?"); // <-- Espía 2

// Configuración de la conexión para el Pool
let connectionConfig;
try {
    connectionConfig = dbUrl
        ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } } // Render necesita SSL
        : { // Configuración local (ejemplo)
            host: 'localhost',
            user: 'postgres',
            password: 'tu_password_local', // Cambia esto si usas local
            database: 'sitios_maestros',
            port: 5432
        };
    console.log("db.js: Configuración de conexión creada:", connectionConfig.connectionString ? "Usando URL de Render" : "Usando config local"); // <-- Espía 3
} catch (configError) {
    console.error("!!!!!!!! ERROR CRÍTICO AL CREAR connectionConfig !!!!!!!!");
    console.error(configError);
    throw configError; // Lanzar el error para detener la aplicación si falla aquí
}


// Crear una instancia del Pool DENTRO de un try-catch
let pool;
try {
    pool = new Pool(connectionConfig);
    console.log("db.js: Instancia del Pool creada con éxito."); // <-- Espía 4

    // Evento para verificar si el pool se conecta bien (opcional pero útil)
    // Se conectará la primera vez que se use .query()
    pool.on('connect', (client) => {
        console.log('*** Pool de PostgreSQL: Un cliente se ha conectado ***');
    });

    // Evento para errores en el pool (importante para depurar)
    pool.on('error', (err, client) => {
        console.error('!!!!!!!! ERROR INESPERADO EN EL POOL DE POSTGRESQL !!!!!!!!');
        console.error(err);
        // Considera qué hacer aquí. Salir puede ser drástico si es un error temporal.
        // process.exit(-1);
    });

    console.log("db.js: Listeners de eventos 'connect' y 'error' añadidos al pool."); // <-- Espía 5

} catch (poolError) {
    console.error("!!!!!!!! ERROR CRÍTICO AL CREAR EL POOL DE POSTGRESQL !!!!!!!!");
    console.error(poolError);
    throw poolError; // Lanzar el error para detener la aplicación si falla aquí
}

// Exportar el pool. Ahora server.js usará pool.query()
console.log("db.js: Exportando el pool..."); // <-- Espía 6
module.exports = pool;
console.log("db.js: Módulo exportado."); // <-- Espía 7
