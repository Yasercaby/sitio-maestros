// PEGAR ESTO AL INICIO DE CADA ARCHIVO JS (asistencia.js, etc.)
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login'; // Lo manda al login si no hay token
        return; // Detiene la carga del resto del script
    }

    // Aquí va el resto de tu código original de ese archivo...
    // Por ejemplo, la función para cargar las asistencias, etc.


document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensajeDiv = document.getElementById('mensaje');
    
    // Ocultar mensaje anterior
    mensajeDiv.textContent = '';
    mensajeDiv.style.color = 'black';

    try {
        const response = await fetch('http://localhost:3000/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre, email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            mensajeDiv.textContent = data.message;
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
});