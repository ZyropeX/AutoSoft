import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
    
    const userRole = localStorage.getItem('currentUserRole');
    let attendanceData = [];
    let employeeRetardos = {};

    console.log('=== PÁGINA ASISTENCIAS CARGADA (MODO AWS) ===');

    // ========================================
    // UTILIDADES
    // ========================================
    function formatTo12Hour(timeString) {
        if (!timeString || timeString === '--:--' || timeString === 'null') return '--:--';
        // A veces Java manda fecha completa ISO, cortamos solo la hora si es necesario
        if (timeString.includes('T')) timeString = timeString.split('T')[1].substring(0, 5);
        // Si viene con segundos HH:mm:ss, cortamos a HH:mm
        if (timeString.length > 5) timeString = timeString.substring(0, 5);

        try {
            const [hours, minutes] = timeString.split(':');
            let h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12;
            return `${h}:${minutes} ${ampm}`;
        } catch (error) {
            return timeString;
        }
    }

    function calcularEstado(entryTime, employeeId) {
        if (!entryTime || entryTime === '--:--' || entryTime === '') return 'Ausente';
        
        // Normalizar entrada por si viene con segundos
        let timeCheck = entryTime;
        if (timeCheck.length > 5) timeCheck = timeCheck.substring(0, 5);

        if (timeCheck <= "08:20") {
            return 'Presente';
        } else if (timeCheck >= "08:21" && timeCheck <= "08:30") {
            if (!employeeRetardos[employeeId]) employeeRetardos[employeeId] = 0;
            // Solo incrementamos visualmente, el cálculo real debería ser histórico
            return 'Tardanza';
        } else {
            return 'Ausente';
        }
    }

    // ========================================
    // CARGAR DATOS (CON ADAPTADOR JAVA)
    // ========================================
    async function cargarYRenderizarAsistencias() {
        try {
            // 1. Llamada a la nueva API (endpoint correcto)
            const response = await api.getAsistencias();
            
            // 2. Adaptador de Datos (Array vs Objeto)
            let rawData = [];
            if (Array.isArray(response)) {
                rawData = response;
            } else if (response.data) {
                rawData = response.data;
            }

            // 3. MAPEO (TRADUCTOR): Backend Java -> Frontend JS
            // Esto evita errores si Java manda "horaEntrada" y nosotros usamos "entryTime"
            attendanceData = rawData.map(item => {
                // Intentamos obtener el nombre del empleado (puede venir anidado)
                let empName = 'Desconocido';
                let empId = 0;

                if (item.empleado && typeof item.empleado === 'object') {
                    empName = item.empleado.nombre || item.empleado.name;
                    empId = item.empleado.id || item.empleado.id_empleado;
                } else {
                    empName = item.nombre_empleado || item.name || item.empleado || 'Sin Nombre';
                    empId = item.id_empleado || item.employeeId || 0;
                }

                return {
                    id: item.id || item.id_asistencia, // ID Único de la asistencia (importante para updates)
                    employeeId: empId,
                    name: empName,
                    // Buscamos la propiedad correcta de hora
                    entryTime: item.horaEntrada || item.hora_entrada || item.entryTime || '--:--',
                    exitTime: item.horaSalida || item.hora_salida || item.exitTime || '--:--',
                    status: item.estado || item.status || 'Ausente',
                    observation: item.observacion || item.observation || '',
                    fecha: item.fecha || new Date().toISOString().split('T')[0]
                };
            });

            console.log('Datos procesados:', attendanceData);

            // Calcular retardos
            employeeRetardos = {};
            attendanceData.forEach(record => {
                if (record.status === 'Tardanza') {
                    if (!employeeRetardos[record.employeeId]) employeeRetardos[record.employeeId] = 0;
                    employeeRetardos[record.employeeId]++;
                }
            });
            
            calculateAndRender();

        } catch (error) {
            console.error("Error al cargar asistencias:", error);
            Swal.fire('Aviso', 'No hay registros de asistencia hoy o hubo un error de conexión.', 'info');
            // Limpiamos tabla visualmente
            attendanceData = [];
            renderAttendanceTable();
        }
    }

    // ========================================
    // RENDERIZADO
    // ========================================
    function renderAttendanceTable() {
        const tableBody = document.getElementById('attendanceTableBody');
        const emptyState = document.getElementById('emptyAttendance');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';

        if (!attendanceData || attendanceData.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }

        attendanceData.forEach((record, index) => {
            const row = document.createElement('tr');
            
            // Clases para colorear iconos
            const isPresent = record.status === 'Presente';
            const isLate = record.status === 'Tardanza';
            const isAbsent = record.status === 'Ausente';

            row.innerHTML = `
                <td>${record.name}</td>
                <td>${formatTo12Hour(record.entryTime)}</td>
                <td>${formatTo12Hour(record.exitTime)}</td>
                <td>
                    <div class="status-actions">
                        <div class="status-icon status-present ${isPresent ? 'active' : ''}" title="Presente"><i class="fas fa-check"></i></div>
                        <div class="status-icon status-late ${isLate ? 'active' : ''}" title="Tardanza">L</div>
                        <div class="status-icon status-absent ${isAbsent ? 'active' : ''}" title="Ausente"><i class="fas fa-times"></i></div>
                    </div>
                </td>
            `;
            
            if (userRole === 'admin') {
                const actionsCell = document.createElement('td');
                actionsCell.classList.add('actions-cell', 'show');
                // Guardamos el índice del array en el botón para buscarlo luego
                actionsCell.innerHTML = `<button class="btn-edit" data-index="${index}">Editar</button>`;
                row.appendChild(actionsCell);
            }
            
            tableBody.appendChild(row);
        });
    }

    function calculateAndRender() {
        const presentCountEl = document.getElementById('presentCount');
        const lateCountEl = document.getElementById('lateCount');
        const absentCountEl = document.getElementById('absentCount');
        const totalCountEl = document.getElementById('totalCount');
        
        if (!presentCountEl) return;

        const totals = {
            present: attendanceData.filter(r => r.status === 'Presente').length,
            late: attendanceData.filter(r => r.status === 'Tardanza').length,
            absent: attendanceData.filter(r => r.status === 'Ausente').length,
            total: attendanceData.length
        };

        presentCountEl.textContent = totals.present;
        lateCountEl.textContent = totals.late;
        absentCountEl.textContent = totals.absent;
        totalCountEl.textContent = totals.total;
        
        renderAttendanceTable();
    }

    // ========================================
    // LOGICA DE FORMULARIO (EDITAR)
    // ========================================
    const editFormContainer = document.getElementById('edit-attendance-form');
    const editForm = document.getElementById('editForm');
    const tableBody = document.getElementById('attendanceTableBody');

    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-edit');
            if (!btn) return;

            const index = btn.dataset.index;
            const record = attendanceData[index];

            if (record && editFormContainer) {
                // Llenar campos
                document.getElementById('edit-employee-id').value = record.id; // ID DE LA ASISTENCIA (Backend)
                // Guardamos el indice localmente en un data attribute oculto para referencia
                document.getElementById('edit-employee-id').dataset.localIndex = index;
                
                document.getElementById('edit-employee-name').value = record.name;
                document.getElementById('edit-entry-time').value = record.entryTime !== '--:--' ? record.entryTime : '';
                document.getElementById('edit-exit-time').value = record.exitTime !== '--:--' ? record.exitTime : '';
                document.getElementById('edit-status-display').textContent = record.status;
                document.getElementById('edit-observation').value = record.observation;
                
                editFormContainer.style.display = 'block';
                editFormContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Obtener datos del form
            const idAsistencia = document.getElementById('edit-employee-id').value;
            const localIndex = document.getElementById('edit-employee-id').dataset.localIndex;
            const originalRecord = attendanceData[localIndex];

            const newEntryTime = document.getElementById('edit-entry-time').value || null; // null si está vacío para que Java sepa
            const newExitTime = document.getElementById('edit-exit-time').value || null;
            const observation = document.getElementById('edit-observation').value;
            
            // Recalcular estado
            const newStatus = calcularEstado(newEntryTime, originalRecord.employeeId);

            // Preparar objeto para Java
            // Java espera nombres de propiedades específicos. Enviamos en formato CamelCase estándar
            // o mapeamos según lo que espere tu DTO (Data Transfer Object)
            const payload = {
                id: idAsistencia,
                horaEntrada: newEntryTime,
                horaSalida: newExitTime,
                observacion: observation,
                estado: newStatus,
                // A veces es necesario re-enviar el empleado u otros datos requeridos por el backend
                empleado: { id: originalRecord.employeeId }, 
                fecha: originalRecord.fecha
            };

            try {
                // Llamamos a la API con PUT /asistencias/{id}
                const result = await api.updateAsistencia(idAsistencia, payload);

                // Verificamos éxito (Status success o objeto devuelto)
                if (result && (result.status === 'success' || !result.error)) {
                    Swal.fire('¡Guardado!', 'Asistencia actualizada.', 'success');
                    editFormContainer.style.display = 'none';
                    cargarYRenderizarAsistencias(); // Recargar tabla
                } else {
                    throw new Error(result.message || 'Error desconocido');
                }
            } catch (error) {
                console.error("Error update:", error);
                Swal.fire('Error', 'No se pudo actualizar: ' + error.message, 'error');
            }
        });
    }

    // Botones auxiliares
    const btnCancel = document.getElementById('btn-cancel-edit');
    if (btnCancel) btnCancel.addEventListener('click', () => editFormContainer.style.display = 'none');

    // SETUP INICIAL
    function setupUI() {
        const username = localStorage.getItem('currentUser');
        const usernameDisplay = document.getElementById('username-display');
        if (username && usernameDisplay) usernameDisplay.textContent = username;

        const currentDateEl = document.getElementById('currentDate');
        if(currentDateEl) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            currentDateEl.textContent = new Date().toLocaleDateString('es-MX', options);
        }
    }

    setupUI();
    cargarYRenderizarAsistencias();

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar sesión?', icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#d90429', confirmButtonText: 'Sí'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    window.location.href = '../html/index.html'; // Ajusta ruta si es necesario
                }
            });
        });
    }
});