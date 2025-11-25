// Importar 'api' desde apiService.js (requiere type="module" en HTML)
import { api } from './apiService.js';

// ============================================
// VARIABLES GLOBALES
// ============================================
let todosLosRepartosCache = [];
let debugMode = true; // Cambiar a false en producción

// ============================================
// FUNCIÓN DE DEBUG
// ============================================
function debug(mensaje, datos = null) {
    if (!debugMode) return;
    console.log(`🔍 [DEBUG] ${mensaje}`, datos || '');
}

// --------------------------------------------
// ZONA DE UTILIDADES (CRÍTICA: DEBEN IR PRIMERO)
// --------------------------------------------

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function parseAmountValue(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && !isNaN(v)) return v;
    const s = String(v);
    const cleaned = s.replace(/[^\d.]/g, ''); 
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function formatTo12Hour(timeString) {
    if (!timeString || timeString === '--:--' || timeString === null) return '--:--';
    try {
        const timePart = String(timeString).split(' ')[0];
        const [hours, minutes] = timePart.split(':');
        
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12; 
        const min = String(minutes).padStart(2, '0');
        
        return `${h12}:${min} ${ampm}`;
        
    } catch (e) {
        debug('⚠️ Error al formatear hora:', timeString, e);
        return timeString;
    }
}

function formatoSeguro(timeVal) {
    if (timeVal === null || timeVal === undefined || timeVal === '') return '--:--';
    const s = String(timeVal).trim();
    
    // Si es formato ISO o fecha completa, intentamos extraer la hora
    if (s.includes('T')) {
        const horaPart = s.split('T')[1];
        if (horaPart) return formatTo12Hour(horaPart.substring(0, 5));
    }

    if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(s)) {
        return formatTo12Hour(s);
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const utc_h = String(d.getUTCHours()).padStart(2, '0');
        const utc_m = String(d.getUTCMinutes()).padStart(2, '0');
        return formatTo12Hour(`${utc_h}:${utc_m}`);
    }

    return s;
}

function calcularCambio() {
    const montoTotalEl = document.getElementById('montoTotal');
    const montoPagadoEl = document.getElementById('montoPagado');
    const cambioEl = document.getElementById('cambioDevolver');
    
    if (!cambioEl) return;

    const total = parseAmountValue(montoTotalEl?.value);
    const pagado = parseAmountValue(montoPagadoEl?.value);
    const cambio = Math.max(0, pagado - total);
    
    cambioEl.value = `$${cambio.toFixed(2)}`;
}

function actualizarRelojSalida() {
    const reloj = document.getElementById('horaSalidaReloj');
    if (reloj) {
        reloj.textContent = new Date().toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// --------------------------------------------
// LÓGICA DE UI
// --------------------------------------------
function setupUI() {
    const userRole = localStorage.getItem('currentUserRole');
    const username = localStorage.getItem('currentUser');
    const usernameDisplay = document.getElementById('username-display');
    
    if (username && usernameDisplay) { 
        usernameDisplay.textContent = username; 
    }

    const pagoLink = document.getElementById('pago-link');
    if (userRole === 'admin' && pagoLink) { 
        pagoLink.style.display = 'list-item'; 
    }
    
    debug('UI configurada', { userRole, username });
}

// ============================================
// NORMALIZACIÓN DE DATOS
// ============================================
function normalizarReparto(r) {
    // Intentamos buscar propiedades tanto en snake_case (PHP/DB) como camelCase (Java)
    const rawHoraSalida = r.hora_salida ?? r.horaSalida ?? r.hora ?? r.created_at ?? null;
    const rawHoraLlegada = r.hora_llegada ?? r.horaLlegada ?? null;

    // Manejo robusto del monto
    const montoRaw = r.monto_total_raw ?? r.montoTotal ?? r.monto_total ?? r.monto ?? r.total ?? 0;
    const monto_num = parseAmountValue(montoRaw);

    return {
        id_reparto: r.id_reparto ?? r.id ?? r.idReparto ?? r.ID ?? null,
        ticket: String(r.ticket ?? r.num_ticket ?? r.numeroTicket ?? '').slice(0, 20),
        
        // Manejo de objetos anidados si Java devuelve el objeto completo en lugar del string
        destino: (typeof r.destino === 'object' ? r.destino.lugar : r.destino) || r.nombre_destino || '',
        repartidor: (typeof r.repartidor === 'object' ? r.repartidor.nombre : r.repartidor) || r.nombre_repartidor || '',
        vendedor: (typeof r.vendedor === 'object' ? r.vendedor.nombre : r.vendedor) || r.nombre_vendedor || '',
        
        // IDs para la edición/actualización
        id_destino: r.idDestino ?? r.id_destino ?? (typeof r.destino === 'object' ? r.destino.id : null),
        id_repartidor: r.idRepartidor ?? r.id_repartidor ?? (typeof r.repartidor === 'object' ? r.repartidor.id : null),
        id_vendedor: r.idVendedor ?? r.id_vendedor ?? (typeof r.vendedor === 'object' ? r.vendedor.id : null),
        id_metodo_pago: r.idMetodoPago ?? r.id_metodo_pago ?? (typeof r.metodoPago === 'object' ? r.metodoPago.id : null),

        hora_salida_raw: rawHoraSalida,
        hora_llegada_raw: rawHoraLlegada,
        estado: String(r.estado ?? r.status ?? 'activo').trim().toLowerCase(),
        monto_total: monto_num,
        monto_pagado: Number(r.monto_pagado ?? r.montoPagado ?? 0) || 0,
        metodo_pago: (typeof r.metodoPago === 'object' ? r.metodoPago.nombre : r.metodoPago) || r.metodo_pago || ''
    };
}

// ============================================
// CARGA DE DATOS DESDE API
// ============================================
async function cargarYRenderizarRepartos() {
    debug('🔄 Iniciando carga de repartos...');
    
    try {
        const response = await api.getRepartos();
        let dataArray = extraerArray(response);
        
        if (!dataArray) throw new Error('No se pudo extraer el array de repartos');
        
        const normalized = dataArray.map(r => normalizarReparto(r));
        
        todosLosRepartosCache = normalized;
        renderizarTodo(normalized);

        try { calcularCambio(); } catch(e) { }

        debug('✅ Repartos cargados:', normalized.length);
        
    } catch (error) {
        console.error("❌ Error al cargar repartos:", error);
        Swal.fire({ icon: 'error', title: 'Error al cargar datos', text: 'No se pudieron conectar con el servidor.' });
    }
}

// ============================================
// CARGA DE SELECTS
// ============================================
async function cargarSelects() {
    debug('📋 Cargando selects...');
    
    try {
        const [vendedoresRes, repartidoresRes, destinosRes, metodosRes] = await Promise.all([
            api.getVendedores().catch(e => { console.warn(e); return []; }),
            api.getRepartidores().catch(e => { console.warn(e); return []; }),
            api.getDestinos().catch(e => { console.warn(e); return []; }),
            api.getMetodosPagoActivos().catch(e => { console.warn(e); return []; }) 
        ]);

        const vendedores = extraerArray(vendedoresRes);
        const repartidores = extraerArray(repartidoresRes);
        const destinos = extraerArray(destinosRes);
        const metodos = extraerArray(metodosRes);

        populateSelect('vendedor', vendedores);
        populateSelect('repartidor', repartidores);
        populateSelect('destino', destinos);
        populateSelect('metodoPago', metodos);

    } catch (error) {
        console.error("❌ Error al cargar selects:", error);
    }
}

function extraerArray(response) {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.status === 'success' && Array.isArray(response.data)) return response.data; 
    return [];
}

function populateSelect(selectId, data) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">Seleccione una opción...</option>';

    if (!Array.isArray(data) || data.length === 0) {
        selectElement.innerHTML += '<option value="" disabled>No hay opciones</option>';
        return;
    }

    data.forEach(item => {
        const option = document.createElement('option');
        // Soporte para id/id_algo y nombre/lugar
        const id = item.id ?? item.id_vendedor ?? item.id_repartidor ?? item.id_destino ?? item.id_metodo_pago;
        const nombre = item.nombre ?? item.lugar ?? item.descripcion ?? 'Sin nombre';
        
        option.value = String(id);
        option.textContent = String(nombre).slice(0, 50);
        selectElement.appendChild(option);
    });
}

// ============================================
// RENDERIZADO DE DATOS
// ============================================
function renderizarTodo(repartos) {
    const safeRepartos = Array.isArray(repartos) ? repartos : [];
    renderRepartosActivos(safeRepartos);
    renderRepartosFinalizados(safeRepartos);
    renderVistaRapida(safeRepartos);
}

function renderRepartosActivos(repartos) {
    const tabla = document.getElementById('tablaActivos');
    const empty = document.getElementById('emptyActivos');
    if (!tabla || !empty) return;

    const activos = repartos.filter(r => {
        const estado = r.estado;
        return estado === 'activo' || estado === 'pendiente' || estado === 'en curso' || estado === 'encurso';
    });

    if (activos.length === 0) {
        tabla.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    tabla.innerHTML = activos.map(reparto => `
        <tr data-id="${reparto.id_reparto}">
            <td>${escapeHtml(reparto.ticket)}</td>
            <td>${escapeHtml(reparto.destino)}</td>
            <td>${escapeHtml(reparto.repartidor)}</td>
            <td>${escapeHtml(reparto.vendedor)}</td>
            <td>${formatoSeguro(reparto.hora_salida_raw)}</td>
            <td>
                <button class="btn-finalizar" data-id="${reparto.id_reparto}">
                    <i class="fas fa-check"></i> Finalizar
                </button>
            </td>
        </tr>
    `).join('');
}

function renderRepartosFinalizados(repartos) {
    const tabla = document.getElementById('tablaFinalizados');
    const empty = document.getElementById('emptyFinalizados');
    if (!tabla || !empty) return;

    const finalizados = repartos.filter(r => {
        const estado = r.estado;
        return estado === 'finalizado' || estado === 'completado' || estado === 'entregado' || estado === 'terminado';
    });

    if (finalizados.length === 0) {
        tabla.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    tabla.innerHTML = finalizados.map(reparto => `
        <tr data-id="${reparto.id_reparto}">
            <td>${escapeHtml(reparto.ticket)}</td>
            <td>${escapeHtml(reparto.destino)}</td>
            <td>${escapeHtml(reparto.repartidor)}</td>
            <td>${escapeHtml(reparto.vendedor)}</td>
            <td>${formatoSeguro(reparto.hora_salida_raw)}</td>
            <td>${formatoSeguro(reparto.hora_llegada_raw)}</td>
        </tr>
    `).join('');
}

function renderVistaRapida(repartos) {
    const kpiTotal = document.getElementById('kpiTotalRepartos');
    const kpiActivos = document.getElementById('kpiRepartosActivos');
    const kpiRecaudado = document.getElementById('kpiTotalRecaudado');
    const container = document.getElementById('vistaRapidaContainer');

    if (!container) return;

    const list = Array.isArray(repartos) ? repartos : [];
    
    // Filtros
    const activos = list.filter(r => ['activo', 'pendiente', 'en curso', 'encurso'].includes(r.estado));
    const finalizados = list.filter(r => ['finalizado', 'completado', 'entregado'].includes(r.estado));
    const totalRecaudado = finalizados.reduce((acc, r) => acc + r.monto_total, 0);

    // KPIs
    if (kpiTotal) kpiTotal.textContent = list.length;
    if (kpiActivos) kpiActivos.textContent = activos.length;
    if (kpiRecaudado) kpiRecaudado.textContent = `$${totalRecaudado.toFixed(2)}`;

    // Tarjetas recientes
    const ultimos = [...list].sort((a, b) => (b.id_reparto || 0) - (a.id_reparto || 0)).slice(0, 5);

    if (ultimos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No hay movimientos recientes</p>';
        return;
    }

    container.innerHTML = ultimos.map(reparto => {
        const isActivo = ['activo', 'pendiente', 'en curso'].includes(reparto.estado);
        const estadoDisplay = isActivo ? 'En Curso' : 'Finalizado';
        const estadoClass = isActivo ? 'activo' : 'finalizado';
        
        return `
            <div class="reparto-card">
                <div class="reparto-card-header">
                    <h3>Ticket: ${escapeHtml(reparto.ticket)}</h3>
                    <span class="reparto-card-badge badge-${estadoClass}">${estadoDisplay}</span>
                </div>
                <div class="reparto-card-body">
                    <div class="reparto-card-info"><strong>Destino:</strong> ${escapeHtml(reparto.destino)}</div>
                    <div class="reparto-card-info"><strong>Repartidor:</strong> ${escapeHtml(reparto.repartidor)}</div>
                    <div class="reparto-card-info"><strong>Monto:</strong> $${reparto.monto_total.toFixed(2)}</div>
                    <div class="reparto-card-info"><strong>Hora:</strong> ${formatoSeguro(reparto.hora_salida_raw)}</div>
                </div>
            </div>
        `;
    }).join('');
}


// ============================================
// GUARDAR REPARTO 
// ============================================
async function guardarReparto() {
    debug('💾 Iniciando guardado de reparto...');

    const datos = {
        ticket: document.getElementById('nTicket')?.value.trim() || '',
        id_destino: document.getElementById('destino')?.value || '',
        id_repartidor: document.getElementById('repartidor')?.value || '',
        id_vendedor: document.getElementById('vendedor')?.value || '',
        id_metodo_pago: document.getElementById('metodoPago')?.value || '', 
        monto_total: parseAmountValue(document.getElementById('montoTotal')?.value),
        monto_pagado: parseAmountValue(document.getElementById('montoPagado')?.value)
    };

    // Validaciones
    const errores = [];
    if (!datos.ticket) errores.push('Número de Ticket');
    if (!datos.id_destino) errores.push('Destino');
    if (!datos.id_repartidor) errores.push('Repartidor');
    if (!datos.id_vendedor) errores.push('Vendedor');
    if (!datos.id_metodo_pago) errores.push('Método de Pago');
    if (datos.monto_total <= 0) errores.push('Monto Total');

    if (errores.length > 0) {
        Swal.fire('Campos incompletos', `Faltan: ${errores.join(', ')}`, 'warning');
        return;
    }

    // Validar duplicados localmente
    const duplicado = todosLosRepartosCache.some(r => String(r.ticket).toLowerCase() === datos.ticket.toLowerCase());
    if (duplicado) {
        Swal.fire('Ticket duplicado', `El ticket ${datos.ticket} ya existe`, 'error');
        return;
    }

    // PREPARAR DATOS PARA JAVA (Usamos CamelCase standard)
    const payload = {
        ticket: datos.ticket,
        idDestino: parseInt(datos.id_destino),
        idRepartidor: parseInt(datos.id_repartidor),
        idVendedor: parseInt(datos.id_vendedor),
        idMetodoPago: parseInt(datos.id_metodo_pago),
        montoTotal: datos.monto_total,
        estado: 'Activo' // Valor por defecto
    };

    try {
        const response = await api.saveReparto(payload);

        if (response && (response.status === 'success' || !response.error)) {
            await cargarYRenderizarRepartos(); 
            Swal.fire('¡Guardado!', 'Reparto registrado', 'success');
            document.getElementById('formRegistro')?.reset();
            calcularCambio();
        } else {
            throw new Error(response?.message || 'Error desconocido');
        }
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        Swal.fire('Error', 'No se pudo guardar el reparto', 'error');
    }
}

// ============================================
// FINALIZAR REPARTO (Lógica para PUT)
// ============================================
async function finalizarReparto(id) {
    const confirmacion = await Swal.fire({
        title: '¿Finalizar reparto?',
        text: 'Se marcará como completado',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar'
    });
    
    if (!confirmacion.isConfirmed) return;
    
    // 1. Buscamos el reparto actual en caché para no enviar campos vacíos
    const repartoActual = todosLosRepartosCache.find(r => r.id_reparto == id);

    if (!repartoActual) {
        Swal.fire('Error', 'No se encontró el reparto en memoria para finalizarlo.', 'error');
        return;
    }

    // 2. Preparamos el objeto completo para el PUT (Java suele requerir todo el objeto)
    // Mapeamos de vuelta a los nombres que espera Java (CamelCase)
    const payload = {
        id: id,
        ticket: repartoActual.ticket,
        idDestino: repartoActual.id_destino,
        idRepartidor: repartoActual.id_repartidor,
        idVendedor: repartoActual.id_vendedor,
        idMetodoPago: repartoActual.id_metodo_pago,
        montoTotal: repartoActual.monto_total,
        estado: 'Finalizado', // El cambio importante
        horaLlegada: new Date().toISOString() // Opcional, por si el backend lo requiere
    };
    
    try {
        // Usamos updateReparto en lugar de una función inexistente "finalizarReparto"
        const response = await api.updateReparto(id, payload);
        
        if (response && (response.status === 'success' || !response.error)) {
            await cargarYRenderizarRepartos(); 
            Swal.fire('¡Finalizado!', 'El reparto se completó exitosamente', 'success');
        } else {
            throw new Error(response?.message || 'Error al finalizar');
        }
    } catch (error) {
        console.error('❌ Error al finalizar:', error);
        Swal.fire('Error', error.message || 'No se pudo finalizar', 'error');
    }
}

// ============================================
// EVENTOS
// ============================================
function setupEventListeners() {
    // Pestañas
    document.querySelectorAll('.tab-icon').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-icon').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const pane = document.getElementById(tab.dataset.tab);
            if (pane) pane.classList.add('active');
        });
    });

    // Inputs numéricos
    ['nTicket', 'montoTotal', 'montoPagado'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', (e) => {
            if (id === 'nTicket') e.target.value = e.target.value.replace(/[^0-9-]/g, '').slice(0, 20); 
            else {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                if (val.split('.').length > 2) val = val.replace(/\.+$/, "");
                e.target.value = val;
            }
            calcularCambio();
        });
    });

    // Formulario
    const form = document.getElementById('formRegistro');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarReparto();
        });
        form.addEventListener('reset', () => setTimeout(calcularCambio, 0));
    }

    // Tabla Activos (Delegación de eventos)
    const tablaActivos = document.getElementById('tablaActivos');
    if (tablaActivos) {
        tablaActivos.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-finalizar');
            if (btn) {
                const id = Number(btn.dataset.id);
                await finalizarReparto(id);
            }
        });
    }

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar sesión?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    window.location.href = '../html/index.html';
                }
            });
        });
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bitácora iniciada (Modo Java AWS)...');
    setupUI();
    setupEventListeners();
    actualizarRelojSalida();
    setInterval(actualizarRelojSalida, 60000);
    cargarSelects();
    cargarYRenderizarRepartos();
});