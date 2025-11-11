// Variables globales para almacenar los datos del grupo y las calificaciones
let alumnosDelGrupo = [];
let calificacionesGuardadas = [];

// --- Función (MODIFICADA) para generar la tabla de calificaciones ---
function generateGradeGrid(numeroUnidades) {
    // Apuntamos a los nuevos elementos de la tabla
    const tablaHead = document.querySelector('#calificaciones-tabla-real thead');
    const tablaBody = document.querySelector('#calificaciones-tabla-real tbody');
    const mensajeDiv = document.getElementById('mensaje-calificaciones');
    
    if (!tablaHead || !tablaBody) return;

    // Limpiar contenido anterior
    tablaHead.innerHTML = '';
    tablaBody.innerHTML = '';

    if (!numeroUnidades || numeroUnidades <= 0) {
        return; // No hacer nada si no hay unidades
    }
    
    if (alumnosDelGrupo.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 40px; color: #6b7280;">No hay alumnos en este grupo.</td></tr>';
        return;
    }

    // 1. Crear el Encabezado (<thead>)
    let headerRow = '<tr><th>Alumno</th>';
    for (let i = 1; i <= numeroUnidades; i++) {
        headerRow += `<th class="unidad-header">U${i}</th>`;
    }
    headerRow += '</tr>';
    tablaHead.innerHTML = headerRow;

    // 2. Crear las Filas (<tbody>)
    // Ordenar alumnos alfabéticamente
    const alumnosOrdenados = [...alumnosDelGrupo].sort((a, b) => {
        const nombreA = `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombre || ''}`.toLowerCase();
        const nombreB = `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombre || ''}`.toLowerCase();
        return nombreA.localeCompare(nombreB);
    });

    alumnosOrdenados.forEach(alumno => {
        const tr = document.createElement('tr');
        let rowHTML = `<td>${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</td>`;

        for (let i = 1; i <= numeroUnidades; i++) {
            const unidad = i;
            // Buscar si ya existe una calificación guardada
            const calificacion = calificacionesGuardadas.find(c => c.alumno_id === alumno.id && c.unidad === unidad);
            const valor = calificacion ? calificacion.calificacion : '';
            
            // Crear el input
            rowHTML += `
                <td>
                    <input 
                        type="number" 
                        class="grade-input"
                        name="calificacion_${alumno.id}_${unidad}" 
                        min="0" max="100" step="1" 
                        value="${valor}"
                        data-alumno-id="${alumno.id}"
                        data-unidad="${unidad}"
                    >
                </td>
            `;
        }
        tr.innerHTML = rowHTML;
        tablaBody.appendChild(tr);
    });
}

// ---- Evento Principal que se ejecuta al cargar la página ----
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = parseInt(urlParams.get('grupoId'));
    const mensajeDiv = document.getElementById('mensaje-calificaciones');

    if (!grupoId) {
        if(mensajeDiv) {
            mensajeDiv.textContent = 'ID de grupo no encontrado.';
            mensajeDiv.className = 'mensaje red';
            mensajeDiv.style.display = 'block';
        }
        return;
    }

    // --- Carga de Datos Inicial ---
    try {
        // 1. Obtener datos del Dashboard (para nombres de alumnos)
        const dashboardResponse = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!dashboardResponse.ok) throw new Error('Token inválido');
        const data = await dashboardResponse.json();

        const grupo = data.grupos.find(g => g.id === grupoId);
        if (grupo) {
            document.getElementById('nombre-grupo-calificaciones').textContent = `Calificaciones: ${grupo.nombre}`;
            alumnosDelGrupo = grupo.alumnos; // Guardar alumnos globalmente
            
            // 2. Obtener calificaciones ya guardadas
            const califResponse = await fetch(`/api/calificaciones/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!califResponse.ok) throw new Error('No se pudieron cargar las calificaciones.');
            calificacionesGuardadas = await califResponse.json();

            // 3. Determinar cuántas unidades mostrar (basado en el máximo guardado o 3 por defecto)
            let maxUnidades = 3; // Valor por defecto
            if (calificacionesGuardadas.length > 0) {
                maxUnidades = Math.max(...calificacionesGuardadas.map(c => c.unidad), 3);
            }
            
            document.getElementById('numero-unidades').value = maxUnidades;
            generateGradeGrid(maxUnidades); // Dibujar la tabla inicial
            
        } else {
             if(mensajeDiv) {
                mensajeDiv.textContent = 'Grupo no encontrado.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
             }
        }
    } catch (error) {
        console.error("Error durante la carga de datos:", error);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
    }
    
    // --- Asignación de Eventos a Botones ---
    try {
        // Botón "Generar Tabla"
        document.getElementById('generar-unidades-btn').addEventListener('click', () => {
            const numeroUnidades = parseInt(document.getElementById('numero-unidades').value);
            generateGradeGrid(numeroUnidades);
        });

        // Botón "Guardar Calificaciones"
        document.getElementById('formulario-calificaciones').addEventListener('submit', async (e) => {
            e.preventDefault();
            const calificaciones = [];
            
            // Buscar todos los inputs de calificación
            document.querySelectorAll('.grade-input').forEach(input => {
                if (input.value !== '') { // Solo guardar si hay un valor
                    calificaciones.push({ 
                        alumno_id: parseInt(input.dataset.alumnoId), 
                        grupo_id: grupoId, 
                        unidad: parseInt(input.dataset.unidad), 
                        calificacion: parseFloat(input.value) 
                    });
                }
            });

            if (calificaciones.length === 0) {
                if(mensajeDiv) {
                    mensajeDiv.textContent = 'No hay calificaciones para guardar.';
                    mensajeDiv.className = 'mensaje red';
                    mensajeDiv.style.display = 'block';
                }
                return;
            }

            try {
                const response = await fetch('/api/calificaciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(calificaciones)
                });
                
                if (response.ok) {
                     if(mensajeDiv) {
                        mensajeDiv.textContent = 'Calificaciones guardadas con éxito.';
                        mensajeDiv.className = 'mensaje green'; // Clase verde
                        mensajeDiv.style.display = 'block';
                     }
                } else {
                     if(mensajeDiv) {
                        mensajeDiv.textContent = 'Error al guardar.';
                        mensajeDiv.className = 'mensaje red'; // Clase roja
                        mensajeDiv.style.display = 'block';
                     }
                }
            } catch (error) {
                if(mensajeDiv) {
                    mensajeDiv.textContent = 'Error de conexión al guardar.';
                    mensajeDiv.className = 'mensaje red';
                    mensajeDiv.style.display = 'block';
                 }
            }
        });

        // Botón "Calcular Promedio"
        document.getElementById('calcular-promedio-btn').addEventListener('click', async () => {
             const resultadosDiv = document.getElementById('promedio-final-resultados');
             resultadosDiv.innerHTML = '<p>Calculando...</p>';

             const response = await fetch(`/api/promedio-final/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
             if(response.ok) {
                const promedios = await response.json();

                // Ordenar alfabéticamente
                promedios.sort((a, b) => {
                    const nombreA = `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombre || ''}`.toLowerCase();
                    const nombreB = `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombre || ''}`.toLowerCase();
                    return nombreA.localeCompare(nombreB);
                });

                // --- NUEVO HTML para la lista de promedios ---
                let htmlResultados = '<ul class="promedio-list">';
                promedios.forEach(p => {
                    const nombreCompleto = `${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}, ${p.nombre || ''}`.replace(' ,', ',');
                    const promedio = p.promedio_final ? parseFloat(p.promedio_final).toFixed(2) : "N/A";
                    
                    // Definir clase de color
                    const colorClass = promedio >= 70 ? 'promedio-aprobado' : 'promedio-reprobado';
                    
                    htmlResultados += `
                        <li>
                            <span class="promedio-nombre">${nombreCompleto}</span>
                            <strong class="promedio-valor ${colorClass}">${promedio}</strong>
                        </li>
                    `;
                });
                htmlResultados += '</ul>';
                resultadosDiv.innerHTML = htmlResultados;
             } else {
                resultadosDiv.innerHTML = '<p class="mensaje red">Error al calcular promedios.</p>';
             }
        });

        // Botón "Cerrar Sesión"
        const cerrarSesionBtn = document.getElementById('cerrarSesion');
        if (cerrarSesionBtn) {
            cerrarSesionBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                window.location.href = '/login';
            });
        }
    } catch (error) {
        console.error("Error al activar los botones:", error);
        if(mensajeDiv) {
            mensajeDiv.innerHTML = `<strong>¡Error al activar los botones!</strong><br>Ocurrió un problema al preparar la página. Revisa la consola para más detalles.`;
            mensajeDiv.className = 'mensaje red';
            mensajeDiv.style.display = 'block';
        }
    }
});