const BASE_URL = 'http://98.87.202.154:7001';

async function request(endpoint, method = 'GET', body = null) {
    const url = `${BASE_URL}${endpoint}`;
    
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) options.body = JSON.stringify(body);

    try {
        
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const text = await response.text();
        if (!text) return { status: 'success' }; 

        try {
            return JSON.parse(text);
        } catch (e) {
            return { status: 'success', message: text };
        }
    } catch (error) {
        console.error(`❌ Error API [${endpoint}]:`, error);
        throw error;
    }
}

export const api = {

    // ==========================================
    // 1. VENDEDORES    
    // ==========================================
    getVendedores: () => request('/vendedor'),
    getVendedorById: (id) => request(`/vendedor/${id}`),
    saveVendedor: (nombre) => request('/vendedor', 'POST', { nombre }),
    updateVendedor: (id, nombre) => request(`/vendedor/${id}`, 'PUT', { nombre }),
    deleteVendedor: (id) => request(`/vendedor/${id}`, 'DELETE'),

    // ==========================================
    // 2. REPARTIDORES 
    // ==========================================
    getRepartidores: () => request('/repartidor'),
    getRepartidorById: (id) => request(`/repartidor/${id}`),
    saveRepartidor: (nombre) => request('/repartidor', 'POST', { nombre }),
    updateRepartidor: (id, nombre) => request(`/repartidor/${id}`, 'PUT', { nombre }),
    deleteRepartidor: (id) => request(`/repartidor/${id}`, 'DELETE'),

    // ==========================================
    // 3. DESTINOS 
    // ==========================================
    getDestinos: () => request('/destinos'),
    getDestinoById: (id) => request(`/destinos/${id}`),
    saveDestino: (lugar, direccion) => request('/destinos', 'POST', { lugar, direccion }),
    updateDestino: (id, lugar, direccion) => request(`/destinos/${id}`, 'PUT', { lugar, direccion }),
    deleteDestino: (id) => request(`/destinos/${id}`, 'DELETE'),

    // ==========================================
    // 4. MÉTODOS DE PAGO 
    // ==========================================
    getMetodosPago: () => request('/metodo_pago'),
    
    // Función auxiliar para filtrar activos en el frontend
    getMetodosPagoActivos: async () => {
        const data = await request('/metodo_pago');
        const lista = Array.isArray(data) ? data : (data.data || []);
        return lista.filter(m => {
            const activo = m.activo ?? m.ACTIVO ?? 0; // Adaptarse a mayúsculas/minúsculas
            return parseInt(activo) === 1 || activo === true;
        });
    },

    saveMetodoPago: (nombre) => request('/metodo_pago', 'POST', { nombre }),
    updateMetodoPago: (id, nombre) => request(`/metodo_pago/${id}`, 'PUT', { nombre }),
    // Si no tienes ruta específica de estatus, usamos el update normal (asumiendo que envías todo el objeto)
    updateMetodoStatus: (id, activo) => request(`/metodo_pago/${id}`, 'PUT', { activo: activo ? 1 : 0 }),
    deleteMetodoPago: (id) => request(`/metodo_pago/${id}`, 'DELETE'),


    // ==========================================
    // 5. ASISTENCIAS 
    // ==========================================
    getAsistencias: () => request('/asistencias'),
    saveAsistencia: (data) => request('/asistencias', 'POST', data),
    
    // ==========================================
    // 6. REPARTOS 
    // ==========================================
    getRepartos: () => request('/reparto'),
    saveReparto: (data) => request('/reparto', 'POST', data),
    updateReparto: (id, data) => request(`/reparto/${id}`, 'PUT', data),

    // ==========================================
    // 7. OTRAS FUNCIONES
    // ==========================================
    getConfiguracion: () => request('/configuracion'),
    
    // ==========================================
    // 8. CONFIGURACIÓN Y PAGOS (Faltaban estas)
    // ==========================================
    getConfiguracion: () => request('/configuracion'), // GET para leer sueldos
    saveConfiguracion: (data) => request('/configuracion', 'POST', data), // POST para guardar
    
    // ⚠️ ATENCIÓN: Estas rutas deben existir en tu Java (ver Paso 3)
    calcularPagos: (params) => request('/pago/calcular', 'POST', params),
    saveReporte: (data) => request('/pago/reporte', 'POST', data),

    login: (usuario, password) => request('/empleados/login', 'POST', { usuario, password }), 
};