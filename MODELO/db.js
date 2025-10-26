// Importar Pool en lugar de Client
const { Pool } = require('pg');

// La URL de la base de datos se leerá de una variable de entorno
const dbUrl = process.env.DATABASE_URL;

// Configuración de la conexión para el Pool
const connectionConfig = dbUrl
    ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } } // Render/Railway necesitan SSL
    : { // Configuración local (ejemplo) - Ajusta si usas PostgreSQL local
        host: 'localhost',
        user: 'postgres',
        password: 'tu_password_local', // Cambia esto si tienes contraseña local
        database: 'sitios_maestros',
        port: 5432
    };

// Crear una instancia del Pool
const pool = new Pool(connectionConfig);

pool.on('connect', () => {
    console.log('Pool PostgreSQL conectado.'); // Mensaje simple para los logs
});
pool.on('error', (err) => {
    // Es importante registrar errores del pool en producción
    console.error('!!!!!!!! ERROR EN POOL POSTGRESQL !!!!!!!!', err);
});