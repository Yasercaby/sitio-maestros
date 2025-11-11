// Un solo listener que se activa cuando el HTML está listo.
document.addEventListener('DOMContentLoaded', async () => {

    // --- REGLA #1: EL GUARDIA DE SEGURIDAD ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login'; 
        return; // Detiene la ejecución del resto del script.
    }

    // --- CÓDIGO PARA CARGAR LOS ALUMNOS DEL GRUPO ---
    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = parseInt(urlParams.get('grupoId'));
    const mensajeDiv = document.getElementById('mensaje-asistencia');
    
    if (!grupoId) {
        mensajeDiv.textContent = 'ID de grupo no encontrado en la URL.';
        mensajeDiv.className = 'mensaje red';
        mensajeDiv.style.display = 'block';
        return;
    }

    // Apuntamos al <tbody> de la nueva tabla
    const alumnosTbody = document.getElementById('alumnos-lista-asistencia');

    try {
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const grupo = data.grupos.find(g => g.id === grupoId);
            
            if (grupo) {
                // Llenar la información de la página con los datos del grupo
                document.getElementById('nombre-grupo').textContent = `Pase de Lista: ${grupo.nombre}`;
                
                const hoy = new Date();
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
                document.getElementById('fecha-actual').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
                
                // --- ¡LÓGICA DE DIBUJADO MODIFICADA! ---
                if (grupo.alumnos.length > 0) {
                    // Limpiar el "Cargando..."
                    alumnosTbody.innerHTML = ''; 
                    
                    // Ordenar alumnos por apellido paterno
                    const alumnosOrdenados = grupo.alumnos.sort((a, b) => 
                        a.apellidoPaterno.localeCompare(b.apellidoPaterno)
                    );

                    alumnosOrdenados.forEach((alumno, index) => {
                        const tr = document.createElement('tr');
                        tr.className = 'alumno-row';
                        tr.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</td>
                            <td>
                                <div class="btn-toggle-group">
                                    <!-- Botón Presente (activo por defecto) -->
                                    <button type="button" class="btn-asistencia presente active" data-value="1">Presente</button>
                                    <!-- Botón Ausente -->
                                    <button type="button" class="btn-asistencia ausente" data-value="0">Ausente</button>
                                    <!-- Input oculto que guarda el valor (1 o 0) -->
                                    <input type="hidden" class="asistencia-input" value="1" data-alumno-id="${alumno.id}">
                                </div>
                            </td>
                        `;
                        alumnosTbody.appendChild(tr);
                    });
                } else {
                    alumnosTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: #6b7280;">No hay alumnos en este grupo.</td></tr>';
                }
            } else {
                mensajeDiv.textContent = 'Grupo no encontrado.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
            }
        } else {
            // Si el token es inválido o expiró, nos vamos al login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.className = 'mensaje red';
        mensajeDiv.style.display = 'block';
        console.error('Error:', error);
    }

    // --- ¡NUEVO LISTENER! Para los botones de toggle (Presente/Ausente) ---
    alumnosTbody.addEventListener('click', (e) => {
        // Verificar si se hizo clic en un botón de asistencia
        if (e.target.classList.contains('btn-asistencia')) {
            const botonClickeado = e.target;
            const grupoDeBotones = botonClickeado.closest('.btn-toggle-group');
            
            // 1. Quitar 'active' de ambos botones (hermanos)
            grupoDeBotones.querySelectorAll('.btn-asistencia').forEach(btn => {
                btn.classList.remove('active');
            });

            // 2. Poner 'active' solo en el botón clickeado
            botonClickeado.classList.add('active');

            // 3. Actualizar el valor del input oculto
            const inputOculto = grupoDeBotones.querySelector('.asistencia-input');
            inputOculto.value = botonClickeado.dataset.value; // "1" o "0"
        }
    });

    // --- LÓGICA PARA ENVIAR EL FORMULARIO (MODIFICADA) ---
    document.getElementById('asistenciaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- MODIFICADO: Leer los inputs ocultos ---
        const inputs = document.querySelectorAll('.asistencia-input');
        
        if (inputs.length === 0) {
            mensajeDiv.textContent = 'Error: No se puede pasar lista sin alumnos.';
            mensajeDiv.className = 'mensaje red';
            mensajeDiv.style.display = 'block';
            return;
        }

        // Crear el array de asistencias leyendo los inputs ocultos
        const asistencias = Array.from(inputs).map(input => ({
            alumnoId: parseInt(input.dataset.alumnoId),
            asistio: parseInt(input.value) // 1 o 0
        }));

        try {
            const response = await fetch('/api/asistencia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(asistencias)
            });

            const responseData = await response.json();
            if (response.ok) {
                mensajeDiv.textContent = responseData.message;
                mensajeDiv.className = 'mensaje green'; // Usar clases de styles.css
                mensajeDiv.style.display = 'block';
                // Desactivar el botón para evitar doble envío
                e.target.querySelector('button[type="submit"]').disabled = true;
                e.target.querySelector('button[type="submit"]').textContent = 'Asistencia Guardada';

            } else {
                mensajeDiv.textContent = responseData.message || 'Error al registrar la asistencia.';
                mensajeDiv.className = 'mensaje red';
                mensajeDiv.style.display = 'block';
            }
        } catch (error) {
            mensajeDiv.textContent = 'Error de conexión con el servidor.';
            mensajeDiv.className = 'mensaje red';
            mensajeDiv.style.display = 'block';
            console.error('Error:', error);
        }
    });

    // --- LÓGICA PARA EL BOTÓN DE CERRAR SESIÓN ---
    const cerrarSesionBtn = document.getElementById('cerrarSesion');
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }
});