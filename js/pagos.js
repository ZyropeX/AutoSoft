import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("=== PÁGINA PAGOS CARGADA (MODO AWS) ===");

    // ============================================
    // SELECCIÓN DE ELEMENTOS
    // ============================================
    const inputsConfig = {
        sueldoBase: document.getElementById('sueldoBaseInput'),
        tarifaViaje: document.getElementById('tarifaViajeInput'),
        costoFalta: document.getElementById('costoFaltaInput'),
        btnGuardar: document.getElementById('btnGuardarConfig')
    };

    const inputsCalculo = {
        fechaInicio: document.getElementById('fechaInicio'),
        fechaFin: document.getElementById('fechaFin'),
        btnCalcular: document.getElementById('btnGenerarCalculo'),
        btnGuardarReporte: document.getElementById('btnGuardarReporte'),
        btnPrint: document.getElementById('btnImprimir'),
        tablaBody: document.getElementById('tablaPagos'),
        printContainer: document.getElementById('print-container')
    };

    let reporteCalculadoActual = [];

    // ============================================
    // FUNCIONES AUXILIARES DE CONFIGURACIÓN
    // ============================================
    async function cargarConfiguracion() {
        console.log("📥 Cargando configuración...");
        try {
            const response = await api.getConfiguracion();
            
            // Adaptador: Java puede devolver un array (lista) o un objeto único.
            // Si es array, tomamos el último o el primero.
            let config = {};
            if (Array.isArray(response) && response.length > 0) {
                config = response[0]; // Tomamos la primera config encontrada
            } else if (response.data) {
                config = response.data;
            } else {
                config = response;
            }

            if (inputsConfig.sueldoBase) inputsConfig.sueldoBase.value = config.sueldoBase ?? 0;
            if (inputsConfig.tarifaViaje) inputsConfig.tarifaViaje.value = config.tarifaViaje ?? 0;
            if (inputsConfig.costoFalta) inputsConfig.costoFalta.value = config.costoFalta ?? 0;

        } catch (error) {
            console.error('Error cargando configuración:', error);
            Swal.fire('Error', 'No se pudo cargar la configuración de sueldos.', 'error');
        }
    }

    async function guardarConfiguracion() {
        const data = {
            sueldoBase: parseFloat(inputsConfig.sueldoBase.value) || 0,
            tarifaViaje: parseFloat(inputsConfig.tarifaViaje.value) || 0,
            costoFalta: parseFloat(inputsConfig.costoFalta.value) || 0
        };

        if (data.sueldoBase < 0 || data.tarifaViaje < 0) {
            Swal.fire('Atención', 'Los valores no pueden ser negativos.', 'warning');
            return;
        }

        try {
            if(inputsConfig.btnGuardar) inputsConfig.btnGuardar.disabled = true;
            
            const response = await api.saveConfiguracion(data);
            
            if (response && (response.status === 'success' || !response.error)) {
                Swal.fire('¡Guardado!', 'Configuración actualizada correctamente.', 'success');
            } else {
                throw new Error(response.message || 'Error al guardar');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
        } finally {
            if(inputsConfig.btnGuardar) inputsConfig.btnGuardar.disabled = false;
        }
    }

    // ============================================
    // CÁLCULO DE NÓMINA (Lógica Central)
    // ============================================
    async function calcularPagos() {
        const fInicio = inputsCalculo.fechaInicio.value;
        const fFin = inputsCalculo.fechaFin.value;

        if (!fInicio || !fFin) {
            Swal.fire('Faltan fechas', 'Selecciona fecha inicio y fin.', 'warning');
            return;
        }

        // Preparamos datos para enviar al Backend
        const params = {
            fechaInicio: fInicio,
            fechaFin: fFin,
            // Enviamos la configuración actual por si el backend la necesita para el cálculo
            configuracion: {
                sueldoBase: parseFloat(inputsConfig.sueldoBase.value) || 0,
                tarifaViaje: parseFloat(inputsConfig.tarifaViaje.value) || 0,
                costoFalta: parseFloat(inputsConfig.costoFalta.value) || 0
            }
        };

        try {
            if(inputsCalculo.btnCalcular) inputsCalculo.btnCalcular.disabled = true;
            inputsCalculo.tablaBody.innerHTML = '<tr><td colspan="7" class="text-center">Calculando... <i class="fas fa-spinner fa-spin"></i></td></tr>';

            // LLAMADA A LA API (Requiere endpoint /pago/calcular en Java)
            const response = await api.calcularPagos(params);
            
            // Manejo flexible de respuesta
            let datos = [];
            if (Array.isArray(response)) datos = response;
            else if (response.data) datos = response.data;

            reporteCalculadoActual = datos;
            renderizarTabla(datos);

            if (datos.length === 0) {
                Swal.fire('Sin resultados', 'No se encontraron movimientos en esas fechas.', 'info');
            } else {
                Swal.fire('Cálculo Exitoso', `Se procesaron ${datos.length} registros.`, 'success');
                if(inputsCalculo.btnGuardarReporte) inputsCalculo.btnGuardarReporte.disabled = false;
                if(inputsCalculo.btnPrint) inputsCalculo.btnPrint.disabled = false;
            }

        } catch (error) {
            console.error("Error calculando pagos:", error);
            inputsCalculo.tablaBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al calcular. Verifica la conexión.</td></tr>';
            Swal.fire('Error', 'No se pudo realizar el cálculo. Verifica que el servidor tenga implementada la ruta /pago/calcular', 'error');
        } finally {
            if(inputsCalculo.btnCalcular) inputsCalculo.btnCalcular.disabled = false;
        }
    }

    function renderizarTabla(datos) {
        inputsCalculo.tablaBody.innerHTML = '';
        if (!datos || datos.length === 0) {
            inputsCalculo.tablaBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay datos.</td></tr>';
            return;
        }

        inputsCalculo.tablaBody.innerHTML = datos.map(item => `
            <tr>
                <td>${item.repartidor || 'Desconocido'}</td>
                <td>$${(item.sueldoBase || 0).toFixed(2)}</td>
                <td>${item.viajesHechos || 0}</td>
                <td>$${(item.sueldoPorViajes || 0).toFixed(2)}</td>
                <td>$${(item.totalBruto || 0).toFixed(2)}</td>
                <td class="text-danger">-$${(item.descuentos || 0).toFixed(2)}</td>
                <td style="font-weight: bold;">$${(item.totalNeto || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    // ============================================
    // EXPORTAR E IMPRIMIR
    // ============================================
    async function guardarReporte() {
        if (reporteCalculadoActual.length === 0) return;

        try {
            const data = {
                fechaInicio: inputsCalculo.fechaInicio.value,
                fechaFin: inputsCalculo.fechaFin.value,
                detalles: reporteCalculadoActual
            };

            const response = await api.saveReporte(data);
            if (response && (response.status === 'success' || !response.error)) {
                Swal.fire('Reporte Guardado', 'Se ha registrado el historial de pagos.', 'success');
                // Aquí podrías disparar la descarga de Excel si lo deseas
                generarExcel(reporteCalculadoActual);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el reporte en base de datos.', 'error');
        }
    }

    function generarExcel(datos) {
        // Requiere librería SheetJS (XLSX) cargada en HTML
        if (typeof XLSX === 'undefined') {
            console.warn('Librería XLSX no encontrada');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(datos.map(d => ({
            Repartidor: d.repartidor,
            "Sueldo Base": d.sueldoBase,
            "Viajes": d.viajesHechos,
            "Pago x Viajes": d.sueldoPorViajes,
            "Bruto": d.totalBruto,
            "Descuentos": d.descuentos,
            "Neto a Pagar": d.totalNeto
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Nomina");
        XLSX.writeFile(wb, `Nomina_${inputsCalculo.fechaInicio.value}.xlsx`);
    }

    function imprimirReporte() {
        if (reporteCalculadoActual.length === 0) return;
        
        const printContent = `
            <div style="text-align: center; font-family: sans-serif;">
                <h2>Reporte de Nómina</h2>
                <p>Del: ${inputsCalculo.fechaInicio.value} Al: ${inputsCalculo.fechaFin.value}</p>
                <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #f3f3f3;">
                            <th>Repartidor</th><th>Base</th><th>Viajes</th><th>Comisión</th><th>Neto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reporteCalculadoActual.map(d => `
                            <tr>
                                <td style="padding: 8px;">${d.repartidor}</td>
                                <td style="padding: 8px;">$${d.sueldoBase}</td>
                                <td style="padding: 8px;">${d.viajesHechos}</td>
                                <td style="padding: 8px;">$${d.sueldoPorViajes}</td>
                                <td style="padding: 8px;"><strong>$${d.totalNeto}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        if (inputsCalculo.printContainer) {
            inputsCalculo.printContainer.innerHTML = printContent;
            window.print();
            inputsCalculo.printContainer.innerHTML = ''; // Limpiar después de imprimir
        }
    }

    // ============================================
    // LISTENERS
    // ============================================
    if(inputsConfig.btnGuardar) inputsConfig.btnGuardar.addEventListener('click', guardarConfiguracion);
    if(inputsCalculo.btnCalcular) inputsCalculo.btnCalcular.addEventListener('click', calcularPagos);
    if(inputsCalculo.btnGuardarReporte) inputsCalculo.btnGuardarReporte.addEventListener('click', guardarReporte);
    if(inputsCalculo.btnPrint) inputsCalculo.btnPrint.addEventListener('click', imprimirReporte);

    // Navegación interna (Pestañas de la página Pagos)
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.pago-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
            
            const targetId = `section-${e.target.dataset.section}`;
            document.getElementById(targetId)?.classList.add('active');
            e.target.classList.add('active');
        });
    });

    // INICIO
    cargarConfiguracion();
});