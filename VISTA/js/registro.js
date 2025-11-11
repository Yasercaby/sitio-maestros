// --- Conectado al nuevo HTML: 'registro-form' y 'mensaje-registro' ---

document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    // Apunta al nuevo ID del párrafo de mensaje
    const mensajeDiv = document.getElementById('mensaje-registro');

    // Ocultar y limpiar mensajes anteriores
    mensajeDiv.textContent = '';
    mensajeDiv.style.display = 'none';
    mensajeDiv.className = 'mensaje'; // Resetea la clase

    try {
        const response = await fetch('/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre, email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            // Éxito: Mostrar mensaje verde
            mensajeDiv.textContent = data.message || '¡Registro exitoso! Ahora puedes iniciar sesión.';
            mensajeDiv.className = 'mensaje green'; // Añade la clase 'green'
            mensajeDiv.style.display = 'block'; // Muestra el mensaje
            
            // Limpiar el formulario
            document.getElementById('registro-form').reset();

        } else {
            // Error: Mostrar mensaje rojo
            mensajeDiv.textContent = data.message || 'Error en el registro';
            mensajeDiv.className = 'mensaje red'; // Añade la clase 'red'
            mensajeDiv.style.display = 'block'; // Muestra el mensaje
        }

    } catch (error) {
        // Error de conexión: Mostrar mensaje rojo
        mensajeDiv.textContent = 'Error al conectar con el servidor.';
        mensajeDiv.className = 'mensaje red'; // Añade la clase 'red'
        mensajeDiv.style.display = 'block'; // Muestra el mensaje
        console.error('Error:', error);
    }
});