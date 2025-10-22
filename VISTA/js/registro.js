// NO necesita el guardia de seguridad al principio.

// Solo necesita el listener para el formulario.
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensajeDiv = document.getElementById('mensaje');

    mensajeDiv.textContent = '';
    mensajeDiv.style.color = 'black';

    try {
        // CORRECCIÓN: Usar ruta relativa para la API
        const response = await fetch('/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre, email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            mensajeDiv.textContent = data.message + " Ahora puedes iniciar sesión."; // Mensaje mejorado
            mensajeDiv.style.color = 'green';
            document.getElementById('registroForm').reset(); // Limpia el formulario
        } else {
            mensajeDiv.textContent = data.message || 'Error en el registro';
            mensajeDiv.style.color = 'red';
        }

    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.style.color = 'red';
        console.error('Error:', error);
    }
});
