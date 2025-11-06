// Importar 'api' desde apiService.js (requiere type="module" en HTML)
import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("=== PÁGINA AGREGAR INFO CARGADA ==="); 

    
    // ========================================
    // CONFIGURACIÓN CENTRALIZADA
    // ========================================
    const config = {
        vendedor: {
            title: 'Vendedor',
            containerId: 'vendedores-table-body',
            fetchData: api.getVendedores,
            getDataById: api.getVendedorById,
            saveData: api.saveVendedor,
            updateData: api.updateVendedor,
            deleteData: api.deleteVendedor,
            renderItem: (item) => `
                <tr data-id="${item.id_vendedor}">
                    <td>${item.nombre || ''}</td>
                    <td><span class="badge-active">Activo</span></td>
                    <td><button class="action-btn fingerprint-btn" title="Registrar Huella"><i class="fas fa-fingerprint"></i></button></td>
                    <td>
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`,
            formFields: [
                { id: 'nombre', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej. Juan Pérez' }
            ],
            emptyStateHTML: '<tr><td colspan="4" style="text-align: center;">No hay vendedores registrados.</td></tr>'
        },
        repartidor: {
            title: 'Repartidor',
            containerId: 'repartidores-table-body',
            fetchData: api.getRepartidores,
            getDataById: api.getRepartidorById,
            saveData: api.saveRepartidor,
            updateData: api.updateRepartidor,
            deleteData: api.deleteRepartidor,
            renderItem: (item) => `
                <tr data-id="${item.id_repartidor}">
                    <td>${item.nombre || ''}</td>
                    <td><span class="badge-active">Activo</span></td>
                    <td><button class="action-btn fingerprint-btn" title="Registrar Huella"><i class="fas fa-fingerprint"></i></button></td>
                    <td>
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`,
            formFields: [
                { id: 'nombre', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej. Juan Pérez' }
            ],
            emptyStateHTML: '<tr><td colspan="4" style="text-align: center;">No hay repartidores registrados.</td></tr>'
        },
        destino: {
            title: 'Destino',
            containerId: 'destinations-list-container',
            fetchData: api.getDestinos,
            getDataById: api.getDestinoById,
            saveData: api.saveDestino,
            updateData: api.updateDestino,
            deleteData: api.deleteDestino,
            renderItem: (item) => `
                <div class="destination-item" data-id="${item.id_destino}">
                    <div class="destination-info">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <h3>${item.lugar || ''}</h3>
                            <p>${item.direccion || ''}</p>
                        </div>
                    </div>
                    <div class="destination-actions">
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`,
            formFields: [
                { id: 'lugar', label: 'Lugar', type: 'text', required: true, placeholder: 'Nombre del lugar' },
                { id: 'direccion', label: 'Dirección', type: 'text', required: true, placeholder: 'Calle, número y colonia' }
            ],
            emptyStateHTML: '<div style="text-align: center;">No hay destinos registrados.</div>'
        },
        metodo: {
            title: 'Método de Pago',
            containerId: 'payment-methods-container',
            fetchData: api.getMetodosPago,
            getDataById: api.getMetodoById,
            saveData: api.saveMetodoPago,
            updateData: api.updateMetodoPago,
            updateStatusData: api.updateMetodoStatus,
            deleteData: api.deleteMetodoPago,
            renderItem: (item) => {
                const isChecked = (item.activo ?? 0) == 1;
                const statusClass = isChecked ? 'status-active' : 'status-inactive';
                const statusText = isChecked ? 'Activo' : 'Inactivo';
                return `
                <div class="payment-method-item" data-id="${item.id_metodo_pago}">
                    <div class="payment-info">
                        <i class="fas fa-credit-card"></i>
                        <div>
                            <h3>${item.nombre || ''}</h3>
                            <span class="${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="payment-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${isChecked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            },
            formFields: [
                { id: 'nombre', label: 'Método de pago', type: 'text', required: true, placeholder: 'Ej. Tarjeta de Crédito' }
            ],
            emptyStateHTML: '<div style="text-align: center;">No hay métodos de pago registrados.</div>'
        }
    };

    // ========================================
    // SELECCIÓN DE ELEMENTOS DEL DOM
    // ========================================
    const cardContainer = document.querySelector('.card');
    const tabsContainer = document.querySelector('.tabs-container');
    const fingerprintModal = document.getElementById('fingerprint-modal');
    const formModal = document.getElementById('form-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalContent = document.getElementById('confirm-modal-content');
    const destinoSearchInput = document.querySelector('#destinos-content .search-box input');
    let destinosCompletos = [];

    // ========================================
    // FUNCIONES AUXILIARES (Modales, Toast, Sleep, etc.)
    // ========================================
    function openModal(modal) { if (modal) modal.classList.add('show'); }
    function closeModal(modal) { if (modal) modal.classList.remove('show'); }
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function showConfirmationModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'btn-primary', showCancelButton = true }) {
        return new Promise((resolve) => {
            if (!confirmModal || !confirmModalContent) { console.error("Modal confirmación no encontrado."); resolve(false); return; }
            
            let confirmButtonClass = 'btn-primary';
            if (confirmClass === 'btn-danger') {
                confirmButtonClass = 'btn-danger';
            }

            confirmModalContent.innerHTML = `
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    ${showCancelButton ? `<button type="button" class="btn-secondary" id="confirm-cancel-btn">${cancelText}</button>` : ''}
                    <button type="button" class="${confirmButtonClass}" id="confirm-ok-btn">${confirmText}</button>
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
    
    function showErrorModal(title, message) { return showConfirmationModal({ title: title || 'Error', message: message || 'Ocurrió un error.', confirmText: 'Entendido', confirmClass: 'btn-primary', showCancelButton: false }); }
    function showSuccessToast(message) { const toast = document.createElement('div'); toast.className = 'success-toast'; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000); }
    function getTypeKeyFromElement(element) { if (!element) return null; if (element.closest('#vendedores-table-body')) return 'vendedor'; if (element.closest('#repartidores-table-body')) return 'repartidor'; if (element.closest('#destinations-list-container')) return 'destino'; if (element.closest('#payment-methods-container')) return 'metodo'; return null; }
    function filterDestinos(searchTerm) { const container = document.getElementById(config.destino.containerId); if (!container) return; let itemsToRender; if (!searchTerm) { itemsToRender = destinosCompletos; } else { itemsToRender = destinosCompletos.filter(item => (item.lugar || '').toLowerCase().includes(searchTerm) || (item.direccion || '').toLowerCase().includes(searchTerm)); } if (!itemsToRender || itemsToRender.length === 0) { container.innerHTML = searchTerm ? '<div style="text-align: center; padding: 20px; color: #6b7280;">No se encontraron resultados.</div>' : config.destino.emptyStateHTML; } else { container.innerHTML = itemsToRender.map(config.destino.renderItem).join(''); } }

    async function renderData(typeConfig) {
        if (!typeConfig || !typeConfig.containerId) { console.error("Config inválida", typeConfig); return; }
        const container = document.getElementById(typeConfig.containerId); if (!container) { return; }
        container.innerHTML = '<p style="text-align: center;">Cargando...</p>';
        try {
            if (typeof typeConfig.fetchData !== 'function') { throw new Error(`fetchData inválido para ${typeConfig.title}`); }
            const response = await typeConfig.fetchData();
            if (response && response.status === 'success') {
                const items = response.data || [];
                if (typeConfig.title === 'Destino') { destinosCompletos = items; filterDestinos(destinoSearchInput?.value.toLowerCase() || ''); }
                else { if (items.length === 0) { container.innerHTML = typeConfig.emptyStateHTML; } else { if(typeof typeConfig.renderItem !== 'function'){ throw new Error(`renderItem inválido para ${typeConfig.title}`);} container.innerHTML = items.map(typeConfig.renderItem).join(''); } }
            } else { throw new Error(response?.message || 'API no devolvió éxito.'); }
        } catch (error) { console.error(`Error cargando ${typeConfig.title}:`, error); container.innerHTML = `<p style="text-align: center; color: red;">Error.</p>`; showErrorModal('Error Carga', `No se pudo cargar ${typeConfig.title}. (${error.message})`); }
    }

    // ========================================
    // FUNCIONES MODAL HUELLA (Completas)
    // ========================================
    function openFingerprintModal(id, tipo) {
         if (!fingerprintModal) { console.error("Modal huella no existe"); showErrorModal("Error", "Modal huella no existe."); return; }
        fingerprintModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header"><h2>Registrar Huella</h2><span class="close-modal-btn">&times;</span></div>
                <div class="modal-body">
                    <div class="fingerprint-icon"><i class="fas fa-fingerprint"></i></div>
                    <h3>Escanear Huella</h3><p>Coloque dedo</p>
                    <div class="progress-steps"><div class="step" id="step-1">1</div><div class="step" id="step-2">2</div><div class="step" id="step-3">3</div></div>
                    <p class="progress-text" id="progress-text">Esperando...</p>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel close-modal-btn">Cancelar</button>
                        <button type="button" class="btn-save" id="btn-retry" style="display: none;">Reintentar</button>
                    </div>
                </div>
            </div>`;
        openModal(fingerprintModal);
        captureFingerprintSequence(id, tipo);
    }
    async function captureFingerprintSequence(id, tipo) {
         const progressText = fingerprintModal?.querySelector('#progress-text'); const btnRetry = fingerprintModal?.querySelector('#btn-retry'); const iconContainer = fingerprintModal?.querySelector('.fingerprint-icon'); const btnCancel = fingerprintModal?.querySelector('.close-modal-btn');
         if (!progressText || !btnRetry || !iconContainer || !btnCancel) { console.error("Elementos modal huella no existen"); closeModal(fingerprintModal); showErrorModal("Error", "Error inicializando modal huella."); return; }
         btnRetry.style.display = 'none'; btnRetry.onclick = () => { iconContainer.innerHTML = '<i class="fas fa-fingerprint"></i>'; btnRetry.style.display = 'none'; btnCancel.style.display = 'inline-block'; captureFingerprintSequence(id, tipo); }; btnCancel.style.display = 'inline-block';
         try {
             updateFingerprintProgress(1, 'Coloque el dedo...'); await sleep(1500); console.log("Sim lectura 1...");
             updateFingerprintProgress(2, 'Levante y coloque...'); await sleep(2000); const simulatedData = 'fingerprint_data_' + Date.now(); console.log("Sim lectura 2, datos:", simulatedData);
             updateFingerprintProgress(3, 'Guardando...'); const response = await api.saveFingerprintData(tipo, id, simulatedData); console.log("Respuesta saveFingerprintData:", response);
             if (response && response.status === 'success') { updateFingerprintProgress(3, '¡Registrada!'); iconContainer.innerHTML = '<i class="fas fa-check" style="color: #059669;"></i>'; btnRetry.textContent = 'Cerrar'; btnRetry.style.display = 'inline-block'; btnCancel.style.display = 'none'; btnRetry.onclick = () => closeModal(fingerprintModal); await sleep(2500); closeModal(fingerprintModal); showSuccessToast('Huella registrada.'); }
             else { throw new Error(response?.message || 'Error al guardar'); }
         } catch (error) { console.error('Error captura huella:', error); updateFingerprintProgress(3, 'Error'); iconContainer.innerHTML = '<i class="fas fa-times" style="color: #d90429;"></i>'; if (progressText) progressText.textContent = error.message || 'No se pudo registrar'; btnRetry.textContent = 'Reintentar'; btnRetry.style.display = 'inline-block'; btnCancel.style.display = 'inline-block'; }
    }
    function updateFingerprintProgress(currentStep, text) { const el = document.getElementById('progress-text'); if(el) el.textContent = text; for (let i = 1; i <= 3; i++) { const step = document.getElementById(`step-${i}`); if(step) step.classList.toggle('active', i <= currentStep); } }

    // ========================================
    // MODAL FORMULARIO (Agregar/Editar - CORREGIDO)
    // ========================================
    function handleOpenFormModal(type, editId = null, existingData = null) {
        const conf = config[type]; if (!conf) { console.error(`Config no encontrada: ${type}`); return; }
        const isEditing = editId !== null; console.log(isEditing ? `Editando ${type} ID ${editId}` : `Agregando ${type}`, existingData || '');

        const formFieldsHTML = conf.formFields.map(f => {
            const val = isEditing && existingData ? (existingData[f.id] || '') : '';
            const placeholder = f.placeholder || '';
            const valAttrs = (f.id === 'nombre') ? ' pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$" title="Solo letras y espacios."' : '';
            
            return `
            <div class="form-group">
                <label for="${f.id}">${f.label}</label>
                <input 
                    type="${f.type || 'text'}" 
                    id="${f.id}" 
                    name="${f.id}" 
                    ${f.required ? 'required' : ''} 
                    value="${val}" 
                    placeholder="${placeholder}"
                    ${valAttrs}
                >
            </div>`;
        }).join('');

        formModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEditing ? 'Editar' : 'Agregar'} ${conf.title}</h2>
                    <span class="close-modal-btn">&times;</span>
                </div>
                <form id="generic-form" novalidate>
                    <div class="modal-body">
                        ${formFieldsHTML}
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-save">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                            <button type="button" class="btn-cancel" id="form-cancel-btn">Cancelar</button> 
                        </div>
                    </div>
                </form>
            </div>`;

        openModal(formModal); 
        const form = formModal.querySelector('#generic-form'); 
        const formCancelBtn = formModal.querySelector('#form-cancel-btn'); // Seleccionar el botón de cancelar
        if (!form) return;

        // Asignar el evento de clic al botón de Cancelar
        if (formCancelBtn) {
            formCancelBtn.addEventListener('click', () => {
                closeModal(formModal);
            });
        }
        
        form.onsubmit = async function(e) { 
            e.preventDefault(); 
            const formData = {}; 
            let isValid = true; 
            conf.formFields.forEach(f => { 
                const input = form.querySelector(`#${f.id}`); 
                if (input) { 
                    formData[f.id] = input.value; 
                    if (!input.checkValidity()) { 
                        isValid = false; 
                        console.warn(`Inválido: ${f.id}`, input.validationMessage); 
                    } 
                } 
            }); 
            
            if (!isValid) { 
                showErrorModal("Inválido", "Corrige los errores."); 
                return; 
            } 
            
            let result; 
            const formValues = Object.values(formData); 
            console.log("Enviando:", isEditing ? { id: editId, ...formData } : formData); 
            const submitBtn = form.querySelector('button[type="submit"]'); 
            
            try { 
                if(submitBtn) submitBtn.disabled = true; 
                if (isEditing) { 
                    result = await conf.updateData(editId, ...formValues); 
                } else { 
                    result = await conf.saveData(...formValues); 
                } 
                if(submitBtn) submitBtn.disabled = false; 
                console.log("Respuesta API:", result); 
                
                if (result && result.status === 'success') { 
                    await renderData(conf); 
                    closeModal(formModal); 
                    showSuccessToast(`Se ${isEditing ? 'actualizó' : 'guardó'} ${conf.title}.`); 
                } else { 
                    showErrorModal('Error al guardar', result?.message || 'Error API.'); 
                } 
            } catch (error) { 
                if(submitBtn) submitBtn.disabled = false; 
                console.error('Error form submit:', error); 
                showErrorModal('Error conexión', error.message || 'No se pudo guardar.'); 
            } 
        };
    }

    // ========================================
    // INICIALIZACIÓN Y EVENT LISTENERS PRINCIPALES
    // ========================================
    console.log("Iniciando carga de datos...");
    Object.keys(config).forEach(key => { if (config[key]) renderData(config[key]); else console.warn(`Config no existe: ${key}`); });

    if (tabsContainer) { tabsContainer.addEventListener('click', (e) => { const tab = e.target.closest('.tab-card'); if (!tab || tab.classList.contains('active')) return; const name = tab.dataset.tab; tabsContainer.querySelectorAll('.tab-card').forEach(c => c.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); tab.classList.add('active'); const content = document.getElementById(`${name}-content`); if (content) content.classList.add('active'); }); }
    else { console.warn("Tabs container no encontrado."); }

    if (destinoSearchInput) { destinoSearchInput.addEventListener('input', (e) => filterDestinos(e.target.value.toLowerCase())); }

    if (cardContainer) {
        // --- Listener Principal de CLIC ---
        cardContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action], .delete-btn, .edit-btn, .fingerprint-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const row = btn.closest('[data-id]');
            const id = row?.dataset.id;
            const typeKey = getTypeKeyFromElement(row || btn.closest('.tab-content'));

            if (action?.startsWith('add-') || btn.classList.contains('delete-btn') || btn.classList.contains('edit-btn') || btn.classList.contains('fingerprint-btn')) {
                e.preventDefault();
            }

            // --- Acción Agregar ---
            if (action?.startsWith('add-')) {
                handleOpenFormModal(action.replace('add-', ''));
            }
            // --- Acción Eliminar ---
            else if (btn.classList.contains('delete-btn')) {
                if (e.target !== btn && !btn.contains(e.target)) {
                     console.log("Clic cerca delete-btn ignorado."); return;
                }
                if (!id || !typeKey) { console.warn("Delete: ID/Tipo N/A"); return; }
                const confirmed = await showConfirmationModal({ title: '¿Seguro?', message: `Eliminar ${config[typeKey]?.title || 'elemento'}. No se puede deshacer.`, confirmText: 'Eliminar', confirmClass: 'btn-danger' });
                if (confirmed) { 
                    console.log(`Eliminando ${typeKey} ID ${id}`); 
                    const result = await config[typeKey].deleteData(id); 
                    if (result && result.status === 'success') { await renderData(config[typeKey]); showSuccessToast('Eliminado.'); } 
                    else { showErrorModal('Error al eliminar', result?.message || 'Error API.'); } 
                }
            }
            // --- Acción Editar ---
            else if (btn.classList.contains('edit-btn')) {
                if (!id || !typeKey) { console.warn("Edit: ID/Tipo N/A"); return; }
                const result = await config[typeKey].getDataById(id);
                if (result && result.status === 'success' && result.data) { handleOpenFormModal(typeKey, id, result.data); }
                else { showErrorModal('Error cargando', result?.message || 'No se pudo obtener.'); }
            }
            // --- Acción Huella ---
            else if (btn.classList.contains('fingerprint-btn')) {
                 if (!id || !typeKey || (typeKey !== 'vendedor' && typeKey !== 'repartidor')) { console.warn("FP: ID/Tipo N/A o inválido"); showErrorModal("Error", "No aplicable."); return; }
                openFingerprintModal(id, tipo);
            }
        });

        // --- Listener de CAMBIO (para el Toggle) ---
        cardContainer.addEventListener('change', async (e) => {
            const toggle = e.target.closest('.toggle-switch input[type="checkbox"]');
            if (!toggle) return;
            e.stopPropagation();

            const itemElement = toggle.closest('.payment-method-item');
            const id = itemElement?.dataset.id;
            const typeKey = getTypeKeyFromElement(itemElement);
            
            if (!id || typeKey !== 'metodo') { console.warn("Toggle: ID/Tipo N/A o inválido", {id, typeKey}); toggle.checked = !toggle.checked; return; }
            
            const newStatus = toggle.checked; const typeConfig = config[typeKey];
            console.log(`Cambiando estado ${typeKey} ${id} a ${newStatus ? 'activo' : 'inactivo'}`);
            
            try {
                const result = await typeConfig.updateStatusData(id, newStatus);
                if (result && result.status === 'success') {
                    const statusText = itemElement.querySelector('.payment-info span');
                    if (statusText) { statusText.textContent = newStatus ? 'Activo' : 'Inactivo'; statusText.className = newStatus ? 'status-active' : 'status-inactive'; }
                } else { toggle.checked = !newStatus; showErrorModal('Error actualizando', result?.message || 'Error API.'); }
            } catch (error) { console.error('Error toggle status:', error); toggle.checked = !newStatus; showErrorModal('Error conexión', error.message || 'No se pudo actualizar.'); }
        });
    } else { console.warn("Card container no encontrado."); }

    // ========================================
    // CIERRE DE MODALES (Global)
    // ========================================
    document.addEventListener('click', (e) => { 
        if (e.target.closest('.close-modal-btn')) { 
            const m = e.target.closest('.modal'); 
            if(m) closeModal(m); 
        } else if (e.target.classList.contains('modal') && e.target.classList.contains('show')) { 
            // Si el clic es en el overlay de un modal, y NO es el modal de confirmación (que tiene su propia lógica de cierre con botones)
            // Y no es el botón de cancelar dentro de los modales de formulario
            if (e.target.id === 'confirm-modal' && !document.getElementById('confirm-cancel-btn')) return;
            closeModal(e.target); 
        } 
    });
    
    document.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape') { 
            const openModals = document.querySelectorAll('.modal.show'); 
            if (openModals.length > 0) { 
                closeModal(openModals[openModals.length - 1]); 
            } 
        } 
    });

    // ========================================
    // MANEJO DEL LOGOUT PARA AGREGARINFO
    // ========================================
    const btnLogout = document.getElementById('logout-btn');
    if (btnLogout) {
        console.log("Configurando logout para agregarInfo...");
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: '¿Estás seguro?',
                text: "Estás a punto de cerrar la sesión.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d90429',
                cancelButtonColor: '#6e7881',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    window.location.href = '../html/index.html';
                }
            });
        });
    }
});