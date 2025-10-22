// ---- Evento Principal que se ejecuta al cargar la página del Dashboard ----
document.addEventListener('DOMContentLoaded', async () => {

    // --- REGLA #1: EL GUARDIA DE SEGURIDAD ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // --- Carga de Datos Iniciales (Todos los grupos) ---
    try {
        const response = await fetch('/api/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Token inválido o error del servidor.');

        const data = await response.json();
        mostrarGrupos(data.grupos);

    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    // ---- Asignación de Eventos para los Formularios y Botones ----
    const mensajeDiv = document.getElementById('mensaje-dashboard');

    document.getElementById('crearGrupoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('grupo-nombre').value;
        if (!nombre) return;
        try {
            const response = await fetch('/api/grupos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nombre })
            });
            if (response.ok) {
                location.reload();
            } else {
                const data = await response.json();
                mensajeDiv.textContent = data.message || 'Error al crear el grupo.';
                mensajeDiv.style.color = 'red';
            }
        } catch (error) {
            mensajeDiv.textContent = 'Error de conexión.';
        }
    });

    const gruposContainer = document.querySelector('.grupos-container');
    if (gruposContainer) {
        gruposContainer.addEventListener('click', async (e) => {
            if (e.target && e.target.classList.contains('btn-eliminar-grupo')) {
                const grupoId = e.target.dataset.id;
                if (confirm('¿Estás seguro de que quieres eliminar este grupo y todos sus alumnos? Esta acción es irreversible.')) {
                    try {
                        const response = await fetch(`/api/grupos/${grupoId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                            location.reload();
                        } else {
                            const data = await response.json();
                            mensajeDiv.textContent = data.message || 'Error al eliminar el grupo.';
                            mensajeDiv.style.color = 'red';
                        }
                    } catch (error) {
                        mensajeDiv.textContent = 'Error de conexión.';
                    }
                }
            }
        });
    }

    const cerrarSesionBtn = document.getElementById('cerrarSesion');
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }
});

// --- Función para Dibujar las Tarjetas de los Grupos en el HTML (CORREGIDA)---
function mostrarGrupos(grupos) {
    const gruposContainer = document.querySelector('.grupos-container');
    const mensajeGrupos = document.getElementById('mensaje-grupos');
    const selectGrupo = document.getElementById('alumno-grupo-id');

    gruposContainer.innerHTML = '';
    if (selectGrupo) selectGrupo.innerHTML = '';

    if (!grupos || grupos.length === 0) {
        mensajeGrupos.style.display = 'block';
        return;
    }

    mensajeGrupos.style.display = 'none';

    grupos.forEach(grupo => {
        const grupoCard = document.createElement('div');
        grupoCard.className = 'grupo-card';
        
        // --- CORRECCIÓN CLAVE ---
        // Se cambió el contenido para mostrar el ID del grupo en lugar de la lista de alumnos.
        grupoCard.innerHTML = `
            <h2>${grupo.nombre}</h2>
            <p class="grupo-id-display">ID del Grupo: ${grupo.id}</p> 
            <div class="acciones-grupo">
                <a href="/asistencia?grupoId=${grupo.id}" class="button">Pasar Lista</a>
                <a href="/historial?grupoId=${grupo.id}" class="button">Historial</a>
                <a href="/calificaciones?grupoId=${grupo.id}" class="button">Calificaciones</a>
                <a href="/gestion?grupoId=${grupo.id}" class="button">Gestionar</a>
                <button class="button btn-eliminar-grupo" data-id="${grupo.id}">Eliminar Grupo</button>
            </div>
        `;
        gruposContainer.appendChild(grupoCard);

        if (selectGrupo) {
            const option = document.createElement('option');
            option.value = grupo.id;
            option.textContent = grupo.nombre;
            selectGrupo.appendChild(option);
        }
    });
}