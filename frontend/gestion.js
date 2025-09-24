document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = urlParams.get('grupoId');
    if (!grupoId) {
        document.getElementById('mensaje-gestion').textContent = 'ID de grupo no encontrado.';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/dashboard', {
            method: 'GET',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            const data = await response.json();
            const grupo = data.grupos.find(g => g.id === parseInt(grupoId));
            if (grupo) {
                document.getElementById('nombre-grupo-gestion').textContent = `Gestión de Alumnos: ${grupo.nombre}`;
                mostrarAlumnosParaGestion(grupo.alumnos);
            } else {
                document.getElementById('mensaje-gestion').textContent = 'Grupo no encontrado.';
            }
        } else {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    } catch (error) {
        document.getElementById('mensaje-gestion').textContent = 'Error de conexión con el servidor.';
    }
});

const mostrarAlumnosParaGestion = (alumnos) => {
    const listaContainer = document.getElementById('alumnos-gestion-lista');
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
};

// Lógica para el botón de eliminar alumno
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-borrar-alumno')) {
        const alumnoId = e.target.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar a este alumno?')) {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3000/api/alumnos/${alumnoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            location.reload();
        }
    }
});

// Lógica para cerrar sesión
document.getElementById('cerrarSesion').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});