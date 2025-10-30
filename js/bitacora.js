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

/** Función crítica: Previene XSS (Cross-Site Scripting) */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Función crítica: Parsea el valor monetario a número */
function parseAmountValue(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && !isNaN(v)) return v;
    const s = String(v);
    const cleaned = s.replace(/[^\d.]/g, ''); 
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

/** * CORRECCIÓN HORA: Convierte HH:MM (24h) a H:MM AM/PM sin problemas de Zona Horaria.
 * @param {string} timeString - La hora en formato 24h (ej: "18:30:00").
 */
function formatTo12Hour(timeString) {
    if (!timeString || timeString === '--:--' || timeString === null) return '--:--';
    try {
        // Aseguramos que solo tomamos la parte de la hora y minuto
        const timePart = String(timeString).split(' ')[0];
        const [hours, minutes] = timePart.split(':');
        
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12; // Convierte 0 (medianoche) a 12
        const min = String(minutes).padStart(2, '0');
        
        return `${h12}:${min} ${ampm}`;
        
    } catch (e) {
        debug('⚠️ Error al formatear hora:', timeString, e);
        return timeString;
    }
}

/** * CORRECCIÓN HORA FINAL: Función auxiliar que maneja el offset de UTC (8 horas).
 */
function formatoSeguro(timeVal) {
    if (timeVal === null || timeVal === undefined || timeVal === '') return '--:--';
    const s = String(timeVal).trim();
    
    // 1. Si es formato de hora simple (ej: 14:30), usamos la función custom
    if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(s)) {
        return formatTo12Hour(s);
    }

    // 2. Si es un timestamp completo (ej: 2023-10-25 14:30:00)
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        // La corrección más estable para el desfase de 8 horas es usar UTC.
        const utc_h = String(d.getUTCHours()).padStart(2, '0');
        const utc_m = String(d.getUTCMinutes()).padStart(2, '0');
        return formatTo12Hour(`${utc_h}:${utc_m}`);
    }

    return s;
}

/** Función crítica: Calcula el cambio para el formulario */
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
// FIN ZONA DE UTILIDADES
// --------------------------------------------

// ============================================
// LÓGICA DE UI (SIDEBAR, USUARIO, PERMISOS)
// ============================================
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
// NORMALIZACIÓN DE DATOS (CORREGIDA PARA CAPTURAR MÁS CAMPOS DE MONTO)
// ============================================
function normalizarReparto(r) {
    const rawEstado = r.estado ?? r.status ?? r.State ?? r.STATUS ?? 'activo';
    const rawHoraSalida = r.hora_salida ?? r.horaSalida ?? r.hora ?? r.created_at ?? null;
    const rawHoraLlegada = r.hora_llegada ?? r.horaLlegada ?? r.hora_llegada ?? null;

    // CORRECCIÓN MONTO: Buscamos el monto en múltiples variantes y lo parseamos.
    // PRIORIZAMOS r.monto_total_raw (si existe) y luego los campos de la API.
    const montoRaw = r.monto_total_raw ?? r.monto_total ?? r.monto ?? r.total ?? r.Total ?? r.MontoTotal ?? r.monto_final ?? r.Monto ?? 0;
    const monto_num = parseAmountValue(montoRaw);

    return {
        id_reparto: r.id_reparto ?? r.id ?? r.idReparto ?? r.ID ?? null,
        ticket: String(r.ticket ?? r.num_ticket ?? r.numeroTicket ?? r.Ticket ?? '').slice(0, 20),
        destino: String(r.destino ?? r.lugar ?? r.nombre_destino ?? r.Destino ?? '').slice(0, 100),
        repartidor: String(r.repartidor ?? r.nombre_repartidor ?? r.Repartidor ?? '').slice(0, 100),
        vendedor: String(r.vendedor ?? r.nombre_vendedor ?? r.Vendedor ?? '').slice(0, 100),
        hora_salida_raw: rawHoraSalida,
        hora_llegada_raw: rawHoraLlegada,
        estado: String(r.estado ?? r.status ?? 'activo').trim().toLowerCase(),
        monto_total: monto_num, // USAR ESTE CAMPO NUMÉRICO EN RENDERIZADO
        monto_total_raw: montoRaw,
        monto_pagado: Number(r.monto_pagado ?? r.pagado ?? 0) || 0,
        metodo_pago: r.metodo_pago ?? r.metodoPago ?? r.MetodoPago ?? '',
        created_at: r.created_at ?? r.createdAt ?? r.created ?? null
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
        if (!dataArray) throw new Error('No se pudo extraer el array de repartos de la respuesta');
        
        const normalized = dataArray.map(r => normalizarReparto(r));
        
        todosLosRepartosCache = normalized;
        renderizarTodo(normalized);

        try { calcularCambio(); } catch(e) { debug('⚠️ calcularCambio error:', e); }

        debug('✅ Repartos cargados y renderizados exitosamente');
        
    } catch (error) {
        console.error("❌ Error al cargar repartos:", error);
        Swal.fire({ icon: 'error', title: 'Error al cargar datos', text: 'No se pudieron cargar los repartos. Verifica la consola para más detalles.', footer: error.message });
    }
}

// ============================================
// CARGA DE SELECTS
// ============================================
async function cargarSelects() {
    debug('📋 Cargando selects...');
    
    try {
        const [vendedoresRes, repartidoresRes, destinosRes, metodosRes] = await Promise.all([
            api.getVendedores().catch(e => { debug('❌ Error vendedores:', e); return { data: [] }; }),
            api.getRepartidores().catch(e => { debug('❌ Error repartidores:', e); return { data: [] }; }),
            api.getDestinos().catch(e => { debug('❌ Error destinos:', e); return { data: [] }; }),
            api.getMetodosPagoActivos().catch(e => { debug('❌ Error métodos:', e); return { data: [] }; }) // <-- ¡CORRECCIÓN APLICADA!
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
    if (response?.repartos && Array.isArray(response.repartos)) return response.repartos;
    if (response?.status === 'success' && Array.isArray(response.data)) return response.data; 
    return [];
}

function populateSelect(selectId, data) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        debug(`⚠️ Select no encontrado: ${selectId}`);
        return;
    }

    selectElement.innerHTML = '<option value="">Seleccione una opción...</option>';

    if (!Array.isArray(data) || data.length === 0) {
        selectElement.innerHTML += '<option value="" disabled>No hay opciones disponibles</option>';
        debug(`⚠️ Select ${selectId} sin datos`);
        return;
    }

    data.forEach(item => {
        const option = document.createElement('option');
        
        const id = item.id ?? item.ID ?? item.id_vendedor ?? item.id_repartidor ?? item.id_destino ?? item.id_metodo_pago ?? '';
        const nombre = item.nombre ?? item.Nombre ?? item.name ?? item.lugar ?? item.descripcion ?? JSON.stringify(item);
        
        option.value = String(id);
        option.textContent = String(nombre).slice(0, 50);
        selectElement.appendChild(option);
    });
    
    debug(`✅ Select ${selectId} poblado con ${data.length} opciones`);
}

// ============================================
// RENDERIZADO DE DATOS
// ============================================
function renderizarTodo(repartos) {
    todosLosRepartosCache = Array.isArray(repartos) ? repartos : [];
    renderRepartosActivos(todosLosRepartosCache);
    renderRepartosFinalizados(todosLosRepartosCache);
    renderVistaRapida(todosLosRepartosCache);
}

function renderRepartosActivos(repartos) {
    const tabla = document.getElementById('tablaActivos');
    const empty = document.getElementById('emptyActivos');
    if (!tabla || !empty) return;

    const activos = repartos.filter(r => {
        const estado = String(r.estado ?? '').trim().toLowerCase();
        return estado === 'activo' || estado === 'en curso' || estado === 'encurso' || estado === 'pendiente';
    });

    if (activos.length === 0) {
        tabla.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    tabla.innerHTML = activos.map(reparto => `
        <tr data-id="${reparto.id_reparto}" data-estado="${reparto.estado}">
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
        const estado = String(r.estado ?? '').trim().toLowerCase();
        return estado === 'finalizado' || estado === 'completado' || estado === 'entregado' || estado === 'terminado';
    });

    if (finalizados.length === 0) {
        tabla.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    tabla.innerHTML = finalizados.map(reparto => `
        <tr data-id="${reparto.id_reparto}" data-estado="${reparto.estado}">
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

    if (!kpiTotal || !container) return;

    const list = Array.isArray(repartos) ? repartos : [];

    const activos = list.filter(r => {
        const estado = String(r.estado ?? '').trim().toLowerCase();
        return estado === 'activo' || estado === 'en curso' || estado === 'encurso' || estado === 'pendiente';
    });

    // Filtrar solo repartos FINALIZADOS para el KPI de recaudado.
    const finalizados = list.filter(r => {
        const estado = String(r.estado ?? '').trim().toLowerCase();
        return estado === 'finalizado' || estado === 'completado' || estado === 'entregado' || estado === 'terminado';
    });

    // Sumar solo los montos de los repartos finalizados.
    const totalRecaudado = finalizados.reduce((acc, r) => acc + r.monto_total, 0);

    if (kpiTotal) kpiTotal.textContent = list.length;
    if (kpiActivos) kpiActivos.textContent = activos.length;
    if (kpiRecaudado) kpiRecaudado.textContent = `$${totalRecaudado.toFixed(2)}`;

    debug('RENDER DEBUG - vistaRapida list sample:', list.slice(0,6).map(x => ({
        id: x.id_reparto,
        ticket: x.ticket,
        monto_total: x.monto_total,
        estado: x.estado
    })));

    // Ordenar por ID descendente (los más recientes)
    const ultimos = [...list].sort((a, b) => (b.id_reparto || 0) - (a.id_reparto || 0)).slice(0, 5);

    if (ultimos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">No hay repartos registrados</p>';
        return;
    }

    container.innerHTML = ultimos.map(reparto => {
        const estadoLower = String(reparto.estado ?? '').trim().toLowerCase();
        const estadoDisplay = (estadoLower === 'activo' || estadoLower === 'pendiente' || estadoLower === 'en curso' || estadoLower === 'encurso') ? 'En Curso' : 'Finalizado';
        const estadoClass = (estadoLower === 'activo' || estadoLower === 'pendiente' || estadoLower === 'en curso' || estadoLower === 'encurso') ? 'activo' : 'finalizado';
        
        // CORRECCIÓN MONTO: Aseguramos que se muestre el monto parseado
        const monto = parseAmountValue(reparto.monto_total);
        const hora = formatoSeguro(reparto.hora_salida_raw);
        return `
            <div class="reparto-card">
                <div class="reparto-card-header">
                    <h3>Ticket: ${escapeHtml(reparto.ticket)}</h3>
                    <span class="reparto-card-badge badge-${estadoClass}">${estadoDisplay}</span>
                </div>
                <div class="reparto-card-body">
                    <div class="reparto-card-info"><strong>Destino:</strong> ${escapeHtml(reparto.destino)}</div>
                    <div class="reparto-card-info"><strong>Repartidor:</strong> ${escapeHtml(reparto.repartidor)}</div>
                    <div class="reparto-card-info"><strong>Monto:</strong> $${monto.toFixed(2)}</div>
                    <div class="reparto-card-info"><strong>Hora:</strong> ${escapeHtml(hora)}</div>
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

    // CORRECCIÓN AQUÍ: Cambiado 'metodo_pago' a 'id_metodo_pago' para coincidir con la API
    const datos = {
        ticket: document.getElementById('nTicket')?.value.trim() || '',
        id_destino: document.getElementById('destino')?.value || '',
        id_repartidor: document.getElementById('repartidor')?.value || '',
        id_vendedor: document.getElementById('vendedor')?.value || '',
        id_metodo_pago: document.getElementById('metodoPago')?.value || '', // <--- CORRECCIÓN AQUÍ
        monto_total: parseAmountValue(document.getElementById('montoTotal')?.value),
        monto_pagado: parseAmountValue(document.getElementById('montoPagado')?.value) // Este se usa para calcular cambio, no se envía a createReparto
    };

    // Crear un objeto solo con los datos que espera la API 'create_reparto'
    const datosParaApi = {
        ticket: datos.ticket,
        id_destino: datos.id_destino,
        id_repartidor: datos.id_repartidor,
        id_vendedor: datos.id_vendedor,
        id_metodo_pago: datos.id_metodo_pago, // <-- Dato corregido
        monto_total: datos.monto_total
    };


    debug('📝 Datos del formulario:', datos);
    debug('📊 Datos para enviar a API:', datosParaApi);

    // Validaciones (Usando datosParaApi donde corresponda)
    const errores = [];
    if (!datosParaApi.ticket) errores.push('Número de Ticket');
    if (!datosParaApi.id_destino) errores.push('Destino');
    if (!datosParaApi.id_repartidor) errores.push('Repartidor');
    if (!datosParaApi.id_vendedor) errores.push('Vendedor');
    if (!datosParaApi.id_metodo_pago) errores.push('Método de Pago'); // <-- Validando el corregido
    if (datosParaApi.monto_total <= 0) errores.push('Monto Total (debe ser mayor a 0)');
    // La validación de monto_pagado se hace antes de enviar, pero no se envía a createReparto
    if (datos.monto_pagado < datos.monto_total) errores.push('Monto Pagado (insuficiente)');

    if (errores.length > 0) {
        Swal.fire('Campos incompletos o inválidos', `Revisa: ${errores.join(', ')}`, 'warning');
        return;
    }

    // Verificar duplicados (Usando el ticket de datosParaApi)
    const duplicado = todosLosRepartosCache.some(r =>
        String(r.ticket).toLowerCase() === datosParaApi.ticket.toLowerCase()
    );

    if (duplicado) {
        Swal.fire('Ticket duplicado', `El ticket "${datosParaApi.ticket}" ya existe`, 'error');
        return;
    }

    try {
        // Enviar solo los datos necesarios a la API
        const response = await api.saveReparto(datosParaApi); // <--- USAR datosParaApi

        if (response && (response.status === 'success' || response.success)) {
            // ¡ÉXITO! Recargar todo y limpiar
            await cargarYRenderizarRepartos(); // <<-- Esto actualiza las vistas
            Swal.fire('¡Guardado!', 'Reparto registrado correctamente', 'success');
            document.getElementById('formRegistro')?.reset();
            calcularCambio(); // Recalcular cambio (debería ser $0.00)
        } else {
            // Error devuelto por la API
            throw new Error(response?.message || response?.error || 'Error desconocido al guardar');
        }
    } catch (error) {
        // Error de red o excepción
        console.error('❌ Error al guardar:', error);
        Swal.fire('Error', error.message || 'No se pudo guardar el reparto', 'error');
    }
}

// ============================================
// FINALIZAR REPARTO
// ============================================
async function finalizarReparto(id) {
    const confirmacion = await Swal.fire({
        title: '¿Finalizar reparto?',
        text: 'Se marcará como completado',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!confirmacion.isConfirmed) return;
    
    try {
        const response = await api.finalizarReparto(id);
        
        if (response && (response.status === 'success' || response.success)) {
            await cargarYRenderizarRepartos(); 
            Swal.fire('¡Finalizado!', 'El reparto se completó exitosamente', 'success');
        } else {
            throw new Error(response?.message || response?.error || 'Error al finalizar');
        }
    } catch (error) {
        console.error('❌ Error al finalizar:', error);
        Swal.fire('Error', error.message || 'No se pudo finalizar el reparto', 'error');
    }
}

// ============================================
// EVENTOS (Incluye la corrección del ticket)
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

    // Inputs numéricos con límites (CORREGIDO: Ticket solo números y guiones)
    ['nTicket', 'montoTotal', 'montoPagado'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            if (id === 'nTicket') {
                e.target.value = e.target.value.replace(/[^0-9-]/g, '').slice(0, 20); 
            } else {
                let value = e.target.value.replace(/[^0-9.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                e.target.value = value.slice(0, 15);
            }
            calcularCambio();
        });
    });

    // Formulario de registro
    const form = document.getElementById('formRegistro');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarReparto();
        });
        
        form.addEventListener('reset', () => {
            setTimeout(calcularCambio, 0);
        });
    }

    // Tabla de activos - Finalizar
    const tablaActivos = document.getElementById('tablaActivos');
    if (tablaActivos) {
        tablaActivos.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-finalizar')) {
                const btn = e.target.closest('.btn-finalizar');
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
                title: '¿Cerrar sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = 'index.html';
button               }
            });
        });
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación Bitácora de Repartos...');
    
    setupUI();
    setupEventListeners();
    actualizarRelojSalida();
    setInterval(actualizarRelojSalida, 60000);
    
    cargarSelects();
    cargarYRenderizarRepartos();
    
    debug('✅ Inicialización completada');
});