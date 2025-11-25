import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("=== PÁGINA AGREGAR INFO CARGADA (MODO AWS) ==="); 

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
                <tr data-id="${item.id_vendedor || item.id}">
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
                <tr data-id="${item.id_repartidor || item.id}">
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
                <div class="destination-item" data-id="${item.id_destino || item.id}">
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
            getDataById: api.getMetodosPago, // Fallback si no hay getById específico
            saveData: api.saveMetodoPago,
            updateData: api.updateMetodoPago,
            updateStatusData: api.updateMetodoStatus, 
            deleteData: api.deleteMetodoPago,
            renderItem: (item) => {
                const activoVal = item.activo ?? item.ACTIVO ?? 0;
                const isChecked = (activoVal === 1 || activoVal === true || activoVal === 'true');
                const statusClass = isChecked ? 'status-active' : 'status-inactive';
                const statusText = isChecked ? 'Activo' : 'Inactivo';
                return `
                <div class="payment-method-item" data-id="${item.id_metodo_pago || item.id}">
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
    // FUNCIONES AUXILIARES
    // ========================================
    function openModal(modal) { if (modal) modal.classList.add('show'); }
    function closeModal(modal) { if (modal) modal.classList.remove('show'); }
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function showConfirmationModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'btn-primary', showCancelButton = true }) {
        return new Promise((resolve) => {
            if (!confirmModal || !confirmModalContent) { console.error("Modal confirmación no encontrado."); resolve(false); return; }
            
            let confirmButtonClass = 'btn-primary';
            if (confirmClass === 'btn-danger') confirmButtonClass = 'btn-danger';

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
    
    function filterDestinos(searchTerm) { 
        const container = document.getElementById(config.destino.containerId); 
        if (!container) return; 
        let itemsToRender; 
        if (!searchTerm) { itemsToRender = destinosCompletos; } 
        else { itemsToRender = destinosCompletos.filter(item => (item.lugar || '').toLowerCase().includes(searchTerm) || (item.direccion || '').toLowerCase().includes(searchTerm)); } 
        if (!itemsToRender || itemsToRender.length === 0) { container.innerHTML = searchTerm ? '<div style="text-align: center; padding: 20px; color: #6b7280;">No se encontraron resultados.</div>' : config.destino.emptyStateHTML; } 
        else { container.innerHTML = itemsToRender.map(config.destino.renderItem).join(''); } 
    }

    // ========================================
    // RENDER DATA (ADAPTADO PARA JAVA)
    // ========================================
    async function renderData(typeConfig) {
        if (!typeConfig || !typeConfig.containerId) return;
        const container = document.getElementById(typeConfig.containerId); 
        if (!container) return;

        container.innerHTML = '<p style="text-align: center;">Cargando...</p>';
        try {
            const response = await typeConfig.fetchData();
            
            let items = [];
            if (Array.isArray(response)) {
                items = response; 
            } else if (response && (response.status === 'success' || response.success)) {
                items = response.data || []; 
            } else if (response && response.message) {
                 throw new Error(response.message);
            }

            if (typeConfig.title === 'Destino') { 
                destinosCompletos = items; 
                filterDestinos(destinoSearchInput?.value.toLowerCase() || ''); 
            } else { 
                if (items.length === 0) { 
                    container.innerHTML = typeConfig.emptyStateHTML; 
                } else { 
                    container.innerHTML = items.map(typeConfig.renderItem).join(''); 
                } 
            }
        } catch (error) { 
            console.error(`Error cargando ${typeConfig.title}:`, error); 
            container.innerHTML = `<p style="text-align: center; color: red;">Error de conexión.</p>`; 
            showErrorModal('Error Carga', `No se pudo conectar al servidor. (${error.message})`); 
        }
    }

    // ========================================
    // MODAL FORMULARIO (Agregar/Editar)
    // ========================================
    function handleOpenFormModal(type, editId = null, existingData = null) {
        const conf = config[type]; 
        if (!conf) return;
        const isEditing = editId !== null;

        const formFieldsHTML = conf.formFields.map(f => {
            const val = isEditing && existingData ? (existingData[f.id] || '') : '';
            return `
            <div class="form-group">
                <label for="${f.id}">${f.label}</label>
                <input type="${f.type || 'text'}" id="${f.id}" name="${f.id}" ${f.required ? 'required' : ''} value="${val}" placeholder="${f.placeholder || ''}">
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
        const formCancelBtn = formModal.querySelector('#form-cancel-btn');

        if (formCancelBtn) formCancelBtn.addEventListener('click', () => closeModal(formModal));
        
        if (!form) return;

        form.onsubmit = async function(e) { 
            e.preventDefault(); 
            const formData = {}; 
            conf.formFields.forEach(f => { 
                const input = form.querySelector(`#${f.id}`); 
                if (input) formData[f.id] = input.value; 
            }); 
            
            const submitBtn = form.querySelector('button[type="submit"]'); 
            const formValues = Object.values(formData);
            
            try { 
                if(submitBtn) submitBtn.disabled = true; 
                
                let result;
                if (isEditing) { 
                    result = await conf.updateData(editId, ...formValues); 
                } else { 
                    result = await conf.saveData(...formValues); 
                } 
                
                if(submitBtn) submitBtn.disabled = false; 
                
                const isSuccess = (result && result.status === 'success') || (result && result.success) || (result && !result.error && !result.message);

                if (isSuccess) { 
                    await renderData(conf); 
                    closeModal(formModal); 
                    showSuccessToast(`Se ${isEditing ? 'actualizó' : 'guardó'} correctamente.`); 
                } else { 
                    showErrorModal('Error al guardar', result?.message || 'Error desconocido del servidor.'); 
                } 
            } catch (error) { 
                if(submitBtn) submitBtn.disabled = false; 
                showErrorModal('Error conexión', error.message); 
            } 
        };
    }

    // ========================================
    // MODAL HUELLA
    // ========================================
    function openFingerprintModal(id, tipo) {
         if (!fingerprintModal) return;
        fingerprintModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header"><h2>Registrar Huella</h2><span class="close-modal-btn">&times;</span></div>
                <div class="modal-body">
                    <div class="fingerprint-icon"><i class="fas fa-fingerprint"></i></div>
                    <h3>Escanear Huella</h3>
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
         const progressText = fingerprintModal?.querySelector('#progress-text'); 
         const btnRetry = fingerprintModal?.querySelector('#btn-retry'); 
         const iconContainer = fingerprintModal?.querySelector('.fingerprint-icon');
         
         try {
             updateFingerprintProgress(1, 'Coloque el dedo...'); await sleep(1500);
             updateFingerprintProgress(2, 'Levante y coloque...'); await sleep(2000);
             const simulatedData = 'fingerprint_dummy_' + Date.now();
             
             updateFingerprintProgress(3, 'Guardando...'); 
             const response = await api.saveFingerprintData(tipo, id, simulatedData);
             
             if (response && (response.status === 'success' || !response.error)) { 
                 updateFingerprintProgress(3, '¡Registrada!'); 
                 if(iconContainer) iconContainer.innerHTML = '<i class="fas fa-check" style="color: green;"></i>'; 
                 setTimeout(() => closeModal(fingerprintModal), 2000);
                 showSuccessToast('Huella registrada.'); 
             } else { throw new Error('Error al guardar'); }
         } catch (error) { 
             updateFingerprintProgress(3, 'Error'); 
             if(progressText) progressText.textContent = 'Fallo el registro';
             if(btnRetry) btnRetry.style.display = 'inline-block';
         }
    }
    function updateFingerprintProgress(currentStep, text) { 
        const el = document.getElementById('progress-text'); if(el) el.textContent = text; 
        for (let i = 1; i <= 3; i++) { 
            const step = document.getElementById(`step-${i}`); 
            if(step) step.classList.toggle('active', i <= currentStep); 
        } 
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    console.log("Iniciando carga de datos...");
    Object.keys(config).forEach(key => renderData(config[key]));

    if (tabsContainer) { 
        tabsContainer.addEventListener('click', (e) => { 
            const tab = e.target.closest('.tab-card'); 
            if (!tab || tab.classList.contains('active')) return; 
            const name = tab.dataset.tab; 
            tabsContainer.querySelectorAll('.tab-card').forEach(c => c.classList.remove('active')); 
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
            tab.classList.add('active'); 
            const content = document.getElementById(`${name}-content`); 
            if (content) content.classList.add('active'); 
        }); 
    }
    if (destinoSearchInput) { destinoSearchInput.addEventListener('input', (e) => filterDestinos(e.target.value.toLowerCase())); }

    if (cardContainer) {
        cardContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action], .delete-btn, .edit-btn, .fingerprint-btn');
            if (!btn) return;
            e.preventDefault();

            const action = btn.dataset.action;
            const row = btn.closest('[data-id]');
            const id = row?.dataset.id;
            const typeKey = getTypeKeyFromElement(row || btn.closest('.tab-content'));

            if (action?.startsWith('add-')) {
                handleOpenFormModal(action.replace('add-', ''));
            } else if (btn.classList.contains('delete-btn')) {
                if (!id) return;
                const confirmed = await showConfirmationModal({ title: '¿Seguro?', message: `Eliminar elemento.`, confirmClass: 'btn-danger' });
                if (confirmed) { 
                    const result = await config[typeKey].deleteData(id); 
                    if (result && (result.status === 'success' || !result.error)) { 
                        await renderData(config[typeKey]); 
                        showSuccessToast('Eliminado.'); 
                    } else { showErrorModal('Error', 'No se pudo eliminar.'); } 
                }
            } else if (btn.classList.contains('edit-btn')) {
                if (!id) return;
                let data = null;
                try {
                    const result = await config[typeKey].getDataById(id);
                    if(result && (result.id || result.data)) data = result.data || result;
                } catch(e) { console.log("Fetch by ID falló, buscando en local..."); }
                
                if (!data && typeKey === 'destino') data = destinosCompletos.find(d => (d.id_destino || d.id) == id);

                if (data) handleOpenFormModal(typeKey, id, data);
                else showErrorModal('Error', 'No se pudieron cargar los datos.');
            } else if (btn.classList.contains('fingerprint-btn')) {
                openFingerprintModal(id, typeKey);
            }
        });
        
        // Listener toggle (Lógica Restaurada)
        cardContainer.addEventListener('change', async (e) => {
            const toggle = e.target.closest('.toggle-switch input[type="checkbox"]');
            if (!toggle) return;
            
            const itemElement = toggle.closest('.payment-method-item');
            if (!itemElement) return;

            const id = itemElement.dataset.id;
            const typeKey = 'metodo'; 
            
            if (!id) return;

            const newStatus = toggle.checked;
            
            try {
                // Usamos la función específica updateMetodoStatus si existe, o un update normal
                const typeConfig = config[typeKey];
                const updateFn = typeConfig.updateStatusData || typeConfig.updateData;
                
                // Si es updateStatusData enviamos (id, status), si es updateData enviamos objeto
                let result;
                if (typeConfig.updateStatusData) {
                    result = await typeConfig.updateStatusData(id, newStatus);
                } else {
                    // Fallback
                    result = await typeConfig.updateData(id, { activo: newStatus ? 1 : 0 });
                }

                if (result && (result.status === 'success' || !result.error)) {
                    // Actualizar UI
                    const statusText = itemElement.querySelector('.payment-info span');
                    if (statusText) {
                        statusText.textContent = newStatus ? 'Activo' : 'Inactivo';
                        statusText.className = newStatus ? 'status-active' : 'status-inactive';
                    }
                    showSuccessToast('Estado actualizado.');
                } else {
                    throw new Error(result.message || 'Error API');
                }
            } catch (error) {
                console.error("Error toggle:", error);
                toggle.checked = !newStatus; // Revertir cambio visual
                showErrorModal('Error', 'No se pudo actualizar el estado.');
            }
        });
    }

    // Cerrar modales global
    document.addEventListener('click', (e) => { 
        if (e.target.closest('.close-modal-btn')) { 
            const m = document.querySelector('.modal.show'); if(m) closeModal(m);
        } else if (e.target.classList.contains('modal')) { 
            closeModal(e.target); 
        } 
    });
});