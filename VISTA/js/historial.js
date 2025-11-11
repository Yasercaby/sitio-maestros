// --- Función (MODIFICADA) para Dibujar la Tabla Profesional ---
function mostrarHistorial(historial) {
    // El nuevo HTML tiene una tabla real con id 'historial-tabla-real'
    const tabla = document.getElementById('historial-tabla-real');
    const mensajeDiv = document.getElementById('mensaje-historial');

    if (!tabla) return;
    
    // Ocultar el mensaje de error por defecto
    mensajeDiv.style.display = 'none';

    if (!historial || historial.length === 0) {
        mensajeDiv.textContent = 'No hay registros de asistencia para este grupo.';
        mensajeDiv.style.display = 'block';
        tabla.innerHTML = ''; // Limpiar la tabla
        return;
    }

    // 1. Obtener todas las fechas únicas y ordenarlas (más recientes primero)
    const fechas = [...new Set(historial.map(item => item.fecha))].sort((a, b) => new Date(b) - new Date(a));
    
    // 2. Obtener todos los alumnos únicos y ordenarlos
    const alumnosMap = new Map();
    historial.forEach(item => {
        const nombreCompleto = `${item.apellidoPaterno || ''} ${item.apellidoMaterno || ''}, ${item.alumno_nombre || ''}`;
        if (!alumnosMap.has(nombreCompleto)) {
            alumnosMap.set(nombreCompleto, item.alumno_id); // Guardamos el nombre y el ID
        }
    });
    // Ordenamos por nombre completo
    const alumnos = [...alumnosMap.keys()].sort();

    // 3. Crear el Encabezado (<thead>)
    let theadHTML = '<thead><tr><th>Alumno</th>';
    theadHTML += fechas.map(fecha => {
        // Formatear fecha (ej: 10 nov)
        const d = new Date(fecha + 'T00:00:00'); // Añadir T00:00:00 para evitar problemas de zona horaria
        return `<th>${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</th>`;
    }).join('');
    theadHTML += '</tr></thead>';

    // 4. Crear el Cuerpo (<tbody>)
    let tbodyHTML = '<tbody>';
    tbodyHTML += alumnos.map(alumnoNombre => {
        let filaHTML = `<tr><td>${alumnoNombre}</td>`;
        
        filaHTML += fechas.map(fecha => {
            // Encontrar el registro exacto para este alumno y esta fecha
            const registro = historial.find(item => 
                `${item.apellidoPaterno || ''} ${item.apellidoMaterno || ''}, ${item.alumno_nombre || ''}` === alumnoNombre && 
                item.fecha === fecha
            );

            if (registro) {
                // Hay un registro
                let iconHtml = '';
                if (registro.presente) {
                    // Presente (Verde)
                    iconHtml = '<span class="status-icon icon-presente" title="Presente">✅</span>';
                } else if (registro.justificante) {
                    // Ausente con justificación (Ámbar)
                    iconHtml = `<span class="status-icon icon-justificado" title="Justificado: ${registro.justificante}">⚠️</span>`;
                } else {
                    // Ausente sin justificación (Rojo)
                    iconHtml = '<span class="status-icon icon-ausente" title="Ausente">❌</span>';
                }
                
                // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
                // Se cambió 'class_' por 'class'
                const editHtml = `
                    <span class="status-icon icon-editar btn-editar" 
                          data-id="${registro.asistencia_id}" 
                          data-presente="${registro.presente}" 
                          data-justificante="${registro.justificante || ''}"
                          title="Editar">
                        ✏️
                    </span>`;
                
                return `<td>${iconHtml} ${editHtml}</td>`;
            } else {
                // No hay registro para esta fecha
                return '<td><span class="status-icon icon-sin-registro">-</span></td>';
            }
        }).join('');
        
        filaHTML += '</tr>';
        return filaHTML;
    }).join('');
    tbodyHTML += '</tbody>';

    // 5. Insertar el HTML en la tabla
    tabla.innerHTML = theadHTML + tbodyHTML;
}

// --- Función (MODIFICADA) para Abrir el Modal Profesional ---
function abrirModalEdicion(id, presente, justificante) {
    // Si ya hay un modal, quitarlo antes de abrir uno nuevo
    const modalExistente = document.querySelector('.modal-backdrop');
    if (modalExistente) document.body.removeChild(modalExistente);

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop'; // Fondo oscuro
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar Asistencia</h3>
                <span class="modal-cerrar">&times;</span>
            </div>
            <div class="modal-body">
                <label>
                    <input type="checkbox" id="editar-presente" ${presente ? 'checked' : ''}>
                    Marcar como Presente
                </label>
                <label for="editar-justificante">Justificación (opcional):</label>
                <textarea id="editar-justificante" placeholder="Escriba aquí si hay un justificante...">${justificante}</textarea>
            </div>
            <div class="modal-footer">
                <p id="modal-mensaje"></p> <!-- Mensajes de error/éxito aquí -->
                <button class="button btn-guardar" type="button" id="guardar-cambios-asistencia" data-id="${id}">
                    Guardar Cambios
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ---- Evento Principal (MODIFICADO para quitar 'alert') ----
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = parseInt(urlParams.get('grupoId'));
    const mensajeDiv = document.getElementById('mensaje-historial');

    try {
        if (!grupoId) throw new Error("No se proporcionó un ID de grupo en la URL.");

        // Fetch del historial
        const response = await fetch(`/api/historial/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Token inválido o error del servidor al cargar el historial.');
        
        const historial = await response.json();
        
        // Fetch de los datos del dashboard para obtener el nombre del grupo
        const dashboardResponse = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!dashboardResponse.ok) throw new Error('Error al cargar datos del dashboard.');
        
        const dashboardData = await dashboardResponse.json();
        const grupo = dashboardData.grupos.find(g => g.id === grupoId);
        
        if (grupo) {
            const tituloElement = document.getElementById('nombre-grupo-historial');
            if (tituloElement) {
                tituloElement.textContent = `Historial de: ${grupo.nombre}`;
            } else {
                throw new Error("El elemento con id 'nombre-grupo-historial' no fue encontrado en el HTML.");
            }
        }

        // Llamar a la nueva función de dibujado
        mostrarHistorial(historial);

    } catch (error) {
        // ---- BLOQUE DE DEPURACIÓN ----
        console.error('ERROR ATRAPADO:', error);
        if (mensajeDiv) {
            mensajeDiv.style.color = 'red';
            mensajeDiv.innerHTML = `
                <h2 style="color:red;">¡Ocurrió un error!</h2>
                <p>El problema es el siguiente:</p>
                <pre style="background-color:#fdd;padding:10px;border:1px solid red; white-space:pre-wrap;">${error.stack}</pre>
                <p>Por favor, copia y pega este mensaje completo.</p>
            `;
            mensajeDiv.style.display = 'block';
        }
    }

    // ---- Asignación de Eventos (MODIFICADO para quitar 'alert') ----
    document.body.addEventListener('click', async (e) => {
        // Lógica para ABRIR el modal de edición
        // Usamos .closest() para asegurarnos de que el clic funcione aunque se presione el emoji ✏️
        const btnEditar = e.target.closest('.btn-editar');
        if (btnEditar) {
            const id = btnEditar.dataset.id;
            const presente = btnEditar.dataset.presente === '1';
            const justificante = btnEditar.dataset.justificante;
            abrirModalEdicion(id, presente, justificante);
        }

        // Lógica para CERRAR el modal
        if (e.target.classList.contains('modal-cerrar') || e.target.classList.contains('modal-backdrop')) {
            const modal = document.querySelector('.modal-backdrop');
            if (modal) document.body.removeChild(modal);
        }
        
        // Lógica para GUARDAR los cambios desde el modal
        if (e.target.id === 'guardar-cambios-asistencia') {
            e.preventDefault();
            const id = e.target.dataset.id;
            const modal = document.querySelector('.modal-content');
            const mensajeModal = document.getElementById('modal-mensaje');
            
            if (!modal || !mensajeModal) return;

            const nuevoPresente = modal.querySelector('#editar-presente').checked ? 1 : 0;
            const nuevoJustificante = modal.querySelector('#editar-justificante').value;

            mensajeModal.textContent = "Guardando...";
            mensajeModal.style.color = "#6b7280"; // Gris

            try {
                const response = await fetch(`/api/asistencia/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ presente: nuevoPresente, justificante: nuevoJustificante })
                });

                if (response.ok) {
                    location.reload(); // Recargar la página si se guarda con éxito
                } else {
                    const errorData = await response.json();
                    mensajeModal.textContent = `Error: ${errorData.message || 'No se pudo guardar.'}`;
                    mensajeModal.style.color = "#dc2626"; // Rojo
                }
            } catch (error) {
                console.error("Error de red al guardar:", error);
                mensajeModal.textContent = 'Error de conexión. Intente de nuevo.';
                mensajeModal.style.color = "#dc2626"; // Rojo
            }
        }
    });

    // Botón para cerrar sesión
    const cerrarSesionBtn = document.getElementById('cerrarSesion');
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }
});