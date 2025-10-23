    console.log("db.js (Simplificado): Cargando módulo...");
    const { Pool } = require('pg');
    console.log("db.js (Simplificado): Módulo 'pg' importado.");

    const dbUrl = process.env.DATABASE_URL;
    console.log("db.js (Simplificado): DATABASE_URL leída:", dbUrl ? "OK" : "NO ENCONTRADA");

    let pool;
    try {
        const connectionConfig = dbUrl
            ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
            : { /* Config local - no se usará en Render */ };
        
        pool = new Pool(connectionConfig);
        console.log("db.js (Simplificado): Pool creado con éxito.");
        
        // ¡Importante! Añadimos una verificación explícita de la función query
        console.log("db.js (Simplificado): ¿El pool creado tiene el método query?", typeof pool.query === 'function'); 

    } catch (error) {
        console.error("!!!!!!!! ERROR CRÍTICO EN db.js !!!!!!!!");
        console.error(error);
        throw error; // Detener la aplicación si falla aquí
    }

    console.log("db.js (Simplificado): Exportando el pool...");
    module.exports = pool;
    console.log("db.js (Simplificado): Módulo exportado.");