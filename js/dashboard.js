import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("=== DASHBOARD CARGADO (MODO JAVA) ===");

    // ============================================
    // ELEMENTOS DEL DOM
    // ============================================
    const mesSelect = document.getElementById('mes');
    const añoSelect = document.getElementById('año');
    const btnCargar = document.getElementById('btnCargar');
    const tablaBody = document.getElementById('tablaBody');

    let chartRepartos = null;
    let chartGanancias = null;
    
    // Cache de datos
    let todosLosRepartos = [];
    let configuracionGlobal = { tarifaViaje: 0 }; // Valor por defecto

    // ============================================
    // UTILIDADES
    // ============================================
    function formatearMoneda(valor) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(valor);
    }

    function generarColores(cantidad) {
        const coloresBase = ['#d90429', '#ff6b6b', '#ffa94d', '#51cf66', '#47b881', '#3291ff', '#7c3aed', '#ec4899', '#f43f5e', '#f59e0b'];
        let colores = [];
        for (let i = 0; i < cantidad; i++) colores.push(coloresBase[i % coloresBase.length]);
        return colores;
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    function inicializarSelectors() {
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const añoActual = hoy.getFullYear();

        // Llenar año (-2 a +2 años)
        añoSelect.innerHTML = '';
        for (let i = -2; i <= 2; i++) {
            const año = añoActual + i;
            const option = document.createElement('option');
            option.value = año;
            option.textContent = año;
            if (año === añoActual) option.selected = true;
            añoSelect.appendChild(option);
        }

        // Seleccionar mes actual
        mesSelect.value = mesActual;
    }

    // ============================================
    // LOGICA DE DATOS (CÁLCULOS CLIENT-SIDE)
    // ============================================
    async function cargarDatosIniciales() {
        btnCargar.disabled = true;
        btnCargar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        try {
            // 1. Cargar Configuración (para saber cuánto se paga por viaje)
            const configRes = await api.getConfiguracion();
            const configData = Array.isArray(configRes) ? configRes[0] : (configRes.data || configRes);
            configuracionGlobal.tarifaViaje = parseFloat(configData.tarifaViaje || 0);

            // 2. Cargar TODOS los repartos
            const repartosRes = await api.getRepartos();
            // Adaptador flexible para array
            if (Array.isArray(repartosRes)) todosLosRepartos = repartosRes;
            else if (repartosRes.data) todosLosRepartos = repartosRes.data;
            else todosLosRepartos = [];

            console.log(`Datos cargados: ${todosLosRepartos.length} repartos. Tarifa: $${configuracionGlobal.tarifaViaje}`);

            // 3. Procesar para la vista actual
            procesarYRenderizar();

            Swal.fire({
                icon: 'success',
                title: 'Datos Actualizados',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

        } catch (error) {
            console.error("Error cargando dashboard:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos del servidor.', 'error');
        } finally {
            btnCargar.disabled = false;
            btnCargar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        }
    }

    function procesarYRenderizar() {
        const mesSeleccionado = parseInt(mesSelect.value);
        const añoSeleccionado = parseInt(añoSelect.value);

        // --- A. FILTRADO POR FECHA ---
        const repartosMesActual = todosLosRepartos.filter(r => {
            // Usamos hora_salida o created_at. Java suele mandar ISO string "2023-11-25T..."
            const fechaStr = r.hora_salida || r.horaSalida || r.created_at || r.fecha; 
            if (!fechaStr) return false;
            const fecha = new Date(fechaStr);
            return (fecha.getMonth() + 1) === mesSeleccionado && fecha.getFullYear() === añoSeleccionado;
        });

        // Para comparativa (Mes Anterior)
        let mesAnt = mesSeleccionado - 1;
        let añoAnt = añoSeleccionado;
        if (mesAnt === 0) { mesAnt = 12; añoAnt--; }

        const repartosMesAnterior = todosLosRepartos.filter(r => {
            const fechaStr = r.hora_salida || r.horaSalida || r.created_at || r.fecha; 
            if (!fechaStr) return false;
            const fecha = new Date(fechaStr);
            return (fecha.getMonth() + 1) === mesAnt && fecha.getFullYear() === añoAnt;
        });

        // --- B. AGRUPACIÓN POR REPARTIDOR ---
        const statsRepartidores = {}; // Mapa: { "Juan": { repartos: 0, ganancia: 0, empresa: 0 } }

        repartosMesActual.forEach(r => {
            // Nombre del repartidor (puede venir anidado o directo)
            const nombre = (typeof r.repartidor === 'object' ? r.repartidor.nombre : r.repartidor) || 'Desconocido';
            
            if (!statsRepartidores[nombre]) {
                statsRepartidores[nombre] = { nombre, repartos: 0, tarifa_viaje: 0, ganancia_repartidor: 0, ganancia_empresa: 0 };
            }

            // Cálculos
            const montoTotal = parseFloat(r.monto_total || r.montoTotal || 0);
            const gananciaRep = configuracionGlobal.tarifaViaje; // Asumimos tarifa fija por viaje config
            const gananciaEmp = montoTotal - gananciaRep; // Simplificado

            statsRepartidores[nombre].repartos++;
            statsRepartidores[nombre].tarifa_viaje += gananciaRep;
            statsRepartidores[nombre].ganancia_repartidor += gananciaRep;
            statsRepartidores[nombre].ganancia_empresa += gananciaEmp;
        });

        // Convertir a array
        const estadisticasArray = Object.values(statsRepartidores);

        // --- C. CÁLCULO DE COMPARATIVAS GLOBALES ---
        const totalGananciaActual = repartosMesActual.reduce((sum, r) => sum + (parseFloat(r.monto_total||r.montoTotal||0) - configuracionGlobal.tarifaViaje), 0);
        const totalGananciaAnterior = repartosMesAnterior.reduce((sum, r) => sum + (parseFloat(r.monto_total||r.montoTotal||0) - configuracionGlobal.tarifaViaje), 0);
        
        const comparativaData = {
            totales_actual: {
                repartos: repartosMesActual.length,
                ganancia_repartidores: totalGananciaActual 
            },
            totales_anterior: {
                repartos: repartosMesAnterior.length,
                ganancia_repartidores: totalGananciaAnterior
            }
        };

        // Renderizar todo
        actualizarComparativa(comparativaData);
        renderizarGraficos(estadisticasArray);
        renderizarTabla(estadisticasArray);
    }

    // ============================================
    // RENDERIZADO
    // ============================================

    function renderizarGraficos(estadisticas) {
        if (estadisticas.length === 0) {
            limpiarGraficos();
            return;
        }

        // Gráfico Pastel (Repartos)
        const ctxPie = document.getElementById('chartRepartos').getContext('2d');
        const labels = estadisticas.map(e => e.nombre);
        const dataPie = estadisticas.map(e => e.repartos);
        const colores = generarColores(labels.length);

        if (chartRepartos) chartRepartos.destroy();
        chartRepartos = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: dataPie, backgroundColor: colores, borderWidth: 2, borderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });

        // Gráfico Barras (Ganancias Repartidor)
        const ctxBar = document.getElementById('chartGanancias').getContext('2d');
        const dataBar = estadisticas.map(e => e.ganancia_repartidor);

        if (chartGanancias) chartGanancias.destroy();
        chartGanancias = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ganancia Repartidor ($)',
                    data: dataBar,
                    backgroundColor: colores,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { callback: val => '$' + val } } }
            }
        });
    }

    function limpiarGraficos() {
        if (chartRepartos) { chartRepartos.destroy(); chartRepartos = null; }
        if (chartGanancias) { chartGanancias.destroy(); chartGanancias = null; }
    }

    function renderizarTabla(estadisticas) {
        if (!estadisticas || estadisticas.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay datos en este mes.</td></tr>';
            limpiarTotales();
            return;
        }

        tablaBody.innerHTML = estadisticas.map(item => `
            <tr>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.repartos}</td>
                <td>${formatearMoneda(item.tarifa_viaje)}</td>
                <td style="color: #d90429; font-weight: 600;">${formatearMoneda(item.ganancia_repartidor)}</td>
                <td>${formatearMoneda(item.ganancia_empresa)}</td>
            </tr>
        `).join('');

        // Totales al pie de página (opcional, o actualizar tarjetas)
        calcularTotales(estadisticas);
    }

    function calcularTotales(estadisticas) {
        let totalRepartos = 0;
        let totalTarifa = 0;
        let totalGananciaRep = 0;
        let totalGananciaEmp = 0;

        estadisticas.forEach(item => {
            totalRepartos += item.repartos;
            totalTarifa += item.tarifa_viaje;
            totalGananciaRep += item.ganancia_repartidor;
            totalGananciaEmp += item.ganancia_empresa;
        });

        document.getElementById('total-repartos').textContent = totalRepartos;
        document.getElementById('total-tarifa').textContent = formatearMoneda(totalTarifa);
        document.getElementById('total-ganancia-repartidor').textContent = formatearMoneda(totalGananciaRep);
        document.getElementById('total-ganancia-empresa').textContent = formatearMoneda(totalGananciaEmp);
    }

    function limpiarTotales() {
        document.getElementById('total-repartos').textContent = '-';
        document.getElementById('total-tarifa').textContent = '-';
        document.getElementById('total-ganancia-repartidor').textContent = '-';
        document.getElementById('total-ganancia-empresa').textContent = '-';
    }

    function actualizarComparativa(data) {
        const actual = data.totales_actual;
        const anterior = data.totales_anterior;

        // Cálculo porcentajes
        const calcPct = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev * 100).toFixed(1);
        };

        const pctRepartos = calcPct(actual.repartos, anterior.repartos);
        const pctGanancia = calcPct(actual.ganancia_repartidores, anterior.ganancia_repartidores);

        // DOM Updates
        document.getElementById('comparativa-repartos-actual').textContent = `Mes actual: ${actual.repartos}`;
        document.getElementById('comparativa-repartos-anterior').textContent = `Mes anterior: ${anterior.repartos}`;
        
        const elPctRep = document.getElementById('comparativa-repartos-pct');
        elPctRep.textContent = `${pctRepartos > 0 ? '+' : ''}${pctRepartos}%`;
        elPctRep.className = `pct ${pctRepartos >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('comparativa-ganancias-actual').textContent = `Mes actual: ${formatearMoneda(actual.ganancia_repartidores)}`;
        document.getElementById('comparativa-ganancias-anterior').textContent = `Mes anterior: ${formatearMoneda(anterior.ganancia_repartidores)}`;
        
        const elPctGan = document.getElementById('comparativa-ganancias-pct');
        elPctGan.textContent = `${pctGanancia > 0 ? '+' : ''}${pctGanancia}%`;
        elPctGan.className = `pct ${pctGanancia >= 0 ? 'positive' : 'negative'}`;
    }

    // ============================================
    // LISTENERS
    // ============================================
    btnCargar.addEventListener('click', cargarDatosIniciales); // Recarga total desde el servidor
    mesSelect.addEventListener('change', procesarYRenderizar); // Recálculo local rápido
    añoSelect.addEventListener('change', procesarYRenderizar);

    // INICIO
    inicializarSelectors();
    cargarDatosIniciales();
});