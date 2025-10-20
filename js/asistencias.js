import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {

    // ============================================
    // VARIABLES GLOBALES Y CONFIGURACIÓN INICIAL
    // ============================================
    const userRole = localStorage.getItem('currentUserRole');
    let attendanceData = []; // Este array ahora se llenará desde la API

    // ============================================
    // FUNCIÓN UTILITARIA PARA FORMATEAR HORA
    // ============================================
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

    // ============================================
    // LÓGICA DE UI
    // ============================================
    function setupUI() {
        const username = localStorage.getItem('currentUser');
        const usernameDisplay = document.getElementById('username-display');
        if (username && usernameDisplay) {
            usernameDisplay.textContent = username;
        }

        const actionsHeader = document.getElementById('actions-header');
        if (userRole === 'admin' && actionsHeader) {
            actionsHeader.style.display = 'table-cell';
        }

        const pagoLink = document.getElementById('pago-link');
        if (userRole === 'admin' && pagoLink) {
            pagoLink.style.display = 'list-item';
        }

        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn && sidebar && mainContent) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
    }

    // ============================================
    // LÓGICA PRINCIPAL DE ASISTENCIAS
    // ============================================
    async function cargarYRenderizarAsistencias() {
        try {
            // Llama a la API para obtener los datos del día
            const response = await api.getAsistenciasDelDia();

            if (response.status === 'success') {
                attendanceData = response.data; // Guarda los datos de la API en la variable global
                calculateAndRender();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Error al cargar asistencias:", error.message);
            Swal.fire('Error', 'No se pudieron cargar los datos de asistencia.', 'error');
        }
    }

    function renderAttendanceTable() {
        const tableBody = document.getElementById('attendanceTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        attendanceData.forEach(record => {
            const row = document.createElement('tr');
            const statusIconsHTML = `
                <div class="status-actions">
                    <div class="status-icon status-present ${record.status === 'Presente' ? 'active' : ''}" title="Presente"><i class="fas fa-check"></i></div>
                    <div class="status-icon status-late ${record.status === 'Tardanza' ? 'active' : ''}" title="Tardanza">L</div>
                    <div class="status-icon status-absent ${record.status === 'Ausente' ? 'active' : ''}" title="Ausente"><i class="fas fa-times"></i></div>
                </div>`;
            
            row.innerHTML = `
                <td>${record.name}</td>
                <td>${formatTo12Hour(record.entryTime)}</td>
                <td>${formatTo12Hour(record.exitTime)}</td>
                <td>${statusIconsHTML}</td>`;
            
            if (userRole === 'admin') {
                const actionsCell = document.createElement('td');
                actionsCell.innerHTML = `<button class="btn-edit" data-id="${record.id}">Editar</button>`;
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

    // ============================================
    // MANEJO DE EVENTOS
    // ============================================
    function setupEventListeners() {
        const tableBody = document.getElementById('attendanceTableBody');
        const editFormContainer = document.getElementById('edit-attendance-form');
        const editForm = document.getElementById('editForm');
        const btnCancelEdit = document.getElementById('btn-cancel-edit');
        const btnLogout = document.getElementById('btnLogout');

        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                const target = event.target;
                if (target.classList.contains('btn-edit')) {
                    const employeeId = parseInt(target.dataset.id, 10);
                    const employee = attendanceData.find(emp => emp.id === employeeId);
                    if (employee) {
                        document.getElementById('edit-employee-id').value = employee.id;
                        document.getElementById('edit-employee-name').value = employee.name;
                        document.getElementById('edit-entry-time').value = employee.entryTime === '--:--' ? '' : employee.entryTime;
                        document.getElementById('edit-exit-time').value = employee.exitTime === '--:--' ? '' : employee.exitTime;
                        document.getElementById('edit-status-display').textContent = employee.status;
                        document.getElementById('edit-observation').value = employee.observation;
                        editFormContainer.style.display = 'block';
                    }
                }
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', async (event) => { // La función ahora es async
                event.preventDefault();
                const employeeId = parseInt(document.getElementById('edit-employee-id').value, 10);
                const employee = attendanceData.find(emp => emp.id === employeeId);

                if (employee) {
                    const newEntryTime = document.getElementById('edit-entry-time').value;

                    // Actualiza el objeto 'employee' localmente
                    employee.entryTime = newEntryTime || "--:--";
                    employee.exitTime = document.getElementById('edit-exit-time').value || "--:--";
                    employee.observation = document.getElementById('edit-observation').value;

                    // Vuelve a aplicar la lógica de estado
                    if (newEntryTime && newEntryTime !== "--:--") {
                        if (newEntryTime <= "08:20") employee.status = "Presente";
                        else if (newEntryTime >= "08:21" && newEntryTime <= "08:30") employee.status = "Tardanza";
                        else employee.status = "Ausente";
                    } else {
                        employee.status = "Ausente";
                    }

                    // Llama a la API para guardar los datos en la base de datos
                    const fechaActual = new Date().toISOString().split('T')[0];
                    const result = await api.updateAsistencia({
                        ...employee, // Envía todos los datos actualizados del empleado
                        fecha: fechaActual 
                    });

                    if (result.status === 'success') {
                        // Vuelve a dibujar todo para reflejar los cambios
                        calculateAndRender(); 
                        editFormContainer.style.display = 'none';
                        Swal.fire('¡Guardado!', 'La asistencia ha sido actualizada.', 'success');
                    } else {
                        Swal.fire('Error', 'No se pudo guardar la asistencia: ' + result.message, 'error');
                    }
                }
            });
        }

        if (btnCancelEdit) {
            btnCancelEdit.addEventListener('click', () => {
                editFormContainer.style.display = 'none';
            });
        }

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
    
    // --- INICIALIZACIÓN DE LA PÁGINA ---
    setupUI();
    updateCurrentDate();
    cargarYRenderizarAsistencias();
    setupEventListeners();
});