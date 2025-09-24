document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const contrasena = document.getElementById('contrasena').value;
    const mensajeDiv = document.getElementById('mensaje');
    
    mensajeDiv.textContent = '';
    mensajeDiv.style.color = 'black';

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            // Guarda el token en el almacenamiento local del navegador
            localStorage.setItem('token', data.token);
            mensajeDiv.textContent = data.message;
            mensajeDiv.style.color = 'green';
            // Redireccionar al dashboard
            window.location.href = 'dashboard.html'; 
        } else {
            mensajeDiv.textContent = data.message || 'Error en el inicio de sesión';
            mensajeDiv.style.color = 'red';
        }

    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.style.color = 'red';
        console.error('Error:', error);
    }
});