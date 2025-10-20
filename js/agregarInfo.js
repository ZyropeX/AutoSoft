import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // CONFIGURACIÓN CENTRALIZADA
    // ========================================
    const config = {
        vendedor: {
            title: 'Vendedor',
            containerId: 'vendedores-table-body',
            fetchData: api.getVendedores,
            saveData: api.saveVendedor,
            deleteData: api.deleteVendedor, // Añadido para borrar
            renderItem: (item) => `
                <tr data-id="${item.id_vendedor}">
                    <td>${item.nombre}</td>
                    <td><span class="badge-active">Activo</span></td>
                    <td><button class="action-btn fingerprint-btn" title="Registrar Huella"><i class="fas fa-fingerprint"></i></button></td>
                    <td>
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`,
            formFields: [
                { id: 'nombre', label: 'Nombre completo', type: 'text', required: true }
            ],
            emptyStateHTML: '<tr><td colspan="4" style="text-align: center;">No hay vendedores registrados.</td></tr>'
        },
        repartidor: {
            title: 'Repartidor',
            containerId: 'repartidores-table-body',
            fetchData: api.getRepartidores,
            saveData: api.saveRepartidor,
            deleteData: api.deleteRepartidor, // Añadido para borrar
            renderItem: (item) => `
                <tr data-id="${item.id_repartidor}">
                    <td>${item.nombre}</td>
                    <td><span class="badge-active">Activo</span></td>
                    <td><button class="action-btn fingerprint-btn" title="Registrar Huella"><i class="fas fa-fingerprint"></i></button></td>
                    <td>
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`,
            formFields: [
                { id: 'nombre', label: 'Nombre completo', type: 'text', required: true }
            ],
            emptyStateHTML: '<tr><td colspan="4" style="text-align: center;">No hay repartidores registrados.</td></tr>'
        },
        destino: {
            title: 'Destino',
            containerId: 'destinations-list-container',
            fetchData: api.getDestinos,
            saveData: api.saveDestino,
            deleteData: api.deleteDestino, // Añadido para borrar
            renderItem: (item) => `
                <div class="destination-item" data-id="${item.id_destino}">
                    <div class="destination-info"><i class="fas fa-map-marker-alt"></i><div><h3>${item.lugar}</h3><p>${item.direccion}</p></div></div>
                    <div class="destination-actions">
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`,
            formFields: [
                { id: 'lugar', label: 'Lugar', type: 'text', required: true },
                { id: 'direccion', label: 'Dirección', type: 'text', required: true }
            ],
            emptyStateHTML: '<div style="text-align: center;">No hay destinos registrados.</div>'
        },
        metodo: {
            title: 'Método de Pago',
            containerId: 'payment-methods-container',
            fetchData: api.getMetodosPago,
            saveData: api.saveMetodoPago,
            deleteData: api.deleteMetodoPago, // Añadido para borrar
            renderItem: (item) => `
                <div class="payment-method-item" data-id="${item.id_metodo_pago}">
                    <div class="payment-info"><i class="fas fa-credit-card"></i><div><h3>${item.nombre}</h3><span class="status-active">Activo</span></div></div>
                    <div class="payment-actions">
                        <label class="toggle-switch"><input type="checkbox" checked><span class="slider"></span></label>
                        <button class="action-btn delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`,
            formFields: [
                { id: 'nombre', label: 'Método de pago', type: 'text', required: true }
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

    // ========================================
    // CARGA INICIAL DE DATOS
    // ========================================
    Object.keys(config).forEach(key => renderData(config[key]));

    // ========================================
    // MANEJO DE PESTAÑAS (TABS)
    // ========================================
    tabsContainer?.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-card');
        if (!clickedTab) return;
        const tabName = clickedTab.dataset.tab;
        
        tabsContainer.querySelectorAll('.tab-card').forEach(card => card.classList.remove('active'));
        clickedTab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
    });

    // ========================================
    // MANEJO DE EVENTOS (Acciones principales)
    // ========================================
    cardContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action], .delete-btn, .edit-btn, .fingerprint-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        if (action?.startsWith('add-')) {
            handleOpenFormModal(action.replace('add-', ''));
        } 
        else if (btn.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
                const row = btn.closest('[data-id]');
                const id = row?.dataset.id;
                if (!id) return;

                let typeKey;
                if (row.closest('#vendedores-table-body')) typeKey = 'vendedor';
                else if (row.closest('#repartidores-table-body')) typeKey = 'repartidor';
                else if (row.closest('#destinations-list-container')) typeKey = 'destino';
                else if (row.closest('#payment-methods-container')) typeKey = 'metodo';

                if (typeKey) {
                    const typeConfig = config[typeKey];
                    const result = await typeConfig.deleteData(id);
                    if (result.status === 'success') {
                        await renderData(typeConfig);
                    } else {
                        alert('Error al eliminar: ' + (result.message || 'Error desconocido'));
                    }
                }
            }
        } 
        else if (btn.classList.contains('edit-btn')) {
            alert('Función de editar - En desarrollo');
        } 
        else if (btn.classList.contains('fingerprint-btn')) {
            openModal(fingerprintModal);
            // ... (código de modal huella)
        }
    });

    // ========================================
    // CIERRE DE MODALES
    // ========================================
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal-btn')) {
                closeModal(modal);
            }
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(closeModal);
        }
    });
    
    // ========================================
    // === FUNCIONES AUXILIARES Y GENÉRICAS ===
    // ========================================

    function openModal(modal) { modal?.classList.add('show'); }
    function closeModal(modal) { modal?.classList.remove('show'); }

    async function renderData(typeConfig) {
        const container = document.getElementById(typeConfig.containerId);
        if (!container) return;

        try {
            const response = await typeConfig.fetchData();
            if (response.status === 'success') {
                const items = response.data;
                if (items.length === 0) {
                    container.innerHTML = typeConfig.emptyStateHTML;
                } else {
                    container.innerHTML = items.map(typeConfig.renderItem).join('');
                }
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error(`Error al cargar ${typeConfig.title}:`, error);
            container.innerHTML = `<p style="text-align: center; color: red;">Error al cargar datos: ${error.message}</p>`;
        }
    }

    function handleOpenFormModal(type) {
        const conf = config[type];
        if (!conf) return;

        const formModal = document.getElementById('form-modal');
        formModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal-btn">&times;</span>
                <h2>Agregar ${conf.title}</h2>
                <form id="generic-form">
                    ${conf.formFields.map(f => `
                        <div class="form-group">
                            <label for="${f.id}">${f.label}</label>
                            <input type="${f.type}" id="${f.id}" name="${f.id}" ${f.required ? 'required' : ''}>
                        </div>
                    `).join('')}
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Guardar</button>
                        <button type="button" class="btn btn-secondary close-modal-btn">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        openModal(formModal);

        formModal.querySelector('#generic-form').onsubmit = async function(e) {
            e.preventDefault();
            const formData = {};
            conf.formFields.forEach(f => {
                formData[f.id] = formModal.querySelector(`#${f.id}`).value;
            });

            const result = await conf.saveData(...Object.values(formData));
            if (result && result.status === 'success') {
                await renderData(conf);
                closeModal(formModal);
            } else {
                alert(result.message || 'Error al guardar');
            }
        };
    }
});