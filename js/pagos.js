// Importar api (si usas módulos)
import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("=== PÁGINA PAGOS CARGADA ===");

    // ============================================
    // SELECCIÓN DE ELEMENTOS DEL DOM
    // ============================================
    const sueldoBaseInput = document.getElementById('sueldoBaseInput'); 
    const tarifaViajeInput = document.getElementById('tarifaViajeInput'); 
    const costoFaltaInput = document.getElementById('costoFaltaInput'); 
    const btnGuardarConfig = document.getElementById('btnGuardarConfig'); 

    const fechaInicioInput = document.getElementById('fechaInicio'); 
    const fechaFinInput = document.getElementById('fechaFin'); 
    const btnCalcularPagos = document.getElementById('btnGenerarCalculo'); 
    const btnGuardarReporte = document.getElementById('btnGuardarReporte'); 
    const btnPrintReporte = document.getElementById('btnImprimir');
    const reporteTablaBody = document.getElementById('tablaPagos'); 
    const printContainer = document.getElementById('print-container');

    // Elementos para Modales
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalContent = document.getElementById('confirm-modal-content');

    let reporteCalculadoActual = [];

    // ============================================
    // FUNCIONES AUXILIARES (MODALES CON ICONOS)
    // ============================================
    function openModal(modal) { 
        if (modal) modal.classList.add('show'); 
    }

    function closeModal(modal) { 
        if (modal) modal.classList.remove('show'); 
    }

    function showConfirmationModal({ title, message, icon = null, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'btn-primary', showCancelButton = true }) {
        return new Promise((resolve) => {
            if (!confirmModal || !confirmModalContent) { 
                console.error("Modal confirmación no encontrado."); 
                alert(`${title}\n${message}`); 
                resolve(false); 
                return; 
            }
            
            let iconHtml = '';
            if (icon === 'success') {
                iconHtml = '<div class="confirm-icon success-icon"><i class="fas fa-check-circle"></i></div>'; 
            } else if (icon === 'error') {
                iconHtml = '<div class="confirm-icon error-icon"><i class="fas fa-times-circle"></i></div>';
            }

            confirmModalContent.innerHTML = `
                ${iconHtml} <h3>${title}</h3> <p>${message}</p> 
                <div class="confirm-actions"> 
                    ${showCancelButton ? `<button type="button" class="btn btn-secondary" id="confirm-cancel-btn">${cancelText}</button>` : ''} 
                    <button type="button" class="${confirmClass === 'btn-danger' ? 'btn-danger' : confirmClass}" id="confirm-ok-btn">${confirmText}</button> 
                </div>`;
            
            openModal(confirmModal);
            const okBtn = document.getElementById('confirm-ok-btn'); 
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            const cleanUpAndResolve = (value) => { 
                if(okBtn) okBtn.onclick = null; 
                if(cancelBtn) cancelBtn.onclick = null; 
                confirmModal.onclick = null; 
                closeModal(confirmModal); 
                resolve(value); 
            };
            if(okBtn) okBtn.onclick = () => cleanUpAndResolve(true); 
            if(showCancelButton && cancelBtn) cancelBtn.onclick = () => cleanUpAndResolve(false);
            confirmModal.onclick = (e) => { 
                if (e.target === confirmModal && showCancelButton) cleanUpAndResolve(false); 
            };
        });
    }

    function showErrorModal(title, message) { 
        return showConfirmationModal({ 
            icon: 'error', 
            title: title || 'Error', 
            message: message || 'Ocurrió un error.', 
            confirmText: 'Entendido', 
            confirmClass: 'btn-primary', 
            showCancelButton: false 
        }); 
    }

    function showSuccessModal(title, message) {
        return showConfirmationModal({
            icon: 'success', 
            title: title || '¡Guardado!',
            message: message || 'Operación completada.',
            confirmText: 'OK',
            confirmClass: 'btn-primary',
            showCancelButton: false
        });
    }

    // ============================================
    // FUNCIONES ESPECÍFICAS DE PAGOS
    // ============================================

    // --- Cargar Configuración Inicial ---
    async function inicializarValores() {
        console.log("Inicializando valores de configuración...");
        if (!sueldoBaseInput || !tarifaViajeInput || !costoFaltaInput) {
            console.error("Alguno de los inputs de configuración no fue encontrado en el DOM.");
            return;
        }
        try {
            const response = await api.getConfiguracion();
            if (response && response.status === 'success' && response.data) {
                const configuracion = response.data;
                sueldoBaseInput.value = configuracion.sueldoBase ?? 0;
                tarifaViajeInput.value = configuracion.tarifaViaje ?? 0;
                costoFaltaInput.value = configuracion.costoFalta ?? 0;
            } else {
                console.error("No se pudo cargar la configuración:", response?.message);
                showErrorModal("Error al Cargar Configuración", response?.message || "Respuesta inválida del servidor.");
                sueldoBaseInput.value = 0; 
                tarifaViajeInput.value = 0; 
                costoFaltaInput.value = 0; 
            }
        } catch (error) {
            console.error('Error fatal al cargar configuración:', error);
            showErrorModal("Error de Red", "No se pudo conectar para obtener la configuración.");
            sueldoBaseInput.value = 0; 
            tarifaViajeInput.value = 0; 
            costoFaltaInput.value = 0; 
        }
    }

    // --- Guardar Configuración ---
    async function guardarConfiguracion() {
        if (!sueldoBaseInput || !tarifaViajeInput || !costoFaltaInput) {
             console.error("Inputs de configuración no encontrados al guardar.");
             showErrorModal("Error Interno", "No se encontraron los campos para guardar.");
             return;
        }
        const configData = {
            sueldoBase: parseFloat(sueldoBaseInput.value) || 0,
            tarifaViaje: parseFloat(tarifaViajeInput.value) || 0,
            costoFalta: parseFloat(costoFaltaInput.value) || 0
        };
        if (configData.sueldoBase < 0 || configData.tarifaViaje < 0 || configData.costoFalta < 0) {
            showErrorModal("Valores Inválidos", "Los valores no pueden ser negativos."); 
            return;
        }
        if (btnGuardarConfig) btnGuardarConfig.disabled = true;
        try {
            const response = await api.saveConfiguracion(configData);
            if (response && response.status === 'success') {
                showSuccessModal('¡Guardado!', response.message || "Configuración guardada.");
            } else { 
                showErrorModal("Error al Guardar", response?.message || "La API devolvió un error."); 
            }
        } catch (error) {
            console.error("Error al llamar api.saveConfiguracion:", error);
            showErrorModal("Error de Conexión", error.message || "No se pudo contactar al servidor.");
        } finally { 
            if (btnGuardarConfig) btnGuardarConfig.disabled = false; 
        }
    }

    // --- Calcular Pagos ---
    async function calcularPagos() {
        if (!fechaInicioInput || !fechaFinInput || !sueldoBaseInput || !tarifaViajeInput || !costoFaltaInput || !reporteTablaBody) {
             console.error("Faltan elementos del DOM para calcular pagos.");
             showErrorModal("Error Interno", "Faltan elementos necesarios en la página.");
             return;
        }
        const fechaInicio = fechaInicioInput.value; 
        const fechaFin = fechaFinInput.value;
        const configuracionActual = {
             sueldoBase: parseFloat(sueldoBaseInput.value) || 0,
             tarifaViaje: parseFloat(tarifaViajeInput.value) || 0,
             costoFalta: parseFloat(costoFaltaInput.value) || 0
        };
        if (!fechaInicio || !fechaFin) { 
            showErrorModal("Fechas Requeridas", "Selecciona fecha de inicio y fin."); 
            return; 
        }
        if (new Date(fechaInicio) > new Date(fechaFin)) { 
            showErrorModal("Fechas Inválidas", "Fecha inicio posterior a fin."); 
            return; 
        }

        if (btnCalcularPagos) btnCalcularPagos.disabled = true;
        reporteTablaBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Calculando... <i class="fas fa-spinner fa-spin"></i></td></tr>';
        reporteCalculadoActual = [];
        if(btnGuardarReporte) btnGuardarReporte.disabled = true;
        if(btnPrintReporte) btnPrintReporte.disabled = true;

        try {
            const params = { fechaInicio, fechaFin, configuracion: configuracionActual };
            const response = await api.calcularPagos(params);
            if (response && response.status === 'success' && Array.isArray(response.data)) {
                reporteCalculadoActual = response.data;
                renderizarReporte(reporteCalculadoActual);
                const mensajeExito = reporteCalculadoActual.length > 0 ? "Cálculo completado." : "Cálculo completado. No se encontraron datos.";
                showSuccessModal("¡Éxito!", mensajeExito);
            } else {
                showErrorModal("Error al Calcular", response?.message || "No se pudo obtener el reporte.");
                renderizarReporte([]); 
            }
        } catch (error) {
            console.error("Error al llamar api.calcularPagos:", error);
            showErrorModal("Error de Conexión", error.message || "No se pudo calcular el reporte.");
            renderizarReporte([]); 
        } finally { 
            if (btnCalcularPagos) btnCalcularPagos.disabled = false; 
        }
    }

    // --- Renderizar Tabla de Reporte ---
    function renderizarReporte(reporte) {
         if (!reporteTablaBody) return; 

        if (!reporte || reporte.length === 0) {
            reporteTablaBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #666;">No hay datos para mostrar en el rango seleccionado.</td></tr>';
            if(btnGuardarReporte) btnGuardarReporte.disabled = true;
            if(btnPrintReporte) btnPrintReporte.disabled = true; 
            return;
        }

        reporteTablaBody.innerHTML = reporte.map(item => `
            <tr>
                <td>${item.repartidor || 'N/A'}</td>
                <td>$${(item.sueldoBase || 0).toFixed(2)}</td>
                <td>${item.viajesHechos || 0}</td>
                <td>$${(item.sueldoPorViajes || 0).toFixed(2)}</td>
                <td>$${(item.totalBruto || 0).toFixed(2)}</td>
                <td>$${(item.descuentos || 0).toFixed(2)}</td>
                <td style="font-weight: bold;">$${(item.totalNeto || 0).toFixed(2)}</td>
            </tr>
        `).join('');
        
        if(btnGuardarReporte) btnGuardarReporte.disabled = false; 
        if(btnPrintReporte) btnPrintReporte.disabled = false; 
    }

    // --- Exportar a Excel ---
    function exportarReporteAExcel(reporte) {
        console.log("Exportando a Excel...");
        
        const headers = [
            "Repartidor", 
            "Sueldo Base", 
            "Viajes Hechos", 
            "Sueldo por Viajes", 
            "Total Bruto", 
            "Desc. Faltas", 
            "Total Neto"
        ];

        const dataParaExcel = reporte.map(item => [
            item.repartidor || 'N/A',
            item.sueldoBase || 0,
            item.viajesHechos || 0,
            item.sueldoPorViajes || 0,
            item.totalBruto || 0,
            item.descuentos || 0,
            item.totalNeto || 0
        ]);

        const wsData = [headers, ...dataParaExcel];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        try {
            const range = XLSX.utils.decode_range(ws['!ref']);
            const currencyFormat = '$#,##0.00';
            const colsToFormat = [1, 3, 4, 5, 6];
            
            for (let R = 1; R <= range.e.r; ++R) {
                for (const C of colsToFormat) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (ws[cell_ref]) {
                        ws[cell_ref].t = 'n';
                        ws[cell_ref].z = currencyFormat;
                    }
                }
            }
        } catch (e) { 
            console.error("Error al formatear celdas de Excel:", e); 
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte de Pagos");
        
        const fInicio = fechaInicioInput.value || 'fecha';
        const fFin = fechaFinInput.value || 'fecha';
        const fileName = `ReportePagos_${fInicio}_a_${fFin}.xlsx`;

        XLSX.writeFile(wb, fileName);
    }
    
    // --- Función para formatear fecha ---
    function formatearFecha(fechaStr) {
        const fecha = new Date(fechaStr);
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        return fecha.toLocaleDateString('es-ES', opciones);
    }

    // --- Imprimir Reporte ---
    function imprimirReporte() {
        if (!reporteCalculadoActual || reporteCalculadoActual.length === 0) { 
            showErrorModal("Sin Datos", "No hay reporte para imprimir."); 
            return; 
        }

        if (!printContainer) {
            console.error("Contenedor de impresión no encontrado.");
            return;
        }

        const fechaInicio = formatearFecha(fechaInicioInput.value);
        const fechaFin = formatearFecha(fechaFinInput.value);
        const rango = `${fechaInicio} al ${fechaFin}`;

        let tablaHTML = `
            <div class="print-title">Reporte de Pagos</div>
            <div class="print-date">Período: ${rango}</div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>REPARTIDOR</th>
                        <th>SUELDO BASE</th>
                        <th>VIAJES HECHOS</th>
                        <th>SUELDO POR VIAJES</th>
                        <th>TOTAL BRUTO</th>
                        <th>DESC. FALTAS</th>
                        <th>TOTAL NETO</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reporteCalculadoActual.forEach(item => {
            tablaHTML += `
                <tr>
                    <td>${item.repartidor || 'N/A'}</td>
                    <td>$${(item.sueldoBase || 0).toFixed(2)}</td>
                    <td>${item.viajesHechos || 0}</td>
                    <td>$${(item.sueldoPorViajes || 0).toFixed(2)}</td>
                    <td>$${(item.totalBruto || 0).toFixed(2)}</td>
                    <td>$${(item.descuentos || 0).toFixed(2)}</td>
                    <td>$${(item.totalNeto || 0).toFixed(2)}</td>
                </tr>
            `;
        });

        tablaHTML += `
                </tbody>
            </table>
        `;

        printContainer.innerHTML = tablaHTML;
        window.print();
        printContainer.innerHTML = '';
    }

    // --- Guardar Reporte ---
    async function guardarReporte() {
        if (!fechaInicioInput || !fechaFinInput) return;
        if (!reporteCalculadoActual || reporteCalculadoActual.length === 0) { 
            showErrorModal("Sin Datos", "No hay reporte para guardar."); 
            return; 
        }

        // Exportar a Excel
        try {
            exportarReporteAExcel(reporteCalculadoActual);
        } catch (excelError) {
            console.error("Error al generar Excel:", excelError);
            showErrorModal("Error de Excel", "No se pudo generar el archivo Excel. El reporte SÍ se guardará en el sistema.");
        }

        // Guardar en Base de Datos
        const reporteData = { 
            fechaInicio: fechaInicioInput.value, 
            fechaFin: fechaFinInput.value, 
            reporteCalculado: reporteCalculadoActual 
        };
        console.log("Guardando reporte en BD:", reporteData);
        if(btnGuardarReporte) btnGuardarReporte.disabled = true;
        if(btnPrintReporte) btnPrintReporte.disabled = true; 

        try {
            const response = await api.saveReporte(reporteData); 
            if (response && response.status === 'success') {
                showSuccessModal('¡Guardado!', response.message || "Reporte guardado en el sistema y Excel descargado.");
            } else {
                showErrorModal("Error al Guardar Reporte", response?.message || "Error API.");
            }
        } catch (error) {
            console.error("Error al llamar api.saveReporte:", error);
            showErrorModal("Error de Conexión", error.message || "No se pudo guardar reporte.");
        } finally {
            if(btnGuardarReporte) btnGuardarReporte.disabled = false; 
            if(btnPrintReporte) btnPrintReporte.disabled = false; 
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    btnGuardarConfig?.addEventListener('click', guardarConfiguracion);
    btnCalcularPagos?.addEventListener('click', calcularPagos);
    btnGuardarReporte?.addEventListener('click', guardarReporte);
    btnPrintReporte?.addEventListener('click', imprimirReporte);

    // Navegación entre secciones
    document.querySelectorAll('.pago-nav .nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetSectionId = `section-${button.dataset.section}`;
            console.log("Cambiando a sección:", targetSectionId);
            document.querySelectorAll('.pago-section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.pago-nav .nav-button').forEach(btn => btn.classList.remove('active'));
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) targetSection.classList.add('active');
            button.classList.add('active');
        });
    });

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    if(btnGuardarReporte) btnGuardarReporte.disabled = true; 
    if(btnPrintReporte) btnPrintReporte.disabled = true; 
    inicializarValores();

});