// ========================================
// SERVICIO DE API - Integrado con api.php
// ========================================

// Asegúrate que esta ruta sea correcta para llegar a tu carpeta api desde la raíz del servidor
const BASE_URL = '/kung-fu/api';

// Función genérica para llamar a la API
async function callApi(action, method = 'GET', body = null, isGetById = false) {
    let url = `${BASE_URL}/api.php?action=${action}`;
    const options = {
        method,
        headers: {} // Inicializar headers
    };

    // Si es GET y hay 'body' (que debería ser el ID), añadirlo a la URL
    if (method === 'GET' && isGetById && body && body.id) {
        url += `&id=${body.id}`;
    }
    // Si es POST (o PUT, DELETE) y hay cuerpo, añadirlo y configurar header
    else if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
    }

    // console.log(`Calling API: ${method} ${url}`, body ? `with body: ${JSON.stringify(body)}` : ''); // Log para depurar

    try {
        const response = await fetch(url, options);
        const text = await response.text(); // Leer como texto primero
        // console.log(`Response for ${action}:`, text); // Log para depurar

        if (!response.ok) {
             // Intentar parsear el error si es JSON, si no, usar el texto
             try {
                 const errorJson = JSON.parse(text);
                 throw new Error(errorJson.message || `Error HTTP ${response.status}`);
             } catch (e) {
                 throw new Error(`Error HTTP ${response.status}: ${text || response.statusText}`);
             }
        }

        // Intentar parsear como JSON (si la respuesta está vacía, devolver success)
        try {
             if (text.trim() === '') {
                 // Considerar respuesta vacía como éxito si el status HTTP fue OK
                 return { status: 'success', message: 'Operación completada (respuesta vacía)', data: null };
             }
            return JSON.parse(text);
        } catch (e) {
            console.error(`Error parsing JSON for ${action}:`, text);
            throw new Error("Respuesta inválida del servidor (no es JSON)");
        }
    } catch (error) {
        console.error(`Falló la llamada a la API [${action}]:`, error);
        // Devolver un objeto de error estándar para que el frontend lo maneje
        return { status: 'error', message: error.message || 'Error de conexión desconocido' };
    }
}


// Definición del objeto api (usando la función genérica)
const api = {

    // ==================
    // VENDEDORES
    // ==================
    getVendedores: () => callApi('get_vendedores'),
    getVendedorById: (id) => callApi('get_vendedor_by_id', 'GET', { id }, true)
        .then(result => { // Adaptar respuesta para el formulario
            if (result.status === 'success' && result.data) {
                result.data = { nombre: result.data.nombre };
            }
            return result;
        }),
    saveVendedor: (nombre) => callApi('create_vendedor', 'POST', { nombre }),
    updateVendedor: (id, nombre) => callApi('update_vendedor', 'POST', { id, nombre }), // Usar POST como en PHP
    deleteVendedor: (id) => callApi('delete_vendedor', 'POST', { id }),

    // ==================
    // REPARTIDORES
    // ==================
    getRepartidores: () => callApi('get_repartidores'),
    getRepartidorById: (id) => callApi('get_repartidor_by_id', 'GET', { id }, true) // Método GET para ById
        .then(result => { // Adaptar respuesta
            if (result.status === 'success' && result.data) {
                result.data = { nombre: result.data.nombre };
            }
            return result;
        }),
    saveRepartidor: (nombre) => callApi('create_repartidor', 'POST', { nombre }),
    updateRepartidor: (id, nombre) => callApi('update_repartidor', 'POST', { id, nombre }), // Usar POST
    deleteRepartidor: (id) => callApi('delete_repartidor', 'POST', { id }),

    // ==================
    // DESTINOS
    // ==================
    getDestinos: () => callApi('get_destinos'),
    getDestinoById: (id) => callApi('get_destino_by_id', 'GET', { id }, true) // Método GET para ById
        .then(result => { // Adaptar respuesta
            if (result.status === 'success' && result.data) {
                result.data = { lugar: result.data.lugar, direccion: result.data.direccion };
            }
            return result;
        }),
    saveDestino: (lugar, direccion) => callApi('create_destino', 'POST', { lugar, direccion }),
    updateDestino: (id, lugar, direccion) => callApi('update_destino', 'POST', { id, lugar, direccion }), // Usar POST
    deleteDestino: (id) => callApi('delete_destino', 'POST', { id }),

    // ==================
    // MÉTODOS DE PAGO
    // ==================
    getMetodosPago: () => callApi('get_metodos_pago'),
    
    getMetodosPagoActivos: () => callApi('get_metodos_pago')
        .then(result => {
            // ✅ Filtrar solo métodos ACTIVOS (activo = 1)
            if (result.status === 'success' && Array.isArray(result.data)) {
                result.data = result.data.filter(m => {
                    const activo = m.activo ?? m.ACTIVO ?? 0;
                    return parseInt(activo) === 1;
                });
            }
            return result;
        }),

    saveMetodoPago: (nombre) => callApi('create_metodo_pago', 'POST', { nombre }),
// ...
    saveMetodoPago: (nombre) => callApi('create_metodo_pago', 'POST', { nombre }),
    updateMetodoPago: (id, nombre) => callApi('update_metodo_pago', 'POST', { id, nombre }), // Usar POST
    updateMetodoStatus: (id, activo) => callApi('update_metodo_status', 'POST', { id, activo: activo ? 1 : 0 }),
    deleteMetodoPago: (id) => callApi('delete_metodo_pago', 'POST', { id }),

    // ==================
    // HUELLAS
    // ==================
    saveFingerprintData: (tipo_persona, id_persona, datos_huella) => callApi('save_fingerprint', 'POST', { tipo_persona, id_persona, datos_huella }),
    verifyFingerprintData: (tipo_persona, datos_huella) => callApi('verify_fingerprint', 'POST', { tipo_persona, datos_huella }),

    // ==================
    // OTRAS FUNCIONES API (DESCOMENTADAS)
    // ==================
    login: (usuario_login, contraseña) => callApi('login', 'POST', { usuario_login, contraseña }),
    getAsistenciasDelDia: () => callApi('get_asistencia_del_dia'), // Nombre usado por asistencias.js
    updateAsistencia: (asistenciaData) => callApi('update_asistencia', 'POST', asistenciaData),
    getRepartos: () => callApi('get_repartos'),
    saveReparto: (repartoData) => callApi('create_reparto', 'POST', repartoData), // Nombre usado por bitacora.js
    finalizarReparto: (repartoId) => callApi('finalizar_reparto', 'POST', { id: repartoId }),
    getConfiguracion: () => callApi('get_configuracion'),
    saveConfiguracion: (configData) => callApi('save_configuracion', 'POST', configData), // Nombre usado por pagos.js
    calcularPagos: (params) => callApi('calcular_pagos', 'POST', params),
    saveReporte: (reporteData) => callApi('save_reporte', 'POST', reporteData), // Nombre usado por pagos.js

      // ==================
    // REPORTES (DASHBOARD)
    // ==================
    callApi: (action, method = 'POST', data = null) => {
        let url = `${BASE_URL}/api.php?action=${action}`;
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        return fetch(url, options)
            .then(response => response.text())
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('Error parsing JSON:', text);
                    return { status: 'error', message: 'Respuesta inválida del servidor' };
                }
            })
            .catch(error => {
                console.error('API Error:', error);
                return { status: 'error', message: error.message };
            });
    },

}; // Fin del objeto 'api'


export { api }; // <<--- ESTA DEBE SER LA ÚLTIMA LÍNEA DEL ARCHIVO
// ---------------------------------------------
// (NO DEBE HABER NADA DESPUÉS DE ESTA LÍNEA)