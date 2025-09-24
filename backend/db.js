// backend/db.js
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'sitio_maestros' 
});

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conexión exitosa a la base de datos.');
});

module.exports = connection;