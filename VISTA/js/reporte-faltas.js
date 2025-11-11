document.addEventListener('DOMContentLoaded', () => {

    // --- REGLA #1: EL GUARDIA DE SEGURIDAD ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // --- Obtener el ID del grupo desde la URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const grupoId = urlParams.get('grupoId');

    // Elementos del HTML que vamos a manipular
    const mensajeReporte = document.getElementById('mensaje-reporte');
    const resultadosContainer = document.getElementById('resultados-container');

    // Si no se pasó un grupoId en la URL, mostrar error
    if (!grupoId) {
        mensajeReporte.textContent = 'Error: No se especificó un ID de grupo.';
        return;
    }

    // --- Función para buscar y mostrar las faltas ---
    const cargarReporte = async (rango) => {
        mensajeReporte.textContent = 'Cargando...';
        resultadosContainer.innerHTML = ''; // Limpiar resultados anteriores

        try {
            const response = await fetch(`/api/reporte-faltas?grupoId=${grupoId}&rango=${rango}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error al cargar el reporte.');
            }

            const faltas = await response.json();

            if (faltas.length === 0) {
                mensajeReporte.textContent = 'No se encontraron faltas para este periodo.';
                return;
            }

            mensajeReporte.style.display = 'none'; // Ocultar mensaje
            
            // Le decimos a la función que dibuja la tabla qué botón se presionó
            mostrarTabla(faltas, rango);

        } catch (error) {
            console.error('Error en fetch:', error);
            mensajeReporte.textContent = 'Error al cargar el reporte.';
        }
    };

    // --- Esta función APLICA EL COLOR ---
    const mostrarTabla = (faltas, rango) => {
        const tabla = document.createElement('table');
        tabla.className = 'reporte-tabla';
        
        // Basado en el 'rango', decidimos qué clase CSS (color) usar
        let colorClass = '';
        switch (rango) {
            case '1-semana': colorClass = 'rango-semana'; break;
            case '1-mes': colorClass = 'rango-mes'; break;
            case '3-meses': colorClass = 'rango-3meses'; break;
            case '6-meses': colorClass = 'rango-6meses'; break;
            case '1-anio': colorClass = 'rango-anio'; break;
        }
        if (colorClass) {
            tabla.classList.add(colorClass); // Ej: la tabla ahora tendrá las clases 'reporte-tabla rango-mes'
        }
        
        // Dibuja el encabezado de la tabla
        tabla.innerHTML = `
            <thead>
                <tr>
                    <th>Apellido Paterno</th>
                    <th>Apellido Materno</th>
                    <th>Nombre(s)</th>
                    <th>Total de Faltas</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        // Dibuja el cuerpo de la tabla
        const tbody = tabla.querySelector('tbody');
        faltas.forEach(falta => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${falta.apellidoPaterno}</td>
                <td>${falta.apellidoMaterno}</td>
                <td>${falta.nombre}</td>
                <td>${falta.total_faltas}</td>
            `;
            tbody.appendChild(tr);
        });

        // Añade la tabla terminada a la página
        resultadosContainer.appendChild(tabla);
    };

    // --- Asignar eventos a los botones de filtro ---
    document.querySelectorAll('.btn-filtro').forEach(button => {
        button.addEventListener('click', () => {
            const rango = button.dataset.rango;
            cargarReporte(rango);
        });
    });

});