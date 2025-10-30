import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
    
    
    const userRole = localStorage.getItem('currentUserRole');
    let attendanceData = [];
    let employeeRetardos = {};

    console.log('=== PÁGINA CARGADA ===');
    console.log('UserRole:', userRole);

    // UTILIDADES
    function formatTo12Hour(timeString) {
        if (!timeString || timeString === '--:--') {
            return '--:--';
        }
        try {
            const [hours, minutes] = timeString.split(':');
            let h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12;
            return `${h}:${minutes} ${ampm}`;
        } catch (error) {
            console.error("Error al formatear la hora:", timeString, error);
            return timeString;
        }
    }

    function calcularEstado(entryTime, employeeId) {
        if (!entryTime || entryTime === '--:--') {
            return 'Ausente';
        }
        if (entryTime <= "08:20") {
            return 'Presente';
        } else if (entryTime >= "08:21" && entryTime <= "08:30") {
            if (!employeeRetardos[employeeId]) {
                employeeRetardos[employeeId] = 0;
            }
            employeeRetardos[employeeId]++;
            if (employeeRetardos[employeeId] > 3) {
                return 'Ausente';
            }
            return 'Tardanza';
        } else {
            return 'Ausente';
        }
    }

    // SETUP UI
    function setupUI() {
        const username = localStorage.getItem('currentUser');
        const usernameDisplay = document.getElementById('username-display');
        if (username && usernameDisplay) {
            usernameDisplay.textContent = username;
        }

        const pagoLink = document.getElementById('pago-link');
        if (userRole === 'admin' && pagoLink) {
            pagoLink.style.display = 'list-item';
        }

        if (userRole === 'admin') {
            const actionsHeader = document.getElementById('actions-header');
            if (actionsHeader) {
                actionsHeader.classList.add('show');
            }
        }
    }

    // CARGAR ASISTENCIAS
    async function cargarYRenderizarAsistencias() {
        try {
            const response = await api.getAsistenciasDelDia();
            if (response.status === 'success') {
                attendanceData = response.data;
                console.log('Datos cargados:', attendanceData);
                if (attendanceData.length > 0) {
                    console.log('Primer registro:', attendanceData[0]);
                    console.log('Propiedades:', Object.keys(attendanceData[0]));
                }
                
                employeeRetardos = {};
                attendanceData.forEach(record => {
                    if (record.status === 'Tardanza') {
                        if (!employeeRetardos[record.employeeId]) {
                            employeeRetardos[record.employeeId] = 0;
                        }
                        employeeRetardos[record.employeeId]++;
                    }
                });
                
                calculateAndRender();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Error al cargar asistencias:", error.message);
            Swal.fire('Error', 'No se pudieron cargar los datos de asistencia.', 'error');
        }
    }

    // RENDERIZAR TABLA
    function renderAttendanceTable() {
        const tableBody = document.getElementById('attendanceTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';

        if (attendanceData.length === 0) {
            document.getElementById('emptyAttendance').style.display = 'block';
            return;
        } else {
            document.getElementById('emptyAttendance').style.display = 'none';
        }

        attendanceData.forEach((record, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${record.name}</td>
                <td>${formatTo12Hour(record.entryTime)}</td>
                <td>${formatTo12Hour(record.exitTime)}</td>
                <td>
                    <div class="status-actions">
                        <div class="status-icon status-present ${record.status === 'Presente' ? 'active' : ''}" title="Presente"><i class="fas fa-check"></i></div>
                        <div class="status-icon status-late ${record.status === 'Tardanza' ? 'active' : ''}" title="Tardanza">L</div>
                        <div class="status-icon status-absent ${record.status === 'Ausente' ? 'active' : ''}" title="Ausente"><i class="fas fa-times"></i></div>
                    </div>
                </td>
            `;
            
            if (userRole === 'admin') {
                const actionsCell = document.createElement('td');
                actionsCell.classList.add('actions-cell', 'show');
                actionsCell.innerHTML = `<button class="btn-edit" data-row-index="${index}">Editar</button>`;
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

    function updateCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = today.toLocaleDateString('es-MX', options);
        }
    }

    // EVENT LISTENERS
    function setupEventListeners() {
        const tableBody = document.getElementById('attendanceTableBody');
        const editFormContainer = document.getElementById('edit-attendance-form');
        const editForm = document.getElementById('editForm');
        const btnCancelEdit = document.getElementById('btn-cancel-edit');
        const btnLogout = document.getElementById('btnLogout');

        // Click en botón editar
        if (tableBody) {
            tableBody.addEventListener('click', function(e) {
                const btn = e.target.closest('.btn-edit');
                if (!btn) return;

                const rowIndex = parseInt(btn.dataset.rowIndex, 10);
                const employee = attendanceData[rowIndex];

                if (employee && editFormContainer) {
                    console.log('Abriendo formulario para:', employee.name);
                    
                    document.getElementById('edit-employee-id').value = employee.employeeId || rowIndex;
                    document.getElementById('edit-employee-name').value = employee.name || '';
                    document.getElementById('edit-entry-time').value = employee.entryTime === '--:--' ? '' : (employee.entryTime || '');
                    document.getElementById('edit-exit-time').value = employee.exitTime === '--:--' ? '' : (employee.exitTime || '');
                    document.getElementById('edit-status-display').textContent = employee.status || 'Presente';
                    document.getElementById('edit-observation').value = employee.observation || '';
                    
                    editFormContainer.style.display = 'block';
                    
                    setTimeout(() => {
                        editFormContainer.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            });
        }

        // Submit del formulario
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const employeeId = parseInt(document.getElementById('edit-employee-id').value, 10);
                const employee = attendanceData.find(emp => emp.employeeId === employeeId) || attendanceData[employeeId];

                if (employee) {
                    const newEntryTime = document.getElementById('edit-entry-time').value;
                    const newExitTime = document.getElementById('edit-exit-time').value;

                    employee.entryTime = newEntryTime || "--:--";
                    employee.exitTime = newExitTime || "--:--";
                    employee.observation = document.getElementById('edit-observation').value;
                    employee.status = calcularEstado(newEntryTime, employeeId);

                    document.getElementById('edit-status-display').textContent = employee.status;

                    const fechaActual = new Date().toISOString().split('T')[0];
                    const result = await api.updateAsistencia({
                        ...employee,
                        fecha: fechaActual 
                    });

                    if (result.status === 'success') {
                        calculateAndRender();
                        editFormContainer.style.display = 'none';
                        Swal.fire('¡Guardado!', 'La asistencia ha sido actualizada.', 'success');
                    } else {
                        Swal.fire('Error', 'No se pudo guardar: ' + result.message, 'error');
                    }
                }
            });
        }

        // Cambio en hora de entrada
        const editEntryTime = document.getElementById('edit-entry-time');
        if (editEntryTime) {
            editEntryTime.addEventListener('change', function() {
                const employeeId = parseInt(document.getElementById('edit-employee-id').value, 10);
                const newEntryTime = this.value;
                
                if (newEntryTime) {
                    const nuevoEstado = calcularEstado(newEntryTime, employeeId);
                    document.getElementById('edit-status-display').textContent = nuevoEstado;
                }
            });
        }

        // Botón cancelar
        if (btnCancelEdit) {
            btnCancelEdit.addEventListener('click', () => {
                editFormContainer.style.display = 'none';
            });
        }

        // Logout
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: "Estás a punto de cerrar la sesión.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d90429',
                    cancelButtonColor: '#6e7881',
                    confirmButtonText: 'Sí, cerrar sesión',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('currentUserRole');
                        window.location.href = 'index.html';
                    }
                });
            });
        }
    }
    
    // INICIALIZAR
    setupUI();
    updateCurrentDate();
    cargarYRenderizarAsistencias();
    
    setTimeout(() => {
        setupEventListeners();
    }, 500);
});