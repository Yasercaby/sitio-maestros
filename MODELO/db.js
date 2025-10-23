// Importar Pool en lugar de Client
const { Pool } = require('pg');

// La URL de la base de datos se leerá de una variable de entorno en Render
const dbUrl = process.env.DATABASE_URL;

// Configuración de la conexión para el Pool
const connectionConfig = dbUrl
    ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } } // Render necesita SSL
    : { // Configuración local (ejemplo)
        host: 'localhost',
        user: 'postgres',
        password: 'tu_password_local', // Cambia esto si usas local
        database: 'sitios_maestros',
        port: 5432
    };

// Crear una instancia del Pool
const pool = new Pool(connectionConfig);

// Evento para verificar si el pool se conecta bien (opcional pero útil)
pool.on('connect', () => {
    console.log('Pool de conexiones PostgreSQL conectado exitosamente.');
});

// Evento para errores en el pool (importante para depurar)
pool.on('error', (err, client) => {
    console.error('Error inesperado en el pool de PostgreSQL', err);
    // process.exit(-1); // Considera salir si hay un error grave en el pool
});
