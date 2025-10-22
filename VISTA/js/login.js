// El único listener que necesita esta página es el del formulario.
// NO debe haber ningún código que se ejecute al cargar la página (no "DOMContentLoaded").

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensajeDiv = document.getElementById('mensaje');
    
    mensajeDiv.textContent = '';
    mensajeDiv.style.color = 'black';

    try {
        // Usar una ruta relativa para la API.
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            // Si el login es exitoso, guardar token y redirigir al dashboard.
            localStorage.setItem('token', data.token);
            mensajeDiv.textContent = 'Iniciando sesión...';
            mensajeDiv.style.color = 'green';
            
            // Redirigir a la RUTA '/dashboard'.
            window.location.href = '/dashboard'; 
        } else {
            mensajeDiv.textContent = data.message || 'Error en el inicio de sesión';
            mensajeDiv.style.color = 'red';
        }

    } catch (error) {
        mensajeDiv.textContent = 'Error al conectar con el servidor.';
        mensajeDiv.style.color = 'red';
        console.error('Error:', error);
    }
});

