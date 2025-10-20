// js/apiService.js (Versión Limpia y Final)

const API_URL = 'http://localhost/kung-fu/api/api.php';

async function callApi(action, method = 'GET', body = null) {
  const url = `${API_URL}?action=${action}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Falló la llamada a la API [${action}]:`, error);
    return { status: 'error', message: error.message };
  }
}

export const api = {
  // Autenticación
  login: (usuario_login, contraseña) => callApi('login', 'POST', { usuario_login, contraseña }),

  // Empleados
  getEmpleados: () => callApi('get_empleados'),
  createEmpleado: (empleadoData) => callApi('create_empleado', 'POST', empleadoData),

  // Vendedores
  getVendedores: () => callApi('get_vendedores'),
  saveVendedor: (nombre) => callApi('create_vendedor', 'POST', { nombre }),
  deleteVendedor: (id) => callApi('delete_vendedor', 'POST', { id }),

  // Repartidores
  getRepartidores: () => callApi('get_repartidores'),
  saveRepartidor: (nombre) => callApi('create_repartidor', 'POST', { nombre }),
  deleteRepartidor: (id) => callApi('delete_repartidor', 'POST', { id }),

  // Destinos
  getDestinos: () => callApi('get_destinos'),
  saveDestino: (lugar, direccion) => callApi('create_destino', 'POST', { lugar, direccion }),
  deleteDestino: (id) => callApi('delete_destino', 'POST', { id }),
  
  // Métodos de Pago
  getMetodosPago: () => callApi('get_metodos_pago'),
  saveMetodoPago: (nombre) => callApi('create_metodo_pago', 'POST', { nombre }),
  deleteMetodoPago: (id) => callApi('delete_metodo_pago', 'POST', { id }),

  // Asistencias
  getAsistenciasDelDia: () => callApi('get_asistencia_del_dia'),
  updateAsistencia: (asistenciaData) => callApi('update_asistencia', 'POST', asistenciaData),
  
  // Repartos (Bitácora)
  getRepartos: () => callApi('get_repartos'),
  saveReparto: (repartoData) => callApi('create_reparto', 'POST', repartoData),
  finalizarReparto: (repartoId) => callApi('finalizar_reparto', 'POST', { id: repartoId }),

  // Pagos y Configuración
  getConfiguracion: () => callApi('get_configuracion'),
  guardarConfiguracion: (configData) => callApi('save_configuracion', 'POST', configData),
  calcularPagos: (params) => callApi('calcular_pagos', 'POST', params),
  guardarReporte: (reporteData) => callApi('save_reporte', 'POST', reporteData),
};