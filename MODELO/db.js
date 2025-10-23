    console.log("db.js: Iniciando carga del módulo..."); // <-- Log inicial

    try {
        // Importar Pool en lugar de Client
        const { Pool } = require('pg');
        console.log("db.js: Módulo 'pg' (Pool) importado correctamente."); // <-- Log después de require

        // La URL de la base de datos se leerá de una variable de entorno en Render
        const dbUrl = process.env.DATABASE_URL;
        console.log("db.js: DATABASE_URL leída:", dbUrl ? "Encontrada" : "NO ENCONTRADA"); // <-- Log de URL

        // Configuración de la conexión para el Pool
        let connectionConfig;
        if (dbUrl) {
             connectionConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
             console.log("db.js: Usando configuración de Render (SSL).");
        } else {
            // Configuración local (ejemplo) - No debería usarse en Render
             connectionConfig = { host: 'localhost', user: 'postgres', password: 'tu_password_local', database: 'sitios_maestros', port: 5432 };
             console.log("db.js: Usando configuración local (¡Esto NO debería pasar en Render!).");
        }
        console.log("db.js: Configuración de conexión creada."); // <-- Log config creada

        // Crear una instancia del Pool DENTRO de un try-catch
        let pool;
        try {
            pool = new Pool(connectionConfig);
            console.log("db.js: Instancia del Pool creada con éxito."); // <-- Log Pool creado

            pool.on('connect', (client) => {
                console.log('*** Pool de PostgreSQL: Cliente conectado ***');
            });
            pool.on('error', (err, client) => {
                console.error('!!!!!!!! ERROR INESPERADO EN EL POOL !!!!!!!!', err);
            });
            console.log("db.js: Listeners de eventos añadidos al pool."); // <-- Log listeners

            console.log("db.js: Exportando el pool..."); // <-- Log antes de exportar
            module.exports = pool;
            console.log("db.js: Módulo exportado con éxito."); // <-- Log después de exportar

        } catch (poolError) {
            console.error("!!!!!!!! ERROR CRÍTICO AL CREAR EL POOL !!!!!!!!");
            console.error(poolError);
            throw poolError; // Detener si falla la creación del Pool
        }

    } catch (requireOrConfigError) {
        console.error("!!!!!!!! ERROR CRÍTICO AL IMPORTAR 'pg' o CREAR CONFIG !!!!!!!!");
        console.error(requireOrConfigError);
        throw requireOrConfigError; // Detener si falla el require o la config inicial
    }