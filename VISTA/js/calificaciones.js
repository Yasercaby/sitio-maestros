// Variables globales para almacenar los datos del grupo y las calificaciones
let alumnosDelGrupo = [];
let calificacionesGuardadas = [];

// Función auxiliar para generar la tabla de calificaciones
function generateGradeGrid(numeroUnidades) {
    const alumnosContainer = document.getElementById('alumnos-calificaciones');
    if (!alumnosContainer) return;

    if (!numeroUnidades || numeroUnidades <= 0) {
        alumnosContainer.innerHTML = '';
        return;
    }
    
    if (alumnosDelGrupo.length === 0) {
        alumnosContainer.innerHTML = '<p class="mensaje" style="color: red;">No hay alumnos en este grupo.</p>';
        return;
    }

    const gridStyle = `display: grid; grid-template-columns: 2fr repeat(${parseInt(numeroUnidades)}, 1fr); gap: 10px; margin-top: 20px; align-items: center;`;
    const headers = Array.from({ length: numeroUnidades }).map((_, i) => `<div class="header">U${i + 1}</div>`).join('');
    const studentRows = alumnosDelGrupo.map(alumno => {
        const inputFields = Array.from({ length: numeroUnidades }).map((_, i) => {
            const unidad = i + 1;
            const calificacion = calificacionesGuardadas.find(c => c.alumno_id === alumno.id && c.unidad === unidad);
            const valor = calificacion ? calificacion.calificacion : '';
            return `<input type="number" name="calificacion_${alumno.id}_${unidad}" min="0" max="100" step="1" value="${valor}" class="grade-input">`;
        }).join('');
        return `<div class="alumno-nombre">${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</div>${inputFields}`;
    }).join('');

    alumnosContainer.innerHTML = `<h3>Calificaciones por Unidad</h3><div class="calificaciones-grid" style="${gridStyle}"><div class="header">Alumno</div>${headers}${studentRows}</div>`;
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
        if(mensajeDiv) mensajeDiv.textContent = 'ID de grupo no encontrado.';
        return;
    }

    try {
        const dashboardResponse = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!dashboardResponse.ok) throw new Error('Token inválido');
        const data = await dashboardResponse.json();

        const grupo = data.grupos.find(g => g.id === grupoId);
        if (grupo) {
            document.getElementById('nombre-grupo-calificaciones').textContent = `Calificaciones del Grupo: ${grupo.nombre}`;
            alumnosDelGrupo = grupo.alumnos;
            
            const califResponse = await fetch(`/api/calificaciones/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            calificacionesGuardadas = await califResponse.json();

            let maxUnidades = 0;
            if (calificacionesGuardadas.length > 0) {
                maxUnidades = Math.max(...calificacionesGuardadas.map(c => c.unidad));
            }
            if (maxUnidades > 0) {
                document.getElementById('numero-unidades').value = maxUnidades;
                generateGradeGrid(maxUnidades);
            }
        } else {
             if(mensajeDiv) mensajeDiv.textContent = 'Grupo no encontrado.';
        }
    } catch (error) {
        console.error("Error durante la carga de datos:", error);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
    }
    
    try {
        document.getElementById('generar-unidades-btn').addEventListener('click', () => {
            const numeroUnidades = parseInt(document.getElementById('numero-unidades').value);
            generateGradeGrid(numeroUnidades);
        });

        document.getElementById('formulario-calificaciones').addEventListener('submit', async (e) => {
            e.preventDefault();
            const calificaciones = [];
            document.querySelectorAll('[name^="calificacion_"]').forEach(input => {
                if (input.value !== '') {
                    const [, alumno_id, unidad] = input.name.split('_');
                    calificaciones.push({ alumno_id: parseInt(alumno_id), grupo_id: grupoId, unidad: parseInt(unidad), calificacion: parseFloat(input.value) });
                }
            });
            const response = await fetch('/api/calificaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(calificaciones)
            });
            if (response.ok) {
                 if(mensajeDiv) {
                    mensajeDiv.textContent = 'Calificaciones guardadas con éxito.';
                    mensajeDiv.style.color = 'green';
                 }
            } else {
                 if(mensajeDiv) {
                    mensajeDiv.textContent = 'Error al guardar.';
                    mensajeDiv.style.color = 'red';
                 }
            }
        });

        document.getElementById('calcular-promedio-btn').addEventListener('click', async () => {
             const resultadosDiv = document.getElementById('promedio-final-resultados');
             const response = await fetch(`/api/promedio-final/${grupoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
             if(response.ok) {
                const promedios = await response.json();

                // --- NUEVO CÓDIGO PARA ORDENAR ALFABÉTICAMENTE ---
                promedios.sort((a, b) => {
                    // Se crea un nombre completo estándar para ordenar (ApellidoPaterno ApellidoMaterno Nombre)
                    const nombreA = `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombre || ''}`.toLowerCase();
                    const nombreB = `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombre || ''}`.toLowerCase();
                    return nombreA.localeCompare(nombreB);
                });
                // --- FIN DEL CÓDIGO PARA ORDENAR ---

                let htmlResultados = '<h3>Promedios Finales</h3><ul>';
                promedios.forEach(p => {
                    // CORRECCIÓN: Se asegura de que todos los apellidos y nombres se muestren
                    const nombreCompleto = `${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}, ${p.nombre || ''}`.replace(' ,', ',');
                    const promedio = p.promedio_final ? parseFloat(p.promedio_final).toFixed(2) : "N/A";
                    const color = promedio >= 70 ? 'green' : 'red';
                    htmlResultados += `<li>${nombreCompleto}: <strong style="color: ${color};">${promedio}</strong></li>`;
                });
                htmlResultados += '</ul>';
                resultadosDiv.innerHTML = htmlResultados;
             }
        });

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
            mensajeDiv.style.color = 'red';
        }
    }
});