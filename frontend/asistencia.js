document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = parseInt(urlParams.get('grupoId'));
    if (!grupoId) {
        document.getElementById('mensaje-asistencia').textContent = 'ID de grupo no encontrado.';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': token,
            }
        });

        if (response.ok) {
            const data = await response.json();
            const grupo = data.grupos.find(g => g.id === grupoId);
            if (grupo) {
                document.getElementById('nombre-grupo').textContent = `Pase de Lista del Grupo: ${grupo.nombre}`;
                
                const hoy = new Date();
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
                document.getElementById('fecha-actual').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
                
                const alumnosLista = document.getElementById('alumnos-lista-asistencia');
                if (grupo.alumnos.length > 0) {
                    alumnosLista.innerHTML = grupo.alumnos.map((alumno, index) => `
                        <div class="alumno-item">
                            <label>${index + 1}. ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</label>
                            <input type="checkbox" name="asistio" value="${alumno.id}" checked>
                        </div>
                    `).join('');
                } else {
                    alumnosLista.innerHTML = '<p>No hay alumnos en este grupo.</p>';
                }
            } else {
                document.getElementById('mensaje-asistencia').textContent = 'Grupo no encontrado.';
            }
        } else {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    } catch (error) {
        document.getElementById('mensaje-asistencia').textContent = 'Error de conexión con el servidor.';
        console.error('Error:', error);
    }
});

document.getElementById('asistenciaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const asistencias = Array.from(e.target.elements.asistio).map(checkbox => ({
        alumnoId: parseInt(checkbox.value),
        asistio: checkbox.checked ? 1 : 0
    }));

    const token = localStorage.getItem('token');
    const mensajeDiv = document.getElementById('mensaje-asistencia');

    try {
        const response = await fetch('http://localhost:3000/api/asistencia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ asistencias })
        });

        const responseData = await response.json();
        if (response.ok) {
            mensajeDiv.textContent = responseData.message;
            mensajeDiv.style.color = 'green';
        } else {
            mensajeDiv.textContent = responseData.message || 'Error al registrar la asistencia.';
            mensajeDiv.style.color = 'red';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.style.color = 'red';
    }
});

document.getElementById('cerrarSesion').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});