const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Worker } = require('worker_threads');

// Importar como dbPool para ser extra explícitos
const db = require('../MODELO/db.js'); // Importar el objeto exportado

const app = express();
const port = process.env.PORT || 3000;
const secretKey = 'tu_clave_secreta_aqui';

app.use(express.static(path.join(__dirname, '../VISTA')));
app.use(bodyParser.json());
app.use(cors());

// --- Middleware verificarToken (sin cambios) ---
const verificarToken = (req, res, next) => { /* ... código ... */ };

// --- RUTAS HTML (sin cambios) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../VISTA/login.html')));
// ... (resto rutas HTML) ...

// --- Rutas de la API (Usando 'dbPool') ---

app.post('/api/registro', async (req, res) => {
    const { nombre, email, contrasena } = req.body;
    try {
        // --- ESPÍA ---
        console.log("--- DEBUG REGISTRO ---");
        console.log("Intentando registrar:", { nombre, email });
        console.log("Tipo de dbPool:", typeof dbPool);
        console.log("Tiene dbPool el método query?", typeof db.pool.query === 'function');
        // --- FIN ESPÍA ---

        const hash = await bcrypt.hash(contrasena, 10);
        const sql = 'INSERT INTO maestros (nombre, email, contrasena) VALUES ($1, $2, $3)'; // Usar tabla 'maestros' (minúscula)

        // Usar db.pool.query
        await db.pool.query(sql, [nombre, email, hash]);

        console.log("Registro exitoso para:", email); // Log de éxito
        res.status(201).json({ message: 'Maestro registrado exitosamente.' });

    } catch (err) {
        console.error("--- ERROR DETALLADO EN REGISTRO ---");
        console.error("Error al intentar db.pool.query:", err); // Log del error exacto
        console.error("Stack del error:", err.stack); // Stack trace completo
        if (err.code === '23505') {
             return res.status(409).json({ message: 'El correo ya está registrado.' });
        }
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- (Resto de las rutas adaptadas para usar db.pool.query) ---
// Cambia TODAS las ocurrencias de pool.query o client.query a db.pool.query

app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;
    try {
        const sql = 'SELECT * FROM maestros WHERE email = $1'; // Usar tabla 'maestros'
        const result = await db.pool.query(sql, [email]); // Usar dbPool
        if (result.rows.length === 0) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        const maestro = result.rows[0];
        const match = await bcrypt.compare(contrasena, maestro.contrasena);
        if (!match) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        const token = jwt.sign({ id: maestro.id, email: maestro.email }, secretKey, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (err) { /* ... manejo de error ... */ }
});

// ... (Adapta TODAS las demás rutas API para usar db.pool.query) ...
// Ejemplo:
app.get('/api/dashboard', verificarToken, async (req, res) => {
    const maestroId = req.maestro.id;
    try {
        const sql = `SELECT ... FROM grupos g ... WHERE g.maestro_id = $1 ...`; // Usa tablas minúsculas
        const result = await db.pool.query(sql, [maestroId]); // Usa dbPool
        // ... procesar resultado ...
    } catch (err) { /* ... manejo de error ... */ }
});


// --- RUTA CATCH-ALL y listen (sin cambios) ---
app.use((req, res) => { /* ... */ });
app.listen(port, () => { /* ... */ });