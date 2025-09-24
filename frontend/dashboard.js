let dashboardData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
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
            dashboardData = await response.json();
            mostrarGrupos(dashboardData.grupos);
        } else {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error de conexión con el servidor:', error);
    }
});

function mostrarGrupos(grupos) {
    const gruposContainer = document.querySelector('.grupos-container');
    const mensajeGrupos = document.getElementById('mensaje-grupos');

    if (grupos.length > 0) {
        mensajeGrupos.style.display = 'none';
        gruposContainer.innerHTML = '';
        grupos.forEach(grupo => {
            const grupoCard = document.createElement('div');
            grupoCard.className = 'grupo-card';
            grupoCard.innerHTML = `<h2>${grupo.nombre}</h2><p>ID: ${grupo.id}</p>`;

            const accionesDiv = document.createElement('div');
            accionesDiv.className = 'acciones-grupo';

            // Botón para ir a la página de Historial
            const historialBtn = document.createElement('a');
            historialBtn.href = `historial.html?grupoId=${grupo.id}`;
            historialBtn.className = 'button';
            historialBtn.textContent = 'Historial';
            accionesDiv.appendChild(historialBtn);
            
            // Botón para ir a la página de Pasar Lista
            const paseListaBtn = document.createElement('a');
            paseListaBtn.href = `asistencia.html?grupoId=${grupo.id}`;
            paseListaBtn.className = 'button';
            paseListaBtn.textContent = 'Pasar Lista';
            accionesDiv.appendChild(paseListaBtn);

            // Botón para gestionar alumnos
            const gestionarBtn = document.createElement('a');
            gestionarBtn.href = `gestion.html?grupoId=${grupo.id}`;
            gestionarBtn.className = 'button';
            gestionarBtn.textContent = 'Gestionar Alumnos';
            accionesDiv.appendChild(gestionarBtn);

            // Botón para eliminar grupo
            const eliminarGrupoBtn = document.createElement('button');
            eliminarGrupoBtn.className = 'button btn-eliminar-grupo';
            eliminarGrupoBtn.textContent = 'Eliminar Grupo';
            eliminarGrupoBtn.dataset.id = grupo.id;
            accionesDiv.appendChild(eliminarGrupoBtn);

            grupoCard.appendChild(accionesDiv);
            gruposContainer.appendChild(grupoCard);
        });
    } else {
        mensajeGrupos.style.display = 'block';
    }
}

// Lógica para crear grupo
document.getElementById('crearGrupoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('grupo-nombre').value;
    const token = localStorage.getItem('token');
    const mensajeDiv = document.getElementById('mensaje-dashboard');

    try {
        const response = await fetch('http://localhost:3000/api/grupos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ nombre })
        });
        const data = await response.json();
        if (response.ok) {
            mensajeDiv.textContent = data.message;
            mensajeDiv.style.color = 'green';
            location.reload();
        } else {
            mensajeDiv.textContent = data.message || 'Error al crear el grupo.';
            mensajeDiv.style.color = 'red';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión.';
        mensajeDiv.style.color = 'red';
    }
});

// Lógica para agregar alumno
document.getElementById('agregarAlumnoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-alumno').value;
    const apellidoPaterno = document.getElementById('apellido-paterno').value;
    const apellidoMaterno = document.getElementById('apellido-materno').value;
    const grupoId = document.getElementById('alumno-grupo-id').value;
    const token = localStorage.getItem('token');
    const mensajeDiv = document.getElementById('mensaje-dashboard');
    
    try {
        const response = await fetch('http://localhost:3000/api/alumnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ nombre, apellidoPaterno, apellidoMaterno, grupoId: parseInt(grupoId) })
        });
        const data = await response.json();
        if (response.ok) {
            mensajeDiv.textContent = data.message;
            mensajeDiv.style.color = 'green';
            location.reload();
        } else {
            mensajeDiv.textContent = data.message || 'Error al agregar el alumno.';
            mensajeDiv.style.color = 'red';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión.';
        mensajeDiv.style.color = 'red';
    }
});

// Lógica para cerrar sesión
document.getElementById('cerrarSesion').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// Listener global para botones de borrar y ver alumnos
document.addEventListener('click', async (e) => {
    // Lógica para borrar alumno
    if (e.target.classList.contains('btn-borrar-alumno')) {
        const alumnoId = e.target.dataset.id;
        if (confirm('¿Estás seguro de que quieres borrar este alumno?')) {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3000/api/alumnos/${alumnoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            location.reload();
        }
    }
    // Lógica para ver/ocultar alumnos
    if (e.target.classList.contains('btn-toggle')) {
        const grupoId = e.target.dataset.grupoId;
        const alumnosContainer = document.querySelector(`.alumnos-ocultos[data-grupo-id="${grupoId}"]`);
        if (alumnosContainer.style.display === 'block') {
            alumnosContainer.style.display = 'none';
            e.target.textContent = 'Ver Alumnos';
        } else {
            alumnosContainer.style.display = 'block';
            e.target.textContent = 'Ocultar Alumnos';
        }
    }
    // Lógica para eliminar grupo
    if (e.target.classList.contains('btn-eliminar-grupo')) {
        const grupoId = e.target.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar este grupo y todos sus alumnos y asistencias? Esta acción es irreversible.')) {
            const token = localStorage.getItem('token');
            const mensajeDiv = document.getElementById('mensaje-dashboard');
            
            try {
                const response = await fetch(`http://localhost:3000/api/grupos/${grupoId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': token }
                });
                const data = await response.json();
                if (response.ok) {
                    mensajeDiv.textContent = data.message;
                    mensajeDiv.style.color = 'green';
                    location.reload();
                } else {
                    mensajeDiv.textContent = data.message || 'Error al eliminar el grupo.';
                    mensajeDiv.style.color = 'red';
                }
            } catch (error) {
                mensajeDiv.textContent = 'Error de conexión.';
                mensajeDiv.style.color = 'red';
            }
        }
    }
});