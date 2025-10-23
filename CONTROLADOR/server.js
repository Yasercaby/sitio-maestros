    console.log("--- server.js (Minimal): INICIANDO EJECUCIÓN ---");

    try {
        const express = require('express');
        const path = require('path'); // Necesario para sendFile

        const app = express();
        const port = process.env.PORT || 3000;

        console.log("--- server.js (Minimal): Express importado. Configurando ruta simple...");

        // Una única ruta para probar
        app.get('/', (req, res) => {
            console.log("--- server.js (Minimal): Petición recibida en '/' ---");
            // Intentar enviar un HTML simple si existe, o solo texto
             try {
                 res.sendFile(path.join(__dirname, '../VISTA/login.html'));
             } catch(e) {
                 res.send('Servidor mínimo funcionando!');
             }
        });

        app.listen(port, () => {
            console.log(`--- server.js (Minimal): Servidor escuchando en puerto ${port} --- ¡ÉXITO SI VES ESTO!`);
        });

    } catch (initializationError) {
        console.error("!!!!!!!! ERROR CRÍTICO AL INICIAR server.js (Minimal) !!!!!!!!");
        console.error(initializationError);
        process.exit(1); // Salir si hay error
    }