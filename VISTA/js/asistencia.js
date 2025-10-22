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
        return;
    }

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
                // Llenar la información de la página con los datos del grupo
                document.getElementById('nombre-grupo').textContent = `Pase de Lista del Grupo: ${grupo.nombre}`;
                
                const hoy = new Date();
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
                document.getElementById('fecha-actual').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
                
                const alumnosLista = document.getElementById('alumnos-lista-asistencia');
                if (grupo.alumnos.length > 0) {
                    alumnosLista.innerHTML = grupo.alumnos.map((alumno, index) => `
                        <div class="alumno-item">
                            <label>${index + 1}. ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombre}</label>
                            <input type="checkbox" name="asistio" value="${alumno.id}" checked>
                        </div>
                    `).join('');
                } else {
                    alumnosLista.innerHTML = '<p>No hay alumnos en este grupo.</p>';
                }
            } else {
                mensajeDiv.textContent = 'Grupo no encontrado.';
            }
        } else {
            // Si el token es inválido o expiró, nos vamos al login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        console.error('Error:', error);
    }

    // --- LÓGICA PARA ENVIAR EL FORMULARIO DE ASISTENCIA ---
    document.getElementById('asistenciaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const checkboxes = document.querySelectorAll('#asistenciaForm input[name="asistio"]');
        if (checkboxes.length === 0) {
            mensajeDiv.textContent = 'Error: No se puede pasar lista sin alumnos.';
            mensajeDiv.style.color = 'red';
            return;
        }

        const asistencias = Array.from(checkboxes).map(checkbox => ({
            alumnoId: parseInt(checkbox.value),
            asistio: checkbox.checked ? 1 : 0
        }));

        try {
            // CORRECCIÓN CLAVE: Añadir el prefijo "Bearer " al token.
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
                mensajeDiv.style.color = 'green';
            } else {
                mensajeDiv.textContent = responseData.message || 'Error al registrar la asistencia.';
                mensajeDiv.style.color = 'red';
            }
        } catch (error) {
            mensajeDiv.textContent = 'Error de conexión con el servidor.';
            mensajeDiv.style.color = 'red';
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