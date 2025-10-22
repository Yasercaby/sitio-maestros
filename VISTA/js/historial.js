// Funciones auxiliares para mostrar la tabla y el modal
function mostrarHistorial(historial) {
    const container = document.getElementById('historial-tabla');
    if (!container) return;
    if (!historial || historial.length === 0) {
        container.innerHTML = '<p>No hay registros de asistencia para este grupo.</p>';
        return;
    }
    const fechas = [...new Set(historial.map(item => item.fecha))].sort((a, b) => new Date(b) - new Date(a));
    const alumnos = [...new Set(historial.map(item => `${item.apellidoPaterno} ${item.apellidoMaterno}, ${item.alumno_nombre}`))].sort();
    
    let tablaHTML = `
        <table class="historial-table">
            <thead>
                <tr>
                    <th>Alumno</th>
                    ${fechas.map(fecha => `<th>${new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${alumnos.map(alumnoNombre => `
                    <tr>
                        <td>${alumnoNombre}</td>
                        ${fechas.map(fecha => {
                            const registro = historial.find(item => `${item.apellidoPaterno} ${item.apellidoMaterno}, ${item.alumno_nombre}` === alumnoNombre && item.fecha === fecha);
                            if (registro) {
                                const marca = registro.presente ? '✔' : '❌';
                                return `<td>
                                    <div class="acciones-btns">
                                        <span>${marca}</span>
                                        <button class="btn-accion btn-editar" data-id="${registro.asistencia_id}" data-presente="${registro.presente}" data-justificante="${registro.justificante || ''}">✎</button>
                                    </div>
                                </td>`;
                            }
                            return '<td>-</td>';
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tablaHTML;
}

function abrirModalEdicion(id, presente, justificante) {
    const modalExistente = document.querySelector('.modal');
    if (modalExistente) document.body.removeChild(modalExistente);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="cerrar">&times;</span>
            <h3>Editar Asistencia</h3>
            <form class="accion-form" id="editar-form">
                <label>
                    <input type="checkbox" id="editar-presente" ${presente ? 'checked' : ''}> Presente
                </label>
                <label for="editar-justificante">Justificación:</label>
                <textarea id="editar-justificante">${justificante}</textarea>
                <button class="button btn-guardar" type="button" id="guardar-cambios-asistencia" data-id="${id}">Guardar Cambios</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// ---- Evento Principal ----
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

        const response = await fetch(`/api/historial/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Token inválido o error del servidor.');
        
        const historial = await response.json();
        
        const dashboardResponse = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
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

        mostrarHistorial(historial);

    } catch (error) {
        // ---- BLOQUE DE DEPURACIÓN ----
        // En lugar de redirigir, mostramos el error exacto en la página.
        console.error('ERROR ATRAPADO:', error);
        if (mensajeDiv) {
            mensajeDiv.style.color = 'red';
            mensajeDiv.innerHTML = `
                <h2 style="color:red;">¡Ocurrió un error!</h2>
                <p>El problema es el siguiente:</p>
                <pre style="background-color:#fdd;padding:10px;border:1px solid red; white-space:pre-wrap;">${error.stack}</pre>
                <p>Por favor, copia y pega este mensaje completo.</p>
            `;
        }
    }

    // ---- Asignación de Eventos ----
    document.body.addEventListener('click', async (e) => {
        // Lógica para ABRIR el modal de edición
        if (e.target.classList.contains('btn-editar')) {
            const id = e.target.dataset.id;
            const presente = e.target.dataset.presente === '1';
            const justificante = e.target.dataset.justificante;
            abrirModalEdicion(id, presente, justificante);
        }

        // Lógica para CERRAR el modal
        if (e.target.classList.contains('cerrar') || e.target.classList.contains('modal')) {
            const modal = document.querySelector('.modal');
            if (modal) document.body.removeChild(modal);
        }
        
        // Lógica para GUARDAR los cambios desde el modal
        if (e.target.id === 'guardar-cambios-asistencia') {
            e.preventDefault();
            const id = e.target.dataset.id;
            const modal = document.querySelector('.modal');
            const nuevoPresente = modal.querySelector('#editar-presente').checked ? 1 : 0;
            const nuevoJustificante = modal.querySelector('#editar-justificante').value;

            try {
                const response = await fetch(`/api/asistencia/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ presente: nuevoPresente, justificante: nuevoJustificante })
                });

                if (response.ok) {
                    location.reload();
                } else {
                    alert('Error al guardar los cambios.');
                }
            } catch (error) {
                alert('Error de conexión al guardar.');
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