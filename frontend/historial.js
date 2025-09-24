document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = urlParams.get('grupoId');
    if (!grupoId) {
        document.getElementById('mensaje-historial').textContent = 'ID de grupo no encontrado.';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/historial/${grupoId}`, {
            method: 'GET',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            const historial = await response.json();
            if (historial.length > 0) {
                mostrarHistorial(historial);
            } else {
                document.getElementById('mensaje-historial').textContent = 'No hay historial de asistencia para este grupo.';
            }
        } else {
            document.getElementById('mensaje-historial').textContent = 'Error al cargar el historial.';
        }
    } catch (error) {
        document.getElementById('mensaje-historial').textContent = 'Error de conexión con el servidor.';
    }
});

const mostrarHistorial = (historial) => {
    const tablaContainer = document.getElementById('historial-tabla');
    const fechas = [...new Set(historial.map(item => item.fecha))];
    const alumnos = [...new Set(historial.map(item => `${item.apellidoPaterno} ${item.apellidoMaterno}, ${item.alumno_nombre}`))];

    // Ordenar los alumnos alfabéticamente
    alumnos.sort((a, b) => a.localeCompare(b));

    let tablaHTML = `
        <style>
            /* Estilos para el modal */
            .modal {
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background-color: #fefefe;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 400px;
                border-radius: 10px;
            }
            .cerrar {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .cerrar:hover,
            .cerrar:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }
            .accion-form { display: flex; flex-direction: column; gap: 10px; }
            .acciones-btns { display: flex; justify-content: center; gap: 5px; }
            .btn-accion { padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer; }
            .btn-borrar { background-color: #dc3545; color: white; }
            .btn-editar { background-color: #ffc107; color: #212529; }
            .btn-guardar { background-color: #28a745; color: white; }
            
            /* Estilos de la tabla */
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                background-color: #fff;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: center;
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
        </style>
        <h2>Historial de Asistencia</h2>
        <table>
            <thead>
                <tr>
                    <th>Alumno</th>
                    ${fechas.map(fecha => `<th>${fecha}</th>`).join('')}
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${alumnos.map((alumno, index) => `
                    <tr>
                        <td>${index + 1}. ${alumno}</td>
                        ${fechas.map(fecha => {
                            const registro = historial.find(item => `${item.apellidoPaterno} ${item.apellidoMaterno}, ${item.alumno_nombre}` === alumno && item.fecha === fecha);
                            return `<td>
                                <div class="acciones-btns">
                                    <span>${registro ? (registro.presente ? '✔' : '❌') : ''}</span>
                                    ${registro ? `<button class="btn-accion btn-editar" data-id="${registro.asistencia_id}" data-presente="${registro.presente}" data-justificante="${registro.justificante || ''}">Editar</button>` : ''}
                                    ${registro ? `<button class="btn-accion btn-borrar" data-id="${registro.asistencia_id}">Borrar</button>` : ''}
                                </div>
                            </td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    tablaContainer.innerHTML = tablaHTML;

    // Lógica para abrir el modal de edición
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-editar')) {
            const id = e.target.dataset.id;
            const presente = e.target.dataset.presente === '1';
            const justificante = e.target.dataset.justificante;

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
                        <button class="btn-accion btn-guardar" type="submit">Guardar</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.cerrar').addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.querySelector('#editar-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const nuevoPresente = modal.querySelector('#editar-presente').checked ? 1 : 0;
                const nuevoJustificante = modal.querySelector('#editar-justificante').value;

                await fetch(`http://localhost:3000/api/asistencia/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
                    body: JSON.stringify({ presente: nuevoPresente, justificante: nuevoJustificante })
                });

                document.body.removeChild(modal);
                location.reload();
            });
        }

        if (e.target.classList.contains('btn-borrar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres borrar este registro?')) {
                await fetch(`http://localhost:3000/api/asistencia/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('token') }
                });
                location.reload();
            }
        }
    });
};