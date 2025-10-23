    // Importar Pool en lugar de Client
    const { Pool } = require('pg');

    const dbUrl = process.env.DATABASE_URL;

    const connectionConfig = dbUrl
        ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
        : { /* Config local - no se usará en Render */ };

    // Crear una instancia del Pool
    const pool = new Pool(connectionConfig);

    pool.on('connect', () => {
        console.log('Pool PostgreSQL conectado.'); // Mensaje simple
    });
    pool.on('error', (err) => {
        console.error('!!!!!!!! ERROR EN POOL POSTGRESQL !!!!!!!!', err);
    });