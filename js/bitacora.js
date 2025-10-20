import { api } from './apiService.js'; // <-- añade si falta
let todosLosRepartosCache = []; // <-- AÑADIR ESTA LÍNEA

document.addEventListener('DOMContentLoaded', function() {

    // ============================================
    // LÓGICA DE UI (SIDEBAR, USUARIO, PERMISOS)
    // ============================================
    function setupUI() {
        const userRole = localStorage.getItem('currentUserRole');
        const username = localStorage.getItem('currentUser');
        const usernameDisplay = document.getElementById('username-display');
        if (username && usernameDisplay) { usernameDisplay.textContent = username; }

        const pagoLink = document.getElementById('pago-link');
        if (userRole === 'admin' && pagoLink) { pagoLink.style.display = 'list-item'; }
    }

    // ============================================
    // LÓGICA PRINCIPAL DE DATOS
    // ============================================
    async function cargarYRenderizarRepartos() {
        try {
            const response = await api.getRepartos();
            if (response.status === 'success' && Array.isArray(response.data)) {
                // Normalizar campos para evitar inconsistencias entre API y fallback
                const normalized = response.data.map(r => {
                    const rawEstado = r.estado ?? r.status ?? 'activo';
                    const estadoNormalized = String(rawEstado).toLowerCase();
                    return {
                        id_reparto: r.id_reparto ?? r.id ?? r.idReparto ?? r.id_reparto,
                        ticket: r.ticket ?? r.num_ticket ?? r.numeroTicket ?? '',
                        destino: r.destino ?? r.lugar ?? r.nombre_destino ?? '',
                        repartidor: r.repartidor ?? r.nombre_repartidor ?? r.nombre ?? '',
                        vendedor: r.vendedor ?? r.nombre_vendedor ?? r.nombre_vendedor ?? '',
                        hora_salida: r.hora_salida ?? r.horaSalida ?? '--:--',
                        hora_llegada: r.hora_llegada ?? r.horaLlegada ?? null,
                        estado: estadoNormalized,
                        monto_total: Number(r.monto_total ?? r.monto ?? r.total ?? 0),
                        monto_pagado: Number(r.monto_pagado ?? r.pagado ?? 0)
                    };
                });

                console.log('cargarYRenderizarRepartos -> normalized count:', normalized.length);
                // contar por estado
                console.log('estados count:', normalized.reduce((acc, it) => { acc[it.estado] = (acc[it.estado]||0)+1; return acc; }, {}));
                console.log('primeros 5 items (normalized):', normalized.slice(0,5));

                renderizarTodo(normalized);
            } else {
                throw new Error(response.message || 'Respuesta inesperada del servidor');
            }
        } catch (error) {
            console.error("Error al cargar repartos:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos de repartos.', 'error');
        }
    }

    async function cargarSelects() {
        try {
            const [vendedoresRes, repartidoresRes, destinosRes, metodosRaw] = await Promise.all([
                api.getVendedores(),
                api.getRepartidores(),
                api.getDestinos(),
                (api.getMetodosPago ? api.getMetodosPago() : Promise.resolve({ data: [] }))
            ]);

            const vendedoresData = Array.isArray(vendedoresRes) ? vendedoresRes : (vendedoresRes?.data ?? vendedoresRes ?? []);
            const repartidoresData = Array.isArray(repartidoresRes) ? repartidoresRes : (repartidoresRes?.data ?? repartidoresRes ?? []);
            const destinosData = Array.isArray(destinosRes) ? destinosRes : (destinosRes?.data ?? destinosRes ?? []);
            const metodosRawData = Array.isArray(metodosRaw) ? metodosRaw : (metodosRaw?.data ?? metodosRaw ?? []);

            // Normalizar métodos: aseguramos { id, nombre }
            const metodosData = (metodosRawData || []).map(item => ({
                id: item.id ?? item.id_metodo_pago ?? item.id_metodo ?? item.idMetodoPago ?? item.id_metodopago ?? item.value ?? '',
                nombre: item.nombre ?? item.nombre_metodo ?? item.name ?? item.label ?? JSON.stringify(item)
            }));

            console.debug('metodosData:', metodosData); // para depuración en consola

            populateSelect('vendedor', vendedoresData, null, null);
            populateSelect('repartidor', repartidoresData, null, null);
            populateSelect('destino', destinosData, null, null);

            // intenta popular ambos ids por compatibilidad
            populateSelect('metodo', metodosData, 'id', 'nombre');
            populateSelect('metodoPago', metodosData, 'id', 'nombre');

        } catch (error) {
            console.error("Error al cargar datos para los selects:", error);
        }
    }

    function populateSelect(selectId, data, valueKey, textKey) {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;

        const items = Array.isArray(data) ? data : [];
        selectElement.innerHTML = '';

        if (items.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No hay opciones';
            selectElement.appendChild(opt);
            return;
        }

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Seleccione una opción...';
        selectElement.appendChild(defaultOpt);

        items.forEach(item => {
            const option = document.createElement('option');
            const vKey = valueKey ?? (item.id !== undefined ? 'id' : Object.keys(item).find(k => /id/i.test(k)) ?? 'id');
            const tKey = textKey ?? (item.nombre !== undefined ? 'nombre' : Object.keys(item).find(k => /nombre|name|label/i.test(k)) ?? Object.keys(item)[0]);

            option.value = String(item[vKey] ?? item.id ?? '');
            option.textContent = String(item[tKey] ?? item.nombre ?? JSON.stringify(item));
            selectElement.appendChild(option);
        });
    }
    
    // ============================================
    // FUNCIONES DE RENDERIZADO (DIBUJAR EN PANTALLA)
    // ============================================
    function renderizarTodo(todosLosRepartos) {
        todosLosRepartosCache = Array.isArray(todosLosRepartos) ? todosLosRepartos : [];
        renderRepartosActivos(todosLosRepartosCache);
        renderRepartosFinalizados(todosLosRepartosCache);
        renderVistaRapida(todosLosRepartosCache);
    }

    function renderRepartosActivos(todosLosRepartos) {
        const tablaActivos = document.getElementById('tablaActivos');
        const emptyActivos = document.getElementById('emptyActivos');
        const repartosActivos = (todosLosRepartos || []).filter(r => String(r.estado).toLowerCase() === 'activo');

        if (!tablaActivos || !emptyActivos) return;
        emptyActivos.style.display = repartosActivos.length === 0 ? 'block' : 'none';
        
        tablaActivos.innerHTML = repartosActivos.map(reparto => `
            <tr data-id="${reparto.id_reparto}">
                <td>${reparto.ticket}</td>
                <td>${reparto.destino}</td>
                <td>${reparto.repartidor}</td>
                <td>${reparto.vendedor}</td>
                <td>${formatTo12Hour(reparto.hora_salida)}</td>
                <td><button class="btn-finalizar" data-id="${reparto.id_reparto}">Finalizar</button></td>
            </tr>`).join('');
    }

    function renderRepartosFinalizados(todosLosRepartos) {
        const tablaFinalizados = document.getElementById('tablaFinalizados');
        const emptyFinalizados = document.getElementById('emptyFinalizados');
        const repartosFinalizados = (todosLosRepartos || []).filter(r => String(r.estado).toLowerCase() === 'finalizado');

        if (!tablaFinalizados || !emptyFinalizados) return;
        emptyFinalizados.style.display = repartosFinalizados.length === 0 ? 'block' : 'none';

        tablaFinalizados.innerHTML = repartosFinalizados.map(reparto => `
            <tr data-id="${reparto.id_reparto}">
                <td>${reparto.ticket}</td>
                <td>${reparto.destino}</td>
                <td>${reparto.repartidor}</td>
                <td>${reparto.vendedor}</td>
                <td>${formatTo12Hour(reparto.hora_salida)}</td>
                <td>${formatTo12Hour(reparto.hora_llegada)}</td>
            </tr>`).join('');
    }

    function renderVistaRapida(todosLosRepartos) {
        const kpiTotal = document.getElementById('kpiTotalRepartos');
        const kpiActivos = document.getElementById('kpiRepartosActivos');
        const kpiRecaudado = document.getElementById('kpiTotalRecaudado');
        const vistaRapidaContainer = document.getElementById('vistaRapidaContainer');
        if (!kpiTotal || !vistaRapidaContainer) return;

        const repartosActivos = (todosLosRepartos || []).filter(r => r.estado === 'activo');
        kpiTotal.textContent = (todosLosRepartos || []).length;
        kpiActivos.textContent = repartosActivos.length;
        const totalRecaudado = (todosLosRepartos || []).reduce((sum, reparto) => sum + parseFloat(reparto.monto_total || 0), 0);
        if (kpiRecaudado) kpiRecaudado.textContent = `$${totalRecaudado.toFixed(2)}`;
        
        const ultimosRepartos = (todosLosRepartos || []).slice(0, 5); // Ya vienen ordenados desde la API
        vistaRapidaContainer.innerHTML = ultimosRepartos.length ? ultimosRepartos.map(reparto => `
            <div class="reparto-card">
                <p><strong>Ticket:</strong> ${reparto.ticket}</p>
                <p><strong>Destino:</strong> ${reparto.destino}</p>
                <p><strong>Estado:</strong> <span class="status-${reparto.estado}">${reparto.estado}</span></p>
            </div>`).join('') : '<p>No hay repartos recientes.</p>';
    }

    // ============================================
    // FUNCIONES DE FORMULARIO Y UTILIDADES
    // ============================================
    function actualizarRelojSalida() {
        const reloj = document.getElementById('horaSalidaReloj');
        if (reloj) {
            reloj.textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        }
    }
    
    function calcularCambio() {
        const montoTotalEl = document.getElementById('montoTotal');
        const montoPagadoEl = document.getElementById('montoPagado');
        const campo = document.getElementById('cambioDevolver');
        if (!campo) return;

        const rawTotal = montoTotalEl ? String(montoTotalEl.value).replace(/[^0-9.-]/g, '') : '';
        const rawPagado = montoPagadoEl ? String(montoPagadoEl.value).replace(/[^0-9.-]/g, '') : '';

        const montoTotal = parseFloat(rawTotal) || 0;
        const montoPagado = parseFloat(rawPagado) || 0;
        const cambio = montoPagado - montoTotal;
        const formatted = cambio >= 0 ? `$${cambio.toFixed(2)}` : '$0.00';

        // Si es input usamos .value, si es span/div usamos textContent
        if ('value' in campo) campo.value = formatted;
        else campo.textContent = formatted;
    }

    function formatTo12Hour(timeString) {
        if (!timeString || timeString === '--:--') return '--:--';
        const [hours, minutes] = timeString.split(':');
        return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    // ============================================
    // MANEJO DE EVENTOS
    // ============================================
    function setupEventListeners() {
        const formRegistro = document.getElementById('formRegistro');
        const tablaActivos = document.getElementById('tablaActivos');
        const btnLogout = document.getElementById('btnLogout');
        const btnClearBitacora = document.getElementById('btnClearBitacora'); // botón opcional en tu HTML
        
        // --- CÓDIGO AÑADIDO PARA PESTAÑAS Y VALIDACIÓN ---
        
        // Lógica para la navegación por pestañas (Tabs)
        const tabs = document.querySelectorAll('.tab-icon');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Quitar 'active' de todas las pestañas y paneles
                tabs.forEach(item => item.classList.remove('active'));
                panes.forEach(pane => pane.classList.remove('active'));

                // Añadir 'active' a la pestaña clickeada y a su panel correspondiente
                tab.classList.add('active');
                const targetPane = document.getElementById(tab.dataset.tab);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });

        // Restricción para permitir solo números en los campos
        const numericInputs = ['nTicket', 'montoTotal', 'montoPagado'];
        numericInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                // establecer maxlength para ticket y sanitizar entradas
                if (id === 'nTicket') {
                    input.setAttribute('maxlength', '10'); // ajusta según necesites
                    input.addEventListener('input', (e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    });
                } else {
                    input.addEventListener('input', (e) => {
                        // Reemplaza cualquier caracter que no sea un número o punto
                        e.target.value = e.target.value.replace(/[^0-9.]/g, '');
                    });
                }
                input.addEventListener('input', calcularCambio); // actualizar cambio en vivo
            }
        });

        // Botón limpiar bitácora (si existe en HTML)
        if (btnClearBitacora) {
            btnClearBitacora.addEventListener('click', async (e) => {
                e.preventDefault();
                const confirmed = await Swal.fire({
                    title: 'Limpiar bitácora',
                    text: '¿Deseas eliminar todos los repartos registrados (esto puede afectar datos del servidor)?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, limpiar',
                    cancelButtonText: 'Cancelar'
                });
                if (!confirmed.isConfirmed) return;

                try {
                    if (api && typeof api.deleteAllRepartos === 'function') {
                        const res = await api.deleteAllRepartos();
                        if (res && res.status === 'success') {
                            await cargarYRenderizarRepartos();
                            Swal.fire('Listo', 'Bitácora limpiada en el servidor.', 'success');
                            return;
                        } else {
                            Swal.fire('Error', res?.error || 'No se pudo limpiar en el servidor.', 'error');
                        }
                    }
                } catch (err) {
                    console.error('Error al limpiar en servidor', err);
                    Swal.fire('Error', 'No se pudo limpiar en el servidor.', 'error');
                }

                // Fallback local
                todosLosRepartosCache = [];
                renderizarTodo([]);
                Swal.fire('Listo', 'Bitácora local limpiada.', 'success');
            });
        }

        // --- FIN DEL CÓDIGO AÑADIDO ---


        // Guardar nuevo reparto
        if (formRegistro) {
            // asegurar que el campo cambio se limpie al reset
            formRegistro.addEventListener('reset', () => {
                calcularCambio();
            });

            formRegistro.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Construir los datos del nuevo reparto desde el formulario
                const ticket = document.getElementById('nTicket')?.value.trim() || '';
                const id_destino = document.getElementById('destino')?.value || '';
                const id_repartidor = document.getElementById('repartidor')?.value || '';
                const id_vendedor = document.getElementById('vendedor')?.value || '';
                const metodoPago = document.getElementById('metodo')?.value || document.getElementById('metodoPago')?.value || '';
                const montoTotalRaw = document.getElementById('montoTotal')?.value.trim() ?? '';
                const montoPagadoRaw = document.getElementById('montoPagado')?.value.trim() ?? '';

                // Validaciones: ningún campo vacío
                const camposVacios = [];
                if (!ticket) camposVacios.push('Número de Ticket');
                if (!id_destino) camposVacios.push('Destino');
                if (!id_repartidor) camposVacios.push('Repartidor');
                if (!id_vendedor) camposVacios.push('Vendedor');
                if (!metodoPago) camposVacios.push('Método de Pago');
                if (montoTotalRaw === '') camposVacios.push('Monto Total');
                if (montoPagadoRaw === '') camposVacios.push('Monto Pagado');

                if (camposVacios.length > 0) {
                    Swal.fire('Campo(s) incompleto(s)', `Los siguientes campos son obligatorios: ${camposVacios.join(', ')}.`, 'warning');
                    return;
                }

                // Validar montos como números
                const monto_total = parseFloat(montoTotalRaw.replace(/[^0-9.-]/g, ''));
                const monto_pagado = parseFloat(montoPagadoRaw.replace(/[^0-9.-]/g, ''));

                if (Number.isNaN(monto_total) || Number.isNaN(monto_pagado)) {
                    Swal.fire('Valor inválido', 'El campo Monto Total y Monto Pagado deben ser números válidos.', 'warning');
                    return;
                }

                // (Opcional) validar que montos no sean negativos
                if (monto_total < 0 || monto_pagado < 0) {
                    Swal.fire('Valor inválido', 'Los montos no pueden ser negativos.', 'warning');
                    return;
                }

                // Validar que el pagado cubre al menos el total (si ese es el requisito)
                if (monto_pagado < monto_total) {
                    Swal.fire('Pago insuficiente', 'El monto pagado debe ser igual o mayor al monto total.', 'warning');
                    return;
                }

                const nuevoRepartoData = {
                    ticket,
                    id_destino,
                    id_repartidor,
                    id_vendedor,
                    metodo_pago: metodoPago,
                    monto_total,
                    monto_pagado
                };

                // 2. Verificación de ticket duplicado
                const ticketExiste = todosLosRepartosCache.some(reparto => reparto.ticket === nuevoRepartoData.ticket);

                if (ticketExiste) {
                    Swal.fire('Ticket Duplicado', `El número de ticket "${nuevoRepartoData.ticket}" ya ha sido registrado.`, 'error');
                    return; // Detiene la ejecución si el ticket ya existe
                }

                // Intentar guardar vía API si existe, si no, guardar localmente en cache (fallback)
                try {
                    if (api && typeof api.createReparto === 'function') {
                        const res = await api.createReparto(nuevoRepartoData);
                        if (res.status === 'success') {
                            await cargarYRenderizarRepartos();
                            Swal.fire('Guardado', 'Reparto registrado correctamente.', 'success');
                            formRegistro.reset();
                        } else {
                            Swal.fire('Error', res.error || res.message || 'No se pudo guardar el reparto.', 'error');
                        }
                    } else {
                        // Fallback local: generar id temporal y añadir al inicio del cache
                        const destinoText = document.getElementById('destino')?.selectedOptions[0]?.text || '';
                        const repartidorText = document.getElementById('repartidor')?.selectedOptions[0]?.text || '';
                        const vendedorText = document.getElementById('vendedor')?.selectedOptions[0]?.text || '';
                        const metodoText = document.getElementById('metodo')?.selectedOptions[0]?.text || metodoPago || '';
                        const newId = Date.now();
                        const nuevo = {
                            id_reparto: newId,
                            ticket: nuevoRepartoData.ticket,
                            destino: destinoText,
                            repartidor: repartidorText,
                            vendedor: vendedorText,
                            hora_salida: new Date().toTimeString().slice(0,5),
                            hora_llegada: null,
                            estado: 'activo',
                            monto_total: nuevoRepartoData.monto_total,
                            monto_pagado: nuevoRepartoData.monto_pagado,
                            metodo_pago: metodoText
                        };
                        todosLosRepartosCache.unshift(nuevo);
                        renderizarTodo(todosLosRepartosCache);
                        Swal.fire('Guardado (local)', 'Reparto registrado localmente.', 'success');
                        formRegistro.reset();
                    }
                } catch (err) {
                    console.error('Error guardando reparto:', err);
                    Swal.fire('Error', 'Ocurrió un error al guardar el reparto.', 'error');
                }
            });
        }
        
        // Finalizar un reparto
        if (tablaActivos) {
            tablaActivos.addEventListener('click', async (e) => {
                if (e.target.classList.contains('btn-finalizar')) {
                    const repartoIdRaw = e.target.dataset.id;
                    const repartoId = Number(repartoIdRaw);
                    console.log('Click finalizar -> dataset id:', repartoIdRaw, 'parsed:', repartoId);
                    console.log('Cache antes de finalizar (primeros 5):', todosLosRepartosCache.slice(0,5));

                    if (api && typeof api.finalizarReparto === 'function') {
                        try {
                            const result = await api.finalizarReparto(repartoId);
                            console.log('resultado finalizarReparto API:', result);
                            // si la API devuelve el item actualizado, aplicarlo localmente
                            if (result && result.status === 'success' && result.data) {
                                // actualizar cache si existe
                                const idx = todosLosRepartosCache.findIndex(r => Number(r.id_reparto) === repartoId);
                                if (idx >= 0) {
                                    todosLosRepartosCache[idx] = {
                                        ...todosLosRepartosCache[idx],
                                        ...result.data,
                                        estado: (result.data.estado ?? 'finalizado').toString().toLowerCase()
                                    };
                                    renderizarTodo(todosLosRepartosCache);
                                } else {
                                    // si no está en cache, recargar desde servidor
                                    await cargarYRenderizarRepartos();
                                }
                                Swal.fire('¡Finalizado!', 'El reparto ha sido completado.', 'success');
                            } else if (result && result.status === 'success') {
                                // respuesta vacía pero success -> recargar para asegurar datos
                                await cargarYRenderizarRepartos();
                                Swal.fire('¡Finalizado!', 'El reparto ha sido completado.', 'success');
                            } else {
                                Swal.fire('Error', 'No se pudo finalizar el reparto: ' + (result?.message || 'error desconocido'), 'error');
                            }
                        } catch (err) {
                            console.error('Error llamando API finalizarReparto', err);
                            Swal.fire('Error', 'Ocurrió un error al finalizar (API).', 'error');
                        }
                        return;
                    }

                    // Fallback local: actualizar cache y re-renderizar (asegurando coincidencia por id)
                    const idx = todosLosRepartosCache.findIndex(r => Number(r.id_reparto) === repartoId);
                    console.debug('idx en cache para finalizar:', idx, 'cache length:', todosLosRepartosCache.length);
                    if (idx >= 0) {
                        // actualizar y mover al final (para que aparezca en finalizados)
                        const item = todosLosRepartosCache[idx];
                        item.estado = 'finalizado';
                        item.hora_llegada = new Date().toTimeString().slice(0,5);
                        // mover al final del array (o según criterio)
                        todosLosRepartosCache.splice(idx, 1);
                        todosLosRepartosCache.push(item);
                        renderizarTodo(todosLosRepartosCache);
                        console.debug('Reparto finalizado en cache:', item);
                        Swal.fire('¡Finalizado (local)!', 'El reparto ha sido marcado como finalizado.', 'success');
                    } else {
                        console.warn('No se encontró reparto con id:', repartoId, 'en cache. Cache sample:', todosLosRepartosCache.slice(0,5));
                        Swal.fire('Error', 'No se encontró el reparto en cache.', 'error');
                    }
                }
            });
        }

        if (btnLogout) { 
            btnLogout.addEventListener('click', (e) => { 
                e.preventDefault();
                Swal.fire({
                    title: '¿Estás seguro?', text: "Estás a punto de cerrar la sesión.", icon: 'warning',
                    showCancelButton: true, confirmButtonColor: '#d90429', cancelButtonColor: '#6e7881',
                    confirmButtonText: 'Sí, cerrar sesión', cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('currentUserRole');
                        window.location.href = 'index.html';
                    }
                });
            }); 
        }

        document.getElementById('montoTotal')?.addEventListener('input', calcularCambio);
        document.getElementById('montoPagado')?.addEventListener('input', calcularCambio);
    }

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    setupUI();
    setupEventListeners();
    actualizarRelojSalida();
    setInterval(actualizarRelojSalida, 60000);
    cargarSelects(); // Carga las opciones de los selects
    cargarYRenderizarRepartos(); // Carga la tabla principal de repartos
});