import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // LÓGICA DE UI COMPARTIDA
    // ============================================
    function setupUI() {
        const userRole = localStorage.getItem('currentUserRole');
        const currentUser = localStorage.getItem('currentUser');
        const usernameDisplay = document.getElementById('username-display');
        
        if (currentUser && usernameDisplay) {
            usernameDisplay.textContent = currentUser;
        }

        const pagoLink = document.getElementById('pago-link');
        if (userRole === 'admin' && pagoLink) {
            pagoLink.style.display = 'list-item';
            pagoLink.querySelector('a').classList.add('active');
        }

        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const menuBtn = document.getElementById('menuBtn');
        if(menuBtn && sidebar && mainContent) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
    }

    // ============================================
    // LÓGICA DE NAVEGACIÓN POR SECCIONES
    // ============================================
    const navButtons = document.querySelectorAll('.nav-button');
    const pagoSections = document.querySelectorAll('.pago-section');

    function showSection(sectionId) {
        pagoSections.forEach(section => section.classList.remove('active'));
        navButtons.forEach(button => button.classList.remove('active'));
        document.getElementById(`section-${sectionId}`).classList.add('active');
        document.querySelector(`.nav-button[data-section="${sectionId}"]`).classList.add('active');
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            showSection(sectionId);
        });
    });

    // ============================================
    // LÓGICA ESPECÍFICA DE LA PÁGINA DE PAGO
    // ============================================
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const sueldoBaseInput = document.getElementById('sueldoBaseInput');
    const tarifaViajeInput = document.getElementById('tarifaViajeInput');
    const costoFaltaInput = document.getElementById('costoFaltaInput');
    const tablaPagosBody = document.getElementById('tablaPagos');
    const resultadoTitulo = document.getElementById('resultadoTitulo');
    const btnGenerarCalculo = document.getElementById('btnGenerarCalculo');
    const btnGuardarConfig = document.getElementById('btnGuardarConfig');
    const btnGuardarReporte = document.getElementById('btnGuardarReporte');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnLogout = document.getElementById('btnLogout');

    let reporteCalculado = [];

    async function inicializarValores() {
        try {
            // Carga la configuración desde la API
            const response = await api.getConfiguracion();
            if (response.status === 'success') {
                const configuracion = response.data;
                sueldoBaseInput.value = configuracion.sueldoBase;
                tarifaViajeInput.value = configuracion.tarifaViaje;
                costoFaltaInput.value = configuracion.costoFalta;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Error al cargar configuración:", error.message);
            Swal.fire('Error', 'No se pudo cargar la configuración del servidor.', 'error');
        }
        
        // Establece las fechas de la quincena actual
        const hoy = new Date();
        let primerDia, ultimoDia;
        if (hoy.getDate() <= 15) {
            primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
        } else {
            primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
            ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        }
        fechaInicioInput.value = primerDia.toISOString().split('T')[0];
        fechaFinInput.value = ultimoDia.toISOString().split('T')[0];
    }

    function renderizarTablaPagos() {
        tablaPagosBody.innerHTML = '';
        if (reporteCalculado.length === 0) return;
        reporteCalculado.forEach(pago => {
            const fila = `
                <tr>
                    <td>${pago.repartidor}</td>
                    <td>$${parseFloat(pago.sueldoBase).toFixed(2)}</td>
                    <td>${pago.viajesHechos}</td>
                    <td>$${parseFloat(pago.sueldoPorViajes).toFixed(2)}</td>
                    <td class="text-blue">$${parseFloat(pago.totalBruto).toFixed(2)}</td>
                    <td>-$${parseFloat(pago.descuentos).toFixed(2)}</td>
                    <td class="text-red">$${parseFloat(pago.totalNeto).toFixed(2)}</td>
                </tr>`;
            tablaPagosBody.innerHTML += fila;
        });
    }

    async function generarCalculo() {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;
        if (!fechaInicio || !fechaFin) {
            Swal.fire('Campos incompletos', 'Por favor, selecciona ambas fechas.', 'warning');
            return;
        }

        const configuracion = {
            sueldoBase: parseFloat(sueldoBaseInput.value),
            tarifaViaje: parseFloat(tarifaViajeInput.value),
            costoFalta: parseFloat(costoFaltaInput.value)
        };
        
        try {
            const response = await api.calcularPagos({ fechaInicio, fechaFin, configuracion });
            if (response.status === 'success') {
                reporteCalculado = response.data;
                resultadoTitulo.textContent = `2. Resultado de Pagos (${fechaInicio} al ${fechaFin})`;
                renderizarTablaPagos();
                Swal.fire('Cálculo Generado', `Reporte generado exitosamente.`, 'success');
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Error al calcular pagos:", error.message);
            Swal.fire('Error', 'No se pudo generar el cálculo.', 'error');
        }
    }
    
    async function guardarConfiguracion() {
        const nuevaConfiguracion = {
            sueldoBase: parseFloat(sueldoBaseInput.value),
            tarifaViaje: parseFloat(tarifaViajeInput.value),
            costoFalta: parseFloat(costoFaltaInput.value)
        };

        const result = await api.guardarConfiguracion(nuevaConfiguracion);
        if (result.status === 'success') {
            Swal.fire('Configuración Guardada', 'Los valores han sido actualizados en el servidor.', 'success');
        } else {
            Swal.fire('Error', 'No se pudieron guardar los cambios: ' + result.message, 'error');
        }
    }

    async function guardarReporte() {
        if (reporteCalculado.length === 0) {
            Swal.fire('Sin datos', 'Primero debes generar un cálculo para poder guardarlo.', 'warning');
            return;
        }
        const result = await api.guardarReporte(reporteCalculado);
        if (result.status === 'success') {
            Swal.fire('Reporte Guardado', 'El reporte de pagos ha sido guardado.', 'success');
        } else {
            Swal.fire('Error', 'No se pudo guardar el reporte: ' + result.message, 'error');
        }
    }

    function imprimirReporte() {
        if (reporteCalculado.length === 0) {
            Swal.fire('Sin datos', 'No hay nada que imprimir. Por favor, genera un cálculo primero.', 'warning');
            return;
        }
        window.print();
    }
    
    function cerrarSesion() {
        // ... (Tu código de cerrar sesión no necesita cambios)
    }

    // --- ASIGNACIÓN DE EVENTOS ---
    btnGenerarCalculo.addEventListener('click', generarCalculo);
    btnGuardarConfig.addEventListener('click', guardarConfiguracion);
    btnGuardarReporte.addEventListener('click', guardarReporte);
    btnImprimir.addEventListener('click', imprimirReporte);
    if(btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }
    
    // --- INICIALIZACIÓN DE LA PÁGINA ---
    setupUI();
    inicializarValores();
    showSection('configuracion');
});