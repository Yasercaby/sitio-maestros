// Función auxiliar para mostrar la lista de alumnos
function mostrarAlumnosParaGestion(alumnos) {
    const listaContainer = document.getElementById('alumnos-gestion-lista');
    if (!listaContainer) return;

    if (alumnos.length > 0) {
        const listaHTML = alumnos.map((alumno, index) => `
            <div class="alumno-item">
                <span>${index + 1}. ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</span>
                <button class="button btn-borrar-alumno" data-id="${alumno.id}">Eliminar</button>
            </div>
        `).join('');
        listaContainer.innerHTML = listaHTML;
    } else {
        listaContainer.innerHTML = '<p>No hay alumnos en este grupo.</p>';
    }
}


// ---- Evento Principal que se ejecuta al cargar la página ----
document.addEventListener('DOMContentLoaded', async () => {

    // --- REGLA #1: EL GUARDIA DE SEGURIDAD ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = parseInt(urlParams.get('grupoId'));
    const mensajeDiv = document.getElementById('mensaje-gestion');

    if (!grupoId) {
        mensajeDiv.textContent = 'ID de grupo no encontrado en la URL.';
        return;
    }

    // --- Carga de Datos Iniciales ---
    try {
        // CORRECCIÓN CLAVE: Añadir el prefijo "Bearer " al token.
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const grupo = data.grupos.find(g => g.id === grupoId);
            if (grupo) {
                document.getElementById('nombre-grupo-gestion').textContent = `Gestión de Alumnos: ${grupo.nombre}`;
                mostrarAlumnosParaGestion(grupo.alumnos);
            } else {
                mensajeDiv.textContent = 'Grupo no encontrado.';
            }
        } else {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
    }

    // ---- Asignación de Eventos ----

    // Delegación de eventos para los botones de eliminar
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-borrar-alumno')) {
            const alumnoId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar a este alumno?')) {
                try {
                    // CORRECCIÓN CLAVE: Añadir el prefijo "Bearer " al token.
                    await fetch(`/api/alumnos/${alumnoId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    location.reload();
                } catch (error) {
                    mensajeDiv.textContent = 'Error de conexión al intentar eliminar.';
                    mensajeDiv.style.color = 'red';
                }
            }
        }
    });

    // Lógica para cerrar sesión
    const cerrarSesionBtn = document.getElementById('cerrarSesion');
    if(cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }
});