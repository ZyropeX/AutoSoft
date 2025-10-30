import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("=== PÁGINA REPORTES CARGADA ===");

    // ============================================
    // ELEMENTOS DEL DOM
    // ============================================
    const mesSelect = document.getElementById('mes');
    const añoSelect = document.getElementById('año');
    const btnCargar = document.getElementById('btnCargar');
    const tablaBody = document.getElementById('tablaBody');

    let chartRepartos = null;
    let chartGanancias = null;
    let estadisticasActuales = [];

    // ============================================
    // UTILIDADES
    // ============================================

    function formatearMoneda(valor) {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }

    function generarColores(cantidad) {
        const coloresBase = [
            '#d90429',
            '#ff6b6b',
            '#ffa94d',
            '#51cf66',
            '#47b881',
            '#3291ff',
            '#7c3aed',
            '#ec4899',
            '#f43f5e',
            '#f59e0b'
        ];

        let colores = [];
        for (let i = 0; i < cantidad; i++) {
            colores.push(coloresBase[i % coloresBase.length]);
        }
        return colores;
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    function inicializarSelectors() {
        const hoje = new Date();
        const mesActual = hoje.getMonth() + 1;
        const añoActual = hoje.getFullYear();

        // Llenar select de años
        for (let i = -2; i <= 5; i++) {
            const año = añoActual + i;
            const option = document.createElement('option');
            option.value = año;
            option.textContent = año;
            if (i === 0) option.selected = true;
            añoSelect.appendChild(option);
        }

        // Establecer mes actual
        mesSelect.value = mesActual;
    }

    // ============================================
    // CARGAR ESTADÍSTICAS
    // ============================================

    async function cargarEstadisticas() {
        const mes = parseInt(mesSelect.value);
        const año = parseInt(añoSelect.value);

        btnCargar.disabled = true;
        btnCargar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        try {
            // Obtener estadísticas
            const responseEstad = await api.callApi('get_estadisticas_repartidores', 'POST', { mes, año });
            if (responseEstad.status !== 'success') {
                throw new Error(responseEstad.message || 'Error al cargar estadísticas');
            }

            estadisticasActuales = responseEstad.data || [];

            // Obtener comparativas
            const responseComp = await api.callApi('get_comparativas_meses', 'POST', {
                mes_actual: mes,
                año_actual: año
            });

            if (responseComp.status === 'success') {
                actualizarComparativa(responseComp.data);
            }

            renderizarGraficos();
            renderizarTabla();

            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: `Datos cargados para ${mesSelect.options[mesSelect.selectedIndex].text} de ${año}`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudieron cargar los datos'
            });
            estadisticasActuales = [];
            limpiarGraficos();
            renderizarTabla();
        } finally {
            btnCargar.disabled = false;
            btnCargar.innerHTML = '<i class="fas fa-chart-line"></i> Cargar Datos';
        }
    }

    // ============================================
    // RENDERIZAR GRÁFICOS
    // ============================================

    function renderizarGraficos() {
        if (!estadisticasActuales || estadisticasActuales.length === 0) {
            limpiarGraficos();
            return;
        }

        renderizarGraficoPastel();
        renderizarGraficoBarras();
    }

    function renderizarGraficoPastel() {
        const ctx = document.getElementById('chartRepartos').getContext('2d');
        
        const labels = estadisticasActuales.map(e => e.nombre);
        const data = estadisticasActuales.map(e => e.repartos);
        const colores = generarColores(labels.length);

        if (chartRepartos) {
            chartRepartos.destroy();
        }

        chartRepartos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colores,
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                family: "'Poppins', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': ' + context.parsed + ' repartos (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderizarGraficoBarras() {
        const ctx = document.getElementById('chartGanancias').getContext('2d');
        
        const labels = estadisticasActuales.map(e => e.nombre);
        const data = estadisticasActuales.map(e => e.ganancia_repartidor);
        const colores = generarColores(labels.length);

        if (chartGanancias) {
            chartGanancias.destroy();
        }

        chartGanancias = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ganancia Repartidor (MXN)',
                    data: data,
                    backgroundColor: colores,
                    borderColor: 'white',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + formatearMoneda(context.parsed.x);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) {
                                return '$' + formatearMoneda(value);
                            }
                        }
                    }
                }
            }
        });
    }

    function limpiarGraficos() {
        if (chartRepartos) {
            chartRepartos.destroy();
            chartRepartos = null;
        }
        if (chartGanancias) {
            chartGanancias.destroy();
            chartGanancias = null;
        }
    }

    // ============================================
    // RENDERIZAR TABLA
    // ============================================

    function renderizarTabla() {
        if (!estadisticasActuales || estadisticasActuales.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay datos para mostrar</td></tr>';
            limpiarTotales();
            return;
        }

        tablaBody.innerHTML = estadisticasActuales.map(item => `
            <tr>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.repartos}</td>
                <td>$${formatearMoneda(item.tarifa_viaje)}</td>
                <td style="color: var(--primary-red); font-weight: 600;">$${formatearMoneda(item.ganancia_repartidor)}</td>
                <td>$${formatearMoneda(item.ganancia_empresa)}</td>
            </tr>
        `).join('');

        calcularTotales();
    }

    function calcularTotales() {
        let totalRepartos = 0;
        let totalTarifa = 0;
        let totalGananciaRepartidor = 0;
        let totalGananciaEmpresa = 0;

        estadisticasActuales.forEach(item => {
            totalRepartos += item.repartos;
            totalTarifa += item.tarifa_viaje;
            totalGananciaRepartidor += item.ganancia_repartidor;
            totalGananciaEmpresa += item.ganancia_empresa;
        });

        document.getElementById('total-repartos').textContent = totalRepartos;
        document.getElementById('total-tarifa').textContent = '$' + formatearMoneda(totalTarifa);
        document.getElementById('total-ganancia-repartidor').textContent = '$' + formatearMoneda(totalGananciaRepartidor);
        document.getElementById('total-ganancia-empresa').textContent = '$' + formatearMoneda(totalGananciaEmpresa);
    }

    function limpiarTotales() {
        document.getElementById('total-repartos').textContent = '-';
        document.getElementById('total-tarifa').textContent = '-';
        document.getElementById('total-ganancia-repartidor').textContent = '-';
        document.getElementById('total-ganancia-empresa').textContent = '-';
    }

    // ============================================
    // COMPARATIVA MESES
    // ============================================

    function actualizarComparativa(data) {
        if (!data) return;

        const { totales_actual, totales_anterior, diferencias } = data;

        // Repartos
        document.getElementById('comparativa-repartos-actual').textContent = 
            `Mes actual: ${totales_actual.repartos}`;
        document.getElementById('comparativa-repartos-anterior').textContent = 
            `Mes anterior: ${totales_anterior.repartos}`;
        
        const pctRepartos = document.getElementById('comparativa-repartos-pct');
        pctRepartos.textContent = `${diferencias.repartos_pct > 0 ? '+' : ''}${diferencias.repartos_pct}%`;
        pctRepartos.className = `pct ${diferencias.repartos_pct >= 0 ? 'positive' : 'negative'}`;

        // Ganancias
        document.getElementById('comparativa-ganancias-actual').textContent = 
            `Mes actual: $${formatearMoneda(totales_actual.ganancia_repartidores)}`;
        document.getElementById('comparativa-ganancias-anterior').textContent = 
            `Mes anterior: $${formatearMoneda(totales_anterior.ganancia_repartidores)}`;
        
        const pctGanancia = document.getElementById('comparativa-ganancias-pct');
        pctGanancia.textContent = `${diferencias.ganancia_pct > 0 ? '+' : ''}${diferencias.ganancia_pct}%`;
        pctGanancia.className = `pct ${diferencias.ganancia_pct >= 0 ? 'positive' : 'negative'}`;
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    btnCargar.addEventListener('click', cargarEstadisticas);
    mesSelect.addEventListener('change', cargarEstadisticas);
    añoSelect.addEventListener('change', cargarEstadisticas);

    // ============================================
    // INICIALIZAR
    // ============================================

    inicializarSelectors();
    cargarEstadisticas();

});