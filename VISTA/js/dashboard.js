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
        // Llamamos a la NUEVA función 'mostrarGrupos'
        mostrarGrupos(data.grupos);

    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    // ---- Asignación de Eventos para los Formularios y Botones ----
    const mensajeDiv = document.getElementById('mensaje-dashboard');
    if (mensajeDiv) {
        mensajeDiv.style.display = 'none'; // Ocultar por defecto
    }

    // --- Listener para "Crear Grupo" (Sin cambios) ---
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
                if(mensajeDiv) {
                    mensajeDiv.textContent = data.message || 'Error al crear el grupo.';
                    mensajeDiv.className = 'mensaje red';
                    mensajeDiv.style.display = 'block';
                }
            }
        } catch (error) {
            if(mensajeDiv) {
                mensajeDiv.textContent = 'Error de conexión.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
            }
        }
    });

    // --- ¡NUEVO LISTENER! Para el formulario de "Agregar Alumno" ---
    document.getElementById('agregarAlumnoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener valores del nuevo formulario
        const nombre = document.getElementById('nombre-alumno').value;
        const apellidoPaterno = document.getElementById('apellido-paterno').value;
        const apellidoMaterno = document.getElementById('apellido-materno').value;
        const grupoId = document.getElementById('alumno-grupo-select').value; // Del <select>
        
        if (!nombre || !apellidoPaterno || !grupoId) {
            if(mensajeDiv) {
                mensajeDiv.textContent = 'Nombre, Apellido Paterno y Grupo son requeridos.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
            }
            return;
        }

        try {
            const response = await fetch('/api/alumnos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nombre, apellidoPaterno, apellidoMaterno, grupoId })
            });
            
            if (response.ok) {
                location.reload(); // Recargar la página para ver al nuevo alumno
            } else {
                const data = await response.json();
                if(mensajeDiv) {
                    mensajeDiv.textContent = data.message || 'Error al agregar el alumno.';
                    mensajeDiv.className = 'mensaje red';
                    mensajeDiv.style.display = 'block';
                }
            }
        } catch (error) {
            if(mensajeDiv) {
                mensajeDiv.textContent = 'Error de conexión.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
            }
        }
    });
    // --- Fin del Nuevo Listener ---


    // --- Listener para "Eliminar Grupo" (MODIFICADO) ---
    const gruposContainer = document.querySelector('.grupos-container');
    if (gruposContainer) {
        gruposContainer.addEventListener('click', async (e) => {
            // 1. Buscamos el botón de peligro
            const deleteButton = e.target.closest('.btn-peligro');
            
            // 2. Verificamos si se hizo clic en él
            if (deleteButton) { 
                const grupoId = deleteButton.dataset.id;
                
                // Usamos tu misma lógica de confirmación
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
                            if(mensajeDiv) {
                                mensajeDiv.textContent = data.message || 'Error al eliminar el grupo.';
                                mensajeDiv.className = 'mensaje red';
                                mensajeDiv.style.display = 'block';
                            }
                        }
                    } catch (error) {
                        if(mensajeDiv) {
                            mensajeDiv.textContent = 'Error de conexión.';
                            mensajeDiv.className = 'mensaje red';
                            mensajeDiv.style.display = 'block';
                        }
                    }
                }
            }
        });
    }

    // --- Listener para "Cerrar Sesión" (Sin cambios) ---
    const cerrarSesionBtn = document.getElementById('cerrarSesion');
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }
});

// --- ¡FUNCIÓN COMPLETAMENTE REESCRITA! ---
// Dibuja las tarjetas de grupo y llena el dropdown
function mostrarGrupos(grupos) {
    const gruposContainer = document.querySelector('.grupos-container');
    const mensajeGrupos = document.getElementById('mensaje-grupos');
    // --- MODIFICADO: Apunta al nuevo <select>
    const selectGrupo = document.getElementById('alumno-grupo-select');

    // Limpiar contenedor y select
    gruposContainer.innerHTML = '';
    if (selectGrupo) {
        selectGrupo.innerHTML = '<option value="">Seleccione un grupo...</option>';
    }

    // Caso: No hay grupos
    if (!grupos || grupos.length === 0) {
        if (mensajeGrupos) {
            mensajeGrupos.textContent = 'No tienes grupos. ¡Crea uno en el panel de la izquierda!';
            mensajeGrupos.style.display = 'block';
        }
        if (selectGrupo) {
            selectGrupo.innerHTML = '<option value="">Crea un grupo primero</option>';
            selectGrupo.disabled = true;
        }
        return;
    }

    // Ocultar mensaje de "no hay grupos"
    if (mensajeGrupos) {
        mensajeGrupos.style.display = 'none';
    }
    if (selectGrupo) {
        selectGrupo.disabled = false;
    }

    // Iterar y dibujar cada tarjeta
    grupos.forEach(grupo => {
        // 1. Crear la tarjeta
        const grupoCard = document.createElement('div');
        grupoCard.className = 'grupo-card'; // Esta clase ya está estilizada en el CSS
        
        // 2. Contar los alumnos
        const numAlumnos = grupo.alumnos ? grupo.alumnos.length : 0;
        
        // 3. Definir el HTML interno de la tarjeta (NUEVO DISEÑO)
        grupoCard.innerHTML = `
            <div class="card-body">
                <h2>${grupo.nombre}</h2>
                <div class="grupo-stats">
                    <span>ID: ${grupo.id}</span>
                    <span>${numAlumnos} Alumno${numAlumnos !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="card-footer">
                <a href="/asistencia?grupoId=${grupo.id}" class="btn-accion btn-primario">Pasar Lista</a>
                <a href="/historial?grupoId=${grupo.id}" class="btn-accion btn-secundario">Historial</a>
                <a href="/calificaciones?grupoId=${grupo.id}" class="btn-accion btn-secundario">Calificac.</a>
                <a href="/reporte-faltas?grupoId=${grupo.id}" class="btn-accion btn-secundario">Reportes</a>
                <a href="/gestion?grupoId=${grupo.id}" class="btn-accion btn-secundario">Gestionar</a>
                <button class="btn-accion btn-peligro" data-id="${grupo.id}">Eliminar</button>
            </div>
        `;
        
        // 4. Añadir la tarjeta a la página
        gruposContainer.appendChild(grupoCard);

        // 5. Llenar el <select> del formulario "Agregar Alumno"
        if (selectGrupo) {
            const option = document.createElement('option');
            option.value = grupo.id;
            // Texto más descriptivo para el dropdown
            option.textContent = `${grupo.nombre} (${numAlumnos} alumno${numAlumnos !== 1 ? 's' : ''})`;
            selectGrupo.appendChild(option);
        }
    });
}