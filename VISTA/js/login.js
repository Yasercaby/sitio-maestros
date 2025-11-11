// --- Conectado al nuevo HTML: 'login-form' y 'mensaje-login' ---

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    // Apunta al nuevo ID del párrafo de mensaje
    const mensajeDiv = document.getElementById('mensaje-login'); 
    
    // Ocultar y limpiar mensajes anteriores
    mensajeDiv.textContent = '';
    mensajeDiv.style.display = 'none';
    mensajeDiv.className = 'mensaje'; // Resetea la clase (quita el rojo)

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            // ¡Éxito! Guardar token y redirigir (no necesitamos mensaje verde)
            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard'; 
        } else {
            // Error: Mostrar mensaje usando las nuevas clases CSS
            mensajeDiv.textContent = data.message || 'Error en el inicio de sesión';
            mensajeDiv.className = 'mensaje red'; // Añade la clase 'red'
            mensajeDiv.style.display = 'block'; // Muestra el mensaje
        }

    } catch (error) {
        // Error de conexión: Mostrar mensaje usando las nuevas clases CSS
        mensajeDiv.textContent = 'Error al conectar con el servidor.';
        mensajeDiv.className = 'mensaje red'; // Añade la clase 'red'
        mensajeDiv.style.display = 'block'; // Muestra el mensaje
        console.error('Error:', error);
    }
});