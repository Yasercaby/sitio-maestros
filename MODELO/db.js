const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // El usuario por defecto en XAMPP es 'root'
    password: '', // La contraseña por defecto en XAMPP está vacía
    database: 'sitio_maestros' // El nombre de la base de datos que creaste
});

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conexión exitosa a la base de datos.');
});

module.exports = connection;