// Importar el conector de PostgreSQL
const { Client } = require('pg');

// La URL de la base de datos se leerá de una variable de entorno en Render
const dbUrl = process.env.DATABASE_URL;

// Configuración de la conexión.
// Si estamos en Render (dbUrl existe), usa esa URL con SSL.
// Si no (estamos en local), usa una configuración local (debes tener PostgreSQL instalado localmente para probar).
const connectionConfig = dbUrl
    ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
    : { // Ejemplo de configuración local (ajusta según tu instalación)
        host: 'localhost',
        user: 'postgres',
        password: 'tu_password_local', // Cambia esto
        database: 'sitio_maestros',
        port: 5432
    };

// Crear una instancia del cliente de PostgreSQL
const client = new Client(connectionConfig);

// Conectar a la base de datos
client.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos PostgreSQL: ', err.stack);
        // En producción, es importante manejar este error, quizás intentar reconectar o salir.
        return;
    }
    console.log('Conexión exitosa a la base de datos PostgreSQL.');
});